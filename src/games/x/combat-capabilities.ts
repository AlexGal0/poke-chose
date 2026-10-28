import type { GameCombatCapabilities, CombatReaderCapabilities } from '../core/combat-capabilities.ts'

export const xCombatCapabilities: GameCombatCapabilities = {
  gameId: 'x',
  formats: [
    { kind: 'general', id: 'single' },
    { kind: 'general', id: 'double' },
    { kind: 'general', id: 'horde' },
    { kind: 'special', gameId: 'x', id: 'triple' },
    { kind: 'special', gameId: 'x', id: 'rotation' },
  ],
}

// Local X/Citra profile; not a promise of support for other executable revisions.
export const xBattleReaderCapabilities: CombatReaderCapabilities = {
  gameId: 'x',
  readerId: 'x-citra-battle',
  formats: [{ kind: 'general', id: 'single' }, { kind: 'general', id: 'double' }, { kind: 'general', id: 'horde' }],
}
