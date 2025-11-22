import { listModels, ModelInfo, ToolInfo } from '@/api/model'
import useConfigsStore from '@/stores/configs'
import { useQuery } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useRef } from 'react'

export const ConfigsContext = createContext<{
  configsStore: typeof useConfigsStore
  refreshModels: () => void
} | null>(null)

export const ConfigsProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const configsStore = useConfigsStore()
  const {
    setTextModels,
    setTextModel,
    setSelectedTools,
    setAllTools,
    setShowLoginDialog,
  } = configsStore

  // 마지막 allTools 값을 저장하여 새로 추가된 도구를 감지하고 기본 선택을 제어
  const previousAllToolsRef = useRef<ModelInfo[]>([])

  const { data: modelList, refetch: refreshModels } = useQuery({
    queryKey: ['list_models_2'],
    queryFn: () => listModels(),
    staleTime: 1000, // 5分钟内数据被认为是新鲜的
    placeholderData: (previousData) => previousData, // 关键：显示旧数据同时获取新数据
    refetchOnWindowFocus: true, // 窗口获得焦点时重新获取
    refetchOnReconnect: true, // 网络重连时重新获取
    refetchOnMount: true, // 挂载时重新获取
  })

  useEffect(() => {
    if (!modelList) return
    const { llm: llmModels = [], tools: toolList = [] } = modelList

    setTextModels(llmModels || [])
    setAllTools(toolList || [])

    // 기본 텍스트 모델 설정 (GPT 계열 우선)
    const preferredTextModel = llmModels.find((m) =>
      m.model?.toLowerCase().includes('gpt')
    )
    const fallbackTextModel =
      llmModels.find((m) => m.type === 'text') || llmModels[0]

    if (preferredTextModel || fallbackTextModel) {
      const resolvedTextModel = preferredTextModel || fallbackTextModel
      if (resolvedTextModel) {
        setTextModel(resolvedTextModel)
        localStorage.setItem(
          'text_model',
          resolvedTextModel.provider + ':' + resolvedTextModel.model
        )
      }
    } else {
      setTextModel(undefined)
      localStorage.removeItem('text_model')
    }

    // 기본 도구 설정 (우선순위: Nanobanana Pro > Nanobanana > DALL-E 3 > 첫 번째 이미지 도구)
    const imageTools = toolList.filter(
      (tool) => tool.type === 'image' || tool.type === undefined
    )

    // 우선순위에 따라 이미지 도구 선택 (Pro 버전 우선)
    let preferredImageTool = imageTools.find((tool) => {
      const displayName = tool.display_name?.toLowerCase() || ''
      const toolId = tool.id.toLowerCase()
      return (displayName.includes('nanobanana pro') || toolId.includes('nanobanana_pro'))
    })

    if (!preferredImageTool) {
      preferredImageTool = imageTools.find((tool) => {
        const displayName = tool.display_name?.toLowerCase() || ''
        const toolId = tool.id.toLowerCase()
        return (displayName.includes('nanobanana') && !displayName.includes('pro')) || 
               (toolId.includes('nanobanana') && !toolId.includes('pro'))
      })
    }

    if (!preferredImageTool) {
      preferredImageTool = imageTools.find((tool) => {
        const displayName = tool.display_name?.toLowerCase() || ''
        const toolId = tool.id.toLowerCase()
        return displayName.includes('dall-e') || toolId.includes('dalle')
      })
    }

    if (!preferredImageTool && imageTools.length > 0) {
      preferredImageTool = imageTools[0]
    }

    const nonImageTools = toolList.filter(
      (tool) => tool.type && tool.type !== 'image'
    )

    let resolvedTools: ToolInfo[] = []
    if (preferredImageTool) {
      resolvedTools.push(preferredImageTool)
    }
    if (nonImageTools.length > 0) {
      resolvedTools = [...resolvedTools, ...nonImageTools]
    }

    if (resolvedTools.length === 0) {
      resolvedTools = toolList
    }

    setSelectedTools(resolvedTools)

    if (toolList.length > 0) {
      const disabledIds = toolList
        .filter((tool) => !resolvedTools.some((selected) => selected.id === tool.id))
        .map((tool) => tool.id)
      localStorage.setItem('disabled_tool_ids', JSON.stringify(disabledIds))
    } else {
      localStorage.removeItem('disabled_tool_ids')
    }

    // 텍스트 모델과 도구 목록이 비어 있으면 로그인 안내 표시
    if (llmModels.length === 0 || toolList.length === 0) {
      setShowLoginDialog(true)
    }
  }, [
    modelList,
    setSelectedTools,
    setTextModel,
    setTextModels,
    setAllTools,
    setShowLoginDialog,
  ])

  return (
    <ConfigsContext.Provider
      value={{ configsStore: useConfigsStore, refreshModels }}
    >
      {children}
    </ConfigsContext.Provider>
  )
}

export const useConfigs = () => {
  const context = useContext(ConfigsContext)
  if (!context) {
    throw new Error('useConfigs must be used within a ConfigsProvider')
  }
  return context.configsStore()
}

export const useRefreshModels = () => {
  const context = useContext(ConfigsContext)
  if (!context) {
    throw new Error('useRefreshModels must be used within a ConfigsProvider')
  }
  return context.refreshModels
}
