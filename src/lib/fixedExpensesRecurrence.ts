import type {
  FixedExpenseRecord,
  FixedExpenseRecurrence,
  ProjectedExpense,
} from '@/types/fixedExpenses'

/**
 * Month delta from an origin competence to a target competence.
 * Negative when the target is before the origin.
 */
export function monthDelta(oMonth: number, oYear: number, tMonth: number, tYear: number): number {
  return (tYear - oYear) * 12 + (tMonth - oMonth)
}

/**
 * Whether an expense with the given recurrence (originating at oMonth/oYear)
 * projects into the target month/year.
 *
 * - pontual    → only the origin month
 * - mensal     → origin and every following month, indefinitely
 * - trimestral → every 3 months from origin (0, 3, 6, 9, ...)
 * - semestral  → every 6 months from origin (0, 6, 12, ...)
 * - anual      → every 12 months from origin (same month each year)
 */
export function projectsToMonth(
  recurrence: FixedExpenseRecurrence | string | undefined,
  oMonth: number,
  oYear: number,
  tMonth: number,
  tYear: number,
): boolean {
  const delta = monthDelta(oMonth, oYear, tMonth, tYear)
  if (delta < 0) return false
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

/** Stable signature used to match a projection against an actual record. */
const expenseSignature = (e: {
  category: string
  description: string
  amount: number
  due_day: number
}): string => `${e.category}|${e.description}|${Number(e.amount)}|${Number(e.due_day)}`

/**
 * Build the effective list of expenses for a given month/year, combining
 * actual DB records with virtual projected occurrences of recurring expenses.
 *
 * A projection is superseded (dropped) when an actual record for the same
 * month/year matches on (category, description, amount, due_day) — this is
 * how a "paid instance" created from a projection takes its place, and how
 * the original record avoids duplicating itself in its own competence month.
 */
export function getEffectiveExpensesForMonth(
  expenses: FixedExpenseRecord[],
  month: number,
  year: number,
): Array<FixedExpenseRecord | ProjectedExpense> {
  const actuals = expenses.filter((e) => Number(e.month) === month && Number(e.year) === year)

  const actualSigs = new Set(actuals.map(expenseSignature))

  const projections: ProjectedExpense[] = []
  for (const e of expenses) {
    const rec = (e.recurrence || 'pontual') as FixedExpenseRecurrence
    if (!projectsToMonth(rec, Number(e.month), Number(e.year), month, year)) continue
    if (actualSigs.has(expenseSignature(e))) continue
    projections.push({
      isProjected: true,
      originalId: e.id,
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
      due_day: Number(e.due_day),
      month,
      year,
      status: 'pendente',
      recurrence: rec,
      notes: e.notes ?? '',
      expand: e.expand,
    })
  }

  return [...actuals, ...projections]
}

/** Resolve the projected occurrence id used for React keys / dedupe. */
export function projectedId(originalId: string, month: number, year: number): string {
  return `${originalId}__${year}-${String(month).padStart(2, '0')}`
}
