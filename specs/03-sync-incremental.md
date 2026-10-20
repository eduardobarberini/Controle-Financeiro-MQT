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

## Implementação (20/10/2026)

Gerenciador de estado puro em `supabase/functions/_shared/sync-state.ts` (testes em
`sync-state.test.ts`, 19), executor comum em `_shared/sync-runner.ts` (autenticação, trava,
orçamento, estado, `sync_runs`) e as três funções só definem o plano e "buscar e gravar uma
página". Banco em `supabase/migrations/20261020000001_sync_incremental.sql` (testes em
`supabase/tests/database/sync.test.sql`, 9). Tela: Integrações → card de cada provedor.

Decisões tomadas na implementação (diferenças em relação ao texto acima):

- **Estado em coluna própria**, `integration_settings.sync_state`, e não em `config`: a tela
  regrava o `config` inteiro ao salvar a conta de anúncios e apagaria o estado.
- **Trava por provedor** (`sync_locked_until` + `sync_try_lock()`, só service role): cron e
  botão nunca rodam juntos. Botão com sincronização em andamento recebe 409; cron pula. Trava de
  invocação morta vence sozinha (orçamento + 60 s) e o watchdog também a libera.
- **Plano de passos**: cada passo é um campo × dia (ou um status, ou uma lista) com cursor; o
  estado é salvo depois de cada página. Marca "último dia sem lacuna" por campo (`done`) só avança
  quando o passo termina e não pula dias, então um reprocessamento antigo não a move.
- **Um cron a cada 15 min por provedor** (minutos 0/5/10). A função decide: continua o plano
  pendente; sem plano, só começa rodada nova depois de 60 min (Guru e Asaas;
  `GURU_SYNC_INTERVAL_MINUTES`, `ASAAS_SYNC_INTERVAL_MINUTES`) ou 4 h (Meta,
  `META_SYNC_INTERVAL_MINUTES`). Chamada sem trabalho não grava `sync_runs`.
- **Orçamento**: `SYNC_TIME_BUDGET_MS` (padrão 90 000). Não começa página nova se faltar menos de
  10 s ou 2× a página mais lenta da invocação.
- **Guru** (medido na API em 20/10): página fixa de 50 (`per_page` é ignorado), limite de 360 por
  minuto (`X-RateLimit-Limit`), ~1,2 s por página, filtro de dia inclusivo e no fuso de Brasília.
  Um dia tem ~850 confirmadas e ~1.200 pedidos (~45 páginas). Cancelamentos vão em blocos de
  7 dias (a consulta custa o mesmo que a de 1 dia; chegou a 43 s numa página). Passada diária:
  cancelamentos dos últimos 7 dias, assinaturas ativas/atrasadas/trial/iniciadas e canceladas da
  semana. Em dia, cada rodada repuxa ontem e hoje.
- **Nunca regredir uma transação**: gatilho `guru_transactions_a_keep_newest` descarta a versão
  com `guru_updated_at` mais antigo que a gravada. Vale para sync, webhook e importador.
  `guru_products` não precisa de atualização por página (contagem e última venda saem das views da
  spec 01).
- **Asaas**: lista de links uma vez por dia, no primeiro passo; depois de cada página, clientes
  desconhecidos e links com nome provisório (`Link <id>`, criado pelo gatilho da spec 01) são
  buscados por id em lotes de 5. Varredura diária: em aberto e vencidas (todas), estornos e
  contestações (criadas no último ano). O total de parcelas já vem do mapeador
  (`installment_count`, spec 01). Asaas não manda `Retry-After`: 429 repete uma vez após 5 s e
  depois encerra com espera de 60 s.
- **Meta**: campanhas + insights em blocos de 7 dias. A janela longa (35 dias) roda a cada 7 dias
  contados da última, em vez de "às segundas". Throttling encerra a invocação com espera de 5 min
  (antes dormia até 90 s dentro dela).
- **Erros**: 401/403 (Meta: códigos 190, 102, 10, 200) gravam `last_error` e `blocked_until`
  (+1 h); o cron pula até lá, o botão tenta na hora. 429 grava `rate_limited_until`, encerra a
  invocação como parcial e ninguém tenta antes disso.
- **Corpo da requisição**: `{}` (cron), `{continue: true}` (botão), `{days: N}` (reprocessar os
  últimos N dias) ou `{backfill: {since, until}}`. O backfill já começa a processar na mesma
  chamada (em vez de só criar o estado) e o resto segue pelo cron. Limites: Guru 60 dias (mais que
  isso é trabalho do importador); Asaas e Meta 400. A tela oferece "Continuar / rodada normal" ou
  "Reprocessar últimos N dias" (Guru até 30) e mostra "Em dia até" e o progresso
  ("Em andamento: 5/10 dias · 3.410 registros").
- **Watchdog** corrigido: só marca a integração como erro quando não sobrou execução em
  andamento (antes marcava também a que estava rodando).

Validação (20/10/2026, banco local com o histórico da spec 02 e APIs reais; orçamento de 30 s
para forçar a retomada):

- Guru: a primeira rodada depois do importador começou em 17/10 (marca 18/10 − 1) e nos
  cancelamentos de 11 a 17/10. Foram 12 passos em 8 invocações de ~20 s, com
  `completed = true` só na última; a chamada seguinte não fez nada. Contagem por dia igual à da
  API: 17/10 770 confirmadas / 999 pedidos, 18/10 982 / 1.291, 19/10 852 / 1.160.
- Interrupção: o runtime foi morto no meio (passo 4, página 65). A chamada seguinte foi recusada
  pela trava até ela vencer e a próxima retomou do passo 4, página 65, com o mesmo cursor.
- Asaas: rodada com a passada diária em 12 invocações (vencidas: ~5,5 mil cobranças, ~55
  páginas). Contagem igual à da API (criadas em 16/10: 39; em 19/10: 57; pagas em 19/10: 35) e
  nenhum link com nome provisório.
- Botão: segunda chamada simultânea → 409; reprocessar 3 dias → concluído; intervalo invertido →
  400; `days: 500` no Guru → limitado a 60.
- Meta: o token local é de teste → 401 (code 190) → resposta 502, bloqueio de 1 h e cron pulando
  ("blocked"). A validação com dados reais fica para quando houver token da Meta (spec 09).

Observações para produção:

- No plano Free (orçamento de 90 s) a rodada regular do Guru (~90 páginas) leva 2–3 invocações,
  ou seja, 30–45 min com o cron de 15 min; no Pro (300 s) cabe em uma. Os webhooks continuam
  sendo o tempo real.
- A varredura diária das vencidas do Asaas percorre todas (~55 páginas). Se crescer muito, dá para
  limitar por vencimento.
