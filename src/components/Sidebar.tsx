import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import { LayoutDashboard, Landmark, LogOut, CalendarDays, Settings, UserCog } from 'lucide-react'
import { useCompany } from '@/contexts/CompanyContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'

interface SidebarProps {
  onItemClick?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ onItemClick }) => {
  const { user, logout } = useAuth()
  const { companyName, logoUrl } = useCompany()

  const navItems = [
    { to: '/dashboard', label: 'Controle Anual', icon: LayoutDashboard },
    { to: '/mensal', label: 'Controle Mensal', icon: CalendarDays },
    { to: '/configuracoes', label: 'Configurações', icon: Settings },
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
    <aside className="w-[248px] bg-gradient-to-b from-[#3b0764] via-[#5b21b6] to-[#9d174d] text-purple-100 flex flex-col h-full border-r border-purple-900/60 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-purple-400/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-pink-950/50 border border-pink-300/30 shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} className="w-full h-full object-contain" />
            ) : (
              <Landmark className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight truncate leading-tight">
              Controle Financeiro
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-pink-200 font-semibold tracking-wide truncate">
                {companyName}
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
                      ? 'bg-pink-500/25 text-pink-100 border-l-4 border-pink-400 shadow-sm font-semibold'
                      : 'text-purple-200/80 hover:text-white hover:bg-purple-500/20'
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
      <div className="p-3 border-t border-purple-400/20 bg-purple-950/40 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-xl bg-purple-900/50 border border-purple-400/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-pink-500/40 border border-pink-300/30 flex items-center justify-center text-xs font-bold text-pink-50 shrink-0">
              {getUserInitials()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-purple-50 truncate">
                {getUserDisplayName()}
              </p>
              <p className="text-[11px] text-purple-200/70 truncate">{user?.email as string}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Sair da conta"
            className="h-7 w-7 text-purple-200/70 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg shrink-0 ml-1"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <Link
          to="/configuracoes"
          onClick={onItemClick}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-purple-200/80 hover:text-white hover:bg-purple-500/30 transition-colors"
        >
          <UserCog className="w-3 h-3" />
          <span>Editar perfil</span>
        </Link>
      </div>
    </aside>
  )
}
