// Cloudflare Pages 动态版：处理所有 /api/* 请求。
// 复用 worker.js 的 fetch 逻辑（该路径不会触达 ASSETS，仅用 KV）。
import handler from '../../worker.js';

export async function onRequest(context) {
  return handler.fetch(context.request, context.env);
}