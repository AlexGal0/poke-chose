import { createXYSaveReader, XY_SAVE_SIZE } from '../xy/save-pokedex.ts'

export const X_SAVE_SIZE = XY_SAVE_SIZE
export const xSaveReader = createXYSaveReader(24)
export const readXSavePokedex = xSaveReader.parse
export const readXSavePokemon = xSaveReader.parsePokemon
export const readXSaveInventory = xSaveReader.parseInventory
export const readXSaveDaycare = xSaveReader.parseDaycare
export const xSavePokedexReader = { byteLength: X_SAVE_SIZE, parse: readXSavePokedex }
