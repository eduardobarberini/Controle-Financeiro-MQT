import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import { BarChart3, Landmark, LogOut, CalendarDays, UserCog } from 'lucide-react'
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
    { to: '/dashboard', label: 'Controle Anual', icon: BarChart3 },
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
    <aside className="w-[248px] bg-gray-900 text-slate-100 flex flex-col h-full border-r border-[#6D49F2]/30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-purple-400/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] flex items-center justify-center text-white shrink-0 overflow-hidden shadow-md shadow-[#6D49F2]/30">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="w-full h-full object-contain border-0 outline-none shadow-none"
              />
            ) : (
              <Landmark className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight truncate leading-tight">
              Controle Financeiro
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-[#FF2AFF] font-semibold tracking-wide truncate">
                {companyName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-150 ${
                    isActive
                      ? 'bg-white/[0.07] text-white font-semibold shadow-xs'
                      : 'text-slate-300/80 hover:text-white hover:bg-white/[0.04]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                        isActive ? 'text-[#FF2AFF]' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {/* User Mini Profile & Logout */}
      <div className="p-3 border-t border-[#FF2AFF]/20 bg-[#180B38]/60 space-y-2">
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#2A1254]/70 border border-[#6D49F2]/30">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
              {getUserInitials()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{getUserDisplayName()}</p>
              <p className="text-[11px] text-slate-300 truncate">{user?.email as string}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            title="Sair da conta"
            className="h-7 w-7 text-slate-300 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg shrink-0 ml-1"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <Link
          to="/configuracoes"
          onClick={onItemClick}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-[#6D49F2]/30 transition-colors"
        >
          <UserCog className="w-3 h-3" />
          <span>Configurações do Perfil</span>
        </Link>
      </div>
    </aside>
  )
}
