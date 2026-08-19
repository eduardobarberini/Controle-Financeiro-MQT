import React, { useMemo } from 'react'
import { ArrowUpCircle, Save, Loader2, DollarSign, Percent, CalendarDays, Lock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { PlatformDailyChart } from '@/components/launch/PlatformDailyChart'
import type { UpsellPlatform, UpsellDailyEntry } from '@/types/paidLaunches'
import { formatCurrency, formatCalculatedPercent } from '@/lib/launch-format'

interface UpsellPlatformTabProps {
  upsellData: UpsellPlatform
  onChangeField: (field: keyof UpsellPlatform, value: string | number | UpsellDailyEntry[]) => void
  onChangeDailyField: (index: number, field: keyof UpsellDailyEntry, value: string | number) => void
  dailySalesList: UpsellDailyEntry[]
  upsellCalc: {
    conversionRate: number
    boletoRate: number
    refundRate: number
    platformRevenue: number
    calculatedCardPixSales: number
    calculatedCardPixRevenue: number
    calculatedBoletoSales: number
    calculatedBoletoRevenue: number
    calculatedTotalSales: number
    dailyCalculatedTotals: {
      cardPixSales: number
      cardPixRevenue: number
      boletoSales: number
      boletoRevenue: number
      totalSales: number
      totalRevenue: number
      conversionRate: number
      dayIngressos: number
    }[]
  }
  onSave: () => Promise<void>
  saving: boolean
  launchBatch: string
  launchId?: string
  totalTicketSales?: number
}

export const UpsellPlatformTab: React.FC<UpsellPlatformTabProps> = ({
  upsellData,
  onChangeField,
  onChangeDailyField,
  dailySalesList,
  upsellCalc,
  onSave,
  saving,
  launchBatch,
  launchId,
}) => {
  // Build chart data from the same dailyPlatformData that feeds the daily control table.
  // Total sales per day = Cartão/PIX + Boleto; conversion = the same "% Conversão Desafio / Plataforma" calc.
  const chartData = useMemo(() => {
    return (dailySalesList ?? []).map((day, idx) => {
      const calcDay = upsellCalc.dailyCalculatedTotals?.[idx]
      return {
        dayLabel: day.isPrimeiraHora ? '1ª Hora' : day.dayLabel,
        totalSales: calcDay?.totalSales ?? 0,
        conversionRate: calcDay?.conversionRate ?? 0,
      }
    })
  }, [dailySalesList, upsellCalc.dailyCalculatedTotals])

  return (
    <div className="space-y-6">
      {/* Upper Header / KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard
          title="Vendas Totais"
          value={upsellCalc.calculatedTotalSales}
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

      {/* CHART: Vendas Diárias × Conversão (Recharts) */}
      <PlatformDailyChart days={chartData} />

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

          {/* Vendas Totais (Calculated from daily sales) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
            <span className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              Vendas Totais (calculado)
            </span>
            <div className="text-right font-bold tabular-nums text-xs text-slate-900">
              {upsellCalc.calculatedTotalSales}
            </div>
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

          {/* Vendas Cartão / Pix (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
            <span className="font-medium text-xs text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              Vendas Cartão / Pix (soma dos dias)
            </span>
            <div className="text-right font-bold tabular-nums text-xs text-slate-900">
              {upsellCalc.calculatedCardPixSales}
            </div>
          </div>

          {/* Vendas Boleto 3x (Calculated) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-2 py-2 bg-slate-50/80 px-3 rounded-lg border border-slate-200/70">
            <span className="font-medium text-xs text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              Vendas Boleto 3x (soma dos dias)
            </span>
            <div className="text-right font-bold tabular-nums text-xs text-slate-900">
              {upsellCalc.calculatedBoletoSales}
            </div>
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
      </Card>

      {/* CONTROLE DIÁRIO VENDAS - Table below upper consolidated form */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#FF2AFF]" />
            Controle Diário Vendas
          </span>
          <span className="text-[11px] text-slate-300 font-normal normal-case">
            Acompanhamento diário das vendas e faturamento da plataforma
          </span>
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[800px] border border-slate-900">
            <thead>
              <tr className="border-b border-slate-900">
                <th className="p-3 text-center font-bold text-white bg-black min-w-[220px] text-sm border-r border-slate-900">
                  Controle Diário Vendas
                </th>
                {dailySalesList.map((day, idx) => {
                  const isPrimeiraHora =
                    day.isPrimeiraHora ||
                    (idx === 0 && day.dayLabel?.toLowerCase().includes('primeira'))
                  if (isPrimeiraHora) {
                    return (
                      <th
                        key={idx}
                        className="p-3 text-center font-bold text-white bg-[#2E7D32] border-r border-slate-900 min-w-[120px] text-sm"
                      >
                        Primeira Hora
                      </th>
                    )
                  }
                  return (
                    <th
                      key={idx}
                      className="p-2 text-center font-bold text-slate-900 bg-[#FCE4D6] border-r border-slate-900 min-w-[110px]"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="text"
                          value={day.dayLabel || ''}
                          onChange={(e) => onChangeDailyField(idx, 'dayLabel', e.target.value)}
                          className="w-12 text-center font-bold text-slate-900 bg-transparent border-b border-dashed border-slate-400 focus:outline-none focus:border-[#6D49F2]"
                          placeholder="Dia"
                        />
                      </div>
                      <div className="text-[11px] text-slate-800 font-medium mt-0.5">
                        <input
                          type="text"
                          value={day.dateLabel || ''}
                          onChange={(e) => onChangeDailyField(idx, 'dateLabel', e.target.value)}
                          className="w-12 text-center text-slate-800 bg-transparent border-b border-dashed border-slate-400 focus:outline-none focus:border-[#6D49F2]"
                          placeholder="Data"
                        />
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300">
              {/* Vendas Cartão / PIX */}
              <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                <td className="p-2.5 font-medium text-slate-900 border-r border-slate-900">
                  Vendas Cartão / PIX
                </td>
                {dailySalesList.map((day, idx) => (
                  <td key={idx} className="p-1.5 border-r border-slate-900 text-center">
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={day.card_pix_sales}
                      onChange={(e) => onChangeDailyField(idx, 'card_pix_sales', e.target.value)}
                      className="h-8 text-center font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                    />
                  </td>
                ))}
              </tr>

              {/* Faturamento Cartão / PIX */}
              <tr className="bg-slate-50/40 hover:bg-slate-50 transition-colors">
                <td className="p-2.5 font-medium text-slate-900 border-r border-slate-900">
                  Faturamento Cartão / PIX
                </td>
                {dailySalesList.map((day, idx) => (
                  <td key={idx} className="p-1.5 border-r border-slate-900 text-center">
                    <div className="relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="0"
                        value={day.card_pix_revenue}
                        onChange={(e) =>
                          onChangeDailyField(idx, 'card_pix_revenue', e.target.value)
                        }
                        className="pl-6 h-8 text-center font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                      />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Vendas Boleto Parcelado */}
              <tr className="bg-white hover:bg-slate-50/50 transition-colors">
                <td className="p-2.5 font-medium text-slate-900 border-r border-slate-900">
                  Vendas Boleto Parcelado
                </td>
                {dailySalesList.map((day, idx) => (
                  <td key={idx} className="p-1.5 border-r border-slate-900 text-center">
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={day.boleto_sales}
                      onChange={(e) => onChangeDailyField(idx, 'boleto_sales', e.target.value)}
                      className="h-8 text-center font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                    />
                  </td>
                ))}
              </tr>

              {/* Faturamento Boleto Parcelado */}
              <tr className="bg-slate-50/40 hover:bg-slate-50 transition-colors">
                <td className="p-2.5 font-medium text-slate-900 border-r border-slate-900">
                  Faturamento Boleto Parcelado
                </td>
                {dailySalesList.map((day, idx) => (
                  <td key={idx} className="p-1.5 border-r border-slate-900 text-center">
                    <div className="relative">
                      <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        R$
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        placeholder="0"
                        value={day.boleto_revenue}
                        onChange={(e) => onChangeDailyField(idx, 'boleto_revenue', e.target.value)}
                        className="pl-6 h-8 text-center font-semibold text-slate-900 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                      />
                    </div>
                  </td>
                ))}
              </tr>

              {/* Vendas Totais (Calculated row - Light Green #C6E0B4) */}
              <tr className="bg-[#C6E0B4] border-t-2 border-slate-900 text-slate-950 font-bold">
                <td className="p-2.5 font-bold text-slate-950 border-r border-slate-900 text-xs">
                  Vendas Totais
                </td>
                {upsellCalc.dailyCalculatedTotals.map((calcDay, idx) => (
                  <td
                    key={idx}
                    className="p-2 border-r border-slate-900 text-center tabular-nums text-slate-950 font-bold text-xs"
                  >
                    {calcDay.totalSales}
                  </td>
                ))}
              </tr>

              {/* % Conversão Desafio / Plataforma (Calculated row - Light Green #C6E0B4) */}
              <tr className="bg-[#C6E0B4] text-slate-950 font-bold">
                <td className="p-2.5 font-bold text-slate-950 border-r border-slate-900 text-xs">
                  % Conversão Desafio / Plataforma
                </td>
                {upsellCalc.dailyCalculatedTotals.map((calcDay, idx) => (
                  <td
                    key={idx}
                    className="p-2 border-r border-slate-900 text-center tabular-nums text-slate-950 font-bold text-xs"
                  >
                    {formatCalculatedPercent(calcDay.conversionRate)}
                  </td>
                ))}
              </tr>

              {/* Faturamento Total (Calculated row - Orange #ED7D31) */}
              <tr className="bg-[#ED7D31] font-bold text-white border-t border-slate-900">
                <td className="p-2.5 text-slate-950 font-bold text-xs border-r border-slate-900">
                  Faturamento Total
                </td>
                {upsellCalc.dailyCalculatedTotals.map((calcDay, idx) => (
                  <td
                    key={idx}
                    className="p-2 border-r border-slate-900 text-center tabular-nums text-slate-950 font-extrabold text-xs"
                  >
                    {formatCurrency(calcDay.totalRevenue)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>{' '}
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
