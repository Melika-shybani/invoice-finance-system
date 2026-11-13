import type { DB, Invoice, TaxLogEntry } from '../types'
import { invoiceTotals } from '../lib/calc'
import { uid } from './actions'

/**
 * شبیه‌ساز سامانه مالیاتی (Mock REST API).
 * درخواست POST /api/tax/invoices را شبیه‌سازی می‌کند: تأخیر شبکه، اعتبارسنجی سمت سرور،
 * خطای تصادفی و رد اجباری. برای اتصال به سرویس واقعی کافی است `callTaxService`
 * با fetch جایگزین شود.
 */

export interface TaxRequest {
  taxId: string
  indati: string
  inty: 1
  inno: number
  irtaxid: string | null
  seller: { name: string; economicCode: string; memoryCode: string }
  buyer: { name: string; nationalId: string; economicCode: string }
  header: { tprdis: number; tdis: number; tadis: number; tvam: number; tbill: number }
  body: { sstid: string; sstt: string; am: number; fee: number; dis: number; vra: number; vam: number; tsstam: number }[]
}

export interface TaxResponse {
  status: 'accepted' | 'rejected'
  referenceNumber?: string
  errors?: { code: string; message: string }[]
}

export function buildTaxRequest(inv: Invoice, db: DB): TaxRequest {
  const party = db.parties.find((p) => p.id === inv.partyId)
  const t = invoiceTotals(inv.lines)
  const orig = inv.refId ? db.invoices.find((i) => i.id === inv.refId) : undefined
  return {
    taxId: inv.taxId,
    indati: inv.date,
    inty: 1,
    inno: inv.number,
    irtaxid: orig?.taxId ?? null,
    seller: { name: db.settings.sellerName, economicCode: db.settings.sellerEconomicCode, memoryCode: db.settings.memoryCode },
    buyer: { name: party?.name ?? '', nationalId: party?.nationalId ?? '', economicCode: party?.economicCode ?? '' },
    header: { tprdis: t.gross, tdis: t.discount, tadis: t.net, tvam: t.tax, tbill: t.total },
    body: inv.lines.map((l) => {
      const lt = l.qty * l.unitPrice
      const net = lt - l.discount
      const vam = Math.round((net * l.taxRate) / 100)
      return { sstid: db.items.find((i) => i.id === l.itemId)?.code ?? '', sstt: l.title, am: l.qty, fee: l.unitPrice, dis: l.discount, vra: l.taxRate, vam, tsstam: net + vam }
    }),
  }
}

function serverValidate(r: TaxRequest, db: DB): { code: string; message: string }[] {
  const e: { code: string; message: string }[] = []
  if (!/^[0-9A-F]{23}$/.test(r.taxId)) e.push({ code: 'E101', message: 'ساختار شناسه یکتای مالیاتی نامعتبر است.' })
  if (!/^\d{12,14}$/.test(r.seller.economicCode)) e.push({ code: 'E102', message: 'کد اقتصادی فروشنده نامعتبر است.' })
  if (r.seller.memoryCode.length !== 6) e.push({ code: 'E103', message: 'شناسه حافظه مالیاتی نامعتبر است.' })
  if (!/^\d{10,11}$/.test(r.buyer.nationalId)) e.push({ code: 'E104', message: 'شناسه/کد ملی خریدار نامعتبر است.' })
  if (r.buyer.nationalId.length === 11 && !/^\d{12,14}$/.test(r.buyer.economicCode)) e.push({ code: 'E105', message: 'کد اقتصادی خریدار حقوقی الزامی است.' })
  if (r.body.length === 0) e.push({ code: 'E106', message: 'صورتحساب فاقد ردیف است.' })
  if (r.body.reduce((s, b) => s + b.tsstam, 0) !== r.header.tbill) e.push({ code: 'E107', message: 'جمع ردیف‌ها با مبلغ کل سرصفحه همخوانی ندارد.' })
  if (db.invoices.some((i) => i.taxId === r.taxId && i.status === 'confirmed' && i.number !== r.inno))
    e.push({ code: 'E108', message: 'شناسه یکتا قبلاً استفاده شده است.' })
  return e
}

export interface TaxCallResult {
  response: TaxResponse
  log: TaxLogEntry
}

export async function callTaxService(inv: Invoice, db: DB): Promise<TaxCallResult> {
  const started = performance.now()
  const request = buildTaxRequest(inv, db)
  const { latencyMs, failRate, forceReject } = db.settings.sim
  await new Promise((r) => setTimeout(r, latencyMs * (0.6 + Math.random() * 0.8)))

  const errors = serverValidate(request, db)
  if (forceReject) errors.push({ code: 'E900', message: 'رد اجباری توسط شبیه‌ساز (تنظیمات شبیه‌ساز).' })
  else if (Math.random() < failRate) errors.push({ code: 'E500', message: 'خطای موقت سامانه مالیاتی؛ لطفاً دوباره ارسال کنید.' })

  const accepted = errors.length === 0
  const response: TaxResponse = accepted
    ? { status: 'accepted', referenceNumber: 'TX-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 999) }
    : { status: 'rejected', errors }
  const log: TaxLogEntry = {
    id: uid(),
    at: new Date().toISOString(),
    method: 'POST',
    url: '/api/tax/invoices',
    request,
    status: accepted ? 200 : errors.some((x) => x.code === 'E500') ? 503 : 422,
    response,
    ms: Math.round(performance.now() - started),
  }
  return { response, log }
}
