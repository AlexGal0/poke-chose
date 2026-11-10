import { typeEffectiveness } from '../domain/type-analysis'
import type { TypeRules } from '../domain/type-analysis'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TypeBadge } from './TypeBadge'
import { typeLabel } from '../i18n/types.ts'
import './TypeChart.css'

export function TypeChart({ rules }: { rules: TypeRules }) {
  const { t } = useTranslation()
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [hovered, setHovered] = useState<{ attack: string; defender: string } | null>(null)
  const [focused, setFocused] = useState<{ attack: string; defender: string } | null>(null)
  const [pinned, setPinned] = useState<{ attack: string; defender: string } | null>(null)
  const columns = rules.types.filter(type => selectedTypes.length === 0 || selectedTypes.includes(type))
  const active = pinned ?? hovered ?? focused
  const tabCell = focused && columns.includes(focused.defender) ? focused : { attack: rules.types[0], defender: columns[0] }
  function toggleType(type: string) {
    const next = selectedTypes.includes(type) ? selectedTypes.filter(value => value !== type) : [...selectedTypes, type]
    setSelectedTypes(next)
    setHovered(null)
    setFocused(null)
    if (pinned && next.length > 0 && !next.includes(pinned.defender)) setPinned(null)
  }
  return <section className="type-chart-screen" aria-labelledby="type-chart-title">
    <div className="section-heading"><div><span className="eyebrow">{t('typeRules.reference', { number: rules.generation })}</span><h2 id="type-chart-title">{t('app.tabs.types')}</h2></div><span className="count">{t('typeRules.count', { count: rules.types.length })}</span></div>
    <p className="hint">{t('typeRules.hint', { number: rules.generation })}</p>
    <div className="type-chart-filter"><strong>{t('typeChartRefresh.filter')}</strong><div className="collection-tags" role="group" aria-label={t('typeChartRefresh.filter')}><button type="button" aria-pressed={selectedTypes.length === 0} onClick={() => { setSelectedTypes([]); setHovered(null); setFocused(null) }}>{t('typeChartRefresh.all')}</button>{rules.types.map(type => <button type="button" key={type} className={`type type-${type}${selectedTypes.includes(type) ? ' active' : ''}`} aria-pressed={selectedTypes.includes(type)} onClick={() => toggleType(type)}>{typeLabel(t, type)}</button>)}</div><small role="status">{t('typeChartRefresh.showing', { count: columns.length, total: rules.types.length })}</small></div>
    <div className="type-chart-legend">
      <span><span className="multiplier weak">2×</span> {t('typeChart.legend.superEffective')}</span>
      <span><span className="multiplier">1×</span> {t('typeChart.legend.neutral')}</span>
      <span><span className="multiplier resist">½×</span> {t('typeChart.legend.notVeryEffective')}</span>
      <span><span className="multiplier immune">0×</span> {t('typeChart.legend.immune')}</span>
    </div>
    <p className="hint type-chart-help">{t('typeChartRefresh.help')}</p>
    {pinned && <div className="type-chart-selection" role="status"><strong>{t('typeChart.cellTitle', { attacker: typeLabel(t, pinned.attack), defender: typeLabel(t, pinned.defender), multiplier: typeEffectiveness(rules, pinned.attack, [pinned.defender]) === 0.5 ? '½×' : `${typeEffectiveness(rules, pinned.attack, [pinned.defender])}×` })}</strong><button onClick={() => setPinned(null)}>{t('typeChartRefresh.clear')}</button></div>}
    <div className="table-scroll type-chart-scroll" tabIndex={0} role="region" aria-label={t('typeChart.matrixAria')}><table className="type-chart" onMouseLeave={() => setHovered(null)}>
      <caption className="sr-only">{t('typeRules.caption', { number: rules.generation })}</caption>
      <thead><tr><th scope="col" className="type-chart-axis"><span>{t('typeChart.axis.defense')}</span><span>{t('typeChart.axis.attack')}</span></th>{columns.map(type => <th scope="col" key={type} className={active?.defender === type ? 'column-hover' : undefined}><TypeBadge type={type} /></th>)}</tr></thead>
      <tbody>{rules.types.map((attack, rowIndex) => <tr key={attack} className={active?.attack === attack ? 'row-active' : undefined}>
        <th scope="row"><TypeBadge type={attack} /></th>
        {columns.map((defender, columnIndex) => {
          const multiplier = typeEffectiveness(rules, attack, [defender])
          const label = multiplier === 0.5 ? '½×' : `${multiplier}×`
          const selected = pinned?.attack === attack && pinned.defender === defender
          return <td key={defender} className={active?.defender === defender ? 'column-hover' : undefined}>
            <button type="button" data-attack={attack} data-defender={defender} tabIndex={tabCell.attack === attack && tabCell.defender === defender ? 0 : -1} aria-pressed={selected} aria-label={t('typeChart.cellTitle', { attacker: typeLabel(t, attack), defender: typeLabel(t, defender), multiplier: label })} title={t('typeChart.cellTitle', { attacker: typeLabel(t, attack), defender: typeLabel(t, defender), multiplier: label })}
              onMouseEnter={() => setHovered({ attack, defender })} onFocus={() => setFocused({ attack, defender })} onBlur={() => setFocused(null)} onClick={() => setPinned(selected ? null : { attack, defender })}
              onKeyDown={event => {
                let row = rowIndex, column = columnIndex
                if (event.key === 'ArrowRight') column = Math.min(columns.length - 1, column + 1)
                else if (event.key === 'ArrowLeft') column = Math.max(0, column - 1)
                else if (event.key === 'ArrowDown') row = Math.min(rules.types.length - 1, row + 1)
                else if (event.key === 'ArrowUp') row = Math.max(0, row - 1)
                else if (event.key === 'Home') column = 0
                else if (event.key === 'End') column = columns.length - 1
                else if (event.key === 'Escape') { setPinned(null); return }
                else return
                event.preventDefault()
                event.currentTarget.closest('table')?.querySelector<HTMLButtonElement>(`button[data-attack="${rules.types[row]}"][data-defender="${columns[column]}"]`)?.focus()
              }}><span className={`multiplier ${multiplier === 0 ? 'immune' : multiplier === 2 ? 'weak' : multiplier === 0.5 ? 'resist' : ''}`}>{label}</span></button>
          </td>
        })}
      </tr>)}</tbody>
    </table></div>
  </section>
}
