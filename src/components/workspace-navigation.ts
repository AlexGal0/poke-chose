// Keep the four frequent destinations and reveal occasional tools one at a time.
// Width is the navigation container, not the monitor or a particular game's name.
export function promotedToolCount(width: number, primaryCount: number, toolCount: number): number {
  if (!Number.isFinite(width) || width <= 0) return 0
  return Math.min(toolCount, Math.max(0, Math.floor((width - primaryCount * 140 - 148) / 140)))
}
