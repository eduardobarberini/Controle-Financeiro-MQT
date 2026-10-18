-- =============================================================================
-- Integrações: Guru (vendas à vista), Asaas (parcelado PIX/boleto), Meta Ads.
-- As tabelas são alimentadas pelas Edge Functions (service role). O usuário só
-- lê (e, nas configurações, liga/desliga e ajusta parâmetros).
-- =============================================================================

create type public.integration_provider as enum ('guru', 'asaas', 'meta');

-- -----------------------------------------------------------------------------
-- integration_settings: 1 linha por provedor/usuário. Segredos NÃO ficam aqui
-- (vão em `supabase secrets`); aqui só parâmetros não sensíveis.
-- -----------------------------------------------------------------------------
create table public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider public.integration_provider not null,
  enabled boolean not null default true,
  -- meta: { "ad_account_id": "act_123" }  guru/asaas: {}
  config jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_sync_status text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- -----------------------------------------------------------------------------
-- sync_runs: histórico de execuções (cron, manual, webhook, backfill)
-- -----------------------------------------------------------------------------
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  provider public.integration_provider not null,
  trigger text not null check (trigger in ('cron', 'manual', 'webhook', 'backfill')),
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  records_upserted integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  error text
);

create index sync_runs_provider_started_idx on public.sync_runs (provider, started_at desc);

-- -----------------------------------------------------------------------------
-- webhook_events: tudo que chega bruto, para auditoria e idempotência
-- -----------------------------------------------------------------------------
create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  provider public.integration_provider not null,
  event_key text not null,
  event_type text,
  external_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (provider, event_key)
);

create index webhook_events_received_idx on public.webhook_events (provider, received_at desc);

-- -----------------------------------------------------------------------------
-- Guru: transações e assinaturas
-- -----------------------------------------------------------------------------
create table public.guru_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  guru_id text not null unique,
  status text not null,
  type text,
  is_order_bump boolean not null default false,
  has_order_bump boolean not null default false,
  product_id text,
  product_name text,
  product_type text,
  offer_id text,
  offer_name text,
  quantity integer,
  payment_method text,
  installments integer,
  gross numeric(14, 2) not null default 0,
  net numeric(14, 2) not null default 0,
  total numeric(14, 2) not null default 0,
  discount_value numeric(14, 2) not null default 0,
  affiliate_value numeric(14, 2) not null default 0,
  marketplace_value numeric(14, 2) not null default 0,
  tax_value numeric(14, 2) not null default 0,
  currency text,
  marketplace_name text,
  marketplace_id text,
  customer_id text,
  customer_name text,
  customer_email text,
  customer_doc text,
  affiliate_name text,
  coupon_code text,
  source text,
  checkout_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  subscription_code text,
  subscription_status text,
  invoice_cycle integer,
  invoice_type text,
  ordered_at timestamptz,
  confirmed_at timestamptz,
  canceled_at timestamptz,
  guru_updated_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guru_transactions_user_confirmed_idx on public.guru_transactions (user_id, confirmed_at desc);
create index guru_transactions_user_ordered_idx on public.guru_transactions (user_id, ordered_at desc);
create index guru_transactions_user_status_idx on public.guru_transactions (user_id, status);
create index guru_transactions_product_idx on public.guru_transactions (user_id, product_id);

create table public.guru_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  guru_id text not null unique,
  subscription_code text,
  status text not null,
  product_id text,
  product_name text,
  customer_id text,
  customer_name text,
  customer_email text,
  payment_method text,
  charged_every_days integer,
  charged_times integer,
  next_cycle_at date,
  next_cycle_value numeric(14, 2),
  started_at timestamptz,
  cancelled_at timestamptz,
  cancel_at_cycle_end boolean not null default false,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guru_subscriptions_user_status_idx on public.guru_subscriptions (user_id, status);

-- -----------------------------------------------------------------------------
-- Asaas: clientes e cobranças (cada parcela é uma cobrança)
-- -----------------------------------------------------------------------------
create table public.asaas_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asaas_id text not null unique,
  name text,
  email text,
  cpf_cnpj text,
  phone text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.asaas_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asaas_id text not null unique,
  customer_id text,
  installment_id text,
  installment_number integer,
  installment_count integer,
  value numeric(14, 2) not null default 0,
  net_value numeric(14, 2) not null default 0,
  original_value numeric(14, 2),
  interest_value numeric(14, 2),
  refunded_value numeric(14, 2) not null default 0,
  billing_type text,
  status text not null,
  due_date date,
  original_due_date date,
  payment_date date,
  client_payment_date date,
  confirmed_date date,
  credit_date date,
  estimated_credit_date date,
  description text,
  external_reference text,
  invoice_url text,
  deleted boolean not null default false,
  asaas_created_at date,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index asaas_payments_user_payment_date_idx on public.asaas_payments (user_id, payment_date desc);
create index asaas_payments_user_due_date_idx on public.asaas_payments (user_id, due_date);
create index asaas_payments_user_status_idx on public.asaas_payments (user_id, status);
create index asaas_payments_installment_idx on public.asaas_payments (installment_id);
create index asaas_payments_customer_idx on public.asaas_payments (customer_id);

-- -----------------------------------------------------------------------------
-- Meta Ads: campanhas e insights diários por campanha
-- -----------------------------------------------------------------------------
create table public.meta_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id text not null unique,
  ad_account_id text,
  name text,
  status text,
  effective_status text,
  objective text,
  created_time timestamptz,
  updated_time timestamptz,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meta_ad_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  campaign_id text not null,
  campaign_name text,
  ad_account_id text,
  spend numeric(14, 2) not null default 0,
  impressions integer not null default 0,
  reach integer not null default 0,
  clicks integer not null default 0,
  link_clicks integer not null default 0,
  cpm numeric(14, 4),
  cpc numeric(14, 4),
  ctr numeric(14, 4),
  frequency numeric(14, 4),
  landing_page_views integer not null default 0,
  leads integer not null default 0,
  initiate_checkouts integer not null default 0,
  purchases integer not null default 0,
  purchase_value numeric(14, 2) not null default 0,
  actions jsonb,
  action_values jsonb,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, campaign_id, date)
);

