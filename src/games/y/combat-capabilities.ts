import type { GameCombatCapabilities, CombatReaderCapabilities } from '../core/combat-capabilities.ts'

export const yCombatCapabilities: GameCombatCapabilities = {
  gameId: 'y',
  formats: [
    { kind: 'general', id: 'single' },
    { kind: 'general', id: 'double' },
    { kind: 'general', id: 'horde' },
    { kind: 'special', gameId: 'y', id: 'triple' },
    { kind: 'special', gameId: 'y', id: 'rotation' },
  ],
}

// Local Y/Citra profile; not a promise of support for other executable revisions.
export const yBattleReaderCapabilities: CombatReaderCapabilities = {
  gameId: 'y',
  readerId: 'y-citra-battle',
  formats: [{ kind: 'general', id: 'single' }, { kind: 'general', id: 'double' }, { kind: 'general', id: 'horde' }],
}
