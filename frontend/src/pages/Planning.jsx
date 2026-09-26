import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import frLocale from '@fullcalendar/core/locales/fr'
import { ApiError, get, post } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Field, Modal, Spinner, money, useToast } from '../lib/ui.jsx'
import { DISCIPLINES, PAIEMENTS, dis, heure, jourLong } from '../lib/fit.js'

const isoLocal = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export default function Planning() {
  const { user } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const cal = useRef(null)
  const [events, setEvents] = useState([])
  const [range, setRange] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtre, setFiltre] = useState('')
  const [sel, setSel] = useState(null)      // créneau sélectionné
  const [create, setCreate] = useState(null)
  const isCoach = user?.role === 'coach'
  const mobile = typeof window !== 'undefined' && window.innerWidth < 768

  const load = useCallback(async (r = range) => {
    if (!r) return
    setLoading(true)
    try { setEvents(await get('creneaux', { from: r.start.toISOString().slice(0, 10), to: r.end.toISOString().slice(0, 10) })) } catch (e) { toast(e.message, 'err') } finally { setLoading(false) }
  }, [range])

  const fcEvents = useMemo(() => events.filter((c) => !filtre || c.discipline === filtre).map((c) => {
    const annule = c.statut === 'annule'
    const full = c.restantes === 0
    return {
      id: String(c.id), start: c.debut, end: c.fin, title: `${c.titre}`, extendedProps: c,
      backgroundColor: annule ? '#94a3b8' : dis(c.discipline).color, borderColor: c.ma_reservation ? '#16a34a' : 'transparent',
      classNames: [annule ? 'opacity-50' : full && !c.ma_reservation ? 'opacity-70' : ''],
    }
  }), [events, filtre])

  const render = (arg) => {
    const c = arg.event.extendedProps
    return (
      <div className="h-full overflow-hidden px-1.5 py-0.5 text-[11px] leading-tight text-white">
        <b className="block truncate">{c.ma_reservation ? '✓ ' : ''}{arg.event.title}</b>
        <span className="opacity-90">{heure(c.debut)} · {c.statut === 'annule' ? 'annulé' : isCoach ? `${c.inscrits}/${c.capacite}` : c.restantes === 0 ? 'complet' : `${c.restantes} pl.`}</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold text-slate-900">Planning des séances</h1><p className="text-sm text-slate-500">{isCoach ? 'Cliquez sur une séance pour voir les inscrits, ou sur un créneau libre pour en créer une.' : 'Cliquez sur une séance pour réserver votre place.'}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto" value={filtre} onChange={(e) => setFiltre(e.target.value)} aria-label="Filtrer par discipline"><option value="">Toutes les disciplines</option>{Object.keys(DISCIPLINES).map((d) => <option key={d}>{d}</option>)}</select>
          {isCoach && <button className="btn-primary" onClick={() => setCreate({ debut: isoLocal(new Date(Date.now() + 86400000)).slice(0, 11) + '18:00' })}>＋ Nouvelle séance</button>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-600">{Object.entries(DISCIPLINES).map(([d, v]) => <span key={d} className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded" style={{ background: v.color }} />{d}</span>)}<span className="inline-flex items-center gap-1.5"><i className="h-3 w-3 rounded border-2 border-green-600 bg-white" />Ma réservation</span></div>

      <div className="card relative mt-4 p-2 sm:p-4">
        {loading && <div className="absolute right-4 top-4 z-10 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow">Chargement…</div>}
        <FullCalendar
          ref={cal}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={frLocale} firstDay={1} height="auto" nowIndicator
          initialView={mobile ? 'listWeek' : 'timeGridWeek'}
          headerToolbar={{ left: 'prev,next today', center: 'title', right: mobile ? 'listWeek,dayGridMonth' : 'timeGridWeek,dayGridMonth,listWeek' }}
          buttonText={{ today: 'Aujourd’hui', month: 'Mois', week: 'Semaine', list: 'Liste' }}
          slotMinTime="06:00:00" slotMaxTime="22:00:00" allDaySlot={false} slotDuration="00:30:00" expandRows
          events={fcEvents} eventContent={render}
          datesSet={(a) => { const r = { start: a.start, end: a.end }; setRange(r); load(r) }}
          eventClick={(i) => setSel(i.event.extendedProps)}
          dateClick={isCoach ? (i) => setCreate({ debut: isoLocal(i.date) }) : undefined}
          selectable={false}
        />
      </div>

      {sel && <SlotModal c={sel} user={user} onClose={() => setSel(null)} onChanged={() => { setSel(null); load() }} onLogin={() => nav('/connexion')} />}
      {create && <CreateModal init={create} onClose={() => setCreate(null)} onDone={() => { setCreate(null); load() }} />}
    </div>
  )
}

