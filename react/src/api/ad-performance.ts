import { BASE_API_URL } from '../constants'
import { authenticatedFetch } from './auth'

export interface AdPerformanceData {
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  totalSpent: number
  clickThroughRate: number
  conversionRate: number
  costPerClick: number
  costPerConversion: number
  campaigns: CampaignPerformance[]
}

export interface CampaignPerformance {
  id: string
  name: string
  platform: string
  impressions: number
  clicks: number
  conversions: number
  spent: number
  startDate: string
  endDate: string
  status: 'active' | 'paused' | 'completed'
}

export interface AdPerformanceResponse {
  status: string
  data: AdPerformanceData
}

/**
 * 광고 성과 데이터 조회
 * @returns Promise<AdPerformanceData>
 */
export async function getAdPerformance(): Promise<AdPerformanceData> {
  try {
    const response = await authenticatedFetch(`${BASE_API_URL}/api/ad-performance`, {
      method: 'GET',
    })

    if (!response.ok) {
      let errorMessage = 'Failed to fetch ad performance data'
      try {
        const error = await response.json()
        errorMessage = error.detail || error.message || errorMessage
      } catch {
        if (response.status === 404) {
          errorMessage = '광고 성과 API 엔드포인트를 찾을 수 없습니다.'
        } else if (response.status === 401) {
          errorMessage = '인증이 필요합니다. 로그인해주세요.'
        } else {
          errorMessage = `서버 오류 (${response.status}): ${response.statusText}`
        }
      }
      throw new Error(errorMessage)
    }

    const result: AdPerformanceResponse = await response.json()
    return result.data
  } catch (error) {
    console.error('Failed to get ad performance:', error)
    throw error instanceof Error ? error : new Error('Failed to get ad performance data')
  }
}

