/* MYSKME 远征录 · Service Worker
   策略：页面走网络优先（保证更新即时生效），立绘等静态资源走缓存优先（离线可玩） */
const CACHE = 'myskme-v11';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./'])));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks =>
    Promise.all(ks.filter(k => k !== CACHE && !k.startsWith('myskme-pack-')).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/') {
    // 页面：网络优先，断网回退缓存
    e.respondWith(
      fetch(e.request).then(res => {
        const cl = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cl));
        return res;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./')))
    );
  } else {
    // 资源：缓存优先，后台更新
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const cl = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, cl));
        return res;
      }))
    );
  }
});
