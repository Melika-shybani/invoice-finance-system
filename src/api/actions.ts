import type { DB, Invoice, InvoiceStatus, JournalEntry, Payment } from '../types'
import { generateTaxId, invoiceTotals } from '../lib/calc'

/**
 * منطق دامنه روی یک شیء DB (mutable). وقتی بک‌اند واقعی آماده شد،
 * هر کدام از این توابع به یک endpoint REST تبدیل می‌شود.
 */

const nextNum = (xs: { number: number }[]) => xs.reduce((m, x) => Math.max(m, x.number), 0) + 1
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function pushHistory(inv: Invoice, to: StatusTarget, by: string, note?: string, at = new Date().toISOString()) {
  const from: InvoiceStatus | null = inv.history.length ? lastStatus(inv) : null
  inv.history.push({ at, from, to, by, note })
}
type StatusTarget = InvoiceStatus | 'cancelled'
const lastStatus = (inv: Invoice): InvoiceStatus => inv.status

export type InvoiceInput = Pick<Invoice, 'type' | 'date' | 'partyId' | 'lines' | 'description' | 'refId'>

export function createInvoice(d: DB, input: InvoiceInput, by: string, at?: string): Invoice {
  const number = nextNum(d.invoices.filter((i) => i.type === input.type))
  const serial = nextNum(d.invoices)
  const isPurchase = input.type === 'purchase'
  const inv: Invoice = {
    id: uid(),
    number,
    ...input,
    status: isPurchase ? 'confirmed' : 'draft',
    cancelled: false,
    taxId: generateTaxId(d.settings.memoryCode, input.date, serial),
    history: [],
  }
  pushHistory(inv, inv.status, by, isPurchase ? 'ثبت فاکتور خرید' : 'ایجاد پیش‌نویس', at)
  d.invoices.push(inv)
  if (isPurchase) finalize(d, inv, at)
  return inv
}

export function updateInvoice(d: DB, id: string, input: InvoiceInput, by: string) {
  const inv = d.invoices.find((i) => i.id === id)
  if (!inv) return
  if (inv.type === 'purchase' || !['draft', 'ready', 'rejected'].includes(inv.status)) throw new Error('این صورتحساب قابل ویرایش نیست.')
  Object.assign(inv, input)
  const prev = inv.status
  inv.status = 'draft'
  inv.rejectReasons = undefined
  inv.history.push({ at: new Date().toISOString(), from: prev, to: 'draft', by, note: 'اصلاح اطلاعات' })
}

export function setStatus(d: DB, id: string, to: InvoiceStatus, by: string, note?: string, patch?: Partial<Invoice>) {
  const inv = d.invoices.find((i) => i.id === id)
  if (!inv) return
  const from = inv.status
  inv.status = to
  Object.assign(inv, patch)
  inv.history.push({ at: new Date().toISOString(), from, to, by, note })
  if (to === 'confirmed') finalize(d, inv)
}

export function deleteDraft(d: DB, id: string) {
  const i = d.invoices.findIndex((x) => x.id === id)
  if (i >= 0 && d.invoices[i].status === 'draft') d.invoices.splice(i, 1)
}

/** ایجاد پیش‌نویس اصلاحیه از روی صورتحساب ارسال‌شده/تأییدشده */
export function amendInvoice(d: DB, id: string, by: string): Invoice | undefined {
  const o = d.invoices.find((i) => i.id === id)
  if (!o) return
  const copy = createInvoice(d, { type: o.type, date: o.date, partyId: o.partyId, lines: structuredClone(o.lines), description: `اصلاحیه صورتحساب شماره ${o.number}`, refId: o.id }, by)
  return copy
}

