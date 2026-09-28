/* 后台推送相关 /api/* 接口的本地自动测试
 * 会临时启动 server.js 到随机端口，结束后自动关闭并恢复 meta.json，不影响真实数据。 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const META_FILE = path.join(ROOT, 'data', 'meta.json');
const PASSWORD = '07071001';

let child;
let base;
let origMeta;

// 保存原始 meta.json，避免测试污染
function backupMeta() {
  origMeta = fs.existsSync(META_FILE) ? fs.readFileSync(META_FILE, 'utf8') : null;
}
function restoreMeta() {
  if (origMeta === null) { if (fs.existsSync(META_FILE)) fs.rmSync(META_FILE); }
  else fs.writeFileSync(META_FILE, origMeta);
}

test.before(async () => {
  backupMeta();
  // 重置为初始空 meta，保证“公告初始为空”等断言不受历史运行数据影响
  fs.mkdirSync(path.dirname(META_FILE), { recursive: true });
  fs.writeFileSync(META_FILE, JSON.stringify({ announcement: { text: '', ts: null }, pushSubs: [], lastNotification: {} }));
  const port = 3200 + Math.floor(Math.random() * 500);
  base = `http://127.0.0.1:${port}`;
  const log = fs.openSync(path.join(ROOT, '.tmp-test.log'), 'w');
  child = spawn('node', ['server.js'], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', log, log] });
  // 等待就绪
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`${base}/api/announcement`); if (r.ok) return; } catch (e) {}
    await new Promise((res) => setTimeout(res, 100));
  }
  throw new Error('服务器启动超时');
});

test.after(() => {
  restoreMeta();
  if (child) child.kill();
});

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
async function get(url) {
  const res = await fetch(url);
  return { status: res.status, body: await res.json() };
}

test('公告初始为空', async () => {
  const { body } = await get(`${base}/api/announcement`);
  assert.equal(body.text, '');
});

test('push-key 返回 VAPID 公钥', async () => {
  const { body } = await get(`${base}/api/push-key`);
  assert.ok(body.publicKey && body.publicKey.length > 40, '应包含有效的 VAPID 公钥');
});

test('公布公告+系统通知，公告被写入', async () => {
  const { status, body } = await post(`${base}/api/push`, { password: PASSWORD, text: '🎉 测试公告', title: '标题', body: '正文' });
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.ts, '应返回公告时间戳');

  const g = await get(`${base}/api/announcement`);
  assert.equal(g.body.text, '🎉 测试公告');
});

test('仅发布公告（无通知）', async () => {
  const { body } = await post(`${base}/api/push`, { password: PASSWORD, text: '周知：周日加场' });
  assert.equal(body.ok, true);
  const g = await get(`${base}/api/announcement`);
  assert.equal(g.body.text, '周知：周日加场');
});

test('notification 返回最近推送', async () => {
  const { body } = await get(`${base}/api/notification`);
  assert.ok('title' in body && 'body' in body);
});

test('错误密码被拒绝', async () => {
  const { status } = await post(`${base}/api/push`, { password: 'wrong', title: 'x' });
  assert.equal(status, 401);
});

test('subscribe 处理退订(null)与订阅', async () => {
  const sub = await post(`${base}/api/subscribe`, { subscription: null });
  assert.equal(sub.body.ok, true);

  const sub2 = await post(`${base}/api/subscribe`, {
    subscription: { endpoint: 'https://fcm.example/push/x', keys: { p256dh: 'AA', auth: 'BB' } }
  });
  assert.equal(sub2.body.ok, true);
});

test('readCollection 正常列出', async () => {
  const { status, body } = await get(`${base}/api/duoCards`);
  assert.equal(status, 200);
  assert.ok(Array.isArray(body));
});

test('check 密码校验', async () => {
  assert.equal((await post(`${base}/api/check`, { password: PASSWORD })).body.ok, true);
  assert.equal((await post(`${base}/api/check`, { password: 'bad' })).status, 401);
});