# 10 — Qualidade e manutenção

## Objetivo

Impedir que os erros encontrados na revisão de 19/10 voltem: verificação automática a cada
push, tipos estritos, testes das regras de dinheiro e páginas menores.

## CI (GitHub Actions)

`.github/workflows/ci.yml` em todo push e PR: `pnpm install --frozen-lockfile`, `pnpm lint`,
`tsc --noEmit`, `pnpm test`, `pnpm build`, e `supabase db start` + `db reset` + `api-test.mjs`
(testes de RLS) num job separado. PR só mergeia com CI verde.

## TypeScript estrito

Ligar `strict: true`, `noUnusedLocals`, `noUnusedParameters` em `tsconfig.app.json` e corrigir
por módulo (ordem: lib → services → hooks → contexts → pages). Remover os `as any` restantes.

## Testes

- `financial-utils` e `fixedExpensesRecurrence` (existem) + casos da revisão (fallback de alíquotas,
  margem negativa, `parsePtBrNumber` malformado, `formatPtBrInput`).
- Novos puros: classificação de produtos/links (spec 01), janelas e fórmulas da turma (spec 04),
  fechamento comercial (spec 05), renovações (spec 06), estado do sync (spec 03).
- Edge Functions: testes dos mapeadores com os payloads reais de exemplo (Deno test).
- Teste de fumaça da UI com Playwright (login, abrir cada página, salvar um mês) rodando na CI
  contra o Supabase local.

## Páginas grandes

`LancamentoPago.tsx` (1,9 mil linhas) e `GastosFixos.tsx` (2 mil) viram pastas com componentes
por aba e hooks de dados (`useLaunch`, `useFixedExpenses`), sem mudar comportamento. Fazer junto
com as specs 04 e 07 para não refatorar duas vezes.

## Pendências de lint e limpeza

- `LancamentoPago.tsx`: `ingressosDays` sem uso, deps de `useEffect`/`useMemo`; quantidades aceitando decimal.
- `VendasComercialTab.tsx`: `sellers` recriado a cada render (memoizar); `substr` → `slice`.
- `Renovacoes.tsx` `ReadOnlyCell` e `DashboardCharts` `revenueProgress`/`profitProgress` sem uso.
- `SummaryTable.tsx` não é usado: remover ou reativar.
- Cores da marca (`#6D49F2`, `#FF2AFF`) como tokens no Tailwind (`brand.primary`, `brand.accent`).
- Code splitting por rota (`React.lazy`) para tirar o bundle de 1,3 MB.
- Iniciais do usuário duplicadas em `Layout` e `Sidebar`; `YearSelector` sem limite de anos.

## Critérios de aceite

- CI verde na `main`; cobertura das libs de cálculo ≥ 90%.
- `tsc` estrito sem erros; `oxlint` sem avisos.
- Nenhuma página acima de 600 linhas.
