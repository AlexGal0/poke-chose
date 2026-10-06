import { effectiveness } from '../domain/effectiveness'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PokemonType } from '../models/pokemon'
import { TYPES } from '../models/pokemon'
import { TypeBadge } from './TypeBadge'
import { typeLabel } from '../i18n/types.ts'
import './TypeChart.css'

export function TypeChart() {
  const { t } = useTranslation()
  const [hoveredColumn, setHoveredColumn] = useState<PokemonType | null>(null)
  return <section className="panel" aria-labelledby="type-chart-title">
    <div className="section-heading"><div><span className="eyebrow">{t('typeChart.eyebrow')}</span><h2 id="type-chart-title">{t('app.tabs.types')}</h2></div><span className="count">{t('typeChart.typesCount')}</span></div>
    <p className="hint">{t('typeChart.hint')}</p>
    <div className="type-chart-legend">
      <span><span className="multiplier weak">2×</span> {t('typeChart.legend.superEffective')}</span>
      <span><span className="multiplier">1×</span> {t('typeChart.legend.neutral')}</span>
      <span><span className="multiplier resist">½×</span> {t('typeChart.legend.notVeryEffective')}</span>
      <span><span className="multiplier immune">0×</span> {t('typeChart.legend.immune')}</span>
    </div>
    <div className="table-scroll type-chart-scroll" tabIndex={0} role="region" aria-label={t('typeChart.matrixAria')}><table className="type-chart" onMouseOver={event => {
      const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-defender]')
      setHoveredColumn(cell?.dataset.defender as PokemonType | undefined ?? null)
    }} onMouseLeave={() => setHoveredColumn(null)}>
      <caption className="sr-only">{t('typeChart.tableCaption')}</caption>
      <thead><tr><th scope="col" className="type-chart-axis"><span>{t('typeChart.axis.defense')}</span><span>{t('typeChart.axis.attack')}</span></th>{TYPES.map(type => <th scope="col" key={type} data-defender={type} className={hoveredColumn === type ? 'column-hover' : undefined}><TypeBadge type={type} /></th>)}</tr></thead>
      <tbody>{TYPES.map(attack => <tr key={attack}>
        <th scope="row"><TypeBadge type={attack} /></th>
        {TYPES.map(defender => {
          const multiplier = effectiveness(attack, [defender])
          const label = multiplier === 0.5 ? '½×' : `${multiplier}×`
          return <td key={defender} data-defender={defender} className={hoveredColumn === defender ? 'column-hover' : undefined} title={t('typeChart.cellTitle', { attacker: typeLabel(t, attack), defender: typeLabel(t, defender), multiplier: label })}><span className={`multiplier ${multiplier === 0 ? 'immune' : multiplier === 2 ? 'weak' : multiplier === 0.5 ? 'resist' : ''}`}>{label}</span></td>
        })}
      </tr>)}</tbody>
    </table></div>
  </section>
}
