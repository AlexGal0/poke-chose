import { createXYSaveReader, XY_SAVE_SIZE } from '../xy/save-pokedex.ts'

export const Y_SAVE_SIZE = XY_SAVE_SIZE
export const ySaveReader = createXYSaveReader(25)
export const readYSavePokedex = ySaveReader.parse
export const readYSavePokemon = ySaveReader.parsePokemon
export const readYSaveInventory = ySaveReader.parseInventory
export const readYSaveDaycare = ySaveReader.parseDaycare
export const ySavePokedexReader = { byteLength: Y_SAVE_SIZE, parse: readYSavePokedex }
