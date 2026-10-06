import { BATTLE_STATS, BATTLE_STAT_LABELS, BATTLE_STAT_SHORT_LABELS } from '../domain/battle-stat-stages'
import type { BattleStatStages as StatStages } from '../domain/battle-stat-stages'
import './BattleStatStages.css'

export function BattleStatStages({ stages }: { stages: StatStages | null }) {
  return <div className="battle-stat-stages">
    <table>
      <caption>Cambios de estadísticas</caption>
      <thead><tr>{BATTLE_STATS.map(stat => <th scope="col" key={stat}><abbr title={BATTLE_STAT_LABELS[stat]}>{BATTLE_STAT_SHORT_LABELS[stat]}</abbr></th>)}</tr></thead>
      <tbody><tr>{BATTLE_STATS.map(stat => {
        const stage = stages?.[stat]
        const direction = stage === undefined ? 'unknown' : stage > 0 ? 'raised' : stage < 0 ? 'lowered' : 'neutral'
        const label = stage === undefined ? 'Sin datos confirmados' : stage === 0 ? 'Sin cambios' : `${stage > 0 ? 'Aumentó' : 'Disminuyó'} ${Math.abs(stage)} ${Math.abs(stage) === 1 ? 'nivel' : 'niveles'}`
        return <td key={stat} className={direction} aria-label={`${BATTLE_STAT_LABELS[stat]}: ${label}`}><span aria-hidden="true">{stage === undefined ? '?' : stage > 0 ? `+${stage}` : stage < 0 ? `−${Math.abs(stage)}` : '—'}</span></td>
      })}</tr></tbody>
    </table>
    {!stages && <p className="hint">Cambios por confirmar</p>}
  </div>
}
