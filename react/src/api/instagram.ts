import { authenticatedFetch } from './auth'

export interface InstagramAuthUrlResponse {
  status: string
  auth_url: string
  state: string
}

export interface InstagramStatusResponse {
  status: string
  connected: boolean
  valid: boolean
  username: string | null
}

export interface InstagramUploadRequest {
  image_url: string
  caption: string
  hashtags?: string
  location?: string
}

export interface InstagramUploadResponse {
  status: string
  message: string
  data?: any
}

export interface InstagramMedia {
  id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink: string
  caption?: string
  timestamp: string
  like_count?: number
  comments_count?: number
  username?: string
}

export interface InstagramMediaResponse {
  status: string
  data: {
    data: InstagramMedia[]
    paging?: {
      cursors?: {
        before?: string
        after?: string
      }
      next?: string
      previous?: string
    }
  }
}

/**
 * Instagram OAuth 인증 URL 가져오기
 */
export async function getInstagramAuthUrl(): Promise<InstagramAuthUrlResponse> {
  const response = await authenticatedFetch('/api/instagram/auth/url', {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get Instagram auth URL')
  }

  return response.json()
}

/**
 * Instagram 연결 상태 확인
 */
export async function getInstagramStatus(): Promise<InstagramStatusResponse> {
  const response = await authenticatedFetch('/api/instagram/status', {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get Instagram status')
  }

  return response.json()
}

/**
 * Instagram 계정 연결 (토큰 저장)
 */
export async function connectInstagram(data: {
  access_token: string
  instagram_user_id: string
  instagram_username: string
  expires_in?: number
}): Promise<{ status: string; message: string }> {
  const response = await authenticatedFetch('/api/instagram/connect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to connect Instagram account')
  }

  return response.json()
}

/**
 * Instagram 계정 연결 해제
 */
export async function disconnectInstagram(): Promise<{ status: string; message: string }> {
  const response = await authenticatedFetch('/api/instagram/disconnect', {
    method: 'POST',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to disconnect Instagram account')
  }

  return response.json()
}

/**
 * 이미지를 Instagram에 업로드
 */
export async function uploadToInstagram(
  request: InstagramUploadRequest
): Promise<InstagramUploadResponse> {
  const response = await authenticatedFetch('/api/instagram/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to upload image to Instagram')
  }

  return response.json()
}

/**
 * 사용자의 Instagram 미디어 가져오기
 */
export async function getInstagramMedia(
  limit: number = 25,
  after?: string
): Promise<InstagramMediaResponse> {
  const params = new URLSearchParams({
    limit: limit.toString(),
  })
  if (after) {
    params.append('after', after)
  }

  const response = await authenticatedFetch(`/api/instagram/media?${params.toString()}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get Instagram media')
  }

  return response.json()
}

/**
 * 특정 미디어의 상세 정보 가져오기
 */
export async function getInstagramMediaDetails(
  mediaId: string
): Promise<{ status: string; data: InstagramMedia }> {
  const response = await authenticatedFetch(`/api/instagram/media/${mediaId}`, {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get Instagram media details')
  }

  return response.json()
}




