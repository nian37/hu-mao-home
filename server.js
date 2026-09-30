const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'data.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const META_FILE = path.join(DATA_DIR, 'meta.json');

// Web Push VAPID 密钥（与 Cloudflare Worker 保持一致）
const VAPID_PUBLIC_KEY = 'BGCFbLtEvN_ZAKwmK5PlfRXTKSQVinrjk70UlCAXH0dfRsWso-zFb0guUfTXdpYmxzw30jfO9vg73uujgQBLnqY';
const VAPID_PRIVATE_KEY = 'LT9ksUTHZBArHHaBE5v23Oa7-9MHp96n206WlSHr5t4';
const VAPID_SUBJECT = 'mailto:push@hoyiho.dev';

// 提前启用 JSON 解析，保证所有接口（含 /api/upload）都能读取请求体
app.use(express.json({ limit: '100mb' }));

// 默认数据结构（中立字段命名，避免误导真实身份）
const DEFAULT_DATA = {
  version: 1,
  password: '', // 留空即使用 init 默认密码，见 savaDefaultPassword()
  profile: {
    cpTitle: '虎猫',
    slogan: '两只小猫咪要在舞台上闪闪发光呀～',
    debutDate: '',
    intro: '',
    bannerImage: '',
    quotes: [],
    // 虎 / 猫 各自：名字（必填）、生日（必填）、公开日期（选填）、微博主页链接（选填）
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

// 首次生成数据文件时使用的默认管理密码（可后续在设置中修改）
const INIT_PASSWORD = '07071001';

let db = load();

// ---------- 后台推送辅助数据（公告 / Web Push 订阅） ----------
let meta = { announcement: { text: '', ts: null }, pushSubs: [], lastNotification: {} };
function loadMeta() {
  try {
    if (fs.existsSync(META_FILE)) {
      const m = JSON.parse(fs.readFileSync(META_FILE, 'utf8'));
      meta = Object.assign(meta, m);
    }
  } catch (e) { /* 忽略损坏的 meta */ }
  return meta;
}
function saveMeta() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2));
}
loadMeta();

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

function defaultDataWithPassword() {
  const d = JSON.parse(JSON.stringify(DEFAULT_DATA));
  d.password = INIT_PASSWORD;
  return d;
}

// 兼容旧版 profile（平铺字段 tigerName / catName），统一为 tiger / cat 结构
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

function load() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DATA_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      // merge with defaults to keep new fields
      const base = defaultDataWithPassword();
      // preserve user password if set
      if (typeof parsed.password === 'string' && parsed.password !== '') base.password = parsed.password;
      const merged = Object.assign(base, parsed);
      merged.profile = normalizeProfile(merged.profile);
      return merged;
    } catch (e) {
      console.error('读取数据文件失败，使用默认数据:', e.message);
      return defaultDataWithPassword();
    }
  }
  const d = defaultDataWithPassword();
  save(d);
  return d;
}

function save(next) {
  const target = next || db;
  fs.writeFileSync(DATA_FILE, JSON.stringify(target, null, 2));
}

// ---------- 密码校验 ----------
function passwordMatches(input) {
  return typeof input === 'string' && input === db.password;
}

const VALID_COLLECTIONS = [
  'duoCards', 'tigerCards', 'catCards', 'stages',
  'sugars', 'stories', 'merchNews', 'fanMerch',
  'performanceNews', 'vipNews', 'photos'
];

function sanitizeRecord(body) {
  const r = {
    title: String(body.title || '').slice(0, 200),
    date: String(body.date || '').slice(0, 50),
    content: String(body.content || '').slice(0, 4000),
    image: String(body.image || '').slice(0, 8000000),
    video: String(body.video || '').slice(0, 80000000),
    merch: String(body.merch || '').slice(0, 200),
    source: String(body.source || '').slice(0, 500),
    tags: Array.isArray(body.tags) ? body.tags.map(t => String(t).slice(0, 50)).slice(0, 10) : []
  };
  // 仅保留字段存在且非只空白时
  if (r.image.trim() === '') delete r.image;
  if (r.video.trim() === '') delete r.video;
  if (r.merch.trim() === '') delete r.merch;
  if (r.source.trim() === '') delete r.source;
  return r;
}

