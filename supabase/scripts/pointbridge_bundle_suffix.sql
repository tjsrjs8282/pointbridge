
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
