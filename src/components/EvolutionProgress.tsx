import { useTranslation } from 'react-i18next'
import './EvolutionProgress.css'

export function EvolutionProgress({ remaining, onClick }: { remaining: number | null; onClick: () => void }) {
  const { t } = useTranslation()
  if (remaining === null) return null
  const label = t(remaining === 0 ? 'evolutionProgress.reached' : 'evolutionProgress.remaining', { count: remaining })
  return <button type="button" className="evolution-progress" onClick={onClick} title={label} aria-label={label}>
    <span aria-hidden="true">↗</span><strong>{remaining}</strong>
  </button>
}
