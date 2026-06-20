create extension if not exists pgcrypto;

create table if not exists public.user_passcodes (
  profile_id uuid primary key references auth.users(id) on delete cascade,
  passcode_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 5),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_passcodes enable row level security;

revoke all on table public.user_passcodes from anon, authenticated;

create or replace function public.set_my_passcode(p_passcode text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_passcode is null or p_passcode !~ '^[0-9]{4}$' then
    raise exception 'Passcode must be 4 digits';
  end if;

  insert into public.user_passcodes (
    profile_id,
    passcode_hash,
    failed_attempts,
    locked_until,
    updated_at
  )
  values (
    v_user_id,
    crypt(p_passcode, gen_salt('bf', 12)),
    0,
    null,
    now()
  )
  on conflict (profile_id) do update
  set passcode_hash = excluded.passcode_hash,
      failed_attempts = 0,
      locked_until = null,
      updated_at = now();
end;
$$;

create or replace function public.has_my_passcode()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.user_passcodes
      where profile_id = auth.uid()
    );
$$;

create or replace function public.verify_my_passcode(p_passcode text)
returns table (
  ok boolean,
  attempts_remaining integer,
  locked_until timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_record public.user_passcodes%rowtype;
  v_attempts integer;
  v_locked_until timestamptz;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_passcode is null or p_passcode !~ '^[0-9]{4}$' then
    return query select false, 0, null::timestamptz;
    return;
  end if;

  select *
  into v_record
  from public.user_passcodes
  where profile_id = v_user_id
  for update;

  if not found then
    return query select false, 5, null::timestamptz;
    return;
  end if;

  if v_record.locked_until is not null and v_record.locked_until > now() then
    return query select false, 0, v_record.locked_until;
    return;
  end if;

  if v_record.passcode_hash = crypt(p_passcode, v_record.passcode_hash) then
    update public.user_passcodes
    set failed_attempts = 0,
        locked_until = null,
        updated_at = now()
    where profile_id = v_user_id;

    return query select true, 5, null::timestamptz;
    return;
  end if;

  v_attempts := least(5, v_record.failed_attempts + 1);
  v_locked_until := case
    when v_attempts >= 5 then now() + interval '5 minutes'
    else null
  end;

  update public.user_passcodes
  set failed_attempts = v_attempts,
      locked_until = v_locked_until,
      updated_at = now()
  where profile_id = v_user_id;

  return query select false, greatest(0, 5 - v_attempts), v_locked_until;
end;
$$;

revoke all on function public.set_my_passcode(text) from public, anon;
revoke all on function public.has_my_passcode() from public, anon;
revoke all on function public.verify_my_passcode(text) from public, anon;

grant execute on function public.set_my_passcode(text) to authenticated;
grant execute on function public.has_my_passcode() to authenticated;
grant execute on function public.verify_my_passcode(text) to authenticated;

comment on table public.user_passcodes is
  'Server-side passcode hashes and lockout state. Hashes are never client-readable.';
