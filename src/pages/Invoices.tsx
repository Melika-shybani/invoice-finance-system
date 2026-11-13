import { Link } from 'react-router-dom'
import { useDB } from '../api/store'
import { useAuth } from '../auth'
import { Button, Card, PageHeader, StatusBadge, Table } from '../components/ui'
import { invoiceTotals } from '../lib/calc'
import { fmt, jdate, money } from '../lib/format'
import type { InvoiceType } from '../types'

export default function Invoices({ type }: { type: InvoiceType }) {
  const db = useDB()
  const { user } = useAuth()
  const sale = type === 'sale'
  const rows = db.invoices.filter((i) => i.type === type).sort((a, b) => b.number - a.number)
  const isSalesOnly = user?.role === 'sales'

  return (
    <>
      <PageHeader
        title={sale ? 'فاکتورهای فروش' : 'فاکتورهای خرید'}
        subtitle={sale ? 'فاکتورهای فروش پس از اعتبارسنجی و تأیید سامانه مالیاتی قطعی می‌شوند.' : 'فاکتورهای خرید مستقیماً ثبت قطعی می‌شوند و در سند حسابداری اعمال می‌گردند.'}
        actions={<Link to={sale ? '/sales/new' : '/purchases/new'}><Button>+ {sale ? 'فاکتور فروش جدید' : 'فاکتور خرید جدید'}</Button></Link>}
      />
      <Card>
        <Table head={['شماره', 'تاریخ', sale ? 'مشتری' : 'تأمین‌کننده', 'جمع کل', 'تخفیف', 'مالیات', 'قابل پرداخت', 'وضعیت', '']} empty={rows.length === 0}>
          {rows.map((i) => {
            const t = invoiceTotals(i.lines)
            return (
              <tr key={i.id} className="hover:bg-slate-50">
                <td>{fmt(i.number)}</td>
                <td>{jdate(i.date)}</td>
                <td>{db.parties.find((p) => p.id === i.partyId)?.name}</td>
                <td>{fmt(t.gross)}</td>
                <td>{fmt(t.discount)}</td>
                <td>{fmt(t.tax)}</td>
                <td className="font-medium">{money(t.total)}</td>
                <td><StatusBadge status={i.status} cancelled={i.cancelled} /></td>
                <td>{sale ? <Link className="text-brand-600 hover:underline" to={`/einvoices/${i.id}`}>جزئیات</Link> : !isSalesOnly && <PurchaseCancel id={i.id} cancelled={i.cancelled} />}</td>
              </tr>
            )
          })}
        </Table>
      </Card>
    </>
  )
}

import { mutate } from '../api/store'
import { cancelInvoice } from '../api/actions'
function PurchaseCancel({ id, cancelled }: { id: string; cancelled: boolean }) {
  const { user } = useAuth()
  if (cancelled) return null
  return (
    <button className="text-rose-600 hover:underline" onClick={() => { const r = prompt('دلیل ابطال فاکتور خرید؟'); if (r) mutate((d) => cancelInvoice(d, id, user!.fullName, r)) }}>
      ابطال
    </button>
  )
}