function SlotModal({ c, user, onClose, onChanged, onLogin }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState(null)
  const [numero, setNumero] = useState(user?.telephone || '')
  const [inscrits, setInscrits] = useState(null)
  const isCoach = user?.role === 'coach'
  const d = dis(c.discipline)
  const passe = new Date(c.debut) < new Date()

  useEffect(() => { if (isCoach) get(`creneaux/${c.id}/inscrits`).then(setInscrits).catch(() => {}) }, [c.id])

  const run = async (fn, ok) => { setBusy(true); try { await fn(); toast(ok); onChanged() } catch (e) { toast(e instanceof ApiError ? e.all() : e.message, 'err') } finally { setBusy(false) } }
  const reserver = () => run(() => post(`creneaux/${c.id}/reserver`, { paiement: mode, numero: ['momo', 'moov'].includes(mode) ? numero : undefined }), 'Séance réservée ! Un e-mail de confirmation a été envoyé.')
  const annuler = () => confirm('Annuler votre réservation ?') && run(() => post(`reservations/${c.ma_reservation.id}/annuler`), 'Réservation annulée.')
  const annulerSeance = () => confirm('Annuler cette séance ? Tous les inscrits seront prévenus.') && run(() => post(`creneaux/${c.id}/annuler`), 'Séance annulée.')
  const presence = async (r, present) => { try { await post(`reservations/${r.id}/presence`, { present }); setInscrits((s) => ({ ...s, inscrits: s.inscrits.map((x) => (x.id === r.id ? { ...x, present } : x)) })) } catch (e) { toast(e.message, 'err') } }

  return (
    <Modal title={c.titre} onClose={onClose} wide={isCoach}>
      <div className="mb-4 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl text-2xl text-white" style={{ background: d.color }}>{d.icon}</span>
        <div><p className="font-bold capitalize text-slate-900">{jourLong(c.debut)}</p><p className="text-sm text-slate-500">{heure(c.debut)} – {heure(c.fin)} · {c.duree} min · {c.salle}</p></div></div>
      <dl className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-center text-sm">
        <div><dt className="text-xs text-slate-400">Coach</dt><dd className="font-bold">{c.coach.name}</dd></div>
        <div><dt className="text-xs text-slate-400">Places</dt><dd className={`font-bold ${c.restantes === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{c.inscrits}/{c.capacite}</dd></div>
        <div><dt className="text-xs text-slate-400">Prix</dt><dd className="font-bold">{money(c.prix)}</dd></div>
      </dl>
      {c.statut === 'annule' && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-semibold text-slate-600">Cette séance a été annulée.</p>}

      {isCoach && inscrits && (
        <div className="mt-4"><h3 className="mb-2 text-sm font-extrabold text-slate-800">Inscrits ({inscrits.inscrits.length})</h3>
          {inscrits.inscrits.length === 0 ? <p className="text-sm text-slate-500">Aucun inscrit pour le moment.</p> : (
            <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">{inscrits.inscrits.map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-3 py-2 text-sm"><b className="flex-1">{r.client.name}<span className="block text-xs font-normal text-slate-400">{PAIEMENTS[r.paiement]} · {r.paye ? 'payé' : 'à régler sur place'}{r.client.telephone ? ` · ${r.client.telephone}` : ''}</span></b>
                {passe && <div className="flex gap-1"><button className={`btn-ghost !px-2.5 !py-1 text-xs ${r.present === true ? '!border-emerald-500 !bg-emerald-50' : ''}`} onClick={() => presence(r, true)}>Présent</button><button className={`btn-ghost !px-2.5 !py-1 text-xs ${r.present === false ? '!border-rose-500 !bg-rose-50' : ''}`} onClick={() => presence(r, false)}>Absent</button></div>}
              </li>))}</ul>)}
          {c.statut === 'ouvert' && !passe && <button className="btn-danger mt-4" onClick={annulerSeance} disabled={busy}>Annuler cette séance</button>}
        </div>
      )}

      {!isCoach && c.statut === 'ouvert' && !passe && (
        <div className="mt-4">
          {c.ma_reservation ? (
            <div className="space-y-3"><p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">✓ Vous êtes inscrit à cette séance.</p><button className="btn-ghost text-rose-600" onClick={annuler} disabled={busy}>Annuler ma réservation</button></div>
          ) : c.restantes === 0 ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">Cette séance est complète.</p>
            : !user ? <button className="btn-primary w-full" onClick={onLogin}>Se connecter pour réserver</button>
            : user.role !== 'client' ? null : (
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-800">Comment réglez-vous cette séance ?</p>
                <div className="grid gap-2">{[['abonnement', '🎟️ Avec mon abonnement', 'Une séance de votre pack (ou mensuel illimité)'], ['momo', '📱 MTN MoMo', `${money(c.prix)} — paiement simulé`], ['moov', '📱 Moov Money', `${money(c.prix)} — paiement simulé`], ['sur_place', '🏢 Sur place', 'Vous réglez à la salle']].map(([k, l, h]) => (
                  <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k} className={`rounded-xl border-2 p-3 text-left transition ${mode === k ? 'border-brand-700 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}><b className="text-sm">{l}</b><span className="block text-xs text-slate-500">{h}</span></button>))}</div>
                {['momo', 'moov'].includes(mode) && <Field label="Numéro Mobile Money"><input className="input" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="+229 01 …" inputMode="tel" /></Field>}
                <button className="btn-primary w-full !py-3" disabled={!mode || busy} onClick={reserver}>{busy ? 'Réservation…' : 'Confirmer la réservation'}</button>
              </div>)}
        </div>
      )}
    </Modal>
  )
}

