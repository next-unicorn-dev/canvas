import { BASE_API_URL } from '../constants'

export interface AdData {
  id: string
  ad_creation_time?: string
  ad_delivery_start_time?: string
  ad_delivery_stop_time?: string
  ad_creative_bodies?: string[]
  ad_creative_link_titles?: string[]
  ad_creative_link_captions?: string[]
  ad_creative_link_descriptions?: string[]
  ad_snapshot_url?: string
  page_id?: string
  page_name?: string
  publisher_platforms?: string[]
  impressions?: {
    lower_bound?: string
    upper_bound?: string
  }
  spend?: {
    lower_bound?: string
    upper_bound?: string
  }
  currency?: string
}

export interface AdLibraryResponse {
  data: AdData[]
  paging?: {
    cursors?: {
      after?: string
      before?: string
    }
    next?: string
  }
  total_count?: number
}

export interface AdLibrarySearchParams {
  search_terms?: string
  search_page_ids?: string
  ad_reached_countries?: string
  ad_type?: string
  ad_active_status?: string
  media_type?: string
  limit?: number
  after?: string
}

export interface Country {
  code: string
  name: string
  name_en: string
}

export interface AdLibraryStatus {
  configured: boolean
  message: string
}

function getAdLibraryEndpoint(path: string = '') {
  return `${BASE_API_URL}/api/ad-library${path}`
}

export async function searchAds(params: AdLibrarySearchParams): Promise<AdLibraryResponse> {
  const searchParams = new URLSearchParams()
  
  if (params.search_terms) searchParams.set('search_terms', params.search_terms)
  if (params.search_page_ids) searchParams.set('search_page_ids', params.search_page_ids)
  if (params.ad_reached_countries) searchParams.set('ad_reached_countries', params.ad_reached_countries)
  if (params.ad_type) searchParams.set('ad_type', params.ad_type)
  if (params.ad_active_status) searchParams.set('ad_active_status', params.ad_active_status)
  if (params.media_type) searchParams.set('media_type', params.media_type)
  if (params.limit) searchParams.set('limit', params.limit.toString())
  if (params.after) searchParams.set('after', params.after)
  
  const response = await fetch(`${getAdLibraryEndpoint('/search')}?${searchParams.toString()}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to search ads')
  }
  
  return response.json()
}

export async function getPageAds(
  pageId: string,
  params?: Omit<AdLibrarySearchParams, 'search_terms' | 'search_page_ids'>
): Promise<AdLibraryResponse> {
  const searchParams = new URLSearchParams()
  
  if (params?.ad_reached_countries) searchParams.set('ad_reached_countries', params.ad_reached_countries)
  if (params?.ad_active_status) searchParams.set('ad_active_status', params.ad_active_status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.after) searchParams.set('after', params.after)
  
  const response = await fetch(`${getAdLibraryEndpoint(`/page/${pageId}/ads`)}?${searchParams.toString()}`)
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get page ads')
  }
  
  return response.json()
}

export async function getSupportedCountries(): Promise<{ countries: Country[] }> {
  const response = await fetch(getAdLibraryEndpoint('/countries'))
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get supported countries')
  }
  
  return response.json()
}

export async function getAdLibraryStatus(): Promise<AdLibraryStatus> {
  const response = await fetch(getAdLibraryEndpoint('/status'))
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get ad library status')
  }
  
  return response.json()
}

