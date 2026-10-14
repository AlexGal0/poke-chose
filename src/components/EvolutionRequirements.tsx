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
import './EvolutionRequirements.css'

export function EvolutionRequirements({ collection, caught, manual, stale }: { collection: readonly Pokemon[]; caught: PokedexState | null; manual: boolean; stale: boolean }) {
  const { t, i18n } = useTranslation()
  const openEvolution = useContext(EvolutionContext)
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
    <div className="section-heading"><h2 id="requirements-title">{t('evolutionRequirements.title')}</h2><select aria-label={t('evolutionRequirements.scope')} value={scope} onChange={event => setScope(event.target.value)}>
      <option value="unova">{t('pokedexScope.unova.label')}</option><option value="national">{t('evolutionRequirements.nationalOnly')}</option><option value="all">{t('evolutionRequirements.all')}</option>
    </select></div>
    <p className="hint">{t('evolutionRequirements.hint')}</p>
    <p className="hint">{t(manual ? 'evolutionRequirements.manual' : 'evolutionRequirements.inventorySave')}</p>
    {!manual && inventory.stale && <p role="status" className="notice">{t(inventory.inventory ? 'evolutionRequirements.inventoryStale' : 'evolutionRequirements.inventoryUnknown')}</p>}
    {!manual && stale && <p role="status" className="notice">{t('evolutionRequirements.collectionStale')}</p>}
    {!manual && !registered && <p className="notice">{t('evolutionRequirements.noDex')}</p>}
    {!current && <p role="status">{t('evolutionRequirements.loading')}</p>}
    {current && (current.failed > 0 || Object.values(current.items).some(item => !item)) && <p role="alert" className="notice">{t('evolutionRequirements.partial', { count: current.failed })} <button onClick={() => setAttempt(value => value + 1)}>{t('common.retry')}</button></p>}
    {current && registered && <>
      <h3>{t('evolutionRequirements.itemsTitle')}</h3>
      {needs.size ? <div className="evolution-item-summary">{[...needs].map(([name, required]) => {
        const available = quantity(name)
        const total = available ? available.bag + available.held : null
        const missing = total == null ? null : Math.max(0, required - total)
        return <article key={name} className={missing === 0 && !inventory.stale ? 'item-sufficient' : missing && !inventory.stale ? 'item-missing' : ''}>
          <strong>{current.items[name]?.name ?? name.replaceAll('-', ' ')}</strong>
          <p>{t('evolutionRequirements.required', { count: required })}</p>
          {available ? <><p>{t('evolutionRequirements.available', available)}</p><strong>{missing ? t('evolutionRequirements.missing', { count: missing }) : t('evolutionRequirements.sufficient')}</strong></> : <p>{t('evolutionRequirements.quantityUnknown')}</p>}
        </article>
      })}</div> : <p className="hint">{t('evolutionRequirements.noItems')}</p>}
      <p className="hint">{t('evolutionRequirements.allocationHint')}</p>
      {(['trade', 'item'] as const).map(group => <section key={group} className="evolution-requirements-group" aria-label={t(`evolutionRequirements.groups.${group}`)}>
        <h3>{t(`evolutionRequirements.groups.${group}`)} <span className="count">{rows.filter(row => row.group === group).length}</span></h3>
        {group === 'trade' && rows.some(row => row.group === group) && <p className="hint">{t('evolutionRequirements.tradeHint')}</p>}
        {!rows.some(row => row.group === group) && <p className="hint">{t('evolutionRequirements.emptyGroup')}</p>}
        <ul>{rows.filter(row => row.group === group).map(row => <li key={`${row.source.speciesId}-${row.target.speciesId}-${JSON.stringify(row.method)}`}>
          <div className="evolution-requirement-heading"><strong>{pokemonDisplayName(row.source.name)} → {pokemonDisplayName(row.target.name)}</strong><PokedexScopeBadge speciesId={row.target.speciesId} /></div>
          <p>{evolutionMethodLabel(t, evolutionMethodFacts(row.method, row.target.speciesId, labels))}</p>
          {row.target.methods.some(method => method !== row.method && !method.item && !method.held_item && method.trigger.name !== 'trade') && <p className="hint">{t('evolutionRequirements.alternative')}</p>}
          <button onClick={() => openEvolution(row.source.speciesId)}>{t('evolutionRequirements.viewEvolution')}</button>
        </li>)}</ul>
      </section>)}
    </>}
  </section>
}
