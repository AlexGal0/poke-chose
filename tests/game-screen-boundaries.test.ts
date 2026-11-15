import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const root = resolve(import.meta.dirname, '../src')
function dependencies(entry: string, seen = new Set<string>()) {
  if (seen.has(entry)) return seen
  seen.add(entry)
  const source = readFileSync(entry, 'utf8')
  for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g)) {
    const base = resolve(dirname(entry), match[1])
    const dependency = [base, `${base}.ts`, `${base}.tsx`].find(path => /\.tsx?$/.test(path) && existsSync(path))
    if (dependency) dependencies(dependency, seen)
  }
  return seen
}

test('Black and X mount the common workspace without legacy screen providers', () => {
  for (const game of ['black/BlackWorkspace', 'x/XWorkspace', 'y/YWorkspace']) {
    const graph = dependencies(resolve(root, `games/${game}.tsx`))
    assert.ok(graph.has(resolve(root, 'games/core/GameWorkspace.tsx')))
    for (const legacy of ['StatsProvider', 'MovesProvider', 'EvolutionProvider', 'CaptureChecklist', 'Catalog', 'SaveCollection', 'EnemyPrototype']) {
      assert.equal(graph.has(resolve(root, `components/${legacy}.tsx`)), false, `${game} must not mount ${legacy}`)
    }
  }
})

test('Y workspace never mounts concrete save, live or battle adapters from another game', () => {
  const graph = dependencies(resolve(root, 'games/y/YWorkspace.tsx'))
  for (const path of graph) {
    assert.doesNotMatch(path.replaceAll('\\', '/'), /games\/(?:x|black)\/(?:[A-Z].*|memory-.*|save-pokedex|battle-source|saved-roster)\.tsx?$/)
  }
})

test('shared game screens do not select a concrete game or import legacy APIs', () => {
  const directory = resolve(root, 'games/core')
  for (const file of readdirSync(directory).filter(file => file.endsWith('.tsx'))) {
    const source = readFileSync(resolve(directory, file), 'utf8')
    assert.doesNotMatch(source, /from ['"][^'"]*(?:games\/(?:black|x)\/|\.\.\/(?:black|x)\/|api\/)/, file)
    assert.doesNotMatch(source, /['"]\/(?:save|live|enemy|x-live)-api\//, file)
  }
})
