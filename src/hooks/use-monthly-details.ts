import { useState, useEffect, useCallback, useRef } from 'react'
import { useFinancial } from '@/contexts/FinancialContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'
import { monthlyDetailsService, type MonthlyDetailsInput } from '@/services/monthlyDetails'
import type { MonthlyDetailsRecord } from '@/types/financial'

/**
 * Hook that loads `monthly_details` for the globally-selected year,
 * keeps them in sync via realtime, and exposes a save() helper.
 */
export function useMonthlyDetails() {
  const { selectedYear } = useFinancial()
  const { isAuthenticated } = useAuth()
  const [records, setRecords] = useState<MonthlyDetailsRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const loadedYear = useRef<number | null>(null)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setRecords([])
      setIsLoading(false)
      return
    }
    try {
      // Loader só na primeira carga do ano; recargas (salvar/realtime) são silenciosas.
      if (loadedYear.current !== selectedYear) setIsLoading(true)
      const recs = await monthlyDetailsService.getByYear(selectedYear)
      setRecords(recs)
      loadedYear.current = selectedYear
    } catch (err) {
      // Não zera os registros: a tela ficaria "vazia" e um salvar sobrescreveria dados existentes.
      console.error('useMonthlyDetails fetch error:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: err instanceof Error ? err.message : 'Tente recarregar a página.',
      })
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, selectedYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime subscription for monthly_details
  useRealtime<MonthlyDetailsRecord>(
    'monthly_details',
    useCallback(() => {
      fetchData()
    }, [fetchData]),
    isAuthenticated,
  )

  const save = useCallback(
    async (id: string | undefined, data: MonthlyDetailsInput) => {
      setIsSaving(true)
      try {
        await monthlyDetailsService.save(id, data)
        await fetchData()
      } finally {
        setIsSaving(false)
      }
    },
    [fetchData],
  )

  return {
    selectedYear,
    records,
    isLoading,
    isSaving,
    refresh: fetchData,
    save,
  }
}
