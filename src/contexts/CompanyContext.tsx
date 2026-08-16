import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  getCompanySettings,
  getLogoUrl,
  type CompanySettingsRecord,
} from '@/services/companySettings'
import { COMPANY_NAME as DEFAULT_COMPANY_NAME } from '@/types/financial'

interface CompanyContextValue {
  companyName: string
  logoUrl: string | null
  settings: CompanySettingsRecord | null
  loading: boolean
  refresh: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined)

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<CompanySettingsRecord | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const refresh = useCallback(async () => {
    const rec = await getCompanySettings()
    setSettings(rec)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Only fetch when authenticated; PocketBase SDK exposes the record on the store.
    if (!pb.authStore.record) {
      setLoading(false)
      return
    }
    refresh()
  }, [refresh])

  // Keep in sync when auth changes (login/logout).
  useEffect(() => {
    const unsubscribe = pb.authStore.onChange(() => {
      if (!pb.authStore.record) {
        setSettings(null)
        setLoading(false)
      } else {
        refresh()
      }
    })
    return () => {
      unsubscribe()
    }
  }, [refresh])

  const companyName = settings?.company_name || DEFAULT_COMPANY_NAME
  const logoUrl = getLogoUrl(settings)

  return (
    <CompanyContext.Provider value={{ companyName, logoUrl, settings, loading, refresh }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany must be used within a CompanyProvider')
  return ctx
}
