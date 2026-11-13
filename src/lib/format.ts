import type { InvoiceStatus, Role } from '../types'

const nf = new Intl.NumberFormat('fa-IR')
export const fmt = (n: number) => nf.format(Math.round(n))
export const money = (n: number) => `${fmt(n)} ریال`

const df = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' })
const dtf = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})
const mf = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long' })

export const jdate = (iso: string) => (iso ? df.format(new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''))) : '—')
export const jdatetime = (iso: string) => dtf.format(new Date(iso))
export const jmonth = (iso: string) => mf.format(new Date(iso + 'T12:00:00'))

export const today = () => new Date().toISOString().slice(0, 10)
export const monthKey = (iso: string) => df.format(new Date(iso + 'T12:00:00')).slice(0, 7)

export const statusLabel: Record<InvoiceStatus | 'cancelled', string> = {
  draft: 'پیش‌نویس',
  ready: 'آماده ارسال',
  sent: 'ارسال‌شده',
  confirmed: 'تأییدشده',
  rejected: 'ردشده',
  cancelled: 'باطل‌شده',
}

export const statusColor: Record<InvoiceStatus | 'cancelled', string> = {
  draft: 'bg-slate-100 text-slate-700',
  ready: 'bg-amber-100 text-amber-800',
  sent: 'bg-sky-100 text-sky-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-zinc-200 text-zinc-600 line-through',
}

export const roleLabel: Record<Role, string> = {
  admin: 'مدیر سیستم',
  accountant: 'حسابدار',
  sales: 'کاربر فروش',
}

export const methodLabel = { cash: 'نقد', card: 'کارتخوان', transfer: 'حواله/انتقال', cheque: 'چک' } as const

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const csv = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename + '.csv'
  a.click()
  URL.revokeObjectURL(url)
}
