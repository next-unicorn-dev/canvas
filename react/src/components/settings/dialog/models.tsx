import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConfigs } from '@/contexts/configs'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Type, Image as ImageIcon, Video } from 'lucide-react'

const SettingModels = () => {
  const { t } = useTranslation()
  const { allTools, selectedTools, setSelectedTools, textModels, textModel, setTextModel } = useConfigs()
  const [activeTab, setActiveTab] = useState<'text' | 'image' | 'video'>('text')

  // Filter tools by type
  const imageTools = allTools.filter(
    (tool) => tool.type === 'image' || tool.type === undefined
  )

  const videoTools = allTools.filter(
    (tool) => tool.type === 'video'
  )

  // Get currently selected tools
  const selectedImageTool = selectedTools.find(
    (tool) => tool.type === 'image' || tool.type === undefined
  )

  const selectedVideoTool = selectedTools.find(
    (tool) => tool.type === 'video'
  )

  const handleImageToolChange = (toolId: string) => {
    const newImageTool = imageTools.find((tool) => tool.id === toolId)
    if (!newImageTool) return

    // Keep non-image tools and replace image tool
    const nonImageTools = selectedTools.filter(
      (tool) => tool.type && tool.type !== 'image'
    )
    const newSelectedTools = [newImageTool, ...nonImageTools]

    setSelectedTools(newSelectedTools)

    // Update localStorage
    if (allTools.length > 0) {
      const disabledIds = allTools
        .filter((tool) => !newSelectedTools.some((selected) => selected.id === tool.id))
        .map((tool) => tool.id)
      localStorage.setItem('disabled_tool_ids', JSON.stringify(disabledIds))
    }
  }

  const handleVideoToolChange = (toolId: string) => {
    const newVideoTool = videoTools.find((tool) => tool.id === toolId)
    if (!newVideoTool) return

    // Keep non-video tools and replace video tool
    const nonVideoTools = selectedTools.filter(
      (tool) => tool.type !== 'video'
    )
    const newSelectedTools = [...nonVideoTools, newVideoTool]

    setSelectedTools(newSelectedTools)

    // Update localStorage
    if (allTools.length > 0) {
      const disabledIds = allTools
        .filter((tool) => !newSelectedTools.some((selected) => selected.id === tool.id))
        .map((tool) => tool.id)
      localStorage.setItem('disabled_tool_ids', JSON.stringify(disabledIds))
    }
  }

  const handleTextModelChange = (modelKey: string) => {
    const model = textModels?.find((m) => m.provider + ':' + m.model === modelKey)
    if (model) {
      setTextModel(model)
      localStorage.setItem('text_model', modelKey)
    }
  }

  const renderModelInfo = (model: { provider: string; type?: string; model?: string }) => (
    <div className="pt-4 border-t">
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {t('settings:models.provider')}:
          </span>
          <span className="font-medium">{model.provider}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">
            {t('settings:models.type')}:
          </span>
          <span className="font-medium">
            {model.type || 'text'}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full sm:pb-0 pb-10">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">
            {t('settings:models.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('settings:models.description')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-muted rounded-lg mb-4">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'text'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Type className="w-4 h-4" />
            {t('settings:models.types.text')}
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'image'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <ImageIcon className="w-4 h-4" />
            {t('settings:models.types.image')}
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'video'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Video className="w-4 h-4" />
            {t('settings:models.types.video')}
          </button>
        </div>

        {/* Text Model Tab */}
        {activeTab === 'text' && (
          <div className="space-y-4 bg-card p-6 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="default-text-model">
                {t('settings:models.defaultTextModel')}
              </Label>
              <Select
                value={textModel ? `${textModel.provider}:${textModel.model}` : ''}
                onValueChange={handleTextModelChange}
              >
                <SelectTrigger id="default-text-model">
                  <SelectValue placeholder={t('settings:models.selectTextModel')} />
                </SelectTrigger>
                <SelectContent>
                  {textModels?.map((model) => (
                    <SelectItem key={`${model.provider}:${model.model}`} value={`${model.provider}:${model.model}`}>
                      {model.model} ({model.provider})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('settings:models.textModelHelp')}
              </p>
            </div>

            {textModel && renderModelInfo(textModel)}
          </div>
        )}

        {/* Image Model Tab */}
        {activeTab === 'image' && (
          <div className="space-y-4 bg-card p-6 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="default-image-model">
                {t('settings:models.defaultImageModel')}
              </Label>
              <Select
                value={selectedImageTool?.id || ''}
                onValueChange={handleImageToolChange}
              >
                <SelectTrigger id="default-image-model">
                  <SelectValue placeholder={t('settings:models.selectImageModel')} />
                </SelectTrigger>
                <SelectContent>
                  {imageTools.map((tool) => (
                    <SelectItem key={tool.id} value={tool.id}>
                      {tool.display_name || tool.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('settings:models.imageModelHelp')}
              </p>
            </div>

            {selectedImageTool && renderModelInfo(selectedImageTool)}
          </div>
        )}

        {/* Video Model Tab */}
        {activeTab === 'video' && (
          <div className="space-y-4 bg-card p-6 rounded-lg border">
            <div className="space-y-2">
              <Label htmlFor="default-video-model">
                {t('settings:models.defaultVideoModel')}
              </Label>
              <Select
                value={selectedVideoTool?.id || ''}
                onValueChange={handleVideoToolChange}
              >
                <SelectTrigger id="default-video-model">
                  <SelectValue placeholder={t('settings:models.selectVideoModel')} />
                </SelectTrigger>
                <SelectContent>
                  {videoTools.map((tool) => (
                    <SelectItem key={tool.id} value={tool.id}>
                      {tool.display_name || tool.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {t('settings:models.videoModelHelp')}
              </p>
            </div>

            {selectedVideoTool && renderModelInfo(selectedVideoTool)}
          </div>
        )}

        {/* Empty States */}
        {activeTab === 'text' && (!textModels || textModels.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            {t('settings:models.noTextModels')}
          </div>
        )}
        {activeTab === 'image' && imageTools.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('settings:models.noImageModels')}
          </div>
        )}
        {activeTab === 'video' && videoTools.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {t('settings:models.noVideoModels')}
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingModels

