import type {
  FixedExpenseRecord,
  FixedExpenseRecurrence,
  ProjectedExpense,
} from '@/types/fixedExpenses'

/**
 * Diferença em meses entre uma competência de origem e uma competência alvo.
 * Negativa quando o alvo é anterior à origem.
 */
export function monthDelta(oMonth: number, oYear: number, tMonth: number, tYear: number): number {
  return (tYear - oYear) * 12 + (tMonth - oMonth)
}

/**
 * Se um gasto com a recorrência dada (origem em oMonth/oYear) projeta no
 * mês/ano alvo. `ends` limita a projeção até a competência informada (inclusive).
 *
 * - pontual    → só o mês de origem
 * - mensal     → origem e todos os meses seguintes
 * - trimestral → a cada 3 meses a partir da origem (0, 3, 6, 9, ...)
 * - semestral  → a cada 6 meses (0, 6, 12, ...)
 * - anual      → a cada 12 meses (mesmo mês de cada ano)
 */
export function projectsToMonth(
  recurrence: FixedExpenseRecurrence | string | undefined,
  oMonth: number,
  oYear: number,
  tMonth: number,
  tYear: number,
  ends?: { month: number | null; year: number | null } | null,
): boolean {
  const delta = monthDelta(oMonth, oYear, tMonth, tYear)
  if (delta < 0) return false
  if (ends?.year && ends?.month && monthDelta(ends.month, ends.year, tMonth, tYear) > 0) {
    return false
  }
  switch (recurrence) {
    case 'mensal':
      return true
    case 'trimestral':
      return delta % 3 === 0
    case 'semestral':
      return delta % 6 === 0
    case 'anual':
      return delta % 12 === 0
    case 'pontual':
    default:
      return delta === 0
  }
}

/**
 * Lista efetiva de gastos de um mês/ano: registros reais daquela competência
 * mais as ocorrências virtuais (projeções) dos gastos recorrentes.
 *
 * Uma projeção é descartada quando já existe, na mesma competência, um registro
 * real que a representa: o próprio gasto de origem (no mês de origem) ou uma
 * ocorrência paga criada a partir dela (origin_id = id do gasto de origem).
 * Registros com origin_id nunca geram projeções, evitando duplicidade.
 */
export function getEffectiveExpensesForMonth(
  expenses: FixedExpenseRecord[],
  month: number,
  year: number,
): Array<FixedExpenseRecord | ProjectedExpense> {
  const actuals = expenses.filter((e) => Number(e.month) === month && Number(e.year) === year)

  // Ids de origem já cobertos por um registro real nesta competência.
  const covered = new Set<string>()
  for (const a of actuals) {
    covered.add(a.id)
    if (a.origin_id) covered.add(a.origin_id)
  }

  const projections: ProjectedExpense[] = []
  for (const e of expenses) {
    if (e.origin_id) continue
    const rec = (e.recurrence || 'pontual') as FixedExpenseRecurrence
    if (rec === 'pontual') continue
    if (
      !projectsToMonth(rec, Number(e.month), Number(e.year), month, year, {
        month: e.ends_month,
        year: e.ends_year,
      })
    ) {
      continue
    }
    if (covered.has(e.id)) continue
    projections.push({
      isProjected: true,
      originalId: e.id,
      category_id: e.category_id,
      description: e.description,
      amount: Number(e.amount),
      due_day: Number(e.due_day),
      month,
      year,
      status: 'pendente',
      recurrence: rec,
      notes: e.notes ?? '',
      category: e.category ?? null,
    })
  }

  return [...actuals, ...projections]
}

/** Id estável de uma ocorrência projetada, para keys do React e dedupe. */
export function projectedId(originalId: string, month: number, year: number): string {
  return `${originalId}__${year}-${String(month).padStart(2, '0')}`
}
