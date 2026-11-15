import test from 'node:test'
import assert from 'node:assert/strict'
import { captureRoutes } from '../src/domain/capture-routes.ts'
import type { EncounterDetail } from '../src/models/encounters.ts'

const row = (method: string, min: number, max: number, chance: number | null, conditions: string[] = [], area = 'route'): EncounterDetail => ({ method, minLevel: min, maxLevel: max, chance, conditions, area })
test('Kalos walking, flowers and hordes retain their own levels and probabilities', () => {
  const input = [row('walk',25,26,10), row('yellow-flowers',25,25,10),row('yellow-flowers',26,26,10),row('yellow-flowers',27,27,10),row('horde',14,14,5)]
  const before = structuredClone(input)
  const routes = captureRoutes(input)
  assert.deepEqual(routes.map(r=>[r.method,r.levels,r.chance]), [['walk',[{min:25,max:26}],10],['yellow-flowers',[{min:25,max:27}],30],['horde',[{min:14,max:14}],5]])
  assert.deepEqual(input,before)
})
test('Black seasons, areas and dark grass remain separate and level gaps are not invented', () => {
  const routes = captureRoutes([row('walk',2,3,20,['winter']),row('walk',8,9,10,['winter']),row('walk',4,5,50,['summer']),row('dark-grass',10,12,30,['winter']),row('walk',20,22,40,['winter'],'cave')])
  assert.equal(routes.length,4)
  assert.deepEqual(routes[0].levels,[{min:2,max:3},{min:8,max:9}])
  assert.equal(routes[0].chance,30)
  assert.equal(routes[1].chance,50)
})
test('trades and unknown chances stay visible without random percentages or fabricated levels', () => {
  const routes = captureRoutes([row('npc-trade',20,20,100),row('gift',5,5,null),row('static',0,0,null),row('walk',3,4,0)])
  assert.equal(routes[0].chance,null)
  assert.equal(routes[1].chance,null)
  assert.deepEqual(routes[2].levels,[])
  assert.equal(routes[3].chance,0)
})
