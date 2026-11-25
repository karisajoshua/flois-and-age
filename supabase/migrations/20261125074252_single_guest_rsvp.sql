-- Prepared for review. Apply only to the wedding's approved Supabase project.
-- Guests never access these tables/functions directly; the Vercel server uses a secret key.
begin;

create table public.wedding_invitations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  guest_name text not null check (char_length(btrim(guest_name)) between 2 and 100),
  allocation smallint not null default 1 check (allocation = 1),
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.wedding_rsvps (
  invitation_id uuid primary key references public.wedding_invitations(id) on delete cascade,
  guest_name text not null check (char_length(btrim(guest_name)) between 2 and 100),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  attending boolean not null,
  guest_count smallint generated always as (case when attending then 1 else 0 end) stored,
  dietary text not null default '' check (char_length(dietary) <= 500),
  updated_at timestamptz not null default now()
);

create table public.wedding_rsvp_attempts (
  key_hash text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0)
);
create index wedding_rsvp_attempts_window on public.wedding_rsvp_attempts(window_start);

alter table public.wedding_invitations enable row level security;
alter table public.wedding_rsvps enable row level security;
alter table public.wedding_rsvp_attempts enable row level security;
revoke all on public.wedding_invitations, public.wedding_rsvps, public.wedding_rsvp_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.wedding_invitations, public.wedding_rsvps, public.wedding_rsvp_attempts to service_role;

create function public.wedding_rsvp_rate_limit(p_key text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / 900) * 900); v_attempts integer;
begin
  if p_key is null or p_key !~ '^[0-9a-f]{64}$' then raise exception 'invalid_input' using errcode = '22023'; end if;
  delete from public.wedding_rsvp_attempts where window_start < now() - interval '1 day';
  insert into public.wedding_rsvp_attempts(key_hash, window_start, attempts) values(p_key, v_window, 1)
  on conflict(key_hash) do update set
    attempts = case when public.wedding_rsvp_attempts.window_start = v_window then public.wedding_rsvp_attempts.attempts + 1 else 1 end,
    window_start = v_window
  returning attempts into v_attempts;
  return v_attempts <= 30;
end;
$$;

create function public.wedding_rsvp_lookup(p_token_hash text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_invite public.wedding_invitations%rowtype; v_response jsonb;
begin
  select * into v_invite from public.wedding_invitations
    where token_hash = p_token_hash and active and (expires_at is null or expires_at > now()) and allocation = 1;
  if not found then raise exception 'invalid_invitation'; end if;
  select jsonb_build_object('name', guest_name, 'email', email, 'attending', attending, 'dietary', dietary, 'guestCount', guest_count)
    into v_response from public.wedding_rsvps where invitation_id = v_invite.id;
  return jsonb_build_object('guestName', v_invite.guest_name, 'response', v_response);
end;
$$;

create function public.wedding_rsvp_save(p_token_hash text, p_name text, p_email text, p_attending boolean, p_dietary text default '') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_updated timestamptz;
begin
  if p_name is null or char_length(btrim(p_name)) not between 2 and 100 or p_name ~ '[[:cntrl:]]'
    or p_email is null or char_length(p_email) > 254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_attending is null or p_dietary is null or char_length(p_dietary) > 500
    then raise exception 'invalid_input' using errcode = '22023'; end if;
  select id into v_id from public.wedding_invitations
    where token_hash = p_token_hash and active and (expires_at is null or expires_at > now()) and allocation = 1 for update;
  if not found then raise exception 'invalid_invitation'; end if;
  insert into public.wedding_rsvps(invitation_id, guest_name, email, attending, dietary)
    values(v_id, btrim(p_name), lower(btrim(p_email)), p_attending, case when p_attending then btrim(p_dietary) else '' end)
  on conflict(invitation_id) do update set guest_name = excluded.guest_name, email = excluded.email,
    attending = excluded.attending, dietary = excluded.dietary, updated_at = clock_timestamp()
  returning updated_at into v_updated;
  return jsonb_build_object('saved', true, 'attending', p_attending, 'guestCount', case when p_attending then 1 else 0 end, 'updatedAt', v_updated);
end;
$$;

revoke all on function public.wedding_rsvp_rate_limit(text) from public, anon, authenticated;
revoke all on function public.wedding_rsvp_lookup(text) from public, anon, authenticated;
revoke all on function public.wedding_rsvp_save(text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.wedding_rsvp_rate_limit(text) to service_role;
grant execute on function public.wedding_rsvp_lookup(text) to service_role;
grant execute on function public.wedding_rsvp_save(text, text, text, boolean, text) to service_role;
notify pgrst, 'reload schema';
commit;
