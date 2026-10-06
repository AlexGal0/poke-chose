import { useEffect, useState } from 'react'
import { getHeldItemName } from '../api/items'

export function HeldItem({ itemId }: { itemId: number }) {
  const [result, setResult] = useState<{ id: number; name: string; error: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    void getHeldItemName(itemId).then(name => {
      if (active) setResult({ id: itemId, name, error: false })
    }).catch(() => {
      if (active) setResult({ id: itemId, name: 'Objeto no disponible', error: true })
    })
    return () => { active = false }
  }, [itemId, attempt])
  const current = result?.id === itemId ? result : null
  return <small className="held-item">{itemId === 0 ? 'Sin objeto' : current?.error
    ? <button type="button" onClick={() => setAttempt(value => value + 1)} title="Reintentar consulta del objeto">Objeto no disponible · Reintentar</button>
    : current?.name ?? 'Consultando objeto…'}</small>
}
