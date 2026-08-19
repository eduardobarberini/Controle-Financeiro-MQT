import React from 'react'
import { ArrowUpCircle, Save, Loader2, DollarSign, Percent } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import type { UpsellPlatform } from '@/types/paidLaunches'
import {
  formatCurrency,
  formatPercent,
  formatCalculatedPercent,
  formatCalculatedCurrency,
} from '@/lib/launch-format'

interface UpsellPlatformTabProps {
  upsellData: UpsellPlatform
  onChangeField: (field: keyof UpsellPlatform, value: string | number) => void
  upsellCalc: {
    conversionRate: number
    boletoRate: number
    refundRate: number
    platformRevenue: number
  }
  onSave: () => Promise<void>
  saving: boolean
  launchBatch: string
  launchId?: string
}

export const UpsellPlatformTab: React.FC<UpsellPlatformTabProps> = ({
  upsellData,
  onChangeField,
  upsellCalc,
  onSave,
  saving,
  launchBatch,
  launchId,
}) => {
  return (
    <div className="space-y-6">
      {/* Upper Header / KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard
          title="Vendas Totais"
          value={Number(upsellData.total_sales) || 0}
          formatType="raw"
          icon={DollarSign}
          subtext="Total de vendas na plataforma"
          iconBgColor="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20"
        />
        <KpiCard
          title="% Conversão Desafio / Plataforma"
          value={upsellCalc.conversionRate}
          formatType="percent"
          decimals={2}
          icon={Percent}
          subtext="Vendas plataforma / Vendas de ingressos"
          iconBgColor="bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20"
        />
      </div>

      {/* Main Form Card */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2">
          <ArrowUpCircle className="w-4 h-4 text-[#FF2AFF]" />
          <span>Vendas Plataforma</span>
        </div>

        <div className="p-4 sm:p-6 space-y-2.5">
          {/* % Conversão Geral (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-purple-50/60 px-3 rounded-lg border border-[#6D49F2]/20">
            <span className="font-bold text-xs text-[#6D49F2]">% Conversão Geral</span>
            <div className="text-right font-bold tabular-nums text-xs text-[#6D49F2]">
              {formatCalculatedPercent(upsellCalc.conversionRate)}
            </div>
          </div>

          {/* Vendas Totais (Manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
            <span className="font-medium text-sm text-slate-700 font-bold">Vendas Totais</span>
            <Input
              type="number"
              min={0}
              value={upsellData.total_sales}
              onChange={(e) => onChangeField('total_sales', e.target.value)}
              placeholder="0"
              className="bg-white border-slate-200 text-slate-900 font-semibold text-center text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
            />
          </div>

          {/* Ticket (Manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
            <span className="font-medium text-sm text-slate-700">Ticket</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                R$
              </span>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={upsellData.ticket}
                onChange={(e) => onChangeField('ticket', e.target.value)}
                placeholder="0.00"
                className="pl-7 bg-white border-slate-200 text-slate-900 font-semibold tabular-nums text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
              />
            </div>
          </div>

          {/* Vendas Cartão / Pix (Manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
            <span className="font-medium text-sm text-slate-700">Vendas Cartão / Pix</span>
            <Input
              type="number"
              min={0}
              value={upsellData.card_pix_sales}
              onChange={(e) => onChangeField('card_pix_sales', e.target.value)}
              placeholder="0"
              className="bg-white border-slate-200 text-slate-900 font-semibold text-center text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
            />
          </div>

          {/* Vendas Boleto 3x (Manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
            <span className="font-medium text-sm text-slate-700">Vendas Boleto 3x</span>
            <Input
              type="number"
              min={0}
              value={upsellData.boleto_3x_sales}
              onChange={(e) => onChangeField('boleto_3x_sales', e.target.value)}
              placeholder="0"
              className="bg-white border-slate-200 text-slate-900 font-semibold text-center text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
            />
          </div>

          {/* % Vendas Boleto 3x (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
            <span className="font-medium text-xs text-slate-500">% Vendas Boleto 3x</span>
            <div className="text-right font-bold tabular-nums text-xs text-slate-700">
              {formatCalculatedPercent(upsellCalc.boletoRate)}
            </div>
          </div>

          {/* Reembolsos (Manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
            <span className="font-medium text-sm text-slate-700">Reembolsos</span>
            <Input
              type="number"
              min={0}
              value={upsellData.refunds}
              onChange={(e) => onChangeField('refunds', e.target.value)}
              placeholder="0"
              className="bg-white border-slate-200 text-slate-900 font-semibold text-center text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
            />
          </div>

          {/* % Reembolsos (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
            <span className="font-medium text-xs text-slate-500">% Reembolsos</span>
            <div className="text-right font-bold tabular-nums text-xs text-slate-700">
              {formatCalculatedPercent(upsellCalc.refundRate)}
            </div>
          </div>

          {/* Faturamento Plataforma (Calculated - Soft Pastel Highlight) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2.5 bg-emerald-50/90 px-3.5 rounded-xl border border-emerald-200/90">
            <span className="font-bold text-sm text-emerald-950">Faturamento Plataforma</span>
            <div className="text-center sm:text-right font-bold tabular-nums text-base text-emerald-900">
              {formatCurrency(upsellCalc.platformRevenue)}
            </div>
          </div>

          {/* Taxa inadimplência boleto (%) (Manual) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-1.5 border-b border-slate-100">
            <span className="font-medium text-sm text-slate-700">
              Taxa inadimplência boleto (%)
            </span>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={upsellData.inadimplencia_rate}
                onChange={(e) => onChangeField('inadimplencia_rate', e.target.value)}
                placeholder="0.00"
                className="pr-7 bg-white border-slate-200 text-slate-900 font-semibold text-center text-xs h-9 rounded-lg focus-visible:ring-[#6D49F2] shadow-2xs"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            Lançamento selecionado:{' '}
            <span className="font-bold text-[#6D49F2]">{launchBatch || 'Sem nome'}</span>
            {launchId ? ' (Salvo no BD)' : ' (Novo)'}
          </div>

          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full sm:w-auto px-8 h-11 bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Lançamento</span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
