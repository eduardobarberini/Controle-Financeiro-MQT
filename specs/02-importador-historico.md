# 02 — Importador do histórico (exportações em `MQT - IA`)

## Objetivo

Carregar no banco tudo que já foi exportado pelos scripts do Eduardo, sem bater na API:
Guru desde out/2025 e Asaas desde out/2025. Com isso o anual, as turmas e o comercial podem
ser validados contra os relatórios que ele já conhece.

## Fontes

| Arquivo (em `MQT - IA/ferramentas`) | Conteúdo | Observação |
|---|---|---|
| `guru/saidas/guru_confirmed_<ini>_a_<fim>_approved*.json` | transações (REST v2, datas Unix) por `confirmed_at` | vários períodos se sobrepõem: dedupe por `id`, vence o maior `dates.updated_at` |
| `guru/saidas/guru_ordered_<ini>_a_<fim>*.json` | transações por `ordered_at` (inclui pendentes/canceladas) | idem |
| `guru/saidas/*-refunded-chargeback-dispute.json` | estados de reembolso | mesma regra |
| `asaas/saidas/asaas_<ini>_a_<fim>.json` | cobranças (`payments`) com `paymentLink`, parcelas | dedupe por `id` |
| `asaas/saidas/asaas_links.json` (se existir) ou `GET /paymentLinks` | nomes dos links | alimenta `asaas_payment_links` |
| `asaas/saidas/clientes*.json` | clientes | alimenta `asaas_customers` |

Arquivos têm até 270 MB: ler em **streaming** (stream-json), nunca `JSON.parse` do arquivo inteiro.

## Script

`scripts/import-historico.mjs` (Node, roda na máquina do Eduardo):

```
node scripts/import-historico.mjs --fonte guru  --pasta "C:/.../MQT - IA/ferramentas/guru/saidas"  --db postgresql://... 
node scripts/import-historico.mjs --fonte asaas --pasta "C:/.../MQT - IA/ferramentas/asaas/saidas" --db ...
```

- Conecta direto no Postgres (local: porta 54722; produção: connection string do pooler) com `pg`.
- Usa os **mesmos mapeadores** das Edge Functions (`supabase/functions/_shared/guru.ts` e `asaas.ts`)
  compilados para Node (extrair para `packages/mappers/` compartilhado, ou `tsx` apontando para os `.ts`).
- Upsert em lotes de 500 com `on conflict (guru_id) do update where excluded.guru_updated_at >= guru_transactions.guru_updated_at`.
- Depois de carregar: cria produtos/links desconhecidos (spec 01), classifica, recalcula colunas derivadas.
- Registra em `sync_runs` com `trigger = 'backfill'` e `details = {arquivo, linhas, inseridos, atualizados}`.
- Idempotente: rodar duas vezes não duplica nem regride estado.

## Validação (critérios de aceite)

Comparar com os relatórios existentes, mesmo período:

- Turma de 9/8/2026 (`relatorio.mjs` → "Turma de 9 de agosto"): quantidade de ingressos, bumps,
  plataforma Guru e Asaas batem (tolerância 0 nas quantidades; valores podem diferir por D1).
- Mês de setembro/2026 (`relatorio-mes.mjs`): ingressos e bumps por turma batem.
- Fechamento comercial ago e set/2026 (`fechamento.mjs` + `decisoes/*.json`): vendas por vendedora
  batem antes dos ajustes; ajustes manuais são importados para `commercial_adjustments` (spec 05).
- `v_monthly_integrations` de out/2025 a out/2026 sem meses faltando.
- Tempo total de importação < 15 min na máquina local.

## Fora de escopo

Meta Ads histórico (não há exportação completa; `GASTO_DIA` em `turma.mjs` cobre só 24/07–29/08/2026
e pode ser importado como tabela manual `meta_manual_spend` se o Eduardo quiser os meses antigos).
