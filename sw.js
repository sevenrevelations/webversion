'use strict';
const VERSION='blobby-web-stage15-v1';
const CORE=[
  './','./index.html','./style.css','./sidebar.css','./license.css','./chat.css','./profile.css','./chat-shell-fix.css','./dm.css','./group.css','./leaderboard.css','./performance.css','./web.css',
  './core.js','./performance.js','./themes.js','./platform.js','./web-config.js','./gateway.js','./browser-bridge.js','./web-runtime.js','./effects.js','./cursor.js','./layout.js','./config.js','./features.js','./sidebar.js','./license.js','./chat.js','./activity.js','./app.js','./manifest.webmanifest','./blobby-icon.svg'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(VERSION).then(c=>c.put('./index.html',copy));return res;}).catch(()=>caches.match('./index.html')));
    return;
  }
  if(!/\.(?:js|css|svg|webmanifest|html)$/.test(url.pathname))return;
  event.respondWith(caches.match(req).then(hit=>{
    const network=fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));}return res;}).catch(()=>hit);
    return hit||network;
  }));
});
