import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

export function useTeamReorderAnimation(grid: RefObject<HTMLDivElement | null>, keys: string[], visible: boolean) {
  const previous = useRef<{ order: string; width: number; positions: Map<string, { left: number; top: number; width: number }> } | null>(null)
  const animations = useRef<Animation[]>([])
  const order = JSON.stringify(keys)
  useLayoutEffect(() => {
    const element = grid.current
    if (!element || !visible) {
      previous.current = null
      return
    }
    const ids: string[] = JSON.parse(order)
    const cards = Array.from(element.children).slice(0, ids.length) as HTMLElement[]
    animations.current.forEach(animation => animation.cancel())
    animations.current = []
    const bounds = element.getBoundingClientRect()
    const width = bounds.width
    const positions = new Map(ids.map((id, index) => {
      const rect = cards[index].getBoundingClientRect()
      return [id, { left: rect.left - bounds.left, top: rect.top - bounds.top, width: rect.width }]
    }))
    const before = previous.current
    if (before && before.order !== order && before.width === width && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cards.forEach((card, index) => {
        const from = before.positions.get(ids[index])
        const to = positions.get(ids[index])!
        if (!from || !from.width || !to.width) return
        const x = from.left - to.left
        const y = from.top - to.top
        if (!x && !y) return
        animations.current.push(card.animate([
          { transform: `translate(${x}px, ${y}px)` },
          { transform: 'translate(0, 0)' },
        ], { duration: 380, easing: 'cubic-bezier(.2,.8,.2,1)' }))
      })
    }
    previous.current = { order, width, positions }
  }, [grid, order, visible])
  useLayoutEffect(() => () => animations.current.forEach(animation => animation.cancel()), [])
}
