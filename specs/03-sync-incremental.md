# 03 — Sincronização incremental (Guru, Asaas, Meta)

## Problema

A versão atual coleta todas as páginas em memória e só grava no fim. Com ~22 mil transações/mês
no Guru e paginação de ~50 por página, uma janela de 3 dias já passa de 150 s e a Edge Function
morre sem gravar nada (confirmado em 19/10 no ambiente local). O Asaas tem o mesmo problema
com as varreduras por status.

## Princípios

1. **Grava página a página** (upsert por página), nunca acumula.
2. **Orçamento de tempo** por invocação: 90 s (Free) / 300 s (Pro), lido de `SYNC_TIME_BUDGET_MS`.
   Ao estourar, salva o ponto de parada e devolve `{ok:true, partial:true, resume:…}`.
3. **Estado de retomada** em `integration_settings.config.sync_state[provider]`:
   `{ window: {since, until, field}, cursor, status_scan: {status, offset}, updated_at }`.
4. **Cron frequente e curto**: a cada 15 min; cada chamada continua de onde parou e, quando termina
   a janela, começa a próxima (janela corrente = último dia sincronizado − 1 dia até hoje).
5. **Webhooks continuam como tempo real**; o sync é conciliação.
6. Um `sync_runs` por invocação, com `details.pages`, `details.resumed_from`, `details.completed`.

## Guru

- Janelas de 1 dia por campo (`confirmed_at`, `ordered_at`, `cancelled_at`), do mais antigo
  pendente para o mais novo. Estado: `{field, day, cursor}`.
- Por página: mapear → upsert `guru_transactions` (ignorando linhas com `guru_updated_at` mais
  antigo que o já gravado) → atualizar `guru_products` (first/last seen, contagem) → classificar.
- Respeita `X-RateLimit-Remaining`; abaixo de 30, espera `Retry-After`.
- Assinaturas: uma passada por dia (ativas/atrasadas) + canceladas da janela, com cursor.
- "Caught up" = os três campos chegaram ao dia de hoje; a partir daí cada rodada repuxa só
  ontem e hoje (conversões tardias) e cancelamentos dos últimos 7 dias.

## Asaas

- Janela diária por `dateCreated` e por `paymentDate` (parcelas pagas), página a página (limit 100, offset).
- Varreduras por status (`PENDING`, `OVERDUE`, estornos/contestações) **uma vez por dia**, também
  com offset salvo; cada status é um passo do estado.
- Clientes e links de pagamento desconhecidos buscados em lotes de 5 após cada página.
- Parcelas: ao gravar uma cobrança com `installment`, garantir `installment_total` e
  `contract_value` (spec 01).

## Meta

- Insights por campanha/dia já são leves; manter janela de 7 dias a cada 4 h e 35 dias às segundas,
  mas em blocos de 7 dias por invocação com estado `{since}`.
- Validar `ad_account_id` (`^act_\d+$`); token de usuário do sistema.

## Backfill pela API (quando não houver exportação)

`POST /guru-sync {backfill: {since: '2026-10-01', until: '2026-10-19'}}` só cria/ajusta o estado;
as rodadas seguintes (cron ou botão "continuar") consomem. A tela mostra progresso
("Guru: 12/19 dias · 3.410 transações").

## Watchdog e erros

- `sync-runs-watchdog` (já existe) marca `running` > 15 min como erro.
- Erro 401/403 do provedor: marca `integration_settings.last_error`, desliga nova tentativa por 1 h.
- Erro 429: respeita `Retry-After`, salva estado e encerra a invocação.

## Critérios de aceite

- Sync do Guru de um dia com 1.000+ transações termina em várias invocações sem exceder o orçamento,
  e `sync_runs.details.completed = true` só na última.
- Interromper no meio (matar a função) e chamar de novo retoma do mesmo cursor sem duplicar.
- Após o backfill via importador (spec 02), a primeira rodada do sync pega só os dias novos.
- Testes unitários do gerenciador de estado (`_shared/sync-state.ts`): avanço de janela, retomada, caught-up.
