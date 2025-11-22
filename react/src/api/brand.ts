import { authenticatedFetch } from './auth'

export interface BrandInfo {
  name: string
  description: string
  industry: string
  targetAudience: string
  brandColors: string
  brandValues: string
  website: string
  socialMedia: string
}

export interface BrandInfoExtraction {
  name?: string
  description?: string
  industry?: string
  targetAudience?: string
  brandColors?: string
  brandValues?: string
  website?: string
  socialMedia?: string
}

/**
 * 브랜드 정보 가져오기
 */
export async function getBrandInfo(): Promise<BrandInfo> {
  const response = await authenticatedFetch('/api/settings/brand', {
    method: 'GET',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get brand info')
  }

  return response.json()
}

/**
 * 브랜드 정보 저장
 */
export async function saveBrandInfo(brandInfo: BrandInfo): Promise<{ status: string; message: string }> {
  const response = await authenticatedFetch('/api/settings/brand', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(brandInfo),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to save brand info')
  }

  return response.json()
}

/**
 * 대화 내용에서 브랜드 정보 추출
 */
export async function extractBrandInfo(conversation: string): Promise<BrandInfoExtraction | null> {
  const response = await authenticatedFetch('/api/settings/brand/extract', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ conversation }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to extract brand info')
  }

  return response.json()
}

/**
 * AI 챗봇과 대화 (브랜드 정보 수집)
 */
export async function brandChat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<{
  response: string
  extractedInfo: BrandInfoExtraction
}> {
  const response = await authenticatedFetch('/api/settings/brand/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get chat response')
  }

  return response.json()
}

