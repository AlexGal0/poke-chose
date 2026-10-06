import {writeFile} from 'node:fs/promises'
import {setTimeout as delay} from 'node:timers/promises'
const tab=await (await fetch('http://127.0.0.1:9227/json/new?about:blank',{method:'PUT'})).json()
const ws=new WebSocket(tab.webSocketDebuggerUrl)
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}))
let id=0
const pending=new Map()
ws.addEventListener('message',event=>{const reply=JSON.parse(event.data);if(reply.id){const p=pending.get(reply.id);pending.delete(reply.id);reply.error?p.reject(new Error(JSON.stringify(reply.error))):p.resolve(reply.result)}})
const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))})
const evaluate=async expression=>(await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value
await call('Page.enable')
await call('Page.navigate',{url:'http://127.0.0.1:5173/'})
await delay(2500)
await evaluate("(()=>{for(const [id,name,...types] of [[531,\"audino\",\"normal\"],[505,\"watchog\",\"normal\"],[539,\"sawk\",\"fighting\"],[538,\"throh\",\"fighting\"],[510,\"liepard\",\"dark\"],[528,\"swoobat\",\"psychic\",\"flying\"],[546,\"cottonee\",\"grass\"],[547,\"whimsicott\",\"grass\"],[513,\"pansear\",\"fire\"],[517,\"munna\",\"psychic\"],[548,\"petilil\",\"grass\"],[525,\"boldore\",\"rock\"],[532,\"timburr\",\"fighting\"],[543,\"venipede\",\"bug\",\"poison\"],[561,\"sigilyph\",\"psychic\",\"flying\"],[557,\"dwebble\",\"bug\",\"rock\"],[551,\"sandile\",\"ground\",\"dark\"],[554,\"darumaka\",\"fire\"],[562,\"yamask\",\"ghost\"],[556,\"maractus\",\"grass\"],[559,\"scraggy\",\"dark\",\"fighting\"],[574,\"gothita\",\"psychic\"],[587,\"emolga\",\"electric\",\"flying\"],[520,\"tranquill\",\"normal\",\"flying\"],[502,\"dewott\",\"water\"],[536,\"palpitoad\",\"water\",\"ground\"],[541,\"swadloon\",\"bug\",\"grass\"],[507,\"herdier\",\"normal\"],[522,\"blitzle\",\"electric\"]]) localStorage.setItem('poke-chose:cache:pokemon-bw-v1-'+id,JSON.stringify({id,name,types,sprite:null}));return true})()")
console.log('initial',await evaluate("document.querySelector('.save-sync select')?.value"))
await evaluate("(()=>{const select=document.querySelector('.save-sync select');select.value='live';select.dispatchEvent(new Event('change',{bubbles:true}));return select.value})()")
await delay(1500)
console.log('live-before',await evaluate("document.querySelector('.save-sync')?.innerText"))
await evaluate("document.querySelector('.live-controls .primary').click()")
for(let i=0;i<15;i++){
await delay(2000)
const status=await evaluate("document.querySelector('.save-sync')?.innerText")
if(status?.includes('Lectura en vivo activa')||status?.includes('No se pudo conectar')){console.log('live-after',status);break}
}
console.log('collection',await evaluate("document.querySelector('[aria-labelledby=collection-title]')?.innerText"))
console.log('team',await evaluate("document.querySelector('.team-panel')?.innerText"))
const screen=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
await writeFile('artifacts/live-integration-desktop.png',Buffer.from(screen.data,'base64'))
await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true})
await delay(500)
console.log('mobile-overflow',await evaluate("({width:innerWidth,scroll:document.documentElement.scrollWidth})"))
await writeFile('artifacts/live-integration-mobile.png',Buffer.from((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data,'base64'))
console.log('tab',tab.id)
ws.close()
