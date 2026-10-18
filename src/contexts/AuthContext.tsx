import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

/** Usuário logado, já simplificado para a UI. */
export interface AppUser {
  id: string
  email: string
  name: string
}

interface AuthContextType {
  user: AppUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Atualiza o nome exibido (metadados do usuário). */
  updateName: (name: string) => Promise<void>
  /** Solicita troca de e-mail (Supabase envia confirmação para o novo endereço). */
  updateEmail: (email: string) => Promise<void>
  /** Troca a senha após conferir a senha atual. */
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function sameUser(a: AppUser | null, b: AppUser | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.id === b.id && a.email === b.email && a.name === b.name
}

function toAppUser(session: Session | null): AppUser | null {
  const u = session?.user
  if (!u) return null
  const meta = (u.user_metadata ?? {}) as { name?: string; full_name?: string }
  return {
    id: u.id,
    email: u.email ?? '',
    name: meta.name || meta.full_name || '',
  }
}

/** Traduz as mensagens mais comuns do Supabase Auth. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'E-mail ainda não confirmado.'
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um instante e tente de novo.'
  if (m.includes('password should be at least'))
    return 'A senha precisa ter pelo menos 8 caracteres.'
  if (m.includes('different from the old password') || m.includes('same password'))
    return 'A nova senha deve ser diferente da atual.'
  return message
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      const next = toAppUser(data.session)
      setUser((prev) => (sameUser(prev, next) ? prev : next))
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = toAppUser(session)
      setUser((prev) => (sameUser(prev, next) ? prev : next))
      setIsLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(translateAuthError(error.message))
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const updateName = async (name: string) => {
    const { error } = await supabase.auth.updateUser({ data: { name } })
    if (error) throw new Error(translateAuthError(error.message))
  }

  const updateEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email })
    if (error) throw new Error(translateAuthError(error.message))
  }

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user?.email) throw new Error('Usuário não autenticado')
    // Confere a senha atual antes de trocar.
    const { error: checkErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (checkErr) throw new Error('Senha atual incorreta.')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw new Error(translateAuthError(error.message))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateName,
        updateEmail,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
