-- =============================================================================
-- PointBridge production bundle (Supabase SQL Editor / psql one-shot)
-- REGENERATE: concat this file + ../migrations/20260420_pointbridge_tier_points_withdraw_banner.sql + pointbridge_bundle_suffix.sql -> pointbridge_production_introspect_bundle.sql
-- =============================================================================
-- Aligns with an introspected schema like:
--   orders.id bigint identity, services.id bigint, reviews.id bigint,
--   point_transactions.type in (charge, use, refund, reward, adjustment),
--   profiles / chat / favorites / point_logs / withdraw_requests as deployed.
--
-- Safe to re-run: uses IF NOT EXISTS, CREATE OR REPLACE, DROP IF EXISTS where possible.
-- Run AFTER extensions exist. Requires public.orders, public.profiles, etc.
--
-- App touchpoints covered:
--   marketplace.js: seller_search_view, respond_order, complete_order
--   userTier.js: resolve_user_tier, resolve_my_user_tier
--   points.js: point_logs, submit_point_withdraw_request, admin_*withdraw
--   AuthContext: clear_my_banner_dismissals, profiles.hide_event_banner
--   Admin UI: is_admin_user + RLS policies (suffix section)
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared trigger helper (chat_rooms, posts, profiles, ...)
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Drop legacy uuid order RPC overloads (PostgREST must resolve bigint from JS)
-- ---------------------------------------------------------------------------
drop function if exists public.respond_order(uuid, text, text, text);
drop function if exists public.respond_order(uuid, text);
drop function if exists public.complete_order(uuid);

-- ---------------------------------------------------------------------------
-- Reviews: validation trigger
-- ---------------------------------------------------------------------------
create or replace function public.validate_review_insert()
returns trigger
language plpgsql
as $$
declare
  ord_row record;
  v_bad_words text[] := array['씨발', '병신', '개새끼', '좆', 'fuck', 'shit'];
  v_word text;
begin
  select o.*
  into ord_row
  from public.orders o
  where o.id = new.order_id;

  if ord_row.id is null then
    raise exception 'Order not found for review.';
  end if;

  if ord_row.status <> 'completed' then
    raise exception 'Review can be written only for completed orders.';
  end if;

  if ord_row.buyer_user_id <> new.buyer_user_id then
    raise exception 'Only the buyer can write this review.';
  end if;

  if ord_row.seller_user_id <> new.seller_user_id then
    raise exception 'Review seller mismatch.';
  end if;

  if ord_row.service_id is distinct from new.service_id then
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

-- ---------------------------------------------------------------------------
-- Reviews -> profile aggregates
-- ---------------------------------------------------------------------------
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

drop trigger if exists trg_refresh_seller_rating_after_review on public.reviews;
create trigger trg_refresh_seller_rating_after_review
after insert or update or delete on public.reviews
for each row execute function public.refresh_seller_rating();

