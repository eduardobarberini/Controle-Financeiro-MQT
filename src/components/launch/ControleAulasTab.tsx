import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Save, Loader2, Video } from 'lucide-react'
import { UniqueViewersChart } from '@/components/launch/UniqueViewersChart'
import type { ClassSession } from '@/types/paidLaunches'
import { formatNumber, parsePtBrNumber } from '@/lib/financial-utils'

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
    const num = typeof value === 'string' ? parsePtBrNumber(value) : Number(value) || 0
    const pct = (num / studentsNum) * 100
    return `${formatNumber(pct, 1)}%`
  }

  return (
    <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Video className="w-4 h-4 text-[#6D49F2]" />
            Controle de Aulas e Audiência
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 mt-0.5">
            Acompanhe a retenção, espectadores ao vivo e únicos ao longo dos encontros
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="p-5 sm:p-6 space-y-6">
        {/* Top: Alunas no Desafio */}
        <div className="flex items-center gap-4 bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200/80">
          <label className="text-xs font-semibold text-slate-800 whitespace-nowrap">
            Alunas no Desafio
          </label>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={
              studentsInChallenge === '' ||
              studentsInChallenge === undefined ||
              studentsInChallenge === null
                ? ''
                : String(studentsInChallenge)
            }
            onChange={(e) => onChangeStudents(e.target.value.replace(/[^0-9.,]/g, ''))}
            onBlur={() => {
              if (
                studentsInChallenge !== '' &&
                studentsInChallenge !== undefined &&
                studentsInChallenge !== null
              ) {
                const parsed = parsePtBrNumber(studentsInChallenge)
                if (parsed > 0) {
                  onChangeStudents(formatNumber(parsed, 0))
                }
              }
            }}
            className="w-36 h-8 text-xs font-semibold tabular-nums text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-lg shadow-2xs"
          />
        </div>

        {/* Chart: Espectadores Únicos por Aula */}
        <UniqueViewersChart sessions={sessions} studentsInChallenge={studentsInChallenge} />

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <Table className="min-w-[600px]">
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-b border-slate-200 hover:bg-transparent">
                {/* Comparecimento */}
                <TableHead className="text-slate-800 py-2.5 px-3 text-left font-bold text-xs border-r border-slate-200 w-1/3">
                  Comparecimento
                </TableHead>
                {/* Pessoal Ao Vivo & % */}
                <TableHead className="text-slate-800 py-2.5 px-3 text-center font-bold text-xs border-r border-slate-200 w-1/6">
                  Pessoal Ao Vivo
                </TableHead>
                <TableHead className="text-slate-800 py-2.5 px-3 text-center font-bold text-xs border-r border-slate-200 w-1/6">
                  %
                </TableHead>
                {/* Espectadores Únicos & % */}
                <TableHead className="text-slate-800 py-2.5 px-3 text-center font-bold text-xs border-r border-slate-200 w-1/6">
                  Espectadores Únicos
                </TableHead>
                <TableHead className="text-slate-800 py-2.5 px-3 text-center font-bold text-xs w-1/6">
                  %
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session, idx) => {
                const livePct = formatPercentage(session.live_attendees)
                const uniquePct = formatPercentage(session.unique_viewers)
                const isEven = idx % 2 === 0

                return (
                  <TableRow
                    key={idx}
                    className={`hover:bg-slate-50/50 transition-colors border-b border-slate-100 ${isEven ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    {/* Class Label */}
                    <TableCell className="py-2.5 px-3 font-medium text-xs text-slate-800 border-r border-slate-200">
                      {session.label}
                    </TableCell>

                    {/* Pessoal Ao Vivo Input */}
                    <TableCell className="py-2 px-2.5 border-r border-slate-200 text-center">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={
                          session.live_attendees === '' ||
                          session.live_attendees === undefined ||
                          session.live_attendees === null
                            ? ''
                            : String(session.live_attendees)
                        }
                        onChange={(e) =>
                          onChangeSession(
                            idx,
                            'live_attendees',
                            e.target.value.replace(/[^0-9.,]/g, ''),
                          )
                        }
                        onBlur={() => {
                          if (
                            session.live_attendees !== '' &&
                            session.live_attendees !== undefined &&
                            session.live_attendees !== null
                          ) {
                            const parsed = parsePtBrNumber(session.live_attendees)
                            if (parsed > 0) {
                              onChangeSession(idx, 'live_attendees', formatNumber(parsed, 0))
                            }
                          }
                        }}
                        className="h-8 text-center font-semibold tabular-nums text-xs text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                      />
                    </TableCell>

                    {/* Live % */}
                    <TableCell className="py-2.5 px-3 border-r border-slate-200 text-center font-semibold text-xs text-slate-700 tabular-nums">
                      {livePct}
                    </TableCell>

                    {/* Espectadores Únicos Input */}
                    <TableCell className="py-2 px-2.5 border-r border-slate-200 text-center">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={
                          session.unique_viewers === '' ||
                          session.unique_viewers === undefined ||
                          session.unique_viewers === null
                            ? ''
                            : String(session.unique_viewers)
                        }
                        onChange={(e) =>
                          onChangeSession(
                            idx,
                            'unique_viewers',
                            e.target.value.replace(/[^0-9.,]/g, ''),
                          )
                        }
                        onBlur={() => {
                          if (
                            session.unique_viewers !== '' &&
                            session.unique_viewers !== undefined &&
                            session.unique_viewers !== null
                          ) {
                            const parsed = parsePtBrNumber(session.unique_viewers)
                            if (parsed > 0) {
                              onChangeSession(idx, 'unique_viewers', formatNumber(parsed, 0))
                            }
                          }
                        }}
                        className="h-8 text-center font-semibold tabular-nums text-xs text-slate-900 bg-white border-slate-200 focus-visible:ring-[#6D49F2] shadow-2xs"
                      />
                    </TableCell>

                    {/* Unique % */}
                    <TableCell className="py-2.5 px-3 text-center font-semibold text-xs text-slate-700 tabular-nums">
                      {uniquePct}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
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
      </CardContent>
    </Card>
  )
}
