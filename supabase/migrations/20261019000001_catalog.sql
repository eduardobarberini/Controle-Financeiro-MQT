-- =============================================================================
-- Spec 01 — Catálogo de produtos (Guru), links de pagamento (Asaas) e
-- vendedoras. Toda venda passa a saber o que é (kind) e quem vendeu
-- (seller_id). A classificação é sugerida pelo nome e corrigível na tela;
-- as vendas são classificadas por gatilho ao entrar e reclassificadas quando
-- o catálogo muda.
-- =============================================================================

create extension if not exists unaccent with schema extensions;

create type public.product_kind as enum ('ingresso', 'bump', 'plataforma', 'renovacao', 'outro', 'ignorar');

-- -----------------------------------------------------------------------------
-- Texto normalizado: minúsculo, sem acento, espaços colapsados.
-- -----------------------------------------------------------------------------
create or replace function public.norm_text(s text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(s, ''))),
    '\s+', ' ', 'g'))
$$;

-- -----------------------------------------------------------------------------
-- business_settings: constantes de negócio editáveis (spec 00, D6)
-- -----------------------------------------------------------------------------
create table public.business_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  tax_meta_rate numeric(6, 2) not null default 12.15,
  sales_tax_rate numeric(6, 2) not null default 7.50,
  commission_rate numeric(6, 2) not null default 5.00,
  api_cost_per_launch numeric(14, 2) not null default 490,
  whatsapp_cost_per_ticket numeric(14, 2) not null default 0.50,
  ticket_price numeric(14, 2) not null default 29.90,
  bump_price numeric(14, 2) not null default 19.90,
  platform_list_price numeric(14, 2) not null default 297,
  -- dias relativos ao domingo D da turma e recorte da primeira hora (BRT)
  launch_window jsonb not null default
    '{"ticket_from": -6, "ticket_to": 0, "platform_from": 4, "platform_to": 10,
      "first_hour_day": 4, "first_hour_start": "08:00", "first_hour_end": "10:00"}'::jsonb,
  meta_ad_account_id text default 'act_176316426796892',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- sellers: vendedoras do comercial. Os padrões são expressões regulares
-- aplicadas ao texto normalizado (minúsculo, sem acento); `\b` é aceito e
-- convertido para o limite de palavra do Postgres (`\y`).
-- -----------------------------------------------------------------------------
create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  code text not null,
  fixed_salary numeric(14, 2) not null default 0,
  commission_rate numeric(6, 2) not null default 5,
  guru_patterns text[] not null default '{}',
  asaas_patterns text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, code)
);

-- Padrão inválido quebraria a classificação de toda venda que entra: recusa na gravação.
create or replace function public.sellers_validate_patterns()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  p text;
begin
  foreach p in array new.guru_patterns || new.asaas_patterns
  loop
    begin
      perform '' ~* replace(p, '\b', '\y');
    exception when others then
      raise exception 'Padrão inválido para %: "%" (%)', new.name, p, sqlerrm;
    end;
  end loop;
  return new;
end;
$$;

create trigger sellers_validate_patterns
  before insert or update of guru_patterns, asaas_patterns on public.sellers
  for each row execute function public.sellers_validate_patterns();

-- -----------------------------------------------------------------------------
-- guru_products: um produto do Guru (product.id = marketplace_id)
-- Quantidade de vendas e última venda saem da view v_guru_product_catalog.
-- -----------------------------------------------------------------------------
create table public.guru_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  guru_product_id text not null,
  internal_id text,
  name text not null,
  marketplace_name text,
  kind public.product_kind not null default 'outro',
  kind_source text not null default 'auto' check (kind_source in ('auto', 'manual')),
  list_price numeric(14, 2),
  first_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, guru_product_id)
);

-- -----------------------------------------------------------------------------
-- asaas_payment_links: links de pagamento (paymentLink das cobranças)
-- -----------------------------------------------------------------------------
create table public.asaas_payment_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  asaas_link_id text not null,
  name text not null,
  kind public.product_kind not null default 'outro',
  seller_id uuid references public.sellers (id) on delete set null,
  is_company_link boolean not null default false,
  -- valor de tabela do contrato; null = total da cobrança (parcelas × valor)
  contract_value numeric(14, 2),
  kind_source text not null default 'auto' check (kind_source in ('auto', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, asaas_link_id)
);

