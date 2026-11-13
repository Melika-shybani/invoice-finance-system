import { useState } from 'react'
import { mutate, useDB } from '../api/store'
import { addPayment } from '../api/actions'
import { Button, Card, Field, Modal, PageHeader, Table } from '../components/ui'
import { fmt, jdate, methodLabel, money, today } from '../lib/format'
import type { Payment } from '../types'

type Form = Omit<Payment, 'id' | 'number'>
const blank = (direction: 'in' | 'out'): Form => ({ direction, date: today(), partyId: '', accountId: '', amount: 0, method: 'transfer', description: '' })

export default function Payments() {
  const db = useDB()
  const [form, setForm] = useState<Form | null>(null)
  const [error, setError] = useState('')
  const rows = [...db.payments].sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number)
  const set = (p: Partial<Form>) => setForm((f) => f && { ...f, ...p })

  const save = () => {
    if (!form) return
    if (!form.partyId || !form.accountId) return setError('طرف حساب و صندوق/بانک را انتخاب کنید.')
    if (!(form.amount > 0)) return setError('مبلغ باید بزرگ‌تر از صفر باشد.')
    mutate((d) => void addPayment(d, form))
    setForm(null)
  }

  return (
    <>
      <PageHeader
        title="دریافت‌ها و پرداخت‌ها"
        actions={<><Button onClick={() => { setError(''); setForm(blank('in')) }}>+ دریافت</Button><Button variant="secondary" onClick={() => { setError(''); setForm(blank('out')) }}>+ پرداخت</Button></>}
      />
      <Card>
        <Table head={['شماره', 'نوع', 'تاریخ', 'طرف حساب', 'صندوق/بانک', 'روش', 'مبلغ', 'توضیحات']} empty={rows.length === 0}>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{fmt(p.number)}</td>
              <td><span className={p.direction === 'in' ? 'text-emerald-600' : 'text-rose-600'}>{p.direction === 'in' ? 'دریافت' : 'پرداخت'}</span></td>
              <td>{jdate(p.date)}</td>
              <td>{db.parties.find((x) => x.id === p.partyId)?.name}</td>
              <td>{db.accounts.find((a) => a.id === p.accountId)?.title}</td>
              <td>{methodLabel[p.method]}</td>
              <td className="font-medium">{money(p.amount)}</td>
              <td className="text-slate-500">{p.description}</td>
            </tr>
          ))}
        </Table>
      </Card>
      {form && (
        <Modal title={form.direction === 'in' ? 'ثبت دریافت' : 'ثبت پرداخت'} onClose={() => setForm(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={form.direction === 'in' ? 'دریافت از' : 'پرداخت به'}>
              <select value={form.partyId} onChange={(e) => set({ partyId: e.target.value })}>
                <option value="">انتخاب…</option>
                {db.parties.filter((p) => p.kind === 'both' || p.kind === (form.direction === 'in' ? 'customer' : 'supplier')).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="صندوق / بانک">
              <select value={form.accountId} onChange={(e) => set({ accountId: e.target.value })}>
                <option value="">انتخاب…</option>
                {db.accounts.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </Field>
            <Field label="مبلغ (ریال)"><input type="number" min={0} value={form.amount} onChange={(e) => set({ amount: +e.target.value })} /></Field>
            <Field label="تاریخ" hint={jdate(form.date)}><input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} /></Field>
            <Field label="روش"><select value={form.method} onChange={(e) => set({ method: e.target.value as Payment['method'] })}>{Object.entries(methodLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="توضیحات"><input value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setForm(null)}>انصراف</Button><Button onClick={save}>ثبت</Button></div>
        </Modal>
      )}
    </>
  )
}
