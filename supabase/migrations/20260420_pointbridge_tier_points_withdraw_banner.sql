-- PointBridge: 등급 함수, point_logs 확장/뷰, 환전 RPC, 배너 개별 닫기, 닉네임 unique,
-- orders 기본값, 인덱스, 로그 정리 함수
--
-- 대상 DB 스키마: public.orders.id / public.services.id = bigint (제품 스키마 기준).
-- point_logs.order_id, point_logs.service_id = bigint + FK (orders/services가 bigint일 때만 생성).

-- ---------------------------------------------------------------------------
-- 0) orders.status 기본값: pending (requested 등 잘못된 기본값 정리)
-- ---------------------------------------------------------------------------
update public.orders
set status = 'pending'
where status is null or status::text = 'requested';

alter table if exists public.orders
  alter column status set default 'pending';

-- ---------------------------------------------------------------------------
-- 1) point_logs: 컬럼 확장 + type CHECK 확장 (order/service = bigint)
-- ---------------------------------------------------------------------------
alter table if exists public.point_logs
  add column if not exists order_id bigint,
  add column if not exists service_id bigint,
  add column if not exists related_user_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'point_logs'
      and column_name = 'related_user_id'
  )
  and not exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public' and r.relname = 'point_logs' and c.conname = 'point_logs_related_user_id_fkey'
  ) then
    alter table public.point_logs
      add constraint point_logs_related_user_id_fkey
      foreign key (related_user_id) references public.profiles (id);
  end if;
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'id' and data_type = 'bigint'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'point_logs' and column_name = 'order_id' and data_type = 'bigint'
  )
  and not exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public' and r.relname = 'point_logs' and c.conname = 'point_logs_order_id_fkey'
  ) then
    alter table public.point_logs
      add constraint point_logs_order_id_fkey
      foreign key (order_id) references public.orders (id);
  end if;
exception
  when duplicate_object then
    null;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'services' and column_name = 'id' and data_type = 'bigint'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'point_logs' and column_name = 'service_id' and data_type = 'bigint'
  )
  and not exists (
    select 1
    from pg_constraint c
    join pg_class r on r.oid = c.conrelid
    join pg_namespace n on n.oid = r.relnamespace
    where n.nspname = 'public' and r.relname = 'point_logs' and c.conname = 'point_logs_service_id_fkey'
  ) then
    alter table public.point_logs
      add constraint point_logs_service_id_fkey
      foreign key (service_id) references public.services (id);
  end if;
exception
  when duplicate_object then
    null;
end $$;

do $$
declare
  cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'point_logs'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%type%';

  if cname is not null then
    execute format('alter table public.point_logs drop constraint %I', cname);
  end if;

  alter table public.point_logs
    add constraint point_logs_type_check
    check (
      type in (
        'charge',
        'use',
        'sell',
        'refund',
        'event',
        'withdraw_request',
        'withdraw_approved',
        'withdraw_rejected',
        'adjustment'
      )
    );
exception
  when duplicate_object then
    null;
end $$;

create index if not exists idx_point_logs_user_type_created
  on public.point_logs (user_id, type, created_at desc);

create index if not exists idx_point_logs_order_id
  on public.point_logs (order_id)
  where order_id is not null;

-- ---------------------------------------------------------------------------
-- 2) point_transactions 인덱스 보강
-- ---------------------------------------------------------------------------
create index if not exists idx_point_transactions_user_type_created
  on public.point_transactions (user_id, type, created_at desc);

create index if not exists idx_point_transactions_order_id
  on public.point_transactions (order_id)
  where order_id is not null;

-- ---------------------------------------------------------------------------
-- 3) services / reviews 인덱스 보강
-- ---------------------------------------------------------------------------
create index if not exists idx_services_seller_active_sort
  on public.services (seller_user_id, is_active, sort_order);

create index if not exists idx_reviews_buyer_created
  on public.reviews (buyer_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4) orders 인덱스 보강 (이미 일부 존재할 수 있음)
-- ---------------------------------------------------------------------------
create index if not exists idx_orders_buyer_status_created
  on public.orders (buyer_user_id, status, created_at desc);

create index if not exists idx_orders_seller_status_created
  on public.orders (seller_user_id, status, created_at desc);

create index if not exists idx_orders_service_id
  on public.orders (service_id)
  where service_id is not null;

