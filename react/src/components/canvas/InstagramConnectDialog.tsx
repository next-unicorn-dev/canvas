import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import CommonDialogContent from '@/components/common/DialogContent'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Instagram, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  getInstagramAuthUrl,
  getInstagramStatus,
  connectInstagram,
  disconnectInstagram,
  type InstagramStatusResponse,
} from '@/api/instagram'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

interface InstagramConnectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function InstagramConnectDialog({
  open,
  onOpenChange,
}: InstagramConnectDialogProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<InstagramStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const processedRef = useRef(false)
  const { authStatus, isLoading: isAuthLoading } = useAuth()

  // OAuth 콜백 처리
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // 인증 로딩 중이거나 로그아웃 상태면 처리 보류
      if (isAuthLoading) {
        console.log('Instagram Auth: Waiting for auth loading...')
        return
      }

      if (!authStatus.is_logged_in) {
        console.log('Instagram Auth: User not logged in, skipping connect')
        return
      }

      const urlParams = new URLSearchParams(window.location.search)
      const authResult = urlParams.get('instagram_auth')
      
      console.log('Instagram Auth Check:', authResult, window.location.search)

      if (authResult === 'success') {
        if (processedRef.current) {
            console.log('Already processed auth callback')
            return
        }
        
        const token = urlParams.get('token')
        const userId = urlParams.get('user_id')
        const username = urlParams.get('username')
        
        if (token && userId && username) {
          processedRef.current = true
          setConnecting(true)
          try {
            console.log('Connecting to Instagram...', { username })
            await connectInstagram({
              access_token: token,
              instagram_user_id: userId,
              instagram_username: username,
              expires_in: 5184000, // 60 days
            })
            toast.success('Instagram account connected successfully!')
            await loadStatus()
            
            // 성공 처리가 완료된 후 URL 정리 및 원래 페이지로 복귀
            const returnUrl = localStorage.getItem('instagram_return_url')
            if (returnUrl) {
              localStorage.removeItem('instagram_return_url')
              // 현재 경로(쿼리 파라미터 제외)가 returnUrl과 다르면 이동
              // 단, returnUrl에 이미 instagram_auth 파라미터가 없어야 함
              const returnUrlObj = new URL(returnUrl)
              if (returnUrlObj.pathname !== window.location.pathname) {
                 window.location.href = returnUrlObj.href
                 return 
              }
            }
            
            window.history.replaceState({}, '', window.location.pathname)
          } catch (error) {
            console.error('Failed to connect:', error)
            toast.error(`Failed to connect: ${error}`)
            processedRef.current = false // 실패 시 재시도 가능하도록 리셋
          } finally {
            setConnecting(false)
          }
        }
      } else if (authResult === 'error') {
        const error = urlParams.get('error')
        toast.error(`Instagram connection failed: ${error || 'Unknown error'}`)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    if (open) {
      handleOAuthCallback()
      if (!isAuthLoading && authStatus.is_logged_in) {
        loadStatus()
      }
    }
  }, [open, isAuthLoading, authStatus])

  const loadStatus = async () => {
    try {
      setLoading(true)
      const statusData = await getInstagramStatus()
      setStatus(statusData)
    } catch (error) {
      console.error('Failed to load Instagram status:', error)
      setStatus({
        status: 'error',
        connected: false,
        valid: false,
        username: null,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setConnecting(true)
      // 현재 URL 저장 (인증 후 복귀를 위해)
      localStorage.setItem('instagram_return_url', window.location.href)
      
      const { auth_url } = await getInstagramAuthUrl()
      // 새 창에서 Instagram 인증 페이지 열기
      window.location.href = auth_url
    } catch (error) {
      toast.error(`Failed to start connection: ${error}`)
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      setConnecting(true)
      await disconnectInstagram()
      toast.success('Instagram account disconnected')
      await loadStatus()
    } catch (error) {
      toast.error(`Failed to disconnect: ${error}`)
    } finally {
      setConnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CommonDialogContent
        open={open}
        className="flex flex-col p-6 gap-4 w-full max-w-md rounded-lg border bg-background shadow-lg"
      >
        <DialogTitle className="sr-only">{t('canvas:instagram.connectTitle', 'Connect Instagram')}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('canvas:instagram.connectDescription', 'Connect your Instagram account to upload images directly from the canvas.')}
        </DialogDescription>
        <div className="flex items-center gap-3">
          <Instagram className="w-6 h-6" />
          <h2 className="text-xl font-semibold">
            {t('canvas:instagram.connectTitle', 'Connect Instagram')}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {status?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900 dark:text-green-100">
                      {t('canvas:instagram.connected', 'Connected')}
                    </p>
                    {status.username && (
                      <p className="text-sm text-green-700 dark:text-green-300">
                        @{status.username}
                      </p>
                    )}
                    {!status.valid && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                        {t('canvas:instagram.tokenExpired', 'Token expired. Please reconnect.')}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={connecting}
                  className="w-full"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('canvas:instagram.disconnecting', 'Disconnecting...')}
                    </>
                  ) : (
                    t('canvas:instagram.disconnect', 'Disconnect')
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border">
                  <XCircle className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium">
                      {t('canvas:instagram.notConnected', 'Not Connected')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(
                        'canvas:instagram.connectDescription',
                        'Connect your Instagram account to upload images directly from the canvas.'
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {connecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('canvas:instagram.connecting', 'Connecting...')}
                    </>
                  ) : (
                    <>
                      <Instagram className="w-4 h-4 mr-2" />
                      {t('canvas:instagram.connect', 'Connect Instagram')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {t(
            'canvas:instagram.privacyNote',
            'Your Instagram credentials are securely stored and only used to upload images you choose to share.'
          )}
        </div>
      </CommonDialogContent>
    </Dialog>
  )
}







