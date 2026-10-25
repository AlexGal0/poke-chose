import { useEffect, useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'

// Animate positions only: health updates and the first reading never replay the movement.
export function ReorderGrid({ itemKeys, className, children }: { itemKeys: readonly string[]; className: string; children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const previous = useRef(new Map<string, { x: number; y: number }>())
  const previousOrder = useRef('')
  const animations = useRef(new Map<HTMLElement, Animation>())
  useLayoutEffect(() => {
    const grid = container.current
    if (!grid) return
    const running = animations.current
    const order = JSON.stringify(itemKeys)
    const changed = previousOrder.current !== order
    const next = new Map<string, { x: number; y: number }>()
    const visible = grid.getClientRects().length > 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    Array.from(grid.children).forEach((child, index) => {
      if (!(child instanceof HTMLElement) || !visible) return
      const key = itemKeys[index]
      if (!key || itemKeys.indexOf(key) !== itemKeys.lastIndexOf(key)) return
      const position = { x: child.offsetLeft, y: child.offsetTop }
      next.set(key, position)
      const before = previous.current.get(key)
      if (!before || !changed) return
      const current = running.has(child) ? new DOMMatrixReadOnly(getComputedStyle(child).transform) : null
      const dx = before.x + (current?.m41 ?? 0) - position.x
      const dy = before.y + (current?.m42 ?? 0) - position.y
      running.get(child)?.cancel()
      running.delete(child)
      if (reduced || (!dx && !dy)) return
      const animation = child.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' },
      ], { duration: 420, easing: 'cubic-bezier(.22, 1, .36, 1)' })
      running.set(child, animation)
      animation.onfinish = () => { if (running.get(child) === animation) running.delete(child) }
    })
    for (const [child, animation] of running) {
      if (!grid.contains(child) || !visible || reduced) { animation.cancel(); running.delete(child) }
    }
    previous.current = next
    previousOrder.current = order
  })
  useEffect(() => {
    const running = animations.current
    return () => { for (const animation of running.values()) animation.cancel(); running.clear() }
  }, [])
  return <div ref={container} className={className}>{children}</div>
}
