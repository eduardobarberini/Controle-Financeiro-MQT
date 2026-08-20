import React from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Save, Loader2 } from 'lucide-react'
import { UniqueViewersChart } from '@/components/launch/UniqueViewersChart'
import type { ClassSession } from '@/types/paidLaunches'

interface ControleAulasTabProps {
  studentsInChallenge: number | string
  sessions: ClassSession[]
  onChangeStudents: (val: string) => void
  onChangeSession: (index: number, field: 'live_attendees' | 'unique_viewers', val: string) => void
  onSave: () => void
  saving: boolean
}

export const ControleAulasTab: React.FC<ControleAulasTabProps> = ({
  studentsInChallenge,
  sessions,
  onChangeStudents,
  onChangeSession,
  onSave,
  saving,
}) => {
  const studentsNum = Number(studentsInChallenge) || 0

  const formatPercentage = (value: number | string) => {
    if (!studentsNum || studentsNum <= 0) return '-'
    const num = Number(value) || 0
    const pct = (num / studentsNum) * 100
    return `${pct.toFixed(1)}%`
  }

  return (
    <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden p-6 space-y-6">
      {/* Top: Alunas no Desafio */}
      <div className="flex items-center gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
        <label className="text-sm font-semibold text-slate-800 whitespace-nowrap">
          Alunas no Desafio
        </label>
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={studentsInChallenge}
          onChange={(e) => onChangeStudents(e.target.value)}
          className="w-36 h-9 font-semibold text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg"
        />
      </div>

      {/* Chart: Espectadores Únicos por Aula */}
      <UniqueViewersChart sessions={sessions} studentsInChallenge={studentsInChallenge} />

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-xs border-collapse min-w-[600px]">
          <thead className="bg-slate-50/80">
            <tr className="border-b border-slate-200">
              {/* Comparecimento */}
              <th className="text-slate-800 p-3 text-left font-bold border-r border-slate-200 w-1/3">
                Comparecimento
              </th>
              {/* Pessoal Ao Vivo & % */}
              <th className="text-slate-800 p-3 text-center font-bold border-r border-slate-200 w-1/6">
                Pessoal Ao Vivo
              </th>
              <th className="text-slate-800 p-3 text-center font-bold border-r border-slate-200 w-1/6">
                %
              </th>
              {/* Espectadores Únicos & % */}
              <th className="text-slate-800 p-3 text-center font-bold border-r border-slate-200 w-1/6">
                Espectadores Únicos
              </th>
              <th className="text-slate-800 p-3 text-center font-bold w-1/6">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((session, idx) => {
              const livePct = formatPercentage(session.live_attendees)
              const uniquePct = formatPercentage(session.unique_viewers)
              const isEven = idx % 2 === 0

              return (
                <tr
                  key={idx}
                  className={`hover:bg-slate-50/60 transition-colors ${isEven ? 'bg-white' : 'bg-slate-50/40'}`}
                >
                  {/* Class Label */}
                  <td className="p-3 font-medium text-slate-800 border-r border-slate-200">
                    {session.label}
                  </td>

                  {/* Pessoal Ao Vivo Input */}
                  <td className="p-2 border-r border-slate-200 text-center">
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={session.live_attendees}
                      onChange={(e) => onChangeSession(idx, 'live_attendees', e.target.value)}
                      className="h-8 text-center font-semibold text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                    />
                  </td>

                  {/* Live % */}
                  <td className="p-3 border-r border-slate-200 text-center font-semibold text-slate-700 tabular-nums">
                    {livePct}
                  </td>

                  {/* Espectadores Únicos Input */}
                  <td className="p-2 border-r border-slate-200 text-center">
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={session.unique_viewers}
                      onChange={(e) => onChangeSession(idx, 'unique_viewers', e.target.value)}
                      className="h-8 text-center font-semibold text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2]"
                    />
                  </td>

                  {/* Unique % */}
                  <td className="p-3 text-center font-semibold text-slate-700 tabular-nums">
                    {uniquePct}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Save Action */}
      <div className="pt-2 flex justify-end">
        <Button
          onClick={onSave}
          disabled={saving}
          className="px-8 h-11 bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all"
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
  )
}
