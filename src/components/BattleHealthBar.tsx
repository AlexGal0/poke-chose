import { useTranslation } from 'react-i18next'
import type { BattleHealth } from '../domain/enemy-prototype'

export function BattleHealthBar({ health, label }: { health: BattleHealth | null; label?: string }) {
  const { t } = useTranslation()
  const resolvedLabel = label ?? t('common.hpAria')
  return <div className="battle-health">
    {health ? <>
      <div className="battle-health-label"><span>{t('common.hpAbbr')}</span><strong>{health.currentHp} / {health.maxHp}</strong></div>
      <div className={`battle-health-bar ${health.currentHp / health.maxHp <= 0.2 ? 'low' : health.currentHp / health.maxHp <= 0.5 ? 'medium' : ''}`} role="progressbar" aria-valuenow={health.currentHp} aria-valuemax={health.maxHp} aria-valuemin={0} aria-label={resolvedLabel}>
        <span className="battle-health-fill" style={{ width: `${health.currentHp / health.maxHp * 100}%` }} />
      </div>
    </> : <p className="hint">{t('battleHealthBar.unconfirmed')}</p>}
  </div>
}
