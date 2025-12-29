import { BASE_API_URL } from '../constants'
import { authenticatedFetch } from './auth'

// Types
export interface FbAdAccount {
  id: string
  name: string
  account_id: string
  account_status: number
  currency: string
  timezone_name: string
  amount_spent: string
}

export interface FbAdInsights {
  impressions: number
  clicks: number
  spend: number
  reach: number
  cpc: number
  cpm: number
  ctr: number
  frequency: number
  actions: FbAction[]
  cost_per_action_type: FbAction[]
}

export interface FbAction {
  action_type: string
  value: string
}

export interface FbCampaign {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  objective: string
  created_time: string
  start_time?: string
  stop_time?: string
  daily_budget?: string
  lifetime_budget?: string
  insights: {
    impressions: number
    clicks: number
    spend: number
    reach: number
    cpc: number
    cpm: number
    ctr: number
    actions: FbAction[]
  }
}

export interface FbAdSet {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  campaign_id: string
  daily_budget?: string
  lifetime_budget?: string
  optimization_goal?: string
  insights: {
    impressions: number
    clicks: number
    spend: number
    reach: number
    cpc: number
    cpm: number
    ctr: number
  }
}

export interface FbAd {
  id: string
  name: string
  status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED'
  campaign_id: string
  adset_id: string
  creative: {
    id: string
    name: string
    thumbnail_url?: string
  }
  insights: {
    impressions: number
    clicks: number
    spend: number
    reach: number
    cpc: number
    cpm: number
    ctr: number
    actions: FbAction[]
  }
}

export type DatePreset = 'last_7d' | 'last_14d' | 'last_30d' | 'last_90d' | 'this_month' | 'last_month'

// Facebook Page
export interface FbPage {
  id: string
  name: string
  access_token: string
  category: string
  picture?: { data: { url: string } }
}

// Campaign Create/Update Types
export interface CampaignCreateInput {
  name: string
  objective: CampaignObjective
  status?: 'ACTIVE' | 'PAUSED'
  special_ad_categories?: string[]
  daily_budget?: number  // 원 단위 (KRW는 cents 개념 없음)
  lifetime_budget?: number
}

export interface CampaignUpdateInput {
  name?: string
  status?: 'ACTIVE' | 'PAUSED'
  daily_budget?: number
  lifetime_budget?: number
}

export type CampaignObjective = 
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_SALES'
  | 'OUTCOME_APP_PROMOTION'

// Ad Set Create/Update Types
export interface AdSetCreateInput {
  name: string
  campaign_id: string
  optimization_goal: OptimizationGoal
  billing_event?: 'IMPRESSIONS' | 'LINK_CLICKS'
  bid_amount?: number
  daily_budget?: number
  lifetime_budget?: number
  status?: 'ACTIVE' | 'PAUSED'
  targeting_countries?: string[]
  targeting_age_min?: number
  targeting_age_max?: number
  targeting_genders?: number[]
  start_time?: string
  end_time?: string
}

export interface AdSetUpdateInput {
  name?: string
  status?: 'ACTIVE' | 'PAUSED'
  daily_budget?: number
  lifetime_budget?: number
  bid_amount?: number
}

export type OptimizationGoal =
  | 'LINK_CLICKS'
  | 'REACH'
  | 'IMPRESSIONS'
  | 'LANDING_PAGE_VIEWS'
  | 'LEAD_GENERATION'
  | 'CONVERSATIONS'
  | 'VALUE'

// Ad Creative Types
export interface AdCreativeInput {
  name: string
  page_id: string
  message: string
  link: string
  link_headline?: string
  link_description?: string
  call_to_action_type?: CallToActionType
  image_hash?: string
  image_url?: string
}

export type CallToActionType =
  | 'LEARN_MORE'
  | 'SHOP_NOW'
  | 'SIGN_UP'
  | 'CONTACT_US'
  | 'DOWNLOAD'
  | 'GET_QUOTE'
  | 'BOOK_NOW'
  | 'APPLY_NOW'
  | 'SUBSCRIBE'
  | 'GET_OFFER'

// Ad Create/Update Types
export interface AdCreateInput {
  name: string
  adset_id: string
  creative_id?: string
  creative?: AdCreativeInput
  status?: 'ACTIVE' | 'PAUSED'
}

export interface AdUpdateInput {
  name?: string
  status?: 'ACTIVE' | 'PAUSED'
}

// Image Upload Response
export interface ImageUploadResponse {
  hash: string
  url: string
  name: string
}

// API Functions

/**
 * 연결된 Facebook 광고 계정 목록 조회
 */
export async function getFbAdAccounts(): Promise<FbAdAccount[]> {
  const response = await authenticatedFetch(`${BASE_API_URL}/api/fb-ads/accounts`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to fetch ad accounts')
  }
  
  const result = await response.json()
  return result.data
}

/**
 * 특정 광고 계정의 인사이트(성과) 데이터 조회
 */
export async function getFbAccountInsights(
  accountId: string,
  datePreset: DatePreset = 'last_30d'
): Promise<FbAdInsights> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/accounts/${accountId}/insights?date_preset=${datePreset}`
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to fetch account insights')
  }
  
  const result = await response.json()
  return result.data
}

/**
 * 특정 광고 계정의 캠페인 목록과 성과 데이터 조회
 */
export async function getFbCampaigns(
  accountId: string,
  datePreset: DatePreset = 'last_30d',
  limit: number = 50
): Promise<FbCampaign[]> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/accounts/${accountId}/campaigns?date_preset=${datePreset}&limit=${limit}`
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to fetch campaigns')
  }
  
  const result = await response.json()
  return result.data
}

