import { Link } from 'react-router-dom'
import { get } from '../lib/api.js'
import { Spinner, money, useLoad } from '../lib/ui.jsx'
import { DISCIPLINES, dis, heure, jourCourt } from '../lib/fit.js'
import { useAuth } from '../lib/auth.jsx'

export function Offres({ onChoose }) {
  const o = useLoad(() => get('offres'), [])
  if (o.loading) return <Spinner />
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {o.data.map((x, i) => (
        <article key={x.code} className={`card relative flex flex-col p-6 ${i === 1 ? 'ring-2 ring-brand-500' : ''}`}>
          {i === 1 && <span className="badge absolute -top-3 left-6 bg-brand-700 text-white">Le plus choisi</span>}
          <h3 className="text-lg font-extrabold text-slate-900">{x.libelle}</h3>
          <p className="mt-2 text-3xl font-extrabold text-brand-700">{money(x.prix)}</p>
          <p className="text-sm text-slate-500">{x.detail}</p>
          <ul className="mt-4 flex-1 space-y-1.5 text-sm text-slate-600"><li>✓ {x.seances ? `${x.seances} séances au choix` : 'Séances illimitées'}</li><li>✓ Réservation en ligne 24 h/24</li><li>✓ Annulation gratuite jusqu’à 2 h avant</li></ul>
          {onChoose && <button className="btn-primary mt-5" onClick={() => onChoose(x)}>Choisir cette offre</button>}
        </article>
      ))}
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const now = new Date()
  const next = useLoad(() => get('creneaux', { from: now.toISOString().slice(0, 10), to: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) }), [])
  const prochaines = (next.data || []).filter((c) => c.statut === 'ouvert' && new Date(c.debut) > now).slice(0, 6)
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-orange-900 to-brand-700 text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-brand-500/30 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 md:pt-20">
          <p className="mb-4 inline-flex rounded-full bg-white/15 px-3.5 py-1 text-xs font-bold tracking-wide">🏋️ Atlas Fitness Club · Cotonou</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl">Réservez votre séance. <span className="text-brand-500">Bougez, simplement.</span></h1>
          <p className="mt-5 max-w-2xl text-lg text-white/85">Musculation, cardio, yoga, boxe, danse… Consultez le planning en direct, réservez votre place en 10 secondes et suivez votre abonnement.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/planning" className="btn-primary !py-3 px-7 text-base !bg-white !text-slate-900 hover:!bg-brand-50">Voir le planning</Link>{!user && <Link to="/inscription" className="btn-ghost !py-3 px-7 text-base !border-white/40 !bg-transparent !text-white hover:!bg-white/10">Créer un compte</Link>}</div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-extrabold text-slate-900">Nos disciplines</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Object.entries(DISCIPLINES).map(([d, v]) => (
          <Link key={d} to="/planning" className="card flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-1 hover:shadow-lg"><span className="grid h-14 w-14 place-items-center rounded-2xl text-3xl text-white" style={{ background: v.color }}>{v.icon}</span><b className="text-sm text-slate-900">{d}</b></Link>))}</div>
      </section>

      <section className="bg-white py-12"><div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between"><h2 className="text-2xl font-extrabold text-slate-900">Prochaines séances</h2><Link to="/planning" className="text-sm font-bold text-brand-700 hover:underline">Tout le planning →</Link></div>
        {next.loading ? <Spinner /> : <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{prochaines.map((c) => (
          <Link key={c.id} to="/planning" className="card flex items-center gap-4 p-4 transition hover:shadow-md"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl text-white" style={{ background: dis(c.discipline).color }}>{dis(c.discipline).icon}</span>
            <div className="min-w-0 flex-1"><b className="block truncate text-slate-900">{c.titre}</b><p className="text-xs capitalize text-slate-500">{jourCourt(c.debut)} · {heure(c.debut)} · {c.coach.name}</p></div>
            <span className={`badge ${c.restantes === 0 ? 'bg-rose-100 text-rose-700' : c.restantes <= 3 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{c.restantes === 0 ? 'Complet' : `${c.restantes} pl.`}</span></Link>))}</div>}
      </div></section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-extrabold text-slate-900">Des offres simples</h2>
        <div className="mt-8"><Offres onChoose={() => (location.hash = '#/abonnements')} /></div>
      </section>
    </>
  )
}
