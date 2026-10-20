# Controle Financeiro MQT

Painel financeiro da MQT (Mães que Treinam): controle anual e mensal, renovações,
lançamentos pagos, gastos fixos e integrações automáticas com **Guru** (vendas à
vista), **Asaas** (parcelado em PIX e boleto) e **Meta Ads** (tráfego).

## Stack

- Front: React 19, Vite, TypeScript, Tailwind, shadcn/ui, Recharts
- Backend: Supabase (Postgres com RLS, Auth, Storage, Realtime, Edge Functions, pg_cron)
- Hospedagem do site: Vercel

## Rodando localmente

Pré-requisitos: Node 22.18+ (roda o importador em TypeScript direto), pnpm (`npm i -g pnpm`) e
Docker Desktop rodando.

```bash
pnpm install
pnpm supabase start          # sobe Postgres, Auth, Storage e Studio no Docker (portas 547xx)
pnpm supabase db reset       # aplica as migrations em supabase/migrations
pnpm dev                     # http://localhost:8080
```

O arquivo `.env.local` aponta para o Supabase local (as chaves locais são públicas
e padrão do CLI). Studio local: http://127.0.0.1:54723.

Como o cadastro público está desligado, crie o seu usuário local pela API de admin:

```bash
curl -X POST http://127.0.0.1:54721/auth/v1/admin/users \
  -H "apikey: <SERVICE_ROLE_KEY local>" -H "Authorization: Bearer <SERVICE_ROLE_KEY local>" \
  -H "Content-Type: application/json" \
  -d '{"email":"voce@exemplo.com","password":"sua-senha","email_confirm":true,"user_metadata":{"name":"Seu Nome"}}'
```

Histórico (Guru e Asaas desde out/2025) a partir das exportações em `../MQT - IA/ferramentas`
(spec 02; ~2 min, pode rodar de novo sem duplicar):

```bash
pnpm import:historico                                   # Guru + Asaas no banco local
pnpm import:historico --fonte asaas --db "<connection string de produção>"
```

Edge Functions locais (webhooks e sincronizações):

```bash
pnpm supabase functions serve --env-file supabase/functions/.env
```

## Scripts

| Comando           | O que faz                                   |
| ----------------- | ------------------------------------------- |
| `pnpm dev`        | servidor de desenvolvimento                 |
| `pnpm build`      | build de produção em `dist/`                |
| `pnpm test`       | testes unitários dos cálculos e mapeadores (vitest) |
| `pnpm test:db`    | testes das regras no banco (pgTAP, `supabase/tests`) |
| `pnpm import:historico` | importa as exportações do Guru/Asaas (`scripts/import-historico.ts`) |
| `pnpm lint`       | oxlint                                      |
| `pnpm format`     | oxfmt                                       |
| `pnpm db:types`   | regenera `src/lib/supabase/database.types.ts` a partir do banco local |

## Estrutura

```
src/
  pages/            telas (Dashboard, Mensal, Renovações, Lançamento Pago, Gastos Fixos, Integrações, Configurações)
  services/         acesso a dados (Supabase) por módulo
  contexts/         auth, empresa, financeiro (ano selecionado + resumo anual)
  hooks/            realtime, dados mensais, valores automáticos
  lib/              cálculos financeiros, recorrência de gastos, cliente Supabase
  components/integrations/  catálogo (produtos Guru, links Asaas, vendedoras)
supabase/
  migrations/       esquema, integrações, agendamento (pg_cron), catálogo e classificação
  functions/        guru-webhook, guru-sync, asaas-webhook, asaas-sync, meta-sync (+ _shared)
  tests/database/   testes pgTAP
scripts/            importador do histórico
```

## Deploy em produção

### 1. Supabase

```bash
pnpm supabase login
pnpm supabase link --project-ref <ref-do-projeto>
pnpm supabase db push                       # aplica as migrations
pnpm supabase functions deploy              # publica as 5 funções (webhooks sem verificação de JWT, ver config.toml)
pnpm supabase secrets set \
  GURU_API_TOKEN=... GURU_ACCOUNT_TOKEN=... \
  ASAAS_API_KEY=... ASAAS_WEBHOOK_TOKEN=... \
  META_ACCESS_TOKEN=... META_AD_ACCOUNT_ID=act_...
```

No painel do Supabase: Authentication > Providers > Email: deixe **Allow new users to sign up** desligado
e crie o seu usuário em Authentication > Users > Add user.

Para o agendamento funcionar, rode uma vez no SQL Editor:

```sql
select vault.create_secret('https://<ref>.supabase.co/functions/v1', 'edge_functions_url');
select vault.create_secret('<service_role_key>', 'service_role_key');
```

### 2. Webhooks

- **Guru**: Admin > Configurações > Webhooks > Vendas e Assinaturas, URL
  `https://<ref>.supabase.co/functions/v1/guru-webhook`, marcando os status desejados
  (Aprovada, Reembolsada, Reclamada, Cancelada, Ativa, Atrasada...). O token da conta
  (Admin > Minha Conta > API) é o `GURU_ACCOUNT_TOKEN`.
- **Asaas**: Integrações > Webhooks, URL `https://<ref>.supabase.co/functions/v1/asaas-webhook`,
  gere um token de autenticação e use o mesmo valor em `ASAAS_WEBHOOK_TOKEN`. Eventos:
  PAYMENT_CREATED, CONFIRMED, RECEIVED, OVERDUE, REFUNDED, DELETED, RESTORED, UPDATED.

### 3. Vercel

Importe o repositório, framework Vite, e defina as variáveis `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` do projeto de produção. O `vercel.json` já cuida das rotas da SPA.

## Como os dados automáticos entram no financeiro

- `v_monthly_integrations` consolida, por mês: vendas aprovadas e reembolsos do Guru,
  parcelas recebidas do Asaas e gasto/leads/compras da Meta.
- No **Controle Mensal**, cada célula de Faturamento, Investimento Meta e Custos Fixos mostra o
  valor automático sugerido; o botão "Preencher com dados automáticos" grava todos os meses.
- O **Controle Anual** mostra o resumo do ano vindo das integrações e as parcelas a receber.
