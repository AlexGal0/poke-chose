import { pokemonDisplayName } from '../domain/pokemon-names'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Pokemon } from '../models/pokemon'
import type { LearnedMove } from '../domain/moves'
import { getLevelMoves } from '../api/moves'
import { MovesContext } from './moves-context'
import { TypeBadge } from './TypeBadge'
import './Moves.css'

function MovesDialog({ pokemon, onClose }: { pokemon: Pokemon; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const outsideStart = useRef(false)
  const [moves, setMoves] = useState<LearnedMove[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    getLevelMoves(pokemon.name, controller.signal).then(result => { if (!controller.signal.aborted) setMoves(result) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [pokemon.name, attempt])
  const outside = (event: React.PointerEvent<HTMLDialogElement> | React.MouseEvent<HTMLDialogElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
  }
  return <dialog ref={dialog} className="moves-dialog" aria-labelledby="moves-title" onCancel={onClose} onPointerDown={event => { outsideStart.current = outside(event) }} onClick={event => { if (outsideStart.current && outside(event)) onClose(); outsideStart.current = false }}>
    <div className="moves-heading"><div><span className="eyebrow">BLACK / WHITE · POR NIVEL</span><h2 id="moves-title">Movimientos de <span className="moves-pokemon-name">{pokemon.nickname || pokemonDisplayName(pokemon.name)}</span></h2>{pokemon.nickname && <p className="hint moves-pokemon-name">{pokemonDisplayName(pokemon.name)}</p>}</div><button type="button" onClick={onClose} autoFocus aria-label="Cerrar movimientos">✕</button></div>
    <p className="hint">Aprendizaje por nivel de esta especie y forma en Negro/Blanco. PP base, sin aumentos. No incluye MT, MO, tutores ni crianza.</p>
    {!moves && !error && <p role="status" className="empty">Cargando movimientos…</p>}
    {error && <p role="alert" className="notice">No se pudieron cargar los movimientos. <button onClick={() => { setError(false); setAttempt(value => value + 1) }}>Reintentar</button></p>}
    {moves && (moves.length ? <div className="table-scroll"><table className="moves-table"><caption className="sr-only">Movimientos de Black/White ordenados por nivel</caption><thead><tr><th scope="col">Nivel</th><th scope="col">Movimiento</th><th scope="col">Tipo</th><th scope="col">Categoría</th><th scope="col">PP</th><th scope="col">Descripción</th></tr></thead><tbody>{moves.map(move => <tr key={`${move.slug}-${move.level}`}><td>{move.level === 0 ? 'Inicial' : move.level}</td><th scope="row">{move.name}</th><td>{move.type ? <TypeBadge type={move.type} /> : 'Sin confirmar'}</td><td>{move.category}</td><td>{move.pp}</td><td>{move.description}{move.descriptionSource && <small className="moves-description-source">{move.descriptionSource}</small>}</td></tr>)}</tbody></table></div> : <p className="empty">No hay movimientos por nivel registrados para esta forma en Black/White.</p>)}
  </dialog>
}

export function MovesProvider({ children }: { children: ReactNode }) {
  const [pokemon, setPokemon] = useState<Pokemon | null>(null)
  return <MovesContext.Provider value={setPokemon}>{children}{pokemon && <MovesDialog key={pokemon.name} pokemon={pokemon} onClose={() => setPokemon(null)} />}</MovesContext.Provider>
}