create index meta_ad_insights_user_date_idx on public.meta_ad_insights (user_id, date desc);

-- -----------------------------------------------------------------------------
-- Triggers de updated_at
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'integration_settings', 'guru_transactions', 'guru_subscriptions',
    'asaas_customers', 'asaas_payments', 'meta_campaigns', 'meta_ad_insights'
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
-- RLS: usuário lê o que é dele; escrita só pela service role (Edge Functions),
-- exceto integration_settings, que o usuário administra.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'sync_runs', 'webhook_events', 'guru_transactions', 'guru_subscriptions',
    'asaas_customers', 'asaas_payments', 'meta_campaigns', 'meta_ad_insights'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: dono seleciona" on public.%1$I for select
         to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

alter table public.integration_settings enable row level security;
create policy "integration_settings: dono seleciona" on public.integration_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "integration_settings: dono insere" on public.integration_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "integration_settings: dono atualiza" on public.integration_settings
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "integration_settings: dono apaga" on public.integration_settings
  for delete to authenticated using (user_id = (select auth.uid()));

-- Realtime para a tela de integrações acompanhar sincronizações
alter publication supabase_realtime add table public.sync_runs;
alter publication supabase_realtime add table public.integration_settings;

-- -----------------------------------------------------------------------------
-- Visão consolidada por mês: receita Guru (à vista), recebimentos Asaas
-- (parcelado) e investimento Meta. Base para o Controle Mensal automático.
-- -----------------------------------------------------------------------------
create or replace view public.v_monthly_integrations
with (security_invoker = true)
as
with guru as (
  select
    user_id,
    extract(year from (confirmed_at at time zone 'America/Sao_Paulo'))::int as year,
    extract(month from (confirmed_at at time zone 'America/Sao_Paulo'))::int as month,
    count(*) filter (where status in ('approved', 'completed')) as guru_sales,
    coalesce(sum(gross) filter (where status in ('approved', 'completed')), 0) as guru_gross,
    coalesce(sum(net) filter (where status in ('approved', 'completed')), 0) as guru_net,
    count(*) filter (where status in ('refunded', 'chargeback')) as guru_refund_count,
    coalesce(sum(gross) filter (where status in ('refunded', 'chargeback')), 0) as guru_refunded
  from public.guru_transactions
  where confirmed_at is not null
  group by 1, 2, 3
),
asaas as (
  select
    user_id,
    extract(year from payment_date)::int as year,
    extract(month from payment_date)::int as month,
    count(*) as asaas_paid_count,
    coalesce(sum(value), 0) as asaas_received,
    coalesce(sum(net_value), 0) as asaas_net,
    coalesce(sum(refunded_value), 0) as asaas_refunded
  from public.asaas_payments
  where payment_date is not null
    and deleted = false
    and status in ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED')
  group by 1, 2, 3
),
meta as (
  select
    user_id,
    extract(year from date)::int as year,
    extract(month from date)::int as month,
    coalesce(sum(spend), 0) as meta_spend,
    coalesce(sum(impressions), 0) as meta_impressions,
    coalesce(sum(link_clicks), 0) as meta_link_clicks,
    coalesce(sum(leads), 0) as meta_leads,
    coalesce(sum(purchases), 0) as meta_purchases,
    coalesce(sum(purchase_value), 0) as meta_purchase_value
  from public.meta_ad_insights
  group by 1, 2, 3
),
keys as (
  select user_id, year, month from guru
  union select user_id, year, month from asaas
  union select user_id, year, month from meta
)
select
  k.user_id,
  k.year,
  k.month,
  coalesce(g.guru_sales, 0) as guru_sales,
  coalesce(g.guru_gross, 0) as guru_gross,
  coalesce(g.guru_net, 0) as guru_net,
  coalesce(g.guru_refund_count, 0) as guru_refund_count,
  coalesce(g.guru_refunded, 0) as guru_refunded,
  coalesce(a.asaas_paid_count, 0) as asaas_paid_count,
  coalesce(a.asaas_received, 0) as asaas_received,
  coalesce(a.asaas_net, 0) as asaas_net,
  coalesce(a.asaas_refunded, 0) as asaas_refunded,
  coalesce(m.meta_spend, 0) as meta_spend,
  coalesce(m.meta_impressions, 0) as meta_impressions,
  coalesce(m.meta_link_clicks, 0) as meta_link_clicks,
  coalesce(m.meta_leads, 0) as meta_leads,
  coalesce(m.meta_purchases, 0) as meta_purchases,
  coalesce(m.meta_purchase_value, 0) as meta_purchase_value
from keys k
left join guru g on g.user_id = k.user_id and g.year = k.year and g.month = k.month
left join asaas a on a.user_id = k.user_id and a.year = k.year and a.month = k.month
left join meta m on m.user_id = k.user_id and m.year = k.year and m.month = k.month;

-- Parcelas em aberto (a receber) do Asaas
create or replace view public.v_asaas_receivables
with (security_invoker = true)
as
select
  user_id,
  count(*) as open_count,
  coalesce(sum(value), 0) as open_value,
  count(*) filter (where status = 'OVERDUE') as overdue_count,
  coalesce(sum(value) filter (where status = 'OVERDUE'), 0) as overdue_value
from public.asaas_payments
where deleted = false and status in ('PENDING', 'OVERDUE')
group by user_id;
