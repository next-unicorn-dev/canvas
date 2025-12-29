import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Megaphone, Upload, Image as ImageIcon, X } from 'lucide-react'
import {
  useCreateAd,
  useFbCampaigns,
  useFbAdSets,
  useFbPages,
  useUploadAdImage,
  type AdCreateInput,
  type AdCreativeInput,
} from '@/hooks/use-fb-ads'
import { toast } from 'sonner'

interface CreateAdDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  preselectedAdSetId?: string
  onSuccess?: () => void
}

const CALL_TO_ACTION_TYPES = [
  { value: 'LEARN_MORE', label: '자세히 알아보기' },
  { value: 'SHOP_NOW', label: '지금 구매' },
  { value: 'SIGN_UP', label: '가입하기' },
  { value: 'CONTACT_US', label: '문의하기' },
  { value: 'DOWNLOAD', label: '다운로드' },
  { value: 'BOOK_NOW', label: '예약하기' },
  { value: 'GET_OFFER', label: '혜택 받기' },
]

export function CreateAdDialog({
  open,
  onOpenChange,
  accountId,
  preselectedAdSetId,
  onSuccess,
}: CreateAdDialogProps) {
  // Form State
  const [name, setName] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [adsetId, setAdsetId] = useState(preselectedAdSetId || '')
  const [pageId, setPageId] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('')
  const [headline, setHeadline] = useState('')
  const [description, setDescription] = useState('')
  const [callToAction, setCallToAction] = useState('LEARN_MORE')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED'>('PAUSED')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Queries
  const { data: campaigns, isLoading: isCampaignsLoading } = useFbCampaigns(
    accountId,
    'last_30d',
    50,
    open
  )

  const { data: adsets, isLoading: isAdsetsLoading } = useFbAdSets(
    accountId,
    campaignId || undefined,
    'last_30d',
    50,
    open && !!campaignId
  )

  const { data: pages, isLoading: isPagesLoading } = useFbPages(open)

  // Mutations
  const createAdMutation = useCreateAd(accountId)
  const uploadImageMutation = useUploadAdImage(accountId)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('이미지 파일만 업로드 가능합니다')
        return
      }
      if (file.size > 30 * 1024 * 1024) {
        toast.error('파일 크기는 30MB 이하여야 합니다')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const clearImage = () => {
    setImageFile(null)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('광고 이름을 입력해주세요')
      return
    }
    if (!adsetId) {
      toast.error('광고 세트를 선택해주세요')
      return
    }
    if (!pageId) {
      toast.error('Facebook 페이지를 선택해주세요')
      return
    }
    if (!message.trim()) {
      toast.error('광고 메시지를 입력해주세요')
      return
    }
    if (!link.trim()) {
      toast.error('웹사이트 URL을 입력해주세요')
      return
    }

    try {
      let imageHash: string | undefined

      // Upload image if selected
      if (imageFile) {
        const uploadResult = await uploadImageMutation.mutateAsync(imageFile)
        imageHash = uploadResult.hash
      }

      // Build creative
      const creative: AdCreativeInput = {
        name: `${name} - Creative`,
        page_id: pageId,
        message: message.trim(),
        link: link.trim(),
        call_to_action_type: callToAction as AdCreativeInput['call_to_action_type'],
      }

      if (headline.trim()) {
        creative.link_headline = headline.trim()
      }
      if (description.trim()) {
        creative.link_description = description.trim()
      }
      if (imageHash) {
        creative.image_hash = imageHash
      }

      // Create ad with inline creative
      const adData: AdCreateInput = {
        name: name.trim(),
        adset_id: adsetId,
        creative,
        status,
      }

      await createAdMutation.mutateAsync(adData)
      toast.success('광고가 생성되었습니다')
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '광고 생성에 실패했습니다')
    }
  }

  const resetForm = () => {
    setName('')
    setCampaignId('')
    setAdsetId(preselectedAdSetId || '')
    setPageId('')
    setMessage('')
    setLink('')
    setHeadline('')
    setDescription('')
    setCallToAction('LEARN_MORE')
    clearImage()
    setStatus('PAUSED')
  }

  const isLoading = createAdMutation.isPending || uploadImageMutation.isPending
  const activeCampaigns = campaigns?.filter(c => c.status === 'ACTIVE' || c.status === 'PAUSED') || []
  const activeAdsets = adsets?.filter(a => a.status === 'ACTIVE' || a.status === 'PAUSED') || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-orange-500" />
            새 광고 만들기
          </DialogTitle>
          <DialogDescription>
            광고 소재(이미지, 텍스트)를 설정하고 광고를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="space-y-2">
            <Label htmlFor="name">광고 이름 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 겨울 프로모션 - 이미지 A"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>캠페인 *</Label>
              <select
                value={campaignId}
                onChange={(e) => {
                  setCampaignId(e.target.value)
                  setAdsetId('')
                }}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                disabled={isCampaignsLoading}
              >
                <option value="">캠페인 선택...</option>
                {activeCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>광고 세트 *</Label>
              <select
                value={adsetId}
                onChange={(e) => setAdsetId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                disabled={!campaignId || isAdsetsLoading}
              >
                <option value="">광고 세트 선택...</option>
                {activeAdsets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Facebook 페이지 *</Label>
            <select
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              disabled={isPagesLoading}
            >
              <option value="">페이지 선택...</option>
              {pages?.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              광고가 게재될 Facebook 페이지를 선택합니다
            </p>
          </div>

          {/* Creative */}
          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">광고 소재</h4>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>이미지</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-[200px] max-h-[200px] object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={clearImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-32 border-dashed"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    <span>이미지 업로드</span>
                    <span className="text-xs text-muted-foreground">권장: 1200x628px</span>
                  </div>
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">광고 문구 (Primary Text) *</Label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="광고의 메인 문구를 입력하세요"
                className="w-full px-3 py-2 rounded-md border bg-background text-sm min-h-[80px] resize-y"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">웹사이트 URL *</Label>
              <Input
                id="link"
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="headline">헤드라인</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="짧고 강렬한 헤드라인"
                />
              </div>

              <div className="space-y-2">
                <Label>콜투액션</Label>
                <select
                  value={callToAction}
                  onChange={(e) => setCallToAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border bg-background text-sm"
                >
                  {CALL_TO_ACTION_TYPES.map((cta) => (
                    <option key={cta.value} value={cta.value}>
                      {cta.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="추가 설명"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>초기 상태</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={status === 'PAUSED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('PAUSED')}
              >
                일시정지
              </Button>
              <Button
                type="button"
                variant={status === 'ACTIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatus('ACTIVE')}
              >
                즉시 시작
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              광고 생성
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

