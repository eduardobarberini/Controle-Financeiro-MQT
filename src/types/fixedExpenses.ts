import type { BaseRow } from './financial'

/** Categoria de gasto fixo (tabela: fixed_expense_categories). */
export interface FixedExpenseCategoryRecord extends BaseRow {
  name: string
  color: string
  description: string
}

export interface FixedExpenseCategoryInput {
  name: string
  color: string
  description?: string
}

export type FixedExpenseStatus = 'pago' | 'pendente'

/** Padrão de recorrência de um gasto. */
export type FixedExpenseRecurrence = 'pontual' | 'mensal' | 'trimestral' | 'semestral' | 'anual'

/** Opções de recorrência para selects (pt-BR). */
export const RECURRENCE_OPTIONS: { value: FixedExpenseRecurrence; label: string }[] = [
  { value: 'pontual', label: 'Pontual' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
]

/** Gasto fixo (tabela: fixed_expenses). */
export interface FixedExpenseRecord extends BaseRow {
  category_id: string
  description: string
  amount: number
  due_day: number
  month: number
  year: number
  status: FixedExpenseStatus
  recurrence: FixedExpenseRecurrence
  /** Competência em que a recorrência termina. null = sem fim. */
  ends_year: number | null
  ends_month: number | null
  /** Quando este registro é a ocorrência paga de um gasto recorrente, id do gasto de origem. */
  origin_id: string | null
  notes: string
  /** Categoria carregada junto (join). */
  category?: FixedExpenseCategoryRecord | null
}

export interface FixedExpenseInput {
  category_id: string
  description: string
  amount: number
  due_day: number
  month: number
  year: number
  status: FixedExpenseStatus
  recurrence: FixedExpenseRecurrence
  ends_year?: number | null
  ends_month?: number | null
  notes?: string
}

/**
 * Ocorrência virtual (não persistida) de um gasto recorrente projetada em um
 * mês/ano específico. Espelha os campos relevantes de `FixedExpenseRecord` para a
 * UI tratar as duas formas de modo uniforme, mas carrega o id de origem e a
 * competência projetada para "marcar como pago" criar um registro real.
 */
export interface ProjectedExpense {
  isProjected: true
  originalId: string
  category_id: string
  description: string
  amount: number
  due_day: number
  month: number
  year: number
  status: 'pendente'
  recurrence: FixedExpenseRecurrence
  notes: string
  category?: FixedExpenseCategoryRecord | null
}

/** Type guard para ocorrências projetadas. */
export function isProjectedExpense(
  e: FixedExpenseRecord | ProjectedExpense,
): e is ProjectedExpense {
  return (e as ProjectedExpense).isProjected === true
}

/** União de gastos reais e projetados, como devolvido pelo helper de projeção. */
export type EffectiveExpense = FixedExpenseRecord | ProjectedExpense
