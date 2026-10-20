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

## Implementação (19/10/2026)

`scripts/import-historico.ts` (`pnpm import:historico`, opções no topo do arquivo). Diferenças:

- TypeScript rodado direto pelo Node 22.18+ (importa os mapeadores das Edge Functions sem build).
- Leitura em streaming própria (`scripts/lib/json-array-stream.ts`, testada) em vez de
  stream-json: recorta cada objeto do array e faz `JSON.parse` só dele (~20 MB/s → 2,4 GB em ~1 min).
- Upsert em lotes de 500 via `jsonb_populate_recordset` (um parâmetro JSON por lote).
  Guru: só sobrescreve com `dates.updated_at` mais novo (`--forcar` regrava versões iguais).
  Asaas: arquivos por data de modificação (o mais novo vence) e só sobrescreve linha do banco
  anterior ao arquivo, então sync/webhook mais recentes nunca regridem.
- **Cobranças apagadas no Asaas**: a API não lista cobranças apagadas, então elas somem das
  exportações seguintes. Cobrança que aparece num arquivo e falta num arquivo mais novo que
  cobre a mesma data de criação é marcada `deleted = true` (378 no histórico, ex.: parcelas
  2 e 3 canceladas). Sem isso o comercial mostrava ~120 "não pagas" a mais.
- `raw` do Guru é gravado sem `infrastructure` (IP, navegador): ~15% menor e sem dado pessoal
  que o financeiro não usa. Vale também para sync e webhook (mapeador compartilhado).
- Um registro em `sync_runs` por fonte (`trigger = 'backfill'`), com totais e `por_arquivo`.
- Ajustes do comercial (`decisoes/*.json` → `commercial_adjustments`) ficam para a spec 05,
  que cria a tabela.

Resultado no banco local (19/10/2026): 63 arquivos do Guru (497.981 linhas) → 181.324 transações;
19 arquivos do Asaas → 12.263 cobranças, 153 links, 12.616 clientes. Do zero em 2 min 08 s;
segunda execução não grava nada. Banco com ~740 MB (`guru_transactions` ~690 MB).

Validação:

- Turma de 9/8/2026 igual ao `relatorio_turma_2026-08-09.html`: 3.885 ingressos, 801 bumps,
  308 plataforma Guru, 100 Asaas; comercial Guru MJ 57 / MZ 56, Asaas MJ 60 / MZ 37.
  Pela regra D1 (só link de plataforma) o Asaas dá 99: a 100ª é cobrança manual sem link.
- Turmas de 30/8 a 11/10 (regras do `turma.mjs` reproduzidas em streaming): ingressos, bumps e
  plataforma iguais, exceto 4/10 com 5 ingressos a menos — ofertas `free` (valor 0), que a
  spec 00 manda ignorar.
- Fechamentos de ago e set/2026 (Maju e Marlene): Guru igual em quantidade, faturamento e
  reembolsos; Asaas igual cobrança a cobrança (950 contratos, vendas e não pagas), antes dos
  ajustes. Única diferença: 2 contratos com parcelas 2/3 canceladas valem 3 × 90 = 270 no banco
  (contrato vendido) e 90 no script; os dois são exclusões manuais das `decisoes/` de setembro.
- `v_monthly_integrations` com os 13 meses de out/2025 a out/2026. O Asaas de out/2025 é baixo
  porque as exportações começam nas cobranças criadas em 01/10/2025 (parcelas de contratos
  anteriores não estão nelas).