-- ---------------------------------------------------------------------------
-- Order RPCs (bigint order id, pending flow, point_transactions.reward on complete)
-- ---------------------------------------------------------------------------
create or replace function public.respond_order(
  p_order_id bigint,
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

  -- Avoid `record::composite` cast (some parsers treat the lhs as a relation name).
  return (select o from public.orders o where o.id = p_order_id limit 1);
end;
$$;

create or replace function public.complete_order(
  p_order_id bigint
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  ord_row record;
begin
  select *
  into ord_row
  from public.orders
  where id = p_order_id
  for update;

  if ord_row.id is null then
    raise exception 'Order not found.';
  end if;

  if ord_row.status not in ('accepted', 'in_progress') then
    raise exception 'Only accepted/in_progress order can be completed.';
  end if;

  update public.profiles
  set point_balance = point_balance + ord_row.price_point
  where id = ord_row.seller_user_id;

  insert into public.point_transactions (user_id, order_id, type, amount, description, status)
  values (
    ord_row.seller_user_id,
    ord_row.id,
    'reward',
    ord_row.price_point,
    '주문 완료에 따른 판매자 포인트 적립',
    'done'
  );

  update public.orders
  set status = 'completed', completed_at = now()
  where id = ord_row.id
  returning * into ord_row;

  update public.seller_profiles
  set total_completed_orders = (
    select count(*)::int
    from public.orders
    where seller_user_id = ord_row.seller_user_id and status = 'completed'
  )
  where user_id = ord_row.seller_user_id;

  return (select o from public.orders o where o.id = p_order_id limit 1);
end;
$$;

grant execute on function public.respond_order(bigint, text, text, text) to authenticated, service_role;
grant execute on function public.complete_order(bigint) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Seller list view (src/lib/marketplace.js -> seller_search_view)
-- ---------------------------------------------------------------------------
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

grant select on public.seller_search_view to anon, authenticated, service_role;

-- =============================================================================
-- (below) Tier / point_logs / withdraw / banner / indexes — from migration 20260420
-- =============================================================================
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

-- =============================================================================
-- Public read for marketplace lists (align with 20260414_pointbridge_core RLS)
-- =============================================================================
alter table if exists public.profiles enable row level security;
alter table if exists public.seller_profiles enable row level security;
alter table if exists public.services enable row level security;

drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_read_all" on public.profiles
for select using (true);

drop policy if exists "seller_profiles_read_all" on public.seller_profiles;
create policy "seller_profiles_read_all" on public.seller_profiles
for select using (true);

drop policy if exists "services_read_all" on public.services;
create policy "services_read_all" on public.services
for select using (true);

drop policy if exists "reviews_read_all" on public.reviews;
create policy "reviews_read_all" on public.reviews
for select using (true);

drop policy if exists "reviews_insert_buyer" on public.reviews;
create policy "reviews_insert_buyer" on public.reviews
for insert with check (auth.uid() = buyer_user_id);

alter table if exists public.favorites enable row level security;

drop policy if exists "favorites_read_owner" on public.favorites;
create policy "favorites_read_owner" on public.favorites
for select using (auth.uid() = user_id);

drop policy if exists "favorites_insert_owner" on public.favorites;
create policy "favorites_insert_owner" on public.favorites
for insert with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_owner" on public.favorites;
create policy "favorites_delete_owner" on public.favorites
for delete using (auth.uid() = user_id);

drop policy if exists "seller_profiles_write_self" on public.seller_profiles;
drop policy if exists "seller_profiles_write_owner_or_admin" on public.seller_profiles;
create policy "seller_profiles_write_owner_or_admin" on public.seller_profiles
for all
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or p.role = 'admin')
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or p.role = 'admin')
  )
);

drop policy if exists "services_write_seller" on public.services;
drop policy if exists "services_write_owner_or_admin" on public.services;
create policy "services_write_owner_or_admin" on public.services
for all
using (
  auth.uid() = seller_user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or p.role = 'admin')
  )
)
with check (
  auth.uid() = seller_user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or p.role = 'admin')
  )
);

-- =============================================================================
-- Admin helper + RLS (src/lib/permissions.js, admin pages)
-- Idempotent: drops both legacy and *_or_admin policy names before recreate.
-- =============================================================================

create or replace function public.is_admin_user(p_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and (p.is_admin = true or p.role = 'admin')
  );
$$;

drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
for update using (
  auth.uid() = id
  or public.is_admin_user(auth.uid())
)
with check (
  auth.uid() = id
  or public.is_admin_user(auth.uid())
);

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
for delete using (
  public.is_admin_user(auth.uid())
);

alter table if exists public.orders enable row level security;
alter table if exists public.reviews enable row level security;

