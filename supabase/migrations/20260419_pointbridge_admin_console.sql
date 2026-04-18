-- PointBridge admin console extension
-- 목적:
-- 1) 관리자 전용 페이지에서 회원/판매자/서비스/게시글/알림/포인트를 관리할 수 있도록 RLS 확장
-- 2) 기존 owner 정책은 유지하고 admin 우회 권한만 추가

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

-- Profiles: admin can update/read all, delete target profiles if needed.
drop policy if exists "profiles_update_self" on public.profiles;
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

-- Orders: admin full read/update
drop policy if exists "orders_read_participant" on public.orders;
create policy "orders_read_participant_or_admin" on public.orders
for select using (
  auth.uid() = buyer_user_id
  or auth.uid() = seller_user_id
  or public.is_admin_user(auth.uid())
);

drop policy if exists "orders_update_seller" on public.orders;
create policy "orders_update_seller_or_admin" on public.orders
for update using (
  auth.uid() = seller_user_id
  or public.is_admin_user(auth.uid())
)
with check (
  auth.uid() = seller_user_id
  or public.is_admin_user(auth.uid())
);

-- Reviews: admin can moderate hidden flag and content if needed
drop policy if exists "reviews_update_admin" on public.reviews;
create policy "reviews_update_admin" on public.reviews
for update using (
  public.is_admin_user(auth.uid())
)
with check (
  public.is_admin_user(auth.uid())
);

-- Posts: admin can update/delete all posts
drop policy if exists "posts_update_owner" on public.posts;
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

-- Post comments: admin can update/delete all comments
do $$
begin
  if to_regclass('public.post_comments') is not null then
    execute 'drop policy if exists "post_comments_update_owner" on public.post_comments';
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

-- Notifications: admin can send to any user and read all for support
drop policy if exists "notifications_rw_owner" on public.notifications;
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

-- Point transactions: admin can view all + insert adjustments
drop policy if exists "point_transactions_read_owner" on public.point_transactions;
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
