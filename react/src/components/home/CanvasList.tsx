import { listCanvases, createCanvas } from '@/api/canvas'
import CanvasCard from '@/components/home/CanvasCard'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useConfigs } from '@/contexts/configs'
import { DEFAULT_SYSTEM_PROMPT } from '@/constants'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

const CanvasList: React.FC = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const isHomePage = location.pathname === '/'
  const { textModel, selectedTools } = useConfigs()
  const navigate = useNavigate()
  const { authStatus, isLoading: isAuthLoading } = useAuth()

  const { data: canvases, refetch, isLoading: isCanvasLoading } = useQuery({
    queryKey: ['canvases'],
    queryFn: listCanvases,
    enabled: isHomePage && authStatus.is_logged_in, // Only fetch when logged in
    refetchOnMount: 'always',
  })

  const { mutate: createEmptyCanvas, isPending: isCreatingCanvas } = useMutation({
    mutationFn: createCanvas,
    onSuccess: (data, variables) => {
      // Don't set initCanvas to true for empty canvas - we want to show empty state
      refetch() // Refresh canvas list
      navigate({
        to: '/canvas/$id',
        params: { id: data.id },
        search: {
          sessionId: variables.session_id,
        },
      })
    },
    onError: (error: unknown) => {
      toast.error(t('common:messages.error', 'Error'), {
        description: error instanceof Error ? error.message : String(error),
      })
    },
  })

  const handleCanvasClick = (id: string) => {
    navigate({ to: '/canvas/$id', params: { id } })
  }

  const handleCreateNewCanvas = () => {
    if (!textModel) {
      toast.error(t('home:noTextModel', 'Please configure a text model in settings'))
      return
    }

    const canvasId = nanoid()
    const sessionId = nanoid()

    createEmptyCanvas({
      name: t('home:newCanvas', 'New Canvas'),
      canvas_id: canvasId,
      messages: [], // Empty messages for blank canvas
      session_id: sessionId,
      text_model: {
        provider: textModel.provider,
        model: textModel.model,
        url: textModel.url || '',
      },
      tool_list: selectedTools || [],
      system_prompt: localStorage.getItem('system_prompt') || DEFAULT_SYSTEM_PROMPT,
    })
  }

  // Show loading state first (before checking login status)
  if (isAuthLoading) {
    return (
      <div className="flex flex-col px-10 mt-10 gap-4 select-none max-w-[1200px] mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">{t('common:messages.loading')}</span>
        </div>
      </div>
    )
  }

  // Don't show anything if not logged in (after auth loading is done)
  if (!authStatus.is_logged_in) {
    return null
  }

  // Show loading state for canvas list
  if (isCanvasLoading) {
    return (
      <div className="flex flex-col px-10 mt-10 gap-4 select-none max-w-[1200px] mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">{t('common:messages.loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-10 mt-10 gap-4 select-none max-w-[1200px] mx-auto">
      {canvases && canvases.length > 0 && (
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-2xl font-bold">
            {t('home:allProjects')}
          </span>
          <Button
            onClick={handleCreateNewCanvas}
            disabled={isCreatingCanvas}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('home:addNewProject', '+ 새 프로젝트 추가')}
          </Button>
        </motion.div>
      )}

      <AnimatePresence>
        <div className="grid grid-cols-4 gap-4 w-full pb-10">
          {canvases?.map((canvas, index) => (
            <CanvasCard
              key={canvas.id}
              index={index}
              canvas={canvas}
              handleCanvasClick={handleCanvasClick}
              handleDeleteCanvas={() => refetch()}
            />
          ))}
        </div>
      </AnimatePresence>
    </div>
  )
}

export default memo(CanvasList)
