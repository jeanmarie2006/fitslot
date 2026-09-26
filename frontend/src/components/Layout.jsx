import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import Logo from './Logo.jsx'
import { get } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { InstallButton } from '../lib/pwa.jsx'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    if (!user) return setUnread(0)
    const load = () => get('notifications').then((n) => setUnread(n.filter((x) => !x.lu).length)).catch(() => {})
    load(); const t = setInterval(load, 30000); window.addEventListener('notifs:changed', load)
    return () => { clearInterval(t); window.removeEventListener('notifs:changed', load) }
  }, [user?.id])
  const link = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`
  const items = [['/', 'Accueil', true], ['/planning', 'Planning'], ['/tarifs', 'Tarifs'], ...(user?.role === 'client' ? [['/mes-reservations', 'Mes séances'], ['/abonnements', 'Abonnement']] : []), ...(user?.role === 'coach' ? [['/coach', 'Tableau de bord coach']] : []), ['/aide', 'Aide']]
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[60] border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Logo />
          <nav className="ml-2 hidden items-center gap-1 lg:flex" aria-label="Navigation principale">{items.map(([to, l, end]) => <NavLink key={to} to={to} end={end} className={link}>{l}</NavLink>)}</nav>
          <div className="ml-auto flex items-center gap-2">
            <InstallButton className="btn-ghost hidden xl:inline-flex !py-2" label="⬇ Installer" />
            {user ? (
              <>
                <Link to="/notifications" className="btn-ghost relative !px-3 !py-2" aria-label={`Notifications (${unread} non lues)`}>🔔{unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[11px] font-bold text-white">{unread}</span>}</Link>
                <span className="hidden text-sm font-semibold text-slate-600 sm:inline">{user.name.split(' ')[0]}</span>
                <button className="btn-ghost !py-2" onClick={async () => { await logout(); nav('/') }}>Quitter</button>
              </>
            ) : (<><Link to="/connexion" className="btn-ghost !py-2">Connexion</Link><Link to="/inscription" className="btn-primary !py-2 hidden sm:inline-flex">S’inscrire</Link></>)}
            <button className="btn-ghost !px-3 !py-2 lg:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Menu">☰</button>
          </div>
        </div>
        {open && <nav className="grid gap-1 border-t border-slate-100 bg-white px-4 py-3 lg:hidden" onClick={() => setOpen(false)}>{items.map(([to, l, end]) => <NavLink key={to} to={to} end={end} className={link}>{l}</NavLink>)}<NavLink to="/installer" className={link}>⬇ Installer l’application</NavLink></nav>}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <p><Link to="/installer" className="font-semibold text-brand-700 hover:underline">Installer l’application</Link> · Projet de démonstration : salle, coachs et paiements fictifs.</p>
        <p className="mt-1">Réalisé par <a className="font-semibold text-brand-700 hover:underline" href="https://sedjame-vianney.vercel.app" target="_blank" rel="noopener">Sedjame Vianney</a></p>
      </footer>
    </div>
  )
}
