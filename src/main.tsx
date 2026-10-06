import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadTheme } from './storage/theme'
import './themes.css'
import './i18n/index.ts'

document.documentElement.dataset.theme = loadTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
