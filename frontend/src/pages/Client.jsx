import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ApiError, get, post } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Empty, Field, Modal, Spinner, dateFr, money, useLoad, useToast } from '../lib/ui.jsx'
import { PAIEMENTS, dis, heure, jourLong } from '../lib/fit.js'
import { Offres } from './Home.jsx'

function Guard({ role, children }) {
  const { user, ready } = useAuth()
  if (!ready) return <Spinner />
  if (!user) return <Navigate to="/connexion" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'coach' ? '/coach' : '/mes-reservations'} replace />
  return children
}

export function MesReservations() {
  return <Guard role="client"><Reservations /></Guard>
}

function Reservations() {
  const toast = useToast()
  const r = useLoad(() => get('mes-reservations'), [])
  const [tab, setTab] = useState('avenir')
  const [report, setReport] = useState(null)
  const list = r.data || []
  const avenir = list.filter((x) => x.statut === 'confirmee' && x.a_venir)
  const histo = list.filter((x) => !(x.statut === 'confirmee' && x.a_venir))
  const annuler = async (x) => { if (!confirm('Annuler cette séance ?')) return; try { await post(`reservations/${x.id}/annuler`); toast('Réservation annulée.'); r.reload() } catch (e) { toast(e instanceof ApiError ? e.all() : e.message, 'err') } }
  const shown = tab === 'avenir' ? avenir : histo

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-extrabold text-slate-900">Mes séances</h1><Link to="/planning" className="btn-primary">Réserver une séance</Link></div>
      <div className="mt-5 flex gap-2">{[['avenir', `À venir (${avenir.length})`], ['histo', `Historique (${histo.length})`]].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === k ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{l}</button>)}</div>
      <div className="mt-5 grid gap-3">
        {r.loading && !r.data ? <Spinner /> : shown.length === 0 ? <Empty icon="🏋️" title={tab === 'avenir' ? 'Aucune séance à venir' : 'Aucune séance passée'}><Link to="/planning" className="btn-primary mt-3">Voir le planning</Link></Empty> : shown.map((x) => {
          const c = x.creneau, d = dis(c.discipline)
          return (
            <article key={x.id} className="card flex flex-wrap items-center gap-4 p-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl text-white" style={{ background: d.color }}>{d.icon}</span>
              <div className="min-w-0 flex-1"><b className="text-slate-900">{c.titre}</b><p className="text-sm capitalize text-slate-500">{jourLong(c.debut)} · {heure(c.debut)} · {c.duree} min</p><p className="text-xs text-slate-400">{c.coach} · {c.salle} · {PAIEMENTS[x.paiement]}{x.paye ? ' ✓' : ' (à régler sur place)'}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                {x.statut === 'annulee' && <span className="badge bg-slate-200 text-slate-600">Annulée</span>}
                {x.statut === 'confirmee' && c.statut === 'annule' && <span className="badge bg-rose-100 text-rose-700">Séance annulée par la salle</span>}
                {x.statut === 'confirmee' && !x.a_venir && c.statut === 'ouvert' && <span className={`badge ${x.present === false ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{x.present === false ? 'Absent' : 'Effectuée'}</span>}
                {x.statut === 'confirmee' && x.a_venir && (x.peut_annuler ? <><button className="btn-ghost !py-1.5 text-xs" onClick={() => setReport(x)}>↔ Reporter</button><button className="btn-ghost !py-1.5 text-xs text-rose-600" onClick={() => annuler(x)}>Annuler</button></> : <span className="text-xs text-slate-400">Modification impossible (moins de 2 h)</span>)}
              </div>
            </article>)
        })}
      </div>
      {report && <ReportModal x={report} onClose={() => setReport(null)} onDone={() => { setReport(null); r.reload() }} />}
    </div>
  )
}

function ReportModal({ x, onClose, onDone }) {
  const toast = useToast()
  const [libres, setLibres] = useState(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { get('creneaux', { from: new Date().toISOString().slice(0, 10), to: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) }).then((l) => setLibres(l.filter((c) => c.statut === 'ouvert' && c.restantes > 0 && !c.ma_reservation && new Date(c.debut) > new Date()))) }, [])
  const go = async (c) => { setBusy(true); try { await post(`reservations/${x.id}/reporter`, { creneau_id: c.id }); toast('Séance reportée.'); onDone() } catch (e) { toast(e instanceof ApiError ? e.all() : e.message, 'err') } finally { setBusy(false) } }
  return (
    <Modal title="Reporter la séance" onClose={onClose} wide>
      <p className="mb-3 text-sm text-slate-600">Choisissez un nouveau créneau pour « {x.creneau.titre} ». Votre paiement ou votre séance d’abonnement est conservé.</p>
      {!libres ? <Spinner /> : libres.length === 0 ? <p className="text-sm text-slate-500">Aucun créneau disponible dans les 14 prochains jours.</p> : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">{libres.slice(0, 40).map((c) => (
          <li key={c.id}><button disabled={busy} onClick={() => go(c)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-brand-500 hover:bg-brand-50"><span className="grid h-9 w-9 place-items-center rounded-lg text-lg text-white" style={{ background: dis(c.discipline).color }}>{dis(c.discipline).icon}</span><span className="flex-1"><b className="block text-sm">{c.titre}</b><span className="text-xs capitalize text-slate-500">{jourLong(c.debut)} · {heure(c.debut)}</span></span><span className="text-xs font-bold text-emerald-600">{c.restantes} pl.</span></button></li>))}</ul>)}
    </Modal>
  )
}

export function Abonnements() {
  return <Guard role="client"><Abos /></Guard>
}

function Abos() {
  const toast = useToast()
  const a = useLoad(() => get('mes-abonnements'), [])
  const [buy, setBuy] = useState(null)
  const [f, setF] = useState({ mode: 'momo', numero: '' })
  const [busy, setBusy] = useState(false)
  const acheter = async () => {
    setBusy(true)
    try { await post('abonnements', { offre: buy.code, mode: f.mode, numero: f.numero }); toast('Abonnement activé !'); setBuy(null); a.reload(); window.dispatchEvent(new Event('notifs:changed')) }
    catch (e) { toast(e instanceof ApiError ? e.all() : e.message, 'err') } finally { setBusy(false) }
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-slate-900">Mon abonnement</h1>
      <section className="mt-5 grid gap-3 md:grid-cols-2">
        {a.loading && !a.data ? <Spinner /> : (a.data || []).length === 0 ? <Empty icon="🎟️" title="Aucun abonnement">Choisissez une offre ci-dessous.</Empty> : a.data.map((x) => (
          <article key={x.id} className={`card p-5 ${x.actif ? '' : 'opacity-60'}`}>
            <div className="flex items-center justify-between"><h2 className="font-extrabold text-slate-900">{x.libelle}</h2><span className={`badge ${x.actif ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{x.actif ? 'Actif' : 'Terminé'}</span></div>
            {x.seances_total !== null ? (<><p className="mt-3 text-3xl font-extrabold text-brand-700">{x.seances_restantes}<span className="text-base font-semibold text-slate-400"> / {x.seances_total} séances</span></p>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={x.seances_restantes} aria-valuemax={x.seances_total}><i className="block h-full rounded-full bg-brand-500" style={{ width: `${(x.seances_restantes / x.seances_total) * 100}%` }} /></div></>) : <p className="mt-3 text-2xl font-extrabold text-brand-700">Séances illimitées</p>}
            <p className="mt-3 text-xs text-slate-500">Valable jusqu’au {dateFr(x.expire_le)} · payé {money(x.prix)} par {x.paiement_mode === 'momo' ? 'MTN MoMo' : 'Moov Money'}</p>
          </article>))}
      </section>
      <h2 className="mb-4 mt-10 text-xl font-extrabold text-slate-900">Acheter une offre</h2>
      <Offres onChoose={(o) => { setBuy(o); setF({ mode: 'momo', numero: '' }) }} />
      {buy && (
        <Modal title={`${buy.libelle} — ${money(buy.prix)}`} onClose={() => setBuy(null)}>
          <p className="mb-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">Simulation : aucun argent réel n’est débité.</p>
          <div className="mb-4 grid grid-cols-2 gap-2">{[['momo', 'MTN MoMo', '#facc15'], ['moov', 'Moov Money', '#2563eb']].map(([v, l, c]) => <button key={v} type="button" onClick={() => setF({ ...f, mode: v })} aria-pressed={f.mode === v} className={`rounded-xl border-2 p-3 text-sm font-bold ${f.mode === v ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}><span className="mr-1.5 inline-block h-3 w-3 rounded-full" style={{ background: c }} />{l}</button>)}</div>
          <Field label="Numéro Mobile Money"><input className="input" value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} placeholder="+229 01 …" inputMode="tel" autoFocus /></Field>
          <div className="mt-4 flex gap-2"><button className="btn-ghost flex-1" onClick={() => setBuy(null)}>Annuler</button><button className="btn-primary flex-1" disabled={busy || f.numero.length < 8} onClick={acheter}>Payer {money(buy.prix)}</button></div>
        </Modal>
      )}
    </div>
  )
}

export function Notifications() {
  return <Guard><Notifs /></Guard>
}

function Notifs() {
  const n = useLoad(() => get('notifications'), [])
  useEffect(() => { if (n.data?.some((x) => !x.lu)) post('notifications/lues').then(() => window.dispatchEvent(new Event('notifs:changed'))).catch(() => {}) }, [n.data])
  const ICON = { succes: '✅', alerte: '⚠️', rappel: '⏰', info: 'ℹ️' }
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-slate-900">Notifications</h1>
      <p className="text-sm text-slate-500">Vos e-mails de confirmation et rappels (simulés : l’hébergement de démonstration n’envoie pas de vrais e-mails).</p>
      <div className="mt-5 grid gap-3">{n.loading && !n.data ? <Spinner /> : (n.data || []).length === 0 ? <Empty icon="🔔" title="Aucune notification" /> : n.data.map((x) => (
        <article key={x.id} className={`card flex gap-3 p-4 ${x.lu ? '' : 'border-brand-500'}`}><span className="text-2xl">{ICON[x.type] || 'ℹ️'}</span><div><b className="text-slate-900">{x.sujet}</b><p className="text-sm text-slate-600">{x.contenu.replace(/#\d+$/, '')}</p><p className="mt-1 text-xs text-slate-400">{new Date(x.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p></div></article>))}</div>
    </div>
  )
}
