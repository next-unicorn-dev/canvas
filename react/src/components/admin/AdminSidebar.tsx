import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { Users, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type AdminSidebarType = 'users' | 'templates'

type AdminSidebarProps = {
  current: AdminSidebarType
  setCurrent: (current: AdminSidebarType) => void
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  current,
  setCurrent,
}) => {
  const { t } = useTranslation()

  // Menu items
  const items: {
    type: AdminSidebarType
    title: string
    icon: React.ElementType
  }[] = [
    {
      type: 'users',
      title: '유저 관리',
      icon: Users,
    },
    {
      type: 'templates',
      title: '템플릿 관리',
      icon: FileText,
    },
  ]

  return (
    <Sidebar className="h-full rounded-l-lg overflow-hidden">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold select-none mb-4">
            관리자
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.type}>
                  <SidebarMenuButton asChild>
                    <div
                      className={cn(
                        'flex items-center gap-2 select-none cursor-pointer',
                        current === item.type && 'bg-muted'
                      )}
                      onClick={() => setCurrent(item.type)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default AdminSidebar

