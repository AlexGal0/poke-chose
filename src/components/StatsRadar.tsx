import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { STATS } from '../domain/stats'
import type { BaseStats, CurrentStats, Stat } from '../domain/stats'
import { statLabel } from '../i18n/stats'

function point(index: number, ratio: number) {
  const angle = index * Math.PI / 3 - Math.PI / 2
  return { x: 180 + Math.cos(angle) * ratio * 100, y: 170 + Math.sin(angle) * ratio * 100 }
}

function polygon(values: readonly number[], max: number) {
  return values.map((value, index) => {
    const { x, y } = point(index, value / max)
    return `${x},${y}`
  }).join(' ')
}

export function StatsRadar({ base, current, individual, max, activeStat, onHoverStat, onFocusStat }: { base: BaseStats | null; current?: CurrentStats; individual: boolean; max: number; activeStat: Stat | null; onHoverStat: (stat: Stat | null) => void; onFocusStat: (stat: Stat | null) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const series = [
    ...(base ? [{ kind: 'base', values: base }] : []),
    ...(individual && current ? [{ kind: 'current', values: current }] : []),
  ]
  const description = STATS.map(stat => `${statLabel(t, stat)}: ${series.map(({ kind, values }) => `${t(`statistics.series.${kind}`)} ${values[stat]}`).join(', ')}`).join('; ')
  return <figure className="stats-radar">
    <figcaption>{t('statistics.radarHeading')}</figcaption>
    <svg viewBox="0 0 360 340" role="group" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
      <title id={`${id}-title`}>{t('statistics.radarHeading')}</title>
      <desc id={`${id}-description`}>{t('statistics.radarDescription', { max })} {description}</desc>
      {[0.25, 0.5, 0.75, 1].map(ratio => <polygon key={ratio} className="stats-radar-grid" points={polygon(STATS.map(() => ratio), 1)} />)}
      {STATS.map((stat, index) => {
        const edge = point(index, 1)
        const label = point(index, 1.32)
        return <g key={stat} className={activeStat === stat ? 'stats-radar-active' : undefined}>
          <line className="stats-radar-axis" x1="180" y1="170" x2={edge.x} y2={edge.y} />
          <text className="stats-radar-label" x={label.x} y={label.y} dominantBaseline="middle" textAnchor={index === 0 || index === 3 ? 'middle' : index < 3 ? 'start' : 'end'}>{t(`statistics.radarLabels.${stat}`)}</text>
        </g>
      })}
      {series.map(({ kind, values }) => <g key={kind} className={`stats-radar-series stats-radar-${kind}`}>
        <polygon points={polygon(STATS.map(stat => values[stat]), max)} />
        {STATS.map((stat, index) => {
          const { x, y } = point(index, values[stat] / max)
          return <circle key={stat} className={activeStat === stat ? 'stats-radar-point-active' : undefined} cx={x} cy={y} r={activeStat === stat ? 6 : 3}><title>{statLabel(t, stat)} · {t(`statistics.series.${kind}`)}: {values[stat]}</title></circle>
        })}
      </g>)}
      {STATS.map((stat, index) => {
        const left = point(index - 0.5, 1.65)
        const right = point(index + 0.5, 1.65)
        const label = `${statLabel(t, stat)}: ${series.map(({ kind, values }) => `${t(`statistics.series.${kind}`)} ${values[stat]}`).join(', ')}`
        return <polygon key={stat} className="stats-radar-target" points={`180,170 ${left.x},${left.y} ${right.x},${right.y}`} tabIndex={0} role="group" aria-label={label} onPointerEnter={() => onHoverStat(stat)} onPointerLeave={() => onHoverStat(null)} onFocus={() => onFocusStat(stat)} onBlur={() => onFocusStat(null)}><title>{label}</title></polygon>
      })}
    </svg>
    <ul className="stats-radar-legend">{series.map(({ kind }) => <li key={kind} className={`stats-radar-key-${kind}`}><span aria-hidden="true" />{t(`statistics.series.${kind}`)}</li>)}</ul>
    {!base && <p className="hint">{t('statistics.radarBaseMissing')}</p>}
    {individual && !current && <p className="hint">{t('statistics.radarCurrentMissing')}</p>}
  </figure>
}
