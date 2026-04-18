-- PointBridge admin/favorites minimal extension
-- NOTE: admin seed credentials in app are DEV-ONLY. Never use in production.

alter table if exists public.profiles
  add column if not exists role text not null default 'buyer',
  add column if not exists is_admin boolean not null default false;

create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_is_admin on public.profiles (is_admin);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('seller', 'service')),
  target_id text not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists idx_favorites_user_created
  on public.favorites (user_id, created_at desc);
create index if not exists idx_favorites_target_lookup
  on public.favorites (target_type, target_id);

alter table public.favorites enable row level security;

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

drop policy if exists "posts_write_login_user" on public.posts;
create policy "posts_write_user_or_admin_notice" on public.posts
for insert with check (
  auth.uid() = user_id
  and (
    category <> 'notice'
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (p.is_admin = true or p.role = 'admin')
    )
  )
);

-- Optional seed: ensure "브릿포인트 소개" notice exists.
-- Replace admin user id before execution if needed.
-- insert into public.posts (user_id, category, title, content)
-- values (
--   '00000000-0000-0000-0000-000000000000',
--   'notice',
--   '브릿포인트 소개',
--   '<p>안녕하세요, PointBridge 운영팀입니다.</p><p><strong>브릿포인트</strong>는 PointBridge 안에서 서비스 결제와 다양한 혜택에 사용하는 공통 포인트입니다.</p><p>서비스 신청 시 포인트로 간편하게 결제할 수 있고, 이벤트 참여/리뷰 작성/운영 프로모션을 통해 추가 적립도 가능합니다.</p><p>앞으로는 활동 리워드, 등급별 보너스, 추천 미션 등 포인트 활용 범위를 계속 확장할 예정입니다.</p><p>더 좋은 거래 경험을 위해 브릿포인트 정책도 투명하게 안내드리겠습니다. 감사합니다.</p>'
-- ) on conflict do nothing;

