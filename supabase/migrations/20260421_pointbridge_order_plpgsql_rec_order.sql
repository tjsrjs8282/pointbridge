-- Order/review RPCs aligned with production: orders.id = bigint, point_transactions.type uses 'reward' (not 'credit').
-- Drops legacy uuid overloads so PostgREST resolves p_order_id from the app (marketplace.js) to bigint.
-- Row buffer is plain record; final return re-selects from public.orders (avoids record::composite parse issues).

drop function if exists public.respond_order(uuid, text, text, text);
drop function if exists public.respond_order(uuid, text);
drop function if exists public.complete_order(uuid);

-- Validate review permissions/content (completed order + buyer only + profanity block).
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

-- Order respond RPC (pending + rejection fields + point_transactions.status)
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

  return (select o from public.orders o where o.id = p_order_id limit 1);
end;
$$;

-- Seller completes order and receives points.
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
