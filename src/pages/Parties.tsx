import { useState } from 'react'
import { mutate, useDB } from '../api/store'
import { uid } from '../api/actions'
import { useAuth } from '../auth'
import { Button, Card, Field, Modal, PageHeader, Table } from '../components/ui'
import type { Party, PartyKind } from '../types'

const kindLabel: Record<PartyKind, string> = { customer: 'مشتری', supplier: 'تأمین‌کننده', both: 'هر دو' }
const blank: Party = { id: '', kind: 'customer', name: '', nationalId: '', economicCode: '', phone: '', address: '' }

export default function Parties() {
  const db = useDB()
  const { user } = useAuth()
  const [edit, setEdit] = useState<Party | null>(null)
  const [filter, setFilter] = useState<PartyKind | 'all'>('all')
  const [q, setQ] = useState('')
  const [error, setError] = useState('')

  const rows = db.parties.filter((p) => (filter === 'all' || p.kind === filter || p.kind === 'both') && (!q || p.name.includes(q) || p.nationalId.includes(q)))

  const save = () => {
    if (!edit) return
    if (!edit.name.trim()) return setError('نام الزامی است.')
    if (!/^\d{10,11}$/.test(edit.nationalId)) return setError('شناسه ملی (۱۱ رقم) یا کد ملی (۱۰ رقم) نامعتبر است.')
    if (edit.economicCode && !/^\d{12,14}$/.test(edit.economicCode)) return setError('کد اقتصادی باید ۱۲ تا ۱۴ رقم باشد.')
    mutate((d) => {
      if (edit.id) d.parties[d.parties.findIndex((p) => p.id === edit.id)] = edit
      else d.parties.push({ ...edit, id: uid() })
    })
    setEdit(null)
  }
  const remove = (p: Party) => {
    if (db.invoices.some((i) => i.partyId === p.id) || db.payments.some((x) => x.partyId === p.id)) return alert('این طرف حساب در اسناد استفاده شده و قابل حذف نیست.')
    if (confirm(`«${p.name}» حذف شود؟`)) mutate((d) => void (d.parties = d.parties.filter((x) => x.id !== p.id)))
  }
  const set = (patch: Partial<Party>) => setEdit((e) => e && { ...e, ...patch })

  return (
    <>
      <PageHeader title="مشتریان و تأمین‌کنندگان" actions={<Button onClick={() => { setError(''); setEdit({ ...blank }) }}>+ طرف حساب جدید</Button>} />
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <select className="!w-40" value={filter} onChange={(e) => setFilter(e.target.value as PartyKind | 'all')}>
            <option value="all">همه</option><option value="customer">مشتریان</option><option value="supplier">تأمین‌کنندگان</option>
          </select>
          <input className="!w-60" placeholder="جستجو نام یا شناسه…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Table head={['نام', 'نوع', 'شناسه/کد ملی', 'کد اقتصادی', 'تلفن', 'نشانی', '']} empty={rows.length === 0}>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="font-medium">{p.name}</td><td>{kindLabel[p.kind]}</td>
              <td className="num">{p.nationalId}</td><td className="num">{p.economicCode || '—'}</td><td className="num">{p.phone}</td><td className="max-w-56 truncate">{p.address}</td>
              <td className="whitespace-nowrap">
                <button className="text-brand-600 hover:underline" onClick={() => { setError(''); setEdit(p) }}>ویرایش</button>
                {user?.role !== 'sales' && <button className="ms-3 text-rose-600 hover:underline" onClick={() => remove(p)}>حذف</button>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      {edit && (
        <Modal title={edit.id ? 'ویرایش طرف حساب' : 'طرف حساب جدید'} onClose={() => setEdit(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="نام / عنوان"><input value={edit.name} onChange={(e) => set({ name: e.target.value })} /></Field>
            <Field label="نوع"><select value={edit.kind} onChange={(e) => set({ kind: e.target.value as PartyKind })}>{Object.entries(kindLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="شناسه ملی / کد ملی"><input dir="ltr" value={edit.nationalId} onChange={(e) => set({ nationalId: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="کد اقتصادی"><input dir="ltr" value={edit.economicCode} onChange={(e) => set({ economicCode: e.target.value.replace(/\D/g, '') })} /></Field>
            <Field label="شماره تماس"><input dir="ltr" value={edit.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="نشانی"><textarea rows={2} value={edit.address} onChange={(e) => set({ address: e.target.value })} /></Field></div>
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>انصراف</Button><Button onClick={save}>ذخیره</Button></div>
        </Modal>
      )}
    </>
  )
}
