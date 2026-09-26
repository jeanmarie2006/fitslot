import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { detectPlatform, useInstall } from '../lib/pwa.jsx'
import { BASE } from '../lib/api.js'

const APP = {"name": "FitSlot", "color": "#c2410c", "tagline": "Réservez vos séances de sport, suivez vos abonnements et retrouvez votre planning."}

const GUIDES = [
  {
    id: 'android', icon: '📱', title: 'Android (téléphone ou tablette)',
    steps: ['Ouvrez ce site avec **Chrome** (ou Edge, Samsung Internet).', 'Touchez le bouton **Installer** ci-dessus, ou le menu **⋮** puis **Installer l’application** / **Ajouter à l’écran d’accueil**.', 'Validez : l’icône apparaît sur votre écran d’accueil et l’application s’ouvre en plein écran.'],
  },
  {
    id: 'ios', icon: '🍎', title: 'iPhone et iPad',
    steps: ['Ouvrez ce site avec **Safari** (l’installation ne fonctionne pas depuis Chrome sur iOS).', 'Touchez le bouton **Partager** (le carré avec une flèche vers le haut).', 'Choisissez **Sur l’écran d’accueil**, puis **Ajouter**.'],
  },
  {
    id: 'desktop', icon: '💻', title: 'Ordinateur (Windows, Mac, Linux)',
    steps: ['Ouvrez ce site avec **Chrome** ou **Edge**.', 'Cliquez sur le bouton **Installer** ci-dessus, ou sur l’icône **⊕ / ⬇** à droite de la barre d’adresse.', 'Confirmez : l’application s’ouvre dans sa propre fenêtre, avec une icône dans le menu Démarrer ou le Dock.'],
  },
]

const bold = (t) => t.split(/\*\*(.+?)\*\*/g).map((p, i) => (i % 2 ? <b key={i} className="text-slate-900">{p}</b> : p))

export default function Installer() {
  const { canPrompt, standalone, prompt } = useInstall()
  const [pf, setPf] = useState(null)
  const [qr, setQr] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => { setPf(detectPlatform()) }, [])
  useEffect(() => {
    import('qrcode').then((Q) => Q.toString(BASE, { type: 'svg', margin: 1, color: { dark: APP.color, light: '#ffffff' } })).then(setQr).catch(() => {})
  }, [])
  const mine = pf ? (pf.ios ? 'ios' : pf.android ? 'android' : 'desktop') : 'desktop'
  const guides = [...GUIDES].sort((a, b) => (a.id === mine ? -1 : b.id === mine ? 1 : 0))

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 via-white to-slate-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <Link to="/" className="btn-ghost">← Retour</Link>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="grid items-center gap-8 pb-10 pt-4 md:grid-cols-[1fr_auto]">
          <div>
            <img src={BASE + 'icon-192.png'} alt="" width="84" height="84" className="mb-5 rounded-[22px] shadow-xl shadow-slate-900/15" />
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Installer {APP.name}</h1>
            <p className="mt-3 max-w-xl text-lg text-slate-600">{APP.tagline} Installez-la gratuitement sur votre téléphone, votre tablette ou votre ordinateur : elle s’ouvre en plein écran comme une vraie application et fonctionne même sans connexion après la première ouverture.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {standalone ? (
                <p className="rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-700">✓ L’application est déjà installée sur cet appareil.</p>
              ) : canPrompt ? (
                <button className="btn-primary px-7 py-3 text-base" onClick={async () => setDone(await prompt())}>⬇ Installer maintenant</button>
              ) : (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                  {pf?.ios ? 'Sur iPhone et iPad, suivez les étapes « Partager → Sur l’écran d’accueil » ci-dessous.' : pf?.firefox ? 'Firefox ne permet pas l’installation sur ordinateur : utilisez Chrome ou Edge.' : 'Si le bouton n’apparaît pas, suivez les étapes ci-dessous pour votre appareil.'}
                </p>
              )}
              {done && <span className="text-sm font-semibold text-emerald-600">Installation lancée ✓</span>}
            </div>
          </div>
          {qr && !pf?.mobile && (
            <figure className="mx-auto text-center">
              <div className="w-44 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-slate-200" dangerouslySetInnerHTML={{ __html: qr }} />
              <figcaption className="mt-2 text-xs font-semibold text-slate-500">Scannez avec votre téléphone<br />pour l’installer</figcaption>
            </figure>
          )}
        </section>

        <section aria-label="Guides d’installation" className="grid gap-5 md:grid-cols-3">
          {guides.map((g) => (
            <article key={g.id} className={`card p-6 ${g.id === mine ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-2xl">{g.icon}</span>
                <h2 className="font-extrabold leading-tight text-slate-900">{g.title}</h2>
              </div>
              {g.id === mine && <p className="mb-3 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">Votre appareil</p>}
              <ol className="space-y-2.5 text-sm leading-relaxed text-slate-600">
                {g.steps.map((s, i) => <li key={i} className="flex gap-3"><span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">{i + 1}</span><span>{bold(s)}</span></li>)}
              </ol>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {[['🚀', 'Rapide', 'Ouverture instantanée depuis l’écran d’accueil.'], ['📴', 'Hors connexion', 'Elle reste utilisable sans Internet après la première ouverture.'], ['🪶', 'Légère', 'Quelques centaines de Ko : rien à télécharger sur un store.']].map(([i, t, d]) => (
            <div key={t} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200"><div className="text-2xl">{i}</div><b className="mt-1 block text-slate-900">{t}</b><p className="text-sm text-slate-500">{d}</p></div>
          ))}
        </section>
        <p className="mt-8 text-center text-xs text-slate-400">Pour la désinstaller : appui long sur l’icône (mobile), ou menu de la fenêtre de l’application → Désinstaller (ordinateur).</p>
      </main>
    </div>
  )
}
