import { useConfigs } from '@/contexts/configs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ImageIcon, Compass, BarChart3, Shield, TrendingUp, Package, FileImage } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { SettingsIcon } from 'lucide-react'
import ThemeButton from '@/components/theme/ThemeButton'
import { LOGO_URL } from '@/constants'
import LanguageSwitcher from './common/LanguageSwitcher'
import { cn } from '@/lib/utils'
import { UserMenu } from './auth/UserMenu'
import { useAuth } from '@/contexts/AuthContext'

export default function TopMenu({
  middle,
  right,
}: {
  middle?: React.ReactNode
  right?: React.ReactNode
}) {
  const { t } = useTranslation()
  const { authStatus } = useAuth()

  const navigate = useNavigate()
  const { setShowSettingsDialog } = useConfigs()
  
  // Check if user is admin
  const isAdmin = authStatus.is_logged_in && authStatus.user_info?.role === 'admin'

  return (
    <motion.div
      className="sticky top-0 z-0 flex w-full h-8 bg-background px-4 justify-between items-center select-none border-b border-border"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-8">
        <motion.div
          className="flex items-center cursor-pointer group"
          onClick={() => navigate({ to: '/' })}
        >
          {window.location.pathname !== '/' && (
            <ChevronLeft className="size-5 mr-2 group-hover:-translate-x-0.5 transition-transform duration-300" />
          )}
          <img src={LOGO_URL} alt="logo" className="h-6 w-auto" draggable={false} />
        </motion.div>
        <Button
          variant={window.location.pathname === '/products' ? 'default' : 'ghost'}
          size="sm"
          className={cn('flex items-center font-bold rounded-none')}
          onClick={() => navigate({ to: '/products' })}
        >
          <Package className="size-4" />
          {t('canvas:products', '내 상품 관리')}
        </Button>
        <Button
          variant={window.location.pathname === '/brand-analysis' ? 'default' : 'ghost'}
          size="sm"
          className={cn('flex items-center font-bold rounded-none')}
          onClick={() => navigate({ to: '/brand-analysis' })}
        >
          <BarChart3 className="size-4" />
          {t('canvas:brandAnalysis', '내 브랜드 분석')}
        </Button>
        <Button
          variant={window.location.pathname === '/assets' ? 'default' : 'ghost'}
          size="sm"
          className={cn('flex items-center font-bold rounded-none')}
          onClick={() => navigate({ to: '/assets' })}
        >
          <ImageIcon className="size-4" />
          {t('canvas:assets', 'Library')}
        </Button>
        <Button
          variant={window.location.pathname === '/my-posts' ? 'default' : 'ghost'}
          size="sm"
          className={cn('flex items-center font-bold rounded-none')}
          onClick={() => navigate({ to: '/my-posts' })}
        >
          <FileImage className="size-4" />
          {t('canvas:myPosts', '내 게시물')}
        </Button>
        <Button
          variant={window.location.pathname === '/explore' ? 'default' : 'ghost'}
          size="sm"
          className={cn('flex items-center font-bold rounded-none')}
          onClick={() => navigate({ to: '/explore' })}
        >
          <Compass className="size-4" />
          {t('canvas:explore', '탐색')}
        </Button>
        <Button
          variant={window.location.pathname === '/ad-performance' ? 'default' : 'ghost'}
          size="sm"
          className={cn('flex items-center font-bold rounded-none')}
          onClick={() => navigate({ to: '/ad-performance' })}
        >
          <TrendingUp className="size-4" />
          {t('canvas:adPerformance', '광고 성과 분석')}
        </Button>
      </div>

      <div className="flex items-center gap-2">{middle}</div>

      <div className="flex items-center gap-2">
        {right}
        {/* <AgentSettings /> */}
        {isAdmin && (
          <Button
            size={'sm'}
            variant={window.location.pathname === '/admin' ? 'default' : 'ghost'}
            onClick={() => navigate({ to: '/admin' })}
          >
            <Shield size={30} />
          </Button>
        )}
        <Button
          size={'sm'}
          variant="ghost"
          onClick={() => setShowSettingsDialog(true)}
        >
          <SettingsIcon size={30} />
        </Button>
        <LanguageSwitcher />
        <ThemeButton />
        <UserMenu />
      </div>
    </motion.div>
  )
}