// ---------- 图片 / 视频上传（从相册选择，存到磁盘，返回访问 URL） ----------
function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 上传接口放在通用写入路由之前，避免被 /:collection 遮蔽
app.post('/api/upload', requireAuth, (req, res) => {
  const { data, kind } = req.body || {};
  if (typeof data !== 'string' || data.indexOf('data:') !== 0) {
    return res.status(400).json({ ok: false, message: '缺少文件数据' });
  }
  const match = data.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!match) return res.status(400).json({ ok: false, message: '数据格式不正确' });
  const mime = match[1];
  const buff = Buffer.from(match[3], 'base64');
  const isVideo = kind === 'video' || String(mime).indexOf('video') === 0;
  const isImage = kind === 'image' || String(mime).indexOf('image') === 0;
  const allowed = isVideo
    ? ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
    : ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowed.includes(mime)) return res.status(400).json({ ok: false, message: '不支持该文件类型' });

  const max = isVideo ? 60 * 1024 * 1024 : 8 * 1024 * 1024;
  if (buff.length > max) return res.status(400).json({ ok: false, message: isVideo ? '视频过大，请压缩到 60MB 内' : '图片过大，请压缩到 8MB 内' });

  ensureUploadsDir();
  const ext = isVideo ? '.mp4' : ('.' + (mime.split('/')[1] || 'bin'));
  const name = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
  const filePath = path.join(UPLOADS_DIR, name);
  fs.writeFileSync(filePath, buff);
  res.json({ ok: true, url: '/uploads/' + name });
});

// 提供上传文件访问
app.use('/uploads', express.static(UPLOADS_DIR));

// ---------- 公共读取 ----------
app.get('/api/data', (req, res) => {
  const { password, ...pub } = db;
  res.json(pub);
});

// 后台推送相关只读接口（须在通用 /:collection 之前注册，避免被拦截）
app.get('/api/announcement', (req, res) => {
  res.json({ text: meta.announcement.text || '', ts: meta.announcement.ts || null });
});
app.get('/api/push-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY, subject: VAPID_SUBJECT });
});
app.get('/api/notification', (req, res) => {
  res.json({ title: meta.lastNotification.title || '', body: meta.lastNotification.body || '', ts: meta.lastNotification.ts || null });
});

// 任意单集合读取
app.get('/api/:collection', (req, res) => {
  const c = req.params.collection;
  if (c === 'profile') return res.json(db.profile);
  if (!VALID_COLLECTIONS.includes(c)) return res.status(404).json({ ok: false, message: '未知栏目' });
  res.json(db[c]);
});

// 纯校验密码是否正确的公开接口（用于前端解锁，不修改任何数据）
app.post('/api/check', (req, res) => {
  const pwd = req.body && req.body.password;
  if (passwordMatches(pwd)) return res.json({ ok: true });
  return res.status(401).json({ ok: false, message: '密码错误' });
});

function requireAuth(req, res, next) {
  const pwd = req.body && req.body.password;
  if (!passwordMatches(pwd)) {
    return res.status(401).json({ ok: false, message: '密码错误或未授权，无法修改' });
  }
  next();
}

// ---------- 修改密码（需当前密码）放在通用写入路由之前，避免被 /:collection 遮蔽 ----------
app.post('/api/password', (req, res) => {
  const { current, next } = req.body || {};
  if (!passwordMatches(current)) {
    return res.status(401).json({ ok: false, message: '当前密码错误' });
  }
  if (!next || String(next).length < 4) {
    return res.status(400).json({ ok: false, message: '新密码至少 4 位' });
  }
  db.password = String(next);
  save();
  res.json({ ok: true, message: '密码已更新' });
});

// ---------- 后台信息推送（公告 + Web Push） ----------
app.post('/api/announcement', requireAuth, (req, res) => {
  const text = String(req.body.text || '').slice(0, 500).trim();
  const ts = text ? new Date().toISOString() : null;
  meta.announcement = { text, ts };
  saveMeta();
  res.json({ ok: true, text, ts });
});

