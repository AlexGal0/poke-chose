import { useEffect, useState } from 'react'
import type { AcquisitionRoute, AcquisitionService } from '../games/core/acquisition'

export function useAcquisitionRoutes(service: AcquisitionService | undefined, ids: string) {
  const [attempt, setAttempt] = useState(0)
  const [rows, setRows] = useState<Record<number, { service: AcquisitionService; attempt: number; tags?: readonly AcquisitionRoute[]; error?: boolean }>>({})
  useEffect(() => {
    if (!service || !ids) return
    const activeService = service
    const controller = new AbortController()
    const pending = ids.split(',').map(Number)
    let next = 0
    async function worker() {
      while (!controller.signal.aborted && next < pending.length) {
        const id = pending[next++]
        try {
          const tags = await activeService.routes(id, controller.signal)
          if (!controller.signal.aborted) setRows(previous => ({ ...previous, [id]: { tags, service: activeService, attempt } }))
        } catch {
          if (!controller.signal.aborted) setRows(previous => ({ ...previous, [id]: { error: true, service: activeService, attempt } }))
        }
      }
    }
    void Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker))
    return () => controller.abort()
  }, [service, ids, attempt])
  return { get: (id: number) => rows[id]?.service === service && rows[id]?.attempt === attempt ? rows[id] : undefined, retry: () => setAttempt(value => value + 1) }
}
