import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: '🏠' },
  { to: '/lancar-dias', label: 'Dias', icon: '✅' },
  { to: '/materiais', label: 'Materiais', icon: '🧱' },
  { to: '/despesas', label: 'Despesas', icon: '⛽' },
  { to: '/relatorio', label: 'Relatório', icon: '📋' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="no-print sticky top-0 z-10 bg-amber-800 text-white px-4 py-3 flex items-center gap-2 shadow-sm">
        <span className="text-xl">👷</span>
        <span className="font-bold text-lg flex-1">Obra 360</span>
        <NavLink
          to="/cadastros"
          className={({ isActive }) =>
            `text-2xl leading-none rounded-lg p-1.5 ${isActive ? 'bg-amber-900/60' : 'hover:bg-amber-900/40'}`
          }
          aria-label="Cadastros"
        >
          ⚙️
        </NavLink>
      </header>

      <main className="flex-1 px-3 py-4 pb-24 max-w-2xl w-full mx-auto">
        <Outlet />
      </main>

      <nav className="no-print fixed bottom-0 inset-x-0 bg-white border-t border-stone-200 flex justify-around py-1.5 shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-lg text-[11px] font-medium min-w-[64px] ${
                isActive ? 'text-amber-800' : 'text-stone-400'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
