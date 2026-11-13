import { useState } from 'react'
import { mutate, useDB } from '../api/store'
import { addJournal } from '../api/actions'
import { Button, Card, Modal, PageHeader } from '../components/ui'
import { accountTitle, chart } from '../lib/accounts'
import { fmt, jdate, today } from '../lib/format'
import type { JournalLine } from '../types'

export default function Journal() {
  const db = useDB()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(today())
  const [desc, setDesc] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([{ account: '', debit: 0, credit: 0 }, { account: '', debit: 0, credit: 0 }])
  const [error, setError] = useState('')

  const dr = lines.reduce((s, l) => s + l.debit, 0)
  const cr = lines.reduce((s, l) => s + l.credit, 0)
  const balanced = dr === cr && dr > 0
  const setLine = (i: number, p: Partial<JournalLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...p } : l)))

  const save = () => {
    if (!desc.trim()) return setError('شرح سند الزامی است.')
    if (lines.some((l) => !l.account)) return setError('حساب همه ردیف‌ها را انتخاب کنید.')
    try {
      mutate((d) => addJournal(d, { date, description: desc, lines }))
      setOpen(false)
      setDesc('')
      setLines([{ account: '', debit: 0, credit: 0 }, { account: '', debit: 0, credit: 0 }])
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const docs = [...db.journal].sort((a, b) => b.number - a.number)

  return (
    <>
      <PageHeader title="اسناد حسابداری" subtitle="اسناد خودکار از فاکتورها و دریافت/پرداخت‌ها ایجاد می‌شوند؛ سند دستی هم می‌توانید ثبت کنید." actions={<Button onClick={() => { setError(''); setOpen(true) }}>+ سند دستی</Button>} />
      <div className="space-y-3">
        {docs.map((j) => {
          const jd = j.lines.reduce((s, l) => s + l.debit, 0)
          const jc = j.lines.reduce((s, l) => s + l.credit, 0)
          return (
            <Card key={j.id}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <div><b>سند {fmt(j.number)}</b> · {jdate(j.date)} · {j.description} {j.auto && <span className="ms-1 rounded bg-slate-100 px-1.5 text-xs text-slate-500">خودکار</span>}</div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${jd === jc ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{jd === jc ? 'تراز' : 'ناتراز'}</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {j.lines.map((l, i) => (
                    <tr key={i}><td className="py-1.5">{accountTitle(l.account)}</td><td className="w-36 text-emerald-700">{l.debit ? fmt(l.debit) : ''}</td><td className="w-36 text-rose-700">{l.credit ? fmt(l.credit) : ''}</td></tr>
                  ))}
                  <tr className="font-medium"><td className="py-1.5">جمع</td><td>{fmt(jd)}</td><td>{fmt(jc)}</td></tr>
                </tbody>
              </table>
            </Card>
          )
        })}
      </div>

      {open && (
        <Modal wide title="ثبت سند حسابداری دستی" onClose={() => setOpen(false)}>
          <div className="mb-3 grid gap-3 sm:grid-cols-3">
            <div><span className="mb-1 block text-sm text-slate-600">تاریخ ({jdate(date)})</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="sm:col-span-2"><span className="mb-1 block text-sm text-slate-600">شرح سند</span><input value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs text-slate-500"><span className="col-span-6">حساب</span><span className="col-span-3">بدهکار</span><span className="col-span-3">بستانکار</span></div>
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <select className="col-span-6" value={l.account} onChange={(e) => setLine(i, { account: e.target.value })}>
                  <option value="">انتخاب حساب…</option>
                  {Object.keys(chart).map((c) => <option key={c} value={c}>{accountTitle(c)}</option>)}
                </select>
                <input className="col-span-3" type="number" min={0} value={l.debit} onChange={(e) => setLine(i, { debit: +e.target.value, credit: 0 })} />
                <input className="col-span-3" type="number" min={0} value={l.credit} onChange={(e) => setLine(i, { credit: +e.target.value, debit: 0 })} />
              </div>
            ))}
            <Button variant="ghost" onClick={() => setLines((ls) => [...ls, { account: '', debit: 0, credit: 0 }])}>+ ردیف</Button>
          </div>
          <div className={`mt-3 rounded-lg p-3 text-sm ${balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            جمع بدهکار: {fmt(dr)} · جمع بستانکار: {fmt(cr)} — {balanced ? 'سند تراز است ✓' : `اختلاف: ${fmt(Math.abs(dr - cr))} (سند تراز نیست)`}
          </div>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setOpen(false)}>انصراف</Button><Button disabled={!balanced} onClick={save}>ثبت سند</Button></div>
        </Modal>
      )}
    </>
  )
}
