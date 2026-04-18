-- PointBridge nickname max length + point log retention

-- 1) Server-side nickname validation (10 chars max, unicode-aware)
create or replace function public.validate_profile_nickname_length()
returns trigger
language plpgsql
as $$
begin
  if new.nickname is null or btrim(new.nickname) = '' then
    raise exception '닉네임을 입력해 주세요.';
  end if;

  if char_length(new.nickname) > 10 then
    raise exception '닉네임은 10자 이하로 입력해주세요.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_profile_nickname_length on public.profiles;
create trigger trg_validate_profile_nickname_length
before insert or update on public.profiles
for each row execute function public.validate_profile_nickname_length();

-- 2) Point logs retention: keep only last 1 year
create or replace function public.prune_old_point_logs()
returns integer
language plpgsql
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

-- optional scheduler (requires pg_cron extension on your Supabase plan)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.schedule(
        'point_logs_prune_daily',
        '10 3 * * *',
        'select public.prune_old_point_logs();'
      );
    exception
      when duplicate_object then
        -- already scheduled
        null;
    end;
  end if;
exception
  when undefined_table or undefined_function then
    -- pg_cron not available: ignore
    null;
end
$$;

-- manual cleanup query (run anytime):
-- delete from public.point_logs where created_at < now() - interval '1 year';
