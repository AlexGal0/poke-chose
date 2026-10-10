import { useTranslation } from 'react-i18next'
import { useId } from 'react'
import { FIELD_MOVES } from '../domain/field-moves'
import type { FieldMove } from '../domain/field-moves'
import { fieldMoveLabel } from '../i18n/field-moves'
import './FieldMoveFilter.css'

export function FieldMoveFilter({ selected, onChange, loading, error, onRetry }: {
  selected: FieldMove[]; onChange: (moves: FieldMove[]) => void; loading: boolean; error: boolean; onRetry: () => void
}) {
  const { t } = useTranslation()
  const labelId = useId()
  return <div className="field-move-filter">
    <p className="field-move-label" id={labelId}>{t('fieldMoves.label')}</p>
    <div className="field-move-buttons" role="group" aria-labelledby={labelId}>
      {FIELD_MOVES.map(move => {
        const checked = selected.includes(move)
        const label = fieldMoveLabel(t, move)
        return <button key={move} type="button" className="field-move-button" data-move={move} aria-label={label} title={label} aria-pressed={checked} onClick={() => onChange(checked ? selected.filter(value => value !== move) : [...selected, move])}>
          <FieldMoveIcon move={move} />
        </button>
      })}
    </div>
    {loading && <p className="hint" role="status">{t('fieldMoves.loading')}</p>}
    {error && <div className="notice" role="alert">{t('fieldMoves.error')} <button onClick={onRetry}>{t('fieldMoves.retry')}</button></div>}
  </div>
}

function FieldMoveIcon({ move }: { move: FieldMove }) {
  const shapes = {
    cut: <><circle cx="6" cy="7" r="3" /><circle cx="6" cy="17" r="3" /><path d="m8.5 8.5 12 12m-12-5 12-12M12 12l3-3" /></>,
    fly: <><path d="M3 16c8 0 9-11 18-12-1 5-4 8-8 10l4 1c-3 4-8 6-14 4zM5 17l9-7" /></>,
    surf: <><path d="M3 17c3-3 5 3 8 0s5 3 10 0M3 21c3-3 5 3 8 0s5 3 10 0M4 13c5-8 9-10 14-8-4 0-5 4-2 6-4-2-7-1-9 2" /></>,
    strength: <><path d="m4 12 4-5h8l4 5-2 8H6zM12 13V2m-3 3 3-3 3 3" /></>,
    waterfall: <><path d="M3 4h8v11M7 4v10M15 4h6M18 16V7m-3 3 3-3 3 3M3 20c3-3 5 3 8 0s5 3 10 0" /></>,
    dive: <><path d="M3 5c3-3 5 3 8 0s5 3 10 0M12 9v12m-4-4 4 4 4-4M3 13v7m18-7v7" /></>,
    flash: <><path d="m13 2-8 12h6l-1 8 9-13h-6zM3 3l2 2m14 14 2 2M2 9h2m16 6h2" /></>,
    dig: <><path d="m13 4 3-2 5 5-2 3zM16 7l-7 7m-4-3 8 8-4 3-7-7zM15 22h7M19 18h2" /></>,
  }
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[move]}</svg>
}
