/** Fixed expense category record (collection: fixed_expense_categories). */
export interface FixedExpenseCategoryRecord {
  id: string
  user: string
  name: string
  color: string
  description: string
  created: string
  updated: string
}

export interface FixedExpenseCategoryInput {
  name: string
  color: string
  description?: string
}

/** Fixed expense record (collection: fixed_expenses). */
export type FixedExpenseStatus = 'pago' | 'pendente'

/** Recurrence pattern for a fixed expense. */
export type FixedExpenseRecurrence = 'pontual' | 'mensal' | 'trimestral' | 'semestral' | 'anual'

/** Labelled options for recurrence selectors (pt-BR). */
export const RECURRENCE_OPTIONS: { value: FixedExpenseRecurrence; label: string }[] = [
  { value: 'pontual', label: 'Pontual' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
]

export interface FixedExpenseRecord {
  id: string
  user: string
  category: string
  description: string
  amount: number
  due_day: number
  month: number
  year: number
  status: FixedExpenseStatus
  recurrence: FixedExpenseRecurrence
  notes: string
  created: string
  updated: string

  /** Populated by `expand=category` when fetching via service. */
  expand?: {
    category?: FixedExpenseCategoryRecord
  }
}

export interface FixedExpenseInput {
  category: string
  description: string
  amount: number
  due_day: number
  month: number
  year: number
  status: FixedExpenseStatus
  recurrence: FixedExpenseRecurrence
  notes?: string
}

/**
 * A virtual (non-persisted) occurrence of a recurring expense projected into a
 * specific month/year. Mirrors the relevant fields of `FixedExpenseRecord` so
 * the UI can treat both shapes uniformly, but carries the original record id
 * and the projected competence so "mark as paid" can create a real instance.
 */
export interface ProjectedExpense {
  isProjected: true
  originalId: string
  category: string
  description: string
  amount: number
  due_day: number
  month: number
  year: number
  status: 'pendente'
  recurrence: FixedExpenseRecurrence
  notes: string
  expand?: {
    category?: FixedExpenseCategoryRecord
  }
}

/** Type guard for projected (virtual) expenses. */
export function isProjectedExpense(
  e: FixedExpenseRecord | ProjectedExpense,
): e is ProjectedExpense {
  return (e as ProjectedExpense).isProjected === true
}

/** Union of real and projected expenses as returned by the projection helper. */
export type EffectiveExpense = FixedExpenseRecord | ProjectedExpense
