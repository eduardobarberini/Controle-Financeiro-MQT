import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import {
  integrationsService,
  type AsaasReceivables,
  type MonthlyIntegrationRow,
} from '@/services/integrations'
import { formatCurrency, formatNumber } from '@/lib/financial-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plug, ShoppingCart, Receipt, Megaphone, AlertTriangle } from 'lucide-react'

interface Totals {
  guruSales: number
  guruGross: number
  guruNet: number
  guruRefunded: number
  asaasReceived: number
  asaasPaidCount: number
  metaSpend: number
  metaLeads: number
  metaPurchases: number
  metaPurchaseValue: number
}

const sum = (rows: MonthlyIntegrationRow[], key: keyof MonthlyIntegrationRow) =>
  rows.reduce((s, r) => s + (Number(r[key]) || 0), 0)

function Stat({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string
  value: string
  sub?: string
  tone?: 'default' | 'danger'
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-slate-500 truncate">{label}</p>
      <p
        className={`text-sm font-bold truncate ${tone === 'danger' ? 'text-rose-600' : 'text-slate-900'}`}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-slate-400 truncate">{sub}</p>}
    </div>
  )
}

/** Resumo anual do que chegou pelas integrações (Guru, Asaas, Meta) e parcelas a receber. */
export function IntegrationsSummary({ year }: { year: number }) {
  const { isAuthenticated } = useAuth()
  const [totals, setTotals] = useState<Totals | null>(null)
  const [receivables, setReceivables] = useState<AsaasReceivables | null>(null)
  const [hasAny, setHasAny] = useState(false)

  const load = useCallback(async () => {
    if (!isAuthenticated) return
    const [rows, recv] = await Promise.all([
      integrationsService.getMonthlyIntegrations(year),
      integrationsService.getReceivables(),
    ])
    setTotals({
      guruSales: sum(rows, 'guru_sales'),
      guruGross: sum(rows, 'guru_gross'),
      guruNet: sum(rows, 'guru_net'),
      guruRefunded: sum(rows, 'guru_refunded'),
      asaasReceived: sum(rows, 'asaas_received'),
      asaasPaidCount: sum(rows, 'asaas_paid_count'),
      metaSpend: sum(rows, 'meta_spend'),
      metaLeads: sum(rows, 'meta_leads'),
      metaPurchases: sum(rows, 'meta_purchases'),
      metaPurchaseValue: sum(rows, 'meta_purchase_value'),
    })
    setReceivables(recv)
    setHasAny(rows.length > 0 || !!recv)
  }, [isAuthenticated, year])

  useEffect(() => {
    load()
  }, [load])

  useRealtime('sync_runs', useCallback(() => load(), [load]), isAuthenticated)

  if (!totals) return null

  const revenue = totals.guruGross - totals.guruRefunded + totals.asaasReceived
  const roas = totals.metaSpend > 0 ? revenue / totals.metaSpend : null

  return (
    <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Plug className="w-4 h-4 text-[#6D49F2]" />
            Dados automáticos de {year}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            {hasAny
              ? 'Somatório do que chegou pelo Guru, Asaas e Meta Ads. Use o Controle Mensal para levar estes valores ao resultado.'
              : 'Nenhum dado importado ainda. Conecte as integrações para preencher automaticamente.'}
          </CardDescription>
        </div>
        <Link
          to="/integracoes"
          className="text-xs font-semibold text-[#6D49F2] hover:underline underline-offset-4 shrink-0"
        >
          Gerenciar integrações
        </Link>
      </CardHeader>
      <CardContent className="p-5 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <ShoppingCart className="w-3.5 h-3.5 text-[#6D49F2]" /> Guru · vendas à vista
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Faturamento bruto" value={formatCurrency(totals.guruGross)} sub={`${formatNumber(totals.guruSales, 0)} vendas`} />
              <Stat label="Líquido (após taxas)" value={formatCurrency(totals.guruNet)} />
              <Stat
                label="Reembolsos"
                value={formatCurrency(totals.guruRefunded)}
                tone={totals.guruRefunded > 0 ? 'danger' : 'default'}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Receipt className="w-3.5 h-3.5 text-[#6D49F2]" /> Asaas · parcelado
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Recebido no ano" value={formatCurrency(totals.asaasReceived)} sub={`${formatNumber(totals.asaasPaidCount, 0)} parcelas pagas`} />
              <Stat
                label="A receber (em aberto)"
                value={formatCurrency(receivables?.open_value ?? 0)}
                sub={`${formatNumber(receivables?.open_count ?? 0, 0)} parcelas`}
              />
              <Stat
                label="Vencidas"
                value={formatCurrency(receivables?.overdue_value ?? 0)}
                sub={`${formatNumber(receivables?.overdue_count ?? 0, 0)} parcelas`}
                tone={(receivables?.overdue_value ?? 0) > 0 ? 'danger' : 'default'}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <Megaphone className="w-3.5 h-3.5 text-[#6D49F2]" /> Meta Ads · tráfego
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Investimento" value={formatCurrency(totals.metaSpend)} />
              <Stat
                label="ROAS (receita ÷ investimento)"
                value={roas === null ? '—' : formatNumber(roas, 2)}
              />
              <Stat label="Leads" value={formatNumber(totals.metaLeads, 0)} />
              <Stat
                label="Compras atribuídas"
                value={formatNumber(totals.metaPurchases, 0)}
                sub={formatCurrency(totals.metaPurchaseValue)}
              />
            </div>
          </div>
        </div>

        {(receivables?.overdue_count ?? 0) > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Há {formatNumber(receivables!.overdue_count, 0)} parcela(s) vencida(s) no Asaas somando{' '}
            {formatCurrency(receivables!.overdue_value)}.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
