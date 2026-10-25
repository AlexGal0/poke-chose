import { useId, useState } from 'react'
import './EncounterNotice.css'

export function EncounterNotice({ kind, message }: { kind: 'unique' | 'later'; message: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <span className={`encounter-notice ${kind}${open ? ' open' : ''}`}>
    <button type="button" aria-label={message} aria-describedby={id} aria-expanded={open} onClick={() => setOpen(value => !value)} onBlur={() => setOpen(false)} onKeyDown={event => { if (event.key === 'Escape') { setOpen(false); event.currentTarget.blur() } }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {kind === 'unique' ? <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></> : <><path d="m5 17 14-14M8 3h11v11" /><path d="M5 7v14h14" /></>}
      </svg>
    </button>
    <span id={id} role="tooltip" className="encounter-notice-tooltip">{message}</span>
  </span>
}
