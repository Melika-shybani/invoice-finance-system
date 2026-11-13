export type Role = 'admin' | 'accountant' | 'sales'

export interface User {
  id: string
  username: string
  password: string // فقط برای دمو؛ در بک‌اند واقعی هرگز در فرانت نگهداری نمی‌شود
  fullName: string
  role: Role
  active: boolean
}

export type PartyKind = 'customer' | 'supplier' | 'both'
export interface Party {
  id: string
  kind: PartyKind
  name: string
  nationalId: string // شناسه ملی (۱۱ رقم حقوقی) یا کد ملی (۱۰ رقم حقیقی)
  economicCode: string // کد اقتصادی (۱۲ تا ۱۴ رقم)
  phone: string
  address: string
}

export interface Item {
  id: string
  code: string
  title: string
  kind: 'good' | 'service'
  price: number
  taxRate: number // درصد
  stock: number
}

export interface InvoiceLine {
  itemId: string
  title: string
  qty: number
  unitPrice: number
  discount: number // مبلغ تخفیف ردیف
  taxRate: number
}

export type InvoiceStatus = 'draft' | 'ready' | 'sent' | 'confirmed' | 'rejected'
export type InvoiceType = 'sale' | 'purchase'

export interface StatusChange {
  at: string // ISO datetime
  from: InvoiceStatus | null
  to: InvoiceStatus | 'cancelled'
  by: string
  note?: string
}

export interface Invoice {
  id: string
  number: number
  type: InvoiceType
  date: string // yyyy-mm-dd
  partyId: string
  lines: InvoiceLine[]
  status: InvoiceStatus
  cancelled: boolean
  taxId: string // شناسه یکتای صورتحساب
  taxRef?: string // شماره پیگیری سامانه مالیاتی
  rejectReasons?: string[]
  refId?: string // اصلاحیه‌ی کدام صورتحساب
  history: StatusChange[]
  description?: string
}

export interface CashAccount {
  id: string
  kind: 'cash' | 'bank'
  title: string
  accountNo?: string
  initial: number
}

export interface Payment {
  id: string
  number: number
  direction: 'in' | 'out' // دریافت / پرداخت
  date: string
  partyId: string
  accountId: string
  amount: number
  method: 'cash' | 'card' | 'transfer' | 'cheque'
  invoiceId?: string
  description?: string
}

export interface JournalLine {
  account: string // کد حساب
  debit: number
  credit: number
}
export interface JournalEntry {
  id: string
  number: number
  date: string
  description: string
  lines: JournalLine[]
  auto?: boolean
  refId?: string // فاکتور یا دریافت/پرداخت مرتبط
}

export interface TaxLogEntry {
  id: string
  at: string
  method: 'POST'
  url: string
  request: unknown
  status: number
  response: unknown
  ms: number
}

export interface Settings {
  sellerName: string
  sellerEconomicCode: string
  sellerNationalId: string
  memoryCode: string // شناسه حافظه مالیاتی ۶ کاراکتری
  sim: { latencyMs: number; failRate: number; forceReject: boolean }
}

export interface DB {
  users: User[]
  parties: Party[]
  items: Item[]
  invoices: Invoice[]
  accounts: CashAccount[]
  payments: Payment[]
  journal: JournalEntry[]
  taxLog: TaxLogEntry[]
  settings: Settings
}
