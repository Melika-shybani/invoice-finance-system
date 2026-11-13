import type { DB, Invoice } from '../types'
import { invoiceTotals } from './calc'
import { today } from './format'

export interface Issue {
  level: 'error' | 'warning'
  field: string
  message: string
}

const digits = (s: string, min: number, max = min) => new RegExp(`^\\d{${min},${max}}$`).test(s)

/** اعتبارسنجی اطلاعات صورتحساب پیش از ارسال به سامانه مالیاتی */
export function validateInvoice(inv: Invoice, db: DB): Issue[] {
  const out: Issue[] = []
  const err = (field: string, message: string) => out.push({ level: 'error', field, message })
  const warn = (field: string, message: string) => out.push({ level: 'warning', field, message })
  const s = db.settings

  if (!inv.date) err('date', 'تاریخ صورتحساب وارد نشده است.')
  else if (inv.date > today()) err('date', 'تاریخ صورتحساب نمی‌تواند در آینده باشد.')

  if (!digits(s.sellerEconomicCode, 12, 14)) err('seller', 'کد اقتصادی فروشنده (شرکت) نامعتبر است.')
  if (s.memoryCode.length !== 6) err('seller', 'شناسه حافظه مالیاتی باید ۶ کاراکتر باشد.')

  const party = db.parties.find((p) => p.id === inv.partyId)
  if (!party) err('party', 'طرف حساب انتخاب نشده است.')
  else {
    if (!digits(party.nationalId, 10, 11)) err('party', 'شناسه/کد ملی طرف حساب باید ۱۰ یا ۱۱ رقم باشد.')
    if (inv.type === 'sale' && party.nationalId.length === 11 && !digits(party.economicCode, 12, 14))
      err('party', 'برای مشتری حقوقی، کد اقتصادی ۱۲ تا ۱۴ رقمی الزامی است.')
    if (!party.phone) warn('party', 'شماره تماس طرف حساب ثبت نشده است.')
    if (!party.address) warn('party', 'نشانی طرف حساب ثبت نشده است.')
  }

  if (inv.lines.length === 0) err('lines', 'حداقل یک ردیف کالا/خدمت لازم است.')
  inv.lines.forEach((l, i) => {
    const n = i + 1
    if (!l.itemId) err('lines', `ردیف ${n}: کالا/خدمت انتخاب نشده است.`)
    if (!(l.qty > 0)) err('lines', `ردیف ${n}: تعداد باید بزرگ‌تر از صفر باشد.`)
    if (l.unitPrice < 0) err('lines', `ردیف ${n}: قیمت واحد نمی‌تواند منفی باشد.`)
    if (l.discount < 0 || l.discount > l.qty * l.unitPrice) err('lines', `ردیف ${n}: مبلغ تخفیف نامعتبر است.`)
    if (l.taxRate < 0 || l.taxRate > 100) err('lines', `ردیف ${n}: نرخ مالیات نامعتبر است.`)
    const item = db.items.find((x) => x.id === l.itemId)
    if (item && item.kind === 'good' && inv.type === 'sale' && l.qty > item.stock)
      warn('lines', `ردیف ${n}: موجودی «${item.title}» (${item.stock}) کمتر از تعداد است.`)
  })

  const t = invoiceTotals(inv.lines)
  if (inv.lines.length && t.total <= 0) err('total', 'مبلغ کل صورتحساب باید بزرگ‌تر از صفر باشد.')
  if (t.total > 5_000_000_000) warn('total', 'مبلغ بالای ۵ میلیارد ریال است و ممکن است در سامانه مالیاتی رد شود.')

  return out
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.level === 'error')
