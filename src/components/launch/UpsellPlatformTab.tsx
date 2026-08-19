import React, { useMemo } from 'react'
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  ArrowUpCircle,
  DollarSign,
  Calculator,
  Layers,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import type { UpsellPlatformItem } from '@/types/paidLaunches'

interface UpsellPlatformTabProps {
  upsellData: UpsellPlatformItem[]
  onChange: (items: UpsellPlatformItem[]) => void
  onSave: () => Promise<void>
  saving: boolean
  launchBatch: string
  launchId?: string
}

const EMPTY_UPSELL: UpsellPlatformItem = {
  client: '',
  product: '',
  value: '',
  date: '',
  notes: '',
}

/**
 * Upsell Plataforma — editable table of platform upsell sales for the selected launch.
 * Summary cards: Faturamento Upsell (Soma), Média por Upsell (Faturamento / Linhas), Total de Upsells (Contagem de linhas).
 */
export const UpsellPlatformTab: React.FC<UpsellPlatformTabProps> = ({
  upsellData,
  onChange,
  onSave,
  saving,
  launchBatch,
  launchId,
}) => {
  const summary = useMemo(() => {
    // Total count of rows in the table
    const count = upsellData.length
    // Total revenue sum of values
    const totalRevenue = upsellData.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
    // Average per upsell: total revenue divided by number of rows
    const avgUpsell = count > 0 ? totalRevenue / count : 0

    return { totalRevenue, avgUpsell, count }
  }, [upsellData])

  const handleAdd = () => {
    onChange([...upsellData, { ...EMPTY_UPSELL }])
  }

  const handleRemove = (index: number) => {
    onChange(upsellData.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: keyof UpsellPlatformItem, value: string) => {
    const next = [...upsellData]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Faturamento Upsell"
          value={summary.totalRevenue}
          formatType="currency"
          icon={DollarSign}
          subtext="Soma dos valores de todos os upsells"
          iconBgColor="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20"
        />
        <KpiCard
          title="Média por Upsell"
          value={summary.avgUpsell}
          formatType="currency"
          icon={Calculator}
          subtext="Faturamento total / número de linhas"
          iconBgColor="bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20"
        />
        <KpiCard
          title="Total de Upsells"
          value={summary.count}
          formatType="raw"
          icon={Layers}
          subtext="Contagem total de registros"
          iconBgColor="bg-emerald-50 text-emerald-600 border-emerald-200"
        />
      </div>

      {/* Editable table */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4 text-[#FF2AFF]" />
            Upsell Plataforma
          </span>
          <Button
            type="button"
            onClick={handleAdd}
            className="bg-[#6D49F2] hover:bg-[#6D49F2]/90 text-white h-8 text-xs rounded-lg px-3 font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> Novo Upsell
          </Button>
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto">
          {upsellData.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <ArrowUpCircle className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Nenhum upsell registrado.</p>
              <p className="text-xs text-slate-400 mt-1">
                Clique em &ldquo;Novo Upsell&rdquo; para adicionar a primeira linha.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-[#FAF8FF] border-b border-slate-200">
                  <th className="p-3 text-left font-bold text-slate-700">Cliente</th>
                  <th className="p-3 text-left font-bold text-slate-700">Produto</th>
                  <th className="p-3 text-center font-bold text-slate-700">Valor (R$)</th>
                  <th className="p-3 text-center font-bold text-slate-700">Data</th>
                  <th className="p-3 text-left font-bold text-slate-700">Observações</th>
                  <th className="p-3 text-center font-bold text-slate-700 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {upsellData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2">
                      <Input
                        type="text"
                        value={item.client}
                        placeholder="Nome do cliente"
                        onChange={(e) => handleChange(idx, 'client', e.target.value)}
                        className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={item.product}
                        placeholder="Nome do produto"
                        onChange={(e) => handleChange(idx, 'product', e.target.value)}
                        className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.value}
                        placeholder="0,00"
                        onChange={(e) => handleChange(idx, 'value', e.target.value)}
                        className="h-9 text-center text-xs font-semibold bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="date"
                        value={item.date}
                        onChange={(e) => handleChange(idx, 'date', e.target.value)}
                        className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={item.notes}
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
            {launchId ? ' (Salvo no BD)' : ' (Novo — salve o lançamento na aba Venda de Ingressos)'}
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
                <span>Salvar Upsells</span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
