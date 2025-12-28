import React, { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { useConfigs } from '../../contexts/configs'
import { useLogin, useRegister } from '@/hooks/use-auth'

type AuthMode = 'login' | 'register'

export function LoginDialog() {
  const { showLoginDialog: open, setShowLoginDialog } = useConfigs()
  const { t } = useTranslation()

  const [mode, setMode] = useState<AuthMode>('login')
  const [identifier, setIdentifier] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const loginMutation = useLogin()
  const registerMutation = useRegister()

  const isSubmitting = loginMutation.isPending || registerMutation.isPending

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open])

  const resetForm = () => {
    setMode('login')
    setIdentifier('')
    setUsername('')
    setEmail('')
    setPassword('')
    setErrorMessage(null)
    setSuccessMessage(null)
    loginMutation.reset()
    registerMutation.reset()
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (mode === 'login' && (!identifier.trim() || !password.trim())) {
      setErrorMessage(t('common:auth.loginRequestFailed'))
      return
    }

    if (
      mode === 'register' &&
      (!username.trim() || !email.trim() || !password.trim())
    ) {
      setErrorMessage(t('common:auth.registerFailed'))
      return
    }

    if (mode === 'login') {
      loginMutation.mutate(
        { identifier: identifier.trim(), password },
        {
          onSuccess: () => {
            setSuccessMessage(t('common:auth.loginSuccessMessage'))
            // Reload page to reset all state after successful login
            setTimeout(() => {
              window.location.reload()
            }, 800)
          },
          onError: (error) => {
            console.error('Login failed:', error)
            const message =
              error instanceof Error
                ? error.message
                : t('common:auth.loginRequestFailed')
            setErrorMessage(message)
          },
        }
      )
    } else {
      registerMutation.mutate(
        { username: username.trim(), email: email.trim(), password },
        {
          onSuccess: () => {
            setSuccessMessage(t('common:auth.registerSuccessMessage'))
            // Reload page to reset all state after successful registration
            setTimeout(() => {
              window.location.reload()
            }, 800)
          },
          onError: (error) => {
            console.error('Registration failed:', error)
            const message =
              error instanceof Error
                ? error.message
                : t('common:auth.registerFailed')
            setErrorMessage(message)
          },
        }
      )
    }
  }

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'))
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  const canSubmit =
    mode === 'login'
      ? identifier.trim().length > 0 && password.trim().length > 0
      : username.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={setShowLoginDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('common:auth.loginToPrism')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('common:auth.loginDescription')}
          </p>

          <form className="space-y-3" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <Input
                value={username}
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t('common:auth.usernamePlaceholder')}
                disabled={isSubmitting}
              />
            )}

            {mode === 'register' ? (
              <Input
                type="email"
                value={email}
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t('common:auth.emailPlaceholder')}
                disabled={isSubmitting}
              />
            ) : (
              <Input
                value={identifier}
                autoComplete="username"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={t('common:auth.identifierPlaceholder')}
                disabled={isSubmitting}
              />
            )}

            <Input
              type="password"
              value={password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t('common:auth.passwordPlaceholder')}
              disabled={isSubmitting}
            />

            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}

            {successMessage && (
              <p className="text-sm text-green-600">{successMessage}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !canSubmit}
            >
              {isSubmitting
                ? t('common:auth.processing')
                : mode === 'login'
                  ? t('common:auth.login')
                  : t('common:auth.register')}
            </Button>
          </form>

          <button
            type="button"
            className="w-full text-xs text-muted-foreground hover:text-primary"
            onClick={toggleMode}
            disabled={isSubmitting}
          >
            {mode === 'login'
              ? t('common:auth.toggleToRegister')
              : t('common:auth.toggleToLogin')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
