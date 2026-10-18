import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  getCompanySettings,
  getLogoUrl,
  type CompanySettingsRecord,
} from '@/services/companySettings'
import { COMPANY_NAME as DEFAULT_COMPANY_NAME } from '@/types/financial'
import { useAuth } from './AuthContext'

interface CompanyContextValue {
  companyName: string
  logoUrl: string | null
  settings: CompanySettingsRecord | null
  loading: boolean
  refresh: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextValue | undefined>(undefined)

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth()
  const [settings, setSettings] = useState<CompanySettingsRecord | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const refresh = useCallback(async () => {
    try {
      const rec = await getCompanySettings()
      setSettings(rec)
    } catch (err) {
      console.error('CompanyContext.refresh:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Carrega quando há usuário; limpa ao sair.
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setSettings(null)
      setLoading(false)
      return
    }
    refresh()
  }, [user, authLoading, refresh])

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
