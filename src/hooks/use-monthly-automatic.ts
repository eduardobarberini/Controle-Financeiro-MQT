import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { integrationsService, type MonthlyIntegrationRow } from '@/services/integrations'
import { fixedExpensesService } from '@/services/fixedExpensesService'
import { getEffectiveExpensesForMonth } from '@/lib/fixedExpensesRecurrence'

/** Valores do mês calculados a partir das integrações e dos gastos fixos. */
export interface AutoMonth {
  month: number // 1-12
  /** Receita = Guru aprovado − Guru reembolsado + Asaas recebido (parcelas pagas). */
  revenue: number
  guruGross: number
  guruRefunded: number
  guruSales: number
  asaasReceived: number
  asaasPaidCount: number
  /** Investimento Meta = gasto total das campanhas no mês. */
  adsMeta: number
  metaLeads: number
  metaPurchases: number
  /** Custos fixos = soma dos gastos fixos (reais + recorrências) do mês. */
  fixedCosts: number
  fixedCount: number
  hasData: boolean
}

function emptyMonth(month: number): AutoMonth {
  return {
    month,
    revenue: 0,
    guruGross: 0,
    guruRefunded: 0,
    guruSales: 0,
    asaasReceived: 0,
    asaasPaidCount: 0,
    adsMeta: 0,
    metaLeads: 0,
    metaPurchases: 0,
    fixedCosts: 0,
    fixedCount: 0,
    hasData: false,
  }
}

/**
 * Carrega, para o ano informado, os valores automáticos de cada mês:
 * receita (Guru + Asaas), investimento (Meta) e custos fixos (Gastos Fixos).
 */
export function useMonthlyAutomatic(year: number) {
  const { isAuthenticated } = useAuth()
  const [months, setMonths] = useState<Map<number, AutoMonth>>(new Map())
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setMonths(new Map())
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const [rows, expenses] = await Promise.all([
        integrationsService.getMonthlyIntegrations(year),
        fixedExpensesService.getAll(),
      ])
      const byMonth = new Map<number, MonthlyIntegrationRow>(rows.map((r) => [Number(r.month), r]))
      const result = new Map<number, AutoMonth>()
      for (let m = 1; m <= 12; m++) {
        const r = byMonth.get(m)
        const effective = getEffectiveExpensesForMonth(expenses, m, year)
        const fixedCosts = effective.reduce((s, e) => s + (Number(e.amount) || 0), 0)
        const item = emptyMonth(m)
        if (r) {
          item.guruGross = Number(r.guru_gross) || 0
          item.guruRefunded = Number(r.guru_refunded) || 0
          item.guruSales = Number(r.guru_sales) || 0
          item.asaasReceived = Number(r.asaas_received) || 0
          item.asaasPaidCount = Number(r.asaas_paid_count) || 0
          item.adsMeta = Number(r.meta_spend) || 0
          item.metaLeads = Number(r.meta_leads) || 0
          item.metaPurchases = Number(r.meta_purchases) || 0
        }
        item.revenue = Math.max(0, item.guruGross - item.guruRefunded + item.asaasReceived)
        item.fixedCosts = fixedCosts
        item.fixedCount = effective.length
        item.hasData = item.revenue > 0 || item.adsMeta > 0 || item.fixedCosts > 0
        result.set(m, item)
      }
      setMonths(result)
    } catch (err) {
      console.error('useMonthlyAutomatic:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, year])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Sincronizações terminadas e gastos alterados recalculam os automáticos.
  useRealtime('sync_runs', useCallback(() => refresh(), [refresh]), isAuthenticated)
  useRealtime('fixed_expenses', useCallback(() => refresh(), [refresh]), isAuthenticated)

  return { months, isLoading, refresh }
}
