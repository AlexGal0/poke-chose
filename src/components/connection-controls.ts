export function showConnectionControls() {
  const controls = document.getElementById('connection-settings')
  let ancestor = controls?.parentElement
  while (ancestor) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true
    ancestor = ancestor.parentElement
  }
  controls?.querySelector<HTMLElement>('select, button, input')?.focus({ preventScroll: true })
  controls?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' })
}
