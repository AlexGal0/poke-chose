import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const apply = process.argv.includes('--apply')
const unknown = process.argv.slice(2).filter(arg => !['--apply', '--dry-run'].includes(arg))
if (unknown.length) throw new Error(`Argumentos desconocidos: ${unknown.join(', ')}`)

function git(args) {
  const result = spawnSync('git', args, { cwd: projectRoot, encoding: 'utf8', windowsHide: true })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(result.stderr.trim() || 'Falló Git.')
  return result.stdout
}

const ignored = git(['ls-files', '-ci', '--exclude-standard', '-z', '--', '.']).split('\0').filter(Boolean)
console.log(`Archivos versionados que ahora están excluidos: ${ignored.length}`)
if (!apply) {
  for (const file of ignored.slice(0, 10)) console.log(`  ${file}`)
  if (ignored.length) console.log('Ejecuta node scripts/prepare-git.mjs --apply para retirarlos solo del índice. Los archivos locales se conservan.')
} else {
  for (let index = 0; index < ignored.length; index += 100) {
    git(['rm', '--cached', '--', ...ignored.slice(index, index + 100)])
  }
  console.log('Índice limpio de archivos excluidos. Archivos locales conservados; revisa git status antes de hacer commit.')
}
