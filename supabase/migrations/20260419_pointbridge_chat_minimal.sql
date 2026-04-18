-- PointBridge minimal chat schema for test flow
-- Requirement: chat request accept -> room create -> message exchange

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_room_participants (
  chat_room_id uuid not null references public.chat_rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'participant' check (role in ('buyer', 'seller', 'participant')),
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (chat_room_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms (id) on delete cascade,
  sender_user_id uuid not null references public.profiles (id) on delete cascade,
  receiver_user_id uuid references public.profiles (id) on delete set null,
  body text not null default '',
  message_type text not null default 'text' check (message_type in ('text', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_room_participants_user
  on public.chat_room_participants (user_id, chat_room_id);

create index if not exists idx_messages_room_created
  on public.messages (room_id, created_at desc);

drop trigger if exists trg_chat_rooms_touch_updated_at on public.chat_rooms;
create trigger trg_chat_rooms_touch_updated_at
before update on public.chat_rooms
for each row execute function public.touch_updated_at();

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

drop trigger if exists trg_messages_bump_chat_rooms on public.messages;
create trigger trg_messages_bump_chat_rooms
after insert on public.messages
for each row execute function public.bump_chat_room_updated_at();

alter table public.chat_rooms enable row level security;
alter table public.chat_room_participants enable row level security;
alter table public.messages enable row level security;

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
