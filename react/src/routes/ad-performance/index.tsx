import TopMenu from '@/components/TopMenu'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useMemo, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Eye, MousePointerClick, Users, DollarSign, Calendar, Loader2, Instagram, Heart, MessageCircle, ExternalLink, RefreshCw, Facebook, Target, Megaphone, BarChart3, Plus, Play, Pause, Trash2, MoreVertical } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useConfigs } from '@/contexts/configs'
import { useInstagramStatus, useInstagramMedia, useInvalidateInstagram } from '@/hooks/use-instagram'
import { useAdPerformance } from '@/hooks/use-ad-performance'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useFbAdAccounts, useFbAccountInsights, useFbCampaigns, useUpdateCampaignStatus, useDeleteCampaign } from '@/hooks/use-fb-ads'
import type { DatePreset } from '@/api/fb-ads'
import { CreateCampaignDialog, CreateAdSetDialog, CreateAdDialog } from '@/components/fb-ads'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

export const Route = createFileRoute('/ad-performance/')({
  component: AdPerformance,
})

function AdPerformance() {
  const { t } = useTranslation()
  const { setShowSettingsDialog } = useConfigs()
  const { invalidateMedia } = useInvalidateInstagram()
  const [activeTab, setActiveTab] = useState('instagram')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [datePreset, setDatePreset] = useState<DatePreset>('last_30d')

  // Dialog states
  const [showCampaignDialog, setShowCampaignDialog] = useState(false)
  const [showAdSetDialog, setShowAdSetDialog] = useState(false)
  const [showAdDialog, setShowAdDialog] = useState(false)

  // Mutation Hooks
  const updateCampaignStatus = useUpdateCampaignStatus()
  const deleteCampaignMutation = useDeleteCampaign()

  // React Query Hooks - Instagram
  const {
    data: statusData,
    isLoading: isStatusLoading,
    error: statusError
  } = useInstagramStatus()

  const isInstagramConnected = statusData?.connected && statusData?.valid

  const {
    data: mediaResponse,
    isLoading: isMediaLoading,
    error: mediaError,
    refetch: refetchMedia,
    isFetching: isMediaFetching
  } = useInstagramMedia(50, undefined, isInstagramConnected ?? false)

  const {
    data: performanceData,
    isLoading: isPerformanceLoading,
    error: performanceError
  } = useAdPerformance(!isInstagramConnected)

  // React Query Hooks - Facebook Ads
  const {
    data: fbAccounts,
    isLoading: isFbAccountsLoading,
    error: fbAccountsError,
    refetch: refetchFbAccounts
  } = useFbAdAccounts(activeTab === 'facebook')

  const activeAccountId = selectedAccountId || fbAccounts?.[0]?.account_id

  const {
    data: fbInsights,
    isLoading: isFbInsightsLoading,
    error: fbInsightsError,
    refetch: refetchFbInsights
  } = useFbAccountInsights(activeAccountId || '', datePreset, !!activeAccountId && activeTab === 'facebook')

  const {
    data: fbCampaigns,
    isLoading: isFbCampaignsLoading,
    error: fbCampaignsError,
    refetch: refetchFbCampaigns
  } = useFbCampaigns(activeAccountId || '', datePreset, 50, !!activeAccountId && activeTab === 'facebook')

  // Combined loading and error states for Instagram
  const isInstagramLoading = isStatusLoading || (isInstagramConnected && isMediaLoading) || (!isInstagramConnected && isPerformanceLoading)
  const instagramError = statusError || (isInstagramConnected && mediaError) || (!isInstagramConnected && performanceError)

  // Facebook loading state
  const isFacebookLoading = isFbAccountsLoading || isFbInsightsLoading || isFbCampaignsLoading
  const facebookError = fbAccountsError || fbInsightsError || fbCampaignsError

  // Instagram data
  const instagramData = mediaResponse?.data?.data ?? []

  // Calculate Instagram aggregates
  const { totalLikes, totalComments, totalPosts, avgLikes } = useMemo(() => {
    const posts = instagramData
    const likes = posts.reduce((acc, post) => acc + (post.like_count || 0), 0)
    const comments = posts.reduce((acc, post) => acc + (post.comments_count || 0), 0)
    const count = posts.length
    return {
      totalLikes: likes,
      totalComments: comments,
      totalPosts: count,
      avgLikes: count > 0 ? Math.round(likes / count) : 0,
    }
  }, [instagramData])

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num)
  }

  const formatCurrency = (num: number, currency?: string) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency || 'KRW',
      maximumFractionDigits: 0,
    }).format(num)
  }

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`
  }

  const handleRefresh = () => {
    if (activeTab === 'instagram') {
      refetchMedia()
      invalidateMedia()
    } else {
      refetchFbAccounts()
      refetchFbInsights()
      refetchFbCampaigns()
    }
  }

  const datePresetLabels: Record<DatePreset, string> = {
    'last_7d': '최근 7일',
    'last_14d': '최근 14일',
    'last_30d': '최근 30일',
    'last_90d': '최근 90일',
    'this_month': '이번 달',
    'last_month': '지난 달',
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      'ACTIVE': { label: '진행 중', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      'PAUSED': { label: '일시정지', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      'DELETED': { label: '삭제됨', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      'ARCHIVED': { label: '보관됨', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    }
    const info = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${info.className}`}>
        {info.label}
      </span>
    )
  }

  const handleCampaignStatusToggle = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    try {
      await updateCampaignStatus.mutateAsync({ campaignId, status: newStatus })
      toast.success(newStatus === 'ACTIVE' ? '캠페인이 시작되었습니다' : '캠페인이 일시정지되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '상태 변경에 실패했습니다')
    }
  }

  const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
    if (!confirm(`"${campaignName}" 캠페인을 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.`)) {
      return
    }
    try {
      await deleteCampaignMutation.mutateAsync(campaignId)
      toast.success('캠페인이 삭제되었습니다')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다')
    }
  }

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
                    {t('canvas:adPerformance', '광고 성과 분석')}
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  {t('canvas:adPerformanceDescription', '실행한 광고 캠페인의 성과를 확인하고 분석하세요')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={activeTab === 'instagram' ? isMediaFetching : isFacebookLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${(activeTab === 'instagram' ? isMediaFetching : isFacebookLoading) ? 'animate-spin' : ''}`} />
                  {t('canvas:refresh', 'Refresh')}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </TabsTrigger>
              <TabsTrigger value="facebook" className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Facebook Ads
              </TabsTrigger>
            </TabsList>

            {/* Instagram Tab Content */}
            <TabsContent value="instagram">
              {isInstagramLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : instagramError ? (
                <Card className="p-6">
                  <div className="text-center text-destructive">
                    <p className="text-lg font-semibold mb-2">오류 발생</p>
                    <p className="text-sm">{instagramError.message || '데이터를 불러오는데 실패했습니다'}</p>
                  </div>
                </Card>
              ) : isInstagramConnected ? (
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
              ) : (
                <Card className="p-8">
                  <div className="text-center">
                    <Instagram className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">Instagram 연결 필요</h3>
                    <p className="text-muted-foreground mb-6">
                      Instagram 계정을 연결하면 게시물 성과를 확인할 수 있습니다.
                    </p>
                    <Button
                      onClick={() => setShowSettingsDialog(true)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                    >
                      <Instagram className="mr-2 h-4 w-4" />
                      {t('canvas:connectInstagram', 'Connect Instagram')}
                    </Button>
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* Facebook Ads Tab Content */}
            <TabsContent value="facebook">
              {isFacebookLoading && !fbAccounts ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : facebookError && !fbAccounts ? (
                <Card className="p-6">
                  <div className="text-center text-destructive">
                    <p className="text-lg font-semibold mb-2">오류 발생</p>
                    <p className="text-sm">{facebookError.message || 'Facebook 광고 데이터를 불러오는데 실패했습니다'}</p>
                    <p className="text-xs text-muted-foreground mt-4">
                      FB_ACCESS_TOKEN이 설정되어 있는지 확인하세요.
                    </p>
                  </div>
                </Card>
              ) : !fbAccounts || fbAccounts.length === 0 ? (
                <Card className="p-8">
                  <div className="text-center">
                    <Facebook className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">광고 계정 없음</h3>
                    <p className="text-muted-foreground mb-6">
                      연결된 Facebook 광고 계정이 없습니다. 서버의 FB_ACCESS_TOKEN 설정을 확인하세요.
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  {/* Account Selector & Date Filter & Action Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-wrap items-center justify-between gap-4 mb-6"
                  >
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">광고 계정:</span>
                        <select
                          value={activeAccountId || ''}
                          onChange={(e) => setSelectedAccountId(e.target.value)}
                          className="px-3 py-2 rounded-md border bg-background text-sm"
                        >
                          {fbAccounts.map((account) => (
                            <option key={account.account_id} value={account.account_id}>
                              {account.name} ({account.account_id})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">기간:</span>
                        <select
                          value={datePreset}
                          onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                          className="px-3 py-2 rounded-md border bg-background text-sm"
                        >
                          {Object.entries(datePresetLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* Create Buttons */}
                    <div className="flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            새로 만들기
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setShowCampaignDialog(true)}>
                            <Target className="h-4 w-4 mr-2 text-blue-500" />
                            새 캠페인
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowAdSetDialog(true)}>
                            <Users className="h-4 w-4 mr-2 text-green-500" />
                            새 광고 세트
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowAdDialog(true)}>
                            <Megaphone className="h-4 w-4 mr-2 text-orange-500" />
                            새 광고
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>

                  {/* Facebook Insights */}
                  {fbInsights && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
                    >
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">노출수</CardTitle>
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatNumber(fbInsights.impressions)}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            도달: {formatNumber(fbInsights.reach)}명
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">클릭수</CardTitle>
                          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatNumber(fbInsights.clicks)}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            CTR: {formatPercentage(fbInsights.ctr)}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">총 지출</CardTitle>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{formatCurrency(fbInsights.spend, 'KRW')}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            CPC: {formatCurrency(fbInsights.cpc, 'KRW')}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">빈도</CardTitle>
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{fbInsights.frequency.toFixed(2)}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            CPM: {formatCurrency(fbInsights.cpm, 'KRW')}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {/* Campaign List */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Megaphone className="h-5 w-5" />
                          캠페인 목록
                        </CardTitle>
                        <CardDescription>
                          {datePresetLabels[datePreset]} 기준 캠페인 성과
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {isFbCampaignsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        ) : !fbCampaigns || fbCampaigns.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            등록된 캠페인이 없습니다.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {fbCampaigns.map((campaign) => (
                              <Card key={campaign.id} className="p-4">
                                <div className="flex justify-between items-start mb-4">
                                  <div>
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                      <Target className="h-4 w-4 text-blue-500" />
                                      {campaign.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                      목표: {campaign.objective || '미지정'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getStatusBadge(campaign.status)}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => handleCampaignStatusToggle(campaign.id, campaign.status)}
                                          disabled={updateCampaignStatus.isPending}
                                        >
                                          {campaign.status === 'ACTIVE' ? (
                                            <>
                                              <Pause className="h-4 w-4 mr-2" />
                                              일시정지
                                            </>
                                          ) : (
                                            <>
                                              <Play className="h-4 w-4 mr-2" />
                                              시작하기
                                            </>
                                          )}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                                          className="text-destructive"
                                          disabled={deleteCampaignMutation.isPending}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          삭제
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">노출수</p>
                                    <p className="text-sm font-semibold">
                                      {formatNumber(campaign.insights.impressions)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">도달</p>
                                    <p className="text-sm font-semibold">
                                      {formatNumber(campaign.insights.reach)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">클릭수</p>
                                    <p className="text-sm font-semibold">
                                      {formatNumber(campaign.insights.clicks)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">CTR</p>
                                    <p className="text-sm font-semibold">
                                      {formatPercentage(campaign.insights.ctr)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">CPC</p>
                                    <p className="text-sm font-semibold">
                                      {formatCurrency(campaign.insights.cpc, 'KRW')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">지출</p>
                                    <p className="text-sm font-semibold">
                                      {formatCurrency(campaign.insights.spend, 'KRW')}
                                    </p>
                                  </div>
                                </div>
                                {(campaign.start_time || campaign.created_time) && (
                                  <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      시작: {new Date(campaign.start_time || campaign.created_time).toLocaleDateString('ko-KR')}
                                      {campaign.stop_time && ` ~ 종료: ${new Date(campaign.stop_time).toLocaleDateString('ko-KR')}`}
                                    </span>
                                  </div>
                                )}
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Dialogs */}
      {activeAccountId && (
        <>
          <CreateCampaignDialog
            open={showCampaignDialog}
            onOpenChange={setShowCampaignDialog}
            accountId={activeAccountId}
            onSuccess={() => refetchFbCampaigns()}
          />
          <CreateAdSetDialog
            open={showAdSetDialog}
            onOpenChange={setShowAdSetDialog}
            accountId={activeAccountId}
            onSuccess={() => refetchFbCampaigns()}
          />
          <CreateAdDialog
            open={showAdDialog}
            onOpenChange={setShowAdDialog}
            accountId={activeAccountId}
            onSuccess={() => refetchFbCampaigns()}
          />
        </>
      )}
    </div>
  )
}
