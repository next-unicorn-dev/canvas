import UpdateNotificationDialog from '@/components/common/UpdateNotificationDialog'
import SettingsDialog from '@/components/settings/dialog'
import { LoginDialog } from '@/components/auth/LoginDialog'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { ConfigsProvider } from '@/contexts/configs'
import { AuthProvider } from '@/contexts/AuthContext'
import { useTheme } from '@/hooks/use-theme'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { openDB } from 'idb'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import InstagramConnectDialog from '@/components/canvas/InstagramConnectDialog'
import { useEffect, useState } from 'react'
import { Toaster } from 'sonner'
import { routeTree } from './route-tree.gen'

import '@/assets/style/App.css'
import '@/i18n'

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// IndexedDB 연결 생성
const getDB = () =>
  openDB('react-query-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache')
      }
    },
  })

// IndexedDB 영속화기 생성
const persister = createAsyncStoragePersister({
  storage: {
    getItem: async (key: string) => {
      const db = await getDB()
      return (await db.get('cache', key)) || null
    },
    setItem: async (key: string, value: unknown) => {
      const db = await getDB()
      await db.put('cache', value, key)
    },
    removeItem: async (key: string) => {
      const db = await getDB()
      await db.delete('cache', key)
    },
  },
  key: 'react-query-cache',
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
})

function App() {
  const { theme } = useTheme()
  const [instagramDialogOpen, setInstagramDialogOpen] = useState(false)

  // Check for Instagram auth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    console.log('App URL Params Check:', window.location.search)
    if (params.get('instagram_auth')) {
      console.log('Found instagram_auth! Opening dialog...')
      setInstagramDialogOpen(true)
    }
  }, [])

  return (
    <ThemeProvider defaultTheme={theme} storageKey="vite-ui-theme">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <AuthProvider>
          <ConfigsProvider>
            <div className="app-container">
              <RouterProvider router={router} />

              {/* Update Notification Dialog */}
              <UpdateNotificationDialog />

              {/* Settings Dialog */}
              <SettingsDialog />

              {/* Login Dialog */}
              <LoginDialog />

              {/* Instagram Connect Dialog */}
              <InstagramConnectDialog
                open={instagramDialogOpen}
                onOpenChange={setInstagramDialogOpen}
              />
            </div>
          </ConfigsProvider>
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </PersistQueryClientProvider>
      <Toaster position="bottom-center" richColors />
    </ThemeProvider>
  )
}

export default App
