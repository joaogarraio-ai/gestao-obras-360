import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Building2,
  CalendarCheck,
  Cloud,
  CloudOff,
  FileText,
  LayoutDashboard,
  Loader2,
  MoreHorizontal,
  Package,
  RefreshCw,
  Settings,
  Smartphone,
  TriangleAlert,
  Truck,
  UserCircle,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useSync, type StatusSync } from '../lib/sync'

interface ItemNav {
  to: string
  label: string
  icon: LucideIcon
}

const GRUPOS: { titulo: string; itens: ItemNav[] }[] = [
  {
    titulo: 'Dia a dia',
    itens: [
      { to: '/', label: 'Painel', icon: LayoutDashboard },
      { to: '/lancar-dias', label: 'Diárias e tarefas', icon: CalendarCheck },
      { to: '/materiais', label: 'Materiais', icon: Package },
      { to: '/despesas', label: 'Despesas', icon: Truck },
    ],
  },
  {
    titulo: 'Gestão',
    itens: [
      { to: '/obras', label: 'Obras', icon: Building2 },
      { to: '/financeiro', label: 'Financeiro', icon: Wallet },
      { to: '/relatorio', label: 'Relatório semanal', icon: FileText },
    ],
  },
  {
    titulo: 'Configurações',
    itens: [
      { to: '/cadastros', label: 'Cadastros', icon: Settings },
      { to: '/conta', label: 'Conta e equipe', icon: UserCircle },
    ],
  },
]

const BARRA_INFERIOR: ItemNav[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/lancar-dias', label: 'Diárias', icon: CalendarCheck },
  { to: '/obras', label: 'Obras', icon: Building2 },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
]

const SYNC: Record<StatusSync, { icon: LucideIcon; texto: string; cor: string; gira?: boolean }> = {
  local: { icon: Smartphone, texto: 'Só neste aparelho', cor: 'text-slate-400' },
  carregando: { icon: Loader2, texto: 'Carregando', cor: 'text-slate-400', gira: true },
  sincronizado: { icon: Cloud, texto: 'Sincronizado', cor: 'text-emerald-500' },
  enviando: { icon: RefreshCw, texto: 'Enviando', cor: 'text-brand-400', gira: true },
  offline: { icon: CloudOff, texto: 'Offline', cor: 'text-amber-500' },
  erro: { icon: TriangleAlert, texto: 'Erro ao sincronizar', cor: 'text-red-500' },
}

function Logo({ escuro = false }: { escuro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-8 w-8 rounded-lg" />
      <span className={`font-semibold tracking-tight ${escuro ? 'text-white' : 'text-slate-900'}`}>Obra 360</span>
    </div>
  )
}

function linkLateral({ isActive }: { isActive: boolean }) {
  return `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
  }`
}

export default function Layout() {
  const { status, empresa } = useSync()
  const sync = SYNC[status]
  const [maisAberto, setMaisAberto] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMaisAberto(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  const SyncIcon = sync.icon
  const maisAtivo = !BARRA_INFERIOR.some((i) => (i.to === '/' ? location.pathname === '/' : location.pathname.startsWith(i.to)))

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Menu lateral (computador) */}
      <aside className="no-print hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-slate-950 px-4 py-5">
        <div className="px-2">
          <Logo escuro />
          {empresa && <p className="mt-3 truncate rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-300">{empresa.nome}</p>}
        </div>
        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.titulo}</p>
              <div className="space-y-0.5">
                {g.itens.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.to === '/'} className={linkLateral}>
                    <i.icon className="h-[18px] w-[18px] shrink-0" />
                    {i.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <NavLink to="/conta" className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5">
          <SyncIcon className={`h-4 w-4 ${sync.cor} ${sync.gira ? 'animate-spin' : ''}`} />
          {sync.texto}
        </NavLink>
      </aside>

      {/* Barra superior (celular) */}
      <header className="no-print lg:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-md">
        <div className="min-w-0 flex items-center gap-2">
          <Logo />
          {empresa && <span className="truncate text-xs text-slate-500">· {empresa.nome}</span>}
        </div>
        <NavLink to="/conta" className="flex items-center rounded-lg p-1.5 hover:bg-slate-100" aria-label={sync.texto} title={sync.texto}>
          <SyncIcon className={`h-5 w-5 ${sync.cor} ${sync.gira ? 'animate-spin' : ''}`} />
        </NavLink>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-12">
        <Outlet />
      </main>

      {/* Barra inferior (celular) */}
      <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-20 border-t border-slate-200/70 bg-white/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {BARRA_INFERIOR.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${isActive ? 'text-brand-600' : 'text-slate-400'}`
              }
            >
              <i.icon className="h-[22px] w-[22px]" />
              {i.label}
            </NavLink>
          ))}
          <button
            onClick={() => setMaisAberto(true)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${maisAtivo ? 'text-brand-600' : 'text-slate-400'}`}
          >
            <MoreHorizontal className="h-[22px] w-[22px]" />
            Mais
          </button>
        </div>
      </nav>

      {/* Menu "Mais" (celular) */}
      {maisAberto && (
        <div className="no-print lg:hidden fixed inset-0 z-30 flex items-end bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setMaisAberto(false)}>
          <div className="w-full rounded-t-3xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-slate-900">Menu</p>
              <button onClick={() => setMaisAberto(false)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {GRUPOS.flatMap((g) => g.itens).map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  end={i.to === '/'}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center text-xs font-medium ${
                      isActive ? 'border-brand-200 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-700'
                    }`
                  }
                >
                  <i.icon className="h-5 w-5" />
                  {i.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
