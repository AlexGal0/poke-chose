import { useTranslation } from 'react-i18next'
import type { Pokemon } from '../models/pokemon'
import { battleWeaknesses, battleResistances } from '../domain/battle-type-matchup'
import { TypeBadge } from './TypeBadge'

export function BattleTypeMatchup({ own, enemy, direction }: { own: Pokemon | null; enemy: Pokemon | null; direction: 'outgoing' | 'incoming' }) {
  const { t } = useTranslation()
  const participant = direction === 'outgoing' ? own : enemy
  const opponent = direction === 'outgoing' ? enemy : own
  const weaknesses = participant ? battleWeaknesses(participant.types) : null
  const resistances = participant ? battleResistances(participant.types) : null
  function renderTypes(rows: typeof weaknesses, empty: string) {
    return rows ? rows.length ? rows.map(row => {
      const matched = opponent?.types.includes(row.type) ?? false
      const matchLabel = direction === 'outgoing' ? t('battleTypeMatchup.matchesRival') : t('battleTypeMatchup.matchesOwn')
      return <div className={`battle-damage-type ${matched ? 'matched' : ''}`} key={row.type} title={row.multiplier === 0 ? t('battleTypeMatchup.immune') : matched ? matchLabel : undefined}>
        <TypeBadge type={row.type} /><span className={`multiplier ${row.multiplier > 1 ? 'weak' : 'resistant'}`}>{row.multiplier}×</span>{matched && <span className="battle-weakness-match" aria-label={matchLabel}>★</span>}
      </div>
    }) : <span className="hint">{empty}</span> : <span className="hint">{t('battleTypeMatchup.waitingTypes')}</span>
  }
  return <section className={`battle-type-matchup ${direction}`} aria-label={direction === 'outgoing' ? t('battleTypeMatchup.ownAria') : t('battleTypeMatchup.rivalAria')}>
    <strong className="battle-weakness-heading">{direction === 'outgoing' ? t('battleTypeMatchup.ownWeaknessesHeading') : t('battleTypeMatchup.rivalWeaknessesHeading')}</strong>
    <div className="battle-weakness-types">{renderTypes(weaknesses, t('battleTypeMatchup.noWeaknesses'))}</div>
    <strong className="battle-weakness-heading">{t('battleTypeMatchup.strengthsHeading')} <span className="battle-strength-description">{t('battleTypeMatchup.strengthsSubnote')}</span></strong>
    <div className="battle-weakness-types battle-resistances">{renderTypes(resistances, t('battleTypeMatchup.noStrengths'))}</div>
    <small>{t('battleTypeMatchup.matchLegend', { target: direction === 'outgoing' ? t('battleTypeMatchup.targetRival') : t('battleTypeMatchup.targetOwn') })}</small>
  </section>
}
