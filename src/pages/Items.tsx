import { useState } from 'react'
import { mutate, useDB } from '../api/store'
import { uid } from '../api/actions'
import { useAuth } from '../auth'
import { Button, Card, Field, Modal, PageHeader, Table } from '../components/ui'
import { fmt } from '../lib/format'
import type { Item } from '../types'

const blank: Item = { id: '', code: '', title: '', kind: 'good', price: 0, taxRate: 10, stock: 0 }

export default function Items() {
  const db = useDB()
  const { user } = useAuth()
  const [edit, setEdit] = useState<Item | null>(null)
  const [q, setQ] = useState('')
  const [error, setError] = useState('')
  const rows = db.items.filter((i) => !q || i.title.includes(q) || i.code.includes(q))
  const set = (patch: Partial<Item>) => setEdit((e) => e && { ...e, ...patch })

  const save = () => {
    if (!edit) return
    if (!edit.code.trim() || !edit.title.trim()) return setError('کد و عنوان الزامی است.')
    if (db.items.some((i) => i.code === edit.code && i.id !== edit.id)) return setError('این کد قبلاً استفاده شده است.')
    if (edit.price < 0 || edit.taxRate < 0 || edit.taxRate > 100) return setError('قیمت یا نرخ مالیات نامعتبر است.')
    mutate((d) => {
      if (edit.id) d.items[d.items.findIndex((i) => i.id === edit.id)] = edit
      else d.items.push({ ...edit, id: uid() })
    })
    setEdit(null)
  }
  const remove = (i: Item) => {
    if (db.invoices.some((inv) => inv.lines.some((l) => l.itemId === i.id))) return alert('این کالا در فاکتورها استفاده شده و قابل حذف نیست.')
    if (confirm(`«${i.title}» حذف شود؟`)) mutate((d) => void (d.items = d.items.filter((x) => x.id !== i.id)))
  }

  return (
    <>
      <PageHeader title="کالا و خدمات" actions={<Button onClick={() => { setError(''); setEdit({ ...blank }) }}>+ کالا / خدمت جدید</Button>} />
      <Card>
        <input className="mb-3 !w-60" placeholder="جستجو کد یا عنوان…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Table head={['کد', 'عنوان', 'نوع', 'قیمت (ریال)', 'مالیات', 'موجودی', '']} empty={rows.length === 0}>
          {rows.map((i) => (
            <tr key={i.id}>
              <td className="num">{i.code}</td><td className="font-medium">{i.title}</td><td>{i.kind === 'good' ? 'کالا' : 'خدمت'}</td>
              <td>{fmt(i.price)}</td><td>{fmt(i.taxRate)}٪</td>
              <td className={i.kind === 'good' && i.stock < 10 ? 'font-medium text-rose-600' : ''}>{i.kind === 'good' ? fmt(i.stock) : '—'}</td>
              <td className="whitespace-nowrap">
                <button className="text-brand-600 hover:underline" onClick={() => { setError(''); setEdit(i) }}>ویرایش</button>
                {user?.role !== 'sales' && <button className="ms-3 text-rose-600 hover:underline" onClick={() => remove(i)}>حذف</button>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      {edit && (
        <Modal title={edit.id ? 'ویرایش' : 'کالا / خدمت جدید'} onClose={() => setEdit(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="کد"><input dir="ltr" value={edit.code} onChange={(e) => set({ code: e.target.value })} /></Field>
            <Field label="نوع"><select value={edit.kind} onChange={(e) => set({ kind: e.target.value as Item['kind'] })}><option value="good">کالا</option><option value="service">خدمت</option></select></Field>
            <div className="sm:col-span-2"><Field label="عنوان"><input value={edit.title} onChange={(e) => set({ title: e.target.value })} /></Field></div>
            <Field label="قیمت (ریال)"><input type="number" min={0} value={edit.price} onChange={(e) => set({ price: +e.target.value })} /></Field>
            <Field label="نرخ مالیات (٪)"><input type="number" min={0} max={100} value={edit.taxRate} onChange={(e) => set({ taxRate: +e.target.value })} /></Field>
            {edit.kind === 'good' && <Field label="موجودی"><input type="number" min={0} value={edit.stock} onChange={(e) => set({ stock: +e.target.value })} /></Field>}
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>انصراف</Button><Button onClick={save}>ذخیره</Button></div>
        </Modal>
      )}
    </>
  )
}
