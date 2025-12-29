import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Target } from 'lucide-react'
import { useCreateCampaign, type CampaignCreateInput } from '@/hooks/use-fb-ads'
import { toast } from 'sonner'

interface CreateCampaignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  onSuccess?: () => void
}

const CAMPAIGN_OBJECTIVES = [
  { value: 'OUTCOME_AWARENESS', label: '인지도', description: '브랜드 인지도 향상' },
  { value: 'OUTCOME_TRAFFIC', label: '트래픽', description: '웹사이트/앱 방문 유도' },
  { value: 'OUTCOME_ENGAGEMENT', label: '참여', description: '게시물 참여 증가' },
  { value: 'OUTCOME_LEADS', label: '잠재고객', description: '리드 수집' },
  { value: 'OUTCOME_SALES', label: '판매', description: '제품/서비스 판매' },
] as const

export function CreateCampaignDialog({
  open,
  onOpenChange,
  accountId,
  onSuccess,
}: CreateCampaignDialogProps) {
  const [name, setName] = useState('')
  const [objective, setObjective] = useState<string>('OUTCOME_TRAFFIC')
  const [dailyBudget, setDailyBudget] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED'>('PAUSED')

  const createMutation = useCreateCampaign(accountId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('캠페인 이름을 입력해주세요')
      return
    }

    const data: CampaignCreateInput = {
      name: name.trim(),
      objective: objective as CampaignCreateInput['objective'],
      status,
      special_ad_categories: [],
    }

    if (dailyBudget) {
      // KRW는 cents 개념이 없으므로 원 단위 그대로 전송
      data.daily_budget = parseInt(dailyBudget)
    }

    try {
      await createMutation.mutateAsync(data)
      toast.success('캠페인이 생성되었습니다')
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '캠페인 생성에 실패했습니다')
    }
  }

  const resetForm = () => {
    setName('')
    setObjective('OUTCOME_TRAFFIC')
    setDailyBudget('')
    setStatus('PAUSED')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            새 캠페인 만들기
          </DialogTitle>
          <DialogDescription>
            Facebook 광고 캠페인을 생성합니다. 캠페인은 광고의 목표를 정의합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">캠페인 이름 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2024년 겨울 프로모션"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>캠페인 목표 *</Label>
            <div className="grid grid-cols-1 gap-2">
              {CAMPAIGN_OBJECTIVES.map((obj) => (
                <label
                  key={obj.value}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    objective === obj.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="objective"
                    value={obj.value}
                    checked={objective === obj.value}
                    onChange={(e) => setObjective(e.target.value)}
                    className="sr-only"
                  />
                  <div>
                    <div className="font-medium">{obj.label}</div>
                    <div className="text-xs text-muted-foreground">{obj.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyBudget">일일 예산 (원, 선택사항)</Label>
            <Input
              id="dailyBudget"
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              placeholder="예: 10000"
              min="1000"
            />
            <p className="text-xs text-muted-foreground">
              광고 세트에서도 예산을 설정할 수 있습니다
            </p>
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
            <p className="text-xs text-muted-foreground">
              {status === 'PAUSED'
                ? '광고 세트와 광고를 설정한 후 수동으로 시작할 수 있습니다'
                : '캠페인이 즉시 시작됩니다 (광고 세트와 광고가 필요합니다)'}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              캠페인 생성
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

