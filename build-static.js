/* 静态化构建：把当前站点 + 数据打包为可在 GitHub Pages 直接运行的纯静态站
 * 产出去到 static-site/，其中不含任何后端接口，仅浏览模式。 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data', 'data.json');
const UPLOADS = path.join(ROOT, 'data', 'uploads');
const OUT = path.join(ROOT, 'static-site');

// 上传资源在仓库子路径下需用相对路径（去掉开头的 '/'），如 /uploads/a.png -> uploads/a.png
function relativizeMedia(obj) {
  if (Array.isArray(obj)) { obj.forEach(relativizeMedia); return; }
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string' && v.indexOf('/uploads/') === 0) {
        obj[k] = v.replace(/^\/uploads\//, 'uploads/');
      } else if (Array.isArray(v) || (v && typeof v === 'object')) {
        relativizeMedia(v);
      }
    }
  }
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  // 复制静态资源
  fs.copyFileSync(path.join(PUBLIC, 'style.css'), path.join(OUT, 'style.css'));
  fs.copyFileSync(path.join(PUBLIC, 'app.js'), path.join(OUT, 'app.js'));

  // 数据：重写相对媒体路径后注入 data.js
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const { password, ...pub } = raw; // 排除密码字段，避免静态站泄露
  relativizeMedia(pub);
  fs.writeFileSync(path.join(OUT, 'data.js'), 'window.STATIC_DATA = ' + JSON.stringify(pub) + ';');

  // 复制上传资源（图片/视频）到 uploads/
  copyDir(UPLOADS, path.join(OUT, 'uploads'));

  // index.html：注入 data.js（须在 app.js 之前加载）
  let html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  html = html.replace('<script src="app.js"></script>', '<script src="data.js"></script>\n  <script src="app.js"></script>');
  fs.writeFileSync(path.join(OUT, 'index.html'), html);

  console.log('静态站点已生成：', OUT);
  const size = fs.readdirSync(OUT, { recursive: true }).length;
  console.log('输出文件数：', size);
}

main();