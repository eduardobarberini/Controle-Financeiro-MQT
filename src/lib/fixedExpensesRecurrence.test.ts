import { describe, expect, it } from 'vitest'
import { getEffectiveExpensesForMonth, monthDelta, projectsToMonth } from './fixedExpensesRecurrence'
import type { FixedExpenseRecord } from '@/types/fixedExpenses'

const base = (over: Partial<FixedExpenseRecord>): FixedExpenseRecord => ({
  id: 'id',
  user_id: 'u',
  category_id: 'cat',
  description: 'Internet',
  amount: 100,
  due_day: 10,
  month: 1,
  year: 2026,
  status: 'pendente',
  recurrence: 'pontual',
  ends_year: null,
  ends_month: null,
  origin_id: null,
  notes: '',
  created_at: '',
  updated_at: '',
  ...over,
})

describe('monthDelta', () => {
  it('conta meses entre competências', () => {
    expect(monthDelta(1, 2026, 3, 2026)).toBe(2)
    expect(monthDelta(11, 2025, 2, 2026)).toBe(3)
    expect(monthDelta(3, 2026, 1, 2026)).toBe(-2)
  })
})

describe('projectsToMonth', () => {
  it('pontual só no mês de origem', () => {
    expect(projectsToMonth('pontual', 1, 2026, 1, 2026)).toBe(true)
    expect(projectsToMonth('pontual', 1, 2026, 2, 2026)).toBe(false)
  })
  it('mensal em todo mês a partir da origem', () => {
    expect(projectsToMonth('mensal', 1, 2026, 7, 2026)).toBe(true)
    expect(projectsToMonth('mensal', 3, 2026, 2, 2026)).toBe(false)
  })
  it('trimestral, semestral e anual', () => {
    expect(projectsToMonth('trimestral', 1, 2026, 4, 2026)).toBe(true)
    expect(projectsToMonth('trimestral', 1, 2026, 5, 2026)).toBe(false)
    expect(projectsToMonth('semestral', 1, 2026, 7, 2026)).toBe(true)
    expect(projectsToMonth('anual', 1, 2026, 1, 2027)).toBe(true)
    expect(projectsToMonth('anual', 1, 2026, 6, 2027)).toBe(false)
  })
  it('respeita a competência de término', () => {
    const ends = { month: 3, year: 2026 }
    expect(projectsToMonth('mensal', 1, 2026, 3, 2026, ends)).toBe(true)
    expect(projectsToMonth('mensal', 1, 2026, 4, 2026, ends)).toBe(false)
  })
})

describe('getEffectiveExpensesForMonth', () => {
  const origin = base({ id: 'o1', recurrence: 'mensal', month: 1, year: 2026 })

  it('no mês de origem devolve só o registro real', () => {
    const list = getEffectiveExpensesForMonth([origin], 1, 2026)
    expect(list).toHaveLength(1)
    expect('isProjected' in list[0]).toBe(false)
  })

  it('projeta nos meses seguintes', () => {
    const list = getEffectiveExpensesForMonth([origin], 3, 2026)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ isProjected: true, originalId: 'o1', month: 3, amount: 100 })
  })

  it('ocorrência paga substitui a projeção e não duplica nos meses seguintes', () => {
    const paid = base({
      id: 'p1',
      recurrence: 'pontual',
      status: 'pago',
      month: 2,
      year: 2026,
      origin_id: 'o1',
    })
    const feb = getEffectiveExpensesForMonth([origin, paid], 2, 2026)
    expect(feb).toHaveLength(1)
    expect(feb[0]).toMatchObject({ id: 'p1', status: 'pago' })

    // Antes do ajuste, março mostrava duas projeções (origem + instância paga).
    const mar = getEffectiveExpensesForMonth([origin, paid], 3, 2026)
    expect(mar).toHaveLength(1)
    expect(mar[0]).toMatchObject({ isProjected: true, originalId: 'o1' })
  })

  it('recorrência com fim não projeta depois do término', () => {
    const limited = base({ id: 'o2', recurrence: 'mensal', ends_month: 2, ends_year: 2026 })
    expect(getEffectiveExpensesForMonth([limited], 2, 2026)).toHaveLength(1)
    expect(getEffectiveExpensesForMonth([limited], 3, 2026)).toHaveLength(0)
  })
})
