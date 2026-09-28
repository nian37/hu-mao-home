/* 虎猫的小屋 · 前端逻辑 */
(function () {
  'use strict';

  let data = null;        // 公共数据（不含密码）
  let sessionPwd = '';    // 解锁后的管理密码（仅存于内存）
  let currentTab = 'profile';
  // GitHub Pages 静态只读模式：构建时通过 data.js 注入 window.STATIC_DATA
  const IS_STATIC = typeof window.STATIC_DATA !== 'undefined';

  const collections = {
    duoCards: { title: '💞 虎猫双人小卡', sub: '双人合照 / 官方小卡 / 同框瞬间', type: 'grid' },
    tigerCards: { title: '🐯 虎·单人小卡', sub: '虎的单人小卡收藏', type: 'grid' },
    catCards: { title: '🐱 猫·单人小卡', sub: '猫的单人小卡收藏', type: 'grid' },
    stages: { title: '🎤 虎猫双人舞台', sub: '每一次同台，都是名场面', type: 'video' },
    sugars: { title: '🍬 糖点记录', sub: '细数虎猫之间那些甜甜的小细节', type: 'grid' },
    stories: { title: '📖 虎猫动物IP小故事', sub: '属于两只小动物的童话日常', type: 'story' },
    merchNews: { title: '🧸 周边上新通知', sub: '新周边发售提醒，别错过啦', type: 'notify' },
    fanMerch: { title: '🧸 饭制周边上新', sub: '同人 / 饭制周边发售提醒', type: 'notify' },
    performanceNews: { title: '📢 公演通知', sub: '演出 / 见面会相关信息', type: 'notify' },
    vipNews: { title: '👑 高会更新通知', sub: '高会（会员）内容更新提醒', type: 'notify' },
    photos: { title: '📷 照片合集', sub: '金图收藏库，点击可放大', type: 'photos' }
  };

  // ---------- 工具 ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function toast(msg, type = '') {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast' + ' ' + (type || '');
    t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => (t.style.display = 'none'), 2600);
  }

  function esc(s = '') {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function openLightbox(src) {
    if (!src) return;
    $('#lightboxImg').src = src;
    $('#lightbox').classList.remove('hidden');
  }
  window.closeLightbox = () => $('#lightbox').classList.add('hidden');

  // ---------- 数据加载 ----------
  async function loadData() {
    if (IS_STATIC) {
      data = window.STATIC_DATA || {};
    } else {
      const res = await fetch('/api/data');
      data = await res.json();
    }
    if (IS_STATIC) {
      const vb = $('#viewerBar'); if (vb) vb.classList.add('hidden');
      const sb = $('#openSettingsBtn'); if (sb) sb.style.display = 'none';
      const pb = $('#pushBtn'); if (pb) pb.style.display = 'none'; // 静态站只读，无后台推送
    }
    renderProfile(data.profile);
    renderTabs();
    // 渲染所有栏目以便切换
    Object.keys(collections).forEach((c) => renderCollection(c));
    showTab(currentTab);
  }

  // ---------- 导航 ----------
  function renderTabs() {
    // 高亮当前
    $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === currentTab));
  }
  function showTab(name) {
    currentTab = name;
    renderTabs();
    $$('.view').forEach((v) => v.classList.add('hidden'));
    $('#view-' + name).classList.remove('hidden');
  }
  document.querySelector('#tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (btn) showTab(btn.dataset.tab);
  });

  // 单个成员（虎 / 猫）的个人信息卡片：名字、生日、公开日期、微博主页链接
  function memberSection(name, m, emoji) {
    if (!m) m = {};
    const rows = [];
    if (m.name) rows.push(`<p class="prof-line">名字：<b>${esc(m.name)}</b></p>`);
    if (m.birthday) rows.push(`<p class="prof-line">🎂 生日：<b>${esc(m.birthday)}</b></p>`);
    if (m.publicDate) rows.push(`<p class="prof-line">📅 公开日期：<b>${esc(m.publicDate)}</b></p>`);
    if (m.weibo) rows.push(`<p class="prof-line">🔗 微博主页：<a href="${esc(m.weibo)}" target="_blank" rel="noopener">${esc(m.weibo)}</a></p>`);
    return `<div class="profile-subcard">
      <div class="subcard-title">${emoji} ${name} 个人信息</div>
      ${rows.join('') || '<p class="prof-line">暂未填写</p>'}
    </div>`;
  }

  // ---------- 个人信息 ----------
  function renderProfile(p) {
    $('#siteTitle').textContent = (p.cpTitle || '虎猫') + ' 的小屋';
    $('#siteSlogan').textContent = p.slogan || '';
    const v = $('#view-profile');
    v.innerHTML = `
      ${p.bannerImage ? `<div class="profile-banner"><img src="${esc(p.bannerImage)}" alt="横幅" /></div>` : ''}
      <div class="profile-card">
        <h2>${esc(p.cpTitle || '虎猫')} CP</h2>
        <div class="profile-subs">
          ${memberSection('虎', p.tiger, '🐯')}
          ${memberSection('猫', p.cat, '🐱')}
        </div>
        ${p.debutDate ? `<p class="prof-line">📅 CP 成团 / 发布会：<b>${esc(p.debutDate)}</b></p>` : ''}
        ${p.intro ? `<div class="intro">${esc(p.intro)}</div>` : ''}
        ${(p.quotes && p.quotes.length) ? `<div class="quotes"><h4>✨ 暖心语录</h4>${p.quotes.map(q => `<div class="quote">${esc(q)}</div>`).join('')}</div>` : ''}
        ${sessionPwd !== '' ? `<div class="add-row">
          <button class="btn btn-primary is-edit" onclick="window.editProfile()">✏️ 编辑个人信息</button>
        </div>` : ''}
      </div>
    `;
  }

  // ---------- 栏目分类 ----------
  function catOf(coll) {
    if (coll === 'duoCards' || coll === 'tigerCards' || coll === 'catCards' || coll === 'fanMerch') return 'imageCard';
    if (coll === 'stages') return 'video';
    if (coll === 'photos') return 'photo';
    if (coll === 'sugars') return 'generic';
    if (coll === 'stories') return 'story';
    return 'notify';
  }

  // 图片小卡：图片下方的信息栏（时间 / 周边 / 出处）
  function cardInfoBar(r) {
    const items = [];
    if (r.date) items.push(`<span>🕐 时间 <b>${esc(r.date)}</b></span>`);
    if (r.merch) items.push(`<span>🧸 周边 <b>${esc(r.merch)}</b></span>`);
    if (r.source) items.push(`<span>📌 出处 <b>${esc(r.source)}</b></span>`);
    return items.length ? `<div class="card-info-bar">${items.join('')}</div>` : '';
  }

  // ---------- 栏目渲染（根据类型） ----------
  function renderCollection(coll) {
    const meta = collections[coll];
    const list = data[coll] || [];
    const v = $('#view-' + coll);
    const editable = sessionPwd !== '';
    const addBtn = `<div class="add-row"><button class="btn btn-primary" onclick="window.addRecord('${coll}')">＋ 添加</button></div>`;

    let body = '';
    const cat = catOf(coll);
    if (!list.length) {
      body = `<div class="empty">😺 这里还是空的，等你来填满～<small>解锁后点击右上“添加”即可记录</small></div>`;
    } else if (cat === 'notify') {
      body = `<div class="notify-list">` + list.map((r) => `
        <div class="notify-item">
          <span class="dot"></span>
          <div style="flex:1">
            <div class="n-head"><span class="n-title">${esc(r.title || '（无标题）')}</span>${r.date ? `<span class="n-date">🕐 ${esc(r.date)}</span>` : ''}</div>
            ${r.tags && r.tags.length ? `<div class="n-tags">${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
            ${r.content ? `<div class="n-content">${esc(r.content)}</div>` : ''}
            ${editable ? actionBtns(coll, r) : ''}
          </div>
        </div>`).join('') + `</div>`;
    } else if (cat === 'photo') {
      body = `<div class="photo-grid">` + list.map((r) => `
        <div class="photo-item" onclick="window.openLightboxSrc('${encodeURIComponent(JSON.stringify(r.image || ''))}')">
          <img src="${srcOrFallback(r.image)}" alt="${esc(r.title)}" />
          ${r.title ? `<div class="photo-cap">${esc(r.title)}</div>` : ''}
          ${editable ? `<div class="record-actions" style="position:absolute;top:6px;right:6px;" onclick="event.stopPropagation()">${editDelBtns(coll, r)}</div>` : ''}
        </div>`).join('') + `</div>`;
    } else if (cat === 'video') {
      body = `<div class="stage-video-list">` + list.map((r) => `
        <div class="stage-item">
          ${r.video ? `<video class="stage-video" src="${esc(r.video)}" controls preload="metadata"></video>` : `<div class="empty" style="margin:20px">暂无视频</div>`}
          <div class="stage-body">
            ${r.tags && r.tags.length ? `<div class="stage-tags">${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
            <div class="stage-title">${esc(r.title || '（无标题）')}</div>
            ${r.date ? `<div class="stage-date">🕐 ${esc(r.date)}</div>` : ''}
            ${r.content ? `<div class="stage-content">${esc(r.content)}</div>` : ''}
            ${editable ? actionBtns(coll, r) : ''}
          </div>
        </div>`).join('') + `</div>`;
    } else if (cat === 'story') {
      body = `<div class="story-list">` + list.map((r) => `
        <div class="story-item">
          ${r.image ? `<img class="story-img" src="${srcOrFallback(r.image)}" alt="${esc(r.title)}" loading="lazy" />` : ''}
          <div class="story-body">
            ${r.tags && r.tags.length ? `<div class="story-tags">${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
            ${r.title ? `<div class="story-title">${esc(r.title)}</div>` : ''}
            ${r.date ? `<div class="story-date">🕐 ${esc(r.date)}</div>` : ''}
            ${r.content ? `<div class="story-content">${esc(r.content)}</div>` : ''}
            ${editable ? actionBtns(coll, r) : ''}
          </div>
        </div>`).join('') + `</div>`;
    } else if (cat === 'imageCard') {
      body = `<div class="grid">` + list.map((r) => `
        <div class="record-card ${r.image ? '' : 'no-img'}">
          ${r.image ? `<div class="card-img-wrap" onclick="window.openLightboxSrc('${encodeURIComponent(JSON.stringify(r.image))}')"><img class="card-img" src="${srcOrFallback(r.image)}" alt="${esc(r.title)}" loading="lazy" /></div>` : ''}
          <div class="card-body">
            ${r.tags && r.tags.length ? `<div class="record-tags">${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
            ${r.title ? `<div class="record-title">${esc(r.title)}</div>` : ''}
            ${r.content ? `<div class="record-content">${esc(r.content)}</div>` : ''}
            ${cardInfoBar(r)}
            ${editable ? actionBtns(coll, r) : ''}
          </div>
        </div>`).join('') + `</div>`;
    } else {
      body = `<div class="grid">` + list.map((r) => `
        <div class="record-card ${r.image ? '' : 'no-img'}">
          ${r.image ? `<div class="card-img-wrap" onclick="window.openLightboxSrc('${encodeURIComponent(JSON.stringify(r.image))}')"><img class="card-img" src="${srcOrFallback(r.image)}" alt="${esc(r.title)}" loading="lazy" /></div>` : ''}
          <div class="card-body">
            ${r.tags && r.tags.length ? `<div class="record-tags">${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}
            <div class="record-title">${esc(r.title || '（无标题）')}</div>
            ${r.date ? `<div class="record-date">🕐 ${esc(r.date)}</div>` : ''}
            ${r.content ? `<div class="record-content">${esc(r.content)}</div>` : ''}
            ${editable ? actionBtns(coll, r) : ''}
          </div>
        </div>`).join('') + `</div>`;
    }

    v.innerHTML = `
      <div class="view-title">${meta.title}</div>
      <div class="view-sub">${meta.sub}</div>
      ${editable ? addBtn : `<div class="add-row"><span class="hint" style="margin:0">👀 浏览模式下可尽情观看；如需添加内容请在上方输入管理密码解锁。</span></div>`}
      ${body}
    `;
  }

  function actionBtns(coll, r) {
    return `<div class="record-actions">
      <button class="btn" onclick="window.editRecord('${coll}','${r.id}')">✏︎ 编辑</button>
      <button class="btn btn-danger" onclick="window.delRecord('${coll}','${r.id}')">🗑 删除</button>
    </div>`;
  }
  function editDelBtns(coll, r) {
    return `<button class="btn" style="background:#fff" onclick="window.editRecord('${coll}','${r.id}')">✏︎</button>
      <button class="btn btn-danger" style="background:#fff" onclick="window.delRecord('${coll}','${r.id}')">🗑</button>`;
  }

  function srcOrFallback(src) {
    return src && src.trim() ? src : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#F5E2C2"/><text x="200" y="210" font-size="60" text-anchor="middle">🐾</text></svg>');
  }

  window.openLightboxSrc = (enc) => {
    let src = '';
    try { src = JSON.parse(decodeURIComponent(enc)); } catch (e) {}
    openLightbox(src);
  };

  // ---------- 解锁（浏览 -> 编辑） ----------
  function setEditMode() {
    const bar = $('#viewerBar');
    bar.classList.add('hidden');
    updateAdminBtn(true);
    Object.keys(collections).forEach((c) => renderCollection(c));
    renderProfile(data.profile);
    toast('已进入管理员模式，可以添加 / 修改 / 删除内容了 ✔');
  }

  function updateAdminBtn(on) {
    const b = $('#adminBtn');
    if (!b) return;
    b.textContent = on ? '👑 管理员已开启' : '👑 管理员模式';
    b.classList.toggle('locked-on', !!on);
  }

  function lockMode() {
    sessionPwd = '';
    const bar = $('#viewerBar');
    if (bar) bar.classList.remove('hidden');
    updateAdminBtn(false);
    Object.keys(collections).forEach((c) => renderCollection(c));
    renderProfile(data.profile);
    toast('已退出管理员模式');
  }

  // 管理员模式：切换
  window.toggleAdminMode = () => {
    if (IS_STATIC) { toast('线上为只读模式，请在本地站进入管理员', 'err'); return; }
    if (sessionPwd !== '') { lockMode(); return; }
    $('#adminModal').classList.remove('hidden');
    const inp = $('#adminPwd'); if (inp) { inp.value = ''; setTimeout(() => inp.focus(), 50); }
  };
  window.closeAdmin = () => $('#adminModal').classList.add('hidden');

  // 管理员密码提交
  $('#adminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pwd = $('#adminPwd').value;
    if (!pwd) return toast('请输入密码', 'err');
    const ok = await checkPwd(pwd);
    if (!ok) { toast('密码错误', 'err'); return; }
    sessionPwd = pwd;
    $('#adminPwd').value = '';
    $('#adminModal').classList.add('hidden');
    setEditMode();
  });

  $('#viewerPwdBtn').addEventListener('click', async () => {
    const pwd = $('#viewerPwd').value;
    if (!pwd) return toast('请输入密码', 'err');
    const ok = await checkPwd(pwd);
    if (!ok) { toast('密码错误', 'err'); return; }
    sessionPwd = pwd;
    $('#viewerPwd').value = '';
    setEditMode();
  });

  async function checkPwd(pwd) {
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd })
      });
      const d = await res.json();
      return d.ok === true;
    } catch (e) { return false; }
  }

  // ---------- 记录表单（新增/编辑，按栏目分类） ----------
  function fval(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

  function uploadZoneHtml(kind, targetId) {
    const isV = kind === 'video';
    return `<div class="upload-zone" onclick="document.getElementById('${targetId}').click()">
        <span class="big">${isV ? '🎬' : '🖼️'}</span>
        点击从系统相册选择${isV ? '视频' : '图片'}
        <span class="small">${isV ? 'mp4 / mov，单段 16MB 内' : 'jpg / png / webp，单张 8MB 内'}</span>
      </div>
      <input type="file" id="${targetId}" accept="${isV ? 'video/*' : 'image/*'}" data-kind="${kind}" data-target="${isV ? 'f_video' : 'f_image'}" style="display:none" />
      <input type="hidden" id="${isV ? 'f_video' : 'f_image'}" />
      <div class="media-preview" id="mediaPreview"></div>`;
  }

  function renderMediaPreview(kind, url) {
    const box = document.getElementById('mediaPreview');
    if (!box) return;
    box.innerHTML = kind === 'video'
      ? `<video src="${esc(url)}" controls preload="metadata" style="max-height:300px"></video>`
      : `<img src="${esc(url)}" />`;
  }

  function recordFieldsHtml(coll, rec) {
    const cat = catOf(coll);
    const tags = rec && rec.tags ? rec.tags.join(',') : '';
    if (cat === 'imageCard') {
      return `
        <label>标题<input type="text" id="f_title" value="${esc(rec ? rec.title : '')}" placeholder="可选的卡片标题" /></label>
        ${uploadZoneHtml('image', 'f_imageFile')}
        <div class="info-bar">
          <div class="info-bar-title">📋 信息栏</div>
          <label>时间<input type="text" id="f_date" value="${esc(rec ? (rec.date || '') : '')}" placeholder="如 2026-03-15" /></label>
          <label>周边<input type="text" id="f_merch" value="${esc(rec ? (rec.merch || '') : '')}" placeholder="如 三周年纪念小卡" /></label>
          <label>出处<input type="text" id="f_source" value="${esc(rec ? (rec.source || '') : '')}" placeholder="如 官方小卡 / 自拍 / 应援图" /></label>
          <label>备注<textarea id="f_content" rows="3">${esc(rec ? (rec.content || '') : '')}</textarea></label>
        </div>
      `;
    }
    if (cat === 'video') {
      return `
        <label>标题<input type="text" id="f_title" value="${esc(rec ? rec.title : '')}" required /></label>
        ${uploadZoneHtml('video', 'f_videoFile')}
        <label>标签<input type="text" id="f_tags" value="${esc(tags)}" placeholder="逗号分隔，如 出道,团综" /></label>
        <label>日期<input type="text" id="f_date" value="${esc(rec ? (rec.date || '') : '')}" placeholder="如 2026-04-12" /></label>
        <label>备注<textarea id="f_content" rows="3">${esc(rec ? (rec.content || '') : '')}</textarea></label>
      `;
    }
    if (cat === 'photo') {
      return `
        <label>图注<input type="text" id="f_title" value="${esc(rec ? rec.title : '')}" /></label>
        ${uploadZoneHtml('image', 'f_imageFile')}
        <label>日期<input type="text" id="f_date" value="${esc(rec ? (rec.date || '') : '')}" /></label>
        <label>备注<textarea id="f_content" rows="3">${esc(rec ? (rec.content || '') : '')}</textarea></label>
      `;
    }
    // generic（糖点）/ story（动物IP小故事）/ notify
    return `
      <label>标题<input type="text" id="f_title" value="${esc(rec ? rec.title : '')}" ${cat === 'notify' ? 'required' : ''} /></label>
      <label>日期<input type="text" id="f_date" value="${esc(rec ? (rec.date || '') : '')}" placeholder="如 2026-09-27" /></label>
      ${cat === 'generic' || cat === 'story' ? `<label>图片<input type="file" id="f_imageFile" accept="image/*" data-kind="image" data-target="f_image" style="display:none" /><input type="hidden" id="f_image" /><div class="media-preview" id="mediaPreview"></div></label>` : ''}
      <label>标签<input type="text" id="f_tags" value="${esc(tags)}" placeholder="逗号分隔，如 舞台,糖点" /></label>
      <label>内容<textarea id="f_content" rows="4">${esc(rec ? (rec.content || '') : '')}</textarea></label>
    `;
  }

  function openRecordForm(coll, rec) {
    $('#modal').classList.remove('hidden');
    $('#modalTitle').textContent = rec ? '编辑记录' : '新增记录';
    $('#f_col').value = coll;
    $('#f_id').value = rec ? rec.id : '';
    $('#recordFields').innerHTML = recordFieldsHtml(coll, rec);
    $('#f_password').value = sessionPwd;
    // 已有媒体回显预览
    if (rec && (rec.image || rec.video)) {
      const kind = catOf(coll) === 'video' ? 'video' : 'image';
      renderMediaPreview(kind, catOf(coll) === 'video' ? rec.video : rec.image);
    }
  }
  window.addRecord = (coll) => {
    if (sessionPwd === '') { toast('请先在上方输入管理密码解锁', 'err'); return; }
    openRecordForm(coll, null);
  };
  window.editRecord = (coll, id) => {
    const rec = (data[coll] || []).find((x) => x.id === id);
    openRecordForm(coll, rec);
  };
  window.closeModal = () => $('#modal').classList.add('hidden');

  // 从相册选择文件 -> 上传到服务器 -> 回显预览（事件委托到表单字段区）
  $('#recordFields').addEventListener('change', async (e) => {
    const input = e.target;
    if (!input || input === $('#recordFields')) return;
    if (input.matches && input.matches('input[type=file]') && input.files && input.files[0]) {
      const kind = input.dataset.kind;
      const targetId = input.dataset.target;
      const file = input.files[0];
      const max = kind === 'video' ? 16 * 1024 * 1024 : 8 * 1024 * 1024;
      if (file.size > max) {
        toast(kind === 'video' ? '视频过大，请压缩到 16MB 内' : '图片过大，请压缩到 8MB 内', 'err');
        input.value = '';
        return;
      }
      toast('上传中…请稍候');
      const url = await uploadFile(file, kind);
      if (url) {
        document.getElementById(targetId).value = url;
        renderMediaPreview(kind, url);
      }
      input.value = '';
    }
  });

  async function uploadFile(file, kind) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: reader.result, kind, password: sessionPwd })
          });
          const d = await res.json();
          if (d.ok) resolve(d.url);
          else { toast(d.message || '上传失败', 'err'); resolve(null); }
        } catch (err) { toast('上传失败', 'err'); resolve(null); }
      };
      reader.onerror = () => { toast('读取文件失败', 'err'); resolve(null); };
      reader.readAsDataURL(file);
    });
  }

  $('#recordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const coll = $('#f_col').value;
    const id = $('#f_id').value;
    const cat = catOf(coll);
    const tags = fval('f_tags').split(/[,，]/).filter(Boolean);
    const image = fval('f_image');
    if ((cat === 'imageCard' || cat === 'photo') && !image) { toast('请先选择并上传图片', 'err'); return; }
    if (cat === 'video' && !fval('f_video')) { toast('请先选择并上传视频', 'err'); return; }
    const payload = {
      title: fval('f_title'),
      date: fval('f_date'),
      content: fval('f_content'),
      image,
      video: fval('f_video'),
      merch: fval('f_merch'),
      source: fval('f_source'),
      tags,
      password: $('#f_password').value
    };
    const url = id ? `/api/${coll}/${id}` : `/api/${coll}`;
    const method = id ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const d = await res.json();
    if (!res.ok || d.ok !== true) { toast(d.message || '保存失败', 'err'); return; }
    toast(id ? '已更新 ✔' : '已添加 ✔');
    $('#modal').classList.add('hidden');
    await loadData();
  });

  // ---------- 删除 ----------
  window.delRecord = async (coll, id) => {
    if (sessionPwd === '') { toast('请先解锁', 'err'); return; }
    if (!confirm('确定要删除这条记录吗？')) return;
    const res = await fetch(`/api/${coll}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: sessionPwd })
    });
    const d = await res.json();
    if (!res.ok || d.ok !== true) { toast(d.message || '删除失败', 'err'); return; }
    toast('已删除');
    await loadData();
  };

  // ---------- 个人信息编辑 ----------
  window.editProfile = () => {
    if (sessionPwd === '') { toast('请先在上方输入管理密码解锁', 'err'); return; }
    const p = data.profile;
    const t = p.tiger || {};
    const c = p.cat || {};
    $('#p_title').value = p.cpTitle || '';
    $('#p_slogan').value = p.slogan || '';
    $('#p_debutDate').value = p.debutDate || '';
    // 虎
    $('#t_name').value = t.name || '';
    $('#t_birthday').value = t.birthday || '';
    $('#t_publicDate').value = t.publicDate || '';
    $('#t_weibo').value = t.weibo || '';
    // 猫
    $('#c_name').value = c.name || '';
    $('#c_birthday').value = c.birthday || '';
    $('#c_publicDate').value = c.publicDate || '';
    $('#c_weibo').value = c.weibo || '';
    $('#p_banner').value = p.bannerImage || '';
    $('#p_bannerFile').value = '';
    $('#p_intro').value = p.intro || '';
    $('#p_quotes').value = (p.quotes || []).join('\n');
    $('#p_password').value = sessionPwd;
    $('#profileModal').classList.remove('hidden');
  };
  window.closeProfileModal = () => $('#profileModal').classList.add('hidden');

  $('#p_bannerFile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 3 * 1024 * 1024) { toast('图片建议 3MB 以内', 'err'); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { $('#p_banner').value = reader.result; };
    reader.readAsDataURL(f);
  });

  $('#profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const quotes = $('#p_quotes').value.split('\n').map((q) => q.trim()).filter(Boolean);
    // 保存纸质成员信息
    const member = (nameId, birthId, pubId, weiboId) => ({
      name: $(nameId).value.trim(),
      birthday: $(birthId).value.trim(),
      publicDate: $(pubId).value.trim(),
      weibo: $(weiboId).value.trim()
    });
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cpTitle: $('#p_title').value.trim(),
        slogan: $('#p_slogan').value.trim(),
        debutDate: $('#p_debutDate').value.trim(),
        bannerImage: $('#p_banner').value.trim(),
        intro: $('#p_intro').value.trim(),
        quotes,
        tiger: member('#t_name', '#t_birthday', '#t_publicDate', '#t_weibo'),
        cat: member('#c_name', '#c_birthday', '#c_publicDate', '#c_weibo'),
        password: $('#p_password').value
      })
    });
    const d = await res.json();
    if (!res.ok || d.ok !== true) { toast(d.message || '保存失败', 'err'); return; }
    toast('个人信息已保存 ✔');
    $('#profileModal').classList.add('hidden');
    await loadData();
  });

  // ---------- 设置：修改密码 ----------
  $('#openSettingsBtn').addEventListener('click', () => $('#settingsModal').classList.remove('hidden'));
  window.closeSettings = () => $('#settingsModal').classList.add('hidden');

  $('#passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = $('#pw_current').value;
    const next = $('#pw_next').value;
    const res = await fetch('/api/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current, next })
    });
    const d = await res.json();
    if (!res.ok || d.ok !== true) { toast(d.message || '修改失败', 'err'); return; }
    toast('密码已修改 ✔');
    sessionPwd = next;
    $('#settingsModal').classList.add('hidden');
    $('#pw_current').value = '';
    $('#pw_next').value = '';
  });

  // ---------- 站内公告 ----------
  async function loadAnnouncement() {
    if (IS_STATIC) return; // 静态只读模式无公告 API
    try {
      const res = await fetch('/api/announcement', { cache: 'no-store' });
      const d = await res.json();
      const text = (d && d.text) || '';
      const ts = (d && d.ts) || '';
    const key = 'humao_announce_seen_' + ts;
    const bar = $('#announceBar');
    if (!bar) return;
    const textEl = $('#announceText');
    if (textEl) textEl.dataset.ts = ts;
    if (text && localStorage.getItem(key) !== '1') {
      textEl.textContent = text;
      bar.classList.remove('hidden');
    } else {
      bar.classList.add('hidden');
    }
    } catch (e) { /* 静默失败 */ }
  }
  window.dismissAnnounce = () => {
    const bar = $('#announceBar');
    if (!bar) return;
    bar.classList.add('hidden');
    // 记录当前公告已读（依据 ts），避免每次刷新都弹
    try {
      const ts = $('#announceText').dataset.ts;
      if (ts) localStorage.setItem('humao_announce_seen_' + ts, '1');
    } catch (e) { /* ignore */ }
  };

  // ---------- Web Push 订阅 ----------
  function pushAvailable() {
    return !IS_STATIC && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  async function ensureSW() {
    if (!('serviceWorker' in navigator)) return null;
    if (navigator.serviceWorker.controller) return navigator.serviceWorker;
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' });
      return await navigator.serviceWorker.ready;
    } catch (e) { return null; }
  }
  async function getSub() {
    try {
      const reg = await ensureSW();
      if (!reg) return null;
      return await reg.pushManager.getSubscription();
    } catch (e) { return null; }
  }
  function setNotifBtn(subscribed) {
    const b = $('#notifBtn');
    if (!b) return;
    if (subscribed) { b.textContent = '🔔 已订阅'; b.classList.add('locked-on'); }
    else { b.textContent = '🔔 通知'; b.classList.remove('locked-on'); }
  }

  window.toggleNotifSub = async () => {
    if (!pushAvailable()) { toast('浏览器不支持推送，请使用新版 Chrome / Edge', 'err'); return; }
    if (Notification.permission === 'denied') {
      toast('通知权限已被拒绝，请在浏览器设置中开启', 'err');
      return;
    }
    const existing = await getSub();
    if (existing) { // 退订
      try {
        await existing.unsubscribe();
        await fetch('/api/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: null })
        });
        setNotifBtn(false);
        toast('已取消订阅通知 🔕');
      } catch (e) { toast('取消失败，请重试', 'err'); }
      return;
    }
    try { // 订阅
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { toast('未获得通知权限，无法订阅', 'err'); return; }
      const reg = await ensureSW();
      if (!reg) { toast('Service Worker 初始化失败', 'err'); return; }
      const keyRes = await fetch('/api/push-key', { cache: 'no-store' });
      const { publicKey } = await keyRes.json();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
      const saveRes = await fetch('/api/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() })
      });
      const d = await saveRes.json();
      if (d.ok !== true) throw new Error('save fail');
      setNotifBtn(true);
      toast('订阅成功，有新动态会第一时间提醒你 🎉');
    } catch (e) { toast('订阅失败，请重试', 'err'); }
  };

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  // 页面加载时恢复订阅按钮状态
  (async function initPushState() {
    if (!pushAvailable()) { if ($('#notifBtn')) $('#notifBtn').style.display = 'none'; return; }
    const sub = await getSub();
    setNotifBtn(!!sub);
  })();

  // ---------- 管理推送（公告 + 系统通知） ----------
  window.openPush = () => {
    if (IS_STATIC) { toast('线上为只读模式，请在本站后台推送', 'err'); return; }
    $('#pushModal').classList.remove('hidden');
  };
  window.closePush = () => $('#pushModal').classList.add('hidden');

  $('#pushForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = fval('pu_password');
    const title = fval('pu_title');
    const body = fval('pu_body');
    const annText = fval('pu_announce');
    if (!password) return toast('请输入管理密码', 'err');
    if (!title && !body && !annText) return toast('请至少填写公告或推送内容', 'err');
    const payload = { password };
    if (annText) payload.text = annText; // 公告
    if (title || body) { payload.title = title; payload.body = body; } // 系统推送
    try {
      const res = await fetch('/api/push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.ok !== true) { toast(d.message || '发送失败', 'err'); return; }
      $('#pushModal').classList.add('hidden');
      if (annText) { // 刷新公告横幅
        localStorage.removeItem('humao_announce_seen_' + d.ts);
        loadAnnouncement();
      }
      let msg = '推送已发送 ✔';
      if (typeof d.sent === 'number') msg += `（系统通知送达 ${d.sent} 人）`;
      toast(msg);
    } catch (err) { toast('发送失败，请重试', 'err'); }
  });

  // 默认展示（未解锁时的游客模式先渲染空壳）
  function init() {
    // 先渲染栏目骨架与标签结构
    Object.keys(collections).forEach((c) => {
      const v = $('#view-' + c);
      const meta = collections[c];
      v.innerHTML = `<div class="view-title">${meta.title}</div><div class="view-sub">${meta.sub}</div><div class="empty">😺 正在加载…</div>`;
    });
    $('#view-profile').innerHTML = `<div class="empty">😺 正在加载…</div>`;
    loadData();
    loadAnnouncement();
  }

  init();
})();