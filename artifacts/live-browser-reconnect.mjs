import {writeFile} from 'node:fs/promises'
import {setTimeout as delay} from 'node:timers/promises'
const tabs=await(await fetch('http://127.0.0.1:9227/json')).json()
const tab=tabs.find(t=>t.id==='485EBA57BB4C347DF1DC91C9C3F0496B')
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const p=new Map();ws.addEventListener('message',e=>{const v=JSON.parse(e.data);if(v.id){const f=p.get(v.id);p.delete(v.id);v.error?f.reject(v.error):f.resolve(v.result)}})
const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;p.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))})
const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value
await call('Page.navigate',{url:'http://127.0.0.1:5173/'})
await delay(2500)
console.log('first-connect',await evaluate("document.querySelector('.save-sync').innerText"))
await evaluate("document.querySelectorAll('.live-controls button')[1].click()")
for(let i=0;i<10;i++){await delay(1000);const s=await evaluate("document.querySelector('.save-sync').innerText");if(s.includes('Lectura en pausa.')){console.log('disconnected',s);break}}
console.log('retained-team',await evaluate("document.querySelector('.team-panel .count').innerText"))
await writeFile('artifacts/live-integration-stale.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'))
await evaluate("document.querySelector('.live-controls .primary').click()")
for(let i=0;i<15;i++){await delay(2000);const s=await evaluate("document.querySelector('.save-sync').innerText");if(s.includes('Lectura en vivo activa')||s.includes('No se pudo conectar')){console.log('reconnect',s);break}}
await writeFile('artifacts/live-integration-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'))
await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
await delay(300)
await writeFile('artifacts/live-integration-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'))
console.log('summary',await evaluate("({team:document.querySelector('.team-panel .count').innerText,dex:document.querySelector('.dex-lookup summary')?.innerText})"))
ws.close()
