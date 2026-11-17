// =========================================================
// UserContext — sessão do usuário (cliente ou equipe)
// ---------------------------------------------------------
// Conecta-se à API Spring Boot (/api/auth/registrar e /api/auth/login)
// e sincroniza automaticamente contas locais com o banco PostgreSQL.
// =========================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiLogin, apiRegister, apiSyncUserSession, getSavedTokens, saveTokens } from '../services/api.js'

const UserContext = createContext(null)
const STORAGE_KEY = 'mm-modas:usuario-sessao'

function loadUser() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return null
    const parsed = JSON.parse(saved)
    return parsed && typeof parsed === 'object' && parsed.email ? parsed : null
  } catch {
    return null
  }
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(loadUser)

  useEffect(() => {
    try {
      if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* sem armazenamento: segue em memória */
    }
  }, [user])

  // Se houver sessão salva (inclusive criada antes em modo local), sincroniza com o PostgreSQL
  useEffect(() => {
    if (!user?.email) return
    const tokens = getSavedTokens()
    if (user.origem === 'api' && tokens?.accessToken && user.enderecoId) return

    let active = true
    apiSyncUserSession(user).then((synced) => {
      if (!active || !synced) return
      if (
        synced.id !== user.id ||
        synced.origem !== user.origem ||
        synced.enderecoId !== user.enderecoId
      ) {
        setUser(synced)
      }
    })
    return () => {
      active = false
    }
  }, [user])

  const register = useCallback(async (data) => {
    const createdUser = await apiRegister(data)
    setUser(createdUser)
    return createdUser
  }, [])

  const login = useCallback(async (email, senha) => {
    const loggedUser = await apiLogin(email, senha)
    setUser(loggedUser)
    return loggedUser
  }, [])

  const updateUserAddress = useCallback((addressFields) => {
    setUser((prev) => (prev ? { ...prev, ...addressFields } : prev))
  }, [])

  const logout = useCallback(() => {
    saveTokens(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, register, login, logout, updateUserAddress }),
    [user, register, login, logout, updateUserAddress],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser precisa estar dentro de <UserProvider>')
  return ctx
}
