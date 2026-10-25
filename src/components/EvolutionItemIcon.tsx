import { useState } from 'react'

export function EvolutionItemIcon({ name, label }: { name: string; label: string }) {
  const [failed, setFailed] = useState(false)
  return <span className="evolution-item-icon" title={label}>
    {failed ? <span aria-hidden="true">◇</span> : <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${name}.png`} alt={label} width="32" height="32" loading="lazy" onError={() => setFailed(true)} />}
  </span>
}
