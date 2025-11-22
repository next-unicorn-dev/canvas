import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, X, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { motion } from 'motion/react'
import { nanoid } from 'nanoid'

interface TextPair {
  id: string
  originalText: string
  purpose: string
}

export const Route = createFileRoute('/admin/template/add')({
  component: AddTemplate,
})

function AddTemplate() {
  const navigate = useNavigate()
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [platform, setPlatform] = useState('')
  const [purpose, setPurpose] = useState('')
  const [textPairs, setTextPairs] = useState<TextPair[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddTextPair = () => {
    setTextPairs([
      ...textPairs,
      {
        id: nanoid(),
        originalText: '',
        purpose: '',
      },
    ])
  }

  const handleRemoveTextPair = (id: string) => {
    setTextPairs(textPairs.filter((pair) => pair.id !== id))
  }

  const handleTextPairChange = (id: string, field: 'originalText' | 'purpose', value: string) => {
    setTextPairs(
      textPairs.map((pair) => (pair.id === id ? { ...pair, [field]: value } : pair))
    )
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setUploadedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = () => {
    // TODO: 템플릿 등록 API 호출
    console.log('템플릿 등록:', {
      image: uploadedImage,
      platform,
      purpose,
      textPairs: textPairs.filter((pair) => pair.originalText.trim() && pair.purpose.trim()),
    })
    toast.success('템플릿이 등록되었습니다')
    navigate({ to: '/admin' })
  }

  const handleCancel = () => {
    navigate({ to: '/admin' })
  }

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">템플릿 추가</h1>
        </div>
        <p className="text-muted-foreground ml-11">
          광고 사진을 업로드하고 템플릿 정보를 입력하세요.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>템플릿 정보</CardTitle>
            <CardDescription>
              광고 사진과 템플릿 정보를 입력해주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* 좌측: 이미지 업로드 영역 */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">광고 사진</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  {uploadedImage ? (
                    <div className="relative">
                      <img
                        src={uploadedImage}
                        alt="Uploaded"
                        className="w-full h-auto rounded-lg object-contain max-h-[400px]"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground mb-4">
                        이미지를 업로드하세요
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        파일 선택
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 우측: 템플릿 정보 입력 영역 */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">템플릿 정보</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform">플랫폼</Label>
                    <Input
                      id="platform"
                      placeholder="예: Instagram, Facebook, Twitter 등"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose">목적</Label>
                    <Input
                      id="purpose"
                      placeholder="예: 제품 홍보, 이벤트 안내, 브랜드 소개 등"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 텍스트 쌍 입력 영역 */}
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-base font-semibold">텍스트 쌍</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    광고 이미지의 텍스트와 해당 텍스트의 목적을 쌍으로 등록하세요.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTextPair}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  텍스트 쌍 추가
                </Button>
              </div>

              {textPairs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <p className="text-sm">텍스트 쌍이 없습니다.</p>
                  <p className="text-xs mt-1">위의 "텍스트 쌍 추가" 버튼을 클릭하여 추가하세요.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {textPairs.map((pair, index) => (
                    <Card key={pair.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`original-${pair.id}`} className="text-sm">
                              원본 텍스트
                            </Label>
                            <Input
                              id={`original-${pair.id}`}
                              placeholder="광고 이미지의 원본 텍스트를 입력하세요"
                              value={pair.originalText}
                              onChange={(e) =>
                                handleTextPairChange(pair.id, 'originalText', e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`purpose-${pair.id}`} className="text-sm">
                              목적
                            </Label>
                            <Input
                              id={`purpose-${pair.id}`}
                              placeholder="예: 제품명, 가격, 할인율, 행동 유도 문구 등"
                              value={pair.purpose}
                              onChange={(e) =>
                                handleTextPairChange(pair.id, 'purpose', e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTextPair(pair.id)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive mt-7"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
              <Button variant="outline" onClick={handleCancel}>
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!uploadedImage || !platform || !purpose}
              >
                등록
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