app.post('/api/subscribe', (req, res) => {
  const sub = req.body && req.body.subscription;
  if (!sub || !sub.endpoint) return res.json({ ok: true });
  meta.pushSubs = meta.pushSubs.filter(s => s && s.endpoint && s.endpoint !== sub.endpoint);
  meta.pushSubs.push(sub);
  if (meta.pushSubs.length > 2000) meta.pushSubs = meta.pushSubs.slice(-2000);
  saveMeta();
  res.json({ ok: true });
});
app.post('/api/push', requireAuth, async (req, res) => {
  const title = String(req.body.title || '').slice(0, 100).trim();
  const body = String(req.body.body || '').slice(0, 300).trim();
  // 若同时提供公告内容，则写入公告（供站内横幅展示）
  let annTs = null;
  if (typeof req.body.text !== 'undefined') {
    const annText = String(req.body.text || '').slice(0, 500).trim();
    annTs = annText ? new Date().toISOString() : null;
    meta.announcement = { text: annText, ts: annTs };
  }
  if (!title && !body) { saveMeta(); return res.json({ ok: true, text: '', ts: annTs, message: '公告已更新，未发送系统通知' }); }
  meta.lastNotification = { title, body, ts: new Date().toISOString() };
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  let sent = 0, failed = 0;
  for (const s of meta.pushSubs) {
    try { await webpush.sendNotification(s, '', { TTL: 86400 }); sent++; }
    catch (e) { failed++; }
  }
  saveMeta();
  res.json({ ok: true, sent, failed, total: meta.pushSubs.length, ts: annTs });
});

// ---------- 🐾 养宠：云存档 / 签到 / 排行榜（访客级，无需密码） ----------
const PETS_FILE = path.join(DATA_DIR, 'pets.json');
function loadPets() {
  try {
    if (fs.existsSync(PETS_FILE)) return JSON.parse(fs.readFileSync(PETS_FILE, 'utf8')) || {};
  } catch (e) {}
  return {};
}
function savePets(obj) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PETS_FILE, JSON.stringify(obj));
}
// pets = { saves: { clientId: state }, checkins: { clientId: {last, streak} }, leaderboard: [rows] }
let petsStore = null;
function getPetsStore() {
  if (!petsStore) petsStore = Object.assign({ saves: {}, checkins: {}, leaderboard: [] }, loadPets());
  return petsStore;
}

app.get('/api/pets/load', (req, res) => {
  const clientId = String(req.query.clientId || '').slice(0, 64);
  const store = getPetsStore();
  if (!clientId) return res.json({ ok: false, state: null });
  const state = store.saves[clientId] || null;
  const checkin = store.checkins[clientId] || null;
  res.json({ ok: true, state, checkin });
});

app.post('/api/pets/save', (req, res) => {
  const store = getPetsStore();
  const clientId = String(req.body.clientId || '').slice(0, 64);
  const incoming = req.body.state;
  if (!clientId || !incoming || typeof incoming !== 'object') return res.status(400).json({ ok: false, message: '参数不完整' });
  let server = store.saves[clientId];
  if (!server) server = incoming;
  else {
    ['tiger', 'cat'].forEach((k) => {
      const a = server[k] || {}, b0 = incoming[k] || {};
      const merged = {};
      ['love', 'food', 'mood', 'energy', 'exp', 'stage'].forEach((attr) => {
        merged[attr] = Math.max(Number(a[attr] || 0), Number(b0[attr] || 0));
      });
      merged.last = b0.last || a.last || Date.now();
      merged.wear = b0.wear || a.wear || null;
      server[k] = merged;
    });
  }
  store.saves[clientId] = server;
  savePets(store);
  res.json({ ok: true, state: server });
});

