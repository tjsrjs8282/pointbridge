-- PointBridge core marketplace schema (draft)
-- Run in Supabase SQL editor / migration runner.

create extension if not exists pgcrypto;

-- 1) profiles (align to app profile usage + marketplace fields)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  name text,
  nickname text,
  phone text,
  address text,
  address_detail text,
  avatar_url text,
  point_balance integer not null default 0 check (point_balance >= 0),
  bio text,
  interests text,
  is_seller boolean not null default false,
  seller_status text not null default 'none' check (seller_status in ('none', 'pending', 'active', 'blocked')),
  review_avg numeric(3,2) not null default 0 check (review_avg >= 0 and review_avg <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.profiles
  add column if not exists email text,
  add column if not exists name text,
  add column if not exists nickname text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists address_detail text,
  add column if not exists avatar_url text,
  add column if not exists point_balance integer not null default 0,
  add column if not exists bio text,
  add column if not exists interests text,
  add column if not exists is_seller boolean not null default false,
  add column if not exists seller_status text not null default 'none',
  add column if not exists review_avg numeric(3,2) not null default 0,
  add column if not exists review_count integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

-- 2) seller_profiles
create table if not exists public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  display_name text not null,
  intro text not null default '',
  region text not null default '',
  categories text[] not null default '{}',
  is_active boolean not null default true,
  response_time_avg integer not null default 0,
  total_completed_orders integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) services
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  category text not null,
  price_point integer not null check (price_point > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references public.profiles (id) on delete restrict,
  seller_user_id uuid not null references public.profiles (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  category text not null,
  title_snapshot text not null,
  price_point integer not null check (price_point > 0),
  request_message text not null default '',
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  rejected_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

-- 5) point_transactions
create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  type text not null check (type in ('debit', 'credit', 'refund', 'adjustment')),
  amount integer not null check (amount > 0),
  description text not null default '',
  created_at timestamptz not null default now()
);

-- 6) notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  related_order_id uuid references public.orders (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7) reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete restrict,
  seller_user_id uuid not null references public.profiles (id) on delete restrict,
  buyer_user_id uuid not null references public.profiles (id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  content text not null default '',
  created_at timestamptz not null default now(),
  is_hidden boolean not null default false
);

create index if not exists idx_seller_profiles_user_id on public.seller_profiles (user_id);
create index if not exists idx_seller_profiles_is_active on public.seller_profiles (is_active);
create index if not exists idx_services_seller_user_id on public.services (seller_user_id);
create index if not exists idx_services_category_active on public.services (category, is_active);
create index if not exists idx_orders_buyer on public.orders (buyer_user_id, created_at desc);
create index if not exists idx_orders_seller on public.orders (seller_user_id, created_at desc);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_reviews_seller on public.reviews (seller_user_id, created_at desc);
create index if not exists idx_point_transactions_user on public.point_transactions (user_id, created_at desc);

-- Keep updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_touch_updated_at on public.profiles;
create trigger trg_profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_seller_profiles_touch_updated_at on public.seller_profiles;
create trigger trg_seller_profiles_touch_updated_at
before update on public.seller_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists trg_services_touch_updated_at on public.services;
create trigger trg_services_touch_updated_at
before update on public.services
for each row execute function public.touch_updated_at();

-- Validate review permissions/content (completed order + buyer only + profanity block).
create or replace function public.validate_review_insert()
returns trigger
language plpgsql
as $$
declare
  v_order record;
  v_bad_words text[] := array['씨발', '병신', '개새끼', '좆', 'fuck', 'shit'];
  v_word text;
begin
  select o.*
  into v_order
  from public.orders o
  where o.id = new.order_id;

  if v_order.id is null then
    raise exception 'Order not found for review.';
  end if;

  if v_order.status <> 'completed' then
    raise exception 'Review can be written only for completed orders.';
  end if;

  if v_order.buyer_user_id <> new.buyer_user_id then
    raise exception 'Only the buyer can write this review.';
  end if;

  if v_order.seller_user_id <> new.seller_user_id then
    raise exception 'Review seller mismatch.';
  end if;

  if v_order.service_id <> new.service_id then
    raise exception 'Review service mismatch.';
  end if;

  foreach v_word in array v_bad_words loop
    if position(lower(v_word) in lower(coalesce(new.content, ''))) > 0 then
      raise exception 'Review contains prohibited language.';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_validate_review_insert on public.reviews;
create trigger trg_validate_review_insert
before insert on public.reviews
for each row execute function public.validate_review_insert();

-- Reflect ratings to profile + seller_profile aggregates.
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
    select seller_user_id, count(*)::int as review_count, round(avg(rating)::numeric, 2) as review_avg
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

drop trigger if exists trg_refresh_seller_rating_after_review on public.reviews;
create trigger trg_refresh_seller_rating_after_review
after insert or update or delete on public.reviews
for each row execute function public.refresh_seller_rating();

