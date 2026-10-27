-- Níveis, autorizações, contatos, anexos e avisos.
-- Rodar no SQL Editor do projeto Supabase da Central, depois de 20261016000000_clients.sql.
-- O usuário thneto1103@gmail.com já precisa existir em Authentication → Users.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null check (role in ('socio', 'vendedor')),
  created_at timestamptz not null default now()
);

create table if not exists public.client_grants (
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  client_slug text not null references public.clients (slug) on delete cascade,
  primary key (user_id, client_slug)
);

create table if not exists public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_slug text not null references public.clients (slug) on delete cascade,
  name text not null,
  phone text not null default '',
  role_label text not null default ''
);

create table if not exists public.client_files (
  id uuid primary key default gen_random_uuid(),
  client_slug text not null references public.clients (slug) on delete cascade,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.date_reminders (
  date_id uuid not null references public.client_dates (id) on delete cascade,
  sent_on date not null,
  primary key (date_id, sent_on)
);

alter table public.client_events add column if not exists actor_email text not null default '';

insert into public.profiles (user_id, email, role)
select id, email, 'socio'
from auth.users
where lower(email) = 'thneto1103@gmail.com'
on conflict (user_id) do update set role = 'socio', email = excluded.email;

create or replace function public.is_socio()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'socio'
  );
$$;

create or replace function public.can_client(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_socio() or exists (
    select 1 from public.client_grants
    where user_id = auth.uid() and client_slug = target
  );
$$;

create or replace function public.stamp_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.actor_email := coalesce(auth.jwt() ->> 'email', '');
  return new;
end;
$$;

drop trigger if exists client_events_actor on public.client_events;
create trigger client_events_actor
  before insert on public.client_events
  for each row execute function public.stamp_actor();

create or replace function public.grant_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_socio() then
    insert into public.client_grants (user_id, client_slug)
    values (auth.uid(), new.slug)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists clients_grant_creator on public.clients;
create trigger clients_grant_creator
  after insert on public.clients
  for each row execute function public.grant_creator();

create or replace function public.keep_one_socio()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.profiles where role = 'socio') < 1 then
    raise exception 'Precisa restar um sócio.';
  end if;
  return null;
end;
$$;

drop trigger if exists profiles_keep_one_socio on public.profiles;
create trigger profiles_keep_one_socio
  after update or delete on public.profiles
  for each row execute function public.keep_one_socio();

create or replace function public.log_client_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target text;
  message text;
begin
  target := coalesce(new.client_slug, old.client_slug);
  message := case when tg_op = 'INSERT' then 'Autorização concedida' else 'Autorização retirada' end;
  insert into public.client_events (id, at, slug, text)
  values (gen_random_uuid(), now(), target, message);
  return null;
end;
$$;

drop trigger if exists client_grants_log on public.client_grants;
create trigger client_grants_log
  after insert or delete on public.client_grants
  for each row execute function public.log_client_change();

drop trigger if exists client_contacts_log on public.client_contacts;
drop trigger if exists client_files_log on public.client_files;

alter table public.profiles enable row level security;
alter table public.client_grants enable row level security;
alter table public.client_contacts enable row level security;
alter table public.client_files enable row level security;
alter table public.date_reminders enable row level security;

revoke all on public.profiles from anon;
revoke all on public.client_grants from anon;
revoke all on public.client_contacts from anon;
revoke all on public.client_files from anon;
revoke all on public.date_reminders from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.client_grants to authenticated;
grant select, insert, update, delete on public.client_contacts to authenticated;
grant select, insert, update, delete on public.client_files to authenticated;

drop policy if exists "socios" on public.clients;
drop policy if exists "socios" on public.client_dates;
drop policy if exists "socios" on public.client_events;
drop policy if exists "clients_select" on public.clients;
drop policy if exists "clients_insert" on public.clients;
drop policy if exists "clients_update" on public.clients;
drop policy if exists "clients_delete" on public.clients;
drop policy if exists "dates_all" on public.client_dates;
drop policy if exists "events_select" on public.client_events;
drop policy if exists "events_insert" on public.client_events;

create policy "clients_select" on public.clients for select to authenticated using (public.can_client(slug));
create policy "clients_insert" on public.clients for insert to authenticated with check (true);
create policy "clients_update" on public.clients for update to authenticated using (public.can_client(slug)) with check (public.can_client(slug));
create policy "clients_delete" on public.clients for delete to authenticated using (public.is_socio());
create policy "dates_all" on public.client_dates for all to authenticated using (public.can_client(client_slug)) with check (public.can_client(client_slug));
create policy "events_select" on public.client_events for select to authenticated using (public.can_client(slug));
create policy "events_insert" on public.client_events for insert to authenticated with check (public.can_client(slug));

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_select" on public.profiles for select to authenticated using (public.is_socio() or user_id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated
  using (public.is_socio() and user_id <> auth.uid())
  with check (public.is_socio() and user_id <> auth.uid());

drop policy if exists "grants_select" on public.client_grants;
drop policy if exists "grants_write" on public.client_grants;
create policy "grants_select" on public.client_grants for select to authenticated using (public.is_socio() or user_id = auth.uid());
create policy "grants_write" on public.client_grants for all to authenticated using (public.is_socio()) with check (public.is_socio());

drop policy if exists "contacts_all" on public.client_contacts;
drop policy if exists "files_all" on public.client_files;
create policy "contacts_all" on public.client_contacts for all to authenticated using (public.can_client(client_slug)) with check (public.can_client(client_slug));
create policy "files_all" on public.client_files for all to authenticated using (public.can_client(client_slug)) with check (public.can_client(client_slug));

insert into storage.buckets (id, name, public)
values ('client-files', 'client-files', false)
on conflict (id) do nothing;

drop policy if exists "client_files_read" on storage.objects;
drop policy if exists "client_files_write" on storage.objects;
drop policy if exists "client_files_delete" on storage.objects;
create policy "client_files_read" on storage.objects for select to authenticated
  using (bucket_id = 'client-files' and public.can_client((storage.foldername(name))[1]));
create policy "client_files_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'client-files' and public.can_client((storage.foldername(name))[1]));
create policy "client_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'client-files' and public.can_client((storage.foldername(name))[1]));

do $$ begin
  alter publication supabase_realtime add table public.client_contacts;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.client_files;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.client_grants;
exception when duplicate_object then null;
end $$;

-- Aviso diário: no painel, Edge Functions → reminders → Cron 0 11 * * *.
-- Segredos da função: RESEND_API_KEY e REMINDER_FROM. Sem eles o aviso não envia.
