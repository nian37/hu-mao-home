/* 虎猫的小屋 · 前端逻辑 */
(function () {
  'use strict';

  let data = null;        // 公共数据（不含密码）
  let sessionPwd = '';    // 解锁后的管理密码（仅存于内存）
  let currentTab = 'profile';
  // GitHub Pages 静态只读模式：构建时通过 data.js 注入 window.STATIC_DATA
  const IS_STATIC = typeof window.STATIC_DATA !== 'undefined';

  const collections = {
    pets: { title: '🐾 养宠小屋', sub: '养一养小虎和小猫，陪它们一起长大', type: 'pets' },
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
    if (coll === 'pets') { renderPetsView(v); return; }
    if (!list.length) {
      body = `<div class="empty">😺 这里还是空的，等你来填满～<small>解锁后点击右上"添加"即可记录</small></div>`;
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

  // ---------- 🐾 养宠小屋 ----------
  const PET_IMAGES = {
    tiger: { src: 'pets/tiger.png', name: '小虎', emoji: '🐯', sub: '口嫌体正直的傲娇虎', barColor: 'var(--tiger, #d97e06)' },
    cat: { src: 'pets/cat.png', name: '小猫', emoji: '🐱', sub: '安静治愈的橘猫妹妹', barColor: 'var(--cat, #e8873c)' }
  };
  const STAGE_NAMES = ['🥚 幼年', '🌟 成长期', '👑 完全体'];
  const PKEY = 'humiao_pets_save_v1';

  // 初始化宠物状态（首次 / 重置）
  function defaultPets() {
    const now = Date.now();
    return {
      tiger: { love: 30, food: 60, mood: 70, energy: 80, stage: 0, exp: 0, last: now },
      cat: { love: 30, food: 60, mood: 70, energy: 80, stage: 0, exp: 0, last: now }
    };
  }
  function loadPetsState() {
    if (typeof localStorage === 'undefined') return defaultPets();
    try {
      const raw = localStorage.getItem(PKEY);
      if (raw) {
        const merged = Object.assign(defaultPets(), JSON.parse(raw));
        applyOffline(merged);
        return merged;
      }
    } catch (e) {}
    return defaultPets();
  }
  function savePetsState(state) {
    try { localStorage.setItem(PKEY, JSON.stringify(state)); } catch (e) {}
  }
  // 离线时长衰减：空闲时属性自然变化
  function applyOffline(state) {
    const now = Date.now();
    Object.keys(state).forEach((k) => {
      const p = state[k];
      const mins = Math.floor((now - (p.last || now)) / 60000);
      if (mins > 0) {
        // 每 20 分钟统一下降一点，最多衰减 15
        const drop = Math.min(15, Math.floor(mins / 20));
        p.food = Math.max(0, p.food - drop);
        p.energy = Math.max(0, p.energy - drop);
        p.mood = Math.max(0, p.mood - drop);
        p.last = now;
      }
    });
    savePetsState(state);
  }
  function stageOf(stats) {
    return stats.stage || 0;
  }
  function petStageLabel(pet, key) {
    const stage = stageOf(pet);
    return `${STAGE_NAMES[stage]}`;
  }
  // 加经验 / 升段
  function addExp(state, key, n) {
    const p = state[key];
    p.exp = Math.min(100, (p.exp || 0) + n);
    if (p.exp >= 100 && p.stage < 2) {
      p.stage += 1;
      p.exp = 0;
      toast(`${PET_IMAGES[key].name} 长大啦！♪(^∇^*)`);
    }
  }

  // ---------- 养宠云同步：clientId / API ----------
  function getClientId() {
    if (typeof localStorage === 'undefined') return '';
    let id = localStorage.getItem('humiao_pets_cid');
    if (!id) {
      id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem('humiao_pets_cid', id); } catch (e) {}
    }
    return id;
  }
  let petCloudName = '';
  try { petCloudName = localStorage.getItem('humiao_pets_name') || ''; } catch (e) {}
  async function apiPets(action, params, method = 'POST') {
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (method === 'GET') {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch('/api/pets/' + action + (qs ? '?' + qs : ''), { cache: 'no-store' });
        return await res.json();
      }
      opts.body = JSON.stringify(params);
      const res = await fetch('/api/pets/' + action, opts);
      return await res.json();
    } catch (e) { return { ok: false }; }
  }
  // 成长值总分（用于排行榜）：四项属性求和 + 阶段加成
  function petTotalScore(state) {
    let s = 0;
    ['tiger', 'cat'].forEach((k) => {
      const p = state[k] || {};
      s += (p.love || 0) + (p.food || 0) + (p.mood || 0) + (p.energy || 0) + (p.stage || 0) * 80 + (p.exp || 0);
    });
    return s;
  }
  let petsSyncing = false;
  function syncPetsToCloud(state) {
    const cid = getClientId();
    if (!cid) return;
    if (petsSyncing) return;
    petsSyncing = true;
    savePetsState(state);
    // 云端合并存档
    apiPets('save', { clientId: cid, state }).finally(() => { petsSyncing = false; });
    // 更新排行榜（名字用 localStorage 保存的昵称）
    const name = (petCloudName || '小可爱');
    apiPets('leaderboard', { clientId: cid, name, score: petTotalScore(state) });
  }

  function renderPetsView(v) {
    const state = loadPetsState();
    const editable = sessionPwd !== '';
    const cid = getClientId();
    v.innerHTML = `
      <div class="view-title">🐾 养宠小屋</div>
      <div class="view-sub">养一养小虎和小猫，陪它们一起长大。支持云存档、每日签到和成长排行榜～</div>
      <div class="pets-syncbar">
        <span class="pets-cloud" id="petsCloudStatus">☁️ 正在连接云端…</span>
        <input id="petNameInput" class="pets-name-input" placeholder="输入我的昵称" value="${esc(petCloudName)}" maxlength="16" />
        <button class="btn btn-primary" id="petNameBtn">✏️ 换昵称</button>
        <button class="btn" id="petCheckinBtn">📅 签到</button>
        <button class="btn" id="petBallBtn">🏆 排行榜</button>
      </div>
      <div class="pets-checkin" id="petsCheckinBox"></div>
      <div class="pets-radio" id="petsRadio"></div>
      <div class="pets-wrap">
        ${petPanelHTML('tiger', state.tiger)}
        ${petPanelHTML('cat', state.cat)}
      </div>
      <div class="pets-wear">
        <div class="pets-wear-title">👔 换装间</div>
        <div class="pets-wear-body" id="petsWearBody"><i style="color:var(--ink-soft);font-style:normal">加载中…</i></div>
      </div>
      <div class="pets-actions">
        ${editable ? '<button class="btn btn-primary" onclick="window.petFullAll()">⚡ 全部满格</button><button class="btn btn-danger" onclick="window.petResetAll()">♻️ 重置养宠</button>' : ''}
        <span class="hint" style="margin-left:auto">💾 进度实时自动保存 + 云同步</span>
      </div>
      <div id="petsLeaderboard" class="pets-leaderboard"></div>
      <div class="pet-purr" id="petPurr"></div>
    `;
    bindPetEvents(v, state);
    bindPetCloudUI(v, state);
    refreshPetsCloudStatus();
  }

  // 云端：读存档合并 + 更新签到/排行榜 UI + 换装渲染
  function refreshPetsCloudStatus() {
    const el = $('#petsCloudStatus');
    const cid = getClientId();
    if (!el) return;
    el.textContent = '☁️ 云端同步中…';
    apiPets('load', { clientId: cid }, 'GET').then((r) => {
      const v = $('#view-pets');
      if (!v) return;
      const state = loadPetsState();
      if (r && r.ok && r.state) {
        // 与服务端合并（取各属性更高值），避免互相覆盖
        ['tiger', 'cat'].forEach((k) => {
          const a = state[k] || {}, b0 = r.state[k] || {};
          ['love', 'food', 'mood', 'energy', 'exp', 'stage'].forEach((attr) => {
            state[k][attr] = Math.max(Number(a[attr] || 0), Number(b0[attr] || 0));
          });
          if (b0.wear !== undefined) state[k].wear = b0.wear;
        });
        savePetsState(state);
        renderPetStatsAndWears(state);
      }
      if (el) el.textContent = '☁️ 云存档已同步 · 联网可跨设备继续' + (r && r.ok ? '' : '（离线，仅本地）');
      // 签到状态
      const ok = r && r.checkin;
      const checkinBox = $('#petsCheckinBox');
      if (checkinBox) {
        if (ok && ok.last && ok.last === new Date().toISOString().slice(0, 10)) {
          checkinBox.innerHTML = `📅 今天已签到 · 连续 ${ok.streak} 天 ✨`;
          checkinBox.classList.remove('hidden');
        }
      }
    });
    // 拉取排行榜
    apiPets('leaderboard', null, 'GET').then((r) => {
      const box = $('#petsLeaderboard');
      if (!box) return;
      if (!r || !r.ok || !r.list || !r.list.length) { box.innerHTML = ''; return; }
      const top = r.list.slice(0, 10);
      const cidNow = cid;
      let html = '<div class="pets-leaderboard-title">🏆 养宠成长榜 TOP' + Math.min(top.length, 10) + '</div><div class="pets-lb-list">';
      top.forEach((row, i) => {
        const isMe = row.clientId === cidNow;
        html += `<div class="pets-lb-row ${isMe ? 'me' : ''}">
          <span class="pets-lb-rank">${i + 1}</span>
          <span class="pets-lb-name">${esc(row.name || '小可爱')}${isMe ? '（我）' : ''}</span>
          <span class="pets-lb-score">${row.score} 分</span>
        </div>`;
      });
      html += '</div>';
      box.innerHTML = html;
    });
  }

  // 仅刷新统计条和换装预览（不改动 DOM 绑定）
  function renderPetStatsAndWears(state) {
    const v = $('#view-pets');
    if (!v) return;
    ['tiger', 'cat'].forEach((k) => {
      const pet = state[k] || {};
      ['love', 'food', 'mood', 'energy'].forEach((a) => {
        const bar = v.querySelector(`.pet-bar i[data-pet="${k}"][data-k="${a}"]`);
        const val = v.querySelector(`[data-pet="${k}"][data-v="${a}"]`);
        if (bar) bar.style.width = pet[a] + '%';
        if (val) val.textContent = pet[a];
      });
      const expBar = v.querySelector(`[data-pet="${k}"][data-exp]`);
      const expTxt = v.querySelector(`.pets-wrap [data-pet="${k}"] .pet-exp-txt`);
      if (expBar) expBar.style.width = pet.exp + '%';
      if (expTxt) expTxt.textContent = '已点亮 ' + pet.exp + '% 成长值';
    });
  }

  // ---------- 换装系统 ----------
  const WEARS = {
    none: { label: '👒 默认', overlay: '', bg: 'var(--bg-soft)' },
    hat: { label: '🎩 绅士帽', overlay: '🎩', bg: '#FDE68A' },
    bow: { label: '🎀 蝴蝶结', overlay: '🎀', bg: '#FBCFE8' },
    crown: { label: '👑 小皇冠', overlay: '👑', bg: '#FEF3C7' },
    scarf: { label: '🧣 小围巾', overlay: '🧣', bg: '#CFFAFE' },
    glasses: { label: '🕶 酷墨镜', overlay: '🕶', bg: '#E0E7FF' }
  };
  function wearSelectHtml(key, pet) {
    const current = pet.wear || 'none';
    let html = '';
    Object.keys(WEARS).forEach((w) => {
      const it = WEARS[w];
      html += `<button class="wear-btn ${current === w ? 'on' : ''}" data-wearpet="${key}" data-wear="${w}">${it.label}</button>`;
    });
    return html;
  }
  function bindPetsWearUI(v, state) {
    $('#petsWearBody').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-wearpet]');
      if (!btn) return;
      const petk = btn.dataset.wearpet;
      const w = btn.dataset.wear;
      state[petk].wear = w;
      savePetsState(state);
      syncPetsToCloud(state);
      // 更新该项按钮高亮 + 图片框
      v.querySelectorAll(`[data-wearpet="${petk}"]`).forEach((b) => b.classList.remove('on'));
      btn.classList.add('on');
      const imgBox = v.querySelector(`.pet-panel[data-pet="${petk}"] .pet-img`);
      applyWearToBox(imgBox, state[petk]);
    });
  }
  function applyWearToBox(box, pet) {
    if (!box) return;
    const w = pet.wear;
    const it = WEARS[w] || WEARS.none;
    box.style.background = it.bg;
    let ov = box.querySelector('.pet-wear-ov');
    if (!ov) {
      ov = document.createElement('span');
      ov.className = 'pet-wear-ov';
      box.appendChild(ov);
    }
    ov.textContent = it.overlay;
    ov.style.display = it.overlay ? '' : 'none';
  }

  function renderPetPanelWear(key, pet) {
    // CSS 里 .pet-wear-ov 居中叠在图片上方
    const v = $('#view-pets');
    if (!v) return;
    const box = v.querySelector(`.pet-panel[data-pet="${key}"] .pet-img`);
    applyWearToBox(box, pet);
  }

  // 云存档 UI：昵称 / 签到 / 排行榜开关 / 换装渲染
  function bindPetCloudUI(v, state) {
    const nameBtn = $('#petNameBtn');
    const nameInput = $('#petNameInput');
    if (nameBtn) nameBtn.addEventListener('click', () => {
      const val = (nameInput.value || '').trim().slice(0, 16);
      if (!val) { toast('昵称不能为空', 'err'); return; }
      petCloudName = val;
      try { localStorage.setItem('humiao_pets_name', val); } catch (e) {}
      syncPetsToCloud(state);
      toast('昵称已更新：' + val + ' 🎉');
      refreshPetsCloudStatus();
    });
    const ci = $('#petCheckinBtn');
    if (ci) ci.addEventListener('click', () => {
      const cid = getClientId();
      apiPets('checkin', { clientId: cid }).then((r) => {
        if (!r || !r.ok) { toast('签到失败，请检查网络', 'err'); return; }
        // 奖励：吃到/陪玩随机成长
        const reward = 8 + Math.floor(Math.random() * 6);
        if (!r.already) {
          ['tiger', 'cat'].forEach((k) => {
            state[k].mood = Math.min(100, (state[k].mood || 0) + 5);
            addExp(state, k, reward);
          });
          savePetsState(state);
          syncPetsToCloud(state);
          renderPetStatsAndWears(state);
          $('#petsCheckinBox').innerHTML = `📅 签到成功！连续 ${r.streak} 天，两只都点亮成长值 +${reward} ✨`;
          $('#petsCheckinBox').classList.remove('hidden');
          toast(`签到成功 · 连续 ${r.streak} 天 🎉`);
        } else {
          toast(`今天已经签到过啦（连续 ${r.streak} 天）`, '');
        }
      });
    });
    const bb = $('#petBallBtn');
    const lb = $('#petsLeaderboard');
    if (bb) bb.addEventListener('click', () => {
      if (!lb) return;
      const hidden = lb.classList.toggle('hidden');
      bb.textContent = hidden ? '🏆 排行榜' : '🙈 收起排行';
    });
    // 换装渲染
    refreshPetsWear(v, state);
  }
  function refreshPetsWear(v, state) {
    const body = $('#petsWearBody');
    if (!body) return;
    const idx = { tiger: 0, cat: 1 };
    body.innerHTML = `
      <div class="pets-wear-group">🐯 小虎${wearSelectHtml('tiger', state.tiger)}</div>
      <div class="pets-wear-group">🐱 小猫${wearSelectHtml('cat', state.cat)}</div>
    `;
    bindPetsWearUI(v, state);
    ['tiger', 'cat'].forEach((k) => { if (state[k] && state[k].wear) renderPetPanelWear(k, state[k]); });
  }

  function petPanelHTML(key, pet) {
    const meta = PET_IMAGES[key];
    const bar = (k, icon, label) => `
      <div class="pet-stat">
        <span class="pet-stat-lbl">${icon} ${label}</span>
        <div class="pet-bar"><i data-pet="${key}" data-k="${k}" style="width:${pet[k]}%;background:${meta.barColor}"></i></div>
        <span class="pet-stat-val" data-pet="${key}" data-v="${k}">${pet[k]}</span>
      </div>`;
    const it = WEARS[pet.wear] || WEARS.none;
    return `
      <div class="pet-panel" data-pet="${key}">
        <div class="pet-img" style="background:${it.bg}">
          <img src="${meta.src}" alt="${meta.name}" />
          <span class="pet-wear-ov" style="display:${it.overlay ? '' : 'none'}">${it.overlay}</span>
          <span class="pet-emoji">${meta.emoji}</span>
        </div>
        <div class="pet-head">
          <span class="pet-name">${meta.name}</span>
          <span class="pet-stage" data-pet="${key}" data-stage>${petStageLabel(pet, key)}</span>
        </div>
        <div class="pet-sub">${meta.sub}</div>
        <div class="pet-stats">
          ${bar('love', '💗', '亲密度')}
          ${bar('food', '🍖', '饱腹度')}
          ${bar('mood', '😊', '心情')}
          ${bar('energy', '⚡', '精力')}
        </div>
        <div class="pet-exp"><div class="pet-exp-bar"><i data-pet="${key}" data-exp style="width:${pet.exp}%"></i></div><span class="pet-exp-txt">已点亮 ${pet.exp}% 成长值</span></div>
        <div class="pet-btns">
          <button class="btn" data-act="feed">🍖 喂食</button>
          <button class="btn" data-act="pet">✋ 摸头</button>
          <button class="btn" data-act="play">🎾 陪玩</button>
          <button class="btn" data-act="sleep">😴 睡觉</button>
        </div>
        <div class="pet-msg" data-pet="${key}" data-msg>想和 ${meta.name} 一起玩吗？</div>
      </div>`;
  }

  const PET_ACTIONS = {
    feed: { d: { food: 15, energy: 3, love: 2 }, text: '吃得超香，鼓起了腮帮子！' },
    pet: { d: { love: 8, mood: 5 }, text: '舒服地眯起了眼睛～' },
    play: { d: { love: 5, mood: 10, energy: -10 }, text: '玩得可带劲了！' },
    sleep: { d: { energy: 15, food: -2 }, text: '甜甜地睡着了 zZ…' }
  };

  let petInteractionTick = 0;
  function bindPetEvents(v, state) {
    v.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const panel = btn.closest('.pet-panel');
        const key = panel.dataset.pet;
        const pet = state[key];
        const act = PET_ACTIONS[btn.dataset.act];
        if (!pet || !act) return;
        // 精力不足不能陪玩
        if (btn.dataset.act === 'play' && pet.energy < 10) {
          showPetMsg(key, '好累呀，先让小可爱睡一觉吧😴');
          return;
        }
        Object.keys(act.d).forEach((k) => {
          pet[k] = Math.max(0, Math.min(100, pet[k] + act.d[k]));
          const bar = v.querySelector(`.pet-bar i[data-pet="${key}"][data-k="${k}"]`);
          const val = v.querySelector(`[data-pet="${key}"][data-v="${k}"]`);
          if (bar) bar.style.width = pet[k] + '%';
          if (val) val.textContent = pet[k];
        });
        const exp = (btn.dataset.act === 'play' || btn.dataset.act === 'pet') ? 10 : 4;
        addExp(state, key, exp);
        // 立即显示升级/经验条
        const expBar = v.querySelector(`[data-pet="${key}"][data-exp]`);
        const expTxt = panel.querySelector('.pet-exp-txt');
        if (expBar) expBar.style.width = pet.exp + '%';
        if (expTxt) expTxt.textContent = '已点亮 ' + pet.exp + '% 成长值';
        const stageEl = panel.querySelector('[data-stage]');
        const stage = stageOf(pet);
        if (stageEl) stageEl.textContent = STAGE_NAMES[stage];
        showPetMsg(key, `${PET_IMAGES[key].name} ${act.text}`);
        // 本地保存 + 节流云同步（每 3 次交互同步一次，兼顾频率）
        petInteractionTick++;
        savePetsState(state);
        if (petInteractionTick % 3 === 0) syncPetsToCloud(state);
        else if (petInteractionTick % 3 === 1) { /* 延后，避免频繁请求 */ }
      });
    });
  }

  function showPetMsg(key, msg) {
    const v = $('#view-pets');
    const el = v && v.querySelector(`[data-pet="${key}"][data-msg]`);
    if (!el) return;
    el.textContent = msg;
    el.classList.add('bounce');
    setTimeout(() => el.classList.remove('bounce'), 900);
  }

  window.petFullAll = () => {
    if (sessionPwd === '') return toast('请先解锁', 'err');
    const state = loadPetsState();
    Object.keys(state).forEach((k) => {
      ['love', 'food', 'mood', 'energy'].forEach((a) => (state[k][a] = 100));
      state[k].exp = 0;
    });
    savePetsState(state);
    syncPetsToCloud(state);
    renderCollection('pets');
    toast('两只小可爱都精神满满啦 ✨');
  };
  window.petResetAll = () => {
    if (sessionPwd === '') return toast('请先解锁', 'err');
    if (!confirm('确定要重置养宠进度吗？所有属性与成长将恢复初始值，并同步云端。')) return;
    localStorage.removeItem(PKEY);
    const cid = getClientId();
    if (cid) apiPets('save', { clientId: cid, state: defaultPets() });
    petCloudName = '';
    try { localStorage.removeItem('humiao_pets_name'); } catch (e) {}
    renderCollection('pets');
    toast('养宠进度已重置');
  };

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
    if (IS_STATIC) {
      // 静态只读模式：从构建时注入的 window.STATIC_DATA 读取公告
      const d = (window.STATIC_DATA && window.STATIC_DATA.announcement) || {};
      const text = d.text || '';
      const ts = d.ts || '';
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
      return;
    }
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
    if (sessionPwd === '') { toast('请先开启管理员模式，才能使用推送', 'err'); return; }
    // 已进入管理员模式：自动带入管理密码，发送时即用当前解锁的密码
    const pwdEl = $('#pu_password');
    if (pwdEl) pwdEl.value = sessionPwd;
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