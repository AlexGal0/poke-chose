import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getEvolutionFamily, getEvolutionSpecies } from '../api/evolution'
import { getEvolutionItem } from '../api/evolution-items'
import type { EvolutionItemInfo } from '../api/evolution-items'
import { pendingEvolutions, requiredEvolutionItems } from '../domain/evolution-requirements'
import { blackWhitePokedexScope } from '../domain/pokedex-scope'
import { evolutionMethodFacts } from '../domain/evolution'
import { evolutionMethodLabel } from '../i18n/evolution'
import { pokemonDisplayName } from '../domain/pokemon-names'
import type { EvolutionNode } from '../models/evolution'
import type { Pokemon } from '../models/pokemon'
import type { PokedexState } from '../models/pokedex'
import { useSaveInventory } from '../hooks/useSaveInventory'
import { EvolutionContext } from './evolution-context'
import { PokedexScopeBadge } from './PokedexScopeBadge'
import { DiscoveryContext } from './discovery-context'
import { CapturedPokemonIcon } from './CapturedPokemonIcon'
import { EvolutionItemIcon } from './EvolutionItemIcon'
import './EvolutionRequirements.css'

export function EvolutionRequirements({ collection, caught, manual, stale }: { collection: readonly Pokemon[]; caught: PokedexState | null; manual: boolean; stale: boolean }) {
  const { t, i18n } = useTranslation()
  const openEvolution = useContext(EvolutionContext)
  const discovered = useContext(DiscoveryContext)
  const inventory = useSaveInventory(!manual)
  const [scope, setScope] = useState('unova')
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState<{ key: string; roots: EvolutionNode[]; items: Record<string, EvolutionItemInfo | null>; failed: number } | null>(null)
  const speciesIds = [...new Set(collection.filter(pokemon => !('isEgg' in pokemon && pokemon.isEgg)).map(pokemon => pokemon.id))].sort((a, b) => a - b)
  const speciesKey = speciesIds.join(',')
  const key = `${speciesKey}:${i18n.language}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    const ids = speciesKey ? speciesKey.split(',').map(Number) : []
    let next = 0
    const roots: EvolutionNode[] = []
    let failed = 0
    async function worker() {
      while (next < ids.length && !controller.signal.aborted) {
        const id = ids[next++]
        try { roots.push(await getEvolutionFamily(await getEvolutionSpecies(id, controller.signal), controller.signal)) }
        catch { failed++ }
      }
    }
    void Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker)).then(async () => {
      const names = new Set<string>()
      function visit(node: EvolutionNode) {
        node.methods.forEach(method => { for (const item of [method.item, method.held_item]) if (item) names.add(item.name) })
        node.children.forEach(visit)
      }
      roots.forEach(visit)
      const pairs = await Promise.all([...names].map(async name => {
        try { return [name, await getEvolutionItem(name, i18n.language, controller.signal)] as const }
        catch { return [name, null] as const }
      }))
      if (!controller.signal.aborted) setData({ key, roots, items: Object.fromEntries(pairs), failed })
    })
    return () => controller.abort()
  }, [speciesKey, key, i18n.language])
  const current = data?.key === key ? data : null
  const registered = manual ? new Set(speciesIds) : caught?.caughtSpeciesIds
  const rows = current && registered ? pendingEvolutions(current.roots, new Set(speciesIds), registered).filter(row => scope === 'all' || blackWhitePokedexScope(row.target.speciesId) === scope) : []
  const needs = requiredEvolutionItems(rows)
  const labels: Record<string, string> = {}
  for (const row of rows) for (const item of [row.method.item, row.method.held_item]) {
    if (item && current?.items[item.name]) labels[item.url] = current.items[item.name]!.name
  }
  const quantity = (name: string) => {
    const gameIndex = current?.items[name]?.gameIndex
    if (gameIndex == null || inventory.inventory == null) return null
    return { bag: inventory.inventory.find(item => item.gameIndex === gameIndex)?.count ?? 0, held: inventory.held[gameIndex] ?? 0 }
  }
  return <section className="panel evolution-requirements" aria-labelledby="requirements-title">
    <div className="section-heading requirements-header"><div><span className="eyebrow">{t('evolutionRequirements.eyebrow')}</span><h2 id="requirements-title">{t('evolutionRequirements.title')}</h2></div><label className="requirements-scope">{t('evolutionRequirements.scope')}<select value={scope} onChange={event => setScope(event.target.value)}>
      <option value="unova">{t('pokedexScope.unova.label')}</option><option value="national">{t('evolutionRequirements.nationalOnly')}</option><option value="all">{t('evolutionRequirements.all')}</option>
    </select></label></div>
    <p className="hint">{t('evolutionRequirements.hint')}</p>
    <p className="hint">{t(manual ? 'evolutionRequirements.manual' : 'evolutionRequirements.inventorySave')}</p>
    {!manual && inventory.stale && <p role="status" className="notice">{t(inventory.inventory ? 'evolutionRequirements.inventoryStale' : 'evolutionRequirements.inventoryUnknown')}</p>}
    {!manual && stale && <p role="status" className="notice">{t('evolutionRequirements.collectionStale')}</p>}
    {!manual && !registered && <p className="notice">{t('evolutionRequirements.noDex')}</p>}
    {!current && <p role="status">{t('evolutionRequirements.loading')}</p>}
    {current && (current.failed > 0 || Object.values(current.items).some(item => !item)) && <p role="alert" className="notice">{t('evolutionRequirements.partial', { count: current.failed })} <button onClick={() => setAttempt(value => value + 1)}>{t('common.retry')}</button></p>}
    {current && registered && <>
      <div className="requirements-overview">
        <div><span aria-hidden="true">↗</span><strong>{new Set(rows.map(row => row.target.speciesId)).size}</strong><span>{t('evolutionRequirements.summary.species')}</span></div>
        <div><span aria-hidden="true">⇄</span><strong>{rows.filter(row => row.group === 'trade').length}</strong><span>{t('evolutionRequirements.groups.trade')}</span></div>
        <div><span aria-hidden="true">◇</span><strong>{needs.size}</strong><span>{t('evolutionRequirements.summary.items')}</span></div>
      </div>
      <details className="requirements-planning"><summary>{t('evolutionRequirements.planning')}</summary><p className="hint">{t('evolutionRequirements.allocationHint')}</p></details>
      <div className="requirements-items-heading"><h3>{t('evolutionRequirements.itemsTitle')}</h3><span className="count">{needs.size}</span></div>
      {needs.size ? <div className="evolution-item-summary">{[...needs].map(([name, required]) => {
        const available = quantity(name)
        const total = available ? available.bag + available.held : null
        const missing = total == null ? null : Math.max(0, required - total)
        return <article key={name} className={missing === 0 && !inventory.stale ? 'item-sufficient' : missing && !inventory.stale ? 'item-missing' : ''}>
          <div className="requirement-item-name"><EvolutionItemIcon key={name} name={name} label={current.items[name]?.name ?? name.replaceAll('-', ' ')} /><strong>{current.items[name]?.name ?? name.replaceAll('-', ' ')}</strong></div>
          <p>{t('evolutionRequirements.required', { count: required })}</p>
          {available ? <><p>{t('evolutionRequirements.available', available)}</p><strong>{missing ? t('evolutionRequirements.missing', { count: missing }) : t('evolutionRequirements.sufficient')}</strong></> : <p>{t('evolutionRequirements.quantityUnknown')}</p>}
        </article>
      })}</div> : <p className="hint">{t('evolutionRequirements.noItems')}</p>}
      <div className="requirements-routes">{(['trade', 'item'] as const).map(group => <section key={group} className="evolution-requirements-group" aria-label={t(`evolutionRequirements.groups.${group}`)}>
        <h3><span className="requirements-group-symbol" aria-hidden="true">{group === 'trade' ? '⇄' : '◇'}</span>{t(`evolutionRequirements.groups.${group}`)} <span className="count">{rows.filter(row => row.group === group).length}</span></h3>
        {group === 'trade' && rows.some(row => row.group === group) && <p className="hint">{t('evolutionRequirements.tradeHint')}</p>}
        {!rows.some(row => row.group === group) && <p className="hint">{t('evolutionRequirements.emptyGroup')}</p>}
        <ul>{rows.filter(row => row.group === group).map(row => {
          const item = row.method.item ?? row.method.held_item
          const sourceSprite = collection.find(pokemon => pokemon.id === row.source.speciesId)?.sprite
          const targetDiscovered = discovered.has(row.target.speciesId)
          return <li key={`${row.source.speciesId}-${row.target.speciesId}-${JSON.stringify(row.method)}`}>
          <div className="evolution-requirement-heading"><span className="requirement-route-label">{t(`evolutionRequirements.groups.${group}`)}</span><PokedexScopeBadge speciesId={row.target.speciesId} /></div>
          <div className="requirement-route">
            <div><span className="requirement-portrait">{sourceSprite ? <img src={sourceSprite} alt="" loading="lazy" /> : <span aria-hidden="true">●</span>}</span><strong>{pokemonDisplayName(row.source.name)}</strong><small>#{String(row.source.speciesId).padStart(3, '0')}</small></div>
            <span className="requirement-transition">{item && <EvolutionItemIcon key={item.name} name={item.name} label={current.items[item.name]?.name ?? item.name.replaceAll('-', ' ')} />}<span className="requirement-arrow" aria-hidden="true">→</span></span>
            <div><span className={`requirement-portrait ${targetDiscovered ? '' : 'requirement-target'}`}>{targetDiscovered ? <CapturedPokemonIcon speciesId={row.target.speciesId} /> : <span aria-label={t('pokemonCard.notDiscovered')}>?</span>}</span><strong>{pokemonDisplayName(row.target.name)}</strong><small>#{String(row.target.speciesId).padStart(3, '0')}</small></div>
          </div>
          <p className="requirement-method">{evolutionMethodLabel(t, evolutionMethodFacts(row.method, row.target.speciesId, labels))}</p>
          {row.target.methods.some(method => method !== row.method && !method.item && !method.held_item && method.trigger.name !== 'trade') && <p className="hint">{t('evolutionRequirements.alternative')}</p>}
          <button className="requirement-open" onClick={() => openEvolution(row.source.speciesId)}>{t('evolutionRequirements.viewEvolution')} <span aria-hidden="true">↗</span></button>
        </li>})}</ul>
      </section>)}</div>
    </>}
  </section>
}
