import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { StoreProvider } from './lib/store.tsx'
import { SyncProvider } from './lib/sync.tsx'
import Acesso from './components/Acesso.tsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <SyncProvider>
        <Acesso>
          <App />
        </Acesso>
      </SyncProvider>
    </StoreProvider>
  </StrictMode>,
)
