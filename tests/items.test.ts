import test from 'node:test'
import assert from 'node:assert/strict'
import { blackWhiteItemIndices, getHeldItemName } from '../src/api/items.ts'

test('held item names translate Generation V game indices instead of assuming API IDs', async () => {
  assert.deepEqual(blackWhiteItemIndices('item_id,generation_id,game_index\n100,4,243\n200,5,243\n201,5,26\n300,6,26\n'), { 243: 200, 26: 201 })
  assert.throws(() => blackWhiteItemIndices('item_id,generation_id,game_index\n100,4,243'))
  assert.equal(await getHeldItemName(0), 'Sin objeto')
})
