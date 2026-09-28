// Cloudflare Pages 动态版入口：
// 直接复用 worker.js 作为 Pages 的 `_worker.js`，
// 使 humiao-home.pages.dev 拥有完整后端（在线编辑/公告/推送），数据仍存 KV。
export { default } from '../worker.js';