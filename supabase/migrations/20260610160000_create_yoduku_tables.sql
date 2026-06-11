create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  created_at timestamptz not null default now()
);

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.game_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  mode text not null check (mode in ('normal', 'hard')),
  player jsonb not null default '[]'::jsonb,
  checks integer not null default 0 check (checks >= 0),
  started_at_ms bigint,
  solved_at_ms bigint,
  solved boolean not null default false,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.daily_solves (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  puzzle_number integer not null,
  mode text not null check (mode in ('normal', 'hard')),
  checks integer not null check (checks >= 0),
  elapsed_seconds integer not null check (elapsed_seconds >= 0),
  solved_at timestamptz not null,
  display_name text not null,
  primary key (user_id, date)
);

create index if not exists daily_solves_rank_idx
  on public.daily_solves (date, checks, elapsed_seconds, solved_at);

alter table public.profiles enable row level security;
alter table public.user_stats enable row level security;
alter table public.game_progress enable row level security;
alter table public.daily_solves enable row level security;

grant select on public.profiles to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.user_stats to authenticated;
grant select, insert, update on public.game_progress to authenticated;
grant select on public.daily_solves to anon, authenticated;

drop policy if exists "profiles are public readable" on public.profiles;
create policy "profiles are public readable"
  on public.profiles for select
  using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "users read own stats" on public.user_stats;
create policy "users read own stats"
  on public.user_stats for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own stats" on public.user_stats;
create policy "users insert own stats"
  on public.user_stats for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own stats" on public.user_stats;
create policy "users update own stats"
  on public.user_stats for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users read own progress" on public.game_progress;
create policy "users read own progress"
  on public.game_progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users insert own progress" on public.game_progress;
create policy "users insert own progress"
  on public.game_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users update own progress" on public.game_progress;
create policy "users update own progress"
  on public.game_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "leaderboard is public readable" on public.daily_solves;
create policy "leaderboard is public readable"
  on public.daily_solves for select
  using (true);

-- No direct insert/update/delete policy is defined for daily_solves. The
-- Vercel submit API validates solves and writes with the service-role key.
