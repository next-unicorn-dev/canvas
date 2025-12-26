import { Button } from '@/components/ui/button'
import { TOOL_CALL_NAME_MAPPING } from '@/constants'
import { ToolCall } from '@/types/types'
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  Instagram,
} from 'lucide-react'
import MultiChoicePrompt from '../MultiChoicePrompt'
import SingleChoicePrompt from '../SingleChoicePrompt'
import WritePlanToolCall from './WritePlanToolcall'
import ToolCallContentV2 from './ToolCallContent'
import { useTranslation } from 'react-i18next'

type ToolCallTagProps = {
  toolCall: ToolCall
  isExpanded: boolean
  onToggleExpand: () => void
  requiresConfirmation?: boolean
  onConfirm?: () => void
  onCancel?: () => void
}

// Tool-specific color themes
const getToolTheme = (toolName: string) => {
  if (toolName === 'upload_to_instagram') {
    return {
      bg: 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50',
      border: 'border-purple-200 dark:border-purple-800',
      hoverBg: 'hover:bg-purple-100/50 dark:hover:bg-purple-900/30',
      iconBg: 'bg-gradient-to-r from-purple-400 to-pink-400 dark:from-purple-600 dark:to-pink-600',
      iconText: 'text-white',
      titleText: 'text-purple-900 dark:text-purple-100',
      badge: 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200',
      chevron: 'text-purple-600 dark:text-purple-400',
      contentBorder: 'border-purple-200 dark:border-purple-950',
      keyText: 'text-purple-900 dark:text-purple-100',
      isInstagram: true,
    }
  }
  // Default green theme
  return {
    bg: 'bg-green-50 dark:bg-green-950/50',
    border: 'border-green-200 dark:border-green-800',
    hoverBg: 'hover:bg-green-100/50 dark:hover:bg-green-900/30',
    iconBg: 'bg-green-200/70 dark:bg-green-800',
    iconText: 'text-green-700 dark:text-green-300',
    titleText: 'text-green-900 dark:text-green-100',
    badge: 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200',
    chevron: 'text-green-600 dark:text-green-400',
    contentBorder: 'border-green-200 dark:border-green-950',
    keyText: 'text-green-900 dark:text-green-100',
    isInstagram: false,
  }
}

