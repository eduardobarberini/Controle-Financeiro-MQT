import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  catalogService,
  type AsaasLink,
  type GuruProduct,
  type Seller,
  type SellerInput,
} from '@/services/catalog'
import { AsaasLinksTable } from './AsaasLinksTable'
import { GuruProductsTable } from './GuruProductsTable'
import { SellersPanel } from './SellersPanel'
import { isPending, matchesQuery } from './catalog-shared'

const TAB_CLASS =
  'rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#6D49F2] data-[state=active]:to-[#FF2AFF] data-[state=active]:text-white data-[state=active]:shadow-xs text-xs font-bold px-4 py-2 text-slate-600'

function PendingCount({ n }: { n: number }) {
  if (!n) return null
  return (
    <Badge className="ml-1.5 bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5">
      {n}
    </Badge>
  )
}

export function CatalogTab() {
  const { toast } = useToast()
  const [products, setProducts] = useState<GuruProduct[]>([])
  const [links, setLinks] = useState<AsaasLink[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [reclassifying, setReclassifying] = useState(false)
  const [query, setQuery] = useState('')
  const [onlyPending, setOnlyPending] = useState(false)

  const fail = useCallback(
    (title: string, err: unknown) =>
      toast({
        title,
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      }),
    [toast],
  )

  const load = useCallback(async () => {
    try {
      // Vendedoras primeiro: na primeira vez cria Maju e Marlene e reclassifica.
      const s = await catalogService.getSellers()
      const [p, l] = await Promise.all([catalogService.getProducts(), catalogService.getLinks()])
      setSellers(s)
      setProducts(p)
      setLinks(l)
    } catch (err) {
      fail('Erro ao carregar o catálogo', err)
    } finally {
      setLoading(false)
    }
  }, [fail])

  useEffect(() => {
    load()
  }, [load])

  const updateProduct = async (
    product: GuruProduct,
    patch: Parameters<typeof catalogService.updateProduct>[1],
  ) => {
    setSaving(product.id)
    try {
      await catalogService.updateProduct(product.id, patch)
      if (patch.kind_source === 'auto') {
        setProducts(await catalogService.getProducts())
      } else {
        setProducts((list) =>
          list.map((p) =>
            p.id === product.id
              ? { ...p, ...patch, kind_source: patch.kind !== undefined ? 'manual' : p.kind_source }
              : p,
          ),
        )
      }
    } catch (err) {
      fail('Erro ao salvar o produto', err)
    } finally {
      setSaving(null)
    }
  }

  const updateLink = async (
    link: AsaasLink,
    patch: Parameters<typeof catalogService.updateLink>[1],
  ) => {
    setSaving(link.id)
    try {
      await catalogService.updateLink(link.id, patch)
      if (patch.kind_source === 'auto') {
        setLinks(await catalogService.getLinks())
      } else {
        setLinks((list) =>
          list.map((l) => (l.id === link.id ? { ...l, ...patch, kind_source: 'manual' } : l)),
        )
      }
    } catch (err) {
      fail('Erro ao salvar o link', err)
    } finally {
      setSaving(null)
    }
  }

  const saveSeller = async (id: string | null, input: SellerInput): Promise<boolean> => {
    try {
      if (id) await catalogService.updateSeller(id, input)
      else await catalogService.createSeller(input)
      toast({ title: 'Vendedora salva', description: 'As vendas foram reclassificadas.' })
      await load()
      return true
    } catch (err) {
      fail('Erro ao salvar a vendedora', err)
      return false
    }
  }

  const reclassify = async () => {
    setReclassifying(true)
    try {
      const r = await catalogService.reclassify()
      toast({
        title: 'Vendas reclassificadas',
        description: `Guru: ${r.guru_updated} · Asaas: ${r.asaas_updated} · produtos novos: ${r.new_products} · links novos: ${r.new_links}`,
      })
      await load()
    } catch (err) {
      fail('Erro ao reclassificar', err)
    } finally {
      setReclassifying(false)
    }
  }

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (p) => (!onlyPending || isPending(p)) && matchesQuery(query, p.name, p.guru_product_id),
      ),
    [products, query, onlyPending],
  )
  const visibleLinks = useMemo(
    () =>
      links.filter(
        (l) => (!onlyPending || isPending(l)) && matchesQuery(query, l.name, l.asaas_link_id),
      ),
    [links, query, onlyPending],
  )
  // Pendências que importam: itens "outro" automáticos que já venderam.
  const pendingProducts = products.filter((p) => isPending(p) && p.sales_count > 0).length
  const pendingLinks = links.filter((l) => isPending(l) && l.contracts > 0).length

  return (
    <Card className="border-slate-200 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Catálogo de vendas</CardTitle>
            <CardDescription className="text-xs mt-1 max-w-2xl">
              Diz o que é cada venda (ingresso, bump, plataforma, renovação) e quem vendeu. A
              classificação é sugerida pelo nome; a correção feita aqui vale para todas as vendas do
              produto ou link.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={reclassify}
            disabled={reclassifying}
            className="h-8 text-xs shrink-0"
          >
            {reclassifying ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            )}
            Reclassificar vendas
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 px-6 pb-6">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando catálogo...
          </div>
        ) : (
          <Tabs defaultValue="produtos">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 pb-3">
              <TabsList className="bg-white border border-slate-200/90 shadow-sm rounded-2xl p-1.5 h-auto flex flex-col sm:flex-row w-full sm:w-fit gap-1">
                <TabsTrigger value="produtos" className={TAB_CLASS}>
                  Produtos Guru ({products.length})
                  <PendingCount n={pendingProducts} />
                </TabsTrigger>
                <TabsTrigger value="links" className={TAB_CLASS}>
                  Links Asaas ({links.length})
                  <PendingCount n={pendingLinks} />
                </TabsTrigger>
                <TabsTrigger value="vendedoras" className={TAB_CLASS}>
                  Vendedoras ({sellers.length})
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-[11px] text-slate-600 whitespace-nowrap">
                  <Switch checked={onlyPending} onCheckedChange={setOnlyPending} /> Só a classificar
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por nome ou id"
                    className="h-8 text-xs pl-8 w-56"
                  />
                </div>
              </div>
            </div>
            <TabsContent value="produtos" className="mt-0">
              <GuruProductsTable
                products={visibleProducts}
                saving={saving}
                onUpdate={updateProduct}
              />
            </TabsContent>
            <TabsContent value="links" className="mt-0">
              <AsaasLinksTable
                links={visibleLinks}
                sellers={sellers}
                saving={saving}
                onUpdate={updateLink}
              />
            </TabsContent>
            <TabsContent value="vendedoras" className="mt-0">
              <SellersPanel sellers={sellers} onSave={saveSeller} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
