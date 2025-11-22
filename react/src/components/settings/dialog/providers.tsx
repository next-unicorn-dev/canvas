import AddProviderDialog from '@/components/settings/AddProviderDialog'
import ComfyuiSetting from '@/components/settings/ComfyuiSetting'
import CommonSetting from '@/components/settings/CommonSetting'
import { Button } from '@/components/ui/button'
import useConfigsStore from '@/stores/configs'
import { LLMConfig } from '@/types/types'
import { getConfig, updateConfig } from '@/api/config'
import { useRefreshModels } from '@/contexts/configs'
import { Plus, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const SettingProviders = () => {
  const { t } = useTranslation()
  const { providers, setProviders } = useConfigsStore()
  const refreshModels = useRefreshModels()
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isAddProviderDialogOpen, setIsAddProviderDialogOpen] = useState(false)

  const sanitizeProviders = (config: { [key: string]: LLMConfig }) => {
    const entries = Object.entries(config).filter(([key]) => key !== 'jaaz')
    return Object.fromEntries(entries)
  }

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config: { [key: string]: LLMConfig } = await getConfig()

        setProviders(sanitizeProviders(config))
      } catch (error) {
        console.error('Error loading configuration:', error)
        setErrorMessage(t('settings:messages.failedToLoad'))
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [])

  const handleConfigChange = (key: string, newConfig: LLMConfig) => {
    setProviders(
      sanitizeProviders({
        ...providers,
        [key]: newConfig,
      })
    )
  }

  const handleAddProvider = (providerKey: string, newConfig: LLMConfig) => {
    setProviders(
      sanitizeProviders({
        ...providers,
        [providerKey]: newConfig,
      })
    )
  }

  const handleDeleteProvider = (providerKey: string) => {
    delete providers[providerKey]
    setProviders(
      sanitizeProviders({
        ...providers,
      })
    )
  }

  const handleSave = async () => {
    try {
      setErrorMessage('')

      const result = await updateConfig(sanitizeProviders(providers))

      if (result.status === 'success') {
        toast.success(result.message)
        // Refresh models list after successful config update
        refreshModels()
      } else {
        throw new Error(result.message || 'Failed to save configuration')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setErrorMessage(t('settings:messages.failedToSave'))
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full sm:pb-0 pb-10 relative">
      {isLoading && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-500"></div>
        </div>
      )}

      {!isLoading &&
        Object.keys(providers)
          .filter((key) => key !== 'comfyui' && key !== 'ollama')
          .map((key, index, filteredKeys) => (
            <div key={key} className="w-full">
              <CommonSetting
                providerKey={key}
                config={providers[key]}
                onConfigChange={handleConfigChange}
                onDeleteProvider={handleDeleteProvider}
              />

              {index !== filteredKeys.length - 1 && (
                <div className="my-6 border-t bg-border" />
              )}
            </div>
          ))}

      <div className="flex fixed bottom-0 left-[calc(var(--sidebar-width))] gap-1 right-0 px-1">
        <Button onClick={handleSave} className="w-1/2" size="lg">
          <Save className="mr-2 h-6 w-6" /> {t('settings:saveSettings')}
        </Button>

        <Button
          variant="outline"
          onClick={() => setIsAddProviderDialogOpen(true)}
          className="w-1/2"
          size="lg"
        >
          <Plus className="h-6 w-6" />
          {t('settings:provider.addProvider')}
        </Button>
      </div>

      {errorMessage && (
        <div className="text-red-500 text-center mb-4">{errorMessage}</div>
      )}

      <AddProviderDialog
        open={isAddProviderDialogOpen}
        onOpenChange={setIsAddProviderDialogOpen}
        onSave={handleAddProvider}
      />
    </div>
  )
}

export default SettingProviders
