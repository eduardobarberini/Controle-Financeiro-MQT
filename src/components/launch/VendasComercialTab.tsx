import React, { useMemo } from 'react'
import { Plus, Trash2, Save, Loader2, Briefcase, TrendingUp, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import type { CommercialSale } from '@/types/paidLaunches'

type SaleStatus = 'Prospecto' | 'Negociação' | 'Fechado' | 'Perdido'

interface VendasComercialTabProps {
  sales: CommercialSale[]
  onChange: (sales: CommercialSale[]) => void
  onSave: () => Promise<void>
  saving: boolean
  launchBatch: string
  launchId?: string
}

const STATUS_OPTIONS: SaleStatus[] = ['Prospecto', 'Negociação', 'Fechado', 'Perdido']

const STATUS_STYLES: Record<SaleStatus, string> = {
  Prospecto: 'text-slate-600 bg-slate-100',
  Negociação: 'text-amber-700 bg-amber-100',
  Fechado: 'text-emerald-700 bg-emerald-100',
  Perdido: 'text-rose-700 bg-rose-100',
}

const EMPTY_SALE: CommercialSale = {
  client: '',
  product: '',
  value: '',
  status: 'Prospecto',
  close_date: '',
  notes: '',
}

/**
 * Vendas Comercial — editable pipeline table of enterprise/commercial deals
 * for the selected launch. Summary cards: pipeline total, closed total, conversion rate.
 */
export const VendasComercialTab: React.FC<VendasComercialTabProps> = ({
  sales,
  onChange,
  onSave,
  saving,
  launchBatch,
  launchId,
}) => {
  const summary = useMemo(() => {
    const valid = sales.filter((s) => s.client || s.product)
    const pipeline = valid.reduce((sum, s) => sum + (Number(s.value) || 0), 0)
    const closedItems = valid.filter((s) => s.status === 'Fechado')
    const closed = closedItems.reduce((sum, s) => sum + (Number(s.value) || 0), 0)
    const conversionRate = valid.length > 0 ? closedItems.length / valid.length : 0
    return { pipeline, closed, conversionRate, count: valid.length }
  }, [sales])

  const handleAdd = () => {
    onChange([...sales, { ...EMPTY_SALE }])
  }

  const handleRemove = (index: number) => {
    onChange(sales.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: keyof CommercialSale, value: string) => {
    const next = [...sales]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Total em Pipeline"
          value={summary.pipeline}
          formatType="currency"
          icon={Briefcase}
          subtext={`${summary.count} negócio(s)`}
          iconBgColor="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20"
        />
        <KpiCard
          title="Total Fechado"
          value={summary.closed}
          formatType="currency"
          icon={CheckCircle2}
          subtext="Status: Fechado"
          iconBgColor="bg-emerald-50 text-emerald-600 border-emerald-200"
        />
        <KpiCard
          title="Taxa de Conversão"
          value={summary.conversionRate}
          formatType="percent"
          decimals={2}
          icon={TrendingUp}
          subtext="Fechados / Total"
          iconBgColor="bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20"
        />
      </div>

      {/* Editable table */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#FF2AFF]" />
            Vendas Comercial / Enterprise
          </span>
          <Button
            type="button"
            onClick={handleAdd}
            className="bg-[#6D49F2] hover:bg-[#6D49F2]/90 text-white h-8 text-xs rounded-lg px-3 font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Venda
          </Button>
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto">
          {sales.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Briefcase className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">
                Nenhuma venda comercial registrada.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Clique em &ldquo;Nova Venda&rdquo; para adicionar a primeira linha.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse min-w-[960px]">
              <thead>
                <tr className="bg-[#FAF8FF] border-b border-slate-200">
                  <th className="p-3 text-left font-bold text-slate-700">Cliente / Empresa</th>
                  <th className="p-3 text-left font-bold text-slate-700">Produto / Serviço</th>
                  <th className="p-3 text-center font-bold text-slate-700">Valor (R$)</th>
                  <th className="p-3 text-center font-bold text-slate-700">Status</th>
                  <th className="p-3 text-left font-bold text-slate-700">Data Fechamento</th>
                  <th className="p-3 text-left font-bold text-slate-700">Observações</th>
                  <th className="p-3 text-center font-bold text-slate-700 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2">
                      <Input
                        type="text"
                        value={sale.client}
                        placeholder="Ex: Empresa XYZ"
                        onChange={(e) => handleChange(idx, 'client', e.target.value)}
                        className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={sale.product}
                        placeholder="Ex: Mentoria empresarial"
                        onChange={(e) => handleChange(idx, 'product', e.target.value)}
                        className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={sale.value}
                        placeholder="0"
                        onChange={(e) => handleChange(idx, 'value', e.target.value)}
                        className="h-9 text-center text-xs font-semibold bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={sale.status}
                        onChange={(e) => handleChange(idx, 'status', e.target.value)}
                        className={`h-9 w-full rounded-lg border border-slate-200 px-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#6D49F2] ${STATUS_STYLES[sale.status]}`}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="date"
                        value={sale.close_date}
                        onChange={(e) => handleChange(idx, 'close_date', e.target.value)}
                        className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={sale.notes}
                        placeholder="Observações..."
                        onChange={(e) => handleChange(idx, 'notes', e.target.value)}
                        className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemove(idx)}
                        className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Save bar */}
        <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            Lançamento:{' '}
            <span className="font-bold text-[#6D49F2]">{launchBatch || 'Sem nome'}</span>
            {launchId ? ' (Salvo no BD)' : ' (Novo — salve o lançamento na aba Resultado Semanal)'}
          </div>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="w-full sm:w-auto px-8 h-11 bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Vendas</span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
