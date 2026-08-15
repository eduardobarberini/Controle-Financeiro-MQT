import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { FinancialProvider } from '@/contexts/FinancialContext'

import Layout from './components/Layout'
import Index from './pages/Index'
import Dashboard from './pages/Dashboard'
import Mensal from './pages/Mensal'
import Login from './pages/Login'
import Signup from './pages/Signup'
import NotFound from './pages/NotFound'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <AuthProvider>
        <FinancialProvider>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected App Routes wrapped in Layout */}
            <Route element={<Layout />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/mensal" element={<Mensal />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </FinancialProvider>
      </AuthProvider>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
