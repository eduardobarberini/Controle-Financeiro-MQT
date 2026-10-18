import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useCompany } from '@/contexts/CompanyContext'
import { toast } from '@/hooks/use-toast'
import { upsertCompanySettings, getLogoUrl } from '@/services/companySettings'
import { COMPANY_NAME as DEFAULT_COMPANY_NAME } from '@/types/financial'
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
import {
  Building2,
  User as UserIcon,
  Mail,
  Lock,
  Save,
  Loader2,
  UploadCloud,
  ImagePlus,
  Trash2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react'

export default function Configuracoes() {
  const { user, updateName, updateEmail, updatePassword } = useAuth()
  const { settings, refresh } = useCompany()

  /* ----------------------------- Company state ---------------------------- */
  const [companyNameInput, setCompanyNameInput] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ------------------------------- User state ----------------------------- */
  const [userNameInput, setUserNameInput] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  /* ------------------------------- Email state ---------------------------- */
  const [emailInput, setEmailInput] = useState('')
  const [isSavingEmail, setIsSavingEmail] = useState(false)

  /* ------------------------------ Password state -------------------------- */
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [isSavingPass, setIsSavingPass] = useState(false)

  // Hydrate inputs from auth + company settings.
  useEffect(() => {
    setCompanyNameInput(settings?.company_name || DEFAULT_COMPANY_NAME)
    setLogoPreview(getLogoUrl(settings))
    setRemoveLogo(false)
    setLogoFile(null)
  }, [settings])

  useEffect(() => {
    setUserNameInput((user?.name as string) || '')
  }, [user?.id, user?.name])

  useEffect(() => {
    setEmailInput((user?.email as string) || '')
  }, [user?.id, user?.email])

  /* ------------------------------ Logo handlers --------------------------- */
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Use PNG, JPG ou SVG.',
      })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O logo deve ter no máximo 5MB.',
      })
      return
    }
    setLogoFile(file)
    setRemoveLogo(false)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  /* --------------------------- Company initials --------------------------- */
  const companyInitials = (companyNameInput || DEFAULT_COMPANY_NAME)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase()

  /* ------------------------------ Save company ---------------------------- */
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyNameInput.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe o nome da empresa.',
      })
      return
    }
    try {
      setIsSavingCompany(true)
      await upsertCompanySettings({
        company_name: companyNameInput.trim(),
        logo: removeLogo ? null : (logoFile ?? undefined),
      })
      await refresh()
      setLogoFile(null)
      setRemoveLogo(false)
      toast({
        title: 'Identidade da empresa salva',
        description: 'Logo e nome atualizados em todo o sistema.',
      })
    } catch (err: unknown) {
      console.error('Save company error:', err)
      const errMsg = err instanceof Error ? err.message : 'Falha ao salvar.'
      toast({ variant: 'destructive', title: 'Erro ao salvar empresa', description: errMsg })
    } finally {
      setIsSavingCompany(false)
    }
  }

  /* ------------------------------ Save profile ---------------------------- */
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!userNameInput.trim()) {
      toast({ variant: 'destructive', title: 'Nome obrigatório', description: 'Informe seu nome.' })
      return
    }
    try {
      setIsSavingProfile(true)
      await updateName(userNameInput.trim())
      toast({ title: 'Perfil atualizado', description: 'Seu nome foi salvo com sucesso.' })
    } catch (err: unknown) {
      console.error('Save profile error:', err)
      const errMsg = err instanceof Error ? err.message : 'Falha ao salvar.'
      toast({ variant: 'destructive', title: 'Erro ao salvar perfil', description: errMsg })
    } finally {
      setIsSavingProfile(false)
    }
  }

  /* ------------------------------- Save email ----------------------------- */
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const trimmed = emailInput.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({
        variant: 'destructive',
        title: 'E-mail inválido',
        description: 'Digite um e-mail válido.',
      })
      return
    }
    if (trimmed === (user.email as string)) {
      toast({ title: 'Nenhuma alteração', description: 'O e-mail informado é o mesmo atual.' })
      return
    }
    try {
      setIsSavingEmail(true)
      await updateEmail(trimmed)
      toast({
        title: 'Confirmação enviada',
        description: `Enviamos um link de confirmação para ${trimmed}. Acesse para concluir a troca.`,
      })
    } catch (err: unknown) {
      console.error('Save email error:', err)
      const errMsg = err instanceof Error ? err.message : 'Falha ao solicitar troca de e-mail.'
      toast({ variant: 'destructive', title: 'Erro ao alterar e-mail', description: errMsg })
    } finally {
      setIsSavingEmail(false)
    }
  }

  /* ------------------------------ Save password --------------------------- */
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!currentPass) {
      toast({
        variant: 'destructive',
        title: 'Senha atual obrigatória',
        description: 'Informe sua senha atual.',
      })
      return
    }
    if (newPass.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A nova senha deve ter no mínimo 8 caracteres.',
      })
      return
    }
    if (newPass !== confirmPass) {
      toast({
        variant: 'destructive',
        title: 'Senhas não conferem',
        description: 'A nova senha e a confirmação devem ser iguais.',
      })
      return
    }
    try {
      setIsSavingPass(true)
      await updatePassword(currentPass, newPass)
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
      toast({ title: 'Senha atualizada', description: 'Sua senha foi alterada com sucesso.' })
    } catch (err: unknown) {
      console.error('Save password error:', err)
      const errMsg = err instanceof Error ? err.message : 'Falha ao alterar a senha.'
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar senha',
        description:
          errMsg.includes('oldPassword') || errMsg.includes('old')
            ? 'Senha atual incorreta.'
            : errMsg,
      })
    } finally {
      setIsSavingPass(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Configurações
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie a identidade da empresa e seus dados de acesso.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===================== IDENTIDADE DA EMPRESA ===================== */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#6D49F2]/10 to-[#FF2AFF]/10 border-b border-slate-200/70">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#6D49F2]" />
              Identidade da Empresa
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              Logo e nome exibidos na sidebar, topbar, rodapé e tela de login.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSaveCompany}>
            <CardContent className="space-y-5 pt-5">
              {/* Logo upload */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Logo da empresa
                </Label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Preview logo"
                        className="w-full h-full object-contain border-0 outline-none shadow-none"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <ImagePlus className="w-7 h-7 mb-1" />
                        <span className="text-[10px] font-semibold">
                          {companyInitials || 'EMP'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleLogoChange}
                      className="hidden"
                      id="logo-upload"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg border-slate-300 text-slate-700 hover:bg-slate-50"
                      >
                        <UploadCloud className="w-4 h-4 mr-1.5" />
                        {logoPreview || logoFile ? 'Trocar logo' : 'Enviar logo'}
                      </Button>
                      {(logoPreview || logoFile) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="rounded-lg text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1.5" />
                          Remover
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      PNG, JPG ou SVG até 5MB. Sem logo, mostramos as iniciais da empresa.
                    </p>
                  </div>
                </div>
              </div>

              {/* Company name */}
              <div className="space-y-2">
                <Label
                  htmlFor="companyName"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Nome da empresa
                </Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyNameInput}
                  onChange={(e) => setCompanyNameInput(e.target.value)}
                  placeholder="MQT Negócios Digitais"
                  className="h-11 text-sm font-semibold text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-100 bg-slate-50/40 px-6 py-4">
              <Button
                type="submit"
                disabled={isSavingCompany}
                className="ml-auto bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-medium rounded-xl shadow-xs"
              >
                {isSavingCompany ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Identidade
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* ===================== MEUS DADOS (coluna direita) ===================== */}
        <div className="space-y-6">
          {/* Perfil: nome */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#6D49F2]/10 to-[#FF2AFF]/10 border-b border-slate-200/70">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-[#6D49F2]" />
                Meus Dados
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Seu nome de exibição na sidebar e topbar.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSaveProfile}>
              <CardContent className="space-y-4 pt-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="userName"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Nome
                  </Label>
                  <Input
                    id="userName"
                    type="text"
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    placeholder="Seu nome"
                    className="h-11 text-sm font-semibold text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-100 bg-slate-50/40 px-6 py-4">
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  className="ml-auto bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-medium rounded-xl shadow-xs"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Nome
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* E-mail */}
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-200/70 px-6 py-4">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#6D49F2]" />
                E-mail
              </CardTitle>
            </CardHeader>
            <form onSubmit={handleSaveEmail}>
              <CardContent className="space-y-2 pt-5">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  E-mail corporativo
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="nome@empresa.com.br"
                  className="h-11 text-sm font-semibold text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  Você receberá um link de confirmação no novo e-mail para concluir a troca.
                </p>
              </CardContent>
              <CardFooter className="border-t border-slate-100 bg-slate-50/40 px-6 py-4">
                <Button
                  type="submit"
                  disabled={isSavingEmail}
                  className="ml-auto bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-medium rounded-xl shadow-xs"
                >
                  {isSavingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Solicitar Troca
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* ===================== SENHA (largura total) ===================== */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden lg:col-span-2">
          <CardHeader className="bg-gradient-to-r from-[#6D49F2]/10 to-[#FF2AFF]/10 border-b border-slate-200/70">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-[#6D49F2]" />
              Segurança & Senha
            </CardTitle>
            <CardDescription className="text-xs text-slate-600">
              Mantenha sua conta protegida com uma senha forte (mínimo 8 caracteres).
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSavePassword}>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="currentPass"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Senha atual
                  </Label>
                  <Input
                    id="currentPass"
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 text-sm text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="newPass"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Nova senha
                  </Label>
                  <Input
                    id="newPass"
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 text-sm text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-purple-500 rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPass"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Confirmar nova senha
                  </Label>
                  <Input
                    id="confirmPass"
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 text-sm text-slate-900 bg-slate-50/50 border-slate-200 focus-visible:ring-purple-500 rounded-xl"
                    required
                  />
                </div>
              </div>
              <div className="mt-4 flex items-start gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200/70 rounded-lg p-3">
                <ShieldCheck className="w-4 h-4 text-[#6D49F2] shrink-0 mt-0.5" />
                <span>
                  A nova senha deve ter no mínimo 8 caracteres. Use letras, números e símbolos para
                  maior segurança.
                </span>
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-100 bg-slate-50/40 px-6 py-4">
              <Button
                type="submit"
                disabled={isSavingPass}
                className="ml-auto bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-medium rounded-xl shadow-xs"
              >
                {isSavingPass ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Atualizar Senha
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
