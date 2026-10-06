import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { writeFile } from 'node:fs/promises'

const browser = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  `--user-data-dir=${resolve('artifacts/battle-stages-browser-cdp')}`, '--remote-debugging-port=9228', 'about:blank',
], { windowsHide: true, stdio: 'ignore' })
let socket
try {
  let targets
  for (let attempt = 0; attempt < 50; attempt++) {
    try { targets = await (await fetch('http://127.0.0.1:9228/json/list')).json(); break } catch { await new Promise(resolve => setTimeout(resolve, 100)) }
  }
  if (!targets) throw new Error('Chrome did not expose its debugging endpoint')
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
  await send('Page.enable')
  for (const [width, unknown] of [[1280, false], [390, false], [390, true]]) {
    const name = `battle-stages-${width}${unknown ? '-unknown' : ''}`
    await send('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 })
    await send('Page.navigate', { url: `http://127.0.0.1:5173/artifacts/battle-stages-check.html${unknown ? '?unknown' : ''}` })
    let layout
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      const response = await send('Runtime.evaluate', { expression: 'document.getElementById("layout-check")?.textContent', returnByValue: true })
      if (response.result.value) { layout = JSON.parse(response.result.value); break }
    }
    if (!layout || layout.width !== width || layout.overflow || layout.tables !== 2 || layout.rows !== 2 || layout.unknown !== (unknown ? 2 : 0)) throw new Error(`Unexpected layout: ${JSON.stringify(layout)}`)
    const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
    await writeFile(`artifacts/${name}.png`, Buffer.from(screenshot.data, 'base64'))
    console.log(name, JSON.stringify(layout))
    if (!unknown) {
      const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value
      await evaluate('window.setBattleFixture(previous => ({ ...previous, stages: null }))')
      await new Promise(resolve => setTimeout(resolve, 100))
      const retained = await evaluate('[...document.querySelectorAll(".own-participant td")].map(element => element.textContent)')
      if (retained.join() !== layout.changes.slice(0, 7).join()) throw new Error('Stat changes disappeared during an attack')
      await evaluate('window.setBattleFixture(previous => ({ ...previous, stages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 } }))')
      await new Promise(resolve => setTimeout(resolve, 100))
      const reset = await evaluate('[...document.querySelectorAll(".own-participant td")].every(element => element.textContent === "—")')
      if (!reset) throw new Error('Confirmed stat update did not replace retained stages')
      await evaluate('window.setBattleFixture(previous => ({ own: { ...previous.own, personality: 99 }, stages: null }))')
      await new Promise(resolve => setTimeout(resolve, 100))
      const replaced = await evaluate('[...document.querySelectorAll(".own-participant td")].every(element => element.textContent === "?")')
      if (!replaced) throw new Error('Old stat stages were reused for another Pokemon')
      console.log(name, 'retention, confirmed reset and participant replacement passed')
    }
  }
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    localStorage.clear()
    localStorage.setItem('poke-chose:cache:team-source', JSON.stringify('live'))
    localStorage.setItem('poke-chose:active-tab:v1', JSON.stringify('types'))
    for (const [id, name, types] of [[507, 'Herdier', ['normal']], [513, 'Pansear', ['fire']], [515, 'Panpour', ['water']]]) {
      localStorage.setItem('poke-chose:cache:pokemon-bw-v1-' + id, JSON.stringify({ id, name, types, sprite: null }))
    }
    localStorage.setItem('poke-chose:cache:catalog-v1', JSON.stringify(Array.from({ length: 649 }, (_, index) => ({ id: index + 1, name: 'fixture-' + (index + 1) }))))
    window.battlePolls = 0
    window.mockBattleSnapshot = { status: 'ready', message: 'Synthetic battle reader', candidates: [], activeCandidates: [], battleActive: false }
    const originalFetch = window.fetch
    window.fetch = async (input, options) => {
      if (String(input) === '/enemy-api/snapshot') { window.battlePolls++; return new Response(JSON.stringify({ ...window.mockBattleSnapshot, updatedAt: new Date().toISOString() }), { headers: { 'Content-Type': 'application/json' } }) }
      if (String(input).startsWith('https://')) return new Response('{}', { status: 404 })
      return originalFetch(input, options)
    }
    window.EventSource = class { close() {} }
  ` })
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 420, deviceScaleFactor: 1, mobile: false })
  await send('Page.navigate', { url: 'http://127.0.0.1:5173/' })
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value
  async function until(expression) {
    for (let attempt = 0; attempt < 80; attempt++) {
      if (await evaluate(expression)) return
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('Browser check timed out: ' + expression)
  }
  await until('document.getElementById("types-tab")?.getAttribute("aria-selected") === "true" && window.battlePolls > 0')
  await evaluate(`window.scrollTo(0, 120); window.fixtureStages = { attack: 2, defense: -1, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 }; window.fixtureEnemy = { address: '', speciesId: 513, form: 0, level: 23, personality: 1, trainerId: 2, statStages: window.fixtureStages }; window.fixtureOwn = { ...window.fixtureEnemy, speciesId: 507, personality: 3, slot: 1, battleSlot: 0 }; window.fixtureReading = { status: 'ready', message: 'Synthetic battle reader', candidates: [window.fixtureEnemy, window.fixtureEnemy], activeCandidates: [window.fixtureOwn, window.fixtureOwn], battleActive: true }; window.mockBattleSnapshot = window.fixtureReading`)
  await until('document.getElementById("battle-tab")?.getAttribute("aria-selected") === "true" && document.querySelectorAll(".battle-stat-stages table").length === 2')
  await until('Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) <= 1')
  async function changeReading(expression) {
    const polls = await evaluate('window.battlePolls')
    await evaluate(expression)
    await until('window.battlePolls > ' + polls)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  await changeReading('window.mockBattleSnapshot = { ...window.fixtureReading, candidates: [], activeCandidates: [], battleActive: true }')
  if (!await evaluate('document.getElementById("battle-tab").getAttribute("aria-selected") === "true" && document.querySelector(".own-participant td").textContent === "+2" && document.querySelector(".enemy-participant td").textContent === "+2"')) throw new Error('Trainer gap exited battle or erased stats')
  await changeReading('window.mockBattleSnapshot = { ...window.fixtureReading, candidates: [ { ...window.fixtureEnemy, speciesId: 515, personality: 4 }, { ...window.fixtureEnemy, speciesId: 515, personality: 4 } ] }')
  await until('document.querySelector(".enemy-participant h3:not(.battle-participant-title)")?.textContent === "Panpour"')
  if (!await evaluate('document.getElementById("battle-tab").getAttribute("aria-selected") === "true"')) throw new Error('Trainer replacement exited battle')
  await changeReading('window.mockBattleSnapshot = { status: "error", message: "Synthetic connection loss", candidates: [] }')
  if (!await evaluate('document.getElementById("battle-tab").getAttribute("aria-selected") === "true"')) throw new Error('Connection error exited battle')
  await evaluate('document.querySelector(".battle-floating-button").click()')
  await until('document.getElementById("types-tab").getAttribute("aria-selected") === "true"')
  await changeReading('window.mockBattleSnapshot = window.fixtureReading')
  if (!await evaluate('document.getElementById("types-tab").getAttribute("aria-selected") === "true" && window.scrollY === 120')) throw new Error('Manual return was overridden or scroll position lost')
  await changeReading('window.mockBattleSnapshot = { ...window.fixtureReading, battleActive: false }')
  await changeReading('window.mockBattleSnapshot = window.fixtureReading')
  await until('document.getElementById("battle-tab").getAttribute("aria-selected") === "true"')
  await changeReading('window.mockBattleSnapshot = { ...window.fixtureReading, battleActive: false }')
  await until('document.getElementById("types-tab").getAttribute("aria-selected") === "true" && window.scrollY === 120')
  await evaluate('document.querySelector(".battle-floating-button").click()')
  await until('document.getElementById("battle-tab").getAttribute("aria-selected") === "true"')
  await evaluate('window.scrollTo(0, 0)')
  await changeReading('window.mockBattleSnapshot = window.fixtureReading')
  await until('Math.abs(window.scrollY + window.innerHeight - document.documentElement.scrollHeight) <= 1')
  if (!await evaluate('document.getElementById("battle-tab").getAttribute("aria-selected") === "true"')) throw new Error('Starting a fight in the battle view changed tabs')
  await changeReading('window.mockBattleSnapshot = { ...window.fixtureReading, battleActive: false }')
  await until('document.getElementById("types-tab").getAttribute("aria-selected") === "true" && window.scrollY === 120')
  console.log('App navigation: automatic entry, trainer gap, replacement, connection loss, manual return, next battle and automatic exit passed with synthetic snapshots')
} finally {
  socket?.close()
  browser.kill()
}
