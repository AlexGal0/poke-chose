import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--user-data-dir=${resolve('artifacts/themes-browser-profile')}`, '--remote-debugging-port=9234', 'about:blank',
], { windowsHide: true, stdio: 'ignore' })
let socket
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
try {
  let targets
  for (let attempt = 0; attempt < 50; attempt++) {
    try { targets = await (await fetch('http://127.0.0.1:9234/json/list')).json(); break } catch { await delay(100) }
  }
  if (!targets) throw new Error('Chrome debugging endpoint unavailable')
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl)
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject })
  let id = 0
  const pending = new Map()
  socket.onmessage = event => {
    const message = JSON.parse(event.data)
    const request = pending.get(message.id)
    if (request) { pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result) }
  }
  function send(method, params = {}) {
    return new Promise((resolve, reject) => { const request = ++id; pending.set(request, { resolve, reject }); socket.send(JSON.stringify({ id: request, method, params })) })
  }
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
    return result.result.value
  }
  async function ready() {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (await evaluate('!!document.querySelector(".theme-selector select")')) return
      await delay(100)
    }
    throw new Error('Application did not render')
  }
  await send('Page.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    localStorage.setItem('poke-chose:cache:team-source', JSON.stringify('manual'))
    localStorage.setItem('poke-chose:active-tab:v1', JSON.stringify('types'))
    localStorage.setItem('poke-chose:bw:v1', JSON.stringify({ collection: [{ id: 502, name: 'dewott', types: ['water'], sprite: null }], teamIds: [502] }))
    const originalFetch = window.fetch
    window.fetch = (input, options) => String(input).startsWith('https://') ? Promise.resolve(new Response('{}', { status: 404 })) : originalFetch(input, options)
  ` })
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  await ready()
  await evaluate("localStorage.removeItem('poke-chose:theme:v1')")
  await send('Page.reload')
  await delay(300)
  await ready()
  assert.equal(await evaluate('document.documentElement.dataset.theme'), 'base')
  const backgrounds = { base: 'rgb(16, 21, 28)', pokemon: 'rgb(244, 244, 245)', 'pokemon-dark': 'rgb(17, 17, 19)', fiesta: 'rgb(24, 11, 46)' }
  for (const width of [1280, 390, 320]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 640 })
    for (const theme of ['base', 'pokemon', 'pokemon-dark', 'fiesta']) {
      await evaluate(`(() => { const select = document.querySelector('.theme-selector select'); select.value = ${JSON.stringify(theme)}; select.dispatchEvent(new Event('change', { bubbles: true })) })()`)
      await delay(100)
      assert.equal(await evaluate('getComputedStyle(document.documentElement).backgroundColor'), backgrounds[theme])
      assert.equal(await evaluate("JSON.parse(localStorage.getItem('poke-chose:theme:v1'))"), theme)
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `Overflow at ${width}: ${theme}`)
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".type-water")).backgroundColor'), 'rgb(56, 108, 176)')
      if (width !== 320) {
        const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
        await writeFile(`artifacts/theme-${theme}-${width}.png`, Buffer.from(screenshot.data, 'base64'))
      }
      await send('Page.reload')
      await delay(300)
      await ready()
      assert.equal(await evaluate('document.querySelector(".theme-selector select").value'), theme)
      assert.equal(await evaluate('document.documentElement.dataset.theme'), theme)
      console.log(`PASS ${theme}, ${width}px: palette, persistence, type colors, no overflow`)
    }
  }
  await evaluate("localStorage.setItem('poke-chose:theme:v1', '\"unknown\"')")
  await send('Page.reload')
  await delay(300)
  await ready()
  assert.equal(await evaluate('document.documentElement.dataset.theme'), 'base')
  console.log('PASS invalid saved theme falls back to original; manual synthetic collection, no save accessed')
  await evaluate(`(() => {
    const entries = Array.from({ length: 649 }, (_, index) => ({ id: index + 1, name: 'fixture-' + (index + 1) }))
    for (const [id, name] of [[592, 'frillish-male'], [593, 'jellicent-male'], [555, 'darmanitan-standard'], [122, 'mr-mime'], [29, 'nidoran-f']]) {
      entries[id - 1].name = name
      localStorage.setItem('poke-chose:cache:pokemon-bw-v1-' + id, JSON.stringify({ id, name, types: ['normal'], sprite: null }))
    }
    localStorage.setItem('poke-chose:cache:catalog-v1', JSON.stringify(entries))
  })()`)
  await send('Page.reload')
  await delay(300)
  await ready()
  await evaluate(`document.getElementById('catalog-tab').click()`)
  await delay(200)
  await evaluate(`(() => { const select = document.querySelector('[aria-label="Catálogo de Pokémon"]'); select.value = 'all'; select.dispatchEvent(new Event('change', { bubbles: true })) })()`)
  for (const [query, title] of [['frillish', 'Frillish'], ['jellicent', 'Jellicent'], ['darmanitan', 'Darmanitan'], ['mr. mime', 'Mr. Mime'], ['nidoran', 'Nidoran♀']]) {
    await evaluate(`(() => { const input = document.querySelector('[aria-label="Buscar Pokémon por nombre"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(query)}); input.dispatchEvent(new Event('input', { bubbles: true })) })()`)
    await delay(200)
    const card = await evaluate(`(() => { const card = document.querySelector('#workspace-panel .catalog-wiki').closest('article'); return { name: card.querySelector('h3').textContent, href: card.querySelector('.catalog-wiki').href, loaded: !card.classList.contains('loading-card') } })()`)
    assert.equal(card.name, title)
    assert.equal(decodeURIComponent(new URL(card.href).pathname), '/wiki/' + title)
    assert.equal(card.loaded, true)
    console.log('PASS cached catalog name, loaded card, search and link:', title)
  }
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  await writeFile('artifacts/catalog-names-320.png', Buffer.from(screenshot.data, 'base64'))
} finally {
  socket?.close()
  browser.kill()
}