-- Marketplace RPC: seller accepts/rejects.
create or replace function public.respond_order(
  p_order_id uuid,
  p_decision text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_buyer_balance integer;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status <> 'requested' then
    raise exception 'Only requested order can be processed.';
  end if;

  if p_decision = 'accept' then
    select point_balance into v_buyer_balance
    from public.profiles
    where id = v_order.buyer_user_id
    for update;

    if coalesce(v_buyer_balance, 0) < v_order.price_point then
      raise exception 'Buyer has insufficient points.';
    end if;

    update public.profiles
    set point_balance = point_balance - v_order.price_point
    where id = v_order.buyer_user_id;

    insert into public.point_transactions (user_id, order_id, type, amount, description)
    values (
      v_order.buyer_user_id,
      v_order.id,
      'debit',
      v_order.price_point,
      '주문 수락으로 인한 포인트 차감'
    );

    update public.orders
    set status = 'accepted', accepted_at = now()
    where id = v_order.id
    returning * into v_order;
  elsif p_decision = 'reject' then
    update public.orders
    set status = 'rejected', rejected_at = now()
    where id = v_order.id
    returning * into v_order;
  else
    raise exception 'Decision must be accept or reject.';
  end if;

  return v_order;
end;
$$;

-- Marketplace RPC: seller completes order and receives points.
create or replace function public.complete_order(
  p_order_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception 'Order not found.';
  end if;

  if v_order.status not in ('accepted', 'in_progress') then
    raise exception 'Only accepted/in_progress order can be completed.';
  end if;

  update public.profiles
  set point_balance = point_balance + v_order.price_point
  where id = v_order.seller_user_id;

  insert into public.point_transactions (user_id, order_id, type, amount, description)
  values (
    v_order.seller_user_id,
    v_order.id,
    'credit',
    v_order.price_point,
    '주문 완료에 따른 판매자 포인트 적립'
  );

  update public.orders
  set status = 'completed', completed_at = now()
  where id = v_order.id
  returning * into v_order;

  update public.seller_profiles
  set total_completed_orders = (
    select count(*)::int
    from public.orders
    where seller_user_id = v_order.seller_user_id and status = 'completed'
  )
  where user_id = v_order.seller_user_id;

  return v_order;
end;
$$;

-- Seller search view used by frontend list page.
create or replace view public.seller_search_view as
select
  sp.id as seller_profile_id,
  sp.user_id as seller_user_id,
  sp.display_name,
  sp.intro,
  sp.region,
  sp.categories,
  sp.is_active,
  sp.response_time_avg,
  sp.total_completed_orders,
  p.avatar_url,
  p.review_avg,
  p.review_count,
  coalesce(min(s.price_point) filter (where s.is_active = true), 0) as start_price_point,
  sp.created_at
from public.seller_profiles sp
join public.profiles p on p.id = sp.user_id
left join public.services s on s.seller_user_id = sp.user_id
group by sp.id, sp.user_id, p.avatar_url, p.review_avg, p.review_count;

-- Basic RLS (tighten with role-specific rules as needed).
alter table public.profiles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.services enable row level security;
alter table public.orders enable row level security;
alter table public.point_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
for select using (true);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id);

drop policy if exists "seller_profiles_read_all" on public.seller_profiles;
create policy "seller_profiles_read_all" on public.seller_profiles
for select using (true);

drop policy if exists "seller_profiles_write_self" on public.seller_profiles;
create policy "seller_profiles_write_self" on public.seller_profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "services_read_all" on public.services;
create policy "services_read_all" on public.services
for select using (true);

drop policy if exists "services_write_seller" on public.services;
create policy "services_write_seller" on public.services
for all using (auth.uid() = seller_user_id) with check (auth.uid() = seller_user_id);

drop policy if exists "orders_read_participant" on public.orders;
create policy "orders_read_participant" on public.orders
for select using (auth.uid() = buyer_user_id or auth.uid() = seller_user_id);

drop policy if exists "orders_create_buyer" on public.orders;
create policy "orders_create_buyer" on public.orders
for insert with check (auth.uid() = buyer_user_id);

drop policy if exists "orders_update_seller" on public.orders;
create policy "orders_update_seller" on public.orders
for update using (auth.uid() = seller_user_id);

drop policy if exists "point_transactions_read_owner" on public.point_transactions;
create policy "point_transactions_read_owner" on public.point_transactions
for select using (auth.uid() = user_id);

drop policy if exists "notifications_rw_owner" on public.notifications;
create policy "notifications_rw_owner" on public.notifications
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reviews_read_all" on public.reviews;
create policy "reviews_read_all" on public.reviews
for select using (true);

drop policy if exists "reviews_insert_buyer" on public.reviews;
create policy "reviews_insert_buyer" on public.reviews
for insert with check (auth.uid() = buyer_user_id);
