import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/inter'
import './styles/app.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startSessionRefresh } from './features/auth/session-refresh'
import { lockPortraitOrientation } from './features/pwa/lock-orientation'
import { requestPersistentStorage } from './features/pwa/persist-storage'
import { registerServiceWorker } from './features/pwa/register-sw'
import { installSound } from './features/sound/sound'
import { queryClient, router } from './router'

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

startSessionRefresh()
installSound()
void lockPortraitOrientation()
void registerServiceWorker().then(() =>
  import.meta.env.PROD ? requestPersistentStorage() : undefined,
)
