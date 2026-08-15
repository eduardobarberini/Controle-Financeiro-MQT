import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Landmark, Lock, Mail, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { COMPANY_NAME } from '@/types/financial'

export default function Login() {
  const [email, setEmail] = useState('eduardo@body4you.com.br')
  const [password, setPassword] = useState('Skip@Pass')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password) {
      setError('Por favor, preencha todos os campos.')
      return
    }

    try {
      setIsSubmitting(true)
      await login(email.trim(), password)
      toast({
        title: 'Bem-vindo de volta!',
        description: 'Login realizado com sucesso.',
      })
      navigate('/dashboard')
    } catch (err: unknown) {
      console.error('Login error:', err)
      const errMsg =
        err instanceof Error ? err.message : 'Credenciais inválidas. Verifique seu e-mail e senha.'
      setError('E-mail ou senha inválidos. Tente novamente.')
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: errMsg.includes('Failed to authenticate') ? 'Credenciais incorretas.' : errMsg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFillDemo = () => {
    setEmail('eduardo@body4you.com.br')
    setPassword('Skip@Pass')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in-50 duration-500">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-xl shadow-emerald-900/30 mb-3 border border-emerald-400/20">
            <Landmark className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Controle Financeiro</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">{COMPANY_NAME} • Módulo 1</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-xl text-slate-100 shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold tracking-tight text-white">
              Acessar sistema
            </CardTitle>
            <CardDescription className="text-slate-400">
              Digite suas credenciais corporativas para entrar
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200 text-sm">
                  E-mail corporativo
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com.br"
                    className="pl-9 bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-200 text-sm">
                    Senha
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500"
                    required
                  />
                </div>
              </div>

              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFillDemo}
                  className="w-full text-xs text-slate-300 border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:text-white"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Preencher dados de demonstração (Eduardo)
                </Button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar no Painel
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-slate-400">
                Ainda não tem conta?{' '}
                <Link
                  to="/signup"
                  className="text-emerald-400 hover:text-emerald-300 font-medium underline-offset-4 hover:underline"
                >
                  Criar conta
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          Módulo 1 — Financeiro • {COMPANY_NAME} • 2026
        </p>
      </div>
    </div>
  )
}