-- -----------------------------------------------------------------------------
-- Colunas derivadas nas vendas
-- -----------------------------------------------------------------------------
alter table public.guru_transactions
  add column kind public.product_kind,
  add column seller_id uuid references public.sellers (id) on delete set null,
  add column checkout_name text,
  add column is_commercial boolean generated always as (seller_id is not null) stored,
  add column confirmed_local date
    generated always as ((confirmed_at at time zone 'America/Sao_Paulo')::date) stored;

-- installment_count (já existente) guarda o total de parcelas do contrato.
alter table public.asaas_payments
  add column payment_link_id text,
  add column kind public.product_kind,
  add column seller_id uuid references public.sellers (id) on delete set null,
  add column contract_value numeric(14, 2);

create index guru_transactions_user_kind_day_idx
  on public.guru_transactions (user_id, kind, confirmed_local);
create index guru_transactions_user_seller_idx
  on public.guru_transactions (user_id, seller_id) where seller_id is not null;
create index asaas_payments_user_link_idx on public.asaas_payments (user_id, payment_link_id);
create index asaas_payments_user_kind_idx on public.asaas_payments (user_id, kind, asaas_created_at);
create index asaas_payments_user_seller_idx
  on public.asaas_payments (user_id, seller_id) where seller_id is not null;

-- -----------------------------------------------------------------------------
-- Regras de sugestão (spec 00 e 01)
-- -----------------------------------------------------------------------------

-- Produto do Guru pelo nome: ingresso → bump → renovação → plataforma → outro.
create or replace function public.suggest_guru_product_kind(p_name text)
returns public.product_kind
language sql
immutable
set search_path = ''
as $$
  select case
    when n like '%desafio desincha%' then 'ingresso'
    when n like '%detox%' or n like '%cardapio%' then 'bump'
    when n like '%renovac%' then 'renovacao'
    when n like '%plataforma%'
      or n ~ '^maes que treinam( \(|$)'
      or n like '%projeto mae sem barriga%' then 'plataforma'
    else 'outro'
  end::public.product_kind
  from (select public.norm_text(p_name) as n) x
$$;

-- Tipo da venda do Guru a partir do tipo do produto. Ofertas gratuitas
-- (method = free) ficam fora dos totais; ingresso vendido como order bump não
-- conta como ingresso (mesma regra do turma.mjs).
create or replace function public.guru_transaction_kind(
  p_product_kind public.product_kind,
  p_is_order_bump boolean,
  p_payment_method text
)
returns public.product_kind
language sql
immutable
set search_path = ''
as $$
  select case
    when p_payment_method = 'free' then 'ignorar'
    when p_product_kind is null then 'outro'
    when p_product_kind = 'ingresso' and coalesce(p_is_order_bump, false) then 'outro'
    else p_product_kind
  end::public.product_kind
$$;

-- Link (ou descrição de cobrança sem link) do Asaas pelo nome.
create or replace function public.suggest_asaas_kind(p_name text)
returns public.product_kind
language sql
immutable
set search_path = ''
as $$
  select case
    when n like '%renova%' then 'renovacao'
    when n like '%plataforma%' or n like '%maes que treinam%' or n ~ 'projeto maes? sem barriga'
      then 'plataforma'
    else 'outro'
  end::public.product_kind
  from (select public.norm_text(p_name) as n) x
$$;

