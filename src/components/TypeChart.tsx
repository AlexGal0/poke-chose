import { effectiveness } from '../domain/effectiveness'
import { useState } from 'react'
import type { PokemonType } from '../models/pokemon'
import { TYPES, TYPE_LABELS } from '../models/pokemon'
import { TypeBadge } from './TypeBadge'
import './TypeChart.css'

export function TypeChart() {
  const [hoveredColumn, setHoveredColumn] = useState<PokemonType | null>(null)
  return <section className="panel" aria-labelledby="type-chart-title">
    <div className="section-heading"><div><span className="eyebrow">REFERENCIA / GENERACIÓN V</span><h2 id="type-chart-title">Tabla de tipos</h2></div><span className="count">17 tipos</span></div>
    <p className="hint">Filas: tipo atacante. Columnas: tipo defensor. Cada cruce indica el daño contra un solo tipo. En Pokémon Negro, Acero resiste Fantasma y Siniestro.</p>
    <div className="type-chart-legend">
      <span><span className="multiplier weak">2×</span> Supereficaz</span>
      <span><span className="multiplier">1×</span> Neutral</span>
      <span><span className="multiplier resist">½×</span> Poco eficaz</span>
      <span><span className="multiplier immune">0×</span> Inmune</span>
    </div>
    <div className="table-scroll type-chart-scroll" tabIndex={0} role="region" aria-label="Matriz de tipos, desplazable horizontalmente"><table className="type-chart" onMouseOver={event => {
      const cell = (event.target as HTMLElement).closest<HTMLElement>('[data-defender]')
      setHoveredColumn(cell?.dataset.defender as PokemonType | undefined ?? null)
    }} onMouseLeave={() => setHoveredColumn(null)}>
      <caption className="sr-only">Multiplicadores de daño en Generación V: filas atacantes y columnas defensoras</caption>
      <thead><tr><th scope="col" className="type-chart-axis"><span>Defensa →</span><span>Ataque ↓</span></th>{TYPES.map(type => <th scope="col" key={type} data-defender={type} className={hoveredColumn === type ? 'column-hover' : undefined}><TypeBadge type={type} /></th>)}</tr></thead>
      <tbody>{TYPES.map(attack => <tr key={attack}>
        <th scope="row"><TypeBadge type={attack} /></th>
        {TYPES.map(defender => {
          const multiplier = effectiveness(attack, [defender])
          const label = multiplier === 0.5 ? '½×' : `${multiplier}×`
          return <td key={defender} data-defender={defender} className={hoveredColumn === defender ? 'column-hover' : undefined} title={`${TYPE_LABELS[attack]} → ${TYPE_LABELS[defender]}: ${label}`}><span className={`multiplier ${multiplier === 0 ? 'immune' : multiplier === 2 ? 'weak' : multiplier === 0.5 ? 'resist' : ''}`}>{label}</span></td>
        })}
      </tr>)}</tbody>
    </table></div>
  </section>
}
