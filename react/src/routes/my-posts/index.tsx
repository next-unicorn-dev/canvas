import TopMenu from '@/components/TopMenu'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getInstagramMedia, getInstagramStatus, type InstagramMedia } from '@/api/instagram'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Instagram, Loader2, ExternalLink, Image as ImageIcon, Video, Grid3x3, Sparkles, Copy, Download, FileImage } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import InstagramConnectDialog from '@/components/canvas/InstagramConnectDialog'
import { PhotoProvider, PhotoView } from 'react-photo-view'
import 'react-photo-view/dist/react-photo-view.css'
import { nanoid } from 'nanoid'
import { createCanvas } from '@/api/canvas'
import { useMutation } from '@tanstack/react-query'
import { useConfigs } from '@/contexts/configs'
import { DEFAULT_SYSTEM_PROMPT } from '@/constants'

export const Route = createFileRoute('/my-posts/')({
  component: MyPosts,
})

function MyPosts() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { setInitCanvas } = useConfigs()
  const [showConnectDialog, setShowConnectDialog] = useState(false)

  // 새 캔버스 생성 mutation
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

  // Instagram 연결 상태 확인
  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['instagram-status'],
    queryFn: getInstagramStatus,
    retry: false,
  })

  // Instagram 미디어 가져오기
  const { data: mediaData, isLoading, refetch } = useQuery({
    queryKey: ['instagram-media'],
    queryFn: () => getInstagramMedia(50),
    enabled: status?.connected === true && status?.valid === true,
    retry: false,
  })

  const handleUseAsReference = useCallback(async (media: InstagramMedia) => {
    try {
      const imageUrl = media.media_url || media.thumbnail_url
      if (!imageUrl) {
        toast.error('Image URL not available')
        return
      }

      // 이미지 URL을 localStorage에 저장하여 새 캔버스에서 사용할 수 있도록 함
      const referenceData = {
        imageUrl,
        caption: media.caption || '',
        permalink: media.permalink,
        timestamp: Date.now(),
      }
      localStorage.setItem('instagram_reference', JSON.stringify(referenceData))

      // 새 캔버스 생성 (이미지를 레퍼런스로 포함)
      const canvasId = nanoid()
      const sessionId = nanoid()
      
      // 이미지를 레퍼런스로 포함한 메시지 생성
      const messages = [
        {
          role: 'user' as const,
          content: [
            {
              type: 'text' as const,
              text: `이 Instagram 포스트를 레퍼런스로 사용해서 비슷한 스타일의 광고를 만들어줘. 이미지 URL: ${imageUrl}${media.caption ? `\n\n캡션: ${media.caption}` : ''}`,
            },
          ],
        },
      ]

      createCanvasMutation({
        name: t('canvas:exploreNewCanvas', 'New Ad from Reference'),
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

  const handleCopyImageUrl = useCallback(async (media: InstagramMedia) => {
    const imageUrl = media.media_url || media.thumbnail_url
    if (!imageUrl) {
      toast.error('Image URL not available')
      return
    }

    try {
      await navigator.clipboard.writeText(imageUrl)
      toast.success(t('canvas:imageUrlCopied', 'Image URL copied to clipboard'))
    } catch (error) {
      toast.error('Failed to copy URL')
    }
  }, [t])

  const handleDownloadImage = useCallback(async (media: InstagramMedia) => {
    const imageUrl = media.media_url || media.thumbnail_url
    if (!imageUrl) {
      toast.error('Image URL not available')
      return
    }

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `instagram-${media.id}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success(t('canvas:imageDownloaded', 'Image downloaded'))
    } catch (error) {
      toast.error('Failed to download image')
    }
  }, [t])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'VIDEO':
        return <Video className="w-4 h-4" />
      case 'CAROUSEL_ALBUM':
        return <Grid3x3 className="w-4 h-4" />
      default:
        return <ImageIcon className="w-4 h-4" />
    }
  }

  return (
    <div className="flex flex-col w-screen h-screen">
      <TopMenu />
      <ScrollArea className="flex-1">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <FileImage className="w-8 h-8 text-primary" />
                {t('canvas:myPosts', '내 게시물')}
              </h1>
              <p className="text-muted-foreground">
                {t('canvas:myPostsDescription', '내 Instagram 게시물을 확인하고 레퍼런스로 활용하세요')}
              </p>
            </div>
            {status?.connected && status?.valid && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Instagram className="w-4 h-4" />
                <span>@{status.username}</span>
              </div>
            )}
          </div>

          {/* Connect Instagram Section */}
          {(!status?.connected || !status?.valid) && (
            <div className="bg-muted/50 rounded-lg p-8 text-center mb-8">
              <Instagram className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">
                {t('canvas:myPostsConnectTitle', 'Instagram 연결하기')}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t('canvas:myPostsConnectDescription', 'Instagram 계정을 연결하여 내 게시물을 확인하세요')}
              </p>
              <Button onClick={() => setShowConnectDialog(true)}>
                <Instagram className="w-4 h-4 mr-2" />
                {t('canvas:instagram.connect', 'Connect Instagram')}
              </Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Media Grid */}
          {!isLoading && mediaData?.data?.data && mediaData.data.data.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <AnimatePresence>
                {mediaData.data.data.map((media, index) => {
                  const imageUrl = media.media_url || media.thumbnail_url
                  return (
                    <motion.div
                      key={media.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                      <PhotoProvider>
                        <PhotoView src={imageUrl || ''}>
                          <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center overflow-hidden relative cursor-pointer">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={media.caption || 'Instagram post'}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center text-gray-400">
                                {getMediaIcon(media.media_type)}
                                <span className="text-xs mt-1">
                                  {media.media_type}
                                </span>
                              </div>
                            )}
                            
                            {/* Media Type Badge */}
                            <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-sm rounded-md p-1.5 text-white">
                              {getMediaIcon(media.media_type)}
                            </div>

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="flex flex-col gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUseAsReference(media)
                                  }}
                                  className="bg-white/90 hover:bg-white"
                                  disabled={isCreatingCanvas}
                                >
                                  <Sparkles className="w-4 h-4 mr-1" />
                                  {t('canvas:useAsReference', 'Use as Reference')}
                                </Button>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopyImageUrl(media)
                                    }}
                                    className="bg-white/90 hover:bg-white"
                                    title={t('canvas:copyImageUrl', 'Copy image URL')}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDownloadImage(media)
                                    }}
                                    className="bg-white/90 hover:bg-white"
                                    title={t('canvas:downloadImage', 'Download image')}
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(media.permalink, '_blank')
                                    }}
                                    className="bg-white/90 hover:bg-white"
                                    title={t('canvas:openInInstagram', 'Open in Instagram')}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </PhotoView>
                      </PhotoProvider>

                      {/* Caption Preview */}
                      {media.caption && (
                        <div className="p-3">
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {media.caption}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {media.like_count !== undefined && (
                              <span>❤️ {media.like_count}</span>
                            )}
                            {media.comments_count !== undefined && (
                              <span>💬 {media.comments_count}</span>
                            )}
                            <span>{formatDate(media.timestamp)}</span>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && (!mediaData?.data?.data || mediaData.data.data.length === 0) && status?.connected && status?.valid && (
            <div className="text-center py-20">
              <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">
                {t('canvas:noMediaFound', 'No media found')}
              </h3>
              <p className="text-muted-foreground">
                {t('canvas:noMediaDescription', 'You don\'t have any Instagram posts yet')}
              </p>
            </div>
          )}
        </div>
      </ScrollArea>

      <InstagramConnectDialog
        open={showConnectDialog}
        onOpenChange={(open) => {
          setShowConnectDialog(open)
          if (!open) {
            refetchStatus()
            refetch()
          }
        }}
      />
    </div>
  )
}
