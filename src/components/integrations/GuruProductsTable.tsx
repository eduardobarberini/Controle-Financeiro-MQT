import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatNumber } from '@/lib/financial-utils'
import type { GuruProduct, KindSource, ProductKind } from '@/services/catalog'
import { fmtDate, KindSelect, MoneyInput, SourceBadge } from './catalog-shared'

const GATEWAY: Record<string, string> = { appmaxgw: 'AppMax', pagarme2: 'Pagar.me' }

interface Props {
  products: GuruProduct[]
  saving: string | null
  onUpdate: (
    product: GuruProduct,
    patch: { kind?: ProductKind; kind_source?: KindSource; list_price?: number | null },
  ) => void
}

export function GuruProductsTable({ products, saving, onUpdate }: Props) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className="text-[11px]">Produto</TableHead>
            <TableHead className="text-[11px]">Tipo</TableHead>
            <TableHead className="text-[11px] text-right">Preço de referência</TableHead>
            <TableHead className="text-[11px] text-right">Vendas</TableHead>
            <TableHead className="text-[11px]">Última venda</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">
                Nenhum produto. Eles aparecem aqui quando a primeira venda chega.
              </TableCell>
            </TableRow>
          ) : (
            products.map((p) => (
              <TableRow key={p.id} className="border-b border-slate-100">
                <TableCell className="text-xs max-w-[360px]">
                  <p className="font-medium text-slate-900 truncate" title={p.name}>
                    {p.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {p.guru_product_id}
                    {p.marketplace_name
                      ? ` · ${GATEWAY[p.marketplace_name] ?? p.marketplace_name}`
                      : ''}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <KindSelect
                      value={p.kind}
                      disabled={saving === p.id}
                      onChange={(kind) => onUpdate(p, { kind })}
                    />
                    <SourceBadge row={p} onReset={() => onUpdate(p, { kind_source: 'auto' })} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <MoneyInput
                      value={p.list_price}
                      disabled={saving === p.id}
                      placeholder={p.typical_price !== null ? formatNumber(p.typical_price) : ''}
                      onSave={(list_price) => onUpdate(p, { list_price })}
                    />
                  </div>
                </TableCell>
                <TableCell className="text-xs text-right text-slate-700">
                  {p.sales_count.toLocaleString('pt-BR')}
                </TableCell>
                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                  {fmtDate(p.last_sale_at)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
