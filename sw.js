const C="mesada-v2";
const A=["./","./index.html","./manifest.webmanifest","./icon-180.png"];
self.addEventListener("install",e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(A)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  const doc = e.request.mode==="navigate" || u.pathname.endsWith("/") || u.pathname.endsWith("index.html");
  if(doc){
    // a página: rede primeiro, para as atualizações chegarem; cache só como rede de emergência
    e.respondWith(
      fetch(e.request).then(res=>{
        if(res&&res.status===200){const cl=res.clone();caches.open(C).then(c=>c.put(e.request,cl));}
        return res;
      }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request).then(res=>{
      if(res&&res.status===200&&res.type==="basic"){const cl=res.clone();caches.open(C).then(c=>c.put(e.request,cl));}
      return res;
    }))
  );
});
