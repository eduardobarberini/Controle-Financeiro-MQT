import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Home, AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Página não encontrada</h1>
      <p className="text-slate-400 text-sm max-w-sm mb-6">
        A rota solicitada não existe ou foi movida. Retorne ao Dashboard para continuar sua gestão
        financeira.
      </p>
      <Button asChild className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl">
        <Link to="/dashboard">
          <Home className="w-4 h-4 mr-2" />
          Voltar ao Dashboard
        </Link>
      </Button>
    </div>
  )
}
