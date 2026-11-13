import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth'
import { roleLabel } from '../lib/format'

const nav: { to: string; label: string; page: string; group?: string }[] = [
  { to: '/', label: 'داشبورد', page: 'dashboard' },
  { to: '/einvoices', label: 'صورتحساب الکترونیکی', page: 'einvoices', group: 'صورتحساب' },
  { to: '/simulator', label: 'شبیه‌ساز سامانه مالیاتی', page: 'simulator' },
  { to: '/sales', label: 'فاکتورهای فروش', page: 'salesInvoices', group: 'فاکتور و طرف‌حساب' },
  { to: '/purchases', label: 'فاکتورهای خرید', page: 'purchaseInvoices' },
  { to: '/parties', label: 'مشتریان و تأمین‌کنندگان', page: 'parties' },
  { to: '/items', label: 'کالا و خدمات', page: 'items' },
  { to: '/payments', label: 'دریافت و پرداخت', page: 'payments', group: 'مالی' },
  { to: '/accounts', label: 'صندوق و بانک', page: 'accounts' },
  { to: '/journal', label: 'اسناد حسابداری', page: 'journal' },
  { to: '/reports', label: 'گزارش‌ها', page: 'reports' },
  { to: '/users', label: 'مدیریت کاربران', page: 'users', group: 'سیستم' },
]

export default function Layout() {
  const { user, logout, can } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 start-0 z-40 w-64 shrink-0 overflow-y-auto border-e border-slate-200 bg-white p-4 transition-transform md:static md:translate-x-0 ${open ? 'translate-x-0' : 'max-md:translate-x-full'}`}>
        <div className="mb-6 flex items-center gap-2">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-sky-400 text-lg font-bold text-white shadow-lg shadow-brand-500/30">ص</div>
          <div className="text-sm font-bold leading-5">
            مدیریت مالی
            <div className="text-xs font-normal text-slate-500">صورتحساب الکترونیکی</div>
          </div>
        </div>
        <nav className="space-y-0.5">
          {nav
            .filter((n) => can(n.page))
            .map((n) => (
              <div key={n.to}>
                {n.group && <div className="mb-1 mt-4 px-3 text-xs font-medium text-slate-400">{n.group}</div>}
                <NavLink
                  to={n.to}
                  end={n.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => `relative block rounded-xl px-3 py-2 text-sm transition-all duration-200 ${isActive ? 'bg-gradient-to-l from-brand-50 to-white font-medium text-brand-700 shadow-sm before:absolute before:inset-y-2 before:end-0 before:w-1 before:rounded-full before:bg-brand-600' : 'text-slate-600 hover:-translate-x-1 hover:bg-slate-100'}`}
                >
                  {n.label}
                </NavLink>
              </div>
            ))}
        </nav>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/30 md:hidden" onClick={() => setOpen(false)} />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-md">
          <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm md:hidden" onClick={() => setOpen(true)}>
            منو
          </button>
          <div className="ms-auto flex items-center gap-3 text-sm">
            <div className="text-end">
              <div className="font-medium">{user?.fullName}</div>
              <div className="text-xs text-slate-500">{user && roleLabel[user.role]}</div>
            </div>
            <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50">
              خروج
            </button>
          </div>
        </header>
        <main key={pathname} className="animate-fade-in p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
