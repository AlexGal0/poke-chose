export function showConnectionControls() {
  const controls = document.getElementById('connection-settings')
  const details = controls?.closest('details')
  if (details) details.open = true
  controls?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' })
}
