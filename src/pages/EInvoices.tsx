import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDB } from '../api/store'
import { markReady, sendInvoice } from '../api/invoiceFlow'
import { useAuth } from '../auth'
import { Button, Card, PageHeader, StatusBadge, Table } from '../components/ui'
import { totalOf } from '../lib/calc'
import { fmt, jdate, money, statusLabel } from '../lib/format'
import type { InvoiceStatus } from '../types'

const tabs: (InvoiceStatus | 'all')[] = ['all', 'draft', 'ready', 'sent', 'confirmed', 'rejected']

export default function EInvoices() {
  const db = useDB()
  const { user } = useAuth()
  const [tab, setTab] = useState<InvoiceStatus | 'all'>('all')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)

  const all = db.invoices.filter((i) => i.type === 'sale').sort((a, b) => b.number - a.number)
  const rows = all.filter((i) => (tab === 'all' || i.status === tab) && (!q || String(i.number).includes(q) || i.taxId.includes(q.toUpperCase())))
  const canSend = user?.role !== 'sales'
  const readyCount = all.filter((i) => i.status === 'ready' && !i.cancelled).length

  const sendAllReady = async () => {
    setBusy(true)
    await Promise.all(all.filter((i) => i.status === 'ready' && !i.cancelled).map((i) => sendInvoice(i.id, user!.fullName)))
    setBusy(false)
  }
  const validateDrafts = () => all.filter((i) => i.status === 'draft' && !i.cancelled).forEach((i) => markReady(i.id, user!.fullName))

  return (
    <>
      <PageHeader
        title="صورتحساب‌های الکترونیکی"
        subtitle="مدیریت وضعیت، اعتبارسنجی و ارسال صورتحساب به سامانه مالیاتی (شبیه‌سازی‌شده)"
        actions={
          <>
            {canSend && <Button variant="secondary" onClick={validateDrafts}>اعتبارسنجی همه پیش‌نویس‌ها</Button>}
            {canSend && (
              <Button disabled={!readyCount || busy} onClick={sendAllReady}>
                {busy ? 'در حال ارسال…' : `ارسال آماده‌ها (${fmt(readyCount)})`}
              </Button>
            )}
            <Link to="/sales/new"><Button variant="secondary">+ فاکتور فروش جدید</Button></Link>
          </>
        }
      />
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-sm ${tab === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {t === 'all' ? 'همه' : statusLabel[t]} ({fmt(t === 'all' ? all.length : all.filter((i) => i.status === t).length)})
              </button>
            ))}
          </div>
          <input className="!w-60" placeholder="جستجو شماره یا شناسه یکتا…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Table head={['شماره', 'تاریخ', 'مشتری', 'مبلغ کل', 'شناسه یکتا', 'وضعیت', '']} empty={rows.length === 0}>
          {rows.map((i) => (
            <tr key={i.id} className="hover:bg-slate-50">
              <td>{fmt(i.number)}{i.refId && <span className="ms-1 text-xs text-amber-600">(اصلاحیه)</span>}</td>
              <td>{jdate(i.date)}</td>
              <td>{db.parties.find((p) => p.id === i.partyId)?.name}</td>
              <td>{money(totalOf(i))}</td>
              <td className="num text-xs text-slate-500">{i.taxId}</td>
              <td><StatusBadge status={i.status} cancelled={i.cancelled} /></td>
              <td><Link className="text-brand-600 hover:underline" to={`/einvoices/${i.id}`}>جزئیات</Link></td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
