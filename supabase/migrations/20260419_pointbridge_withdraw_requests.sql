-- PointBridge withdraw requests

create table if not exists public.point_withdraw_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount integer not null check (amount >= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text not null default '',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_point_withdraw_requests_user_created
  on public.point_withdraw_requests (user_id, created_at desc);

alter table public.point_withdraw_requests enable row level security;

drop policy if exists "point_withdraw_requests_read_owner_or_admin" on public.point_withdraw_requests;
create policy "point_withdraw_requests_read_owner_or_admin" on public.point_withdraw_requests
for select using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or p.role = 'admin')
  )
);

drop policy if exists "point_withdraw_requests_insert_owner_or_admin" on public.point_withdraw_requests;
create policy "point_withdraw_requests_insert_owner_or_admin" on public.point_withdraw_requests
for insert with check (
  (auth.uid() = user_id and amount >= 1000)
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or p.role = 'admin')
  )
);