export function cancelInvoice(d: DB, id: string, by: string, reason: string) {
  const inv = d.invoices.find((i) => i.id === id)
  if (!inv || inv.cancelled || inv.status === 'draft') return
  const wasPosted = inv.status === 'confirmed'
  inv.cancelled = true
  inv.history.push({ at: new Date().toISOString(), from: inv.status, to: 'cancelled', by, note: reason })
  if (wasPosted) {
    const sign = inv.type === 'sale' ? 1 : -1
    inv.lines.forEach((l) => {
      const it = d.items.find((x) => x.id === l.itemId)
      if (it && it.kind === 'good') it.stock += sign * l.qty
    })
    const orig = d.journal.find((j) => j.refId === inv.id && j.auto)
    if (orig)
      d.journal.push({
        id: uid(),
        number: nextNum(d.journal),
        date: new Date().toISOString().slice(0, 10),
        description: `ابطال صورتحساب ${inv.type === 'sale' ? 'فروش' : 'خرید'} شماره ${inv.number}`,
        lines: orig.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit })),
        auto: true,
        refId: inv.id + ':cancel',
      })
  }
}

/** پس از تأیید نهایی: سند حسابداری خودکار + تغییر موجودی */
function finalize(d: DB, inv: Invoice, _at?: string) {
  const t = invoiceTotals(inv.lines)
  const sale = inv.type === 'sale'
  inv.lines.forEach((l) => {
    const it = d.items.find((x) => x.id === l.itemId)
    if (it && it.kind === 'good') it.stock += (sale ? -1 : 1) * l.qty
  })
  const lines = sale
    ? [
        { account: '1201', debit: t.total, credit: 0 },
        { account: '4101', debit: 0, credit: t.net },
        { account: '2201', debit: 0, credit: t.tax },
      ]
    : [
        { account: '5101', debit: t.net, credit: 0 },
        { account: '2201', debit: t.tax, credit: 0 },
        { account: '2101', debit: 0, credit: t.total },
      ]
  d.journal.push({
    id: uid(),
    number: nextNum(d.journal),
    date: inv.date,
    description: `فاکتور ${sale ? 'فروش' : 'خرید'} شماره ${inv.number}`,
    lines: lines.filter((l) => l.debit || l.credit),
    auto: true,
    refId: inv.id,
  })
}

export function addPayment(d: DB, input: Omit<Payment, 'id' | 'number'>): Payment {
  const p: Payment = { ...input, id: uid(), number: nextNum(d.payments) }
  d.payments.push(p)
  const acc = d.accounts.find((a) => a.id === p.accountId)
  const cashCode = acc?.kind === 'bank' ? '1102' : '1101'
  const party = d.parties.find((x) => x.id === p.partyId)
  const inn = p.direction === 'in'
  d.journal.push({
    id: uid(),
    number: nextNum(d.journal),
    date: p.date,
    description: `${inn ? 'دریافت از' : 'پرداخت به'} ${party?.name ?? ''} (${p.number})`,
    lines: inn
      ? [
          { account: cashCode, debit: p.amount, credit: 0 },
          { account: '1201', debit: 0, credit: p.amount },
        ]
      : [
          { account: '2101', debit: p.amount, credit: 0 },
          { account: cashCode, debit: 0, credit: p.amount },
        ],
    auto: true,
    refId: p.id,
  })
  return p
}

export function addJournal(d: DB, input: Omit<JournalEntry, 'id' | 'number'>) {
  const dr = input.lines.reduce((s, l) => s + l.debit, 0)
  const cr = input.lines.reduce((s, l) => s + l.credit, 0)
  if (dr !== cr || dr === 0) throw new Error('سند تراز نیست.')
  d.journal.push({ ...input, id: uid(), number: nextNum(d.journal) })
}

/** مانده هر حساب صندوق/بانک */
export function accountBalance(d: DB, accountId: string) {
  const a = d.accounts.find((x) => x.id === accountId)
  if (!a) return 0
  return d.payments.filter((p) => p.accountId === accountId).reduce((s, p) => s + (p.direction === 'in' ? p.amount : -p.amount), a.initial)
}
