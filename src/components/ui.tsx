import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  const hasCustomBg = /(^|\s)bg-/.test(className)
  return (
    <div className={`rounded-xl shadow-sm border border-stone-200 ${hasCustomBg ? '' : 'bg-white'} ${className}`}>
      {children}
    </div>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-xl font-bold text-stone-900">{title}</h1>
      {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none'
  const variants: Record<string, string> = {
    primary: 'bg-amber-700 text-white hover:bg-amber-800 active:bg-amber-900',
    secondary: 'bg-stone-100 text-stone-700 hover:bg-stone-200',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100',
    ghost: 'text-stone-600 hover:bg-stone-100',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-100 ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-100 bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="block text-sm font-medium text-stone-600 mb-1">{children}</label>
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
    <div className="text-center text-stone-400 text-sm py-10 border border-dashed border-stone-300 rounded-xl">
      {text}
    </div>
  )
}

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'green' | 'amber' | 'red' }) {
  const tones: Record<string, string> = {
    default: 'bg-stone-100 text-stone-600',
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
  }
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function Tabs<T extends string>({ abas, ativa, onChange }: { abas: readonly { id: T; label: string }[]; ativa: T; onChange: (id: T) => void }) {
  return (
    <div className="no-print flex gap-1 mb-4 bg-stone-100 rounded-lg p-1 overflow-x-auto">
      {abas.map((a) => (
        <button
          key={a.id}
          onClick={() => onChange(a.id)}
          className={`flex-1 whitespace-nowrap text-sm font-medium rounded-md px-3 py-2 transition-colors ${
            ativa === a.id ? 'bg-white text-amber-800 shadow-sm' : 'text-stone-500'
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ value, tone = 'amber' }: { value: number; tone?: 'amber' | 'green' | 'red' | 'stone' }) {
  const tones: Record<string, string> = {
    amber: 'bg-amber-600',
    green: 'bg-green-600',
    red: 'bg-red-500',
    stone: 'bg-stone-400',
  }
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="h-2 w-full rounded-full bg-stone-200 overflow-hidden">
      <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-lg font-bold text-stone-900 mt-0.5 truncate">{value}</p>
      {hint && <p className="text-xs text-stone-500 mt-0.5">{hint}</p>}
    </Card>
  )
}
