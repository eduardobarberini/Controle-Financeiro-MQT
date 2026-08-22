import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import type {
  FixedExpenseCategoryRecord,
  FixedExpenseCategoryInput,
  FixedExpenseRecord,
  FixedExpenseInput,
} from '@/types/fixedExpenses'

/**
 * CRUD service for the "Gastos Fixos" module. All collections are user-scoped:
 * every list/filter is narrowed by the authenticated user id.
 *
 * Categories: collection `fixed_expense_categories`.
 * Expenses:   collection `fixed_expenses` (with `expand=category` to hydrate
 * the related category on read).
 */
export const fixedExpensesService = {
  // ─────────────────────────────────────────────────────────────
  //  Categorias
  // ─────────────────────────────────────────────────────────────

  /** List all fixed-expense categories for the current user (sorted by name). */
  async getCategories(): Promise<FixedExpenseCategoryRecord[]> {
    const userId = pb.authStore.record?.id
    if (!userId) return []
    try {
      return await pb
        .collection<FixedExpenseCategoryRecord>('fixed_expense_categories')
        .getFullList({
          filter: `user = "${userId}"`,
          sort: 'name',
        })
    } catch (err) {
      console.error('fixedExpensesService.getCategories error:', err)
      return []
    }
  },

  /** Create a new category. */
  async createCategory(data: FixedExpenseCategoryInput): Promise<FixedExpenseCategoryRecord> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')
    return await pb
      .collection<FixedExpenseCategoryRecord>('fixed_expense_categories')
      .create({ user: userId, ...data })
  },

  /** Update an existing category by id. */
  async updateCategory(
    id: string,
    data: FixedExpenseCategoryInput,
  ): Promise<FixedExpenseCategoryRecord> {
    return await pb
      .collection<FixedExpenseCategoryRecord>('fixed_expense_categories')
      .update(id, data)
  },

  /** Upsert helper: update if id present, otherwise create. */
  async saveCategory(
    id: string | undefined,
    data: FixedExpenseCategoryInput,
  ): Promise<FixedExpenseCategoryRecord> {
    if (id) return await this.updateCategory(id, data)
    return await this.createCategory(data)
  },

  /** Delete a category. Server hook blocks deletion when expenses are linked. */
  async deleteCategory(id: string): Promise<boolean> {
    try {
      await pb.collection('fixed_expense_categories').delete(id)
      return true
    } catch (err) {
      // Surface the backend message verbatim so the UI can toast it.
      throw new Error(getErrorMessage(err))
    }
  },

  // ─────────────────────────────────────────────────────────────
  //  Gastos
  // ─────────────────────────────────────────────────────────────

  /** List all fixed expenses for the current user (newest first). */
  async getAll(): Promise<FixedExpenseRecord[]> {
    const userId = pb.authStore.record?.id
    if (!userId) return []
    try {
      return await pb.collection<FixedExpenseRecord>('fixed_expenses').getFullList({
        filter: `user = "${userId}"`,
        sort: '-created',
        expand: 'category',
      })
    } catch (err) {
      console.error('fixedExpensesService.getAll error:', err)
      return []
    }
  },

  /** Create a new fixed expense. */
  async create(data: FixedExpenseInput): Promise<FixedExpenseRecord> {
    const userId = pb.authStore.record?.id
    if (!userId) throw new Error('Usuário não autenticado')
    return await pb.collection<FixedExpenseRecord>('fixed_expenses').create({
      user: userId,
      ...data,
    })
  },

  /** Update an existing fixed expense by id. */
  async update(id: string, data: FixedExpenseInput): Promise<FixedExpenseRecord> {
    return await pb.collection<FixedExpenseRecord>('fixed_expenses').update(id, data)
  },

  /** Upsert helper: update if id present, otherwise create. */
  async save(id: string | undefined, data: FixedExpenseInput): Promise<FixedExpenseRecord> {
    if (id) return await this.update(id, data)
    return await this.create(data)
  },

  /** Toggle the status field of a fixed expense (pago ⇄ pendente). */
  async toggleStatus(id: string, status: 'pago' | 'pendente'): Promise<FixedExpenseRecord> {
    return await pb.collection<FixedExpenseRecord>('fixed_expenses').update(id, { status })
  },

  /** Delete a fixed expense by id. */
  async delete(id: string): Promise<boolean> {
    try {
      await pb.collection('fixed_expenses').delete(id)
      return true
    } catch (err) {
      console.error('fixedExpensesService.delete error:', err)
      throw err
    }
  },
}
