import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as api from '../services/api'
import type { LoginResponse } from '../services/api'
import type { User } from '../types'

const TOKEN_STORAGE_KEY = 'codesphere_token'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  refreshUser: () => Promise<void>
  /** Adopts a fresh token + user from any endpoint that issues one (login,
   * change-password) - anywhere that isn't a plain login still needs to
   * replace the stored token, since the old one may no longer be valid
   * (e.g. change-password intentionally invalidates it). */
  applyAuthResponse: (response: LoginResponse) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!storedToken) {
      setIsLoading(false)
      return
    }

    api.setAuthToken(storedToken)
    api
      .getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
        api.setAuthToken(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const applyAuthResponse = useCallback((response: LoginResponse) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token)
    api.setAuthToken(response.access_token)
    setUser(response.user)
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.login(email, password)
      applyAuthResponse(response)
      return response.user
    },
    [applyAuthResponse],
  )

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    api.setAuthToken(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const freshUser = await api.getMe()
    setUser(freshUser)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser, applyAuthResponse }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
