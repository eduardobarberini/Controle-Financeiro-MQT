import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import {
  Receipt,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Loader2,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  Tag,
  CalendarClock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { fixedExpensesService } from '@/services/fixedExpensesService'
import {
  formatCurrency,
  formatNumber,
  parsePtBrNumber,
  MONTH_NAMES_PT,
} from '@/lib/financial-utils'
import { getEffectiveExpensesForMonth, projectedId } from '@/lib/fixedExpensesRecurrence'
import type {
  FixedExpenseCategoryRecord,
  FixedExpenseCategoryInput,
  FixedExpenseRecord,
  FixedExpenseInput,
  FixedExpenseStatus,
  FixedExpenseRecurrence,
  EffectiveExpense,
  ProjectedExpense,
} from '@/types/fixedExpenses'
import { RECURRENCE_OPTIONS, isProjectedExpense } from '@/types/fixedExpenses'

// ─────────────────────────────────────────────────────────── helpers ──────

/** Capitalize month name for display (e.g. "janeiro" -> "Janeiro"). */
const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

/** Format a due day/month label as "dd/mm". */
const formatDueLabel = (day: number, month: number): string =>
  `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`

/** Format the competence (month/year) as "mm/aaaa". */
const formatCompetence = (month: number, year: number): string =>
  `${String(month).padStart(2, '0')}/${year}`

/** Human pt-BR label for a recurrence value. */
const recurrenceLabel = (rec: string | undefined): string =>
  RECURRENCE_OPTIONS.find((o) => o.value === rec)?.label ?? 'Pontual'

/** Resolve the category object from an expense (expanded or fallback). */
const resolveCategory = (
  exp: { category_id: string; category?: FixedExpenseCategoryRecord | null },
  categories: FixedExpenseCategoryRecord[],
): FixedExpenseCategoryRecord | undefined => {
  const cat = exp.category
  if (cat) return cat
  return categories.find((c) => c.id === exp.category_id)
}

/** Color picker palette for the category color field. */
const COLOR_PRESETS = [
  '#6D49F2',
  '#FF2AFF',
  '#0EA5E9',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#3B82F6',
  '#84CC16',
]

// ────────────────────────────────────────────────────── Category Modal ──────

interface CategoryModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: FixedExpenseCategoryRecord | null
  existingNames: string[]
  onSaved: () => void
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  open,
  onOpenChange,
  editing,
  existingNames,
  onSaved,
}) => {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6D49F2')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '')
      setColor(editing?.color ?? '#6D49F2')
      setDescription(editing?.description ?? '')
      setErrors({})
    }
  }, [open, editing])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    const trimmed = name.trim()
    if (!trimmed) {
      errs.name = 'O nome é obrigatório.'
    } else {
      const dup = existingNames.find(
        (n) =>
          n.toLowerCase() === trimmed.toLowerCase() &&
          n.toLowerCase() !== (editing?.name ?? '').toLowerCase(),
      )
      if (dup) errs.name = 'Já existe uma categoria com este nome.'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: FixedExpenseCategoryInput = {
        name: name.trim(),
        color,
        description: description.trim(),
      }
      await fixedExpensesService.saveCategory(editing?.id, payload)
      toast({
        title: editing ? 'Categoria atualizada' : 'Categoria criada',
        description: `"${payload.name}" foi salva com sucesso.`,
      })
      onOpenChange(false)
      onSaved()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar categoria',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-white border-slate-200 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-[#6D49F2]" />
            {editing ? 'Editar Categoria' : 'Nova Categoria'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Defina o nome, a cor (usada no gráfico de pizza) e uma descrição opcional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="cat-name"
              className="text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Nome *
            </Label>
            <Input
              id="cat-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setErrors((p) => ({ ...p, name: '' }))
              }}
              placeholder="ex: Aluguel"
              className="h-9 text-sm bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
            />
            {errors.name && <p className="text-[11px] text-rose-500">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Cor *
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-9 rounded-lg border border-slate-200 cursor-pointer bg-white p-0.5"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-28 text-sm font-mono tabular-nums bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
              />
              <div className="flex items-center gap-1.5 flex-wrap">
                {COLOR_PRESETS.slice(0, 6).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      color.toLowerCase() === c.toLowerCase()
                        ? 'border-slate-900 scale-110'
                        : 'border-white'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="cat-desc"
              className="text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Descrição
            </Label>
            <Textarea
              id="cat-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional..."
              className="min-h-[70px] text-sm bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl h-9 text-xs bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-bold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─────────────────────────────────────────────────────── Expense Modal ──────

interface ExpenseModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing?: FixedExpenseRecord | null
  categories: FixedExpenseCategoryRecord[]
  defaultYear: number
  defaultMonth: number
  onSaved: () => void
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({
  open,
  onOpenChange,
  editing,
  categories,
  defaultYear,
  defaultMonth,
  onSaved,
}) => {
  const { toast } = useToast()
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [month, setMonth] = useState(String(defaultMonth))
  const [year, setYear] = useState(String(defaultYear))
  const [recurrence, setRecurrence] = useState<FixedExpenseRecurrence>('pontual')
  const [status, setStatus] = useState<FixedExpenseStatus>('pendente')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      setCategory(editing?.category_id ?? '')
      setDescription(editing?.description ?? '')
      setAmount(editing?.amount ? formatNumber(editing.amount, 2) : '')
      setDueDay(editing?.due_day ? String(editing.due_day) : '')
      setMonth(editing ? String(editing.month) : String(defaultMonth))
      setYear(editing ? String(editing.year) : String(defaultYear))
      setRecurrence(editing?.recurrence ?? 'pontual')
      setStatus(editing?.status ?? 'pendente')
      setNotes(editing?.notes ?? '')
      setErrors({})
    }
  }, [open, editing, defaultMonth, defaultYear])

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!category) errs.category = 'Selecione uma categoria.'
    if (!description.trim()) errs.description = 'A descrição é obrigatória.'
    const amt = parsePtBrNumber(amount)
    if (!amt || amt <= 0) errs.amount = 'Informe um valor válido.'
    const dd = Number(dueDay)
    if (!dueDay || isNaN(dd) || dd < 1 || dd > 31) errs.dueDay = 'Dia entre 1 e 31.'
    const mm = Number(month)
    if (!month || isNaN(mm) || mm < 1 || mm > 12) errs.month = 'Mês inválido.'
    const yy = Number(year)
    if (!year || isNaN(yy) || yy < 2000 || yy > 2100) errs.year = 'Ano inválido.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload: FixedExpenseInput = {
        category_id: category,
        description: description.trim(),
        amount: parsePtBrNumber(amount),
        due_day: Number(dueDay),
        month: Number(month),
        year: Number(year),
        recurrence,
        status,
        notes: notes.trim(),
      }
      await fixedExpensesService.save(editing?.id, payload)
      toast({
        title: editing ? 'Gasto atualizado' : 'Gasto criado',
        description: `"${payload.description}" foi salvo com sucesso.`,
      })
      onOpenChange(false)
      onSaved()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao salvar gasto',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const years = useMemo(() => {
    const cur = new Date().getFullYear()
    const list: number[] = []
    for (let y = cur - 2; y <= cur + 2; y++) list.push(y)
    return list
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white border-slate-200 rounded-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#6D49F2]" />
            {editing ? 'Editar Gasto Fixo' : 'Novo Gasto Fixo'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Informe categoria, descrição, valor, vencimento e competência.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Categoria */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Categoria *
              </Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v)
                  setErrors((p) => ({ ...p, category: '' }))
                }}
              >
                <SelectTrigger className="h-9 text-sm bg-white border-slate-200 focus:ring-[#6D49F2] rounded-xl">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl">
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-[11px] text-rose-500">{errors.category}</p>}
            </div>

            {/* Descrição */}
            <div className="space-y-2 sm:col-span-2">
              <Label
                htmlFor="exp-desc"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Descrição *
              </Label>
              <Input
                id="exp-desc"
                type="text"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setErrors((p) => ({ ...p, description: '' }))
                }}
                placeholder="ex: Internet fibra 300MB"
                className="h-9 text-sm bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
              />
              {errors.description && (
                <p className="text-[11px] text-rose-500">{errors.description}</p>
              )}
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label
                htmlFor="exp-amount"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Valor (R$) *
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium pointer-events-none">
                  R$
                </span>
                <Input
                  id="exp-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                  onBlur={() => {
                    const p = parsePtBrNumber(amount)
                    if (p > 0) setAmount(formatNumber(p, 2))
                  }}
                  placeholder="0,00"
                  className="h-9 pl-7 text-sm font-semibold tabular-nums bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
                />
              </div>
              {errors.amount && <p className="text-[11px] text-rose-500">{errors.amount}</p>}
            </div>

            {/* Dia de Vencimento */}
            <div className="space-y-2">
              <Label
                htmlFor="exp-due"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Dia de Vencimento *
              </Label>
              <Input
                id="exp-due"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="ex: 10"
                className="h-9 text-sm font-semibold tabular-nums bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl"
              />
              {errors.dueDay && <p className="text-[11px] text-rose-500">{errors.dueDay}</p>}
            </div>

            {/* Competência - Mês */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Competência (Mês) *
              </Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-9 text-sm bg-white border-slate-200 focus:ring-[#6D49F2] rounded-xl">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl">
                  {MONTH_NAMES_PT.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)} className="text-xs capitalize">
                      {capitalize(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.month && <p className="text-[11px] text-rose-500">{errors.month}</p>}
            </div>

            {/* Competência - Ano */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Competência (Ano) *
              </Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="h-9 text-sm bg-white border-slate-200 focus:ring-[#6D49F2] rounded-xl">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl">
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.year && <p className="text-[11px] text-rose-500">{errors.year}</p>}
            </div>

            {/* Recorrência */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Recorrência *
              </Label>
              <Select
                value={recurrence}
                onValueChange={(v) => setRecurrence(v as FixedExpenseRecurrence)}
              >
                <SelectTrigger className="h-9 text-sm bg-white border-slate-200 focus:ring-[#6D49F2] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl">
                  {RECURRENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400">
                {recurrence === 'pontual'
                  ? 'O gasto aparece apenas no mês de competência informado.'
                  : 'O gasto se repete automaticamente nos meses seguintes conforme a recorrência.'}
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                Status *
              </Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FixedExpenseStatus)}>
                <SelectTrigger className="h-9 text-sm bg-white border-slate-200 focus:ring-[#6D49F2] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl">
                  <SelectItem value="pendente" className="text-xs">
                    Pendente
                  </SelectItem>
                  <SelectItem value="pago" className="text-xs">
                    Pago
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="space-y-2 sm:col-span-2">
              <Label
                htmlFor="exp-notes"
                className="text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Observações
              </Label>
              <Textarea
                id="exp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações opcionais..."
                className="min-h-[60px] text-sm bg-white border-slate-200 focus-visible:ring-[#6D49F2] rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-9 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="rounded-xl h-9 text-xs bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white font-bold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────────────────────────────────── main page ──────

export default function GastosFixos() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<FixedExpenseCategoryRecord[]>([])
  const [expenses, setExpenses] = useState<FixedExpenseRecord[]>([])

  // Category modal
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<FixedExpenseCategoryRecord | null>(null)

  // Expense modal
  const [expModalOpen, setExpModalOpen] = useState(false)
  const [editingExp, setEditingExp] = useState<FixedExpenseRecord | null>(null)

  // Filters (Gastos tab)
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMonth, setFilterMonth] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Resumo tab month/year
  const now = new Date()
  const [summaryMonth, setSummaryMonth] = useState<number>(now.getMonth() + 1)
  const [summaryYear, setSummaryYear] = useState<number>(now.getFullYear())

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cats, exps] = await Promise.all([
        fixedExpensesService.getCategories(),
        fixedExpensesService.getAll(),
      ])
      setCategories(cats)
      setExpenses(exps)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os gastos fixos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Category actions ──────────────────────────────────────────

  const openNewCategory = () => {
    setEditingCat(null)
    setCatModalOpen(true)
  }
  const openEditCategory = (c: FixedExpenseCategoryRecord) => {
    setEditingCat(c)
    setCatModalOpen(true)
  }
  const handleDeleteCategory = async (id: string, name: string) => {
    try {
      await fixedExpensesService.deleteCategory(id)
      toast({ title: 'Categoria excluída', description: `"${name}" foi removida.` })
      await loadData()
    } catch (err) {
      toast({
        title: 'Não foi possível excluir',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // ── Expense actions ───────────────────────────────────────────

  const openNewExpense = () => {
    setEditingExp(null)
    setExpModalOpen(true)
  }
  const openEditExpense = (e: FixedExpenseRecord) => {
    setEditingExp(e)
    setExpModalOpen(true)
  }
  const handleToggleStatus = async (e: EffectiveExpense) => {
    // Projected (recurring) occurrence → materialise a real "pago" record for
    // this specific month/year. The original recurring record is left alone so
    // it keeps generating future projections.
    if (isProjectedExpense(e)) {
      try {
        await fixedExpensesService.createPaidInstance({
          originId: e.originalId,
          category_id: e.category_id,
          description: e.description,
          amount: e.amount,
          due_day: e.due_day,
          month: e.month,
          year: e.year,
          notes: e.notes,
        })
        toast({
          title: 'Marcado como pago',
          description: `"${e.description}" registrado como pago em ${formatCompetence(
            e.month,
            e.year,
          )}.`,
        })
        await loadData()
      } catch (err) {
        toast({
          title: 'Erro ao atualizar status',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        })
      }
      return
    }

    // At this point e is a real (non-projected) record, so it has an id.
    const real = e as FixedExpenseRecord
    const next: FixedExpenseStatus = real.status === 'pago' ? 'pendente' : 'pago'
    try {
      await fixedExpensesService.toggleStatus(real.id, next)
      setExpenses((prev) => prev.map((x) => (x.id === real.id ? { ...x, status: next } : x)))
      toast({
        title: next === 'pago' ? 'Marcado como pago' : 'Marcado como pendente',
        description: `"${e.description}" atualizado.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao atualizar status',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }
  const handleDeleteExpense = async (id: string, desc: string) => {
    try {
      await fixedExpensesService.delete(id)
      toast({ title: 'Gasto excluído', description: `"${desc}" foi removido.` })
      await loadData()
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // ── Derived data ──────────────────────────────────────────────

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (filterCategory !== 'all' && e.category_id !== filterCategory) return false
      if (filterStatus !== 'all' && e.status !== filterStatus) return false
      if (filterMonth !== 'all' && String(e.month) !== filterMonth) return false
      if (search.trim() && !e.description.toLowerCase().includes(search.trim().toLowerCase()))
        return false
      return true
    })
  }, [expenses, filterCategory, filterStatus, filterMonth, search])

  // Resumo do mês — inclui gastos cadastrados no mês E projeções de
  // recorrência (mensal/trimestral/semestral/anual) que caem neste mês.
  const summaryExpenses = useMemo(
    () => getEffectiveExpensesForMonth(expenses, summaryMonth, summaryYear),
    [expenses, summaryMonth, summaryYear],
  )

  const monthKpis = useMemo(() => {
    const total = summaryExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const paid = summaryExpenses
      .filter((e) => e.status === 'pago')
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const pending = total - paid
    return { total, paid, pending, count: summaryExpenses.length }
  }, [summaryExpenses])

  const categoryTotals = useMemo(() => {
    const map = new Map<string, { category: FixedExpenseCategoryRecord; total: number }>()
    for (const e of summaryExpenses) {
      const cat = resolveCategory(e, categories)
      if (!cat) continue
      const cur = map.get(cat.id)
      if (cur) cur.total += Number(e.amount) || 0
      else map.set(cat.id, { category: cat, total: Number(e.amount) || 0 })
    }
    const arr = Array.from(map.values()).sort((a, b) => b.total - a.total)
    const grand = arr.reduce((s, x) => s + x.total, 0)
    return arr.map((x) => ({ ...x, percent: grand > 0 ? (x.total / grand) * 100 : 0 }))
  }, [summaryExpenses, categories])

  const pieData = useMemo(() => {
    const items = categoryTotals.map((x) => ({
      name: x.category.name,
      value: x.total,
      color: x.category.color,
    }))
    if (items.length <= 6) return items
    const top = items.slice(0, 5)
    const othersValue = items.slice(5).reduce((s, x) => s + x.value, 0)
    return [...top, { name: 'Outros', value: othersValue, color: '#94a3b8' }]
  }, [categoryTotals])

  // Comparativo com mês anterior
  const previousMonthDate = useMemo(() => {
    const m = summaryMonth === 1 ? 12 : summaryMonth - 1
    const y = summaryMonth === 1 ? summaryYear - 1 : summaryYear
    return { month: m, year: y }
  }, [summaryMonth, summaryYear])

  const previousTotalsByCat = useMemo(() => {
    const prev = getEffectiveExpensesForMonth(
      expenses,
      previousMonthDate.month,
      previousMonthDate.year,
    )
    const map = new Map<string, number>()
    for (const e of prev) map.set(e.category_id, (map.get(e.category_id) || 0) + (Number(e.amount) || 0))
    return map
  }, [expenses, previousMonthDate])

  const previousTotal = useMemo(
    () => Array.from(previousTotalsByCat.values()).reduce((s, v) => s + v, 0),
    [previousTotalsByCat],
  )

  const comparison = useMemo(() => {
    const diff = monthKpis.total - previousTotal
    const pct = previousTotal > 0 ? (diff / previousTotal) * 100 : null
    return { diff, pct }
  }, [monthKpis.total, previousTotal])

  // Variações por categoria (top subiu / top caiu)
  const categoryVariations = useMemo(() => {
    const arr = categoryTotals.map((x) => {
      const prev = previousTotalsByCat.get(x.category.id) || 0
      return { ...x, prev, diff: x.total - prev }
    })
    const asc = [...arr].filter((x) => x.diff !== 0).sort((a, b) => b.diff - a.diff)
    const desc = [...arr].filter((x) => x.diff !== 0).sort((a, b) => a.diff - b.diff)
    return { topUp: asc.slice(0, 3), topDown: desc.slice(0, 3).filter((x) => x.diff < 0) }
  }, [categoryTotals, previousTotalsByCat])

  // Vencimentos tab — inclui ocorrências projetadas por recorrência que caiem
  // no mês corrente, além dos gastos cadastrados e dos pontuais atrasados.
  const dueItems = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const curYear = today.getFullYear()
    const curMonth = today.getMonth() + 1 // 1-12

    // Effective (real + projected) pending expenses for the current month.
    const effectivePending = getEffectiveExpensesForMonth(expenses, curMonth, curYear).filter(
      (e) => e.status === 'pendente',
    )

    const upcoming: EffectiveExpense[] = []
    const overdue: EffectiveExpense[] = []

    for (const e of effectivePending) {
      const due = new Date(curYear, curMonth - 1, e.due_day, 23, 59, 59)
      if (due < today) {
        overdue.push(e)
      } else {
        const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays >= 0 && diffDays <= 7) upcoming.push(e)
      }
    }

    // Pontual expenses from previous months that are still pending → overdue
    // (their due date has long passed). Recurring origins are skipped because
    // their current-month projection is already in `effectivePending`.
    for (const e of expenses) {
      if (e.status !== 'pendente') continue
      if (e.recurrence && e.recurrence !== 'pontual') continue
      if (e.year > curYear) continue
      if (e.year === curYear && e.month >= curMonth) continue
      overdue.push(e)
    }

    return { upcoming, overdue }
  }, [expenses])

  const summaryYears = useMemo(() => {
    const cur = new Date().getFullYear()
    const set = new Set<number>([cur - 1, cur, cur + 1, summaryYear])
    return Array.from(set).sort((a, b) => a - b)
  }, [summaryYear])

  const changeSummaryMonth = (delta: number) => {
    let m = summaryMonth + delta
    let y = summaryYear
    if (m > 12) {
      m = 1
      y += 1
    }
    if (m < 1) {
      m = 12
      y -= 1
    }
    setSummaryMonth(m)
    setSummaryYear(y)
  }

  // ── Render helpers ────────────────────────────────────────────

  const renderCategoryDot = (cat?: FixedExpenseCategoryRecord) =>
    cat ? (
      <span className="inline-flex items-center gap-1.5">
        <span
          className="w-2.5 h-2.5 rounded-full inline-block"
          style={{ backgroundColor: cat.color }}
        />
        <span className="text-xs text-slate-700">{cat.name}</span>
      </span>
    ) : (
      <span className="text-xs text-slate-400">—</span>
    )

  const StatusBadge: React.FC<{ status: FixedExpenseStatus }> = ({ status }) =>
    status === 'pago' ? (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-semibold">
        Pago
      </Badge>
    ) : (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-semibold">
        Pendente
      </Badge>
    )

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-[#6D49F2]" />
            Gastos Fixos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Cadastre categorias e gastos recorrentes, acompanhe o resumo mensal e os vencimentos.
          </p>
        </div>
      </div>

      {loading ? (
        <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#6D49F2]" />
          <p className="text-sm text-slate-500 font-medium">Carregando gastos fixos...</p>
        </Card>
      ) : (
        <Tabs defaultValue="categorias" className="w-full">
          <TabsList className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-1.5 h-auto flex flex-col sm:flex-row w-full sm:w-fit gap-1">
            <TabsTrigger
              value="categorias"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6D49F2] data-[state=active]:to-[#FF2AFF] data-[state=active]:text-white data-[state=active]:shadow-xs text-xs font-bold px-4 py-2 text-slate-600"
            >
              Categorias
            </TabsTrigger>
            <TabsTrigger
              value="gastos"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6D49F2] data-[state=active]:to-[#FF2AFF] data-[state=active]:text-white data-[state=active]:shadow-xs text-xs font-bold px-4 py-2 text-slate-600"
            >
              Gastos
            </TabsTrigger>
            <TabsTrigger
              value="resumo"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6D49F2] data-[state=active]:to-[#FF2AFF] data-[state=active]:text-white data-[state=active]:shadow-xs text-xs font-bold px-4 py-2 text-slate-600"
            >
              Resumo do Mês
            </TabsTrigger>
            <TabsTrigger
              value="vencimentos"
              className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6D49F2] data-[state=active]:to-[#FF2AFF] data-[state=active]:text-white data-[state=active]:shadow-xs text-xs font-bold px-4 py-2 text-slate-600"
            >
              Vencimentos
            </TabsTrigger>
          </TabsList>

          {/* ============ TAB 1: CATEGORIAS ============ */}
          <TabsContent value="categorias" className="mt-6 focus:outline-none space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={openNewCategory}
                className="h-8 text-xs font-bold rounded-xl bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white"
              >
                <Plus className="w-3.5 h-3.5" /> Nova Categoria
              </Button>
            </div>

            <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#6D49F2]" />
                  Categorias de Gastos Fixos
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Categorias usadas para classificar gastos e colorir o gráfico de pizza.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="hover:bg-transparent border-b border-slate-200">
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3">
                          Nome
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3">
                          Cor
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3">
                          Descrição
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3 text-center">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-10 text-slate-400 text-sm"
                          >
                            Nenhuma categoria cadastrada. Clique em &ldquo;Nova Categoria&rdquo;.
                          </TableCell>
                        </TableRow>
                      ) : (
                        categories.map((c) => (
                          <TableRow
                            key={c.id}
                            className="hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                          >
                            <TableCell className="font-semibold text-xs text-slate-900 py-2.5 px-3">
                              {c.name}
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full inline-block border border-slate-200"
                                  style={{ backgroundColor: c.color }}
                                />
                                <span className="text-[11px] font-mono text-slate-500">
                                  {c.color}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 py-2.5 px-3">
                              {c.description || '—'}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditCategory(c)}
                                  title="Editar"
                                  className="h-7 w-7 rounded-lg text-slate-500 hover:text-[#6D49F2] hover:bg-[#6D49F2]/10"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      title="Excluir"
                                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="rounded-2xl">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Tem certeza que deseja excluir a categoria &ldquo;{c.name}
                                        &rdquo;? Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="rounded-xl">
                                        Cancelar
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteCategory(c.id, c.name)}
                                        className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                      >
                                        Excluir
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ TAB 2: GASTOS ============ */}
          <TabsContent value="gastos" className="mt-6 focus:outline-none space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Categoria filter */}
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-8 w-[160px] text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl">
                    <SelectItem value="all" className="text-xs">
                      Todas as categorias
                    </SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full inline-block"
                            style={{ backgroundColor: c.color }}
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Status filter */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 w-[130px] text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl">
                    <SelectItem value="all" className="text-xs">
                      Todos
                    </SelectItem>
                    <SelectItem value="pago" className="text-xs">
                      Pago
                    </SelectItem>
                    <SelectItem value="pendente" className="text-xs">
                      Pendente
                    </SelectItem>
                  </SelectContent>
                </Select>
                {/* Mês filter */}
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-8 w-[130px] text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl">
                    <SelectItem value="all" className="text-xs">
                      Todos os meses
                    </SelectItem>
                    {MONTH_NAMES_PT.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)} className="text-xs capitalize">
                        {capitalize(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Search */}
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar descrição..."
                  className="h-8 w-[180px] text-xs bg-white border-slate-200 rounded-xl"
                />
              </div>
              <Button
                onClick={openNewExpense}
                className="h-8 text-xs font-bold rounded-xl bg-gradient-to-r from-[#6D49F2] to-[#FF2AFF] hover:opacity-90 text-white shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Gasto
              </Button>
            </div>

            <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#6D49F2]" />
                  Gastos Fixos
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  {filteredExpenses.length} de {expenses.length} gastos
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[960px]">
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="hover:bg-transparent border-b border-slate-200">
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3">
                          Descrição
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3">
                          Categoria
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3 text-right">
                          Valor
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3 text-center">
                          Vencimento
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3 text-center">
                          Competência
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3 text-center">
                          Recorrência
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3 text-center">
                          Status
                        </TableHead>
                        <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3 text-center">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="text-center py-10 text-slate-400 text-sm"
                          >
                            Nenhum gasto encontrado com os filtros selecionados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredExpenses.map((e) => {
                          const cat = resolveCategory(e, categories)
                          const isProjected = e.recurrence && e.recurrence !== 'pontual'
                          return (
                            <TableRow
                              key={e.id}
                              className="hover:bg-slate-50/50 transition-colors border-b border-slate-100"
                            >
                              <TableCell className="font-medium text-xs text-slate-900 py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  {e.description}
                                  {isProjected && (
                                    <Badge className="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20 text-[10px] font-semibold px-1.5 py-0">
                                      Recorrente
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5 px-3">
                                {renderCategoryDot(cat)}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-right tabular-nums text-xs font-semibold text-slate-900">
                                {formatCurrency(Number(e.amount) || 0)}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-center tabular-nums text-xs text-slate-600">
                                {formatDueLabel(Number(e.due_day), Number(e.month))}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-center tabular-nums text-xs text-slate-600">
                                {formatCompetence(Number(e.month), Number(e.year))}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-center">
                                <span className="text-[11px] text-slate-600">
                                  {recurrenceLabel(e.recurrence)}
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-center">
                                <StatusBadge status={e.status} />
                              </TableCell>
                              <TableCell className="py-2 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleToggleStatus(e)}
                                    title={
                                      e.status === 'pago'
                                        ? 'Marcar como pendente'
                                        : 'Marcar como pago'
                                    }
                                    className={`h-7 w-7 rounded-lg ${
                                      e.status === 'pago'
                                        ? 'text-emerald-600 hover:bg-emerald-50'
                                        : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openEditExpense(e)}
                                    title="Editar"
                                    className="h-7 w-7 rounded-lg text-slate-500 hover:text-[#6D49F2] hover:bg-[#6D49F2]/10"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        title="Excluir"
                                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="rounded-2xl">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Excluir gasto?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Tem certeza que deseja excluir o gasto &ldquo;
                                          {e.description}&rdquo;? Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel className="rounded-xl">
                                          Cancelar
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteExpense(e.id, e.description)}
                                          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                        >
                                          Excluir
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============ TAB 3: RESUMO DO MÊS ============ */}
          <TabsContent value="resumo" className="mt-6 focus:outline-none space-y-6">
            {/* Month/Year selector */}
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200/90 shadow-sm p-1.5 rounded-2xl">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => changeSummaryMonth(-1)}
                  className="h-8 w-8 rounded-xl text-slate-500 hover:text-[#6D49F2] hover:bg-[#6D49F2]/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Select
                  value={String(summaryMonth)}
                  onValueChange={(v) => setSummaryMonth(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[140px] text-xs font-bold bg-slate-50/80 border-slate-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl">
                    {MONTH_NAMES_PT.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)} className="text-xs capitalize">
                        {capitalize(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-slate-400">/</span>
                <Select
                  value={String(summaryYear)}
                  onValueChange={(v) => setSummaryYear(Number(v))}
                >
                  <SelectTrigger className="h-8 w-[100px] text-xs font-bold bg-slate-50/80 border-slate-200 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl">
                    {summaryYears.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => changeSummaryMonth(1)}
                  className="h-8 w-8 rounded-xl text-slate-500 hover:text-[#6D49F2] hover:bg-[#6D49F2]/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total do Mês
                    </span>
                    <div className="p-2 rounded-xl border bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20 shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {formatCurrency(monthKpis.total)}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    {capitalize(MONTH_NAMES_PT[summaryMonth - 1])} {summaryYear}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-emerald-50 border-emerald-200/80 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                      Total Pago
                    </span>
                    <div className="p-2 rounded-xl border bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-emerald-900 tabular-nums">
                    {formatCurrency(monthKpis.paid)}
                  </div>
                  <div className="mt-2 pt-2 border-t border-emerald-200/60 text-xs text-emerald-600">
                    Gastos quitados no mês
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200/80 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Total Pendente
                    </span>
                    <div className="p-2 rounded-xl border bg-amber-100 text-amber-700 border-amber-200 shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-amber-900 tabular-nums">
                    {formatCurrency(monthKpis.pending)}
                  </div>
                  <div className="mt-2 pt-2 border-t border-amber-200/60 text-xs text-amber-600">
                    Ainda não pagos
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Quantidade
                    </span>
                    <div className="p-2 rounded-xl border bg-[#FF2AFF]/10 text-[#FF2AFF] border-[#FF2AFF]/20 shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                    {formatNumber(monthKpis.count, 0)}
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                    {monthKpis.count === 1 ? 'gasto cadastrado' : 'gastos cadastrados'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Comparativo com mês anterior */}
            <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#6D49F2]" />
                  Comparativo com o Mês Anterior
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Diferença em relação a {capitalize(
                    MONTH_NAMES_PT[previousMonthDate.month - 1],
                  )}{' '}
                  {previousMonthDate.year}.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-slate-500">Variação total</div>
                    <div
                      className={`text-2xl font-bold tabular-nums ${comparison.diff < 0 ? 'text-emerald-600' : comparison.diff > 0 ? 'text-red-600' : 'text-slate-700'}`}
                    >
                      {comparison.diff >= 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(comparison.diff))}
                      {comparison.pct !== null && (
                        <span className="text-sm font-semibold ml-2">
                          ({comparison.pct >= 0 ? '+' : ''}
                          {formatNumber(comparison.pct, 1)}%)
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Mês anterior: {formatCurrency(previousTotal)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {comparison.diff < 0 ? (
                      <TrendingDown className="w-5 h-5 text-emerald-600" />
                    ) : comparison.diff > 0 ? (
                      <TrendingUp className="w-5 h-5 text-red-600" />
                    ) : null}
                    <span className="text-xs text-slate-500">
                      {comparison.diff < 0
                        ? 'Redução (positivo)'
                        : comparison.diff > 0
                          ? 'Aumento (atenção)'
                          : 'Sem variação'}
                    </span>
                  </div>
                </div>

                {/* Destaques de variação */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-red-700 mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Mais subiram
                    </div>
                    {categoryVariations.topUp.length === 0 ? (
                      <p className="text-xs text-slate-400">Sem variações positivas.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {categoryVariations.topUp.map((v) => (
                          <li
                            key={v.category.id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: v.category.color }}
                              />
                              {v.category.name}
                            </span>
                            <span className="font-bold text-red-600 tabular-nums">
                              +{formatCurrency(v.diff)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-2 flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" /> Mais caíram
                    </div>
                    {categoryVariations.topDown.length === 0 ? (
                      <p className="text-xs text-slate-400">Sem variações negativas.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {categoryVariations.topDown.map((v) => (
                          <li
                            key={v.category.id}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="flex items-center gap-1.5 text-slate-700">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: v.category.color }}
                              />
                              {v.category.name}
                            </span>
                            <span className="font-bold text-emerald-600 tabular-nums">
                              {formatCurrency(v.diff)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total por categoria + pizza */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#6D49F2]" />
                    Total por Categoria
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Distribuição dos gastos do mês por categoria, incluindo projeções de
                    recorrência.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/80">
                        <TableRow className="hover:bg-transparent border-b border-slate-200">
                          <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3">
                            Categoria
                          </TableHead>
                          <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3 text-right">
                            Valor Total
                          </TableHead>
                          <TableHead className="font-bold text-slate-800 text-xs py-2.5 px-3 text-right">
                            % do Total
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryTotals.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center py-8 text-slate-400 text-sm"
                            >
                              Nenhum gasto neste mês.
                            </TableCell>
                          </TableRow>
                        ) : (
                          categoryTotals.map((c) => (
                            <TableRow
                              key={c.category.id}
                              className="hover:bg-slate-50/50 border-b border-slate-100"
                            >
                              <TableCell className="py-2.5 px-3">
                                {renderCategoryDot(c.category)}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-right tabular-nums text-xs font-semibold text-slate-900">
                                {formatCurrency(c.total)}
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-right tabular-nums text-xs text-slate-600">
                                {formatNumber(c.percent, 1)}%
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-5 pb-3 border-b border-slate-100">
                  <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#6D49F2]" />
                    Distribuição por Categoria
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Gráfico de pizza das categorias no mês.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                  {pieData.length === 0 ? (
                    <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">
                      Sem dados para o mês selecionado.
                    </div>
                  ) : (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={45}
                            paddingAngle={2}
                            animationDuration={600}
                          >
                            {pieData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              formatCurrency(value),
                              name,
                            ]}
                            contentStyle={{
                              backgroundColor: '#0f172a',
                              borderRadius: '12px',
                              color: '#f8fafc',
                              fontSize: '12px',
                              border: 'none',
                            }}
                            itemStyle={{ color: '#e2e8f0' }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconSize={8}
                            wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ============ TAB 4: VENCIMENTOS ============ */}
          <TabsContent value="vencimentos" className="mt-6 focus:outline-none space-y-6">
            {/* Próximos 7 dias */}
            <Card className="bg-white border-slate-200/90 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#6D49F2]" />
                  Vencem nos próximos 7 dias
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Gastos pendentes com vencimento em até 7 dias.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {dueItems.upcoming.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-400">
                    Nenhum vencimento próximo.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {dueItems.upcoming.map((e) => {
                      const cat = resolveCategory(e, categories)
                      const projected = isProjectedExpense(e)
                      const key = projected
                        ? projectedId(e.originalId, e.month, e.year)
                        : (e as FixedExpenseRecord).id
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50/50 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate flex items-center gap-1.5">
                              {e.description}
                              {projected && (
                                <Badge className="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20 text-[10px] font-semibold px-1.5 py-0">
                                  Recorrente
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              {renderCategoryDot(cat)}
                              <span className="text-slate-300">•</span>
                              <span className="tabular-nums">
                                Venc. {formatDueLabel(Number(e.due_day), Number(e.month))}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>{recurrenceLabel(e.recurrence)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-bold tabular-nums text-slate-900">
                              {formatCurrency(Number(e.amount) || 0)}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleToggleStatus(e)}
                              className="h-7 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Pagar
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Atrasados */}
            <Card className="bg-red-50 border-red-200 shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-red-200/80">
                <CardTitle className="text-base font-bold text-red-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Atrasados
                </CardTitle>
                <CardDescription className="text-xs text-red-600 mt-0.5">
                  Gastos pendentes cujo vencimento já passou.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {dueItems.overdue.length === 0 ? (
                  <div className="py-10 text-center text-sm text-red-400">
                    Nenhum gasto atrasado.
                  </div>
                ) : (
                  <div className="divide-y divide-red-200/60">
                    {dueItems.overdue.map((e) => {
                      const cat = resolveCategory(e, categories)
                      const projected = isProjectedExpense(e)
                      const key = projected
                        ? projectedId(e.originalId, e.month, e.year)
                        : (e as FixedExpenseRecord).id
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between gap-3 p-4 hover:bg-red-100/40 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-red-900 truncate flex items-center gap-1.5">
                              {e.description}
                              {projected && (
                                <Badge className="bg-[#6D49F2]/10 text-[#6D49F2] border-[#6D49F2]/20 text-[10px] font-semibold px-1.5 py-0">
                                  Recorrente
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-red-600 mt-0.5 flex items-center gap-2">
                              {cat && (
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className="w-2 h-2 rounded-full inline-block"
                                    style={{ backgroundColor: cat.color }}
                                  />
                                  {cat.name}
                                </span>
                              )}
                              <span className="text-red-300">•</span>
                              <span className="tabular-nums">
                                Venc. {formatDueLabel(Number(e.due_day), Number(e.month))}
                              </span>
                              <span className="text-red-300">•</span>
                              <span>{recurrenceLabel(e.recurrence)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-bold tabular-nums text-red-900">
                              {formatCurrency(Number(e.amount) || 0)}
                            </span>
                            <Button
                              size="sm"
                              onClick={() => handleToggleStatus(e)}
                              className="h-7 text-[11px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Pagar
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Modals */}
      <CategoryModal
        open={catModalOpen}
        onOpenChange={setCatModalOpen}
        editing={editingCat}
        existingNames={categories.map((c) => c.name)}
        onSaved={loadData}
      />
      <ExpenseModal
        open={expModalOpen}
        onOpenChange={setExpModalOpen}
        editing={editingExp}
        categories={categories}
        defaultYear={summaryYear}
        defaultMonth={summaryMonth}
        onSaved={loadData}
      />
    </div>
  )
}
