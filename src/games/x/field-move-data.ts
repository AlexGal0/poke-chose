import data from './data/field-moves.json' with { type: 'json' }

export const publicFieldMoves = data as Record<string, string[]>
