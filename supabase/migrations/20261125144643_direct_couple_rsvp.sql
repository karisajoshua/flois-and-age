-- Review and approve before applying. Preserves the previous invitation/response tables.
begin;
create table public.wedding_guest_responses (
  id uuid primary key default gen_random_uuid(),
  receipt_hash text not null unique check (receipt_hash ~ '^[0-9a-f]{64}$'),
  guest_name text not null check (char_length(btrim(guest_name)) between 2 and 100 and guest_name !~ '[[:cntrl:]]'),
  partner_name text not null default '' check (partner_name = '' or (char_length(btrim(partner_name)) between 2 and 100 and partner_name !~ '[[:cntrl:]]')),
  email text not null unique check (email = lower(btrim(email)) and char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  attending boolean not null,
  guest_count smallint generated always as (case when attending then case when partner_name <> '' then 2 else 1 end else 0 end) stored,
  dietary text not null default '' check (char_length(dietary) <= 500),
  song text not null default '' check (char_length(song) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.wedding_story (
  id boolean primary key default true check (id),
  title text not null default 'Our story' check (char_length(btrim(title)) between 2 and 100),
  body text not null default '' check (char_length(body) <= 4000),
  photos jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 6),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.wedding_story(id) values(true);
alter table public.wedding_guest_responses enable row level security;
alter table public.wedding_story enable row level security;
revoke all on public.wedding_guest_responses, public.wedding_story from public, anon, authenticated;
grant select, insert, update, delete on public.wedding_guest_responses, public.wedding_story to service_role;

create function public.wedding_direct_lookup(p_receipt text) returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object('name', guest_name, 'partnerName', partner_name, 'email', email, 'attending', attending,
    'dietary', dietary, 'song', song, 'guestCount', guest_count)
  from public.wedding_guest_responses where receipt_hash = p_receipt;
$$;
create function public.wedding_direct_save(p_receipt text, p_name text, p_partner text, p_email text, p_attending boolean, p_dietary text, p_song text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_row public.wedding_guest_responses%rowtype;
begin
  if p_receipt is null or p_receipt !~ '^[0-9a-f]{64}$' or p_name is null or p_partner is null or p_email is null or p_attending is null or p_dietary is null or p_song is null
    then raise exception 'invalid_input' using errcode = '22023'; end if;
  insert into public.wedding_guest_responses(receipt_hash, guest_name, partner_name, email, attending, dietary, song)
    values(p_receipt, btrim(p_name), btrim(p_partner), lower(btrim(p_email)), p_attending, case when p_attending then btrim(p_dietary) else '' end, case when p_attending then btrim(p_song) else '' end)
  on conflict(receipt_hash) do update set guest_name = excluded.guest_name, partner_name = excluded.partner_name,
    email = excluded.email, attending = excluded.attending, dietary = excluded.dietary, song = excluded.song, updated_at = clock_timestamp()
  returning * into v_row;
  return jsonb_build_object('saved', true, 'attending', v_row.attending, 'guestCount', v_row.guest_count, 'updatedAt', v_row.updated_at);
end;
$$;
create function public.wedding_dashboard() returns jsonb
language sql security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', guest_name, 'partnerName', partner_name, 'email', email,
    'attending', attending, 'guestCount', guest_count, 'dietary', dietary, 'song', song, 'updatedAt', updated_at) order by updated_at desc), '[]'::jsonb)
  from public.wedding_guest_responses;
$$;
create function public.wedding_story_read(p_admin boolean default false) returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object('title', title, 'body', body, 'photos', photos, 'published', published, 'updatedAt', updated_at)
    from public.wedding_story where id and (published or p_admin);
$$;
create function public.wedding_story_save(p_title text, p_body text, p_photos jsonb, p_published boolean) returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin
  if p_title is null or p_body is null or p_photos is null or p_published is null
    or jsonb_typeof(p_photos) <> 'array' or jsonb_array_length(p_photos) > 6
    or (p_published and char_length(btrim(p_body)) < 20)
    then raise exception 'invalid_input' using errcode = '22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_photos) as photo where
    jsonb_typeof(photo) <> 'object' or (photo->>'path') is null or (photo->>'caption') is null
    or (photo->>'path') !~ '^story/[0-9a-f-]{36}\.(jpg|png|webp)$'
    or char_length(photo->>'caption') not between 2 and 150)
    then raise exception 'invalid_photo' using errcode = '22023'; end if;
  update public.wedding_story set title = btrim(p_title), body = btrim(p_body), photos = p_photos, published = p_published, updated_at = clock_timestamp() where id;
  return public.wedding_story_read(true);
end;
$$;
revoke all on function public.wedding_direct_lookup(text), public.wedding_direct_save(text, text, text, text, boolean, text, text),
  public.wedding_dashboard(), public.wedding_story_read(boolean), public.wedding_story_save(text, text, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.wedding_direct_lookup(text), public.wedding_direct_save(text, text, text, text, boolean, text, text),
  public.wedding_dashboard(), public.wedding_story_read(boolean), public.wedding_story_save(text, text, jsonb, boolean) to service_role;

-- Private photos stay in Storage, outside Git. No anonymous upload/read policies.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values('wedding-assets', 'wedding-assets', false, 3000000, array['image/jpeg','image/png','image/webp'])
  on conflict(id) do nothing;
notify pgrst, 'reload schema';
commit;
