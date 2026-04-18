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
