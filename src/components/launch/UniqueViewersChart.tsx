import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import { formatNumber, parsePtBrNumber } from '@/lib/financial-utils'
import type { ClassSession } from '@/types/paidLaunches'

interface UniqueViewersChartProps {
  sessions: ClassSession[]
  studentsInChallenge: number | string
}

// Primary MQT Palette purple for absolute unique viewers line
const PURPLE = '#6D49F2'
// Accent pink for percentage line (right axis)
const PINK = '#FF2AFF'

export const UniqueViewersChart: React.FC<UniqueViewersChartProps> = ({
  sessions,
  studentsInChallenge,
}) => {
  const studentsNum = Number(studentsInChallenge) || 0

  const chartData = useMemo(() => {
    return (sessions ?? []).map((s) => {
      // unique_viewers may be stored as a pt-BR formatted string (e.g. "449.496"
      // where the dot is a thousands separator). Number() would misread that as
      // 449.496, so parse with the pt-BR-aware parser.
      const unique = parsePtBrNumber(s.unique_viewers)
      const pct = studentsNum > 0 ? (unique / studentsNum) * 100 : 0
      return {
        aula: s.label || '',
        // Absolute count of unique viewers (left axis)
        unicos: unique,
        // Percentage of unique viewers vs. students in challenge (right axis, 0..100)
        percentual: Math.round(pct * 10) / 10,
      }
    })
  }, [sessions, studentsNum])

  const hasAnyData = chartData.some((d) => d.unicos > 0)

  return (
    <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
      <CardHeader className="bg-slate-50/80 border-b border-slate-200 p-5 pb-3">
        <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#6D49F2]" />
          Espectadores Únicos por Aula
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 mt-0.5">
          Barras: espectadores únicos (valor absoluto) • Linha tracejada: % espectadores únicos /
          alunas no desafio
          {!hasAnyData ? ' • Nenhum dado preenchido ainda' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="uniqueViewersBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PURPLE} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={PURPLE} stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="aula"
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                // The class labels are long; allow them to angle and fit.
                angle={-12}
                textAnchor="end"
                height={50}
                interval={0}
              />
              {/* Left axis: integer unique viewer counts */}
              <YAxis
                yAxisId="left"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={36}
              />
              {/* Right axis: percentage 0..100% */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={42}
                tickFormatter={(val: number) => `${val}%`}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'percentual') {
                    return [`${formatNumber(Number(value), 1)}%`, '% Espectadores Únicos']
                  }
                  return [formatNumber(Number(value), 0), 'Espectadores Únicos']
                }}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#f8fafc',
                  fontSize: '12px',
                  border: 'none',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                }}
                itemStyle={{ color: '#e2e8f0' }}
                labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
                cursor={{ fill: PURPLE, fillOpacity: 0.05 }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                height={30}
                iconSize={10}
                wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                formatter={(value) =>
                  value === 'unicos' ? 'Espectadores Únicos' : '% Espectadores Únicos'
                }
              />
              {/* Bar: absolute unique viewers (left axis) — purple with rounded top */}
              <Bar
                yAxisId="left"
                dataKey="unicos"
                name="unicos"
                fill="url(#uniqueViewersBarGradient)"
                fillOpacity={0.9}
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
                animationDuration={600}
              />
              {/* Line: percentage of unique viewers vs. students (right axis) — dashed pink */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="percentual"
                name="percentual"
                stroke={PINK}
                strokeWidth={3}
                strokeDasharray="5 4"
                dot={{ r: 4, fill: PINK, stroke: '#FFFFFF', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: PINK, stroke: '#FFFFFF', strokeWidth: 2 }}
                animationDuration={600}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
