/* 虎猫的小屋 · Service Worker（离线 + 安装） */
const CACHE = 'humao-cache-v8';
const APP_SHELL = [
  './',
  './index.html',
  './style.css?v=7',
  './app.js?v=8',
  './manifest.webmanifest',
  './icons/icon-144.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './pets/tiger.png',
  './pets/cat.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(APP_SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 收到系统通知推送后展示（空 payload → 拉取后端最近推送内容）
self.addEventListener('push', (e) => {
  e.waitUntil((async () => {
    let title = '虎猫的小屋';
    let body = '有新消息推送啦～';
    let tag = '';
    let url = '/';
    try {
      if (e.data && e.data.json()) {
        const p = e.data.json();
        if (p.title) title = p.title;
        if (p.body) body = p.body;
        if (p.tag) tag = p.tag;
        if (p.url) url = p.url;
      } else {
        const r = await fetch('./api/notification', { cache: 'no-store' });
        const n = await r.json();
        if (n.title) title = n.title;
        if (n.body) body = n.body;
      }
    } catch (err) { /* 保持默认 */ }
    self.registration.showNotification(title, {
      body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-144.png',
      tag,
      data: { url },
      actions: [{ action: 'open', title: '打开查看' }]
    });
  })());
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  if (e.action && e.action !== 'open') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ws) => {
      const win = ws.find((w) => 'focus' in w);
      if (win) { win.focus(); return; }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // 忽略非本域请求与带参数的 API 写请求
  if (url.origin !== location.origin) return;
  if (e.request.method !== 'GET') return;

  // 页面导航：网络优先，失败回退到缓存
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => { caches.open(CACHE).then((c) => c.put('./index.html', res.clone())); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 静态资源（css/js/图片/图标/数据）：缓存优先
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      if (res && res.ok && ['image/'].some((p) => res.headers.get('content-type')?.startsWith(p))) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }))
  );
});