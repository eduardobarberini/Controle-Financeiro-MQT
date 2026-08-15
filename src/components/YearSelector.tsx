import React from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface YearSelectorProps {
  selectedYear: number
  onYearChange: (year: number) => void
}

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027, 2028]

export const YearSelector: React.FC<YearSelectorProps> = ({ selectedYear, onYearChange }) => {
  return (
    <div className="flex items-center bg-white border border-slate-200/90 rounded-xl p-1 shadow-sm">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        onClick={() => onYearChange(selectedYear - 1)}
        title="Ano anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 rounded-lg flex items-center gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5 text-emerald-600" />
            <span>Ano: {selectedYear}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[120px] rounded-xl">
          {AVAILABLE_YEARS.map((y) => (
            <DropdownMenuItem
              key={y}
              onClick={() => onYearChange(y)}
              className={`text-xs font-medium cursor-pointer ${
                y === selectedYear ? 'bg-emerald-50 text-emerald-700 font-semibold' : ''
              }`}
            >
              {y}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
        onClick={() => onYearChange(selectedYear + 1)}
        title="Próximo ano"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}
