// Cloudflare Pages 动态版：处理 /uploads/* 文件访问（KV 存储）。
import handler from '../../worker.js';

export async function onRequest(context) {
  return handler.fetch(context.request, context.env);
}