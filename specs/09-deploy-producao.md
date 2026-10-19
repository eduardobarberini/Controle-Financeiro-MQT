# 09 — Deploy em produção

## Objetivo

Colocar o sistema no ar com projeto Supabase próprio (D11), site na Vercel, segredos e
webhooks configurados, agendamento ativo.

## Passos (quem faz)

| # | Passo | Quem |
|---|-------|------|
| 1 | Criar projeto Supabase (região São Paulo), copiar Project URL, anon key, service role key, connection string | Eduardo |
| 2 | `pnpm supabase login` (abre navegador) e `pnpm supabase link --project-ref <ref>` | Eduardo roda, Claude orienta |
| 3 | `pnpm supabase db push` (migrations 0001–0005 + as das specs 01/04/05/08) | Claude |
| 4 | Dashboard → Authentication: desligar "Allow new users to sign up", senha mínima 10, criar o usuário do Eduardo | Eduardo |
| 5 | `pnpm supabase functions deploy` (webhooks com `verify_jwt = false` já no config) | Claude |
| 6 | `pnpm supabase secrets set GURU_API_TOKEN GURU_ACCOUNT_TOKEN ASAAS_API_KEY ASAAS_WEBHOOK_TOKEN META_ACCESS_TOKEN META_AD_ACCOUNT_ID SYNC_TIME_BUDGET_MS` | Claude (tokens do `.env` de `MQT - IA`; Guru Account Token e Meta token: Eduardo gera) |
| 7 | Vault: `edge_functions_url` e `service_role_key` (SQL Editor) | Claude orienta, Eduardo cola |
| 8 | Guru → Configurações → Webhooks: URL `…/functions/v1/guru-webhook`, status Aprovada, Completa, Reembolsada, Reclamada, Reembolso Sol., Cancelada, Expirada; Assinaturas: Ativa, Atrasada, Cancelada | Eduardo |
| 9 | Asaas → Integrações → Webhooks: URL `…/functions/v1/asaas-webhook`, token = `ASAAS_WEBHOOK_TOKEN`, eventos PAYMENT_CREATED, CONFIRMED, RECEIVED, OVERDUE, REFUNDED, PARTIALLY_REFUNDED, DELETED, RESTORED, UPDATED, CHARGEBACK_*; envio sequencial | Eduardo |
| 10 | Meta Business → Usuários do sistema → token com `ads_read` para a conta `act_176316426796892` (sem expiração) | Eduardo (Claude guia passo a passo) |
| 11 | Importar histórico (spec 02) apontando para a connection string de produção | Claude |
| 12 | Vercel: importar repo, framework Vite, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, domínio | Eduardo importa, Claude confere `vercel.json` |
| 13 | Supabase Auth → URL Configuration: Site URL = domínio da Vercel; redirect URLs | Eduardo |
| 14 | Merge do PR #1 na `main` (Vercel passa a publicar `main`) | Claude após ok do Eduardo |

## Pós-deploy (checagem)

- Tela Integrações: os três provedores "OK" após "Sincronizar agora" (7 dias).
- Fazer uma venda teste de R$ 0 no Guru (oferta "Teste") e ver o evento em `webhook_events`.
- Cron: `select * from cron.job_run_details order by start_time desc limit 10` sem erros.
- Backup: plano Free tem 7 dias de PITR? Não (só Pro). Agendar `pg_dump` semanal via GitHub Action
  com a connection string em secret, ou subir para Pro.

## Segurança

- Chaves só em `supabase secrets` e variáveis da Vercel; nunca no repositório (`.env.local` e
  `supabase/functions/.env` estão no gitignore).
- Rotacionar o `GURU_API_TOKEN` e o `ASAAS_API_TOKEN` que hoje estão em texto puro em
  `MQT - IA/.env` se aquela pasta for compartilhada.
- RLS verificada pelos testes de API (`api-test.mjs`) rodando contra produção com um usuário de teste
  descartável, uma vez, depois removido.
