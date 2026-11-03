import { itemWikiLink } from '../i18n/item-wiki'
import type { EvolutionRequirementsService, EvolutionInventory, EvolutionRequirementItem } from '../games/core/evolution-requirements'
import type { ReactNode } from 'react'
import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pendingEvolutions, requiredEvolutionItems } from '../domain/evolution-requirements'
import { evolutionMethodLabel } from '../i18n/evolution'
import { pokemonDisplayName } from '../domain/pokemon-names'
import type { EvolutionNode } from '../models/evolution'
import type { ManualPokemon } from '../games/core/catalog'
import type { PokedexState } from '../models/pokedex'
import { DiscoveryContext } from './discovery-context'
import { EvolutionItemIcon } from './EvolutionItemIcon'
import './EvolutionRequirements.css'

export function EvolutionRequirements({ collection, caught, manual, stale, service, inventory, openEvolution, renderScopeBadge, renderSpeciesSprite }: {
  collection: readonly ManualPokemon[]
  caught: PokedexState | null
  manual: boolean
  stale: boolean
  service: EvolutionRequirementsService
  inventory: EvolutionInventory
  openEvolution: (speciesId: number) => void
  renderScopeBadge?: (speciesId: number) => ReactNode
  renderSpeciesSprite?: (speciesId: number) => ReactNode
}) {
  const { t, i18n } = useTranslation()
  const discovered = useContext(DiscoveryContext)
  const [scope, setScope] = useState(service.defaultScope)
  const [attempt, setAttempt] = useState(0)
  const [data, setData] = useState<{ service: EvolutionRequirementsService; key: string; roots: EvolutionNode[]; labels: Record<string, string>; sprites: Record<number, string | null>; items: Record<string, EvolutionRequirementItem | null>; failed: number } | null>(null)
  const speciesIds = [...new Set(collection.filter(pokemon => !('isEgg' in pokemon && pokemon.isEgg)).map(pokemon => pokemon.id))].sort((a, b) => a - b)
  const speciesKey = speciesIds.join(',')
  const key = `${speciesKey}:${i18n.language}:${attempt}`
  useEffect(() => {
    const controller = new AbortController()
    const ids = speciesKey ? speciesKey.split(',').map(Number) : []
    let next = 0
    const roots: EvolutionNode[] = []
    const labels: Record<string, string> = {}
    const sprites: Record<number, string | null> = {}
    let failed = 0
    async function worker() {
      while (next < ids.length && !controller.signal.aborted) {
        const id = ids[next++]
        try {
          const family = await service.family(id, i18n.language, controller.signal)
          roots.push(family.root)
          Object.assign(labels, family.labels)
          Object.assign(sprites, family.sprites)
        }
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
        try { return [name, await service.item(name, i18n.language, controller.signal)] as const }
        catch { return [name, null] as const }
      }))
      if (!controller.signal.aborted) setData({ service, key, roots, labels, sprites, items: Object.fromEntries(pairs), failed })
    })
    return () => controller.abort()
  }, [service, speciesKey, key, i18n.language])
  const current = data?.service === service && data?.key === key ? data : null
  const registered = manual ? new Set(speciesIds) : caught?.caughtSpeciesIds
  const rows = current && registered ? pendingEvolutions(current.roots, new Set(speciesIds), registered).filter(row => service.inScope(row.target.speciesId, scope)) : []
  const needs = requiredEvolutionItems(rows)
  const labels: Record<string, string> = { ...current?.labels }
  for (const row of rows) for (const item of [row.method.item, row.method.held_item]) {
    if (item && current?.items[item.name]) labels[item.url] = current.items[item.name]!.name
  }
  const quantity = (name: string) => {
    const inventoryKey = current?.items[name]?.inventoryKey
    return manual || inventoryKey == null || !inventory.quantities ? null : inventory.quantities[inventoryKey] ?? { bag: 0, held: 0 }
  }
  return <section className="panel evolution-requirements" aria-labelledby="requirements-title">
    <div className="section-heading requirements-header"><div><span className="eyebrow">{t('evolutionRequirements.eyebrow')}</span><h2 id="requirements-title">{t('evolutionRequirements.title')}</h2></div><label className="requirements-scope">{t('evolutionRequirements.scope')}<select value={scope} onChange={event => setScope(event.target.value)}>
      {service.scopes.map(option => <option key={option.id} value={option.id}>{t(option.labelKey)}</option>)}
    </select></label></div>
    <p className="hint">{t('evolutionRequirements.hint')}</p>
    <p className="hint">{t(manual ? 'evolutionRequirements.manual' : service.inventoryHintKey ?? 'evolutionRequirements.inventorySave')}</p>
    {!manual && inventory.stale && <p role="status" className="notice">{t(inventory.quantities ? 'evolutionRequirements.inventoryStale' : 'evolutionRequirements.inventoryUnknown')}</p>}
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
        const label = current.items[name]?.name ?? name.replaceAll('-', ' ')
        const wiki = itemWikiLink(label, i18n.language)
        const available = quantity(name)
        const total = available ? available.bag + available.held : null
        const missing = total == null ? null : Math.max(0, required - total)
        return <article key={name} className={missing === 0 && !inventory.stale ? 'item-sufficient' : missing && !inventory.stale ? 'item-missing' : ''}>
          <div className="requirement-item-name"><EvolutionItemIcon key={name} name={name} label={current.items[name]?.name ?? name.replaceAll('-', ' ')} /><strong>{current.items[name]?.name ?? name.replaceAll('-', ' ')}</strong></div>
          <p>{t('evolutionRequirements.required', { count: required })}</p>
          {available ? <><p>{t('evolutionRequirements.available', available)}</p><strong>{missing ? t('evolutionRequirements.missing', { count: missing }) : t('evolutionRequirements.sufficient')}</strong></> : <p>{t('evolutionRequirements.quantityUnknown')}</p>}
          <a className="requirement-item-wiki" href={wiki.href} target="_blank" rel="noopener noreferrer" aria-label={t('evolutionRequirements.itemWikiAria', { name: label, site: wiki.site })} title={t('evolutionRequirements.itemWiki', { site: wiki.site })}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M14 3h7v7M21 3l-10 10" /><path d="M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></svg></a>
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
          <div className="evolution-requirement-heading"><span className="requirement-route-label">{t(`evolutionRequirements.groups.${group}`)}</span>{renderScopeBadge?.(row.target.speciesId)}</div>
          <div className="requirement-route">
            <div><span className="requirement-portrait">{sourceSprite ? <img src={sourceSprite} alt="" loading="lazy" /> : <span aria-hidden="true">●</span>}</span><strong>{pokemonDisplayName(row.source.name)}</strong><small>#{String(row.source.speciesId).padStart(3, '0')}</small></div>
            <span className="requirement-transition">{item && <EvolutionItemIcon key={item.name} name={item.name} label={current.items[item.name]?.name ?? item.name.replaceAll('-', ' ')} />}<span className="requirement-arrow" aria-hidden="true">→</span></span>
            <div><span className={`requirement-portrait ${targetDiscovered ? '' : 'requirement-target'}`}>{targetDiscovered ? row.target.speciesId in current.sprites ? current.sprites[row.target.speciesId] ? <img src={current.sprites[row.target.speciesId]!} alt="" loading="lazy" /> : null : renderSpeciesSprite?.(row.target.speciesId) : <span aria-label={t('pokemonCard.notDiscovered')}>?</span>}</span><strong>{pokemonDisplayName(row.target.name)}</strong><small>#{String(row.target.speciesId).padStart(3, '0')}</small></div>
          </div>
          <p className="requirement-method">{evolutionMethodLabel(t, service.methodFacts(row.method, row.target.speciesId, labels))}</p>
          {row.target.methods.some(method => method !== row.method && !method.item && !method.held_item && method.trigger.name !== 'trade') && <p className="hint">{t('evolutionRequirements.alternative')}</p>}
          <button className="requirement-open" onClick={() => openEvolution(row.source.speciesId)}>{t('evolutionRequirements.viewEvolution')} <span aria-hidden="true">↗</span></button>
        </li>})}</ul>
      </section>)}</div>
    </>}
  </section>
}
