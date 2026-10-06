import { useId } from 'react'
import type { AcquisitionTag } from '../domain/acquisition'
import './AcquisitionIcons.css'

export function AcquisitionIcons({ tags, error, onRetry }: { tags?: AcquisitionTag[]; error?: boolean; onRetry: () => void }) {
  const id = useId()
  if (error) return <div className="acquisition-icons"><button className="acquisition-icon" type="button" onClick={onRetry} aria-label="No se pudo consultar la obtención. Reintentar" title="No se pudo consultar la obtención. Reintentar"><span aria-hidden="true">↻</span></button></div>
  return <div className="acquisition-icons" role="group" aria-label="Formas de obtención en Pokémon Black">
    {(tags ?? [{ kind: 'loading', icon: '⌛', label: 'Consultando formas de obtención…' }]).map(tag => <span className="acquisition-icon" key={tag.kind} tabIndex={0} aria-label={tag.label} aria-describedby={`${id}-${tag.kind}`} data-acquisition={tag.kind}>
      <span aria-hidden="true">{tag.icon}</span><span className="acquisition-tooltip" role="tooltip" id={`${id}-${tag.kind}`}>{tag.label}</span>
    </span>)}
  </div>
}
