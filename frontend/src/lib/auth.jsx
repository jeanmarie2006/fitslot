import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from './api.js'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

/** Session : le jeton est gardé dans le navigateur, l'utilisateur est rechargé depuis /api/auth/me. */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!getToken())

  useEffect(() => {
    if (!getToken()) return
    api('auth/me').then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setReady(true))
  }, [])
  useEffect(() => {
    const h = () => { setToken(null); setUser(null) }
    window.addEventListener('auth:expired', h)
    return () => window.removeEventListener('auth:expired', h)
  }, [])

  const enter = (r) => { setToken(r.token); setUser(r.user); return r.user }
  const login = useCallback(async (f) => enter(await api('auth/login', { method: 'POST', body: f })), [])
  const register = useCallback(async (f) => enter(await api('auth/register', { method: 'POST', body: f })), [])
  const logout = useCallback(async () => { try { await api('auth/logout', { method: 'POST' }) } catch { /* déjà expiré */ } setToken(null); setUser(null) }, [])
  return <Ctx.Provider value={{ user, setUser, ready, login, register, logout }}>{children}</Ctx.Provider>
}
