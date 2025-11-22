import { BASE_API_URL } from '../constants'
import { authenticatedFetch } from './auth'

export interface AdminUser {
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

export interface UsersListResponse {
  status: string
  users: AdminUser[]
  total: number
}

const ADMIN_API_URL = `${BASE_API_URL}/api/admin`

export async function getUsersList(): Promise<UsersListResponse> {
  const response = await authenticatedFetch(`${ADMIN_API_URL}/users`, {
    method: 'GET',
  })

  if (!response.ok) {
    let errorMessage = 'Failed to fetch users'
    try {
      const error = await response.json()
      errorMessage = error.detail || error.message || errorMessage
    } catch {
      // JSON 파싱 실패 시 상태 코드로 메시지 생성
      if (response.status === 404) {
        errorMessage = 'Admin API 엔드포인트를 찾을 수 없습니다. 서버를 재시작해주세요.'
      } else if (response.status === 401) {
        errorMessage = '인증이 필요합니다. 로그인해주세요.'
      } else if (response.status === 403) {
        errorMessage = '관리자 권한이 필요합니다.'
      } else {
        errorMessage = `서버 오류 (${response.status}): ${response.statusText}`
      }
    }
    throw new Error(errorMessage)
  }

  return response.json()
}

