import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, type PropsWithChildren } from 'react'

import { api, jsonBody, setCsrfToken } from '../lib/api'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const me = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await api<User>('/api/v1/auth/me')
      const csrf = await api<{ csrf_token: string }>('/api/v1/auth/csrf', { method: 'POST' })
      setCsrfToken(csrf.csrf_token)
      return user
    },
    retry: false,
  })

  const value: AuthContextValue = {
    user: me.data ?? null,
    isLoading: me.isLoading,
    login: async (email, password) => {
      const response = await api<{ user: User; csrf_token: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: jsonBody({ email, password }),
      })
      setCsrfToken(response.csrf_token)
      queryClient.setQueryData(['me'], response.user)
    },
    logout: async () => {
      await api('/api/v1/auth/logout', { method: 'POST' })
      setCsrfToken(undefined)
      queryClient.setQueryData(['me'], null)
      queryClient.removeQueries({ predicate: ({ queryKey }) => queryKey[0] !== 'me' })
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
