import { useSyncExternalStore } from 'react'
import type { DB } from '../types'
import { addJournal, addPayment, createInvoice, setStatus } from './actions'

const KEY = 'ifs-db-v2'

function seed(): DB {
  const d: DB = {
    users: [
      { id: 'u1', username: 'admin', password: 'admin123', fullName: 'مدیر سیستم', role: 'admin', active: true },
      { id: 'u2', username: 'acc', password: 'acc123', fullName: 'سارا حسابدار', role: 'accountant', active: true },
      { id: 'u3', username: 'sales', password: 'sales123', fullName: 'علی فروش', role: 'sales', active: true },
    ],
    parties: [
      { id: 'p1', kind: 'customer', name: 'شرکت آرین تجارت', nationalId: '10101234567', economicCode: '411234567890', phone: '02188776655', address: 'تهران، خیابان ولیعصر، پلاک ۱۲' },
      { id: 'p2', kind: 'customer', name: 'فروشگاه نیک‌آفرین', nationalId: '10209876543', economicCode: '411987654321', phone: '03132223344', address: 'اصفهان، چهارباغ بالا' },
      { id: 'p3', kind: 'customer', name: 'مریم احمدی', nationalId: '0012345678', economicCode: '', phone: '09121234567', address: 'کرج، گوهردشت' },
      { id: 'p4', kind: 'supplier', name: 'تأمین‌کالای پارس', nationalId: '10301112223', economicCode: '411112223334', phone: '02155443322', address: 'تهران، شهرک صنعتی عباس‌آباد' },
      { id: 'p5', kind: 'both', name: 'صنایع پیشرو', nationalId: '10405556667', economicCode: '411555666778', phone: '05138887766', address: 'مشهد، بلوار وکیل‌آباد' },
    ],
    items: [
      { id: 'i1', code: '1001', title: 'لپ‌تاپ ۱۵ اینچ', kind: 'good', price: 450_000_000, taxRate: 10, stock: 25 },
      { id: 'i2', code: '1002', title: 'ماوس بی‌سیم', kind: 'good', price: 8_500_000, taxRate: 10, stock: 120 },
      { id: 'i3', code: '1003', title: 'مانیتور ۲۴ اینچ', kind: 'good', price: 120_000_000, taxRate: 10, stock: 40 },
      { id: 'i4', code: '2001', title: 'خدمات نصب و راه‌اندازی', kind: 'service', price: 25_000_000, taxRate: 10, stock: 0 },
      { id: 'i5', code: '2002', title: 'قرارداد پشتیبانی ماهانه', kind: 'service', price: 60_000_000, taxRate: 10, stock: 0 },
    ],
    invoices: [],
    accounts: [
      { id: 'a1', kind: 'cash', title: 'صندوق مرکزی', initial: 50_000_000 },
      { id: 'a2', kind: 'bank', title: 'بانک ملی - جاری', accountNo: '0108 7654 3210', initial: 2_000_000_000 },
      { id: 'a3', kind: 'bank', title: 'بانک ملت - پس‌انداز', accountNo: '4455 1122 3300', initial: 500_000_000 },
    ],
    payments: [],
    journal: [],
    taxLog: [],
    settings: {
      sellerName: 'شرکت نمونه فناوری',
      sellerEconomicCode: '411000111222',
      sellerNationalId: '10100000001',
      memoryCode: 'A1B2C3',
      sim: { latencyMs: 1200, failRate: 0.1, forceReject: false },
    },
  }
  addJournal(d, {
    date: daysAgo(150),
    description: 'سند افتتاحیه',
    lines: [
      { account: '1101', debit: 50_000_000, credit: 0 },
      { account: '1102', debit: 2_500_000_000, credit: 0 },
      { account: '3101', debit: 0, credit: 2_550_000_000 },
    ],
    auto: true,
  })
  const line = (itemId: string, qty: number, discount = 0) => {
    const it = d.items.find((x) => x.id === itemId)!
    return { itemId, title: it.title, qty, unitPrice: it.price, discount, taxRate: it.taxRate }
  }
  const sale = (days: number, party: string, lines: ReturnType<typeof line>[], final: 'confirmed' | 'sent' | 'ready' | 'draft' | 'rejected') => {
    const inv = createInvoice(d, { type: 'sale', date: daysAgo(days), partyId: party, lines }, 'علی فروش')
    if (final === 'draft') return
    setStatus(d, inv.id, 'ready', 'سارا حسابدار', 'اعتبارسنجی موفق')
    if (final === 'ready') return
    setStatus(d, inv.id, 'sent', 'سارا حسابدار', 'ارسال به سامانه مالیاتی')
    if (final === 'sent') return
    if (final === 'rejected') return setStatus(d, inv.id, 'rejected', 'سامانه مالیاتی', 'E107: جمع ردیف‌ها همخوانی ندارد', { rejectReasons: ['E107: جمع ردیف‌ها با مبلغ کل همخوانی ندارد.'] })
    setStatus(d, inv.id, 'confirmed', 'سامانه مالیاتی', 'تأیید شد', { taxRef: 'TX-' + inv.number + 'K9' })
  }
  sale(110, 'p1', [line('i1', 3), line('i4', 2)], 'confirmed')
  sale(85, 'p2', [line('i3', 5, 10_000_000)], 'confirmed')
  sale(60, 'p1', [line('i2', 20), line('i5', 1)], 'confirmed')
  sale(40, 'p3', [line('i2', 2)], 'confirmed')
  sale(25, 'p2', [line('i1', 1), line('i5', 2)], 'confirmed')
  sale(12, 'p5', [line('i3', 2)], 'sent')
  sale(6, 'p1', [line('i4', 4)], 'rejected')
  sale(3, 'p2', [line('i2', 5)], 'ready')
  sale(1, 'p3', [line('i5', 1)], 'draft')
  const buy = (days: number, party: string, lines: ReturnType<typeof line>[]) =>
    createInvoice(d, { type: 'purchase', date: daysAgo(days), partyId: party, lines }, 'سارا حسابدار')
  buy(120, 'p4', [line('i1', 2), line('i3', 3)])
  buy(70, 'p5', [line('i2', 50)])
  buy(30, 'p4', [line('i3', 2)])
  const pay = (days: number, dir: 'in' | 'out', party: string, acc: string, amount: number) =>
    addPayment(d, { direction: dir, date: daysAgo(days), partyId: party, accountId: acc, amount, method: 'transfer' })
  pay(100, 'in', 'p1', 'a2', 1_000_000_000)
  pay(80, 'in', 'p2', 'a2', 300_000_000)
  pay(50, 'out', 'p4', 'a2', 1_000_000_000)
  pay(20, 'in', 'p3', 'a1', 10_000_000)
  addJournal(d, {
    date: daysAgo(15),
    description: 'هزینه اجاره دفتر',
    lines: [
      { account: '5201', debit: 120_000_000, credit: 0 },
      { account: '1102', debit: 0, credit: 120_000_000 },
    ],
  })
  return d
}

function daysAgo(n: number) {
  const x = new Date()
  x.setDate(x.getDate() - n)
  return x.toISOString().slice(0, 10)
}

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    /* ignore */
  }
  const d = seed()
  persist(d)
  return d
}

function persist(d: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d))
  } catch {
    /* ignore */
  }
}

let state: DB = load()
const listeners = new Set<() => void>()

export const getDB = () => state
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function mutate<T = void>(fn: (d: DB) => T): T {
  const next = structuredClone(state)
  const r = fn(next)
  state = next
  persist(state)
  listeners.forEach((l) => l())
  return r
}

export function resetDB() {
  state = seed()
  persist(state)
  listeners.forEach((l) => l())
}

export const useDB = () => useSyncExternalStore(subscribe, getDB, getDB)
