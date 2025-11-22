import { useQuery } from '@tanstack/react-query'
import { getUsersList, type AdminUser } from '@/api/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export default function UserManagement() {
  // 유저 목록 가져오기
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getUsersList,
    retry: false,
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const getInitials = (username: string) => {
    return username ? username.substring(0, 2).toUpperCase() : 'U'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">오류 발생</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : '유저 목록을 불러오는 중 오류가 발생했습니다.'}
            </CardDescription>
          </CardHeader>
        </Card>
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
          <Users className="h-8 w-8" />
          <h1 className="text-3xl font-bold">유저 관리</h1>
        </div>
        <p className="text-muted-foreground">
          가입한 유저 목록을 확인할 수 있습니다.
        </p>
      </motion.div>

      {usersData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>유저 목록</CardTitle>
              <CardDescription>
                총 {usersData.total}명의 유저가 등록되어 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersData.users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  등록된 유저가 없습니다.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[60px]">프로필</TableHead>
                        <TableHead>사용자명</TableHead>
                        <TableHead>이메일</TableHead>
                        <TableHead>프로바이더</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead>최근 로그인</TableHead>
                        <TableHead>역할</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersData.users.map((user: AdminUser) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.image_url} alt={user.username} />
                              <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            {user.provider ? (
                              <Badge variant="secondary">{user.provider}</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(user.created_at)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {user.last_login ? formatDate(user.last_login) : '-'}
                          </TableCell>
                          <TableCell>
                            {user.role === 'admin' ? (
                              <Badge variant="default" className="bg-primary">
                                관리자
                              </Badge>
                            ) : (
                              <Badge variant="secondary">유저</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

