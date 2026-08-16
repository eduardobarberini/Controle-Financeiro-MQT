import { useState, useEffect, useCallback } from 'react'
import { useFinancial } from '@/contexts/FinancialContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { renewalsService, type RenewalInput } from '@/services/renewals'
import type { RenewalRecord } from '@/types/renewals'

/**
 * Hook that loads `renewals` for the globally-selected year,
 * keeps them in sync via realtime, and exposes a save() helper.
 */
export function useRenewals() {
  const { selectedYear } = useFinancial()
  const { isAuthenticated } = useAuth()
  const [records, setRecords] = useState<RenewalRecord[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setRecords([])
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      const recs = await renewalsService.getByYear(selectedYear)
      setRecords(recs)
    } catch (err) {
      console.error('useRenewals fetch error:', err)
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, selectedYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime subscription for renewals
  useRealtime<RenewalRecord>(
    'renewals',
    useCallback(() => {
      fetchData()
    }, [fetchData]),
    isAuthenticated,
  )

  const save = useCallback(
    async (id: string | undefined, data: RenewalInput) => {
      setIsSaving(true)
      try {
        await renewalsService.save(id, data)
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
