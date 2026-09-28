/* 虎猫的小屋 · Cloudflare Worker
 * 在免费版（无需绑卡）上实现“输入密码即可在线编辑”。
 * - 数据存 KV (HUMIAO_DATA)，key: data
 * - 上传的图片/视频存 KV，key: f:<name>（值上限约 16MB 二进制）
 * - 前端由 [assets] 提供，与 localhost:3000 完全一致
 */
const VALID_COLLECTIONS = [
  'duoCards', 'tigerCards', 'catCards', 'stages',
  'sugars', 'stories', 'merchNews', 'fanMerch',
  'performanceNews', 'vipNews', 'photos'
];

const DEFAULT_DATA = {
  version: 1,
  password: '07071001',
  profile: {
    cpTitle: '虎猫',
    slogan: '两只小猫咪要在舞台上闪闪发光呀～',
    debutDate: '',
    intro: '',
    bannerImage: '',
    quotes: [],
    tiger: { name: '虎', birthday: '', publicDate: '', weibo: '' },
    cat: { name: '猫', birthday: '', publicDate: '', weibo: '' }
  },
  duoCards: [],
  tigerCards: [],
  catCards: [],
  stages: [],
  sugars: [],
  stories: [],
  merchNews: [],
  fanMerch: [],
  performanceNews: [],
  vipNews: [],
  photos: []
};

