import { writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { parsePk5 } from '../bridge/parser.ts'
import { pk5Fixture } from '../tests/helpers/save-fixture.ts'
const tab = await (await fetch('http://127.0.0.1:9228/json/new?about:blank', { method: 'PUT' })).json()
const ws = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }))
let id = 0
const pending = new Map()
ws.addEventListener('message', event => {
  const reply = JSON.parse(event.data)
  if (reply.id) { const p = pending.get(reply.id); pending.delete(reply.id); reply.error ? p.reject(reply.error) : p.resolve(reply.result) }
})
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const key = ++id; pending.set(key, { resolve, reject }); ws.send(JSON.stringify({ id: key, method, params }))
})
const evaluate = async expression => (await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value
const party = [60, 30, 0].map((currentHp, slot) => ({ ...parsePk5(pk5Fixture(502, 25, slot, undefined, { currentHp, maxHp: 80, experience: 16000 }), slot) }))
const snapshot = { status: 'ready', message: 'Synthetic vitals check', party, boxes: [], pokedex: { caughtSpeciesIds: [502], seenSpeciesIds: [502] }, updatedAt: new Date().toISOString(), backup: false }
party[0].heldItemId = 0
party[1].heldItemId = 26
party[2].heldItemId = 243
await call('Page.addScriptToEvaluateOnNewDocument', { source: `
localStorage.setItem('poke-chose:cache:team-source', JSON.stringify('live'));
localStorage.setItem('poke-chose:cache:held-item-bw-es-v1-26', JSON.stringify('Superpoción'));
localStorage.setItem('poke-chose:cache:held-item-bw-es-v1-243', JSON.stringify('Agua Mística'));
localStorage.setItem('poke-chose:bw:v1', JSON.stringify({collection:[{id:502,name:'dewott',types:['water'],sprite:null}],teamIds:[502]}));
localStorage.setItem('poke-chose:cache:pokemon-bw-v1-502', JSON.stringify({id:502,name:'dewott',types:['water'],sprite:null}));
localStorage.setItem('poke-chose:cache:experience-v1-502', JSON.stringify(Array.from({length:100},(_,i)=>({level:i+1,experience:i===0?0:(i+1)**3}))));
window.testSnapshot=${JSON.stringify(snapshot)};
window.EventSource=class {constructor(){window.testSource=this;setTimeout(()=>this.onmessage?.({data:JSON.stringify(window.testSnapshot)}),100)}close(){}};
` })
await call('Page.enable')
await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })
await call('Page.navigate', { url: 'http://127.0.0.1:5173/' })
await delay(1800)
const inspect = () => evaluate(`({bars:document.querySelectorAll('.team-grid progress').length,outside:document.querySelectorAll('.pokemon-grid progress').length,text:[...document.querySelectorAll('.team-vitals')].map(e=>e.innerText),hp:[...document.querySelectorAll('.hp-bar')].map(e=>({value:e.value,max:e.max,color:getComputedStyle(e).accentColor})),width:innerWidth,scroll:document.documentElement.scrollWidth})`)
console.log('desktop', await inspect())
console.log('held-items', await evaluate(`({items:[...document.querySelectorAll('.team-grid .held-item')].map(e=>e.innerText),removed:!document.querySelector('.team-grid').innerText.match(/Habilidad #|Movimientos:|Objeto #/)})`))
await evaluate(`document.querySelector('.team-panel').scrollIntoView()`)
await writeFile('artifacts/team-vitals-desktop.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
await evaluate(`window.testSnapshot.party[0].currentHp=10;window.testSnapshot.party[0].experience=17000;window.testSource.onmessage({data:JSON.stringify(window.testSnapshot)})`)
await delay(200)
console.log('updated', await inspect())
await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
await delay(200)
console.log('mobile', await inspect())
await evaluate(`document.querySelector('.team-panel').scrollIntoView()`)
await writeFile('artifacts/team-vitals-mobile.png', Buffer.from((await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
await evaluate(`(()=>{const s=document.querySelector('.save-sync select');s.value='manual';s.dispatchEvent(new Event('change',{bubbles:true}))})()`)
await delay(100)
console.log('manual', await inspect())
await call('Browser.close')
ws.close()
