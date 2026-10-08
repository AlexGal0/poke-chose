import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NatureInfo } from './NatureInfo'

export function NatureIndicator({ natureId }: { natureId?: number }) {
  const { t } = useTranslation()
  const id = useId()
  const trigger = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const pendingClose = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const cancelClose = () => clearTimeout(pendingClose.current)
  const close = () => { cancelClose(); panel.current?.hidePopover() }
  const scheduleClose = () => {
    cancelClose()
    pendingClose.current = setTimeout(() => panel.current?.hidePopover(), 150)
  }
  const show = () => {
    cancelClose()
    const bounds = trigger.current!.getBoundingClientRect()
    panel.current!.style.setProperty('--nature-top', `${bounds.bottom + 6}px`)
    panel.current!.style.setProperty('--nature-left', `${bounds.right - 240}px`)
    panel.current?.showPopover()
  }
  useEffect(() => () => clearTimeout(pendingClose.current), [])
  useEffect(() => {
    if (!open) return
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return
      panel.current?.hidePopover()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { clearTimeout(pendingClose.current); panel.current?.hidePopover() }
    }
    window.addEventListener('resize', dismiss)
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('resize', dismiss)
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('keydown', escape)
    }
  }, [open])
  return <>
    <span ref={trigger} className="nature-trigger" tabIndex={0} role="img" aria-label={t('nature.heading')} aria-describedby={id} onPointerEnter={event => { if (event.pointerType !== 'touch') show() }} onPointerLeave={scheduleClose} onFocus={show} onBlur={close}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 4C10 3 4 8 5 14c1 6 8 7 12 2 3-4 3-8 3-12Z" /><path d="M4 21 15 10" /></svg>
    </span>
    <div ref={panel} id={id} popover="manual" className="nature-popover" role="tooltip" onPointerEnter={cancelClose} onPointerLeave={scheduleClose} onToggle={event => setOpen(event.newState === 'open')}>
      <NatureInfo natureId={natureId} />
    </div>
  </>
}
