import { useState } from 'react'
import { mutate, resetDB, useDB } from '../api/store'
import { Button, Card, Field, PageHeader } from '../components/ui'
import { fmt, jdatetime } from '../lib/format'

export default function Simulator() {
  const db = useDB()
  const s = db.settings
  const [open, setOpen] = useState<string | null>(null)

  return (
    <>
      <PageHeader title="شبیه‌ساز سامانه مالیاتی" subtitle="سرویس REST شبیه‌سازی‌شده: POST /api/tax/invoices" actions={<Button variant="danger" onClick={() => confirm('همه داده‌ها به حالت اولیه برگردد؟') && resetDB()}>بازنشانی داده‌های نمونه</Button>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Card title="رفتار شبیه‌ساز">
            <div className="space-y-3">
              <Field label={`تأخیر پاسخ (میلی‌ثانیه): ${fmt(s.sim.latencyMs)}`}>
                <input type="range" min={200} max={5000} step={100} value={s.sim.latencyMs} onChange={(e) => mutate((d) => void (d.settings.sim.latencyMs = +e.target.value))} />
              </Field>
              <Field label={`احتمال خطای تصادفی: ${fmt(Math.round(s.sim.failRate * 100))}٪`}>
                <input type="range" min={0} max={100} value={s.sim.failRate * 100} onChange={(e) => mutate((d) => void (d.settings.sim.failRate = +e.target.value / 100))} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={s.sim.forceReject} onChange={(e) => mutate((d) => void (d.settings.sim.forceReject = e.target.checked))} />
                رد کردن همه صورتحساب‌ها
              </label>
            </div>
          </Card>
          <Card title="اطلاعات فروشنده (شرکت)">
            <div className="space-y-3">
              <Field label="نام شرکت"><input value={s.sellerName} onChange={(e) => mutate((d) => void (d.settings.sellerName = e.target.value))} /></Field>
              <Field label="کد اقتصادی"><input dir="ltr" value={s.sellerEconomicCode} onChange={(e) => mutate((d) => void (d.settings.sellerEconomicCode = e.target.value))} /></Field>
              <Field label="شناسه حافظه مالیاتی (۶ کاراکتر)"><input dir="ltr" maxLength={6} value={s.memoryCode} onChange={(e) => mutate((d) => void (d.settings.memoryCode = e.target.value.toUpperCase()))} /></Field>
            </div>
          </Card>
        </div>

        <Card title={`گزارش درخواست‌ها (${fmt(db.taxLog.length)})`} className="lg:col-span-2">
          {db.taxLog.length === 0 && <p className="py-8 text-center text-sm text-slate-400">هنوز درخواستی ارسال نشده است. یک صورتحساب را ارسال کنید.</p>}
          <ul className="space-y-2">
            {db.taxLog.map((l) => (
              <li key={l.id} className="rounded-lg border border-slate-200">
                <button className="flex w-full items-center justify-between gap-2 p-3 text-start text-sm" onClick={() => setOpen(open === l.id ? null : l.id)}>
                  <span className="num font-mono text-xs">{l.method} {l.url}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{jdatetime(l.at)} · {fmt(l.ms)}ms</span>
                    <span className={`num rounded px-2 py-0.5 text-xs ${l.status === 200 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{l.status}</span>
                  </span>
                </button>
                {open === l.id && (
                  <div className="grid gap-2 border-t p-3 md:grid-cols-2" dir="ltr">
                    <pre className="max-h-72 overflow-auto rounded bg-slate-900 p-2 text-xs text-slate-100">{JSON.stringify(l.request, null, 2)}</pre>
                    <pre className="max-h-72 overflow-auto rounded bg-slate-900 p-2 text-xs text-emerald-200">{JSON.stringify(l.response, null, 2)}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
