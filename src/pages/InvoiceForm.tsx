import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { mutate, useDB } from '../api/store'
import { createInvoice, updateInvoice } from '../api/actions'
import { useAuth } from '../auth'
import { Button, Card, Field, PageHeader } from '../components/ui'
import { invoiceTotals, lineTotals } from '../lib/calc'
import { fmt, jdate, money, today } from '../lib/format'
import type { InvoiceLine, InvoiceType } from '../types'

export default function InvoiceForm({ type }: { type: InvoiceType }) {
  const { id } = useParams()
  const db = useDB()
  const { user } = useAuth()
  const nav = useNavigate()
  const existing = id ? db.invoices.find((i) => i.id === id) : undefined
  const sale = type === 'sale'

  const [date, setDate] = useState(existing?.date ?? today())
  const [partyId, setPartyId] = useState(existing?.partyId ?? '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [lines, setLines] = useState<InvoiceLine[]>(existing?.lines ?? [])
  const [error, setError] = useState('')

  const parties = db.parties.filter((p) => p.kind === 'both' || p.kind === (sale ? 'customer' : 'supplier'))
  const t = invoiceTotals(lines)

  const setLine = (i: number, patch: Partial<InvoiceLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)))
  const pickItem = (i: number, itemId: string) => {
    const it = db.items.find((x) => x.id === itemId)
    if (it) setLine(i, { itemId, title: it.title, unitPrice: it.price, taxRate: it.taxRate })
  }
  const addLine = () => setLines((ls) => [...ls, { itemId: '', title: '', qty: 1, unitPrice: 0, discount: 0, taxRate: 10 }])

  const save = () => {
    if (!partyId) return setError('طرف حساب را انتخاب کنید.')
    if (lines.length === 0 || lines.some((l) => !l.itemId)) return setError('حداقل یک ردیف کامل لازم است.')
    const input = { type, date, partyId, lines, description, refId: existing?.refId }
    try {
      const saved = mutate((d) => {
        if (existing) {
          updateInvoice(d, existing.id, input, user!.fullName)
          return existing
        }
        return createInvoice(d, input, user!.fullName)
      })
      nav(sale ? `/einvoices/${saved.id}` : '/purchases')
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <PageHeader title={existing ? `ویرایش صورتحساب شماره ${fmt(existing.number)}` : sale ? 'فاکتور فروش جدید' : 'فاکتور خرید جدید'} />
      <div className="space-y-4">
        <Card>
          <div className="grid gap-3 md:grid-cols-3">
            <Field label={sale ? 'مشتری' : 'تأمین‌کننده'}>
              <select value={partyId} onChange={(e) => setPartyId(e.target.value)}>
                <option value="">انتخاب کنید…</option>
                {parties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="تاریخ" hint={jdate(date)}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="توضیحات"><input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
          </div>
        </Card>

        <Card title="اقلام" actions={<Button variant="secondary" onClick={addLine}>+ افزودن ردیف</Button>}>
          <div className="space-y-3">
            {lines.length === 0 && <p className="py-4 text-center text-sm text-slate-400">ردیفی افزوده نشده است.</p>}
            {lines.map((l, i) => (
              <div key={i} className="grid items-end gap-2 rounded-lg border border-slate-200 p-3 md:grid-cols-12">
                <div className="md:col-span-3">
                  <Field label="کالا / خدمت">
                    <select value={l.itemId} onChange={(e) => pickItem(i, e.target.value)}>
                      <option value="">انتخاب…</option>
                      {db.items.map((it) => <option key={it.id} value={it.id}>{it.code} - {it.title}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="md:col-span-1"><Field label="تعداد"><input type="number" min={0} value={l.qty} onChange={(e) => setLine(i, { qty: +e.target.value })} /></Field></div>
                <div className="md:col-span-2"><Field label="قیمت واحد"><input type="number" min={0} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: +e.target.value })} /></Field></div>
                <div className="md:col-span-2"><Field label="تخفیف"><input type="number" min={0} value={l.discount} onChange={(e) => setLine(i, { discount: +e.target.value })} /></Field></div>
                <div className="md:col-span-1"><Field label="مالیات٪"><input type="number" min={0} max={100} value={l.taxRate} onChange={(e) => setLine(i, { taxRate: +e.target.value })} /></Field></div>
                <div className="text-sm md:col-span-2"><div className="text-slate-500">جمع ردیف</div><div className="py-2 font-medium">{money(lineTotals(l).total)}</div></div>
                <div className="md:col-span-1"><Button variant="ghost" className="text-rose-600" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))}>حذف</Button></div>
              </div>
            ))}
          </div>
          <div className="mt-4 ms-auto w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between"><span>جمع کل</span><span>{money(t.gross)}</span></div>
            <div className="flex justify-between"><span>تخفیف</span><span>{money(t.discount)}</span></div>
            <div className="flex justify-between"><span>مالیات</span><span>{money(t.tax)}</span></div>
            <div className="flex justify-between border-t pt-1 text-base font-bold"><span>مبلغ قابل پرداخت</span><span>{money(t.total)}</span></div>
          </div>
        </Card>

        {error && <p className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <Button onClick={save}>{sale ? 'ذخیره به عنوان پیش‌نویس' : 'ثبت فاکتور خرید'}</Button>
          <Button variant="ghost" onClick={() => nav(-1)}>انصراف</Button>
        </div>
      </div>
    </>
  )
}