-- ---------------------------------------------------------------------------
-- 5) 내역 UI용 뷰: amount는 그대로, description_ui 에서 금액 패턴 제거
-- ---------------------------------------------------------------------------
create or replace view public.v_point_logs_display as
select
  pl.id,
  pl.user_id,
  pl.type,
  pl.amount,
  pl.created_at,
  pl.order_id,
  pl.service_id,
  pl.related_user_id,
  pl.metadata,
  trim(
    both
    from regexp_replace(
      regexp_replace(
        regexp_replace(coalesce(pl.description, ''), '\s*\([\d,]+P\)\s*$', '', 'g'),
        '\s*\+[\d,.]+P\s*$',
        '',
        'g'
      ),
      '\s*[－-]\s*[\d,.]+P\s*$',
      '',
      'g'
    )
  ) as description_ui
from public.point_logs pl;

comment on view public.v_point_logs_display is '포인트 내역 UI: 금액은 amount만 사용, 설명은 description_ui';

grant select on public.v_point_logs_display to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) 등급: 단일 최고 등급 반환 (SQL, 앱과 동일 규칙)
--    Legend: 판매완료 30+ & review_avg >= 4
--    Elite:  판매완료 10+ & review_avg >= 3
--    Pro:    활성 서비스 3+ & 판매완료 5+ & 구매 완료 1회 이상(서비스 이용)
--    Seller: 판매자 활성 & 서비스 1+ & 판매완료 1+
--    Starter: 포인트 충전 1회 이상 & 구매 완료 1회 이상
--    Newbie: 그 외
-- ---------------------------------------------------------------------------
create or replace function public.resolve_user_tier(p_user_id uuid)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  with s as (
    select
      coalesce((
        select count(*)::int
        from public.point_logs pl
        where pl.user_id = p_user_id
          and pl.type = 'charge'
      ), 0) as charge_count,
      coalesce((
        select count(*)::int
        from public.orders o
        where o.buyer_user_id = p_user_id
          and o.status = 'completed'
      ), 0) as buyer_completed,
      coalesce((
        select p.is_seller
        from public.profiles p
        where p.id = p_user_id
      ), false) as is_seller,
      coalesce((
        select p.seller_status
        from public.profiles p
        where p.id = p_user_id
      ), 'none') as seller_status,
      coalesce((
        select count(*)::int
        from public.services sv
        where sv.seller_user_id = p_user_id
          and coalesce(sv.is_active, true) = true
      ), 0) as svc_count,
      coalesce((
        select count(*)::int
        from public.orders o2
        where o2.seller_user_id = p_user_id
          and o2.status = 'completed'
      ), 0) as sales_completed,
      coalesce((
        select p.review_avg::numeric
        from public.profiles p
        where p.id = p_user_id
      ), 0) as review_avg
  )
  select case
    when sales_completed >= 30 and review_avg >= 4 then 'legend'
    when sales_completed >= 10 and review_avg >= 3 then 'elite'
    when svc_count >= 3 and sales_completed >= 5 and buyer_completed >= 1 then 'pro'
    when is_seller and seller_status = 'active' and svc_count >= 1 and sales_completed >= 1 then 'seller'
    when charge_count >= 1 and buyer_completed >= 1 then 'starter'
    else 'newbie'
  end
  from s;
$$;

grant execute on function public.resolve_user_tier(uuid) to authenticated, service_role;

-- 본인 등급만 조회 (클라이언트 기본)
create or replace function public.resolve_my_user_tier()
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select public.resolve_user_tier(auth.uid());
$$;