function newId() {
  const b = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

function normalizeProfile(p) {
  p = p || {};
  const mk = (dft) => ({ name: '', birthday: '', publicDate: '', weibo: '', ...dft });
  const tiger = mk({ name: p.tigerName || '虎' });
  const cat = mk({ name: p.catName || '猫' });
  if (p.tiger && typeof p.tiger === 'object') Object.assign(tiger, p.tiger);
  if (p.cat && typeof p.cat === 'object') Object.assign(cat, p.cat);
  return {
    cpTitle: p.cpTitle || '虎猫',
    slogan: p.slogan || '',
    debutDate: p.debutDate || '',
    intro: p.intro || '',
    bannerImage: p.bannerImage || '',
    quotes: Array.isArray(p.quotes) ? p.quotes : [],
    tiger,
    cat
  };
}

async function loadData(env) {
  const raw = await env.HUMIAO_DATA.get('data');
  if (!raw) return JSON.parse(JSON.stringify(DEFAULT_DATA));
  try {
    const parsed = JSON.parse(raw);
    const base = JSON.parse(JSON.stringify(DEFAULT_DATA));
    if (typeof parsed.password === 'string' && parsed.password !== '') base.password = parsed.password;
    const merged = Object.assign(base, parsed);
    merged.profile = normalizeProfile(merged.profile);
    return merged;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }
}

function sanitizeRecord(body) {
  const r = {
    title: String(body.title || '').slice(0, 200),
    date: String(body.date || '').slice(0, 50),
    content: String(body.content || '').slice(0, 4000),
    image: String(body.image || '').slice(0, 6000000),
    video: String(body.video || '').slice(0, 50000000),
    merch: String(body.merch || '').slice(0, 200),
    source: String(body.source || '').slice(0, 500),
    tags: Array.isArray(body.tags) ? body.tags.map(t => String(t).slice(0, 50)).slice(0, 10) : []
  };
  if (r.image.trim() === '') delete r.image;
  if (r.video.trim() === '') delete r.video;
  if (r.merch.trim() === '') delete r.merch;
  if (r.source.trim() === '') delete r.source;
  return r;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function readBody(req) {
  try { return await req.json(); } catch (e) { return {}; }
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function mimeFromName(name) {
  const ext = name.split('.').pop().toLowerCase();
  return { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' }[ext] || 'application/octet-stream';
}

/* ---------- 后台信息推送（公告 + Web Push） ---------- */
const VAPID_PUBLIC_KEY = 'BGCFbLtEvN_ZAKwmK5PlfRXTKSQVinrjk70UlCAXH0dfRsWso-zFb0guUfTXdpYmxzw30jfO9vg73uujgQBLnqY';
const VAPID_PRIVATE_KEY = 'LT9ksUTHZBArHHaBE5v23Oa7-9MHp96n206WlSHr5t4';
const VAPID_SUBJECT = 'mailto:push@hoyiho.dev';

function b64urlFromBytes(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function bytesFromB64url(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
const EC = { name: 'ECDSA', namedCurve: 'P-256' };
// 用公钥坐标 + 私钥 d 构建 JWK 进行 ES256 签名
function vapidJwk() {
  const pub = bytesFromB64url(VAPID_PUBLIC_KEY); // 0x04 || x(32) || y(32)
  return {
    kty: 'EC', crv: 'P-256', ext: false,
    x: b64urlFromBytes(pub.slice(1, 33)),
    y: b64urlFromBytes(pub.slice(33, 65)),
    d: VAPID_PRIVATE_KEY
  };
}
async function signJwt(claims, jwk) {
  const key = await crypto.subtle.importKey('jwk', jwk, EC, false, ['sign']);
  const enc = (obj) => b64urlFromBytes(new TextEncoder().encode(JSON.stringify(obj)));
  const toSign = enc({ typ: 'JWT', alg: 'ES256' }) + '.' + enc(claims);
  const sig = await crypto.subtle.sign({ name: 'ECDSA' }, key, new TextEncoder().encode(toSign));
  return toSign + '.' + b64urlFromBytes(new Uint8Array(sig));
}
async function pushOne(endpoint, ttl) {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  const jwt = await signJwt({ aud, exp }, vapidJwk());
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      'Content-Type': 'text/plain;charset=utf-8',
      'TTL': String(ttl || 86400),
      'Urgency': 'normal'
    },
    body: ''
  });
}
async function readPushSubs(env) {
  const raw = await env.HUMIAO_DATA.get('push_subs');
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch (e) { return []; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname;
    const method = request.method;

    // 上传文件访问：/uploads/xxx
    if (p.startsWith('/uploads/')) {
      const name = p.slice('/uploads/'.length);
      const got = await env.HUMIAO_DATA.getWithMetadata('f:' + name, { type: 'arrayBuffer' });
      if (got.value === null) return new Response('Not Found', { status: 404 });
      const ct = (got.metadata && got.metadata.contentType) || mimeFromName(name);
      return new Response(got.value, {
        headers: { 'Content-Type': ct, 'Cache-Control': 'public, max-age=31536000, immutable' }
      });
    }

    // 非 /api 请求：交给静态资源
    if (!p.startsWith('/api/')) {
      // 关键导航文件不要被边缘/浏览器强缓存，保证新版快速接管
      const bypass = p === '/' || p === '/index.html' || p === '/sw.js';
      if (!bypass) return env.ASSETS.fetch(request);
      const res = await env.ASSETS.fetch(request);
      const res2 = new Response(res.body, res);
      res2.headers.set('Cache-Control', 'no-cache');
      return res2;
    }

    const parts = p.split('/').filter(Boolean); // ['api', ...]
    const segment = parts[1];

    if (method === 'GET' && segment === 'data') {
      const db = await loadData(env);
      const { password, ...pub } = db;
      return json(pub);
    }

    if (method === 'POST' && segment === 'check') {
      const body = await readBody(request);
      const db = await loadData(env);
      if (db.password === body.password) return json({ ok: true });
      return json({ ok: false, message: '密码错误' }, 401);
    }

    if (method === 'POST' && segment === 'upload') {
      const body = await readBody(request);
      const db = await loadData(env);
      if (db.password !== body.password) return json({ ok: false, message: '密码错误或未授权，无法修改' }, 401);

      const data = body.data;
      if (typeof data !== 'string' || data.indexOf('data:') !== 0) return json({ ok: false, message: '缺少文件数据' }, 400);
      const match = data.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
      if (!match) return json({ ok: false, message: '数据格式不正确' }, 400);
      const mime = match[1];
      const b64 = match[3].replace(/\s/g, '');
      const bytes = b64ToBytes(b64);

      const isVideo = body.kind === 'video' || String(mime).indexOf('video') === 0;
      const isImage = body.kind === 'image' || String(mime).indexOf('image') === 0;
      const allowed = isVideo
        ? ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
        : ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowed.includes(mime)) return json({ ok: false, message: '不支持该文件类型' }, 400);

      const max = isVideo ? 16 * 1024 * 1024 : 8 * 1024 * 1024;
      if (bytes.byteLength > max) return json({ ok: false, message: isVideo ? '视频过大，请压缩到 16MB 内' : '图片过大，请压缩到 8MB 内' }, 400);

      const ext = isVideo ? '.mp4' : ('.' + (mime.split('/')[1] || 'bin'));
      const name = Date.now() + '-' + newId().slice(0, 8) + ext;
      await env.HUMIAO_DATA.put('f:' + name, bytes.buffer, { metadata: { contentType: mime } });
      return json({ ok: true, url: '/uploads/' + name });
    }

    if (method === 'POST' && segment === 'password') {
      const body = await readBody(request);
      const db = await loadData(env);
      if (db.password !== body.current) return json({ ok: false, message: '当前密码错误' }, 401);
      if (!body.next || String(body.next).length < 4) return json({ ok: false, message: '新密码至少 4 位' }, 400);
      db.password = String(body.next);
      await env.HUMIAO_DATA.put('data', JSON.stringify(db));
      return json({ ok: true, message: '密码已更新' });
    }

    if (method === 'PUT' && segment === 'profile') {
      const b = await readBody(request);
      const db = await loadData(env);
      if (db.password !== b.password) return json({ ok: false, message: '密码错误或未授权，无法修改' }, 401);
      const cur = db.profile;
      const member = (input, dft) => {
        if (input && typeof input === 'object') {
          return {
            name: String(input.name ?? dft.name).slice(0, 100),
            birthday: String(input.birthday ?? dft.birthday).slice(0, 100),
            publicDate: String(input.publicDate ?? dft.publicDate).slice(0, 100),
            weibo: String(input.weibo ?? dft.weibo).slice(0, 500)
          };
        }
        return dft;
      };
      db.profile = {
        cpTitle: String(b.cpTitle ?? cur.cpTitle).slice(0, 100),
        slogan: String(b.slogan ?? cur.slogan).slice(0, 300),
        debutDate: String(b.debutDate ?? cur.debutDate).slice(0, 100),
        intro: String(b.intro ?? cur.intro).slice(0, 6000),
        bannerImage: String(b.bannerImage ?? cur.bannerImage).slice(0, 4000000),
        quotes: Array.isArray(b.quotes) ? b.quotes.filter(q => typeof q === 'string').map(q => q.slice(0, 300)).slice(0, 20) : cur.quotes,
        tiger: member(b.tiger, cur.tiger),
        cat: member(b.cat, cur.cat)
      };
      await env.HUMIAO_DATA.put('data', JSON.stringify(db));
      return json({ ok: true, profile: db.profile });
    }

    // 全局公告：访客读取 / 管理员发布
    if (method === 'GET' && segment === 'announcement') {
      const raw = await env.HUMIAO_DATA.get('announcement');
      const a = raw ? JSON.parse(raw) : {};
      return json({ text: a.text || '', ts: a.ts || null });
    }
    if (method === 'POST' && segment === 'announcement') {
      const b = await readBody(request);
      const db = await loadData(env);
      if (db.password !== b.password) return json({ ok: false, message: '密码错误或未授权，无法修改' }, 401);
      const text = String(b.text || '').slice(0, 500).trim();
      const ts = text ? new Date().toISOString() : null;
      await env.HUMIAO_DATA.put('announcement', JSON.stringify({ text, ts }));
      return json({ ok: true, text, ts });
    }

    // Web Push：提供公钥、保存订阅、管理员群发推送
    if (method === 'GET' && segment === 'push-key') {
      return json({ publicKey: VAPID_PUBLIC_KEY, subject: VAPID_SUBJECT });
    }
    if (method === 'POST' && segment === 'subscribe') {
      const b = await readBody(request);
      const sub = b.subscription;
      // subscription 为 null 视为退订通知（仅移除本地订阅），直接返回成功
      if (!sub || !sub.endpoint) return json({ ok: true });
      let subs = await readPushSubs(env);
      subs = subs.filter(s => s && s.endpoint && s.endpoint !== sub.endpoint);
      subs.push(sub);
      if (subs.length > 2000) subs = subs.slice(-2000);
      await env.HUMIAO_DATA.put('push_subs', JSON.stringify(subs));
      return json({ ok: true });
    }
    if (method === 'POST' && segment === 'push') {
      const b = await readBody(request);
      const db = await loadData(env);
      if (db.password !== b.password) return json({ ok: false, message: '密码错误或未授权，无法修改' }, 401);
      const title = String(b.title || '').slice(0, 100).trim();
      const body = String(b.body || '').slice(0, 300).trim();
      // 若同时提供公告内容，则写入公告（供站内横幅展示）
      let annTs = null;
      if (typeof b.text !== 'undefined') {
        const annText = String(b.text || '').slice(0, 500).trim();
        annTs = annText ? new Date().toISOString() : null;
        await env.HUMIAO_DATA.put('announcement', JSON.stringify({ text: annText, ts: annTs }));
      }
      if (!title && !body) return json({ ok: true, text: '', ts: annTs, message: '公告已更新，未发送系统通知' });
      // 记录最近一条推送，供 Service Worker 拉取展示
      await env.HUMIAO_DATA.put('last_notification', JSON.stringify({ title, body, ts: new Date().toISOString() }));
      const subs = await readPushSubs(env);
      let sent = 0, failed = 0;
      for (const s of subs) {
        if (!s.endpoint) continue;
        try { await pushOne(s.endpoint); sent++; } catch (e) { failed++; }
      }
      return json({ ok: true, sent, failed, total: subs.length, ts: annTs });
    }
    if (method === 'GET' && segment === 'notification') {
      const raw = await env.HUMIAO_DATA.get('last_notification');
      const n = raw ? JSON.parse(raw) : {};
      return json({ title: n.title || '', body: n.body || '', ts: n.ts || null });
    }

    // /api/<coll> 或 /api/<coll>/<id>
    if (segment) {
      if (!VALID_COLLECTIONS.includes(segment)) return json({ ok: false, message: '未知栏目' }, 404);
      if (method === 'GET') return json((await loadData(env))[segment]);

      const id = parts[2];
      if (method === 'DELETE' || method === 'PUT' || method === 'POST') {
        const body = await readBody(request);
        const db = await loadData(env);
        if (db.password !== body.password) return json({ ok: false, message: '密码错误或未授权，无法修改' }, 401);

        if (method === 'POST' && !id) {
          const rec = { id: newId(), createdAt: new Date().toISOString(), ...sanitizeRecord(body) };
          db[segment].unshift(rec);
          await env.HUMIAO_DATA.put('data', JSON.stringify(db));
          return json({ ok: true, record: rec });
        }

        if (method === 'PUT' && id) {
          const idx = db[segment].findIndex(x => x.id === id);
          if (idx === -1) return json({ ok: false, message: '记录不存在' }, 404);
          db[segment][idx] = { ...db[segment][idx], ...sanitizeRecord(body), id };
          await env.HUMIAO_DATA.put('data', JSON.stringify(db));
          return json({ ok: true, record: db[segment][idx] });
        }

        if (method === 'DELETE' && id) {
          const before = db[segment].length;
          db[segment] = db[segment].filter(x => x.id !== id);
          if (db[segment].length === before) return json({ ok: false, message: '记录不存在' }, 404);
          await env.HUMIAO_DATA.put('data', JSON.stringify(db));
          return json({ ok: true });
        }
      }
    }

    return json({ ok: false, message: 'Not Found' }, 404);
  }
};