import TopMenu from '@/components/TopMenu'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Eye, MousePointerClick, Users, DollarSign, Calendar, Loader2, Instagram, Heart, MessageCircle, ExternalLink } from 'lucide-react'
import { motion } from 'motion/react'
import { getAdPerformance } from '@/api/ad-performance'
import { getInstagramMedia, getInstagramStatus, InstagramMedia } from '@/api/instagram'
import { Button } from '@/components/ui/button'
import { useConfigs } from '@/contexts/configs'

export const Route = createFileRoute('/ad-performance')({
  component: AdPerformance,
})

interface AdPerformanceData {
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

interface CampaignPerformance {
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

function AdPerformance() {
  const { t } = useTranslation()
  const { setShowSettingsDialog } = useConfigs()
  const [loading, setLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<AdPerformanceData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Instagram State
  const [isInstagramConnected, setIsInstagramConnected] = useState(false)
  const [instagramData, setInstagramData] = useState<InstagramMedia[]>([])

  useEffect(() => {
    loadPerformanceData()
  }, [])

  const loadPerformanceData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Check Instagram Connection
      try {
        const status = await getInstagramStatus()
        if (status.connected && status.valid) {
          setIsInstagramConnected(true)
          const mediaResponse = await getInstagramMedia(50) // Fetch recent 50 posts
          setInstagramData(mediaResponse.data.data)
        } else {
          setIsInstagramConnected(false)
        }
      } catch (e) {
        console.warn('Instagram connection check failed:', e)
        setIsInstagramConnected(false)
      }

      // 2. Load Ad Performance Mock Data (Always load for now or optional?)
      // If we want to show ONLY Instagram data when connected, we can skip this.
      // But let's load it as fallback or side-by-side if needed.
      const data = await getAdPerformance()
      setPerformanceData(data)
      
    } catch (err: any) {
      console.error('Failed to load ad performance data:', err)
      setError(err.message || '광고 성과 데이터를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num)
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(num)
  }

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`
  }

  // Calculate Instagram aggregates
  const totalLikes = instagramData.reduce((acc, post) => acc + (post.like_count || 0), 0)
  const totalComments = instagramData.reduce((acc, post) => acc + (post.comments_count || 0), 0)
  const totalPosts = instagramData.length
  const avgLikes = totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0

  return (
    <div className="flex flex-col w-screen h-screen">
      <TopMenu />
      <ScrollArea className="flex-1">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <h1 className="text-3xl font-bold">
                    {isInstagramConnected 
                      ? t('canvas:instagramPerformance', 'Instagram Performance') 
                      : t('canvas:adPerformance', '광고 성과 분석')}
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  {isInstagramConnected
                    ? t('canvas:instagramPerformanceDescription', 'View your Instagram engagement metrics and recent posts')
                    : t('canvas:adPerformanceDescription', '실행한 광고 캠페인의 성과를 확인하고 분석하세요')}
                </p>
              </div>
              {!loading && !isInstagramConnected && (
                <Button 
                  onClick={() => setShowSettingsDialog(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                >
                  <Instagram className="mr-2 h-4 w-4" />
                  {t('canvas:connectInstagram', 'Connect Instagram')}
                </Button>
              )}
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card className="p-6">
              <div className="text-center text-destructive">
                <p className="text-lg font-semibold mb-2">오류 발생</p>
                <p className="text-sm">{error}</p>
              </div>
            </Card>
          ) : isInstagramConnected ? (
            /* Instagram Data View */
            <>
              {/* Key Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('canvas:totalPosts', 'Total Posts')}</CardTitle>
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(totalPosts)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{t('canvas:recentPostsFetched', 'Recent posts fetched')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('canvas:totalLikes', 'Total Likes')}</CardTitle>
                    <Heart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(totalLikes)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('canvas:avgLikesPerPost', { count: formatNumber(avgLikes) })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('canvas:totalComments', 'Total Comments')}</CardTitle>
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatNumber(totalComments)}</div>
                    <p className="text-xs text-muted-foreground mt-1">{t('canvas:totalEngagement', 'Total audience engagement')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('canvas:engagementRate', 'Engagement Rate')}</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {totalPosts > 0 
                        ? ((totalLikes + totalComments) / totalPosts).toFixed(1) 
                        : '0'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t('canvas:avgInteractions', 'Avg. interactions per post')}</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Post List */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{t('canvas:recentPosts', 'Recent Posts')}</CardTitle>
                    <CardDescription>{t('canvas:recentPostsDescription', 'Performance of your latest Instagram posts')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {instagramData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t('canvas:noRecentPosts', 'No recent posts found.')}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {instagramData.map((post) => (
                          <Card key={post.id} className="overflow-hidden">
                            <div className="aspect-square relative group">
                              {post.media_url ? (
                                <img 
                                  src={post.media_url} 
                                  alt={post.caption || 'Instagram post'} 
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <Instagram className="w-12 h-12 text-muted-foreground" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                                <div className="flex items-center gap-1">
                                  <Heart className="w-5 h-5 fill-current" />
                                  <span className="font-bold">{formatNumber(post.like_count || 0)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="w-5 h-5 fill-current" />
                                  <span className="font-bold">{formatNumber(post.comments_count || 0)}</span>
                                </div>
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2 min-h-[40px]">
                                {post.caption || t('canvas:noCaption', 'No caption')}
                              </p>
                              <div className="flex justify-between items-center text-xs text-muted-foreground">
                                <span>{new Date(post.timestamp).toLocaleDateString()}</span>
                                <a 
                                  href={post.permalink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 hover:text-primary"
                                >
                                  {t('canvas:viewOnInstagram', 'View')} <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </>
          ) : performanceData ? (
            <>
              {/* Key Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('canvas:totalImpressions', '총 노출수')}
                    </CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(performanceData.totalImpressions)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('canvas:impressionsDescription', '광고가 노출된 총 횟수')}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('canvas:totalClicks', '총 클릭수')}
                    </CardTitle>
                    <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(performanceData.totalClicks)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      CTR: {formatPercentage(performanceData.clickThroughRate)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('canvas:totalConversions', '총 전환수')}
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(performanceData.totalConversions)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      전환율: {formatPercentage(performanceData.conversionRate)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('canvas:totalSpent', '총 지출')}
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(performanceData.totalSpent)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      CPC: {formatCurrency(performanceData.costPerClick)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Performance Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>성과 지표</CardTitle>
                    <CardDescription>주요 성과 지표 요약</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">클릭률 (CTR)</span>
                      <span className="text-lg font-semibold">
                        {formatPercentage(performanceData.clickThroughRate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">전환율</span>
                      <span className="text-lg font-semibold">
                        {formatPercentage(performanceData.conversionRate)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">클릭당 비용 (CPC)</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(performanceData.costPerClick)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">전환당 비용 (CPA)</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(performanceData.costPerConversion)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>캠페인 요약</CardTitle>
                    <CardDescription>전체 캠페인 현황</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">총 캠페인 수</span>
                      <span className="text-lg font-semibold">
                        {performanceData.campaigns.length}개
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">진행 중</span>
                      <span className="text-lg font-semibold text-green-600">
                        {performanceData.campaigns.filter((c) => c.status === 'active').length}개
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">일시정지</span>
                      <span className="text-lg font-semibold text-yellow-600">
                        {performanceData.campaigns.filter((c) => c.status === 'paused').length}개
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">완료</span>
                      <span className="text-lg font-semibold text-gray-600">
                        {performanceData.campaigns.filter((c) => c.status === 'completed').length}개
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Campaign List */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>캠페인 목록</CardTitle>
                    <CardDescription>개별 캠페인 성과 상세 정보</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {performanceData.campaigns.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        등록된 캠페인이 없습니다.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {performanceData.campaigns.map((campaign) => (
                          <Card key={campaign.id} className="p-4">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-semibold">{campaign.name}</h3>
                                <p className="text-sm text-muted-foreground">{campaign.platform}</p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  campaign.status === 'active'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : campaign.status === 'paused'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                }`}
                              >
                                {campaign.status === 'active'
                                  ? '진행 중'
                                  : campaign.status === 'paused'
                                  ? '일시정지'
                                  : '완료'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">노출수</p>
                                <p className="text-sm font-semibold">
                                  {formatNumber(campaign.impressions)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">클릭수</p>
                                <p className="text-sm font-semibold">
                                  {formatNumber(campaign.clicks)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">전환수</p>
                                <p className="text-sm font-semibold">
                                  {formatNumber(campaign.conversions)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">지출</p>
                                <p className="text-sm font-semibold">
                                  {formatCurrency(campaign.spent)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(campaign.startDate).toLocaleDateString('ko-KR')} -{' '}
                                {new Date(campaign.endDate).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  )
}

