-- Registro da Central. Rodar no SQL Editor do projeto Supabase NOVO da Central.
-- Nunca rodar no banco de uma loja (Mix, Hara, Tabacaju, ELO).

do $$ begin
  create type public.project_status as enum (
    'nao_iniciado',
    'em_andamento',
    'homologacao',
    'producao',
    'pausado',
    'encerrado'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.clients (
  slug text primary key,
  trade_name text not null,
  repo_name text not null default '',
  repo_path text not null default '',
  status public.project_status not null default 'nao_iniciado',
  summary text not null default '',
  cnpj char(14),
  supabase_ref text,
  supabase_host text,
  focus_homolog boolean not null default false,
  focus_production boolean not null default false,
  focus_email text not null default '',
  focus_panel_url text not null default '',
  focus_ambiente text not null default '',
  db_user text not null default '',
  db_port text not null default '',
  db_name text not null default '',
  smtp_host text not null default '',
  smtp_port text not null default '',
  smtp_user text not null default '',
  smtp_from text not null default '',
  smtp_tls text not null default '',
  smtp_ssl text not null default '',
  printer_name text not null default '',
  db_password text not null default '',
  database_url text not null default '',
  focus_token text not null default '',
  focus_homolog_token text not null default '',
  focus_production_token text not null default '',
  smtp_password text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.clients add column if not exists focus_email text not null default '';
alter table public.clients add column if not exists focus_panel_url text not null default '';
alter table public.clients add column if not exists focus_ambiente text not null default '';
alter table public.clients add column if not exists db_user text not null default '';
alter table public.clients add column if not exists db_port text not null default '';
alter table public.clients add column if not exists db_name text not null default '';
alter table public.clients add column if not exists smtp_host text not null default '';
alter table public.clients add column if not exists smtp_port text not null default '';
alter table public.clients add column if not exists smtp_user text not null default '';
alter table public.clients add column if not exists smtp_from text not null default '';
alter table public.clients add column if not exists smtp_tls text not null default '';
alter table public.clients add column if not exists smtp_ssl text not null default '';
alter table public.clients add column if not exists printer_name text not null default '';
alter table public.clients add column if not exists db_password text not null default '';
alter table public.clients add column if not exists database_url text not null default '';
alter table public.clients add column if not exists focus_token text not null default '';
alter table public.clients add column if not exists focus_homolog_token text not null default '';
alter table public.clients add column if not exists focus_production_token text not null default '';
alter table public.clients add column if not exists smtp_password text not null default '';
alter table public.clients add column if not exists checklist jsonb not null default '[]'::jsonb;

create table if not exists public.client_dates (
  id uuid primary key,
  client_slug text not null references public.clients (slug) on delete cascade,
  kind text not null,
  day date not null,
  amount_cents integer,
  note text not null default '',
  done boolean not null default false
);

create table if not exists public.client_events (
  id uuid primary key,
  at timestamptz not null,
  slug text not null,
  text text not null
);

alter table public.clients enable row level security;
alter table public.client_dates enable row level security;
alter table public.client_events enable row level security;

revoke all on public.clients from anon;
revoke all on public.client_dates from anon;
revoke all on public.client_events from anon;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.client_dates to authenticated;
grant select, insert, update, delete on public.client_events to authenticated;

drop policy if exists "socios" on public.clients;
drop policy if exists "socios" on public.client_dates;
drop policy if exists "socios" on public.client_events;
create policy "socios" on public.clients for all to authenticated using (true) with check (true);
create policy "socios" on public.client_dates for all to authenticated using (true) with check (true);
create policy "socios" on public.client_events for all to authenticated using (true) with check (true);

insert into public.clients (
  slug, trade_name, repo_name, repo_path, status, summary, cnpj, supabase_ref, supabase_host, focus_homolog, focus_production
) values
  ('mix-parfum', 'Mix Parfum', 'ERPOnlyPy-Demo', 'C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-Demo', 'homologacao', 'Clone amarelo. Banco e tokens Focus preenchidos.', '46409303000163', 'gqrfzsgcfwpadyvfnbes', 'aws-1-us-east-1.pooler.supabase.com', true, true),
  ('hara-perfumes', 'Hara Perfumes', 'ERPOnlyPy', 'C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy', 'producao', 'Repositório principal. Banco e tokens Focus preenchidos.', '48460137000155', 'aepwxmawlifqkfczoicc', 'aws-1-us-east-1.pooler.supabase.com', true, true),
  ('tabacaju', 'Tabacaju', 'ERPOnlyPy-ylcfqm', 'C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-ylcfqm', 'em_andamento', 'Banco criado. CNPJ e Focus ainda vazios.', null, 'ylcfqmnowjewynsvtxqc', 'aws-1-us-west-2.pooler.supabase.com', false, false),
  ('elo', 'ELO', 'ERPOnlyPy-Elo', 'C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-Elo', 'nao_iniciado', 'Pasta criada. Implantação da loja ainda não começou.', '69113601000107', 'zxfvaawfbrfjuxsjbvif', 'db.zxfvaawfbrfjuxsjbvif.supabase.co', false, false)
on conflict (slug) do nothing;

do $$ begin
  alter publication supabase_realtime add table public.clients;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.client_dates;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.client_events;
exception when duplicate_object then null;
end $$;
