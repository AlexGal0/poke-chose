import './BattleShortcut.css'

export function BattleShortcut({ inBattle, viewingBattle, canReturn, onClick }: { inBattle: boolean; viewingBattle: boolean; canReturn: boolean; onClick: () => void }) {
  const action = viewingBattle ? canReturn ? 'Volver a la pantalla anterior' : 'Ir a Capturas por zona' : 'Ir a Combate'
  const label = `${action} · ${inBattle ? 'Combate detectado' : 'Sin combate confirmado'}`
  return <button type="button" className={`battle-floating-button ${inBattle ? 'active' : 'inactive'}`} onClick={onClick} title={label} aria-label={label} aria-pressed={viewingBattle}>
    <svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4 3 4 1 12 12-4 4L4 8 3 4zM14 18l6-6M16 20l3 3M3 21l3-3M4 16l4 4M4 16l4-4M14 8l6-5 1 1-1 4-5 6" />
    </svg>
    {viewingBattle && <span className="battle-shortcut-return" aria-hidden="true">↩</span>}
  </button>
}
