import React, { useEffect, useState } from 'react'
import { formatCurrency, formatPercent, formatRoas, getProgressColor } from '@/lib/financial-utils'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface KpiCardProps {
  title: string
  value: number | null
  formatType: 'currency' | 'percent' | 'roas' | 'raw'
  rawString?: string
  icon: LucideIcon
  subtext?: string
  targetPercent?: number | null
  showProgressBar?: boolean
  tooltipText?: string
  iconBgColor?: string
  iconColor?: string
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  formatType,
  rawString,
  icon: Icon,
  subtext,
  targetPercent,
  showProgressBar = false,
  iconBgColor = 'bg-emerald-50 text-emerald-600 border-emerald-100',
}) => {
  // Animated count-up simulation
  const [displayValue, setDisplayValue] = useState<number>(0)

  useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) {
      setDisplayValue(0)
      return
    }

    const duration = 600
    const steps = 30
    const stepTime = duration / steps
    const increment = value / steps
    let current = 0
    let stepCount = 0

    const timer = setInterval(() => {
      stepCount++
      current += increment
      if (stepCount >= steps) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(current)
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [value])

  const renderFormattedValue = () => {
    if (rawString !== undefined) return rawString
    if (value === null || value === undefined) return '—'

    switch (formatType) {
      case 'currency':
        return formatCurrency(displayValue)
      case 'percent':
        return formatPercent(displayValue, 1)
      case 'roas':
        return formatRoas(displayValue)
      default:
        return displayValue.toString()
    }
  }

  const progress = getProgressColor(targetPercent)
  const clampedProgressWidth = Math.min(Math.max(targetPercent || 0, 0), 100)

  return (
    <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        {/* Top row: Label & Icon */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </span>
          <div className={`p-2 rounded-xl border ${iconBgColor} shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>

        {/* Main Value */}
        <div className="my-1">
          <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {renderFormattedValue()}
          </div>
        </div>

        {/* Target Progress Bar / Subtext */}
        <div className="mt-2 pt-2 border-t border-slate-100 min-h-[32px] flex flex-col justify-center">
          {showProgressBar && targetPercent !== undefined && targetPercent !== null ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Meta atingida</span>
                <span className={`font-bold tabular-nums ${progress.badgeText}`}>
                  {formatPercent(targetPercent, 1)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${progress.barColor}`}
                  style={{ width: `${clampedProgressWidth}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 truncate">{subtext || '—'}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
