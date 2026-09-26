import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { ApiError } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { Field } from '../lib/ui.jsx'

export default function AuthPage({ mode }) {
  const isReg = mode === 'register'
  const { user, login, register } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '', telephone: '' })
  const [err, setErr] = useState({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const home = (u) => (u.role === 'coach' ? '/coach' : '/planning')
  if (user) return <Navigate to={home(user)} replace />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const enter = async (creds) => {
    setErr({}); setMsg(''); setBusy(true)
    try { const u = creds ? await login(creds) : isReg ? await register({ ...f, telephone: f.telephone || undefined }) : await login(f); nav(home(u)) }
    catch (x) { if (x instanceof ApiError) { setErr(Object.fromEntries(Object.entries(x.errors).map(([k, v]) => [k, v[0]]))); setMsg(x.message) } else setMsg('Erreur inattendue.') } finally { setBusy(false) }
  }
  return (
    <div className="grid min-h-[80vh] place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <form onSubmit={(e) => { e.preventDefault(); enter() }} className="card space-y-4 p-7" noValidate>
          <div><h1 className="text-2xl font-extrabold text-slate-900">{isReg ? 'Créer mon compte' : 'Connexion'}</h1><p className="text-sm text-slate-500">{isReg ? 'Réservez vos séances en quelques clics.' : 'Accédez à vos réservations.'}</p></div>
          {msg && !Object.keys(err).length && <div role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">{msg}</div>}
          {isReg && <Field label="Nom complet" error={err.name}><input className="input" value={f.name} onChange={set('name')} autoComplete="name" /></Field>}
          <Field label="E-mail" error={err.email}><input type="email" className="input" value={f.email} onChange={set('email')} autoComplete="email" /></Field>
          {isReg && <Field label="Téléphone (facultatif)" error={err.telephone}><input className="input" value={f.telephone} onChange={set('telephone')} autoComplete="tel" placeholder="+229 01 …" /></Field>}
          <Field label="Mot de passe" error={err.password} hint={isReg ? '8 caractères minimum' : undefined}><input type="password" className="input" value={f.password} onChange={set('password')} autoComplete={isReg ? 'new-password' : 'current-password'} /></Field>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Patientez…' : isReg ? 'Créer mon compte' : 'Se connecter'}</button>
          {!isReg && <div className="grid gap-2 sm:grid-cols-2"><button type="button" className="btn-ghost text-xs" disabled={busy} onClick={() => enter({ email: 'client@fitslot.bj', password: 'demo1234' })}>Démo : cliente</button><button type="button" className="btn-ghost text-xs" disabled={busy} onClick={() => enter({ email: 'coach@fitslot.bj', password: 'demo1234' })}>Démo : coach</button></div>}
          <p className="text-center text-sm text-slate-500">{isReg ? <>Déjà inscrit ? <Link className="font-semibold text-brand-700 hover:underline" to="/connexion">Connexion</Link></> : <>Pas encore de compte ? <Link className="font-semibold text-brand-700 hover:underline" to="/inscription">Inscription</Link></>}</p>
        </form>
      </div>
    </div>
  )
}
