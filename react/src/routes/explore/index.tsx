import TopMenu from '@/components/TopMenu'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { searchAds, getSupportedCountries, getAdLibraryStatus, type AdData } from '@/api/adLibrary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search,
  Loader2,
  ExternalLink,
  Sparkles,
  Globe,
  Filter,
  AlertCircle,
  Facebook,
  Instagram,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { nanoid } from 'nanoid'
import { createCanvas } from '@/api/canvas'
import { useMutation } from '@tanstack/react-query'
import { useConfigs } from '@/contexts/configs'
import { DEFAULT_SYSTEM_PROMPT } from '@/constants'

export const Route = createFileRoute('/explore/')({
  component: Explore,
})

function Explore() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setInitCanvas } = useConfigs()

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('KR')
  const [activeStatus, setActiveStatus] = useState('ACTIVE')
  const [adType, setAdType] = useState('ALL')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<AdData[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  // Check API status
  const { data: apiStatus, isLoading: isCheckingStatus } = useQuery({
    queryKey: ['ad-library-status'],
    queryFn: getAdLibraryStatus,
    retry: false,
  })

  // Get supported countries
  const { data: countriesData } = useQuery({
    queryKey: ['ad-library-countries'],
    queryFn: getSupportedCountries,
  })

  // Create canvas mutation
  const { mutate: createCanvasMutation, isPending: isCreatingCanvas } = useMutation({
    mutationFn: createCanvas,
    onSuccess: (data, variables) => {
      setInitCanvas(true)
      navigate({
        to: '/canvas/$id',
        params: { id: data.id },
        search: {
          sessionId: variables.session_id,
        },
      })
    },
    onError: (error: any) => {
      toast.error(t('common:messages.error', 'Error'), {
        description: error.message,
      })
    },
  })

  const handleSearch = useCallback(async (loadMore = false) => {
    if (!searchQuery.trim() && !loadMore) {
      toast.error(t('canvas:enterSearchTerms', '검색어를 입력해주세요'))
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const response = await searchAds({
        search_terms: searchQuery.trim(),
        ad_reached_countries: selectedCountry,
        ad_active_status: activeStatus,
        ad_type: adType,
        limit: 25,
        after: loadMore ? nextCursor || undefined : undefined,
      })

      if (loadMore) {
        setSearchResults((prev) => [...prev, ...response.data])
      } else {
        setSearchResults(response.data)
      }

      setNextCursor(response.paging?.cursors?.after || null)
    } catch (error: any) {
      toast.error(t('canvas:searchFailed', '검색에 실패했습니다'), {
        description: error.message,
      })
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, selectedCountry, activeStatus, adType, nextCursor, t])

  const handleUseAsReference = useCallback(async (ad: AdData) => {
    try {
      const adText = ad.ad_creative_bodies?.[0] || ''
      const adTitle = ad.ad_creative_link_titles?.[0] || ''
      const pageName = ad.page_name || ''

      const canvasId = nanoid()
      const sessionId = nanoid()

      const messages = [
        {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: `이 광고를 레퍼런스로 사용해서 비슷한 스타일의 광고를 만들어줘.\n\n광고주: ${pageName}\n제목: ${adTitle}\n내용: ${adText}\n\n광고 스냅샷: ${ad.ad_snapshot_url || '없음'}`,
            },
          ],
        },
      ]

      createCanvasMutation({
        name: t('canvas:newAdFromReference', 'New Ad from Reference'),
        canvas_id: canvasId,
        messages,
        session_id: sessionId,
        text_model: {
          provider: 'openai',
          model: 'gpt-4o',
          url: '',
        },
        tool_list: [],
        system_prompt: localStorage.getItem('system_prompt') || DEFAULT_SYSTEM_PROMPT,
      })

      toast.success(t('canvas:creatingCanvas', 'Creating canvas with reference...'))
    } catch (error: any) {
      console.error('Failed to create canvas with reference:', error)
      toast.error(`Failed to create canvas: ${error.message || error}`)
    }
  }, [createCanvasMutation, t])

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getPlatformIcon = (platforms?: string[]) => {
    if (!platforms || platforms.length === 0) return null
    
    const icons = []
    if (platforms.includes('facebook')) {
      icons.push(<Facebook key="fb" className="w-4 h-4" />)
    }
    if (platforms.includes('instagram')) {
      icons.push(<Instagram key="ig" className="w-4 h-4" />)
    }
    return icons
  }

  return (
    <div className="flex flex-col w-screen h-screen">
      <TopMenu />
      <ScrollArea className="flex-1">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Search className="w-8 h-8 text-primary" />
              {t('canvas:explore', '탐색')}
            </h1>
            <p className="text-muted-foreground">
              {t('canvas:exploreDescription', 'Facebook 광고 라이브러리에서 경쟁사 광고를 검색하고 레퍼런스로 활용하세요')}
            </p>
          </div>

          {/* API Status Check */}
          {isCheckingStatus ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !apiStatus?.configured ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-400">
                    {t('canvas:adLibraryNotConfigured', 'Facebook Ad Library API 설정 필요')}
                  </h3>
                  <p className="text-amber-700 dark:text-amber-500 mt-1 text-sm">
                    {t('canvas:adLibraryNotConfiguredDescription', 'Facebook 광고 라이브러리를 사용하려면 FB_ACCESS_TOKEN 환경 변수를 설정해주세요.')}
                  </p>
                  <a
                    href="https://www.facebook.com/ads/library/api/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400"
                  >
                    {t('canvas:learnMore', '자세히 알아보기')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Search Bar */}
              <div className="bg-card border rounded-lg p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search Input */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder={t('canvas:searchAdsPlaceholder', '브랜드명, 키워드로 광고 검색...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap gap-2">
                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="w-[130px]">
                        <Globe className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countriesData?.countries.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={adType} onValueChange={setAdType}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">{t('canvas:allAdTypes', '전체 광고')}</SelectItem>
                        <SelectItem value="POLITICAL_AND_ISSUE_ADS">{t('canvas:politicalAds', '정치/이슈')}</SelectItem>
                        <SelectItem value="HOUSING_ADS">{t('canvas:housingAds', '부동산')}</SelectItem>
                        <SelectItem value="EMPLOYMENT_ADS">{t('canvas:employmentAds', '채용')}</SelectItem>
                        <SelectItem value="FINANCIAL_PRODUCTS_AND_SERVICES_ADS">{t('canvas:financialAds', '금융')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={activeStatus} onValueChange={setActiveStatus}>
                      <SelectTrigger className="w-[100px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">{t('canvas:activeAds', '진행중')}</SelectItem>
                        <SelectItem value="INACTIVE">{t('canvas:inactiveAds', '종료됨')}</SelectItem>
                        <SelectItem value="ALL">{t('canvas:allAds', '전체')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={() => handleSearch()} disabled={isSearching}>
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      <span className="ml-2">{t('canvas:search', '검색')}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Search Results */}
              {isSearching && searchResults.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {t('canvas:searchResultsCount', '{{count}}개의 광고를 찾았습니다', { count: searchResults.length })}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => handleSearch()}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('canvas:refresh', '새로고침')}
                    </Button>
                  </div>

                  <AnimatePresence>
                    {searchResults.map((ad, index) => (
                      <motion.div
                        key={ad.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {/* Ad Snapshot Thumbnail */}
                              {ad.ad_snapshot_url && (
                                <a
                                  href={ad.ad_snapshot_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 w-32 h-32 bg-muted rounded-lg overflow-hidden flex items-center justify-center hover:opacity-80 transition-opacity"
                                >
                                  <div className="text-center text-muted-foreground text-xs p-2">
                                    <ExternalLink className="w-6 h-6 mx-auto mb-1" />
                                    {t('canvas:viewSnapshot', '스냅샷 보기')}
                                  </div>
                                </a>
                              )}

                              {/* Ad Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="min-w-0">
                                    {/* Page Name */}
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-semibold truncate">{ad.page_name || 'Unknown Page'}</span>
                                      <div className="flex items-center gap-1 text-muted-foreground">
                                        {getPlatformIcon(ad.publisher_platforms)}
                                      </div>
                                    </div>

                                    {/* Ad Title */}
                                    {ad.ad_creative_link_titles?.[0] && (
                                      <p className="font-medium text-sm mb-1">
                                        {ad.ad_creative_link_titles[0]}
                                      </p>
                                    )}

                                    {/* Ad Body */}
                                    {ad.ad_creative_bodies?.[0] && (
                                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                        {ad.ad_creative_bodies[0]}
                                      </p>
                                    )}

                                    {/* Meta Info */}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                      {ad.ad_delivery_start_time && (
                                        <Badge variant="secondary">
                                          시작: {formatDate(ad.ad_delivery_start_time)}
                                        </Badge>
                                      )}
                                      {ad.impressions && (
                                        <Badge variant="outline">
                                          노출: {ad.impressions.lower_bound || 0}+
                                        </Badge>
                                      )}
                                      {ad.spend && (
                                        <Badge variant="outline">
                                          지출: {ad.currency} {ad.spend.lower_bound || 0}+
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex flex-col gap-2 shrink-0">
                                    <Button
                                      size="sm"
                                      onClick={() => handleUseAsReference(ad)}
                                      disabled={isCreatingCanvas}
                                    >
                                      <Sparkles className="w-4 h-4 mr-1" />
                                      {t('canvas:useAsReference', '레퍼런스로 사용')}
                                    </Button>
                                    {ad.ad_snapshot_url && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => window.open(ad.ad_snapshot_url, '_blank')}
                                      >
                                        <ExternalLink className="w-4 h-4 mr-1" />
                                        {t('canvas:viewAd', '광고 보기')}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Load More */}
                  {nextCursor && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => handleSearch(true)}
                        disabled={isSearching}
                      >
                        {isSearching ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        {t('canvas:loadMore', '더 보기')}
                      </Button>
                    </div>
                  )}
                </div>
              ) : hasSearched ? (
                <div className="text-center py-20">
                  <Search className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    {t('canvas:noAdsFound', '검색 결과가 없습니다')}
                  </h3>
                  <p className="text-muted-foreground">
                    {t('canvas:tryDifferentKeywords', '다른 키워드로 검색해보세요')}
                  </p>
                </div>
              ) : (
                <div className="text-center py-20">
                  <Globe className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">
                    {t('canvas:startSearching', '광고 검색을 시작하세요')}
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {t('canvas:searchTip', '브랜드명, 제품명, 또는 키워드를 입력하여 경쟁사 광고를 검색하고 레퍼런스로 활용할 수 있습니다')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
