import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Instagram, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  getInstagramAuthUrl,
  getInstagramStatus,
  disconnectInstagram,
  type InstagramStatusResponse,
} from '@/api/instagram'
import { toast } from 'sonner'

export default function SettingInstagram() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<InstagramStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)

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

  useEffect(() => {
    loadStatus()
  }, [])

  const handleConnect = async () => {
    try {
      setConnecting(true)
      // Save current URL to return after auth
      localStorage.setItem('instagram_return_url', window.location.href)
      
      const { auth_url } = await getInstagramAuthUrl()
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
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t('settings:instagram.title', 'Instagram Integration')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('settings:instagram.description', 'Connect your Instagram account to share your creations.')}
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5" />
            Instagram
          </CardTitle>
          <CardDescription>
            {t('settings:instagram.cardDescription', 'Manage your Instagram connection status.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : status?.connected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100">
                    {t('settings:instagram.connectedAs', 'Connected as')} @{status.username}
                  </p>
                  {!status.valid && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      {t('settings:instagram.tokenExpired', 'Session expired. Please reconnect.')}
                    </p>
                  )}
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleDisconnect} 
                disabled={connecting}
              >
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('settings:instagram.disconnecting', 'Disconnecting...')}
                  </>
                ) : (
                  t('settings:instagram.disconnect', 'Disconnect Account')
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border">
                <XCircle className="w-5 h-5 text-gray-400" />
                <p className="text-muted-foreground">
                  {t('settings:instagram.notConnected', 'Not connected to any account.')}
                </p>
              </div>
              <Button onClick={handleConnect} disabled={connecting} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                {connecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('settings:instagram.connecting', 'Connecting...')}
                  </>
                ) : (
                  <>
                    <Instagram className="w-4 h-4 mr-2" />
                    {t('settings:instagram.connect', 'Connect Instagram')}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

