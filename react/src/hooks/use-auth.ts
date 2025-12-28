import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AuthStatus,
  getAuthStatus,
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  saveAuthData,
} from '@/api/auth'

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  status: () => [...authKeys.all, 'status'] as const,
}

// Query: Get auth status
export function useAuthStatus() {
  return useQuery<AuthStatus>({
    queryKey: authKeys.status(),
    queryFn: getAuthStatus,
    staleTime: 0, // Always refetch on mount - auth status should always be fresh
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: false,
  })
}

// Mutation: Login
export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      identifier,
      password,
    }: {
      identifier: string
      password: string
    }) => {
      const response = await loginApi(identifier, password)
      saveAuthData(response.token, response.user_info)
      return response
    },
    onSuccess: () => {
      // Invalidate and refetch auth status
      queryClient.invalidateQueries({ queryKey: authKeys.status() })
    },
  })
}

// Mutation: Register
export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      username,
      email,
      password,
    }: {
      username: string
      email: string
      password: string
    }) => {
      const response = await registerApi(username, email, password)
      saveAuthData(response.token, response.user_info)
      return response
    },
    onSuccess: () => {
      // Invalidate and refetch auth status
      queryClient.invalidateQueries({ queryKey: authKeys.status() })
    },
  })
}

// Mutation: Logout
export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      // Clear all query cache on logout (including canvases, auth status, etc.)
      queryClient.clear()
    },
  })
}

