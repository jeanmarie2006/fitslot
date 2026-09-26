import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// ---------- Notifications ----------
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((message, type = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setItems((l) => [...l, { id, message, type }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-xl ${t.type === 'err' ? 'bg-rose-600' : 'bg-slate-900'}`}>{t.type === 'err' ? '⚠ ' : '✓ '}{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

// ---------- Éléments d'interface ----------
export function Spinner({ label = 'Chargement…' }) {
  return <div className="grid place-items-center gap-3 py-16 text-sm text-slate-500" role="status"><span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600" />{label}</div>
}
export function Empty({ icon = '🗒️', title, children }) {
  return <div className="grid place-items-center gap-1 py-14 text-center"><span className="text-4xl" aria-hidden="true">{icon}</span><b className="text-slate-800">{title}</b><div className="text-sm text-slate-500">{children}</div></div>
}
export function Field({ label, error, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>{children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs font-semibold text-rose-600">{error}</span>}
    </label>
  )
}
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-900/50 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`card max-h-[92vh] w-full overflow-y-auto rounded-b-none p-6 sm:rounded-b-2xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-extrabold text-slate-900">{title}</h2><button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Fermer">✕</button></div>
        {children}
      </div>
    </div>
  )
}
export function Stars({ value = 0, onChange, size = 'text-xl' }) {
  return (
    <span className={`inline-flex ${size}`} role={onChange ? 'radiogroup' : 'img'} aria-label={`Note : ${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= Math.round(value)
        return onChange
          ? <button type="button" key={i} onClick={() => onChange(i)} role="radio" aria-checked={value === i} aria-label={`${i} étoile${i > 1 ? 's' : ''}`} className={`px-0.5 transition hover:scale-110 ${on ? 'text-amber-400' : 'text-slate-300'}`}>★</button>
          : <span key={i} className={on ? 'text-amber-400' : 'text-slate-300'} aria-hidden="true">★</span>
      })}
    </span>
  )
}
export const money = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n || 0)).replace(/[  ]/g, ' ') + ' FCFA'
export const dateFr = (d, o = { day: '2-digit', month: 'short', year: 'numeric' }) => (d ? new Date(d).toLocaleDateString('fr-FR', o) : '')
export const timeFr = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

/** Charge des données et les recharge à la demande */
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    return fn().then((data) => setState({ data, loading: false, error: null })).catch((error) => setState({ data: null, loading: false, error }))
  }, deps)
  useEffect(() => { run() }, [run])
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) }
}
