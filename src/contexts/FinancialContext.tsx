import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { DEFAULT_YEAR } from '@/types/financial'
import { monthlyDetailsService } from '@/services/monthlyDetails'
import { goalsService } from '@/services/goals'
import { MonthlyDetailsRecord, GoalsRecord, YearFinancialSummary } from '@/types/financial'
import { buildYearFinancialSummary } from '@/lib/financial-utils'
import { useAuth } from './AuthContext'
import { useRealtime } from '@/hooks/use-realtime'

interface FinancialContextType {
  selectedYear: number
  setSelectedYear: (year: number) => void
  monthlyRecords: MonthlyDetailsRecord[]
  goals: GoalsRecord | null
  summary: YearFinancialSummary
  isLoading: boolean
  isSaving: boolean
  refreshData: () => Promise<void>
  saveGoalsData: (
    annualRevenueGoal: number,
    annualProfitGoal: number,
    taxMetaRate?: number,
    salesTaxRate?: number,
    profitMarginGoal?: number | null,
    renewalRateGoal?: number | null,
  ) => Promise<GoalsRecord>
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined)

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth()
  const [selectedYear, setSelectedYear] = useState<number>(DEFAULT_YEAR)
  const [monthlyRecords, setMonthlyRecords] = useState<MonthlyDetailsRecord[]>([])
  const [goals, setGoals] = useState<GoalsRecord | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setMonthlyRecords([])
      setGoals(null)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const [records, goalsRec] = await Promise.all([
        monthlyDetailsService.getByYear(selectedYear),
        goalsService.getByYear(selectedYear),
      ])
      setMonthlyRecords(records)
      setGoals(goalsRec)
    } catch (err) {
      console.error('Error fetching financial data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user, selectedYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime subscription for monthly_details and goals
  useRealtime<MonthlyDetailsRecord>(
    'monthly_details',
    useCallback(() => {
      fetchData()
    }, [fetchData]),
    isAuthenticated,
  )

  useRealtime<GoalsRecord>(
    'goals',
    useCallback(() => {
      fetchData()
    }, [fetchData]),
    isAuthenticated,
  )

  const saveGoalsData = async (
    annualRevenueGoal: number,
    annualProfitGoal: number,
    taxMetaRate?: number,
    salesTaxRate?: number,
    profitMarginGoal?: number | null,
    renewalRateGoal?: number | null,
  ) => {
    setIsSaving(true)
    try {
      const saved = await goalsService.saveGoals(
        selectedYear,
        annualRevenueGoal,
        annualProfitGoal,
        taxMetaRate,
        salesTaxRate,
        profitMarginGoal,
        renewalRateGoal,
      )
      await fetchData()
      return saved
    } finally {
      setIsSaving(false)
    }
  }

  const summary = buildYearFinancialSummary(selectedYear, monthlyRecords, goals)

  return (
    <FinancialContext.Provider
      value={{
        selectedYear,
        setSelectedYear,
        monthlyRecords,
        goals,
        summary,
        isLoading,
        isSaving,
        refreshData: fetchData,
        saveGoalsData,
      }}
    >
      {children}
    </FinancialContext.Provider>
  )
}

export function useFinancial() {
  const context = useContext(FinancialContext)
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider')
  }
  return context
}
