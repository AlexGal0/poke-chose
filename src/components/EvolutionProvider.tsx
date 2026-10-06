import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EvolutionContext } from './evolution-context'
import { getEvolutionTree } from '../api/evolution'
import { evolutionMethodFacts } from '../domain/evolution'
import { evolutionMethodLabel } from '../i18n/evolution.ts'
import type { EvolutionNode, EvolutionTree } from '../models/evolution'
import { PokemonCard } from './PokemonCard'
import './Evolution.css'

function EvolutionBranch({ node, tree, currentId }: { node: EvolutionNode; tree: EvolutionTree; currentId: number }) {
  const { t } = useTranslation()
  const methods = [...new Set(node.methods.map(method => evolutionMethodLabel(t, evolutionMethodFacts(method, node.speciesId, tree.labels))))]
  return <div className="evolution-branch">
    {methods.length > 0 && <div className="evolution-relation"><span aria-hidden="true">→</span>{methods.map((method, index) => <p key={method}>{index > 0 && <strong>{t('evolutionDialog.orBranch')}</strong>}{method}</p>)}</div>}
    <div className={`evolution-card ${node.speciesId === currentId ? 'current' : ''}`}><PokemonCard pokemon={tree.pokemon[node.speciesId]} showEvolution={false}>{node.speciesId === currentId && <small>{t('evolutionDialog.queriedSpecies')}</small>}</PokemonCard></div>
    {node.children.length > 0 && <div className="evolution-children">{node.children.map(child => <EvolutionBranch key={child.speciesId} node={child} tree={tree} currentId={currentId} />)}</div>}
  </div>
}

function EvolutionDialog({ speciesId, onClose }: { speciesId: number; onClose: () => void }) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const pointerStartedOutside = useRef(false)
  const [tree, setTree] = useState<EvolutionTree | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const element = dialog.current!
    const previousFocus = document.activeElement as HTMLElement | null
    element.showModal()
    return () => { element.close(); previousFocus?.focus() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    getEvolutionTree(speciesId, controller.signal).then(result => {
      if (!controller.signal.aborted) setTree(result)
    }).catch(() => {
      if (!controller.signal.aborted) setError('evolutionDialog.loadError')
    })
    return () => controller.abort()
  }, [speciesId, attempt])
  return <dialog className="evolution-dialog" ref={dialog} aria-labelledby="evolution-title" onCancel={onClose}
    onPointerDown={event => {
      const bounds = event.currentTarget.getBoundingClientRect()
      pointerStartedOutside.current = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
    }}
    onClick={event => {
      const bounds = event.currentTarget.getBoundingClientRect()
      const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom
      if (pointerStartedOutside.current && outside) onClose()
      pointerStartedOutside.current = false
    }}>
    <div className="evolution-heading"><div><span className="eyebrow">POKÉMON BLACK · GEN V</span><h2 id="evolution-title">{t('evolutionDialog.heading')}</h2></div><button onClick={onClose} autoFocus aria-label={t('evolutionDialog.closeAria')}>✕</button></div>
    {!tree && !error && <p role="status">{t('evolutionDialog.loading')}</p>}
    {error && <p className="notice" role="alert">{t(error)} <button onClick={() => { setError(''); setAttempt(value => value + 1) }}>{t('common.retry')}</button></p>}
    {tree && <><p className="hint">{t('evolutionDialog.readingHint')}</p><div className="evolution-tree-scroll" tabIndex={0} role="region" aria-label={t('evolutionDialog.scrollAria')}><EvolutionBranch node={tree.root} tree={tree} currentId={speciesId} /></div>{!tree.root.children.length && <p className="hint">{t('evolutionDialog.noEvolutionsHint')}</p>}</>}
  </dialog>
}

export function EvolutionProvider({ children }: { children: ReactNode }) {
  const [speciesId, setSpeciesId] = useState<number | null>(null)
  return <EvolutionContext.Provider value={setSpeciesId}>{children}{speciesId !== null && <EvolutionDialog key={speciesId} speciesId={speciesId} onClose={() => setSpeciesId(null)} />}</EvolutionContext.Provider>
}
