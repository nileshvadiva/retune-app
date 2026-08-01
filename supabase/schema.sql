-- Run this in Supabase SQL Editor. Safe to run multiple times — every
-- statement is idempotent (create-if-not-exists, create-or-replace, or
-- drop-then-recreate), so re-running this after future updates won't
-- error out on "already exists".

-- Profiles table: one row per authenticated user, tracks plan + usage
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free',              -- 'free' | 'starter' | 'pro' | 'ultra'
  generations_used int not null default 0,        -- resets every billing cycle (or monthly for free)
  cycle_reset_at timestamptz not null default (now() + interval '30 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_price_id text,
  -- Tracks whether this account has passed the IP-based signup check.
  -- Set true immediately for email/password signups (checked before the
  -- account exists). Starts false for Google OAuth signups, which bypass
  -- our custom signup route — the dashboard does a one-time fallback
  -- check for these on first load (see app/dashboard/page.tsx).
  ip_check_passed boolean not null default false,
  -- Legal record of when this user agreed to the Terms of Service and
  -- Privacy Policy — useful if that's ever disputed later.
  terms_accepted_at timestamptz,
  -- Burst rate-limit tracking: separate from the monthly cap above. This
  -- stops someone from firing 50 requests in 10 seconds via a script, even
  -- if they're technically still under their monthly generation limit.
  rate_window_started_at timestamptz not null default now(),
  rate_window_count int not null default 0,
  created_at timestamptz not null default now()
);

-- Automatically create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- This is only ever invoked by the trigger below (as the table owner),
-- never called directly by a client — revoke every default grant Supabase
-- automatically adds to new functions (to PUBLIC, anon, AND authenticated),
-- as defense-in-depth.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- History table: every generation a user creates
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_snippet text not null,
  output jsonb not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: users can only ever see/write their own data
alter table public.profiles enable row level security;
alter table public.history enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can view their own history" on public.history;
create policy "Users can view their own history"
  on public.history for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own history" on public.history;
create policy "Users can insert their own history"
  on public.history for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own history" on public.history;
create policy "Users can delete their own history"
  on public.history for delete
  using (auth.uid() = user_id);

-- Index for fast history lookups per user, newest first
create index if not exists history_user_id_created_at_idx
  on public.history (user_id, created_at desc);

-- Atomic rate-limit check. Runs as a single locked transaction so two
-- near-simultaneous requests from the same user can NOT both read the same
-- "count so far" and both slip through — the row lock (`for update`) forces
-- the second request to wait until the first one's update commits. A plain
-- read-then-write from application code cannot guarantee this.
create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_window_seconds int,
  p_max_requests int
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  -- Even though this is SECURITY DEFINER (and so bypasses RLS), we must
  -- not trust p_user_id blindly — a signed-in attacker could otherwise
  -- call this RPC directly with someone else's user ID and manipulate
  -- their rate-limit window. auth.uid() is the actual caller, taken from
  -- their verified JWT, not from anything they can pass as a parameter.
  if auth.uid() is distinct from p_user_id then
    return false;
  end if;

  select rate_window_started_at, rate_window_count
    into v_window_start, v_count
    from public.profiles
    where id = p_user_id
    for update; -- locks this row until the transaction ends

  if v_window_start is null
     or extract(epoch from (now() - v_window_start)) > p_window_seconds then
    update public.profiles
      set rate_window_started_at = now(), rate_window_count = 1
      where id = p_user_id;
    return true;
  end if;

  if v_count >= p_max_requests then
    return false;
  end if;

  update public.profiles
    set rate_window_count = rate_window_count + 1
    where id = p_user_id;
  return true;
end;
$$;

-- Revoke every default grant Supabase automatically adds to new functions
-- (PUBLIC and anon), then grant only to logged-in users — this closes both
-- the "Public Can Execute" and "anon role can execute" warnings.
revoke execute on function public.check_rate_limit(uuid, int, int) from public;
revoke execute on function public.check_rate_limit(uuid, int, int) from anon;
grant execute on function public.check_rate_limit(uuid, int, int) to authenticated;

-- Atomic usage increment — avoids the same lost-update race as above: two
-- concurrent generations could otherwise both read generations_used = 2,
-- both write 3, and silently give the user one extra free generation.
create or replace function public.increment_generation_usage(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Same protection as check_rate_limit above — don't trust p_user_id
  -- blindly, verify it against the actual authenticated caller.
  if auth.uid() is distinct from p_user_id then
    return;
  end if;

  update public.profiles
    set generations_used = generations_used + 1
    where id = p_user_id;
end;
$$;

revoke execute on function public.increment_generation_usage(uuid) from public;
revoke execute on function public.increment_generation_usage(uuid) from anon;
grant execute on function public.increment_generation_usage(uuid) to authenticated;

-- IP-based signup limiting: tracks how many accounts have been created
-- from a given IP address recently. This is checked BEFORE an account is
-- created (see app/api/auth/signup/route.ts) — it stops the same person on
-- the same network from casually spinning up account after account for
-- fresh free tunes.
create table if not exists public.signup_ips (
  ip text primary key,
  window_started_at timestamptz not null default now(),
  count int not null default 0
);

-- Atomic check + increment, same row-locking pattern as check_rate_limit
-- above — prevents two near-simultaneous signups from the same IP both
-- reading a stale count and both slipping through.
create or replace function public.check_signup_ip_limit(
  p_ip text,
  p_window_seconds int,
  p_max_signups int
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  insert into public.signup_ips (ip, window_started_at, count)
    values (p_ip, now(), 0)
    on conflict (ip) do nothing;

  select window_started_at, count into v_window_start, v_count
    from public.signup_ips
    where ip = p_ip
    for update;

  if extract(epoch from (now() - v_window_start)) > p_window_seconds then
    update public.signup_ips
      set window_started_at = now(), count = 1
      where ip = p_ip;
    return true;
  end if;

  if v_count >= p_max_signups then
    return false;
  end if;

  update public.signup_ips
    set count = count + 1
    where ip = p_ip;
  return true;
end;
$$;

-- Both callers of check_signup_ip_limit (the signup route, and the
-- dashboard's Google-OAuth fallback) now go through the service-role admin
-- client, which bypasses RLS and function grants entirely — that's why the
-- function above has no authenticated grant.
alter table public.signup_ips enable row level security;
-- Explicit deny-all policy — this table should NEVER be touched directly
-- by any client role, only through check_signup_ip_limit() above (which
-- runs as the function owner and bypasses this). Adding this policy
-- explicitly (rather than relying on "RLS enabled + zero policies = deny
-- all") makes the intent clear and satisfies Supabase's security linter,
-- which otherwise flags a table with RLS on but no policies as a likely
-- mistake.
drop policy if exists "No direct access" on public.signup_ips;
create policy "No direct access"
  on public.signup_ips for all
  using (false);
-- This function is intentionally NOT granted to `authenticated` or `anon`
-- — it's a system-level check (by IP, not scoped to a specific user's own
-- data) that should only ever run via our server's admin/service-role
-- client, which bypasses these grants entirely. The dashboard's Google-
-- OAuth fallback check (app/dashboard/page.tsx) uses createAdminClient()
-- for exactly this reason, rather than the regular user-session client.
revoke execute on function public.check_signup_ip_limit(text, int, int) from public;
revoke execute on function public.check_signup_ip_limit(text, int, int) from anon;
revoke execute on function public.check_signup_ip_limit(text, int, int) from authenticated;