const ToolCallTag: React.FC<ToolCallTagProps> = ({
  toolCall,
  isExpanded,
  onToggleExpand,
  requiresConfirmation = false,
  onConfirm,
  onCancel,
}) => {
  const { name, arguments: inputs } = toolCall.function
  const { t } = useTranslation()
  const theme = getToolTheme(name)

  if (name == 'prompt_user_multi_choice') {
    return <MultiChoicePrompt />
  }
  if (name == 'prompt_user_single_choice') {
    return <SingleChoicePrompt />
  }
  if (name == 'write_plan') {
    return <WritePlanToolCall args={inputs} />
  }
  if (name.startsWith('transfer_to')) {
    return null
  }

  const needsConfirmation = requiresConfirmation

  let parsedArgs = null
  try {
    parsedArgs = JSON.parse(inputs)
  } catch (error) {
    console.error('Error parsing args:', error, 'Raw input:', inputs)
    // 尝试清理输入字符串，移除可能的额外内容
    try {
      const cleanedInput = inputs.trim()
      const jsonEndIndex = cleanedInput.lastIndexOf('}')
      if (jsonEndIndex > 0) {
        const jsonPart = cleanedInput.substring(0, jsonEndIndex + 1)
        parsedArgs = JSON.parse(jsonPart)
        console.log('Successfully parsed cleaned JSON:', jsonPart)
      }
    } catch (cleanError) {
      console.error('Failed to parse even after cleaning:', cleanError)
    }
  }

  // 普通모드 스타일
  return (
    <div className={`${theme.bg} border ${theme.border} rounded-md shadow-sm overflow-hidden`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between p-3 cursor-pointer ${theme.hoverBg} transition-colors`}
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <div className={`${theme.iconBg} p-1 rounded`}>
            {theme.isInstagram ? (
              <Instagram className={`w-4 h-4 ${theme.iconText}`} />
            ) : (
              <svg
                className={`w-4 h-4 ${theme.iconText}`}
                fill="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M20.599 1.5c-.376 0-.743.111-1.055.32l-5.08 3.385a18.747 18.747 0 0 0-3.471 2.987 10.04 10.04 0 0 1 4.815 4.815 18.748 18.748 0 0 0 2.987-3.472l3.386-5.079A1.902 1.902 0 0 0 20.599 1.5Zm-8.3 14.025a18.76 18.76 0 0 0 1.896-1.207 8.026 8.026 0 0 0-4.513-4.513A18.75 18.75 0 0 0 8.475 11.7l-.278.5a5.26 5.26 0 0 1 3.601 3.602l.502-.278ZM6.75 13.5A3.75 3.75 0 0 0 3 17.25a1.5 1.5 0 0 1-1.601 1.497.75.75 0 0 0-.7 1.123 5.25 5.25 0 0 0 9.8-2.62 3.75 3.75 0 0 0-3.75-3.75Z"
                ></path>
              </svg>
            )}
          </div>

          <div className={`font-bold ${theme.titleText} leading-relaxed break-all`}>
            {TOOL_CALL_NAME_MAPPING[name] ?? name}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {needsConfirmation && (
            <div className="bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {t('chat.toolCall.requiresConfirmation', 'Needs Confirmation')}
            </div>
          )}
          {!needsConfirmation && toolCall.result === 'TOOL_CALL_CANCELLED' && (
            <div className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <X className="h-3 w-3" />
              {t('chat.toolCall.cancelled')}
            </div>
          )}
          {parsedArgs && Object.keys(parsedArgs).length > 0 && (
            <div className={`${theme.badge} text-xs px-2 py-0.5 rounded-full`}>
              {Object.keys(parsedArgs).length}
            </div>
          )}
          {isExpanded ? (
            <ChevronDown className={`h-4 w-4 ${theme.chevron}`} />
          ) : (
            <ChevronRight className={`h-4 w-4 ${theme.chevron}`} />
          )}
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className={`border-t ${theme.contentBorder}`}>
          <div className="p-3">
            {parsedArgs && Object.keys(parsedArgs).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(parsedArgs).map(([key, value]) => (
                  <div
                    key={key}
                    className={`bg-white dark:bg-gray-950 border ${theme.contentBorder} rounded-md p-3 hover:shadow-sm transition-shadow`}
                  >
                    <div className="flex flex-col gap-1">
                      <span className={`font-bold ${theme.keyText}`}>
                        {key}:
                      </span>
                      <div className="text-gray-600 dark:text-gray-400 leading-relaxed break-all">
                        {typeof value == 'object'
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`bg-white dark:bg-gray-950 border ${theme.contentBorder} rounded-md p-3 hover:shadow-sm transition-shadow`}>
                <div className="text-gray-600 dark:text-gray-400 leading-relaxed break-all">
                  {inputs}
                </div>
              </div>
            )}
            {toolCall.result && <ToolCallContentV2 content={toolCall.result} />}

            {/* 확인 버튼 - 확인이 필요할 때만 표시 */}
            {needsConfirmation && (
              <div className={`mt-4 pt-4 border-t ${theme.border}`}>
                <div className="flex gap-2">
                  <Button
                    onClick={onConfirm}
                    className={theme.isInstagram
                      ? "flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      : "flex-1 bg-green-600 hover:bg-green-700 text-white"
                    }
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {t('chat.toolCall.confirm', 'Confirm')}
                  </Button>
                  <Button
                    onClick={onCancel}
                    variant="outline"
                    className={theme.isInstagram
                      ? "flex-1 border-purple-300 text-purple-700 hover:bg-purple-100"
                      : "flex-1 border-green-300 text-green-700 hover:bg-green-100"
                    }
                  >
                    <X className="h-4 w-4 mr-2" />
                    {t('chat.toolCall.cancel', 'Cancel')}
                  </Button>
                </div>
              </div>
            )}

            {/* Cancelled Status Display */}
            {!needsConfirmation && toolCall.result === 'TOOL_CALL_CANCELLED' && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <X className="h-4 w-4" />
                  <span className="text-sm">{t('chat.toolCall.cancelled')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ToolCallTag
