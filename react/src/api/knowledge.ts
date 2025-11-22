import { BASE_API_URL } from '../constants'
import { authenticatedFetch } from './auth'

// 지식 베이스 기본 정보 인터페이스
export interface KnowledgeBase {
  id: string
  user_id: string
  name: string
  description: string | null
  cover: string | null
  is_public: boolean
  created_at: string
  updated_at: string
  content?: string // Optional, not always returned for performance
}

// 페이지네이션 정보 인터페이스
export interface Pagination {
  current_page: number
  page_size: number
  total_count: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

// 지식 베이스 목록 조회 응답 인터페이스
export interface KnowledgeListResponse {
  success: boolean
  data: {
    list: KnowledgeBase[]
    pagination: Pagination
    is_admin: boolean
  }
  message: string
}

// 지식 베이스 목록 조회 요청 파라미터 인터페이스
export interface KnowledgeListParams {
  pageSize?: number
  pageNumber?: number
  search?: string
}

// API 응답 기본 인터페이스
export interface ApiResponse {
  success: boolean
  message: string
  error?: string
  details?: string
}

/**
 * 지식 베이스 목록 조회
 * @param params 조회 파라미터
 * @returns Promise<KnowledgeListResponse>
 */
export async function getKnowledgeList(
  params: KnowledgeListParams = {}
): Promise<KnowledgeListResponse> {
  const { pageSize = 10, pageNumber = 1, search } = params

  // 쿼리 파라미터 구성
  const queryParams = new URLSearchParams({
    pageSize: pageSize.toString(),
    pageNumber: pageNumber.toString(),
  })

  if (search && search.trim()) {
    queryParams.append('search', search.trim())
  }

  try {
    const response = await authenticatedFetch(
      `${BASE_API_URL}/api/knowledge/list?${queryParams.toString()}`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to get knowledge list:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get knowledge list'
    )
  }
}

/**
 * 단일 지식 베이스 상세 정보 조회
 * @param id 지식 베이스 ID
 * @returns Promise<KnowledgeBase>
 */
export async function getKnowledgeById(id: string): Promise<KnowledgeBase> {
  try {
    const response = await authenticatedFetch(
      `${BASE_API_URL}/api/knowledge/${id}`
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('Failed to get knowledge by id:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get knowledge base'
    )
  }
}

/**
 * 지식 베이스 생성
 * @param knowledgeData 지식 베이스 데이터
 * @returns Promise<ApiResponse>
 */
export async function createKnowledge(knowledgeData: {
  name: string
  description?: string
  cover?: string
  is_public?: boolean
  content?: string
}): Promise<ApiResponse> {
  try {
    const response = await authenticatedFetch(
      `${BASE_API_URL}/api/knowledge/create`,
      {
        method: 'POST',
        body: JSON.stringify(knowledgeData),
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to create knowledge:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create knowledge base'
    )
  }
}

/**
 * 지식 베이스 업데이트
 * @param id 지식 베이스 ID
 * @param knowledgeData 업데이트 데이터
 * @returns Promise<ApiResponse>
 */
export async function updateKnowledge(
  id: string,
  knowledgeData: Partial<{
    name: string
    description: string
    cover: string
    is_public: boolean
    content: string
  }>
): Promise<ApiResponse> {
  try {
    const response = await authenticatedFetch(
      `${BASE_API_URL}/api/knowledge/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(knowledgeData),
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to update knowledge:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to update knowledge base'
    )
  }
}

/**
 * 지식 베이스 삭제
 * @param id 지식 베이스 ID
 * @returns Promise<ApiResponse>
 */
export async function deleteKnowledge(id: string): Promise<ApiResponse> {
  try {
    const response = await authenticatedFetch(
      `${BASE_API_URL}/api/knowledge/${id}`,
      {
        method: 'DELETE',
      }
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to delete knowledge:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to delete knowledge base'
    )
  }
}

/**
 * 활성화된 지식 베이스의 전체 데이터를 로컬 설정에 저장
 * @param knowledgeData 지식 베이스 전체 데이터 배열
 * @returns Promise<ApiResponse>
 */
export async function saveEnabledKnowledgeDataToSettings(
  knowledgeData: KnowledgeBase[]
): Promise<ApiResponse> {
  try {
    // 로컬 서버 API 호출, BASE_API_URL과 인증 불필요
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        enabled_knowledge_data: knowledgeData,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to save knowledge data to settings:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to save knowledge data'
    )
  }
}
