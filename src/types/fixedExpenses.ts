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
  notes?: string
}
