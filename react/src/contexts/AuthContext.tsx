import { createContext, useContext, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { AuthStatus } from '../api/auth'
import { useTranslation } from 'react-i18next'
import { useAuthStatus } from '@/hooks/use-auth'

interface AuthContextType {
  authStatus: AuthStatus
  isLoading: boolean
  refreshAuth: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const defaultAuthStatus: AuthStatus = {
  status: 'logged_out',
  is_logged_in: false,
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const isInitialLoad = useRef(true)

  const { data: authStatus, isLoading, refetch } = useAuthStatus()

  // Handle token expired toast
  useEffect(() => {
    if (authStatus?.tokenExpired && !isInitialLoad.current) {
      toast.error(t('common:auth.authExpiredMessage'), {
        duration: 5000,
      })
    }

    if (!isLoading) {
      isInitialLoad.current = false
    }
  }, [authStatus?.tokenExpired, isLoading, t])

  const refreshAuth = () => {
    refetch()
  }

  return (
    <AuthContext.Provider
      value={{
        authStatus: authStatus ?? defaultAuthStatus,
        isLoading,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
