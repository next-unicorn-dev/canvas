import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUp, Bot, User, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { brandChat } from '@/api/brand'
import { BrandInfo } from '@/api/brand'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface BrandChatProps {
  onBrandInfoExtracted: (info: Partial<BrandInfo>) => void
}

export default function BrandChat({ onBrandInfoExtracted }: BrandChatProps) {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [initialized, setInitialized] = useState(false)

  // Initialize with AI greeting
  useEffect(() => {
    if (!initialized) {
      setInitialized(true)
      setLoading(true)
      
      // Get initial greeting from AI
      brandChat([])
        .then((result) => {
          const welcomeMessage: Message = {
            role: 'assistant',
            content: result.response,
          }
          setMessages([welcomeMessage])
        })
        .catch((error) => {
          console.error('Failed to get initial greeting:', error)
          // Fallback to default message
          const welcomeMessage: Message = {
            role: 'assistant',
            content: t('canvas:brandChatWelcome', '안녕하세요! 브랜드에 대해 알려주시면 정보를 자동으로 정리해드립니다. 브랜드 이름, 설명, 업종, 타겟 고객, 브랜드 컬러, 가치 등을 자유롭게 말씀해주세요.'),
          }
          setMessages([welcomeMessage])
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [initialized, t])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto scroll to bottom when messages or loading state changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollContainer) {
          // Use setTimeout to ensure DOM is updated
          setTimeout(() => {
            scrollContainer.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: 'smooth',
            })
          }, 100)
        }
      }
      // Also try scrolling the messagesEndRef element into view
      if (messagesEndRef.current) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }, 100)
      }
    }

    scrollToBottom()
  }, [messages, loading])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      // Get AI response and extract brand information
      const result = await brandChat(updatedMessages)

      // Update form with extracted information if any
      const hasNewInfo = Object.values(result.extractedInfo).some(value => value && value.trim())
      if (hasNewInfo) {
        onBrandInfoExtracted(result.extractedInfo)
      }

      // Add AI response to messages
      const assistantMessage: Message = {
        role: 'assistant',
        content: result.response,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error: any) {
      console.error('Failed to get chat response:', error)
      const assistantMessage: Message = {
        role: 'assistant',
        content: t('canvas:brandChatError', '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.'),
      }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">{t('canvas:brandChatTitle', '브랜드 정보 채팅')}</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t('canvas:brandChatSubtitle', '브랜드에 대해 말씀해주시면 자동으로 정보를 정리해드립니다')}
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('canvas:brandChatPlaceholder', '브랜드에 대해 말씀해주세요...')}
            rows={2}
            className="resize-none"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            size="icon"
            className="self-end"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

