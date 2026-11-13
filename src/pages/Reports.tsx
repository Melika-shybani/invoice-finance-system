import { useState } from 'react'
import { useDB } from '../api/store'
import { Button, Card, PageHeader } from '../components/ui'
import { invoiceTotals, totalOf } from '../lib/calc'
import { accountTitle } from '../lib/accounts'
import { downloadCsv, fmt, jdate } from '../lib/format'
import { inRange, journalIn, partyBalances, posted, profitLoss, purchasesIn, salesIn, trialBalance } from '../lib/reports'

type Cell = string | number
interface Report {
  title: string
  head: string[]
  rows: Cell[][]
  total?: Cell[]
}

const tabs = [
  ['sales', 'گزارش فروش'],
  ['purchases', 'گزارش خرید و هزینه‌ها'],
  ['balances', 'بدهکاران و بستانکاران'],
  ['ledger', 'گردش حساب مشتری'],
  ['pl', 'سود و زیان'],
  ['journal', 'دفتر روزنامه'],
  ['gl', 'دفتر کل'],
] as const
type Tab = (typeof tabs)[number][0]

const sum = (rows: Cell[][], i: number) => rows.reduce((s, r) => s + (typeof r[i] === 'number' ? (r[i] as number) : 0), 0)

export default function Reports() {
  const db = useDB()
  const [tab, setTab] = useState<Tab>('sales')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [partyId, setPartyId] = useState(db.parties[0]?.id ?? '')
  const name = (id: string) => db.parties.find((p) => p.id === id)?.name ?? ''

  const build = (): Report => {
    switch (tab) {
      case 'sales': {
        const rows = salesIn(db, from, to).map((i) => {
          const t = invoiceTotals(i.lines)
          return [i.number, jdate(i.date), name(i.partyId), t.gross, t.discount, t.tax, t.total]
        })
        return { title: 'گزارش فروش', head: ['شماره', 'تاریخ', 'مشتری', 'جمع', 'تخفیف', 'مالیات', 'مبلغ نهایی'], rows, total: ['جمع کل', '', '', sum(rows, 3), sum(rows, 4), sum(rows, 5), sum(rows, 6)] }
      }
      case 'purchases': {
        const inv = purchasesIn(db, from, to).map((i) => [`خرید ${fmt(i.number)}`, jdate(i.date), name(i.partyId), totalOf(i)])
        const exp = journalIn(db, from, to)
          .filter((j) => !j.auto)
          .flatMap((j) => j.lines.filter((l) => l.account === '5201' && l.debit > 0).map((l) => ['هزینه', jdate(j.date), j.description, l.debit]))
        const rows = [...inv, ...exp]
        return { title: 'گزارش خرید و هزینه‌ها', head: ['نوع/شماره', 'تاریخ', 'تأمین‌کننده / شرح', 'مبلغ'], rows, total: ['جمع کل', '', '', sum(rows, 3)] }
      }
      case 'balances': {
        const rows = partyBalances(db, to).filter((p) => p.balance !== 0).map((p) => [p.name, p.balance > 0 ? 'بدهکار' : 'بستانکار', Math.abs(p.balance)])
        const debt = partyBalances(db, to).filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0)
        const cred = partyBalances(db, to).filter((p) => p.balance < 0).reduce((s, p) => s - p.balance, 0)
        return { title: 'گزارش بدهکاران و بستانکاران', head: ['طرف حساب', 'وضعیت', 'مانده (ریال)'], rows, total: [`کل بدهکاران: ${fmt(debt)}`, `کل بستانکاران: ${fmt(cred)}`, ''] }
      }
      case 'ledger': {
        type Ev = { date: string; desc: string; debit: number; credit: number }
        const ev: Ev[] = [
          ...db.invoices.filter((i) => posted(i) && i.partyId === partyId && inRange(i.date, from, to)).map((i) => (i.type === 'sale' ? { date: i.date, desc: `فاکتور فروش ${fmt(i.number)}`, debit: totalOf(i), credit: 0 } : { date: i.date, desc: `فاکتور خرید ${fmt(i.number)}`, debit: 0, credit: totalOf(i) })),
          ...db.payments.filter((p) => p.partyId === partyId && inRange(p.date, from, to)).map((p) => (p.direction === 'in' ? { date: p.date, desc: `دریافت ${fmt(p.number)}`, debit: 0, credit: p.amount } : { date: p.date, desc: `پرداخت ${fmt(p.number)}`, debit: p.amount, credit: 0 })),
        ].sort((a, b) => a.date.localeCompare(b.date))
        let bal = 0
        const rows = ev.map((e) => {
          bal += e.debit - e.credit
          return [jdate(e.date), e.desc, e.debit, e.credit, bal]
        })
        return { title: `گردش حساب ${name(partyId)}`, head: ['تاریخ', 'شرح', 'بدهکار', 'بستانکار', 'مانده'], rows, total: ['جمع', '', sum(rows, 2), sum(rows, 3), bal] }
      }
      case 'pl': {
        const p = profitLoss(db, from, to)
        return {
          title: 'صورت سود و زیان ساده',
          head: ['شرح', 'مبلغ (ریال)'],
          rows: [['درآمد فروش (خالص)', p.revenue], ['بهای خرید', p.cogs], ['سود ناخالص', p.revenue - p.cogs], ['هزینه‌های عملیاتی', p.opex]],
          total: [p.profit >= 0 ? 'سود خالص' : 'زیان خالص', p.profit],
        }
      }
      case 'journal': {
        const rows = journalIn(db, from, to)
          .sort((a, b) => a.number - b.number || 0)
          .flatMap((j) => j.lines.map((l, i) => [i === 0 ? j.number : '', i === 0 ? jdate(j.date) : '', i === 0 ? j.description : '', accountTitle(l.account), l.debit, l.credit]))
        return { title: 'دفتر روزنامه', head: ['سند', 'تاریخ', 'شرح', 'حساب', 'بدهکار', 'بستانکار'], rows, total: ['جمع', '', '', '', sum(rows, 4), sum(rows, 5)] }
      }
      case 'gl': {
        const rows = trialBalance(db, from, to).map((r) => [r.code, r.title, r.debit, r.credit, r.balance])
        return { title: 'دفتر کل (تراز آزمایشی)', head: ['کد', 'حساب', 'گردش بدهکار', 'گردش بستانکار', 'مانده (بدهکار +)'], rows, total: ['جمع', '', sum(rows, 2), sum(rows, 3), sum(rows, 4)] }
      }
    }
  }
  const r = build()
  const show = (c: Cell) => (typeof c === 'number' ? fmt(c) : c)

  return (
    <>
      <PageHeader
        title="گزارش‌ها"
        actions={
          <>
            <Button variant="secondary" onClick={() => downloadCsv(r.title, [r.head, ...r.rows, ...(r.total ? [r.total] : [])])}>خروجی Excel</Button>
            <Button variant="secondary" onClick={() => window.print()}>خروجی PDF / چاپ</Button>
          </>
        }
      />
      <div className="no-print mb-4 flex flex-wrap gap-1">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1 text-sm ${tab === k ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}>{l}</button>
        ))}
      </div>
      <Card className="no-print mb-4">
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label>از تاریخ <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label>تا تاریخ <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          {tab === 'ledger' && (
            <label>طرف حساب
              <select value={partyId} onChange={(e) => setPartyId(e.target.value)}>{db.parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            </label>
          )}
          {(from || to) && <Button variant="ghost" onClick={() => { setFrom(''); setTo('') }}>حذف فیلتر</Button>}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{r.title}</h2>
          <span className="text-xs text-slate-500">{from || to ? `بازه: ${from ? jdate(from) : '…'} تا ${to ? jdate(to) : '…'}` : 'کل دوره'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-200 text-slate-500">{r.head.map((h) => <th key={h} className="px-3 py-2 text-start font-medium">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {r.rows.map((row, i) => <tr key={i}>{row.map((c, k) => <td key={k} className="px-3 py-2">{show(c)}</td>)}</tr>)}
            </tbody>
            {r.total && <tfoot><tr className="border-t-2 border-slate-300 font-bold">{r.total.map((c, k) => <td key={k} className="px-3 py-2">{show(c)}</td>)}</tr></tfoot>}
          </table>
          {r.rows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">داده‌ای در این بازه وجود ندارد.</p>}
        </div>
      </Card>
    </>
  )
}