grant execute on function public.resolve_my_user_tier() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) 환전: 신청은 잔액 차감 없이 pending + 로그(금액 0, metadata에 요청액)
-- ---------------------------------------------------------------------------
create or replace function public.submit_point_withdraw_request(p_amount integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_bal int;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_amount is null or p_amount < 1000 then
    raise exception 'WITHDRAW_MINIMUM_NOT_MET';
  end if;

  select coalesce(point_balance, 0)
  into v_bal
  from public.profiles
  where id = v_uid
  for update;

  if v_bal is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_bal < p_amount then
    raise exception 'INSUFFICIENT_POINT_BALANCE';
  end if;

  insert into public.point_withdraw_requests (user_id, amount, status, note)
  values (v_uid, p_amount, 'pending', '')
  returning id into v_id;

  insert into public.point_logs (user_id, type, description, amount, metadata)
  values (
    v_uid,
    'withdraw_request',
    '포인트 환전 신청',
    0,
    jsonb_build_object('request_id', v_id, 'requested_amount', p_amount)
  );

  return v_id;
end;
$$;

grant execute on function public.submit_point_withdraw_request(integer) to authenticated, service_role;

create or replace function public.admin_approve_point_withdraw(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_req record;
  v_bal int;
begin
  if v_admin is null or not exists (
    select 1
    from public.profiles p
    where p.id = v_admin
      and (coalesce(p.is_admin, false) = true or lower(coalesce(p.role, '')) = 'admin')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_req
  from public.point_withdraw_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'INVALID_REQUEST_STATUS';
  end if;

  select coalesce(point_balance, 0) into v_bal
  from public.profiles
  where id = v_req.user_id
  for update;

  if v_bal < v_req.amount then
    raise exception 'INSUFFICIENT_POINT_BALANCE';
  end if;

  update public.profiles
  set point_balance = v_bal - v_req.amount
  where id = v_req.user_id;

  update public.point_withdraw_requests
  set status = 'approved', processed_at = now()
  where id = p_request_id;

  insert into public.point_logs (user_id, type, description, amount, metadata)
  values (
    v_req.user_id,
    'withdraw_approved',
    '포인트 환전 승인',
    -abs(v_req.amount),
    jsonb_build_object('request_id', p_request_id)
  );
end;
$$;

grant execute on function public.admin_approve_point_withdraw(uuid) to authenticated, service_role;

create or replace function public.admin_reject_point_withdraw(p_request_id uuid, p_reason text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_req record;
begin
  if v_admin is null or not exists (
    select 1
    from public.profiles p
    where p.id = v_admin
      and (coalesce(p.is_admin, false) = true or lower(coalesce(p.role, '')) = 'admin')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_req
  from public.point_withdraw_requests
  where id = p_request_id
  for update;

  if v_req.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'INVALID_REQUEST_STATUS';
  end if;

  update public.point_withdraw_requests
  set status = 'rejected', processed_at = now(), note = coalesce(nullif(trim(p_reason), ''), note)
  where id = p_request_id;

  insert into public.point_logs (user_id, type, description, amount, metadata)
  values (
    v_req.user_id,
    'withdraw_rejected',
    '포인트 환전 반려',
    0,
    jsonb_build_object('request_id', p_request_id, 'reason', coalesce(p_reason, ''))
  );
end;
$$;

grant execute on function public.admin_reject_point_withdraw(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8) 배너 개별 닫기
-- ---------------------------------------------------------------------------
create table if not exists public.user_banner_dismissals (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  banner_key text not null,
  dismissed_at timestamptz not null default now(),
  constraint user_banner_dismissals_user_banner unique (user_id, banner_key)
);

create index if not exists idx_user_banner_dismissals_user
  on public.user_banner_dismissals (user_id, dismissed_at desc);

alter table public.user_banner_dismissals enable row level security;

drop policy if exists "user_banner_dismissals_select_own" on public.user_banner_dismissals;
create policy "user_banner_dismissals_select_own" on public.user_banner_dismissals
  for select using (auth.uid() = user_id);

drop policy if exists "user_banner_dismissals_insert_own" on public.user_banner_dismissals;
create policy "user_banner_dismissals_insert_own" on public.user_banner_dismissals
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_banner_dismissals_delete_own" on public.user_banner_dismissals;
create policy "user_banner_dismissals_delete_own" on public.user_banner_dismissals
  for delete using (auth.uid() = user_id);

-- 로그아웃 시 클라이언트에서 전체 초기화(delete) 호출 가능
create or replace function public.clear_my_banner_dismissals()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted int;
begin
  if v_uid is null then
    return 0;
  end if;
  delete from public.user_banner_dismissals where user_id = v_uid;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

grant execute on function public.clear_my_banner_dismissals() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9) 닉네임 unique (대소문자 무시, 공백 trim, 빈 문자열 제외)
-- ---------------------------------------------------------------------------
update public.profiles p
set nickname = left(replace(p.id::text, '-', ''), 10)
from (
  select
    id,
    row_number() over (
      partition by lower(trim(nickname))
      order by created_at nulls last, id
    ) as rn
  from public.profiles
  where nickname is not null and length(trim(nickname)) > 0
) d
where p.id = d.id
  and d.rn > 1;

create unique index if not exists idx_profiles_nickname_unique_ci
  on public.profiles (lower(trim(nickname)))
  where nickname is not null and length(trim(nickname)) > 0;

-- ---------------------------------------------------------------------------
-- 10) point_logs 1년 이상 삭제 (함수가 이미 있으면 교체)
-- ---------------------------------------------------------------------------
create or replace function public.prune_old_point_logs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer := 0;
begin
  delete from public.point_logs
  where created_at < now() - interval '1 year';
  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

grant execute on function public.prune_old_point_logs() to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.schedule(
        'point_logs_prune_daily',
        '12 4 * * *',
        'select public.prune_old_point_logs();'
      );
    exception
      when duplicate_object then
        null;
    end;
  end if;
exception
  when undefined_table or undefined_function then
    null;
end $$;
