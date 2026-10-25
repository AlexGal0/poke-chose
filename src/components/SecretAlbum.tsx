import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { pokemonDisplayName } from '../domain/pokemon-names'
import type { ManualPokemon as Pokemon } from '../games/core/catalog'
import type { AlbumService } from '../games/core/album'
import { TypeBadge } from './TypeBadge'
import { AlbumArtwork } from './AlbumArtwork'
import './SecretAlbum.css'


function mosaicColumns(width: number, height: number, service: AlbumService) {
  return width >= height ? service.columns?.landscape ?? 24 : service.columns?.portrait ?? 13
}

function tilt(event: PointerEvent<HTMLButtonElement>) {
  if (event.pointerType !== 'mouse') return
  const box = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - box.left) / box.width
  const y = (event.clientY - box.top) / box.height
  event.currentTarget.style.setProperty('--tilt-x', `${(0.5 - y) * 16}deg`)
  event.currentTarget.style.setProperty('--tilt-y', `${(x - 0.5) * 16}deg`)
  event.currentTarget.style.setProperty('--shine-x', `${x * 100}%`)
  event.currentTarget.style.setProperty('--shine-y', `${y * 100}%`)
}

function AlbumCardFace({ pokemon }: { pokemon: Pokemon | null }) {
  return <>
    <span className="album-card-art">{pokemon?.sprite ? <img src={pokemon.sprite} alt="" width="96" height="96" loading="lazy" /> : <span aria-hidden="true">?</span>}</span>
    {pokemon && <strong>{pokemonDisplayName(pokemon.name)}</strong>}
  </>
}

