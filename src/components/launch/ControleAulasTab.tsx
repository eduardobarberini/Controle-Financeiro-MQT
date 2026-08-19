import React, { useMemo } from 'react'
import { Plus, Trash2, Save, Loader2, CalendarDays, Users, DollarSign } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KpiCard } from '@/components/dashboard/KpiCard'
import type { ClassSession } from '@/types/paidLaunches'

interface ControleAulasTabProps {
  sessions: ClassSession[]
  onChange: (sessions: ClassSession[]) => void
  onSave: () => Promise<void>
  saving: boolean
  launchBatch: string
  launchId?: string
}

const EMPTY_SESSION: ClassSession = {
  date: '',
  topic: '',
  attendees: '',
  revenue: '',
  notes: '',
}

/**
 * Controle de Aulas — editable table of delivered classes for the selected launch.
 * Summary cards: média de faturamento por aula + total de alunas + faturamento total.
 */
export const ControleAulasTab: React.FC<ControleAulasTabProps> = ({
  sessions,
  onChange,
  onSave,
  saving,
  launchBatch,
  launchId,
}) => {
  const summary = useMemo(() => {
    const valid = sessions.filter((s) => s.date || s.topic)
    const totalRevenue = valid.reduce((sum, s) => sum + (Number(s.revenue) || 0), 0)
    const totalAttendees = valid.reduce((sum, s) => sum + (Number(s.attendees) || 0), 0)
    const avgRevenue = valid.length > 0 ? totalRevenue / valid.length : 0
    return { count: valid.length, totalRevenue, totalAttendees, avgRevenue }
  }, [sessions])

  const handleAdd = () => {
    onChange([...sessions, { ...EMPTY_SESSION }])
  }

  const handleRemove = (index: number) => {
    onChange(sessions.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: keyof ClassSession, value: string) => {
    const next = [...sessions]
    next[index] = { ...next[index], [field]: value }
    onChange(next)
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          title="Média Faturamento/Aula"
          value={summary.avgRevenue}
          formatType="currency"
          icon={DollarSign}
          subtext={`${summary.count} aula(s) registrada(s)`}
          iconBgColor="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20"
        />
        <KpiCard
          title="Total de Alunas"
          value={summary.totalAttendees}
          formatType="raw"
          icon={Users}
          subtext="Soma de presentes nas aulas"
          iconBgColor="bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20"
        />
        <KpiCard
          title="Faturamento Total"
          value={summary.totalRevenue}
          formatType="currency"
          icon={CalendarDays}
          subtext="Soma do faturamento das aulas"
          iconBgColor="bg-emerald-50 text-emerald-600 border-emerald-200"
        />
      </div>

      {/* Editable table */}
      <Card className="bg-white border border-slate-200/80 shadow-xs rounded-xl overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-3 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#FF2AFF]" />
            Controle de Aulas Dadas
          </span>
          <Button
            type="button"
            onClick={handleAdd}
            className="bg-[#6D49F2] hover:bg-[#6D49F2]/90 text-white h-8 text-xs rounded-lg px-3 font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> Nova Aula
          </Button>
        </div>

        <div className="p-4 sm:p-6 overflow-x-auto">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Nenhuma aula registrada.</p>
              <p className="text-xs text-slate-400 mt-1">
                Clique em &ldquo;Nova Aula&rdquo; para adicionar a primeira linha.
              </p>
            </div>
          ) : (
            <table className="w-full text-xs border-collapse min-w-[820px]">
              <thead>
                <tr className="bg-[#FAF8FF] border-b border-slate-200">
                  <th className="p-3 text-left font-bold text-slate-700">Data da Aula</th>
                  <th className="p-3 text-left font-bold text-slate-700">Nome / Tópico</th>
                  <th className="p-3 text-center font-bold text-slate-700">Alunas Presentes</th>
                  <th className="p-3 text-center font-bold text-slate-700">Faturamento (R$)</th>
                  <th className="p-3 text-left font-bold text-slate-700">Observações</th>
                  <th className="p-3 text-center font-bold text-slate-700 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-2">
                      <Input
                        type="date"
                        value={session.date}
                        onChange={(e) => handleChange(idx, 'date', e.target.value)}
                        className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={session.topic}
                        placeholder="Ex: Aula 1 - Boas-vindas"
                        onChange={(e) => handleChange(idx, 'topic', e.target.value)}
                        className="h-9 text-xs bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min={0}
                        value={session.attendees}
                        placeholder="0"
                        onChange={(e) => handleChange(idx, 'attendees', e.target.value)}
                        className="h-9 text-center text-xs font-semibold bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={session.revenue}
                        placeholder="0"
                        onChange={(e) => handleChange(idx, 'revenue', e.target.value)}
                        className="h-9 text-center text-xs font-semibold bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={session.notes}
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
                <span>Salvar Aulas</span>
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
