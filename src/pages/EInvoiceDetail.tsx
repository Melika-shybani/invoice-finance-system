import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getDB, mutate, useDB } from '../api/store'
import { amendInvoice, cancelInvoice, deleteDraft } from '../api/actions'
import { markReady, sendInvoice } from '../api/invoiceFlow'
import { useAuth } from '../auth'
import { Button, Card, Modal, PageHeader, StatusBadge, Table } from '../components/ui'
import { invoiceTotals, lineTotals } from '../lib/calc'
import { fmt, jdate, jdatetime, money, statusLabel } from '../lib/format'
import { hasErrors, validateInvoice, type Issue } from '../lib/validate'
import { buildTaxRequest } from '../api/taxSimulator'

export default function EInvoiceDetail() {
  const { id } = useParams()
  const db = useDB()
  const { user } = useAuth()
  const nav = useNavigate()
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [sending, setSending] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [showJson, setShowJson] = useState(false)

  const inv = db.invoices.find((i) => i.id === id)
  if (!inv) return <p>صورتحساب یافت نشد.</p>
  const party = db.parties.find((p) => p.id === inv.partyId)
  const t = invoiceTotals(inv.lines)
  const live = validateInvoice(inv, db)
  const by = user!.fullName
  const canAct = user!.role !== 'sales' && !inv.cancelled
  const editable = !inv.cancelled && ['draft', 'ready', 'rejected'].includes(inv.status)

  const validate = () => {
    const r = markReady(inv.id, by)
    setIssues(r)
  }
  const send = async () => {
    setSending(true)
    await sendInvoice(inv.id, by)
    setSending(false)
  }

  return (
    <>
      <PageHeader
        title={`صورتحساب فروش شماره ${fmt(inv.number)}`}
        subtitle={`شناسه یکتا: ${inv.taxId}`}
        actions={
          <>
            <StatusBadge status={inv.status} cancelled={inv.cancelled} />
            <Link to="/einvoices"><Button variant="ghost">بازگشت</Button></Link>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="اطلاعات صورتحساب">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><dt className="text-slate-500">تاریخ</dt><dd>{jdate(inv.date)}</dd></div>
              <div><dt className="text-slate-500">مشتری</dt><dd>{party?.name}</dd></div>
              <div><dt className="text-slate-500">شناسه ملی</dt><dd className="num">{party?.nationalId}</dd></div>
              <div><dt className="text-slate-500">کد اقتصادی</dt><dd className="num">{party?.economicCode || '—'}</dd></div>
              {inv.taxRef && <div><dt className="text-slate-500">شماره پیگیری مالیاتی</dt><dd className="num">{inv.taxRef}</dd></div>}
              {inv.refId && <div><dt className="text-slate-500">اصلاحیه</dt><dd><Link className="text-brand-600" to={`/einvoices/${inv.refId}`}>صورتحساب اصلی</Link></dd></div>}
            </dl>
          </Card>

          <Card title="اقلام">
            <Table head={['شرح', 'تعداد', 'قیمت واحد', 'تخفیف', 'مالیات', 'جمع']}>
              {inv.lines.map((l, i) => {
                const lt = lineTotals(l)
                return (
                  <tr key={i}>
                    <td>{l.title}</td><td>{fmt(l.qty)}</td><td>{fmt(l.unitPrice)}</td><td>{fmt(l.discount)}</td><td>{fmt(lt.tax)}</td><td>{fmt(lt.total)}</td>
                  </tr>
                )
              })}
            </Table>
            <div className="mt-3 ms-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><span>جمع کل</span><span>{money(t.gross)}</span></div>
              <div className="flex justify-between"><span>تخفیف</span><span>{money(t.discount)}</span></div>
              <div className="flex justify-between"><span>مالیات و عوارض</span><span>{money(t.tax)}</span></div>
              <div className="flex justify-between border-t pt-1 font-bold"><span>مبلغ قابل پرداخت</span><span>{money(t.total)}</span></div>
            </div>
          </Card>

          {(inv.status === 'draft' || inv.status === 'ready' || inv.status === 'rejected') && !inv.cancelled && (
            <Card title="نتیجه اعتبارسنجی">
              {inv.rejectReasons && inv.status === 'rejected' && (
                <div className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
                  <b>دلایل رد توسط سامانه مالیاتی:</b>
                  <ul className="mt-1 list-disc ps-5">{inv.rejectReasons.map((r) => <li key={r}>{r}</li>)}</ul>
                </div>
              )}
              <ul className="space-y-1 text-sm">
                {(issues ?? live).length === 0 && <li className="text-emerald-600">✓ مشکلی یافت نشد.</li>}
                {(issues ?? live).map((i, k) => (
                  <li key={k} className={i.level === 'error' ? 'text-rose-600' : 'text-amber-600'}>
                    {i.level === 'error' ? '✗' : '⚠'} {i.message}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="پیام ارسالی به سامانه مالیاتی (JSON)" actions={<Button variant="ghost" onClick={() => setShowJson(!showJson)}>{showJson ? 'پنهان' : 'نمایش'}</Button>}>
            {showJson && <pre dir="ltr" className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(buildTaxRequest(inv, getDB()), null, 2)}</pre>}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="عملیات">
            <div className="flex flex-col gap-2">
              {canAct && inv.status === 'draft' && <Button onClick={validate}>اعتبارسنجی و آماده‌سازی ارسال</Button>}
              {canAct && inv.status === 'ready' && <Button disabled={sending || hasErrors(live)} onClick={send}>{sending ? 'در حال ارسال…' : 'ارسال به سامانه مالیاتی'}</Button>}
              {canAct && inv.status === 'sent' && <p className="text-sm text-sky-700">در انتظار پاسخ سامانه مالیاتی…</p>}
              {canAct && inv.status === 'rejected' && <p className="text-sm text-rose-600">پس از اصلاح، دوباره اعتبارسنجی و ارسال کنید.</p>}
              {editable && <Link to={`/sales/${inv.id}/edit`}><Button className="w-full" variant="secondary">ویرایش (اصلاح اطلاعات)</Button></Link>}
              {canAct && (inv.status === 'sent' || inv.status === 'confirmed') && (
                <Button variant="secondary" onClick={() => { const c = mutate((d) => amendInvoice(d, inv.id, by)); if (c) nav(`/sales/${c.id}/edit`) }}>صدور صورتحساب اصلاحی</Button>
              )}
              {canAct && inv.status !== 'draft' && <Button variant="danger" onClick={() => setCancelOpen(true)}>ابطال صورتحساب</Button>}
              {!inv.cancelled && inv.status === 'draft' && <Button variant="danger" onClick={() => { mutate((d) => deleteDraft(d, inv.id)); nav('/einvoices') }}>حذف پیش‌نویس</Button>}
            </div>
          </Card>

          <Card title="تاریخچه تغییر وضعیت">
            <ol className="relative space-y-4 border-s-2 border-slate-200 ps-4">
              {[...inv.history].reverse().map((h, i) => (
                <li key={i} className="relative text-sm">
                  <span className="absolute -start-[1.4rem] top-1 size-2.5 rounded-full bg-brand-500" />
                  <div className="font-medium">
                    {h.from ? `${statusLabel[h.from]} ← ` : ''}{statusLabel[h.to]}
                  </div>
                  <div className="text-xs text-slate-500">{jdatetime(h.at)} · {h.by}</div>
                  {h.note && <div className="mt-0.5 text-xs text-slate-600">{h.note}</div>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      {cancelOpen && (
        <Modal title="ابطال صورتحساب" onClose={() => setCancelOpen(false)}>
          <p className="mb-3 text-sm text-slate-600">با ابطال، سند حسابداری معکوس ثبت و موجودی برگردانده می‌شود. این عمل قابل بازگشت نیست.</p>
          <textarea rows={3} placeholder="دلیل ابطال" value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>انصراف</Button>
            <Button variant="danger" disabled={!reason.trim()} onClick={() => { mutate((d) => cancelInvoice(d, inv.id, by, reason.trim())); setCancelOpen(false); setReason('') }}>تأیید ابطال</Button>
          </div>
        </Modal>
      )}
    </>
  )
}
