import type { DB, Invoice, JournalEntry } from '../types'
import { totalOf } from './calc'
import { chart } from './accounts'
import { monthKey } from './format'

export const inRange = (date: string, from?: string, to?: string) => (!from || date >= from) && (!to || date <= to)

/** فاکتورهای قطعی (فروش: تأییدشده، خرید: ثبت‌شده) و غیرباطل */
export const posted = (inv: Invoice) => inv.status === 'confirmed' && !inv.cancelled

export const salesIn = (db: DB, from?: string, to?: string) => db.invoices.filter((i) => i.type === 'sale' && posted(i) && inRange(i.date, from, to))
export const purchasesIn = (db: DB, from?: string, to?: string) => db.invoices.filter((i) => i.type === 'purchase' && posted(i) && inRange(i.date, from, to))

export const journalIn = (db: DB, from?: string, to?: string): JournalEntry[] => db.journal.filter((j) => inRange(j.date, from, to))

export interface LedgerRow {
  code: string
  title: string
  debit: number
  credit: number
  balance: number // بدهکار مثبت
}

export function trialBalance(db: DB, from?: string, to?: string): LedgerRow[] {
  const m = new Map<string, { debit: number; credit: number }>()
  journalIn(db, from, to).forEach((j) =>
    j.lines.forEach((l) => {
      const c = m.get(l.account) ?? { debit: 0, credit: 0 }
      c.debit += l.debit
      c.credit += l.credit
      m.set(l.account, c)
    }),
  )
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, v]) => ({ code, title: chart[code]?.title ?? code, ...v, balance: v.debit - v.credit }))
}

export function profitLoss(db: DB, from?: string, to?: string) {
  const rows = trialBalance(db, from, to)
  const revenue = rows.filter((r) => chart[r.code]?.type === 'revenue').reduce((s, r) => s + (r.credit - r.debit), 0)
  const purchases = rows.find((r) => r.code === '5101')
  const expenses = rows.find((r) => r.code === '5201')
  const cogs = purchases ? purchases.debit - purchases.credit : 0
  const opex = expenses ? expenses.debit - expenses.credit : 0
  return { revenue, cogs, opex, profit: revenue - cogs - opex }
}

export interface PartyBalance {
  id: string
  name: string
  sales: number
  purchases: number
  received: number
  paid: number
  balance: number // مثبت: بدهکار (طلب ما)، منفی: بستانکار (بدهی ما)
}

export function partyBalances(db: DB, to?: string): PartyBalance[] {
  return db.parties.map((p) => {
    const sales = db.invoices.filter((i) => i.type === 'sale' && posted(i) && i.partyId === p.id && inRange(i.date, undefined, to)).reduce((s, i) => s + totalOf(i), 0)
    const purchases = db.invoices.filter((i) => i.type === 'purchase' && posted(i) && i.partyId === p.id && inRange(i.date, undefined, to)).reduce((s, i) => s + totalOf(i), 0)
    const received = db.payments.filter((x) => x.partyId === p.id && x.direction === 'in' && inRange(x.date, undefined, to)).reduce((s, x) => s + x.amount, 0)
    const paid = db.payments.filter((x) => x.partyId === p.id && x.direction === 'out' && inRange(x.date, undefined, to)).reduce((s, x) => s + x.amount, 0)
    return { id: p.id, name: p.name, sales, purchases, received, paid, balance: sales - received - (purchases - paid) }
  })
}

export function monthlySeries(db: DB) {
  const m = new Map<string, { key: string; sales: number; expense: number }>()
  const bucket = (date: string) => {
    const k = monthKey(date)
    if (!m.has(k)) m.set(k, { key: k, sales: 0, expense: 0 })
    return m.get(k)!
  }
  const sorted = [...db.invoices].sort((a, b) => a.date.localeCompare(b.date))
  sorted.filter((i) => posted(i)).forEach((i) => {
    const t = totalOf(i)
    if (i.type === 'sale') bucket(i.date).sales += t
    else bucket(i.date).expense += t
  })
  db.journal
    .filter((j) => !j.auto)
    .forEach((j) => j.lines.filter((l) => l.account === '5201').forEach((l) => (bucket(j.date).expense += l.debit - l.credit)))
  return [...m.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).slice(-6)
}
