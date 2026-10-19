# 01 — Catálogo de produtos (Guru) e links (Asaas)

## Objetivo

Toda venda do Guru e toda cobrança do Asaas precisa saber **o que é** (ingresso, bump,
plataforma, renovação, outro) e **quem vendeu** (Maju, Marlene, empresa, orgânico). Hoje isso
está em regexes espalhadas pelos scripts; passa a ser dado no banco, com sugestão automática
e correção na tela.

## Modelo de dados

```sql
create type public.product_kind as enum ('ingresso','bump','plataforma','renovacao','outro','ignorar');

create table public.guru_products (
  id uuid pk, user_id uuid not null,
  guru_product_id text not null,          -- items[0].id (marketplace_id)
  internal_id text,                       -- uuid do Guru
  name text not null,
  marketplace_name text,                  -- appmaxgw | pagarme2
  kind public.product_kind not null default 'outro',
  kind_source text not null default 'auto' check (kind_source in ('auto','manual')),
  list_price numeric(14,2),               -- preço de referência
  first_seen_at timestamptz, last_seen_at timestamptz, sales_count int default 0,
  unique (user_id, guru_product_id)
);

create table public.sellers (
  id uuid pk, user_id uuid not null,
  name text not null,                      -- Maju, Marlene
  code text not null,                      -- MJ, MZ
  fixed_salary numeric(14,2) not null default 0,
  commission_rate numeric(6,2) not null default 5,
  guru_patterns text[] not null default '{}',   -- ex.: '^comercial\s*-\s*maju\b'
  asaas_patterns text[] not null default '{}',  -- ex.: '\(mj\)', '[-–]\s*mj\b', '\(maju\)'
  active boolean not null default true,
  unique (user_id, code)
);

create table public.asaas_payment_links (
  id uuid pk, user_id uuid not null,
  asaas_link_id text not null,            -- paymentLink
  name text not null,
  kind public.product_kind not null default 'outro',
  seller_id uuid references sellers,      -- null = empresa/orgânico
  is_company_link boolean default false,  -- "(MQT)"
  contract_value numeric(14,2),           -- valor de tabela (297 no link padrão)
  kind_source text default 'auto',
  unique (user_id, asaas_link_id)
);
```

Colunas derivadas nas tabelas de vendas (preenchidas pelo sync/importador e recalculáveis):

```sql
alter table guru_transactions add column kind public.product_kind, add column seller_id uuid,
  add column checkout_name text,     -- trackings.pptc.checkout_name (ou source.pptc no webhook)
  add column is_commercial boolean generated always as (seller_id is not null) stored,
  add column confirmed_local date;   -- (confirmed_at at time zone 'America/Sao_Paulo')::date
alter table asaas_payments add column payment_link_id text, add column kind public.product_kind,
  add column seller_id uuid, add column installment_total integer, add column contract_value numeric(14,2);
```

## Regras de sugestão automática

- `guru_products.kind` pelo nome conforme spec 00 (ordem: ingresso → bump → renovacao → plataforma → outro).
- `sellers.guru_patterns` aplicados a `checkout_name` (case-insensitive, sem acento).
- `asaas_payment_links.kind`: nome contém `renova` → renovacao; `plataforma` ou `maes que treinam` → plataforma; senão outro.
  `seller_id` pelos `asaas_patterns`; `(mqt)` → `is_company_link`.
- `contract_value`: se nome normalizado = `plataforma maes que treinam (<sigla>)` → `business_settings.platform_list_price`;
  senão derivado da cobrança ("Parcela 1 de 3" × valor) e confirmado na tela.
- Reclassificar vendas quando o usuário mudar um produto/link: função SQL `reclassify_sales(user_id)`.

## Tela

Em **Integrações → Catálogo**: três abas (Produtos Guru, Links Asaas, Vendedoras).
Lista com nome, tipo (select), vendedora, preço, vendas, última venda. Produtos novos
aparecem com badge "Novo, classifique". Botão "Reclassificar vendas".

## Critérios de aceite

- Importação/sync cria produtos e links desconhecidos automaticamente com `kind_source = 'auto'`.
- Todas as 22 mil transações do extrato de set–out/2026 recebem `kind` ≠ `outro`, exceto ofertas avulsas conhecidas.
- Venda com `checkout_name` "Comercial - Maju - R$ 297 - Desafio Pago" fica com `seller_id` = Maju.
- Cobrança Asaas do link "Plataforma Mães Que Treinam (MZ)" fica plataforma / Marlene / contrato 297.
- Teste unitário da função de classificação com os nomes reais listados em spec 00.