function Album({ owned, seen, onClose, service }: { owned: ReadonlySet<number>; seen: ReadonlySet<number>; onClose: () => void; service: AlbumService }) {
  const regionalIds = service.speciesIds
  const { t, i18n } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const lastCard = useRef<HTMLButtonElement | null>(null)
  const expandedCard = useRef<HTMLElement | null>(null)
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cards, setCards] = useState<Record<number, Pokemon>>({})
  const [attempt, setAttempt] = useState(0)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [selected, setSelected] = useState<{ id: number; x: number; y: number } | null>(null)
  const [returnMotion, setReturnMotion] = useState<{ x: number; y: number; left: number; top: number; width: number; height: number; scale: number } | null>(null)
  const [description, setDescription] = useState<{ key: string; text: string | null; failed: boolean } | null>(null)
  const detailHeading = useRef<HTMLHeadingElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelClose = () => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = null }
  const [columns, setColumns] = useState(() => mosaicColumns(window.innerWidth, window.innerHeight, service))
  const known = new Set([...owned, ...seen])
  const knownKey = regionalIds.filter(id => known.has(id)).join(',')
  const descriptionKey = `${selected?.id}:${i18n.language}:${attempt}`
  useEffect(() => {
    const viewport = window.visualViewport
    const resize = () => setColumns(mosaicColumns(viewport?.width ?? window.innerWidth, viewport?.height ?? window.innerHeight, service))
    window.addEventListener('resize', resize)
    viewport?.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); viewport?.removeEventListener('resize', resize) }
  }, [service])
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    return () => { if (closeTimer.current) clearTimeout(closeTimer.current); if (returnTimer.current) clearTimeout(returnTimer.current); element.close(); document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    const ids = knownKey ? knownKey.split(',').map(Number) : []
    let next = 0
    let failed = false
    async function worker() {
      while (next < ids.length && !controller.signal.aborted) {
        const id = ids[next++]
        try {
          const pokemon = await service.get(id, controller.signal)
          if (!controller.signal.aborted) setCards(previous => ({ ...previous, [id]: pokemon }))
        } catch { failed = true }
      }
    }
    void Promise.all(Array.from({ length: Math.min(6, ids.length) }, worker)).then(() => {
      if (!controller.signal.aborted) setLoadState(failed ? 'error' : 'ready')
    })
    return () => controller.abort()
  }, [knownKey, attempt, service])
  useEffect(() => {
    if (!selected) return
    const controller = new AbortController()
    service.description(selected.id, i18n.language, controller.signal).then(text => {
      if (!controller.signal.aborted) setDescription({ key: descriptionKey, text, failed: false })
    }).catch(() => {
      if (!controller.signal.aborted) setDescription({ key: descriptionKey, text: null, failed: true })
    })
    return () => controller.abort()
  }, [selected, i18n.language, descriptionKey, service])
  useEffect(() => {
    if (selected) detailHeading.current?.focus()
    else lastCard.current?.focus()
  }, [selected])
  const pokemon = selected && known.has(selected.id) ? cards[selected.id] : null
  const text = description?.key === descriptionKey ? description : null
  function finishReturn() {
    if (returnTimer.current) clearTimeout(returnTimer.current)
    returnTimer.current = null
    setSelected(null)
    setReturnMotion(null)
  }
  function returnToGrid() {
    if (returnMotion) return
    const target = lastCard.current?.getBoundingClientRect()
    const card = expandedCard.current
    if (!target || !card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finishReturn(); return }
    setReturnMotion({ x: target.left + target.width / 2 - window.innerWidth / 2, y: target.top + target.height / 2 - window.innerHeight / 2, left: target.left, top: target.top, width: target.width, height: target.height, scale: Math.min(card.offsetWidth / target.width, card.offsetHeight / target.height) })
    returnTimer.current = setTimeout(finishReturn, 250)
  }
  return createPortal(<dialog ref={dialog} className="secret-album" aria-labelledby="album-title" onCancel={event => { event.preventDefault(); if (selected) returnToGrid(); else onClose() }}>
    <h2 id="album-title" className="album-sr-only">{t('secretAlbum.title', { region: service.region })}</h2>
    <div className="album-sr-only" inert={selected !== null}>
      {loadState === 'loading' && <span role="status">{t('secretAlbum.loading')}</span>}
    </div>
    {loadState === 'error' && <button className="album-retry" inert={selected !== null} onClick={() => setAttempt(value => value + 1)} aria-label={`${t('secretAlbum.loadFailed')} ${t('common.retry')}`}>↻</button>}
    <div className="album-grid" style={{ '--album-columns': columns, '--album-rows': Math.ceil(regionalIds.length / columns) } as CSSProperties} inert={selected !== null} aria-hidden={selected !== null} onPointerDownCapture={event => { if (event.button === 0) { cancelClose(); closeTimer.current = setTimeout(onClose, 900) } }} onPointerUpCapture={cancelClose} onPointerCancel={cancelClose} onPointerLeave={cancelClose} onContextMenu={event => event.preventDefault()}>
      {regionalIds.map(id => {
        const member = known.has(id) ? cards[id] : null
        return <button key={id} className={`album-card ${selected?.id === id ? 'album-card-in-flight' : ''} ${member ? `type-${member.types[0]} ${owned.has(id) ? '' : 'album-card-seen'}` : 'album-card-locked'}`} disabled={!member} aria-label={member ? t(owned.has(id) ? 'secretAlbum.openCard' : 'secretAlbum.openSeenCard', { name: pokemonDisplayName(member.name) }) : t(known.has(id) ? 'secretAlbum.cardLoading' : 'secretAlbum.locked', { number: id })} onPointerMove={tilt} onPointerLeave={event => { event.currentTarget.style.setProperty('--tilt-x', '0deg'); event.currentTarget.style.setProperty('--tilt-y', '0deg') }} onClick={event => {
          const rect = event.currentTarget.getBoundingClientRect()
          lastCard.current = event.currentTarget
          setSelected({ id, x: rect.left + rect.width / 2 - window.innerWidth / 2, y: rect.top + rect.height / 2 - window.innerHeight / 2 })
        }}>
          <AlbumCardFace pokemon={member ?? null} />
        </button>
      })}
    </div>
    {pokemon && selected && <div className={`album-detail-backdrop ${returnMotion ? 'album-backdrop-returning' : ''}`} onClick={event => { if (event.target === event.currentTarget) returnToGrid() }}>
      {returnMotion ? <div className={`album-card album-return-tile type-${pokemon.types[0]} ${owned.has(pokemon.id) ? '' : 'album-card-seen'}`} aria-hidden="true" style={{ position: 'fixed', left: returnMotion.left, top: returnMotion.top, width: returnMotion.width, height: returnMotion.height, '--flight-x': `${-returnMotion.x}px`, '--flight-y': `${-returnMotion.y}px`, '--flight-scale': returnMotion.scale } as CSSProperties} onAnimationEnd={event => { if (event.target === event.currentTarget && event.animationName === 'album-return') finishReturn() }}><AlbumCardFace pokemon={pokemon} /></div> : <article ref={expandedCard} className={`album-detail type-${pokemon.types[0]} ${owned.has(pokemon.id) ? '' : 'album-detail-seen'}`} style={{ '--origin-x': `${selected.x}px`, '--origin-y': `${selected.y}px` } as CSSProperties} aria-labelledby="album-card-title">
        <div className="album-detail-top"><span>{service.edition}</span><button onClick={returnToGrid} aria-label={t('secretAlbum.back')}>↙</button></div>
        <span className="album-detail-number">N° {String(pokemon.id).padStart(3, '0')}</span>
        <div className="album-detail-art"><AlbumArtwork key={pokemon.id} id={pokemon.id} sprite={pokemon.sprite} animatedSprite={service.animation(pokemon)} /></div>
        <h3 id="album-card-title" tabIndex={-1} ref={detailHeading}>{pokemonDisplayName(pokemon.name)}</h3>
        <div className="album-detail-types">{pokemon.types.map(type => <TypeBadge key={type} type={type} />)}</div>
        <div className="album-description"><span>{t('secretAlbum.description')}</span><p role="status">{text ? text.text ?? t('secretAlbum.noDescription') : t('secretAlbum.loadingDescription')}</p>{text?.failed && <button onClick={() => setAttempt(value => value + 1)}>{t('common.retry')}</button>}</div>
        <footer>✦ <span>{service.region}</span> ✦</footer>
      </article>}
    </div>}
  </dialog>, document.body)
}

export function SecretAlbum({ owned, seen = owned, service }: { owned: ReadonlySet<number>; seen?: ReadonlySet<number>; service: AlbumService }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancel = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; setHolding(false) }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])
  return <>
    <button className={`album-trigger ${holding ? 'album-trigger-holding' : ''}`} aria-label={t('secretAlbum.trigger')} aria-haspopup="dialog" onPointerDown={event => {
      if (event.button !== 0) return
      cancel()
      setHolding(true)
      timer.current = setTimeout(() => { setHolding(false); setOpen(true); timer.current = null }, 750)
    }} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} onBlur={cancel} onContextMenu={event => event.preventDefault()} onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); cancel(); setOpen(true) }
    }}><span className="pokeball" aria-hidden="true" /></button>
    {open && <Album service={service} owned={owned} seen={seen} onClose={() => setOpen(false)} />}
  </>
}