function CreateModal({ init, onClose, onDone }) {
  const toast = useToast()
  const [f, setF] = useState({ discipline: 'Cardio', titre: '', debut: init.debut, duree: 60, capacite: 12, prix: 2500, salle: 'Salle principale', repeter: false, jours: [], semaines: 4 })
  const [err, setErr] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const toggle = (j) => setF({ ...f, jours: f.jours.includes(j) ? f.jours.filter((x) => x !== j) : [...f.jours, j] })
  const submit = async (e) => {
    e.preventDefault(); setErr({}); setBusy(true)
    try {
      const r = await post('creneaux', { discipline: f.discipline, titre: f.titre || f.discipline, debut: f.debut.replace('T', ' ') + ':00', duree: Number(f.duree), capacite: Number(f.capacite), prix: Number(f.prix), salle: f.salle, jours: f.repeter ? f.jours : undefined, semaines: f.repeter ? Number(f.semaines) : undefined })
      toast(`${r.created} séance${r.created > 1 ? 's' : ''} créée${r.created > 1 ? 's' : ''}.`); onDone()
    } catch (x) { if (x instanceof ApiError) setErr(Object.fromEntries(Object.entries(x.errors).map(([k, v]) => [k, v[0]]))); toast(x.message, 'err') } finally { setBusy(false) }
  }
  return (
    <Modal title="Nouvelle séance" onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
        <Field label="Discipline"><select className="input" value={f.discipline} onChange={set('discipline')}>{Object.keys(DISCIPLINES).map((d) => <option key={d}>{d}</option>)}</select></Field>
        <Field label="Titre" error={err.titre}><input className="input" value={f.titre} onChange={set('titre')} placeholder={f.discipline} /></Field>
        <Field label="Début" error={err.debut}><input type="datetime-local" className="input" value={f.debut} onChange={set('debut')} step="900" /></Field>
        <Field label="Durée (min)" error={err.duree}><input type="number" className="input" value={f.duree} onChange={set('duree')} min="20" max="180" step="5" /></Field>
        <Field label="Capacité" error={err.capacite}><input type="number" className="input" value={f.capacite} onChange={set('capacite')} min="1" max="60" /></Field>
        <Field label="Prix de la séance (FCFA)" error={err.prix}><input type="number" className="input" value={f.prix} onChange={set('prix')} min="0" step="500" /></Field>
        <Field label="Salle"><input className="input" value={f.salle} onChange={set('salle')} /></Field>
        <div className="rounded-xl bg-slate-50 p-3 sm:col-span-2">
          <label className="flex items-center gap-3 font-semibold"><input type="checkbox" className="h-5 w-5 accent-orange-700" checked={f.repeter} onChange={set('repeter')} /> 🔁 Répéter chaque semaine</label>
          {f.repeter && (<div className="mt-3 space-y-3"><div className="flex flex-wrap gap-1.5">{['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((j, i) => <button type="button" key={j} onClick={() => toggle(i + 1)} aria-pressed={f.jours.includes(i + 1)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${f.jours.includes(i + 1) ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{j}</button>)}</div>
            <div className="flex items-center gap-2 text-sm text-slate-600">Pendant <select className="input !w-24" value={f.semaines} onChange={set('semaines')} aria-label="Semaines">{[1, 2, 3, 4, 6, 8, 12].map((n) => <option key={n}>{n}</option>)}</select> semaine(s)</div>{err.jours && <p className="text-xs font-semibold text-rose-600">{err.jours}</p>}</div>)}
        </div>
        <div className="flex gap-2 sm:col-span-2"><button type="button" className="btn-ghost flex-1" onClick={onClose}>Annuler</button><button className="btn-primary flex-1" disabled={busy || (f.repeter && f.jours.length === 0)}>{busy ? 'Création…' : 'Créer'}</button></div>
      </form>
    </Modal>
  )
}
