import TopMenu from '@/components/TopMenu'
import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Loader2 } from 'lucide-react'
import AdminSidebar, { AdminSidebarType } from '@/components/admin/AdminSidebar'
import UserManagement from '@/components/admin/UserManagement'
import TemplateManagement from '@/components/admin/TemplateManagement'

export const Route = createFileRoute('/admin/')({
  component: Admin,
})

function Admin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { authStatus } = useAuth()
  const [current, setCurrent] = useState<AdminSidebarType>('users')

  // 인증 및 어드민 권한 확인
  useEffect(() => {
    if (authStatus.status === 'logged_out') {
      toast.error('로그인이 필요합니다')
      navigate({ to: '/' })
      return
    }
    
    if (authStatus.status === 'logged_in') {
      const isAdmin = authStatus.user_info?.role === 'admin'
      if (!isAdmin) {
        toast.error('관리자 권한이 필요합니다')
        navigate({ to: '/' })
      }
    }
  }, [authStatus.status, authStatus.user_info?.role, navigate])

  // 현재 경로에 따라 사이드바 활성화 상태 설정
  useEffect(() => {
    if (location.pathname.includes('/template')) {
      setCurrent('templates')
    } else if (location.pathname === '/admin') {
      setCurrent('users')
    }
  }, [location.pathname])

  // 중첩 라우트가 있는지 확인 (예: /admin/template/add)
  const hasNestedRoute = location.pathname !== '/admin'

  const renderContent = () => {
    // 중첩 라우트가 있으면 Outlet을 렌더링
    if (hasNestedRoute) {
      return <Outlet />
    }

    // 기본 라우트에서는 기존 컨텐츠 렌더링
    switch (current) {
      case 'users':
        return <UserManagement />
      case 'templates':
        return <TemplateManagement />
      default:
        return <UserManagement />
    }
  }

  if (authStatus.status === 'pending') {
    return (
      <div className="flex flex-col w-screen h-screen">
        <TopMenu />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-screen h-screen">
      <TopMenu />
      <SidebarProvider className="flex-1 flex">
        <AdminSidebar current={current} setCurrent={setCurrent} />
        <ScrollArea className="flex-1">
          {renderContent()}
        </ScrollArea>
      </SidebarProvider>
    </div>
  )
}
