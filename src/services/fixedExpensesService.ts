import { supabase, requireUserId } from '@/lib/supabase/client'
import type {
  FixedExpenseCategoryRecord,
  FixedExpenseCategoryInput,
  FixedExpenseRecord,
  FixedExpenseInput,
} from '@/types/fixedExpenses'

const EXPENSE_SELECT = '*, category:fixed_expense_categories(*)'

/**
 * CRUD do módulo "Gastos Fixos". Todas as tabelas são por usuário; o RLS do
 * Supabase garante que só os registros do usuário logado são lidos/alterados.
 */
export const fixedExpensesService = {
  // ───────────────────────────── Categorias ─────────────────────────────

  async getCategories(): Promise<FixedExpenseCategoryRecord[]> {
    const { data, error } = await supabase
      .from('fixed_expense_categories')
      .select('*')
      .order('name')
    if (error) throw new Error(`Falha ao carregar categorias: ${error.message}`)
    return (data ?? []) as FixedExpenseCategoryRecord[]
  },

  async createCategory(input: FixedExpenseCategoryInput): Promise<FixedExpenseCategoryRecord> {
    const userId = await requireUserId()
    const { data, error } = await supabase
      .from('fixed_expense_categories')
      .insert({
        user_id: userId,
        name: input.name,
        color: input.color,
        description: input.description ?? '',
      })
      .select()
      .single()
    if (error) throw error
    return data as FixedExpenseCategoryRecord
  },

  async updateCategory(
    id: string,
    input: FixedExpenseCategoryInput,
  ): Promise<FixedExpenseCategoryRecord> {
    const { data, error } = await supabase
      .from('fixed_expense_categories')
      .update({ name: input.name, color: input.color, description: input.description ?? '' })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as FixedExpenseCategoryRecord
  },

  async saveCategory(
    id: string | undefined,
    input: FixedExpenseCategoryInput,
  ): Promise<FixedExpenseCategoryRecord> {
    return id ? this.updateCategory(id, input) : this.createCategory(input)
  },

  /** Apaga a categoria. O banco bloqueia (FK restrict) se houver gastos vinculados. */
  async deleteCategory(id: string): Promise<boolean> {
    const { error } = await supabase.from('fixed_expense_categories').delete().eq('id', id)
    if (error) {
      if (error.code === '23503') {
        throw new Error('Esta categoria possui gastos vinculados e não pode ser excluída.')
      }
      throw new Error(error.message)
    }
    return true
  },

  // ─────────────────────────────── Gastos ───────────────────────────────

  /** Todos os gastos do usuário (mais recentes primeiro), com a categoria carregada. */
  async getAll(): Promise<FixedExpenseRecord[]> {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .select(EXPENSE_SELECT)
      .order('created_at', { ascending: false })
    if (error) throw new Error(`Falha ao carregar gastos: ${error.message}`)
    return (data ?? []) as unknown as FixedExpenseRecord[]
  },

  async create(input: FixedExpenseInput): Promise<FixedExpenseRecord> {
    const userId = await requireUserId()
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({
        user_id: userId,
        category_id: input.category_id,
        description: input.description,
        amount: input.amount,
        due_day: input.due_day,
        month: input.month,
        year: input.year,
        status: input.status,
        recurrence: input.recurrence ?? 'pontual',
        ends_year: input.ends_year ?? null,
        ends_month: input.ends_month ?? null,
        notes: input.notes ?? '',
      })
      .select(EXPENSE_SELECT)
      .single()
    if (error) throw error
    return data as unknown as FixedExpenseRecord
  },

  async update(id: string, input: FixedExpenseInput): Promise<FixedExpenseRecord> {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update({
        category_id: input.category_id,
        description: input.description,
        amount: input.amount,
        due_day: input.due_day,
        month: input.month,
        year: input.year,
        status: input.status,
        recurrence: input.recurrence ?? 'pontual',
        ends_year: input.ends_year ?? null,
        ends_month: input.ends_month ?? null,
        notes: input.notes ?? '',
      })
      .eq('id', id)
      .select(EXPENSE_SELECT)
      .single()
    if (error) throw error
    return data as unknown as FixedExpenseRecord
  },

  async save(id: string | undefined, input: FixedExpenseInput): Promise<FixedExpenseRecord> {
    return id ? this.update(id, input) : this.create(input)
  },

  /** Alterna o status (pago ⇄ pendente). */
  async toggleStatus(id: string, status: 'pago' | 'pendente'): Promise<FixedExpenseRecord> {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .update({ status })
      .eq('id', id)
      .select(EXPENSE_SELECT)
      .single()
    if (error) throw error
    return data as unknown as FixedExpenseRecord
  },

  /**
   * Materializa uma ocorrência projetada (gasto recorrente) como registro real
   * "pago" na competência informada. O registro criado é pontual e aponta para o
   * gasto de origem via origin_id, então não gera novas projeções nem duplica a
   * projeção daquele mês.
   */
  async createPaidInstance(source: {
    originId: string
    category_id: string
    description: string
    amount: number
    due_day: number
    month: number
    year: number
    notes?: string
  }): Promise<FixedExpenseRecord> {
    const userId = await requireUserId()
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({
        user_id: userId,
        category_id: source.category_id,
        description: source.description,
        amount: source.amount,
        due_day: source.due_day,
        month: source.month,
        year: source.year,
        status: 'pago',
        recurrence: 'pontual',
        origin_id: source.originId,
        notes: source.notes ?? '',
      })
      .select(EXPENSE_SELECT)
      .single()
    if (error) {
      if (error.code === '23505') throw new Error('Esta ocorrência já está marcada como paga.')
      throw error
    }
    return data as unknown as FixedExpenseRecord
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id)
    if (error) throw error
    return true
  },
}
