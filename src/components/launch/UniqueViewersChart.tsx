import React, { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
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
      const unique = Number(s.unique_viewers) || 0
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
          Linha principal: espectadores únicos (valor absoluto) • Linha tracejada: % espectadores
          únicos / alunas no desafio
          {!hasAnyData ? ' • Nenhum dado preenchido ainda' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 8, left: 0, bottom: 0 }}>
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
                    return [`${Number(value).toFixed(1)}%`, '% Espectadores Únicos']
                  }
                  return [`${value}`, 'Espectadores Únicos']
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
              {/* Line 1: absolute unique viewers (left axis) */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="unicos"
                name="unicos"
                stroke={PURPLE}
                strokeWidth={3}
                dot={{ r: 4, fill: PURPLE, stroke: '#FFFFFF', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: PURPLE, stroke: '#FFFFFF', strokeWidth: 2 }}
                animationDuration={600}
              />
              {/* Line 2: percentage of unique viewers vs. students (right axis) */}
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
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
