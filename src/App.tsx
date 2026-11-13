import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EInvoices from './pages/EInvoices'
import EInvoiceDetail from './pages/EInvoiceDetail'
import Simulator from './pages/Simulator'
import Invoices from './pages/Invoices'
import InvoiceForm from './pages/InvoiceForm'
import Parties from './pages/Parties'
import Items from './pages/Items'
import Payments from './pages/Payments'
import Accounts from './pages/Accounts'
import Journal from './pages/Journal'
import Reports from './pages/Reports'
import Users from './pages/Users'

function Guard({ page, children }: { page: string; children: ReactNode }) {
  const { can } = useAuth()
  if (!can(page)) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">شما به این بخش دسترسی ندارید.</div>
  return <>{children}</>
}

export default function App() {
  const { user } = useAuth()
  if (!user) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Guard page="dashboard"><Dashboard /></Guard>} />
        <Route path="einvoices" element={<Guard page="einvoices"><EInvoices /></Guard>} />
        <Route path="einvoices/:id" element={<Guard page="einvoices"><EInvoiceDetail /></Guard>} />
        <Route path="simulator" element={<Guard page="simulator"><Simulator /></Guard>} />
        <Route path="sales" element={<Guard page="salesInvoices"><Invoices type="sale" /></Guard>} />
        <Route path="sales/new" element={<Guard page="salesInvoices"><InvoiceForm type="sale" /></Guard>} />
        <Route path="sales/:id/edit" element={<Guard page="salesInvoices"><InvoiceForm type="sale" /></Guard>} />
        <Route path="purchases" element={<Guard page="purchaseInvoices"><Invoices type="purchase" /></Guard>} />
        <Route path="purchases/new" element={<Guard page="purchaseInvoices"><InvoiceForm type="purchase" /></Guard>} />
        <Route path="parties" element={<Guard page="parties"><Parties /></Guard>} />
        <Route path="items" element={<Guard page="items"><Items /></Guard>} />
        <Route path="payments" element={<Guard page="payments"><Payments /></Guard>} />
        <Route path="accounts" element={<Guard page="accounts"><Accounts /></Guard>} />
        <Route path="journal" element={<Guard page="journal"><Journal /></Guard>} />
        <Route path="reports" element={<Guard page="reports"><Reports /></Guard>} />
        <Route path="users" element={<Guard page="users"><Users /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
