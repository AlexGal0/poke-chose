import type { SpeciesGender } from '../domain/gender'

export function GenderSymbol({ kind, loading = false }: { kind?: SpeciesGender['kind'] | null; loading?: boolean }) {
  if (!kind) return <span aria-hidden="true">{loading ? '…' : '?'}</span>
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'male' && <><circle cx="9" cy="15" r="6" /><path d="m13.2 10.8 7-7M15 3h6v6" /></>}
    {kind === 'female' && <><circle cx="12" cy="8" r="5" /><path d="M12 13v9M8 18h8" /></>}
    {kind === 'genderless' && <><circle cx="12" cy="10" r="6" /><path d="M12 16v6" /></>}
    {kind === 'both' && <><circle cx="6" cy="15" r="4" /><path d="m9 12 5-7M10 5h4v4" /><circle cx="17" cy="10" r="4" /><path d="M17 14v8M14 18h6" /></>}
  </svg>
}
