import { Link } from 'react-router-dom'
import { useDB } from '../api/store'
import { Card, PageHeader, Stat, StatusBadge, Table } from '../components/ui'
import { totalOf } from '../lib/calc'
import { fmt, jdate, money, statusLabel } from '../lib/format'
import { monthlySeries, partyBalances, profitLoss } from '../lib/reports'
import type { InvoiceStatus } from '../types'
import { useAuth } from '../auth'

const statuses: InvoiceStatus[] = ['draft', 'ready', 'sent', 'confirmed', 'rejected']
const barColor: Record<InvoiceStatus, string> = { draft: '#94a3b8', ready: '#f59e0b', sent: '#0ea5e9', confirmed: '#10b981', rejected: '#f43f5e' }

export default function Dashboard() {
  const db = useDB()
  const { can } = useAuth()
  const finance = can('reports')
  const pl = profitLoss(db)
  const receivables = partyBalances(db)
    .filter((p) => p.balance > 0)
    .reduce((s, p) => s + p.balance, 0)
  const series = monthlySeries(db)
  const max = Math.max(1, ...series.flatMap((s) => [s.sales, s.expense]))
  const sales = db.invoices.filter((i) => i.type === 'sale')
  const count = (s: InvoiceStatus) => sales.filter((i) => i.status === s && !i.cancelled).length
  const latest = [...db.invoices].sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number).slice(0, 6)

  return (
    <>
      <PageHeader title="داشبورد مدیریتی" subtitle="نمای کلی وضعیت مالی و صورتحساب‌ها" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="فروش" amount={pl.revenue} suffix=" ریال" tone="indigo" />
        {finance && <Stat label="هزینه و خرید" amount={pl.cogs + pl.opex} suffix=" ریال" tone="amber" delay={80} />}
        {finance && <Stat label="سود (زیان)" amount={pl.profit} suffix=" ریال" tone={pl.profit >= 0 ? 'green' : 'red'} delay={160} />}
        {finance && <Stat label="مطالبات" amount={receivables} suffix=" ریال" delay={240} />}
        <Stat label="تعداد صورتحساب‌ها" amount={db.invoices.filter((i) => !i.cancelled).length} tone="indigo" delay={320} sub={`${fmt(db.invoices.filter((i) => i.cancelled).length)} باطل‌شده`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="فروش و هزینه ماهانه" className="lg:col-span-2" delay={150}>
          <div className="mb-2 flex gap-4 text-xs text-slate-500">
            <span><i className="me-1 inline-block size-2.5 rounded-sm bg-brand-500" />فروش</span>
            <span><i className="me-1 inline-block size-2.5 rounded-sm bg-amber-400" />هزینه</span>
          </div>
          <div className="flex h-56 items-end gap-3">
            {series.map((s, idx) => (
              <div key={s.key} className="group flex h-full flex-1 flex-col justify-end">
                <div className="flex flex-1 items-end justify-center gap-1">
                  <div className="animate-grow-y w-1/2 max-w-8 origin-bottom rounded-t-lg bg-gradient-to-t from-brand-600 to-sky-400 transition group-hover:brightness-110" style={{ height: `${(s.sales / max) * 100}%`, animationDelay: `${300 + idx * 90}ms` }} title={money(s.sales)} />
                  <div className="animate-grow-y w-1/2 max-w-8 origin-bottom rounded-t-lg bg-gradient-to-t from-amber-500 to-yellow-300 transition group-hover:brightness-110" style={{ height: `${(s.expense / max) * 100}%`, animationDelay: `${380 + idx * 90}ms` }} title={money(s.expense)} />
                </div>
                <div className="mt-2 text-center text-xs text-slate-500">{s.key}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="وضعیت صورتحساب‌های فروش" delay={250}>
          <ul className="space-y-3">
            {statuses.map((s, idx) => (
              <li key={s}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{statusLabel[s]}</span>
                  <span className="font-medium">{fmt(count(s))}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="animate-grow-x h-2 origin-right rounded-full" style={{ width: `${(count(s) / Math.max(1, sales.length)) * 100}%`, background: barColor[s], animationDelay: `${400 + idx * 100}ms` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="آخرین صورتحساب‌ها" className="mt-4" delay={350}>
        <Table head={['نوع', 'شماره', 'تاریخ', 'طرف حساب', 'مبلغ', 'وضعیت']}>
          {latest.map((i) => (
            <tr key={i.id}>
              <td>{i.type === 'sale' ? 'فروش' : 'خرید'}</td>
              <td>
                <Link className="text-brand-600 hover:underline" to={i.type === 'sale' ? `/einvoices/${i.id}` : '/purchases'}>
                  {fmt(i.number)}
                </Link>
              </td>
              <td>{jdate(i.date)}</td>
              <td>{db.parties.find((p) => p.id === i.partyId)?.name}</td>
              <td>{money(totalOf(i))}</td>
              <td>
                <StatusBadge status={i.status} cancelled={i.cancelled} />
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
