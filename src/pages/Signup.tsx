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
import { Landmark, Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react'
import { useCompany } from '@/contexts/CompanyContext'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { signup } = useAuth()
  const { companyName, logoUrl } = useCompany()
  const navigate = useNavigate()

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Nome é obrigatório.'
    if (!email.trim()) {
      errs.email = 'E-mail é obrigatório.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = 'E-mail inválido.'
    }
    if (!password) {
      errs.password = 'Senha é obrigatória.'
    } else if (password.length < 8) {
      errs.password = 'A senha deve ter no mínimo 8 caracteres.'
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'As senhas não conferem.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setIsSubmitting(true)
      await signup(name.trim(), email.trim(), password)
      toast({
        title: 'Conta criada com sucesso!',
        description: `Bem-vindo ao ${companyName}.`,
      })
      navigate('/dashboard')
    } catch (err: unknown) {
      console.error('Signup error:', err)
      const errMsg = err instanceof Error ? err.message : 'Não foi possível criar a conta.'
      toast({
        variant: 'destructive',
        title: 'Erro no cadastro',
        description: errMsg.includes('email') ? 'Este e-mail já está em uso.' : errMsg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3b0764] via-[#4c1d95] to-[#831843] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-in fade-in-50 duration-500">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-white shadow-xl shadow-purple-950/40 mb-3 shrink-0 overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="w-full h-full object-contain border-0 outline-none shadow-none"
              />
            ) : (
              <Landmark className="w-7 h-7" />
            )}
          </div>{' '}
          <h1 className="text-2xl font-bold tracking-tight text-white">Criar Nova Conta</h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">{companyName}</p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-xl text-slate-100 shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold tracking-tight text-white">
              Cadastro Empresarial
            </CardTitle>
            <CardDescription className="text-slate-400">
              Preencha os dados abaixo para acessar o sistema
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-200 text-sm">
                  Nome completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="pl-9 bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-pink-500"
                    required
                  />
                </div>
                {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name}</p>}
              </div>

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
                    className="pl-9 bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-pink-500"
                    required
                  />
                </div>
                {errors.email && <p className="text-xs text-rose-400 mt-1">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200 text-sm">
                  Senha (mínimo 8 caracteres)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-pink-500"
                    required
                  />
                </div>
                {errors.password && <p className="text-xs text-rose-400 mt-1">{errors.password}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-200 text-sm">
                  Confirmar senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9 bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-pink-500"
                    required
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-rose-400 mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-pink-950/50 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    Cadastrar e Entrar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-slate-400">
                Já possui uma conta?{' '}
                <Link
                  to="/login"
                  className="text-pink-300 hover:text-pink-200 font-medium underline-offset-4 hover:underline"
                >
                  Fazer login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">Financeiro • {companyName} • 2026</p>
      </div>
    </div>
  )
}
