// Client de l'API Laravel (jeton Sanctum en Bearer). Les adresses sont relatives à la balise <base> de la page,
// ce qui permet d'héberger l'application dans un sous-dossier.
export const BASE = document.querySelector('base')?.href || location.origin + '/'
const TOKEN_KEY = 'token:' + BASE

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* stockage indisponible */ } }

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message || 'Une erreur est survenue.')
    this.status = status
    this.errors = data?.errors || {}
  }
  /** Premier message d'erreur d'un champ */
  first(field) { return this.errors?.[field]?.[0] }
  /** Tous les messages de validation, dans une seule chaîne */
  all() { const m = Object.values(this.errors || {}).flat(); return m.length ? m.join(' ') : this.message }
}

export async function api(path, { method = 'GET', body, query, blob } = {}) {
  const url = new URL('api/' + path.replace(/^\//, ''), BASE)
  if (query) Object.entries(query).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && url.searchParams.set(k, v))
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = 'Bearer ' + token
  let payload
  if (body instanceof FormData) payload = body
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }
  let res
  try { res = await fetch(url, { method, headers, body: payload }) } catch { throw new ApiError(0, { message: 'Connexion impossible. Vérifiez votre accès Internet.' }) }
  if (res.status === 401 && token) window.dispatchEvent(new Event('auth:expired'))
  if (blob && res.ok) return res.blob()
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}
export const get = (p, query) => api(p, { query })
export const post = (p, body) => api(p, { method: 'POST', body })
export const put = (p, body) => api(p, { method: 'PUT', body })
export const patch = (p, body) => api(p, { method: 'PATCH', body })
export const del = (p) => api(p, { method: 'DELETE' })
