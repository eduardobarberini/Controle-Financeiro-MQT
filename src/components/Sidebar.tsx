import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Landmark, LogOut, CalendarDays } from 'lucide-react'
import { COMPANY_NAME } from '@/types/financial'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  onItemClick?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const { user, logout } = useAuth()

  const navItems = [
    { to: '/dashboard', label: 'Controle Anual', icon: LayoutDashboard },
    { to: '/mensal', label: 'Controle Mensal', icon: CalendarDays },
  ]

  const getUserInitials = () => {
    if (!user) return 'CF'
    const name = (user.name as string) || (user.email as string) || ''
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase() || 'CF'
  }

  const getUserDisplayName = () => {
    if (!user) return 'Usuário'
    return (user.name as string) || (user.email as string)?.split('@')[0] || 'Usuário'
  }

  return (
    <aside className="w-[248px] bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/50 border border-emerald-400/20 shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight truncate leading-tight">
              Controle Financeiro
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-emerald-400 font-semibold tracking-wide truncate">
                {COMPANY_NAME}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-300 border-l-4 border-emerald-500 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* User Mini Profile & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-700/60 border border-emerald-500/30 flex items-center justify-center text-xs font-bold text-emerald-200 shrink-0">
              {getUserInitials()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {getUserDisplayName()}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email as string}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Sair da conta"
            className="h-7 w-7 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg shrink-0 ml-1"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  )
}
