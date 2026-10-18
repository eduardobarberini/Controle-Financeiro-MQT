-- =============================================================================
-- Controle Financeiro MQT — esquema principal
-- Todas as tabelas são por usuário (user_id = auth.users.id) com RLS.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Função utilitária: mantém updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- company_settings: nome da empresa e logo (1 por usuário)
-- -----------------------------------------------------------------------------
create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company_name text not null default '',
  logo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- -----------------------------------------------------------------------------
-- goals: metas anuais
-- -----------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  annual_revenue_goal numeric(14, 2) not null default 0,
  annual_profit_goal numeric(14, 2) not null default 0,
  profit_margin_goal numeric(6, 2),
  renewal_rate_goal numeric(6, 2),
  tax_meta_rate numeric(6, 2),
  sales_tax_rate numeric(6, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);

-- -----------------------------------------------------------------------------
-- monthly_details: controle mensal (entradas manuais / ajustes)
-- -----------------------------------------------------------------------------
create table public.monthly_details (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  month integer not null check (month between 1 and 12),
  revenue numeric(14, 2) not null default 0,
  ads_meta numeric(14, 2) not null default 0,
  sales_commission numeric(14, 2) not null default 0,
  other_variable_costs numeric(14, 2) not null default 0,
  fixed_costs numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year, month)
);

-- -----------------------------------------------------------------------------
-- renewals: renovações mensais
-- -----------------------------------------------------------------------------
create table public.renewals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  month integer not null check (month between 1 and 12),
  students_to_renew integer not null default 0,
  renewals integer not null default 0,
  renewal_revenue numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year, month)
);

-- -----------------------------------------------------------------------------
-- paid_launches: lançamentos pagos (turmas)
-- -----------------------------------------------------------------------------
create table public.paid_launches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  batch text not null,
  capture_days integer not null default 0,
  ticket_ticket numeric(14, 2) not null default 0,
  traffic_investment numeric(14, 2) not null default 0,
  total_ticket_sales integer not null default 0,
  ticket_refunds integer not null default 0,
  bump_ticket numeric(14, 2) not null default 0,
  bump_sales integer not null default 0,
  bump_refunds integer not null default 0,
  api_official_cost numeric(14, 2),
  commercial_commission numeric(14, 2),
  revenue_tax_rate numeric(6, 2),
  traffic_tax_rate numeric(6, 2),
  students_in_challenge integer,
  debriefing text,
  daily_data jsonb,
  class_sessions jsonb,
  commercial_sales jsonb,
  upsell_platform jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index paid_launches_user_created_idx on public.paid_launches (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- fixed_expense_categories / fixed_expenses: gastos fixos
-- -----------------------------------------------------------------------------
create table public.fixed_expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  color text not null default '#6D49F2',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fixed_expense_categories_user_idx on public.fixed_expense_categories (user_id, name);

create type public.expense_status as enum ('pago', 'pendente');
create type public.expense_recurrence as enum ('pontual', 'mensal', 'trimestral', 'semestral', 'anual');

create table public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.fixed_expense_categories (id) on delete restrict,
  description text not null check (char_length(description) between 1 and 200),
  amount numeric(14, 2) not null check (amount >= 0),
  due_day integer not null check (due_day between 1 and 31),
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  status public.expense_status not null default 'pendente',
  recurrence public.expense_recurrence not null default 'pontual',
  -- Competência (mês/ano) em que a recorrência termina. NULL = sem fim.
  ends_year integer check (ends_year between 2000 and 2100),
  ends_month integer check (ends_month between 1 and 12),
  -- Quando este registro é a ocorrência paga de um gasto recorrente,
  -- aponta para o registro de origem. Evita que a ocorrência gere novas projeções.
  origin_id uuid references public.fixed_expenses (id) on delete cascade,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index fixed_expenses_user_competence_idx on public.fixed_expenses (user_id, year, month);
create index fixed_expenses_category_idx on public.fixed_expenses (category_id);
create index fixed_expenses_origin_idx on public.fixed_expenses (origin_id);

-- -----------------------------------------------------------------------------
-- Triggers de updated_at
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'company_settings', 'goals', 'monthly_details', 'renewals',
    'paid_launches', 'fixed_expense_categories', 'fixed_expenses'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS: cada usuário só enxerga e altera o que é dele
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'company_settings', 'goals', 'monthly_details', 'renewals',
    'paid_launches', 'fixed_expense_categories', 'fixed_expenses'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: dono seleciona" on public.%1$I for select
         to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: dono insere" on public.%1$I for insert
         to authenticated with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: dono atualiza" on public.%1$I for update
         to authenticated using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: dono apaga" on public.%1$I for delete
         to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- Realtime nas tabelas usadas pelo painel
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table public.goals;
alter publication supabase_realtime add table public.monthly_details;
alter publication supabase_realtime add table public.renewals;
alter publication supabase_realtime add table public.fixed_expenses;
alter publication supabase_realtime add table public.fixed_expense_categories;

-- -----------------------------------------------------------------------------
-- Storage: bucket público para logos (cada usuário escreve só na própria pasta)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos', 'logos', true, 5242880,
  array['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
on conflict (id) do nothing;

create policy "logos: leitura pública" on storage.objects
  for select using (bucket_id = 'logos');

create policy "logos: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "logos: dono atualiza" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "logos: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (select auth.uid())::text);
