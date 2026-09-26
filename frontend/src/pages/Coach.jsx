import { Link, Navigate } from 'react-router-dom'
import { get, post } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Spinner, money, useLoad, useToast } from '../lib/ui.jsx'
import { dis, heure, jourCourt } from '../lib/fit.js'

export default function Coach() {
  const { user, ready } = useAuth()
  const toast = useToast()
  const s = useLoad(() => (user?.role === 'coach' ? get('coach/stats') : Promise.resolve(null)), [user?.id])
  if (!ready) return <Spinner />
  if (!user) return <Navigate to="/connexion" replace />
  if (user.role !== 'coach') return <Navigate to="/mes-reservations" replace />
  if (s.loading && !s.data) return <Spinner />
  const d = s.data
  const maxJ = Math.max(1, ...d.par_jour.map((j) => j.capacite))
  const maxD = Math.max(1, ...d.par_discipline.map((x) => x.inscrits))
  const rappels = async () => { try { const r = await post('coach/rappels'); toast(`${r.envoyes} rappel(s) envoyé(s) pour les séances de demain.`) } catch (e) { toast(e.message, 'err') } }
  const Kpi = ({ l, v, t = 'text-slate-900', h }) => <div className="card p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{l}</p><p className={`mt-1 text-3xl font-extrabold ${t}`}>{v}</p>{h && <p className="text-xs text-slate-500">{h}</p>}</div>
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold text-slate-900">Tableau de bord du coach</h1><p className="text-sm text-slate-500">Fréquentation et revenus des 30 derniers jours.</p></div>
        <div className="flex gap-2"><button className="btn-ghost" onClick={rappels}>⏰ Envoyer les rappels de demain</button><Link to="/planning" className="btn-primary">Gérer le planning</Link></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi l="Séances données" v={d.seances} h={`${d.inscriptions} inscriptions`} />
        <Kpi l="Taux de remplissage" v={`${d.taux_remplissage} %`} t="text-brand-700" h="places occupées / capacité" />
        <Kpi l="Revenus" v={money(d.revenus)} t="text-emerald-600" h={`séances ${money(d.revenus_seances)} · abonnements ${money(d.ventes_abonnements)}`} />
        <Kpi l="Clients inscrits" v={d.clients} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-labelledby="pj"><h2 id="pj" className="font-extrabold text-slate-900">Fréquentation par jour</h2>
          <div className="mt-6 flex gap-3" role="img" aria-label="Histogramme de fréquentation par jour de la semaine">{d.par_jour.map((j) => (
            <div key={j.jour} className="flex flex-1 flex-col items-center gap-1.5"><span className="text-xs font-bold text-slate-700">{j.inscrits}</span>
              <div className="flex h-36 w-full items-end rounded-lg bg-slate-100"><div className="w-full rounded-lg bg-gradient-to-t from-brand-700 to-brand-500" style={{ height: `${(j.inscrits / maxJ) * 100}%` }} /></div><span className="text-xs text-slate-500">{j.jour}</span></div>))}</div></section>
        <section className="card p-6" aria-labelledby="pd"><h2 id="pd" className="font-extrabold text-slate-900">Par discipline</h2>
          <ul className="mt-5 space-y-3">{d.par_discipline.sort((a, b) => b.inscrits - a.inscrits).map((x) => (
            <li key={x.discipline} className="text-sm"><div className="mb-1 flex justify-between"><b>{dis(x.discipline).icon} {x.discipline}</b><span className="text-slate-500">{x.inscrits} inscrits · {x.seances} séances</span></div><div className="h-2.5 rounded-full bg-slate-100"><i className="block h-full rounded-full" style={{ width: `${(x.inscrits / maxD) * 100}%`, background: dis(x.discipline).color }} /></div></li>))}</ul></section>
        <section className="card p-6"><h2 className="font-extrabold text-slate-900">🏆 Clients les plus assidus</h2><ol className="mt-4 space-y-2.5">{d.top_clients.map((c, i) => <li key={c.name} className="flex items-center gap-3 text-sm"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">{i + 1}</span><b className="flex-1">{c.name}</b><span className="text-slate-500">{c.seances} séances</span></li>)}</ol></section>
        <section className="card p-6"><h2 className="font-extrabold text-slate-900">🔥 Séances presque pleines</h2>{d.presque_pleines.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucune séance à venir n’est proche de la saturation.</p> : <ul className="mt-4 space-y-2.5">{d.presque_pleines.map((c) => <li key={c.id} className="flex items-center gap-3 text-sm"><b className="flex-1">{c.titre}<span className="block text-xs font-normal capitalize text-slate-500">{jourCourt(c.debut)} · {heure(c.debut)}</span></b><span className="badge bg-amber-100 text-amber-800">{c.inscrits}/{c.capacite}</span></li>)}</ul>}</section>
      </div>
    </div>
  )
}
