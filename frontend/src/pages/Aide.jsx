import { Link } from 'react-router-dom'
import { Offres } from './Home.jsx'

export function Tarifs() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-center text-3xl font-extrabold text-slate-900">Tarifs et abonnements</h1>
      <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">Payez à la séance (à partir de 2 000 FCFA) ou choisissez un pack pour économiser. Paiement Mobile Money (simulé) ou sur place.</p>
      <div className="mt-8"><Offres onChoose={() => (location.hash = '#/abonnements')} /></div>
    </div>
  )
}

const CLIENT = [['1', 'Créez votre compte', 'Cliquez sur « S’inscrire » : nom, e-mail, mot de passe.'], ['2', 'Choisissez une séance', 'Ouvrez le Planning, filtrez par discipline et cliquez sur une séance.'], ['3', 'Réservez', 'Payez avec votre abonnement, par Mobile Money ou sur place. Vous recevez une confirmation.'], ['4', 'Gérez vos séances', 'Dans « Mes séances », reportez ou annulez gratuitement jusqu’à 2 h avant.']]
const COACH = [['1', 'Créez des séances', 'Dans le Planning, cliquez sur « Nouvelle séance » ou sur un créneau libre. Vous pouvez répéter chaque semaine.'], ['2', 'Suivez les inscriptions', 'Cliquez sur une séance pour voir les inscrits, leur mode de paiement et leur téléphone.'], ['3', 'Faites l’appel', 'Après la séance, marquez chaque inscrit « présent » ou « absent ».'], ['4', 'Pilotez la salle', 'Le tableau de bord montre le taux de remplissage, les revenus et les clients assidus. Envoyez les rappels de demain en un clic.']]

export default function Aide() {
  const Steps = ({ list }) => <ol className="mt-4 space-y-4">{list.map(([n, t, d]) => <li key={n} className="flex gap-4"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-700 font-extrabold text-white">{n}</span><span><b className="block text-slate-900">{t}</b><span className="text-sm text-slate-600">{d}</span></span></li>)}</ol>
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900">Guide d’utilisation</h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="card p-6"><h2 className="text-xl font-extrabold text-slate-900">🧑 Pour les clients</h2><Steps list={CLIENT} /></section>
        <section className="card p-6"><h2 className="text-xl font-extrabold text-slate-900">🏋️ Pour les coachs</h2><Steps list={COACH} /><p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Compte coach de démonstration : <b>coach@fitslot.bj</b> / demo1234</p></section>
      </div>
      <section className="card mt-6 p-6"><h2 className="text-xl font-extrabold text-slate-900">Questions fréquentes</h2>
        <dl className="mt-4 space-y-4 text-sm"><div><dt className="font-bold text-slate-900">Puis-je annuler une séance ?</dt><dd className="text-slate-600">Oui, gratuitement jusqu’à 2 heures avant le début. Votre séance d’abonnement vous est alors rendue.</dd></div>
          <div><dt className="font-bold text-slate-900">Que se passe-t-il si la salle annule ?</dt><dd className="text-slate-600">Vous êtes prévenu dans l’application, votre séance d’abonnement est rendue et un remboursement est prévu si vous aviez payé.</dd></div>
          <div><dt className="font-bold text-slate-900">Les paiements sont-ils réels ?</dt><dd className="text-slate-600">Non : MTN MoMo et Moov Money sont simulés dans cette démonstration.</dd></div>
          <div><dt className="font-bold text-slate-900">Puis-je installer l’application ?</dt><dd className="text-slate-600">Oui, sur mobile, tablette ou ordinateur : <Link to="/installer" className="font-semibold text-brand-700 underline">voir comment</Link>.</dd></div></dl></section>
    </div>
  )
}
