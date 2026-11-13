import { useState } from 'react'
import { mutate, useDB } from '../api/store'
import { uid } from '../api/actions'
import { useAuth } from '../auth'
import { Button, Card, Field, Modal, PageHeader, Table } from '../components/ui'
import { roleLabel } from '../lib/format'
import type { Role, User } from '../types'

export default function Users() {
  const db = useDB()
  const { user: me } = useAuth()
  const [edit, setEdit] = useState<User | null>(null)
  const [error, setError] = useState('')
  const set = (p: Partial<User>) => setEdit((e) => e && { ...e, ...p })

  const save = () => {
    if (!edit) return
    if (!edit.fullName.trim() || !edit.username.trim() || edit.password.length < 4) return setError('نام، نام کاربری و رمز (حداقل ۴ کاراکتر) الزامی است.')
    if (db.users.some((u) => u.username === edit.username && u.id !== edit.id)) return setError('این نام کاربری قبلاً وجود دارد.')
    mutate((d) => {
      if (edit.id) d.users[d.users.findIndex((u) => u.id === edit.id)] = edit
      else d.users.push({ ...edit, id: uid() })
    })
    setEdit(null)
  }

  return (
    <>
      <PageHeader title="مدیریت کاربران" subtitle="تعیین نقش و سطح دسترسی" actions={<Button onClick={() => { setError(''); setEdit({ id: '', username: '', password: '', fullName: '', role: 'sales', active: true }) }}>+ کاربر جدید</Button>} />
      <Card>
        <Table head={['نام', 'نام کاربری', 'نقش', 'وضعیت', '']}>
          {db.users.map((u) => (
            <tr key={u.id}>
              <td className="font-medium">{u.fullName}</td><td className="num">{u.username}</td><td>{roleLabel[u.role]}</td>
              <td><span className={u.active ? 'text-emerald-600' : 'text-slate-400'}>{u.active ? 'فعال' : 'غیرفعال'}</span></td>
              <td className="whitespace-nowrap">
                <button className="text-brand-600 hover:underline" onClick={() => { setError(''); setEdit(u) }}>ویرایش</button>
                {u.id !== me?.id && <button className="ms-3 text-slate-600 hover:underline" onClick={() => mutate((d) => void (d.users.find((x) => x.id === u.id)!.active = !u.active))}>{u.active ? 'غیرفعال‌سازی' : 'فعال‌سازی'}</button>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="ماتریس دسترسی" className="mt-4">
        <ul className="space-y-1 text-sm text-slate-600">
          <li><b>مدیر سیستم:</b> دسترسی کامل از جمله مدیریت کاربران.</li>
          <li><b>حسابدار:</b> فاکتورها، صورتحساب الکترونیکی و ارسال، دریافت/پرداخت، صندوق و بانک، اسناد، گزارش‌ها.</li>
          <li><b>کاربر فروش:</b> داشبورد، مشتریان، کالا، صدور فاکتور فروش و مشاهده وضعیت صورتحساب (بدون ارسال/ابطال).</li>
        </ul>
      </Card>
      {edit && (
        <Modal title={edit.id ? 'ویرایش کاربر' : 'کاربر جدید'} onClose={() => setEdit(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="نام کامل"><input value={edit.fullName} onChange={(e) => set({ fullName: e.target.value })} /></Field>
            <Field label="نام کاربری"><input dir="ltr" value={edit.username} onChange={(e) => set({ username: e.target.value })} /></Field>
            <Field label="رمز عبور"><input dir="ltr" value={edit.password} onChange={(e) => set({ password: e.target.value })} /></Field>
            <Field label="نقش"><select value={edit.role} onChange={(e) => set({ role: e.target.value as Role })}>{Object.entries(roleLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          <div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setEdit(null)}>انصراف</Button><Button onClick={save}>ذخیره</Button></div>
        </Modal>
      )}
    </>
  )
}
