import React, { useState } from 'react'
import { Outlet, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import { useFinancial } from '@/contexts/FinancialContext'
import { Sidebar } from '@/components/Sidebar'
import { YearSelector } from '@/components/YearSelector'
import { Menu, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'

export default function Layout() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const { companyName } = useCompany()
  const { selectedYear, setSelectedYear } = useFinancial()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-pink-400 mb-3" />
        <p className="text-sm text-slate-400">Carregando painel financeiro...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const getUserInitials = () => {
    if (!user) return 'CF'
    const name = (user.name as string) || (user.email as string) || ''
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase() || 'CF'
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans antialiased">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block shrink-0 h-full">
        <Sidebar />
      </div>

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Sticky Topbar */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-20 shadow-xs">
          {/* Left: Mobile hamburger & Page Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Sheet Drawer */}
            <div className="lg:hidden">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-700">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="p-0 w-[248px] bg-gradient-to-b from-[#3b0764] via-[#5b21b6] to-[#9d174d] border-r-purple-900/60"
                >
                  <Sidebar onItemClick={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  Dashboard Financeiro
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
                  {companyName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Visão do ano de {selectedYear}
              </p>
            </div>
          </div>

          {/* Right: Year Selector & User */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center border border-purple-300 shadow-2xs"
                title={user?.email as string}
              >
                {getUserInitials()}
              </div>
              <Link
                to="/configuracoes"
                title="Configurações"
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 hover:text-purple-700 hover:bg-purple-50 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Configurações</span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sair</span>
              </Button>{' '}
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1280px] mx-auto pb-12 animate-in fade-in-50 duration-200">
            <Outlet />
          </div>

          {/* Global Footer */}
          <footer className="max-w-[1280px] mx-auto border-t border-slate-200/80 pt-4 pb-8 mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              <span className="font-semibold text-slate-700">Financeiro</span> • {companyName} •{' '}
              {selectedYear}
            </div>
            <div className="text-slate-500">Sistema expansível de gestão empresarial</div>
          </footer>
        </main>
      </div>
    </div>
  )
}
