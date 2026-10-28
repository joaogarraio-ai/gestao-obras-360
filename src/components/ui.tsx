import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { Inbox } from 'lucide-react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  const hasCustomBg = /(^|\s)bg-/.test(className)
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors ${hasCustomBg ? '' : 'bg-white'} ${className}`}
    >
      {children}
    </div>
  )
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="no-print flex shrink-0 gap-2">{actions}</div>}
    </div>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-50 disabled:pointer-events-none'
  const variants: Record<string, string> = {
    primary: 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

const campo =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${campo} ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${campo} ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-xs font-medium text-slate-600 mb-1.5">{children}</label>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center text-slate-500 text-sm py-10 px-4 border border-dashed border-slate-300 rounded-2xl bg-white/60">
      <Inbox className="h-6 w-6 text-slate-300" />
      {text}
    </div>
  )
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'green' | 'amber' | 'red' | 'brand' }) {
  const tones: Record<string, string> = {
    default: 'bg-slate-100 text-slate-600 ring-slate-200',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
    brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tones[tone]}`}>{children}</span>
}

export function Tabs<T extends string>({ abas, ativa, onChange }: { abas: readonly { id: T; label: string }[]; ativa: T; onChange: (id: T) => void }) {
  return (
    <div className="no-print mb-4 -mx-1 overflow-x-auto scrollbar-none">
      <div className="inline-flex min-w-full gap-1 rounded-xl bg-slate-100 p-1 mx-1">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => onChange(a.id)}
            className={`flex-1 whitespace-nowrap text-sm font-medium rounded-lg px-3.5 py-2 transition-all ${
              ativa === a.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ProgressBar({ value, tone = 'amber' }: { value: number; tone?: 'amber' | 'green' | 'red' | 'stone' }) {
  const tones: Record<string, string> = {
    amber: 'bg-brand-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    stone: 'bg-slate-300',
  }
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${tones[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 mt-1.5 truncate tabular">{value}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </Card>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-slate-900">{children}</h2>
      {action}
    </div>
  )
}
