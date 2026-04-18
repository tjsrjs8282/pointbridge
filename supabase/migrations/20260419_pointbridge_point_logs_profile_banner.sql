-- PointBridge mypage point log + event banner flag

alter table if exists public.profiles
  add column if not exists hide_event_banner boolean not null default false;

create table if not exists public.point_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('charge', 'use', 'sell', 'event', 'refund')),
  description text not null default '',
  amount integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_point_logs_user_created
  on public.point_logs (user_id, created_at desc);

alter table public.point_logs enable row level security;

drop policy if exists "point_logs_read_owner_or_admin" on public.point_logs;
create policy "point_logs_read_owner_or_admin" on public.point_logs
for select using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or p.role = 'admin')
  )
);

drop policy if exists "point_logs_insert_owner_or_admin" on public.point_logs;
create policy "point_logs_insert_owner_or_admin" on public.point_logs
for insert with check (
  auth.uid() = user_id
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (p.is_admin = true or p.role = 'admin')
  )
);

-- Optional one-time backfill from point_transactions
insert into public.point_logs (user_id, type, description, amount, created_at)
select
  pt.user_id,
  case
    when lower(coalesce(pt.type, '')) in ('debit', 'use') then 'use'
    when lower(coalesce(pt.type, '')) in ('credit', 'sell') then 'sell'
    when lower(coalesce(pt.type, '')) = 'refund' then 'refund'
    when lower(coalesce(pt.type, '')) = 'charge' then 'charge'
    else 'event'
  end as normalized_type,
  coalesce(pt.description, ''),
  case
    when lower(coalesce(pt.type, '')) in ('debit', 'use') then -abs(coalesce(pt.amount, 0))
    else abs(coalesce(pt.amount, 0))
  end as signed_amount,
  coalesce(pt.created_at, now())
from public.point_transactions pt
where not exists (
  select 1
  from public.point_logs pl
  where pl.user_id = pt.user_id
    and pl.description = coalesce(pt.description, '')
    and pl.amount = case
      when lower(coalesce(pt.type, '')) in ('debit', 'use') then -abs(coalesce(pt.amount, 0))
      else abs(coalesce(pt.amount, 0))
    end
    and pl.created_at = coalesce(pt.created_at, now())
);
