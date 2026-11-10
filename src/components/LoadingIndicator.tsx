import type { ReactNode } from 'react'
import './LoadingIndicator.css'

export function LoadingIndicator({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <span className={`loading-indicator${compact ? ' loading-indicator-compact' : ''}`} role="status" aria-live="polite">
    <span className="loading-indicator-scene" aria-hidden="true">
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcSet="/loading/furret-still.png" />
        <img src="/loading/furret-walk.gif" alt="" width="128" height="72" />
      </picture>
      <span className="loading-indicator-track" />
    </span>
    <span className="loading-indicator-label">{children}</span>
  </span>
}