drop policy if exists "orders_read_participant" on public.orders;
drop policy if exists "orders_read_participant_or_admin" on public.orders;
create policy "orders_read_participant_or_admin" on public.orders
for select using (
  auth.uid() = buyer_user_id
  or auth.uid() = seller_user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists "orders_create_buyer" on public.orders;
create policy "orders_create_buyer" on public.orders
for insert with check (auth.uid() = buyer_user_id);

drop policy if exists "orders_update_seller" on public.orders;
drop policy if exists "orders_update_seller_or_admin" on public.orders;
create policy "orders_update_seller_or_admin" on public.orders
for update using (
  auth.uid() = seller_user_id
  or public.is_admin_user(auth.uid())
)
with check (
  auth.uid() = seller_user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists "reviews_update_admin" on public.reviews;
create policy "reviews_update_admin" on public.reviews
for update using (
  public.is_admin_user(auth.uid())
)
with check (
  public.is_admin_user(auth.uid())
);

drop policy if exists "posts_update_owner" on public.posts;
drop policy if exists "posts_update_owner_or_admin" on public.posts;
create policy "posts_update_owner_or_admin" on public.posts
for update using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
)
with check (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists "posts_delete_admin" on public.posts;
create policy "posts_delete_admin" on public.posts
for delete using (
  public.is_admin_user(auth.uid())
);

do $$
begin
  if to_regclass('public.post_comments') is not null then
    execute 'drop policy if exists "post_comments_update_owner" on public.post_comments';
    execute 'drop policy if exists "post_comments_update_owner_or_admin" on public.post_comments';
    execute 'create policy "post_comments_update_owner_or_admin" on public.post_comments
      for update using (
        auth.uid() = user_id
        or public.is_admin_user(auth.uid())
      )
      with check (
        auth.uid() = user_id
        or public.is_admin_user(auth.uid())
      )';

    execute 'drop policy if exists "post_comments_delete_admin" on public.post_comments';
    execute 'create policy "post_comments_delete_admin" on public.post_comments
      for delete using (
        public.is_admin_user(auth.uid())
      )';
  end if;
end
$$;

drop policy if exists "notifications_rw_owner" on public.notifications;
drop policy if exists "notifications_select_owner_or_admin" on public.notifications;
create policy "notifications_select_owner_or_admin" on public.notifications
for select using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists "notifications_insert_owner_or_admin" on public.notifications;
create policy "notifications_insert_owner_or_admin" on public.notifications
for insert with check (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists "notifications_update_owner_or_admin" on public.notifications;
create policy "notifications_update_owner_or_admin" on public.notifications
for update using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
)
with check (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists "notifications_delete_owner_or_admin" on public.notifications;
create policy "notifications_delete_owner_or_admin" on public.notifications
for delete using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

alter table if exists public.point_transactions enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.posts enable row level security;

drop policy if exists "point_transactions_read_owner" on public.point_transactions;
drop policy if exists "point_transactions_read_owner_or_admin" on public.point_transactions;
create policy "point_transactions_read_owner_or_admin" on public.point_transactions
for select using (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists "point_transactions_insert_owner_or_admin" on public.point_transactions;
create policy "point_transactions_insert_owner_or_admin" on public.point_transactions
for insert with check (
  auth.uid() = user_id
  or public.is_admin_user(auth.uid())
);

-- ---------------------------------------------------------------------------
-- Chat: bump parent room updated_at on new message (20260419_pointbridge_chat_minimal)
-- ---------------------------------------------------------------------------
create or replace function public.bump_chat_room_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.chat_rooms
  set updated_at = now()
  where id = new.room_id;
  return new;
end;
$$;

drop trigger if exists trg_chat_rooms_touch_updated_at on public.chat_rooms;
create trigger trg_chat_rooms_touch_updated_at
before update on public.chat_rooms
for each row execute function public.touch_updated_at();

alter table if exists public.chat_rooms enable row level security;
alter table if exists public.chat_room_participants enable row level security;
alter table if exists public.messages enable row level security;

drop policy if exists "chat_rooms_participant_read" on public.chat_rooms;
create policy "chat_rooms_participant_read" on public.chat_rooms
for select using (
  exists (
    select 1
    from public.chat_room_participants p
    where p.chat_room_id = chat_rooms.id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "chat_rooms_participant_insert" on public.chat_rooms;
create policy "chat_rooms_participant_insert" on public.chat_rooms
for insert with check (auth.uid() = created_by);

drop policy if exists "chat_room_participants_read_by_member" on public.chat_room_participants;
create policy "chat_room_participants_read_by_member" on public.chat_room_participants
for select using (
  exists (
    select 1
    from public.chat_room_participants p
    where p.chat_room_id = chat_room_participants.chat_room_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "chat_room_participants_insert_by_room_creator" on public.chat_room_participants;
create policy "chat_room_participants_insert_by_room_creator" on public.chat_room_participants
for insert with check (
  auth.uid() = user_id or
  exists (
    select 1
    from public.chat_rooms r
    where r.id = chat_room_participants.chat_room_id
      and r.created_by = auth.uid()
  )
);

drop policy if exists "chat_room_participants_update_self" on public.chat_room_participants;
create policy "chat_room_participants_update_self" on public.chat_room_participants
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "messages_participant_read" on public.messages;
create policy "messages_participant_read" on public.messages
for select using (
  exists (
    select 1
    from public.chat_room_participants p
    where p.chat_room_id = messages.room_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "messages_sender_insert" on public.messages;
create policy "messages_sender_insert" on public.messages
for insert with check (
  auth.uid() = sender_user_id and
  exists (
    select 1
    from public.chat_room_participants p
    where p.chat_room_id = messages.room_id
      and p.user_id = auth.uid()
  )
);

drop trigger if exists trg_messages_bump_chat_rooms on public.messages;
create trigger trg_messages_bump_chat_rooms
after insert on public.messages
for each row execute function public.bump_chat_room_updated_at();

-- =============================================================================
-- End of PointBridge production bundle
-- =============================================================================
