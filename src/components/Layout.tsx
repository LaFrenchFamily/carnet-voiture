import { Link, NavLink, Outlet } from 'react-router'
import { OfflineBanner } from './OfflineBanner'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100'}`

export function Layout() {
  return (
    <div className="min-h-dvh pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2">
          <Link to="/" aria-label="Carnet de Voiture" className="flex min-w-0 items-center gap-2 font-semibold text-blue-900">
            <img src="/icons/icon-192.png" alt="" className="h-8 w-8 shrink-0" />
            <span className="sm:hidden">Carnet</span>
            <span className="hidden sm:inline">Carnet de Voiture</span>
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/" end className={navClass}>Accueil</NavLink>
            <NavLink to="/compte" className={navClass}>Compte</NavLink>
          </nav>
        </div>
        <OfflineBanner />
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}
