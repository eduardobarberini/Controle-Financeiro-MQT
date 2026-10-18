import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import {
  integrationsService,
  PROVIDER_LABELS,
  type IntegrationProvider,
  type IntegrationSetting,
  type SyncRun,
} from '@/services/integrations'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plug,
  RefreshCw,
  Loader2,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  ShoppingCart,
  Receipt,
  Megaphone,
} from 'lucide-react'

const PROVIDERS: IntegrationProvider[] = ['guru', 'asaas', 'meta']

const PROVIDER_META: Record<
  IntegrationProvider,
  { icon: React.ElementType; description: string; webhook: boolean; secrets: string[] }
> = {
  guru: {
    icon: ShoppingCart,
    description:
      'Vendas à vista (cartão e PIX), reembolsos e assinaturas. Recebe cada venda em tempo real pelo webhook e concilia a cada 6 horas.',
    webhook: true,
    secrets: ['GURU_API_TOKEN', 'GURU_ACCOUNT_TOKEN'],
  },
  asaas: {
    icon: Receipt,
    description:
      'Cobranças parceladas (PIX e boleto em até 3x): parcelas pagas, em aberto, vencidas e estornos.',
    webhook: true,
    secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN'],
  },
  meta: {
    icon: Megaphone,
    description:
      'Investimento diário por campanha com impressões, cliques, CPM, CPC, leads e compras atribuídas. Atualiza a cada 4 horas.',
    webhook: false,
    secrets: ['META_ACCESS_TOKEN'],
  },
}

const DAY_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '180', label: 'Últimos 180 dias' },
  { value: '365', label: 'Último ano (Asaas e Meta)' },
]

const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '—'

const fmtDuration = (run: SyncRun) => {
  if (!run.finished_at) return '…'
  const ms = new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

const TRIGGER_LABEL: Record<SyncRun['trigger'], string> = {
  cron: 'Agendado',
  manual: 'Manual',
  webhook: 'Webhook',
  backfill: 'Histórico',
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (status === 'success')
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
        <CheckCircle2 className="w-3 h-3" /> OK
      </Badge>
    )
  if (status === 'error')
    return (
      <Badge className="bg-rose-50 text-rose-700 border-rose-200 gap-1">
        <XCircle className="w-3 h-3" /> Erro
      </Badge>
    )
  if (status === 'running')
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> Rodando
      </Badge>
    )
  return (
    <Badge className="bg-slate-100 text-slate-600 border-slate-200 gap-1">
      <Clock className="w-3 h-3" /> Nunca rodou
    </Badge>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  const { toast } = useToast()
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: 'Copiado', description: label })
    } catch {
      toast({ title: 'Não foi possível copiar', description: value, variant: 'destructive' })
    }
  }
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-slate-500">{label}</Label>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 truncate text-slate-700">
          {value}
        </code>
        <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={copy}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

interface ProviderCardProps {
  provider: IntegrationProvider
  setting: IntegrationSetting | undefined
  onChanged: () => void
}

