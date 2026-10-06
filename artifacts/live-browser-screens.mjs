import {writeFile} from 'node:fs/promises'
import {setTimeout as delay} from 'node:timers/promises'
const tabs=await(await fetch('http://127.0.0.1:9227/json')).json()
const tab=tabs.find(t=>t.id==='485EBA57BB4C347DF1DC91C9C3F0496B')
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}))
let id=0;const p=new Map();ws.addEventListener('message',e=>{const v=JSON.parse(e.data);if(v.id){const f=p.get(v.id);p.delete(v.id);v.error?f.reject(v.error):f.resolve(v.result)}})
const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;p.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))})
const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value
await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
await delay(500)
console.log('mobile',await evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})'))
await writeFile('artifacts/live-integration-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'))
await call('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
await delay(500)
await writeFile('artifacts/live-integration-desktop.png',Buffer.from((await call('Page.captureScreenshot',{format:'png'})).data,'base64'))
ws.close()
