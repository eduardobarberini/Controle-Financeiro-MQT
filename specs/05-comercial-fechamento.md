# 05 — Comercial e fechamento mensal

## Objetivo

Substituir `fechamento.mjs` + `decisoes/*.json` por um módulo no sistema: vendas por vendedora
identificadas automaticamente (Guru e Asaas), ajustes com motivo, cálculo de fixo + comissão e
fechamento do mês travado.

## Modelo de dados

```sql
create table public.commercial_closings (
  id uuid pk, user_id uuid not null, seller_id uuid not null references sellers,
  year int not null, month int not null,
  status text not null default 'aberto' check (status in ('aberto','fechado')),
  gross numeric(14,2), refunded numeric(14,2), net numeric(14,2),
  sales_count int, fixed_salary numeric(14,2), commission numeric(14,2), total_payable numeric(14,2),
  closed_at timestamptz, notes text,
  unique (user_id, seller_id, year, month)
);

create table public.commercial_adjustments (
  id uuid pk, user_id uuid not null, seller_id uuid not null,
  year int not null, month int not null,
  type text not null check (type in ('excluir','incluir')),
  source text check (source in ('guru','asaas','manual')),
  external_id text,                  -- id da transação/cobrança excluída ou incluída
  amount numeric(14,2),              -- para 'incluir' manual
  description text, reason text not null,
  covers text[],                     -- ids que esta inclusão substitui (venda dividida)
  created_at timestamptz default now()
);
```

View `v_commercial_sales(user_id, seller_id, year, month, source, external_id, sold_at, kind,
customer, gross, refunded, status, is_first_installment_paid)` une Guru (`confirmed_at` no mês,
`seller_id` não nulo, status aprovado/completo/reembolsado/chargeback/disputa) e Asaas (contratos
com parcela 1 paga, `dateCreated` no mês, link com `seller_id`).

## Regras (spec 00, seção Comercial)

- Bruto: Guru `gross`; Asaas `contract_value` do link (297 no link padrão) ou total do contrato.
- Líquido = bruto − reembolsos (mês da venda original) ± ajustes.
- Comissão = líquido × `sellers.commission_rate`; a pagar = `fixed_salary` + comissão.
- Mês fechado: recálculo bloqueado; reabrir exige motivo (registrado em `notes`).

## Tela "Comercial"

- Cabeçalho: mês/ano, cards por vendedora (bruto, reembolsos, líquido, comissão, fixo, a pagar, ticket médio, qtd).
- Tabela de vendas da vendedora: data, fonte (Guru/Asaas), cliente, oferta, método, valor, status
  (pago / reembolsado / pendente), checkbox "excluir" com motivo.
- "Incluir venda manual": valor, descrição, motivo, ids que cobre.
- Avisos automáticos (da auditoria): cliente com venda Guru **e** Asaas no mesmo mês (possível duplicidade);
  contrato Asaas com parcela 2/3 vencida; venda em link da empresa com nome da vendedora na descrição.
- Botão "Fechar mês" → gera `commercial_closings`, exporta PDF/CSV do extrato.

## Importação dos ajustes antigos

`decisoes/<vendedor>_<mes>.json` → `commercial_adjustments` (script na spec 02).

## Critérios de aceite

- Agosto e setembro/2026: a pagar por vendedora igual ao gerado por `fechamento.mjs` com os
  mesmos ajustes importados.
- Venda do Asaas cuja parcela 1 só foi paga no mês seguinte aparece no mês seguinte.
- Reembolso do Guru de venda de agosto recebido em setembro reduz agosto (se aberto) ou gera
  aviso em setembro (se agosto fechado).
