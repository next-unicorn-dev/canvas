import { BASE_API_URL } from '../constants'
import i18n from '../i18n'

export interface AuthStatus {
  status: 'logged_out' | 'pending' | 'logged_in'
  is_logged_in: boolean
  user_info?: UserInfo
  tokenExpired?: boolean
}

export interface UserInfo {
  id: string
  username: string
  email: string
  image_url?: string
  provider?: string
  created_at?: string
  updated_at?: string
  last_login?: string
  role?: string
}

export interface LoginResponse {
  status: string
  message: string
  token: string
  expires_at: string
  user_info: UserInfo
}

export type RegisterResponse = LoginResponse

const ACCESS_TOKEN_KEY = 'prism_access_token'
const USER_INFO_KEY = 'prism_user_info'

function getAuthEndpoint(path: string) {
  return `${BASE_API_URL}/api/auth${path}`
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<RegisterResponse> {
  const response = await fetch(getAuthEndpoint('/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || i18n.t('common:auth.registerFailed'))
  }

  return data
}

export async function login(
  identifier: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(getAuthEndpoint('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || i18n.t('common:auth.loginRequestFailed'))
  }

  return data
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const token = getAccessToken()

  if (!token) {
    return {
      status: 'logged_out',
      is_logged_in: false,
    }
  }

  let cachedUser: UserInfo | undefined
  const userInfoRaw = localStorage.getItem(USER_INFO_KEY)

  if (userInfoRaw) {
    try {
      cachedUser = JSON.parse(userInfoRaw) as UserInfo
    } catch (error) {
      console.warn('Failed to parse cached user info:', error)
      localStorage.removeItem(USER_INFO_KEY)
    }
  }

  try {
    let activeToken = token

    try {
      const refreshedToken = await refreshToken(token)
      activeToken = refreshedToken

      if (cachedUser) {
        saveAuthData(refreshedToken, cachedUser)
      } else {
        localStorage.setItem(ACCESS_TOKEN_KEY, refreshedToken)
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'TOKEN_EXPIRED') {
        await handleTokenExpiration()
        return {
          status: 'logged_out',
          is_logged_in: false,
          tokenExpired: true,
        }
      }

      console.warn('Failed to refresh auth token:', error)
    }

    const response = await fetch(getAuthEndpoint('/status'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${activeToken}`,
      },
    })

    if (response.status === 200) {
      const data = await response.json()
      const info = data.user_info as UserInfo
      saveAuthData(activeToken, info)
      return {
        status: 'logged_in',
        is_logged_in: true,
        user_info: info,
      }
    }

    if (response.status === 401) {
      await handleTokenExpiration()
      return {
        status: 'logged_out',
        is_logged_in: false,
        tokenExpired: true,
      }
    }

    throw new Error(`Unexpected status: ${response.status}`)
  } catch (error) {
    console.error('Failed to fetch auth status:', error)
    if (cachedUser) {
      return {
        status: 'logged_in',
        is_logged_in: true,
        user_info: cachedUser,
      }
    }

    return {
      status: 'logged_out',
      is_logged_in: false,
    }
  }
}

export async function refreshToken(currentToken: string) {
  const response = await fetch(getAuthEndpoint('/refresh'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${currentToken}`,
    },
  })

  if (response.status === 200) {
    const data = await response.json()
    return data.token
  } else if (response.status === 401) {
    throw new Error('TOKEN_EXPIRED')
  } else {
    throw new Error(`NETWORK_ERROR: ${response.status}`)
  }
}

export async function logout(): Promise<{ status: string; message: string }> {
  const token = getAccessToken()

  if (token) {
    try {
      await fetch(getAuthEndpoint('/logout'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error) {
      console.error('Failed to call logout endpoint:', error)
    }
  }

  clearStoredAuthData()

  return {
    status: 'success',
    message: i18n.t('common:auth.logoutSuccessMessage'),
  }
}

export async function getUserProfile(): Promise<UserInfo> {
  const userInfo = localStorage.getItem(USER_INFO_KEY)
  if (!userInfo) {
    throw new Error(i18n.t('common:auth.notLoggedIn'))
  }

  return JSON.parse(userInfo)
}

export function saveAuthData(token: string, userInfo: UserInfo) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token)
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo))
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

async function handleTokenExpiration() {
  clearStoredAuthData()
}

function clearStoredAuthData() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(USER_INFO_KEY)
}

