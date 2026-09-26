export const DISCIPLINES = {
  Musculation: { color: '#c2410c', icon: '🏋️' },
  Cardio: { color: '#dc2626', icon: '🏃' },
  Yoga: { color: '#7c3aed', icon: '🧘' },
  Boxe: { color: '#0f172a', icon: '🥊' },
  'Cross-training': { color: '#0369a1', icon: '🔥' },
  Danse: { color: '#db2777', icon: '💃' },
}
export const dis = (d) => DISCIPLINES[d] || { color: '#475569', icon: '⭐' }
export const heure = (iso) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
export const jourLong = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
export const jourCourt = (iso) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
export const PAIEMENTS = { abonnement: 'Abonnement', momo: 'MTN MoMo', moov: 'Moov Money', sur_place: 'Sur place' }
