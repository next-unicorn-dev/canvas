import { Input } from '@/components/ui/input'
import CanvasExport from './CanvasExport'
import TopMenu from '../TopMenu'
import { useTranslation } from 'react-i18next'

type CanvasHeaderProps = {
  canvasName: string
  canvasId: string
  onNameChange: (name: string) => void
  onNameSave: () => void
}

const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  canvasName,
  canvasId,
  onNameChange,
  onNameSave,
}) => {
  const { t } = useTranslation()

  return (
    <TopMenu
      middle={
        <Input
          className="text-sm text-muted-foreground text-center bg-transparent border-none shadow-none w-fit h-7 hover:bg-primary-foreground transition-all"
          value={canvasName}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={onNameSave}
          placeholder={t('canvas:untitled', 'Untitled')}
        />
      }
      right={<CanvasExport />}
    />
  )
}

export default CanvasHeader
