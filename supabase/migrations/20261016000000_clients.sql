-- Registro da Central. Aplicar só no projeto Supabase NOVO da Central,
-- nunca no banco de uma loja.

create type public.project_status as enum (
  'nao_iniciado',
  'em_andamento',
  'homologacao',
  'producao',
  'pausado',
  'encerrado'
);

create table public.clients (
  slug text primary key,
  trade_name text not null,
  repo_name text not null,
  repo_path text not null,
  status public.project_status not null,
  summary text not null,
  cnpj char(14),
  supabase_ref text,
  supabase_host text,
  focus_homolog boolean not null default false,
  focus_production boolean not null default false,
  installed_at_store boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

insert into public.clients (
  slug, trade_name, repo_name, repo_path, status, summary, cnpj, supabase_ref, supabase_host, focus_homolog, focus_production
) values
  ('mix-parfum', 'Mix Parfum', 'ERPOnlyPy-Demo', 'C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-Demo', 'homologacao', 'Clone amarelo. Banco e tokens Focus preenchidos.', '46409303000163', 'gqrfzsgcfwpadyvfnbes', 'aws-1-us-east-1.pooler.supabase.com', true, true),
  ('hara-perfumes', 'Hara Perfumes', 'ERPOnlyPy', 'C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy', 'producao', 'Repositório principal. Banco e tokens Focus preenchidos.', '48460137000155', 'aepwxmawlifqkfczoicc', 'aws-1-us-east-1.pooler.supabase.com', true, true),
  ('tabacaju', 'Tabacaju', 'ERPOnlyPy-ylcfqm', 'C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-ylcfqm', 'em_andamento', 'Banco criado. CNPJ e Focus ainda vazios.', null, 'ylcfqmnowjewynsvtxqc', 'aws-1-us-west-2.pooler.supabase.com', false, false),
  ('elo', 'ELO', 'ERPOnlyPy-Elo', 'C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-Elo', 'nao_iniciado', 'Pasta criada. Implantação da loja ainda não começou.', '69113601000107', 'zxfvaawfbrfjuxsjbvif', 'db.zxfvaawfbrfjuxsjbvif.supabase.co', false, false);