/**
 * 광고 세트 목록과 성과 데이터 조회
 */
export async function getFbAdSets(
  accountId: string,
  campaignId?: string,
  datePreset: DatePreset = 'last_30d',
  limit: number = 50
): Promise<FbAdSet[]> {
  let url = `${BASE_API_URL}/api/fb-ads/accounts/${accountId}/adsets?date_preset=${datePreset}&limit=${limit}`
  if (campaignId) {
    url += `&campaign_id=${campaignId}`
  }
  
  const response = await authenticatedFetch(url)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to fetch ad sets')
  }
  
  const result = await response.json()
  return result.data
}

/**
 * 광고 목록과 성과 데이터 조회
 */
export async function getFbAds(
  accountId: string,
  campaignId?: string,
  adsetId?: string,
  datePreset: DatePreset = 'last_30d',
  limit: number = 50
): Promise<FbAd[]> {
  let url = `${BASE_API_URL}/api/fb-ads/accounts/${accountId}/ads?date_preset=${datePreset}&limit=${limit}`
  if (campaignId) {
    url += `&campaign_id=${campaignId}`
  }
  if (adsetId) {
    url += `&adset_id=${adsetId}`
  }
  
  const response = await authenticatedFetch(url)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to fetch ads')
  }
  
  const result = await response.json()
  return result.data
}

// ============== Facebook Pages ==============

/**
 * 연결된 Facebook 페이지 목록 조회
 */
export async function getFbPages(): Promise<FbPage[]> {
  const response = await authenticatedFetch(`${BASE_API_URL}/api/fb-ads/pages`)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to fetch pages')
  }
  
  const result = await response.json()
  return result.data
}

// ============== Campaign CRUD ==============

/**
 * 캠페인 생성
 */
export async function createCampaign(
  accountId: string,
  data: CampaignCreateInput
): Promise<{ id: string }> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/accounts/${accountId}/campaigns`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to create campaign')
  }
  
  const result = await response.json()
  return result.data
}

/**
 * 캠페인 수정
 */
export async function updateCampaign(
  campaignId: string,
  data: CampaignUpdateInput
): Promise<void> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/campaigns/${campaignId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to update campaign')
  }
}

/**
 * 캠페인 삭제
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/campaigns/${campaignId}`,
    { method: 'DELETE' }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to delete campaign')
  }
}

/**
 * 캠페인 상태 변경
 */
export async function updateCampaignStatus(
  campaignId: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<void> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/campaigns/${campaignId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to update campaign status')
  }
}

// ============== Ad Set CRUD ==============

/**
 * 광고 세트 생성
 */
export async function createAdSet(
  accountId: string,
  data: AdSetCreateInput
): Promise<{ id: string }> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/accounts/${accountId}/adsets`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to create ad set')
  }
  
  const result = await response.json()
  return result.data
}

/**
 * 광고 세트 수정
 */
export async function updateAdSet(
  adsetId: string,
  data: AdSetUpdateInput
): Promise<void> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/adsets/${adsetId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to update ad set')
  }
}

/**
 * 광고 세트 삭제
 */
export async function deleteAdSet(adsetId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/adsets/${adsetId}`,
    { method: 'DELETE' }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to delete ad set')
  }
}

/**
 * 광고 세트 상태 변경
 */
export async function updateAdSetStatus(
  adsetId: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<void> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/adsets/${adsetId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to update ad set status')
  }
}

// ============== Image Upload ==============

/**
 * 광고 이미지 업로드
 */
export async function uploadAdImage(
  accountId: string,
  file: File
): Promise<ImageUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  
  const token = localStorage.getItem('prism_access_token')
  
  const response = await fetch(
    `${BASE_API_URL}/api/fb-ads/accounts/${accountId}/images`,
    {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to upload image')
  }
  
  const result = await response.json()
  return result.data
}

// ============== Ad Creative ==============

/**
 * 광고 소재 생성
 */
export async function createAdCreative(
  accountId: string,
  data: AdCreativeInput
): Promise<{ id: string }> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/accounts/${accountId}/adcreatives`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to create ad creative')
  }
  
  const result = await response.json()
  return result.data
}

// ============== Ad CRUD ==============

/**
 * 광고 생성
 */
export async function createAd(
  accountId: string,
  data: AdCreateInput
): Promise<{ id: string; creative_id: string }> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/accounts/${accountId}/ads`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to create ad')
  }
  
  const result = await response.json()
  return result.data
}

/**
 * 광고 수정
 */
export async function updateAd(
  adId: string,
  data: AdUpdateInput
): Promise<void> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/ads/${adId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to update ad')
  }
}

/**
 * 광고 삭제
 */
export async function deleteAd(adId: string): Promise<void> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/ads/${adId}`,
    { method: 'DELETE' }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to delete ad')
  }
}

/**
 * 광고 상태 변경
 */
export async function updateAdStatus(
  adId: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<void> {
  const response = await authenticatedFetch(
    `${BASE_API_URL}/api/fb-ads/ads/${adId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  )
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Failed to update ad status')
  }
}
