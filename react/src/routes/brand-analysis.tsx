import TopMenu from '@/components/TopMenu'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from '@/components/ui/resizable'
import { BarChart3, Save, Building2, Palette, Target, Users, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { getBrandInfo, saveBrandInfo, BrandInfoExtraction } from '@/api/brand'
import BrandChat from '@/components/brand/BrandChat'

export const Route = createFileRoute('/brand-analysis')({
  component: BrandAnalysis,
})

interface BrandInfo {
  name: string
  description: string
  industry: string
  targetAudience: string
  brandColors: string
  brandValues: string
  website: string
  socialMedia: string
}

function BrandAnalysis() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [brandInfo, setBrandInfo] = useState<BrandInfo>({
    name: '',
    description: '',
    industry: '',
    targetAudience: '',
    brandColors: '',
    brandValues: '',
    website: '',
    socialMedia: '',
  })

  useEffect(() => {
    loadBrandInfo()
  }, [])

  const loadBrandInfo = async () => {
    try {
      setLoading(true)
      const data = await getBrandInfo()
      if (data) {
        setBrandInfo(data)
      }
    } catch (error) {
      console.error('Failed to load brand info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await saveBrandInfo(brandInfo)
      toast.success(t('canvas:brandInfoSaved', '브랜드 정보가 저장되었습니다'))
    } catch (error: any) {
      console.error('Failed to save brand info:', error)
      toast.error(error.message || t('canvas:brandInfoSaveFailed', '브랜드 정보 저장에 실패했습니다'))
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof BrandInfo, value: string) => {
    setBrandInfo((prev) => ({ ...prev, [field]: value }))
  }

  const handleBrandInfoExtracted = (extractedInfo: BrandInfoExtraction) => {
    setBrandInfo((prev) => {
      const updated: BrandInfo = { ...prev }
      
      // Only update fields that have values in extracted info
      if (extractedInfo.name) updated.name = extractedInfo.name
      if (extractedInfo.description) updated.description = extractedInfo.description
      if (extractedInfo.industry) updated.industry = extractedInfo.industry
      if (extractedInfo.targetAudience) updated.targetAudience = extractedInfo.targetAudience
      if (extractedInfo.brandColors) updated.brandColors = extractedInfo.brandColors
      if (extractedInfo.brandValues) updated.brandValues = extractedInfo.brandValues
      if (extractedInfo.website) updated.website = extractedInfo.website
      if (extractedInfo.socialMedia) updated.socialMedia = extractedInfo.socialMedia
      
      return updated
    })
  }

  return (
    <div className="flex flex-col w-screen h-screen">
      <TopMenu />
      <ResizablePanelGroup direction="horizontal" className="w-screen h-screen">
        {/* Left Panel - Chat */}
        <ResizablePanel defaultSize={40} minSize={30} maxSize={60}>
          <BrandChat onBrandInfoExtracted={handleBrandInfoExtracted} />
        </ResizablePanel>

        <ResizableHandle />

        {/* Right Panel - Form */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <ScrollArea className="h-full">
            <div className="container mx-auto px-6 py-8 max-w-4xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <BarChart3 className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {t('canvas:brandAnalysis', '내 브랜드 분석')}
              </h1>
              <p className="text-muted-foreground">
                {t('canvas:brandAnalysisDescription', '브랜드 정보를 입력하고 저장하여 광고 제작에 활용하세요')}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Brand Name */}
              <div className="bg-card p-6 rounded-lg border space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">
                    {t('canvas:brandBasicInfo', '기본 정보')}
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand-name">
                      {t('canvas:brandName', '브랜드 이름')} *
                    </Label>
                    <Input
                      id="brand-name"
                      value={brandInfo.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder={t('canvas:brandNamePlaceholder', '브랜드 이름을 입력하세요')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand-description">
                      {t('canvas:brandDescription', '브랜드 설명')}
                    </Label>
                    <Textarea
                      id="brand-description"
                      value={brandInfo.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder={t('canvas:brandDescriptionPlaceholder', '브랜드에 대해 설명해주세요')}
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand-industry">
                      {t('canvas:brandIndustry', '업종/산업')}
                    </Label>
                    <Input
                      id="brand-industry"
                      value={brandInfo.industry}
                      onChange={(e) => handleChange('industry', e.target.value)}
                      placeholder={t('canvas:brandIndustryPlaceholder', '예: 패션, 테크, 음식 등')}
                    />
                  </div>
                </div>
              </div>

              {/* Target Audience */}
              <div className="bg-card p-6 rounded-lg border space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">
                    {t('canvas:targetAudience', '타겟 고객')}
                  </h2>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-audience">
                    {t('canvas:targetAudienceDescription', '타겟 고객 설명')}
                  </Label>
                  <Textarea
                    id="target-audience"
                    value={brandInfo.targetAudience}
                    onChange={(e) => handleChange('targetAudience', e.target.value)}
                    placeholder={t('canvas:targetAudiencePlaceholder', '주요 타겟 고객층을 설명해주세요 (예: 20-30대 여성, IT 전문가 등)')}
                    rows={3}
                  />
                </div>
              </div>

              {/* Brand Identity */}
              <div className="bg-card p-6 rounded-lg border space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">
                    {t('canvas:brandIdentity', '브랜드 정체성')}
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand-colors">
                      {t('canvas:brandColors', '브랜드 컬러')}
                    </Label>
                    <Input
                      id="brand-colors"
                      value={brandInfo.brandColors}
                      onChange={(e) => handleChange('brandColors', e.target.value)}
                      placeholder={t('canvas:brandColorsPlaceholder', '예: #FF5733, #33C3F0, #FFC300')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand-values">
                      {t('canvas:brandValues', '브랜드 가치')}
                    </Label>
                    <Textarea
                      id="brand-values"
                      value={brandInfo.brandValues}
                      onChange={(e) => handleChange('brandValues', e.target.value)}
                      placeholder={t('canvas:brandValuesPlaceholder', '브랜드의 핵심 가치를 입력하세요 (예: 혁신, 친환경, 고품질)')}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-card p-6 rounded-lg border space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">
                    {t('canvas:contactInfo', '연락처 정보')}
                  </h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">
                      {t('canvas:website', '웹사이트')}
                    </Label>
                    <Input
                      id="website"
                      type="url"
                      value={brandInfo.website}
                      onChange={(e) => handleChange('website', e.target.value)}
                      placeholder={t('canvas:websitePlaceholder', 'https://example.com')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="social-media">
                      {t('canvas:socialMedia', '소셜 미디어')}
                    </Label>
                    <Input
                      id="social-media"
                      value={brandInfo.socialMedia}
                      onChange={(e) => handleChange('socialMedia', e.target.value)}
                      placeholder={t('canvas:socialMediaPlaceholder', 'Instagram, Facebook 등')}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving || !brandInfo.name.trim()}>
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? t('canvas:saving', '저장 중...') : t('canvas:save', '저장')}
                </Button>
              </div>
            </div>
          )}
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
