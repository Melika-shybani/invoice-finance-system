import { useState } from 'react'
import { mutate, useDB } from '../api/store'
import { accountBalance, uid } from '../api/actions'
import { Button, Card, Field, Modal, PageHeader, Stat } from '../components/ui'
import { money } from '../lib/format'
import type { CashAccount } from '../types'

export default function Accounts() {
  const db = useDB()
  const [edit, setEdit] = useState<CashAccount | null>(null)
  const total = db.accounts.reduce((s, a) => s + accountBalance(db, a.id), 0)
  const set = (p: Partial<CashAccount>) => setEdit((e) => e && { ...e, ...p })

  const save = () => {
    if (!edit || !edit.title.trim()) return
    mutate((d) => {
      if (edit.id) d.accounts[d.accounts.findIndex((a) => a.id === edit.id)] = edit
      else d.accounts.push({ ...edit, id: uid() })
    })
    setEdit(null)
  }

  return (
    <>
      <PageHeader title="صندوق و حساب‌های بانکی" actions={<Button onClick={() => setEdit({ id: '', kind: 'bank', title: '', accountNo: '', initial: 0 })}>+ حساب جدید</Button>} />
      <div className="mb-4 max-w-xs"><Stat label="مجموع موجودی نقدینگی" value={money(total)} tone="indigo" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {db.accounts.map((a) => {
          const used = db.payments.filter((p) => p.accountId === a.id).length
          return (
            <Card key={a.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold">{a.title}</div>
                  <div className="text-xs text-slate-500">{a.kind === 'cash' ? 'صندوق' : 'حساب بانکی'} {a.accountNo && <span className="num">· {a.accountNo}</span>}</div>
                </div>
                <button className="text-sm text-brand-600 hover:underline" onClick={() => setEdit(a)}>ویرایش</button>
              </div>
              <div className="mt-4 text-xl font-bold">{money(accountBalance(db, a.id))}</div>
              <div className="mt-1 text-xs text-slate-400">{used} تراکنش</div>
            </Card>
          )
        })}
      </div>
      {edit && (
        <Modal title={edit.id ? 'ویرایش حساب' : 'حساب جدید'} onClose={() => setEdit(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="عنوان"><input value={edit.title} onChange={(e) => set({ title: e.target.value })} /></Field>
            <Field label="نوع"><select value={edit.kind} onChange={(e) => set({ kind: e.target.value as CashAccount['kind'] })}><option value="cash">صندوق</option><option value="bank">بانک</option></select></Field>
            {edit.kind === 'bank' && <Field label="شماره حساب"><input dir="ltr" value={edit.accountNo ?? ''} onChange={(e) => set({ accountNo: e.target.value })} /></Field>}
            <Field label="موجودی اولیه"><input type="number" value={edit.initial} disabled={!!edit.id} onChange={(e) => set({ initial: +e.target.value })} /></Field>
          </div>
          <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>انصراف</Button><Button onClick={save}>ذخیره</Button></div>
        </Modal>
      )}
    </>
  )
}
