# Plano de implementação — Controle Financeiro MQT

Cada arquivo desta pasta é uma spec: o que será construído, as regras de negócio que valem, o
modelo de dados, as telas e os critérios de aceite. As specs são a fonte de verdade; quando o
código divergir, corrige-se o código (ou atualiza-se a spec com a decisão nova e a data).

Base de decisões: respostas do Eduardo em 18 e 19/10/2026 e os scripts/skills da pasta
`MQT - IA` (regras já validadas na operação). Ver `00-regras-de-negocio.md`.

## Ordem de implementação

| # | Spec | Entrega | Depende de |
|---|------|---------|------------|
| 00 | [Regras de negócio e glossário](00-regras-de-negocio.md) | Referência (não é tarefa) | — |
| 01 | [Catálogo de produtos e links](01-catalogo-produtos-e-links.md) | Classificar vendas do Guru e cobranças do Asaas (ingresso, bump, plataforma, renovação; vendedora) | — |
| 02 | [Importador do histórico](02-importador-historico.md) | Carregar out/2025 → hoje a partir das exportações em `MQT - IA` | 01 |
| 03 | [Sincronização incremental](03-sync-incremental.md) | Sync do Guru/Asaas/Meta que cabe no limite de tempo e retoma de onde parou | 01 |
| 04 | [Turmas automáticas (Lançamento Pago)](04-turmas-automaticas.md) | Turma criada e preenchida sozinha a partir das vendas e do tráfego | 01, 02, 03 |
| 05 | [Comercial e fechamento mensal](05-comercial-fechamento.md) | Vendas por vendedora, ajustes com motivo, fixo + 5%, fechamento travado | 01, 02 |
| 06 | [Renovações automáticas](06-renovacoes-automaticas.md) | Renovações feitas e alunas a renovar sem digitação | 01, 02 |
| 07 | [Gastos Fixos por ocorrência](07-gastos-fixos-ocorrencias.md) | Aba "Gastos" lista o que cai no mês | — |
| 08 | [Mensal e anual automáticos (DRE)](08-mensal-anual-automatico.md) | Controle Mensal e Anual calculados das fontes, com competência e caixa | 02, 03, 04, 05, 07 |
| 09 | [Deploy em produção](09-deploy-producao.md) | Supabase próprio, Vercel, segredos, webhooks, agendamento | 03 |
| 10 | [Qualidade e manutenção](10-qualidade.md) | CI, TypeScript estrito, testes, páginas menores | contínuo |

Sugestão de sequência: 01 → 02 (valida tudo com dados reais) → 03 → 09 (entra no ar com
webhooks) → 04 → 05 → 06 → 08 → 07 → 10 ao longo do caminho.

## Estado atual (19/10/2026)

Feito na branch `supabase-migration` (PR #1): migração PocketBase → Supabase, tabelas de
integração, webhooks e syncs (versão inicial, não incremental), tela Integrações, preenchimento
automático básico do Mensal, correções da revisão de código. O que está nas specs é o que falta.

Specs 01 (catálogo) e 02 (importador) implementadas em 19/10/2026 e spec 03 (sync
incremental) em 20/10/2026; cada uma tem uma seção "Implementação" com as decisões e a validação
contra os relatórios e as APIs.

## Convenções

- Dinheiro em `numeric(14,2)`; percentuais guardados como número em % (9,00 = 9%).
- Datas de negócio no fuso `America/Sao_Paulo` (sem horário de verão desde 2019: UTC−3 fixo).
- Tudo por `user_id` com RLS; escrita das integrações só por service role.
- Toda regra numérica tem teste unitário em `src/lib/*.test.ts` ou `supabase/functions/_shared/*.test.ts`.
- Nada de valores de negócio fixos no código: ficam em `business_settings` (spec 00) e são editáveis na tela.
