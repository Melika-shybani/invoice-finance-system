import { getDB, mutate } from './store'
import { setStatus } from './actions'
import { callTaxService } from './taxSimulator'
import { hasErrors, validateInvoice, type Issue } from '../lib/validate'

/** اعتبارسنجی و انتقال به «آماده ارسال» */
export function markReady(id: string, by: string): Issue[] {
  const db = getDB()
  const inv = db.invoices.find((i) => i.id === id)
  if (!inv) return []
  const issues = validateInvoice(inv, db)
  if (!hasErrors(issues)) mutate((d) => setStatus(d, id, 'ready', by, 'اعتبارسنجی موفق'))
  return issues
}

/** ارسال به شبیه‌ساز سامانه مالیاتی؛ نتیجه: تأییدشده یا ردشده */
export async function sendInvoice(id: string, by: string) {
  mutate((d) => setStatus(d, id, 'sent', by, 'ارسال به سامانه مالیاتی (POST /api/tax/invoices)'))
  const db = getDB()
  const inv = db.invoices.find((i) => i.id === id)
  if (!inv) return
  const { response, log } = await callTaxService(inv, db)
  mutate((d) => {
    d.taxLog.unshift(log)
    d.taxLog = d.taxLog.slice(0, 100)
    if (response.status === 'accepted') setStatus(d, id, 'confirmed', 'سامانه مالیاتی', `تأیید شد - ${response.referenceNumber}`, { taxRef: response.referenceNumber, rejectReasons: undefined })
    else {
      const reasons = (response.errors ?? []).map((e) => `${e.code}: ${e.message}`)
      setStatus(d, id, 'rejected', 'سامانه مالیاتی', reasons.join(' | '), { rejectReasons: reasons })
    }
  })
}
