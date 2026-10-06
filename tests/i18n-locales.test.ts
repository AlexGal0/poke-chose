import { test } from 'node:test'
import assert from 'node:assert/strict'
import es from '../src/i18n/locales/es/translation.json' with { type: 'json' }
import en from '../src/i18n/locales/en/translation.json' with { type: 'json' }

type Tree = { [key: string]: Tree | string }

function leafPaths(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string' ? [path] : leafPaths(value, path)
  })
}

test('es and en translation files expose the same keys', () => {
  const esKeys = leafPaths(es).sort()
  const enKeys = leafPaths(en).sort()
  assert.deepEqual(enKeys, esKeys, 'en/translation.json keys must match es/translation.json keys exactly')
})

test('no translation value is empty or untranslated', () => {
  for (const [locale, tree] of [['es', es], ['en', en]] as const) {
    for (const path of leafPaths(tree)) {
      const value = path.split('.').reduce<Tree | string>((node, key) => (node as Tree)[key], tree)
      assert.ok(typeof value === 'string' && value.trim().length > 0, `${locale}: "${path}" is empty`)
    }
  }
})
