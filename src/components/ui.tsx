import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { InvoiceStatus } from '../types'
import { fmt, statusColor, statusLabel } from '../lib/format'

/** شمارش تدریجی عدد از صفر تا مقدار نهایی */
export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const dur = 900
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1)
      setV(value * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{fmt(v)}{suffix}</>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="no-print mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{actions}</div>
    </div>
  )
}

export function Card({ title, children, className = '', actions, delay = 0 }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode; delay?: number }) {
  return (
    <section
      style={{ animationDelay: `${delay}ms` }}
      className={`animate-fade-up rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-sm shadow-slate-200/60 backdrop-blur transition duration-300 hover:shadow-md hover:shadow-slate-300/50 ${className}`}
    >
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">{title}</h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
const variants: Record<Variant, string> = {
  primary: 'bg-gradient-to-l from-brand-600 to-indigo-500 text-white shadow-sm shadow-brand-500/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-brand-500/40',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'text-slate-600 hover:bg-slate-100',
}
export function Button({ variant = 'primary', className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...p}
      className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  )
}

export function StatusBadge({ status, cancelled }: { status: InvoiceStatus; cancelled?: boolean }) {
  const k = cancelled ? 'cancelled' : status
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[k]}`}>{statusLabel[k]}</span>
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="no-print animate-fade-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`animate-pop mt-10 w-full rounded-2xl bg-white p-5 shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="text-2xl leading-none text-slate-400 hover:text-slate-700" onClick={onClose} aria-label="بستن">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 text-start font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 [&_td]:px-3 [&_td]:py-2.5">{children}</tbody>
      </table>
      {empty && <p className="py-8 text-center text-sm text-slate-400">موردی برای نمایش وجود ندارد.</p>}
    </div>
  )
}

type Tone = 'slate' | 'green' | 'red' | 'indigo' | 'amber'
const tones: Record<Tone, { text: string; bar: string; glow: string }> = {
  slate: { text: 'text-slate-900', bar: 'from-slate-400 to-slate-300', glow: 'bg-slate-400' },
  green: { text: 'text-emerald-600', bar: 'from-emerald-500 to-teal-400', glow: 'bg-emerald-400' },
  red: { text: 'text-rose-600', bar: 'from-rose-500 to-orange-400', glow: 'bg-rose-400' },
  indigo: { text: 'text-brand-600', bar: 'from-brand-600 to-sky-400', glow: 'bg-brand-500' },
  amber: { text: 'text-amber-600', bar: 'from-amber-500 to-yellow-300', glow: 'bg-amber-400' },
}

export function Stat({ label, value, amount, suffix, tone = 'slate', sub, delay = 0 }: { label: string; value?: string; amount?: number; suffix?: string; tone?: Tone; sub?: string; delay?: number }) {
  const t = tones[tone]
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="group animate-fade-up relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm shadow-slate-200/60 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-300/50"
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-l ${t.bar}`} />
      <div className={`absolute -start-8 -top-8 size-24 rounded-full opacity-10 blur-xl transition group-hover:opacity-25 ${t.glow}`} />
      <div className="relative text-sm text-slate-500">{label}</div>
      <div className={`relative mt-2 text-xl font-bold ${t.text}`}>{amount !== undefined ? <CountUp value={amount} suffix={suffix} /> : value}</div>
      {sub && <div className="relative mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}