app.post('/api/pets/checkin', (req, res) => {
  const store = getPetsStore();
  const clientId = String(req.body.clientId || '').slice(0, 64);
  if (!clientId) return res.status(400).json({ ok: false, message: '缺少 clientId' });
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let cin = store.checkins[clientId];
  let streak = 1, already = false;
  if (cin) {
    if (cin.last === today) already = true;
    else streak = cin.last === yesterday ? (cin.streak || 0) + 1 : 1;
  }
  cin = { last: today, streak };
  store.checkins[clientId] = cin;
  savePets(store);
  res.json({ ok: true, already, streak, today });
});

app.get('/api/pets/leaderboard', (req, res) => {
  const store = getPetsStore();
  const rows = [...store.leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 100);
  res.json({ ok: true, list: rows });
});

app.post('/api/pets/leaderboard', (req, res) => {
  const store = getPetsStore();
  const clientId = String(req.body.clientId || '').slice(0, 64);
  const name = String(req.body.name || '小可爱').slice(0, 20);
  const score = Math.max(0, Number(req.body.score || 0) || 0);
  if (!clientId) return res.status(400).json({ ok: false, message: '缺少 clientId' });
  store.leaderboard = store.leaderboard.filter((r) => r && r.clientId !== clientId);
  store.leaderboard.push({ clientId, name, score, ts: Date.now() });
  if (store.leaderboard.length > 500) store.leaderboard = store.leaderboard.slice(-500);
  savePets(store);
  const rows = [...store.leaderboard].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 100);
  res.json({ ok: true, list: rows });
});

// ---------- 写操作（需密码） ----------
app.post('/api/:collection', requireAuth, (req, res) => {
  const c = req.params.collection;
  if (!VALID_COLLECTIONS.includes(c)) return res.status(404).json({ ok: false, message: '未知栏目' });
  const rec = { id: newId(), createdAt: new Date().toISOString(), ...sanitizeRecord(req.body) };
  db[c].unshift(rec);
  save();
  res.json({ ok: true, record: rec });
});

app.put('/api/:collection/:id', requireAuth, (req, res) => {
  const c = req.params.collection;
  if (!VALID_COLLECTIONS.includes(c)) return res.status(404).json({ ok: false, message: '未知栏目' });
  const idx = db[c].findIndex(x => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ ok: false, message: '记录不存在' });
  const updated = { ...db[c][idx], ...sanitizeRecord(req.body), id: db[c][idx].id };
  // 不允许通过更新清空已存在的图片为空字符串，避免误删
  db[c][idx] = updated;
  save();
  res.json({ ok: true, record: updated });
});

app.delete('/api/:collection/:id', requireAuth, (req, res) => {
  const c = req.params.collection;
  if (!VALID_COLLECTIONS.includes(c)) return res.status(404).json({ ok: false, message: '未知栏目' });
  const before = db[c].length;
  db[c] = db[c].filter(x => x.id !== req.params.id);
  if (db[c].length === before) return res.status(404).json({ ok: false, message: '记录不存在' });
  save();
  res.json({ ok: true });
});

// ---------- 个人信息（需密码） ----------
app.put('/api/profile', requireAuth, (req, res) => {
  const b = req.body || {};
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
    bannerImage: String(b.bannerImage ?? cur.bannerImage).slice(0, 3000000),
    quotes: Array.isArray(b.quotes) ? b.quotes.filter(q => typeof q === 'string').map(q => q.slice(0, 300)).slice(0, 20) : cur.quotes,
    tiger: member(b.tiger, cur.tiger),
    cat: member(b.cat, cur.cat)
  };
  save();
  res.json({ ok: true, profile: db.profile });
});

// ---------- 静态前端 ----------
app.get('/manifest.webmanifest', (req, res) => {
  res.set('Content-Type', 'application/manifest+json').sendFile(path.join(__dirname, 'public', 'manifest.webmanifest'));
});
app.get('/apple-touch-icon.png', (req, res) => {
  res.set('Content-Type', 'image/png').sendFile(path.join(__dirname, 'public', 'icons', 'apple-touch-icon.png'));
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`虎猫的小屋已启动: http://localhost:${PORT}`);
  console.log(`当前管理密码: ${db.password}（可在“设置”中修改，或修改 data/data.json 后重启）`);
});