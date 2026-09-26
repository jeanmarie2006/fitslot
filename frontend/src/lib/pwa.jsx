import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BASE } from './api.js'

// ---- Installation d'une application web (PWA) ----
let deferred = null
const listeners = new Set()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; notify() })
  window.addEventListener('appinstalled', () => { deferred = null; localStorage.setItem('pwa:installed', '1'); notify() })
}

export function registerServiceWorker(swUrl = BASE + 'sw.js') {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  window.addEventListener('load', () => navigator.serviceWorker.register(swUrl).catch(() => {}))
}

export function detectPlatform() {
  const ua = navigator.userAgent
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const android = /android/i.test(ua)
  const firefox = /firefox|fxios/i.test(ua)
  const safari = /^((?!chrome|android|crios|fxios|edgios|edg).)*safari/i.test(ua)
  return { ios, android, firefox, safari, mobile: ios || android, desktop: !ios && !android }
}

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => { const l = () => force((n) => n + 1); listeners.add(l); return () => listeners.delete(l) }, [])
  return {
    canPrompt: !!deferred,
    standalone: isStandalone(),
    async prompt() {
      if (!deferred) return false
      deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null; notify()
      return outcome === 'accepted'
    },
  }
}

/** Bouton d'installation : déclenche l'invite du navigateur, sinon renvoie vers la page d'aide. */
export function InstallButton({ className = 'btn-ghost', label = '⬇ Installer l’application', to = '/installer' }) {
  const { canPrompt, standalone, prompt } = useInstall()
  if (standalone) return null
  if (canPrompt) return <button type="button" className={className} onClick={prompt}>{label}</button>
  return <Link to={to} className={className}>{label}</Link>
}
