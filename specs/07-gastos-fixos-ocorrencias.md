# 07 — Gastos Fixos por ocorrência

## Objetivo

A aba "Gastos" passa a listar o que **cai no mês** (gastos pontuais, projeções de recorrência e
ocorrências pagas), não a lista crua de cadastros (D12). Também fecha pendências pequenas da revisão.

## Regras

- Seletor de competência (mês/ano) na aba; lista = `getEffectiveExpensesForMonth(expenses, m, y)`.
- Filtros de categoria, status e busca aplicados sobre essa lista.
- Cada linha mostra origem: "Cadastro", "Recorrência (de jan/2026)", "Ocorrência paga (de jan/2026)".
- Ações por linha: pagar/pendente (projeção vira ocorrência paga), editar cadastro de origem,
  excluir (com os avisos já existentes). Link "ver cadastro" abre o modal da origem.
- Aba nova "Cadastros" com a lista crua atual (sem filtro de mês), para manutenção.

## Pendências menores da revisão (entram aqui)

- Mostrar "vence em N dias" e data completa na aba Vencimentos; recalcular "hoje" ao focar a janela.
- Marcar origem recorrente como paga fora do mês de origem: esconder o toggle e orientar a pagar a ocorrência do mês.
- `maxLength` nos campos (descrição 200, categoria 100); índice único `(user_id, lower(name))` em categorias.
- Contagem do resumo: "N ocorrências no mês" em vez de "gastos cadastrados".
- Variação zero sem sinal "+".
- `StatusBadge` fora do componente de página.

## Critérios de aceite

- Aluguel mensal criado em jan/2026 aparece em "Gastos" ao selecionar out/2026, como projeção pendente.
- Pagar essa projeção cria a ocorrência e a lista passa a mostrá-la como paga, sem duplicar.
- Testes do helper de recorrência cobrem trimestral/semestral/anual com ocorrência paga e término.
