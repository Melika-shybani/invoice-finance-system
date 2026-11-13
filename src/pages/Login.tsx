import { useState } from 'react'
import { useAuth } from '../auth'
import { Button, Field } from '../components/ui'

const demo = [
  { u: 'admin', p: 'admin123', r: 'مدیر سیستم' },
  { u: 'acc', p: 'acc123', r: 'حسابدار' },
  { u: 'sales', p: 'sales123', r: 'کاربر فروش' },
]

export default function Login() {
  const { login } = useAuth()
  const [username, setU] = useState('')
  const [password, setP] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4">
      <div className="animate-float absolute -top-20 start-10 size-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="animate-float absolute -bottom-20 end-10 size-80 rounded-full bg-sky-400/20 blur-3xl" style={{ animationDelay: '2s' }} />
      <form
        className="animate-fade-up relative w-full max-w-sm space-y-4 rounded-3xl border border-white/60 bg-white/80 p-7 shadow-xl shadow-brand-500/10 backdrop-blur-xl"
        onSubmit={(e) => {
          e.preventDefault()
          if (!login(username, password)) setError('نام کاربری یا رمز عبور اشتباه است.')
        }}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-sky-400 text-2xl font-bold text-white shadow-lg shadow-brand-500/30">ص</div>
          <h1 className="text-lg font-bold">ورود به سامانه مدیریت مالی</h1>
        </div>
        <Field label="نام کاربری">
          <input value={username} onChange={(e) => setU(e.target.value)} autoFocus dir="ltr" />
        </Field>
        <Field label="رمز عبور">
          <input type="password" value={password} onChange={(e) => setP(e.target.value)} dir="ltr" />
        </Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button className="w-full" onClick={undefined} type="submit">
          ورود
        </Button>
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <div className="mb-1 font-medium">حساب‌های آزمایشی (کلیک برای پر کردن):</div>
          {demo.map((d) => (
            <button
              key={d.u}
              type="button"
              className="block w-full py-0.5 text-start hover:text-brand-600"
              onClick={() => {
                setU(d.u)
                setP(d.p)
              }}
            >
              {d.r}: <span className="num">{d.u} / {d.p}</span>
            </button>
          ))}
        </div>
      </form>
    </div>
  )
}