-- Link da empresa (sem vendedora): "(MQT)", "- MQT", "(Empresa)".
create or replace function public.is_company_link_name(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select public.norm_text(p_name) ~ '\((mqt|empresa)\)|[-–]\s*mqt\s*$'
$$;

-- Link padrão da plataforma: "Plataforma Mães Que Treinam (<sigla>)".
create or replace function public.is_standard_platform_link(p_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select public.norm_text(p_name) ~ '^plataforma maes que treinam \([a-z]+\)$'
$$;

-- Vendedora cujo padrão casa com o texto (checkout_name do Guru ou nome do
-- link do Asaas). Vendedoras inativas continuam casando: o histórico é delas.
create or replace function public.match_seller(p_user_id uuid, p_text text, p_source text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select s.id
  from public.sellers s
  where s.user_id = p_user_id
    and p_text is not null
    and exists (
      select 1
      from unnest(case when p_source = 'guru' then s.guru_patterns else s.asaas_patterns end) as p(pattern)
      where public.norm_text(p_text) ~* replace(p.pattern, '\b', '\y')
    )
  order by s.code
  limit 1
$$;

-- -----------------------------------------------------------------------------
-- Gatilhos de classificação na entrada (webhook, sync e importador)
-- -----------------------------------------------------------------------------
create or replace function public.guru_transactions_classify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind public.product_kind;
begin
  new.checkout_name := coalesce(
    new.checkout_name,
    new.raw #>> '{trackings,pptc,checkout_name}',
    new.raw #>> '{source,pptc,checkout_name}'
  );

  if new.product_id is not null then
    select p.kind into v_kind
      from public.guru_products p
     where p.user_id = new.user_id and p.guru_product_id = new.product_id;
    if not found then
      v_kind := public.suggest_guru_product_kind(new.product_name);
      insert into public.guru_products
        (user_id, guru_product_id, internal_id, name, marketplace_name, kind, first_seen_at)
      values (
        new.user_id, new.product_id, new.raw #>> '{product,internal_id}',
        coalesce(new.product_name, new.product_id), new.marketplace_name, v_kind,
        coalesce(new.confirmed_at, new.ordered_at)
      )
      on conflict (user_id, guru_product_id) do nothing;
    end if;
  end if;

  new.kind := public.guru_transaction_kind(v_kind, new.is_order_bump, new.payment_method);
  new.seller_id := public.match_seller(new.user_id, new.checkout_name, 'guru');
  return new;
end;
$$;

create trigger guru_transactions_classify
  before insert or update of product_id, product_name, checkout_name, is_order_bump, payment_method, raw
  on public.guru_transactions
  for each row execute function public.guru_transactions_classify();

-- Sugestões do link quando ele é criado ou renomeado (só se não foi editado à mão).
create or replace function public.asaas_payment_links_suggest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind_source = 'auto' then
    new.kind := public.suggest_asaas_kind(new.name);
    new.seller_id := public.match_seller(new.user_id, new.name, 'asaas');
    new.is_company_link := public.is_company_link_name(new.name);
    new.contract_value := case
      when public.is_standard_platform_link(new.name) then coalesce(
        (select b.platform_list_price from public.business_settings b where b.user_id = new.user_id),
        297)
    end;
  end if;
  return new;
end;
$$;

create trigger asaas_payment_links_suggest
  before insert or update of name, kind_source on public.asaas_payment_links
  for each row execute function public.asaas_payment_links_suggest();

create or replace function public.asaas_payments_classify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.asaas_payment_links%rowtype;
begin
  new.payment_link_id := coalesce(new.payment_link_id, new.raw ->> 'paymentLink');

  if new.payment_link_id is not null then
    select * into v_link
      from public.asaas_payment_links l
     where l.user_id = new.user_id and l.asaas_link_id = new.payment_link_id;
    if not found then
      -- Link ainda sem nome (chegou antes do sync de links): fica registrado
      -- e é renomeado/classificado quando o nome chegar.
      insert into public.asaas_payment_links (user_id, asaas_link_id, name)
      values (new.user_id, new.payment_link_id, 'Link ' || new.payment_link_id)
      on conflict (user_id, asaas_link_id) do nothing;
      select * into v_link
        from public.asaas_payment_links l
       where l.user_id = new.user_id and l.asaas_link_id = new.payment_link_id;
    end if;
    new.kind := v_link.kind;
    new.seller_id := v_link.seller_id;
    new.contract_value := coalesce(v_link.contract_value, round(new.value * coalesce(new.installment_count, 1), 2));
  else
    -- Cobrança avulsa (sem link): classifica pela descrição, sem vendedora.
    new.kind := public.suggest_asaas_kind(new.description);
    new.seller_id := null;
    new.contract_value := round(new.value * coalesce(new.installment_count, 1), 2);
  end if;
  return new;
end;
$$;

create trigger asaas_payments_classify
  before insert or update of payment_link_id, description, value, installment_count, raw
  on public.asaas_payments
  for each row execute function public.asaas_payments_classify();

-- Produto que volta para "automático" (ou é renomeado) recebe a sugestão pelo nome.
create or replace function public.guru_products_suggest()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind_source = 'auto' then
    new.kind := public.suggest_guru_product_kind(new.name);
  end if;
  return new;
end;
$$;

create trigger guru_products_suggest
  before update of name, kind_source on public.guru_products
  for each row execute function public.guru_products_suggest();

-- -----------------------------------------------------------------------------
-- Propagação: mudar o catálogo reclassifica as vendas afetadas.
-- -----------------------------------------------------------------------------
create or replace function public.guru_products_propagate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind is distinct from old.kind then
    update public.guru_transactions t
       set kind = public.guru_transaction_kind(new.kind, t.is_order_bump, t.payment_method)
     where t.user_id = new.user_id
       and t.product_id = new.guru_product_id
       and t.kind is distinct from public.guru_transaction_kind(new.kind, t.is_order_bump, t.payment_method);
  end if;
  return null;
end;
$$;

-- Sem lista de colunas: voltar para "auto" muda o kind pelo gatilho before,
-- sem o kind aparecer no UPDATE.
create trigger guru_products_propagate
  after update on public.guru_products
  for each row execute function public.guru_products_propagate();

create or replace function public.asaas_payment_links_propagate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.kind, new.seller_id, new.contract_value)
     is distinct from (old.kind, old.seller_id, old.contract_value) then
    update public.asaas_payments p
       set kind = new.kind,
           seller_id = new.seller_id,
           contract_value = coalesce(new.contract_value, round(p.value * coalesce(p.installment_count, 1), 2))
     where p.user_id = new.user_id
       and p.payment_link_id = new.asaas_link_id;
  end if;
  return null;
end;
$$;

create trigger asaas_payment_links_propagate
  after update on public.asaas_payment_links
  for each row execute function public.asaas_payment_links_propagate();

-- -----------------------------------------------------------------------------
-- Reclassificação completa (botão "Reclassificar vendas", importador, sync)
-- -----------------------------------------------------------------------------
create or replace function private.reclassify_sales_for(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_products int;
  v_links int;
  v_guru int;
  v_asaas int;
begin
  -- Produtos que ainda não estão no catálogo, com o nome mais recente.
  insert into public.guru_products (user_id, guru_product_id, internal_id, name, marketplace_name, kind, first_seen_at)
  select distinct on (t.product_id)
         p_user_id, t.product_id, t.raw #>> '{product,internal_id}',
         coalesce(t.product_name, t.product_id), t.marketplace_name,
         public.suggest_guru_product_kind(t.product_name),
         coalesce(t.confirmed_at, t.ordered_at)
    from public.guru_transactions t
   where t.user_id = p_user_id and t.product_id is not null
     and not exists (select 1 from public.guru_products p
                      where p.user_id = p_user_id and p.guru_product_id = t.product_id)
   order by t.product_id, coalesce(t.confirmed_at, t.ordered_at) desc nulls last
  on conflict (user_id, guru_product_id) do nothing;
  get diagnostics v_products = row_count;

  -- Nome mais recente e primeira venda de cada produto.
  update public.guru_products p
     set name = s.name, first_seen_at = s.first_seen_at
    from (
      select t.product_id,
             (array_agg(t.product_name order by coalesce(t.confirmed_at, t.ordered_at) desc nulls last)
               filter (where t.product_name is not null))[1] as name,
             min(coalesce(t.confirmed_at, t.ordered_at)) as first_seen_at
        from public.guru_transactions t
       where t.user_id = p_user_id and t.product_id is not null
       group by t.product_id
    ) s
   where p.user_id = p_user_id and p.guru_product_id = s.product_id
     and s.name is not null
     and (p.name, p.first_seen_at) is distinct from (s.name, s.first_seen_at);

  -- Sugestão refeita para os produtos que ninguém classificou à mão.
  update public.guru_products p
     set kind = public.suggest_guru_product_kind(p.name)
   where p.user_id = p_user_id and p.kind_source = 'auto'
     and p.kind is distinct from public.suggest_guru_product_kind(p.name);

  -- Links citados em cobranças e ainda desconhecidos.
  insert into public.asaas_payment_links (user_id, asaas_link_id, name)
  select distinct p_user_id, a.payment_link_id, 'Link ' || a.payment_link_id
    from public.asaas_payments a
   where a.user_id = p_user_id and a.payment_link_id is not null
  on conflict (user_id, asaas_link_id) do nothing;
  get diagnostics v_links = row_count;

  -- Sugestão refeita para links automáticos (gatilho de sugestão em update of name).
  update public.asaas_payment_links l
     set name = l.name
   where l.user_id = p_user_id and l.kind_source = 'auto';

  -- Vendas do Guru.
  with names as (
    select distinct t.checkout_name
      from public.guru_transactions t
     where t.user_id = p_user_id and t.checkout_name is not null
  ),
  sellers_by_name as (
    select n.checkout_name, public.match_seller(p_user_id, n.checkout_name, 'guru') as seller_id
      from names n
  ),
  calc as (
    select t.id,
           public.guru_transaction_kind(p.kind, t.is_order_bump, t.payment_method) as kind,
           s.seller_id
      from public.guru_transactions t
      left join public.guru_products p
        on p.user_id = t.user_id and p.guru_product_id = t.product_id
      left join sellers_by_name s on s.checkout_name = t.checkout_name
     where t.user_id = p_user_id
  )
  update public.guru_transactions t
     set kind = c.kind, seller_id = c.seller_id
    from calc c
   where c.id = t.id
     and (t.kind, t.seller_id) is distinct from (c.kind, c.seller_id);
  get diagnostics v_guru = row_count;

  -- Cobranças do Asaas.
  with calc as (
    select a.id,
           case when a.payment_link_id is null then public.suggest_asaas_kind(a.description) else l.kind end as kind,
           l.seller_id,
           coalesce(l.contract_value, round(a.value * coalesce(a.installment_count, 1), 2)) as contract_value
      from public.asaas_payments a
      left join public.asaas_payment_links l
        on l.user_id = a.user_id and l.asaas_link_id = a.payment_link_id
     where a.user_id = p_user_id
  )
  update public.asaas_payments a
     set kind = c.kind, seller_id = c.seller_id, contract_value = c.contract_value
    from calc c
   where c.id = a.id
     and (a.kind, a.seller_id, a.contract_value) is distinct from (c.kind, c.seller_id, c.contract_value);
  get diagnostics v_asaas = row_count;

  return jsonb_build_object(
    'new_products', v_products,
    'new_links', v_links,
    'guru_updated', v_guru,
    'asaas_updated', v_asaas
  );
end;
$$;

revoke all on function private.reclassify_sales_for(uuid) from public, anon, authenticated;

-- Ponto de entrada público: o usuário logado reclassifica as próprias vendas;
-- a service role (sem auth.uid()) informa o usuário.
create or replace function public.reclassify_sales(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce((select auth.uid()), p_user_id);
begin
  if v_user is null then
    raise exception 'reclassify_sales: usuário não informado';
  end if;
  if (select auth.uid()) is not null and p_user_id is not null and p_user_id <> (select auth.uid()) then
    raise exception 'reclassify_sales: não autorizado';
  end if;
  return private.reclassify_sales_for(v_user);
end;
$$;

revoke all on function public.reclassify_sales(uuid) from public, anon;
grant execute on function public.reclassify_sales(uuid) to authenticated, service_role;

-- Mudança nas vendedoras (padrões, nova vendedora) refaz a atribuição.
create or replace function public.sellers_reclassify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.reclassify_sales_for(new.user_id);
  return null;
end;
$$;

create trigger sellers_reclassify
  after insert or update of guru_patterns, asaas_patterns on public.sellers
  for each row execute function public.sellers_reclassify();

-- -----------------------------------------------------------------------------
-- Padrões do negócio: configurações e as vendedoras atuais (Maju e Marlene).
-- -----------------------------------------------------------------------------
create or replace function public.ensure_business_defaults(p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := coalesce((select auth.uid()), p_user_id);
begin
  if v_user is null then
    raise exception 'ensure_business_defaults: usuário não informado';
  end if;
  if (select auth.uid()) is not null and p_user_id is not null and p_user_id <> (select auth.uid()) then
    raise exception 'ensure_business_defaults: não autorizado';
  end if;

  insert into public.business_settings (user_id) values (v_user)
  on conflict (user_id) do nothing;

  if not exists (select 1 from public.sellers where user_id = v_user) then
    insert into public.sellers (user_id, name, code, fixed_salary, commission_rate, guru_patterns, asaas_patterns)
    values
      (v_user, 'Maju', 'MJ', 1500, 5,
       array['^comercial\s*-\s*maju\b'], array['\(mj\)', '[-–]\s*mj\b', '\(maju\)']),
      (v_user, 'Marlene', 'MZ', 1200, 5,
       array['^comercial\s*-\s*marlene\b'], array['\(mz\)', '[-–]\s*mz\b', '\(marlene\)']);
  end if;
end;
$$;

revoke all on function public.ensure_business_defaults(uuid) from public, anon;
grant execute on function public.ensure_business_defaults(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Views da tela de catálogo (quantidade e última venda calculadas na hora)
-- -----------------------------------------------------------------------------
create or replace view public.v_guru_product_catalog
with (security_invoker = true)
as
select
  p.*,
  coalesce(s.sales_count, 0)::int as sales_count,
  s.last_sale_at,
  s.typical_price
from public.guru_products p
left join lateral (
  select
    count(*) filter (where t.status in ('approved', 'completed')) as sales_count,
    max(t.confirmed_at) as last_sale_at,
    mode() within group (order by t.gross) filter (where t.status in ('approved', 'completed')) as typical_price
  from public.guru_transactions t
  where t.user_id = p.user_id and t.product_id = p.guru_product_id
) s on true;

create or replace view public.v_asaas_link_catalog
with (security_invoker = true)
as
select
  l.*,
  coalesce(s.contracts, 0)::int as contracts,
  coalesce(s.paid_contracts, 0)::int as paid_contracts,
  s.last_sale_on,
  s.typical_contract_value
from public.asaas_payment_links l
left join lateral (
  select
    count(*) as contracts,
    count(*) filter (where a.status in ('RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH')) as paid_contracts,
    max(a.asaas_created_at) as last_sale_on,
    mode() within group (order by round(a.value * coalesce(a.installment_count, 1), 2)) as typical_contract_value
  from public.asaas_payments a
  where a.user_id = l.user_id
    and a.payment_link_id = l.asaas_link_id
    and coalesce(a.installment_number, 1) = 1
    and a.deleted = false
) s on true;

-- -----------------------------------------------------------------------------
-- updated_at e RLS
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['business_settings', 'sellers', 'guru_products', 'asaas_payment_links']
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "%1$s: dono seleciona" on public.%1$I for select
         to authenticated using (user_id = (select auth.uid()))', t);
    execute format(
      'create policy "%1$s: dono atualiza" on public.%1$I for update to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Configurações e vendedoras o usuário também cria; produtos e links nascem
-- das vendas (o usuário só classifica).
create policy "business_settings: dono insere" on public.business_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "sellers: dono insere" on public.sellers
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "sellers: dono apaga" on public.sellers
  for delete to authenticated using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Dados já existentes: padrões e classificação para cada usuário com vendas.
-- -----------------------------------------------------------------------------
do $$
declare
  u uuid;
begin
  for u in
    select distinct user_id from public.guru_transactions
    union
    select distinct user_id from public.asaas_payments
  loop
    perform public.ensure_business_defaults(u);
    perform private.reclassify_sales_for(u);
  end loop;
end;
$$;
