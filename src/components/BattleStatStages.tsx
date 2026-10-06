import { useTranslation } from 'react-i18next'
import { BATTLE_STATS, BATTLE_STAT_SHORT_LABELS } from '../domain/battle-stat-stages'
import type { BattleStatStages as StatStages } from '../domain/battle-stat-stages'
import { battleStatLabel } from '../i18n/battle-stat-stages.ts'
import './BattleStatStages.css'

export function BattleStatStages({ stages }: { stages: StatStages | null }) {
  const { t } = useTranslation()
  return <div className="battle-stat-stages">
    <table>
      <caption>{t('battleStatStages.caption')}</caption>
      <thead><tr>{BATTLE_STATS.map(stat => <th scope="col" key={stat}><abbr title={battleStatLabel(t, stat)}>{BATTLE_STAT_SHORT_LABELS[stat]}</abbr></th>)}</tr></thead>
      <tbody><tr>{BATTLE_STATS.map(stat => {
        const stage = stages?.[stat]
        const direction = stage === undefined ? 'unknown' : stage > 0 ? 'raised' : stage < 0 ? 'lowered' : 'neutral'
        const label = stage === undefined ? t('battleStatStages.unconfirmed') : stage === 0 ? t('battleStatStages.unchanged') : t(stage > 0 ? 'battleStatStages.raised' : 'battleStatStages.lowered', { count: Math.abs(stage) })
        return <td key={stat} className={direction} aria-label={`${battleStatLabel(t, stat)}: ${label}`}><span aria-hidden="true">{stage === undefined ? '?' : stage > 0 ? `+${stage}` : stage < 0 ? `−${Math.abs(stage)}` : '—'}</span></td>
      })}</tr></tbody>
    </table>
    {!stages && <p className="hint">{t('battleStatStages.hint')}</p>}
  </div>
}
