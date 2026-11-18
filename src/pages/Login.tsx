import { useState } from 'react'
import { useAuth } from '../auth'
import { Button, Field } from '../components/ui'

export default function Login() {
  const { login } = useAuth()
  const [username, setU] = useState('')
  const [password, setP] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password) {
      setError('لطفاً نام کاربری و رمز عبور را وارد فرمایید.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const res = await login(username, password)
      if (!res.success) {
        setError(res.message || 'نام کاربری یا رمز عبور اشتباه است.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4">
      <div className="animate-float absolute -top-20 start-10 size-72 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="animate-float absolute -bottom-20 end-10 size-80 rounded-full bg-sky-400/20 blur-3xl" style={{ animationDelay: '2s' }} />
      <form
        className="animate-fade-up relative w-full max-w-sm space-y-4 rounded-3xl border border-white/60 bg-white/80 p-7 shadow-xl shadow-brand-500/10 backdrop-blur-xl"
        onSubmit={handleSubmit}
      >
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-sky-400 text-2xl font-bold text-white shadow-lg shadow-brand-500/30">ص</div>
          <h1 className="text-lg font-bold">ورود به سامانه مدیریت مالی</h1>
        </div>
        <Field label="نام کاربری">
          <input
            value={username}
            onChange={(e) => setU(e.target.value)}
            autoFocus
            dir="ltr"
            disabled={loading}
            placeholder="نام کاربری"
          />
        </Field>
        <Field label="رمز عبور">
          <input
            type="password"
            value={password}
            onChange={(e) => setP(e.target.value)}
            dir="ltr"
            disabled={loading}
            placeholder="رمز عبور"
          />
        </Field>
        {error && <p className="text-sm text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">{error}</p>}
        <Button className="w-full" onClick={undefined} type="submit" disabled={loading}>
          {loading ? 'در حال برقراری ارتباط...' : 'ورود'}
        </Button>
      </form>
    </div>
  )
}
