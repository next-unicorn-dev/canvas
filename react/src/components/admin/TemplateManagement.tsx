import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Loader2, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { useNavigate } from '@tanstack/react-router'

export default function TemplateManagement() {
  // TODO: 템플릿 목록 API 연동
  const isLoading = false
  const templates: any[] = []
  const navigate = useNavigate()

  const handleAddTemplate = () => {
    navigate({ to: '/admin/template/add' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8" />
          <h1 className="text-3xl font-bold">템플릿 관리</h1>
        </div>
        <p className="text-muted-foreground">
          공유된 템플릿 목록을 확인하고 관리할 수 있습니다.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>템플릿 목록</CardTitle>
                <CardDescription>
                  공유된 템플릿을 확인하고 관리할 수 있습니다.
                </CardDescription>
              </div>
              <Button
                onClick={handleAddTemplate}
                variant="default"
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                템플릿 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                등록된 템플릿이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {/* 템플릿 목록이 여기에 표시됩니다 */}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