function ProviderCard({ provider, setting, onChanged }: ProviderCardProps) {
  const { toast } = useToast()
  const meta = PROVIDER_META[provider]
  const Icon = meta.icon
  const [days, setDays] = useState('7')
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [adAccount, setAdAccount] = useState('')
  const [adAccountDirty, setAdAccountDirty] = useState(false)

  useEffect(() => {
    if (!adAccountDirty) setAdAccount(String(setting?.config?.ad_account_id ?? ''))
  }, [setting, adAccountDirty])

  const enabled = setting?.enabled ?? false

  const toggle = async (value: boolean) => {
    setSaving(true)
    try {
      await integrationsService.upsertSetting(provider, { enabled: value })
      onChanged()
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const saveAdAccount = async () => {
    setSaving(true)
    try {
      await integrationsService.upsertSetting(provider, {
        config: { ...(setting?.config ?? {}), ad_account_id: adAccount.trim() },
      })
      setAdAccountDirty(false)
      toast({ title: 'Conta de anúncios salva' })
      onChanged()
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const sync = async () => {
    setSyncing(true)
    try {
      const result = await integrationsService.triggerSync(provider, Number(days))
      const summary = Object.entries(result)
        .filter(([k]) => !['ok', 'error', 'days', 'since', 'until', 'ad_account_id'].includes(k))
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(' · ')
      toast({ title: `${PROVIDER_LABELS[provider]} sincronizado`, description: summary || 'Concluído.' })
      onChanged()
    } catch (err) {
      toast({
        title: 'Falha na sincronização',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
      onChanged()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[#6D49F2]/10 text-[#6D49F2] flex items-center justify-center shrink-0">
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold text-slate-900">
                {PROVIDER_LABELS[provider]}
              </CardTitle>
              <CardDescription className="text-xs mt-1">{meta.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={setting?.last_sync_status} />
            <Switch checked={enabled} disabled={saving} onCheckedChange={toggle} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-500">Última sincronização</p>
            <p className="font-semibold text-slate-800">{fmtDateTime(setting?.last_sync_at)}</p>
          </div>
          {setting?.last_error && (
            <div className="sm:col-span-2 rounded-md bg-rose-50 border border-rose-200 px-3 py-2 text-rose-700 break-words">
              {setting.last_error}
            </div>
          )}
        </div>

        {provider === 'meta' && (
          <div className="space-y-1">
            <Label htmlFor="ad-account" className="text-[11px] text-slate-500">
              ID da conta de anúncios (act_…)
            </Label>
            <div className="flex gap-2">
              <Input
                id="ad-account"
                value={adAccount}
                onChange={(e) => {
                  setAdAccount(e.target.value)
                  setAdAccountDirty(true)
                }}
                placeholder="act_1234567890"
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={saving || !adAccount.trim()}
                onClick={saveAdAccount}
              >
                Salvar
              </Button>
            </div>
          </div>
        )}

        {meta.webhook && (
          <CopyField
            label={`URL do webhook (cole no painel do ${provider === 'guru' ? 'Guru' : 'Asaas'})`}
            value={integrationsService.webhookUrl(provider as 'guru' | 'asaas')}
          />
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-8 text-xs sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAY_OPTIONS.filter((o) => provider !== 'guru' || Number(o.value) <= 180).map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={sync}
            disabled={syncing || !enabled}
            className="h-8 text-xs bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] text-white hover:opacity-90"
          >
            {syncing ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Sincronizar agora
          </Button>
          {!enabled && (
            <span className="text-[11px] text-slate-400">Ative a integração para sincronizar.</span>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          Segredos necessários no Supabase: {meta.secrets.join(', ')}
        </p>
      </CardContent>
    </Card>
  )
}

export default function Integracoes() {
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<IntegrationSetting[]>([])
  const [runs, setRuns] = useState<SyncRun[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        integrationsService.getSettings(),
        integrationsService.getRecentRuns(25),
      ])
      setSettings(s)
      setRuns(r)
    } catch (err) {
      toast({
        title: 'Erro ao carregar integrações',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('sync_runs', useCallback(() => load(), [load]), isAuthenticated)
  useRealtime('integration_settings', useCallback(() => load(), [load]), isAuthenticated)

  const byProvider = useMemo(
    () => new Map(settings.map((s) => [s.provider, s] as const)),
    [settings],
  )

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Plug className="w-6 h-6 text-[#6D49F2]" /> Integrações
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Conexões automáticas com Guru, Asaas e Meta Ads que alimentam o financeiro.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={load}
          className="text-xs rounded-xl"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando integrações...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {PROVIDERS.map((p) => (
            <ProviderCard key={p} provider={p} setting={byProvider.get(p)} onChanged={load} />
          ))}
        </div>
      )}

      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900">Histórico de sincronizações</CardTitle>
          <CardDescription className="text-xs">
            Execuções agendadas, manuais e de carga de histórico, com registros gravados e erros.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="text-[11px]">Quando</TableHead>
                  <TableHead className="text-[11px]">Integração</TableHead>
                  <TableHead className="text-[11px]">Origem</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead className="text-[11px] text-right">Registros</TableHead>
                  <TableHead className="text-[11px] text-right">Duração</TableHead>
                  <TableHead className="text-[11px]">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                      Nenhuma sincronização ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow key={run.id} className="border-b border-slate-100">
                      <TableCell className="text-xs text-slate-700 whitespace-nowrap">
                        {fmtDateTime(run.started_at)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900">
                        {PROVIDER_LABELS[run.provider].split(' (')[0]}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{TRIGGER_LABEL[run.trigger]}</TableCell>
                      <TableCell>
                        <StatusBadge status={run.status} />
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-700">
                        {run.records_upserted}
                      </TableCell>
                      <TableCell className="text-xs text-right text-slate-500">{fmtDuration(run)}</TableCell>
                      <TableCell className="text-[11px] text-slate-500 max-w-[320px] truncate" title={run.error ?? JSON.stringify(run.details)}>
                        {run.error ??
                          Object.entries(run.details ?? {})
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(' · ')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
