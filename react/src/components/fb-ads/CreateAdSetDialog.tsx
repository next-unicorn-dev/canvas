import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Users } from 'lucide-react'
import { useCreateAdSet, useFbCampaigns, type AdSetCreateInput } from '@/hooks/use-fb-ads'
import { toast } from 'sonner'

interface CreateAdSetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  preselectedCampaignId?: string
  onSuccess?: () => void
}

const OPTIMIZATION_GOALS = [
  { value: 'LINK_CLICKS', label: '링크 클릭', description: '웹사이트/앱 클릭 최적화' },
  { value: 'LANDING_PAGE_VIEWS', label: '랜딩 페이지 조회', description: '랜딩 페이지 방문 최적화' },
  { value: 'REACH', label: '도달', description: '최대한 많은 사람에게 도달' },
  { value: 'IMPRESSIONS', label: '노출', description: '노출 횟수 최적화' },
  { value: 'LEAD_GENERATION', label: '리드', description: '리드 폼 제출 최적화' },
] as const

const COUNTRIES = [
  { value: 'KR', label: '대한민국' },
  { value: 'US', label: '미국' },
  { value: 'JP', label: '일본' },
  { value: 'CN', label: '중국' },
  { value: 'VN', label: '베트남' },
]

export function CreateAdSetDialog({
  open,
  onOpenChange,
  accountId,
  preselectedCampaignId,
  onSuccess,
}: CreateAdSetDialogProps) {
  const [name, setName] = useState('')
  const [campaignId, setCampaignId] = useState(preselectedCampaignId || '')
  const [optimizationGoal, setOptimizationGoal] = useState('LINK_CLICKS')
  const [dailyBudget, setDailyBudget] = useState('10000')
  const [targetCountry, setTargetCountry] = useState('KR')
  const [ageMin, setAgeMin] = useState('18')
  const [ageMax, setAgeMax] = useState('65')
  const [gender, setGender] = useState<number>(0) // 0=all, 1=male, 2=female
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED'>('PAUSED')

  const { data: campaigns, isLoading: isCampaignsLoading } = useFbCampaigns(
    accountId,
    'last_30d',
    50,
    open
  )

  const createMutation = useCreateAdSet(accountId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('광고 세트 이름을 입력해주세요')
      return
    }

    if (!campaignId) {
      toast.error('캠페인을 선택해주세요')
      return
    }

    const data: AdSetCreateInput = {
      name: name.trim(),
      campaign_id: campaignId,
      optimization_goal: optimizationGoal as AdSetCreateInput['optimization_goal'],
      billing_event: 'IMPRESSIONS',
      daily_budget: parseInt(dailyBudget), // KRW는 cents 개념이 없으므로 원 단위 그대로
      status,
      targeting_countries: [targetCountry],
      targeting_age_min: parseInt(ageMin),
      targeting_age_max: parseInt(ageMax),
      targeting_genders: gender === 0 ? [0] : [gender],
    }

    try {
      await createMutation.mutateAsync(data)
      toast.success('광고 세트가 생성되었습니다')
      onOpenChange(false)
      resetForm()
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '광고 세트 생성에 실패했습니다')
    }
  }

  const resetForm = () => {
    setName('')
    setCampaignId(preselectedCampaignId || '')
    setOptimizationGoal('LINK_CLICKS')
    setDailyBudget('10000')
    setTargetCountry('KR')
    setAgeMin('18')
    setAgeMax('65')
    setGender(0)
    setStatus('PAUSED')
  }

  const activeCampaigns = campaigns?.filter(c => c.status === 'ACTIVE' || c.status === 'PAUSED') || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            새 광고 세트 만들기
          </DialogTitle>
          <DialogDescription>
            타겟 오디언스, 예산, 일정을 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">광고 세트 이름 *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 20-30대 남성 타겟"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign">캠페인 *</Label>
            <select
              id="campaign"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              required
              disabled={isCampaignsLoading}
            >
              <option value="">캠페인 선택...</option>
              {activeCampaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.status === 'ACTIVE' ? '진행 중' : '일시정지'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>최적화 목표 *</Label>
            <select
              value={optimizationGoal}
              onChange={(e) => setOptimizationGoal(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-background text-sm"
            >
              {OPTIMIZATION_GOALS.map((goal) => (
                <option key={goal.value} value={goal.value}>
                  {goal.label} - {goal.description}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dailyBudget">일일 예산 (원) *</Label>
            <Input
              id="dailyBudget"
              type="number"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              min="1000"
              required
            />
          </div>

          <div className="border rounded-lg p-4 space-y-4">
            <h4 className="font-medium">타겟팅</h4>

            <div className="space-y-2">
              <Label>국가</Label>
              <select
                value={targetCountry}
                onChange={(e) => setTargetCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-background text-sm"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageMin">최소 연령</Label>
                <Input
                  id="ageMin"
                  type="number"
                  value={ageMin}
                  onChange={(e) => setAgeMin(e.target.value)}
                  min="18"
                  max="65"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ageMax">최대 연령</Label>
                <Input
                  id="ageMax"
                  type="number"
                  value={ageMax}
                  onChange={(e) => setAgeMax(e.target.value)}
                  min="18"
                  max="65"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>성별</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={gender === 0 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGender(0)}
                >
                  전체
                </Button>
                <Button
                  type="button"
                  variant={gender === 1 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGender(1)}
                >
                  남성
                </Button>
                <Button
                  type="button"
                  variant={gender === 2 ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGender(2)}
                >
                  여성
                </Button>
              </div>
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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              광고 세트 생성
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

