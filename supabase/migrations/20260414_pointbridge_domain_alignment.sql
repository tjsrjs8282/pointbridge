-- PointBridge domain alignment migration
-- Canonical source: product domain rules (soft delete, pending status, action-based notifications)

-- 1) profiles: seller_status domain expansion
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'seller_status'
  ) then
    alter table public.profiles
      alter column seller_status set default 'none';
  end if;
exception
  when others then
    null;
end $$;

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%seller_status%';

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;

  alter table public.profiles
    add constraint profiles_seller_status_check
    check (seller_status in ('none', 'pending', 'active', 'inactive', 'deleted'));
exception
  when others then
    null;
end $$;

-- 2) seller_profiles: soft delete columns
alter table if exists public.seller_profiles
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_seller_profiles_active_not_deleted
  on public.seller_profiles (is_active, is_deleted);

-- 3) services: extensible metadata
alter table if exists public.services
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists thumbnail_url text,
  add column if not exists option_summary text,
  add column if not exists options jsonb not null default '{}'::jsonb,
  add column if not exists sort_order integer not null default 0;

-- 4) orders: pending status + rejection reason structure
alter table if exists public.orders
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists rejection_reason_code text,
  add column if not exists rejection_reason_text text,
  add column if not exists chat_room_id text,
  add column if not exists notification_sent boolean not null default false;

update public.orders
set status = 'pending'
where status = 'requested';

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.orders'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%status%';

  if constraint_name is not null then
    execute format('alter table public.orders drop constraint %I', constraint_name);
  end if;

  alter table public.orders
    add constraint orders_status_check
    check (status in ('pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'));
exception
  when others then
    null;
end $$;

create index if not exists idx_orders_status_reason
  on public.orders (status, rejection_reason_code);

-- 5) notifications: action-centric schema
alter table if exists public.notifications
  add column if not exists actor_user_id uuid,
  add column if not exists service_id uuid,
  add column if not exists order_id uuid,
  add column if not exists action_type text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists read_at timestamptz;

update public.notifications
set action_type = coalesce(action_type, type, 'system')
where action_type is null;

create index if not exists idx_notifications_user_action_created
  on public.notifications (user_id, action_type, created_at desc);

-- 6) point_transactions: type domain and metadata
alter table if exists public.point_transactions
  add column if not exists related_user_id uuid,
  add column if not exists status text,
  add column if not exists payment_method text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.point_transactions
set type = case
  when type = 'debit' then 'use'
  when type = 'credit' then 'reward'
  else type
end;

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.point_transactions'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%type%';

  if constraint_name is not null then
    execute format('alter table public.point_transactions drop constraint %I', constraint_name);
  end if;

  alter table public.point_transactions
    add constraint point_transactions_type_check
    check (type in ('charge', 'use', 'refund', 'reward', 'adjustment'));
exception
  when others then
    null;
end $$;

-- 7) review average precision (1 decimal)
create or replace function public.refresh_seller_rating()
returns trigger
language plpgsql
as $$
declare
  v_seller_id uuid;
begin
  v_seller_id := coalesce(new.seller_user_id, old.seller_user_id);

  update public.profiles p
  set review_count = coalesce(r.review_count, 0),
      review_avg = coalesce(r.review_avg, 0)
  from (
    select seller_user_id, count(*)::int as review_count, round(avg(rating)::numeric, 1) as review_avg
    from public.reviews
    where seller_user_id = v_seller_id and is_hidden = false
    group by seller_user_id
  ) r
  where p.id = v_seller_id;

  if not exists (select 1 from public.reviews where seller_user_id = v_seller_id and is_hidden = false) then
    update public.profiles
    set review_count = 0, review_avg = 0
    where id = v_seller_id;
  end if;

  update public.seller_profiles
  set total_completed_orders = (
    select count(*)::int
    from public.orders
    where seller_user_id = v_seller_id and status = 'completed'
  )
  where user_id = v_seller_id;

  return coalesce(new, old);
end;
$$;

-- 8) order respond RPC alignment (pending + rejection reason code)
create or replace function public.respond_order(
  p_order_id uuid,
  p_decision text,
  p_rejection_reason_code text default null,
  p_rejection_reason_text text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  ord_row record;
  v_buyer_balance integer;
begin
  select *
  into ord_row
  from public.orders
  where id = p_order_id
  for update;

  if ord_row.id is null then
    raise exception 'Order not found.';
  end if;

  if ord_row.status <> 'pending' then
    raise exception 'Only pending order can be processed.';
  end if;

  if p_decision = 'accept' then
    select point_balance into v_buyer_balance
    from public.profiles
    where id = ord_row.buyer_user_id
    for update;

    if coalesce(v_buyer_balance, 0) < ord_row.price_point then
      raise exception 'Buyer has insufficient points.';
    end if;

    update public.profiles
    set point_balance = point_balance - ord_row.price_point
    where id = ord_row.buyer_user_id;

    insert into public.point_transactions (user_id, order_id, type, amount, description, status)
    values (
      ord_row.buyer_user_id,
      ord_row.id,
      'use',
      ord_row.price_point,
      '주문 수락으로 인한 포인트 사용',
      'done'
    );

    update public.orders
    set status = 'accepted',
        accepted_at = now(),
        updated_at = now()
    where id = ord_row.id
    returning * into ord_row;
  elsif p_decision = 'reject' then
    update public.orders
    set status = 'rejected',
        rejected_at = now(),
        rejection_reason_code = p_rejection_reason_code,
        rejection_reason_text = p_rejection_reason_text,
        updated_at = now()
    where id = ord_row.id
    returning * into ord_row;
  else
    raise exception 'Decision must be accept or reject.';
  end if;

  return (select o from public.orders o where o.id = p_order_id limit 1);
end;
$$;
