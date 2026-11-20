/* KidNova admin panel — kindergarten admin and KidNova team views.
   Uses only the public publishable key; every read/write goes through role-checked
   SECURITY DEFINER functions in Supabase (see supabase/admin-panel.sql). Synthetic data only. */
(() => {
  'use strict';
  const sb = window.KidNovaSupabase;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LANG_KEY = 'kidnova-language';
  const NEXT_LANG = { uz: 'ru', ru: 'en', en: 'uz' };
  let lang = (() => { try { const v = localStorage.getItem(LANG_KEY); return v === 'en' || v === 'ru' ? v : 'uz'; } catch (_) { return 'uz'; } })();
  const tt = (en, uz, ru) => (lang === 'uz' ? uz : lang === 'ru' ? (ru ?? (window.KIDNOVA_RU?.phrases || {})[en] ?? en) : en);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (v, d = 1) => (v === null || v === undefined || v === '') ? '—' : Number(v).toLocaleString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: d });
  const day = v => { if (!v) return '—'; const [y, m, d] = String(v).slice(0, 10).split('-'); return `${d}.${m}.${y}`; };
  const when = v => v ? new Date(v).toLocaleString('en-GB', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace('/', '.') : '—';
  const ago = v => { if (!v) return '—'; const m = Math.round((Date.now() - new Date(v)) / 60000); if (m < 60) return tt(`${m} min ago`, `${m} daqiqa oldin`, `${m} мин назад`); const h = Math.round(m / 60); if (h < 48) return tt(`${h} h ago`, `${h} soat oldin`, `${h} ч назад`); return tt(`${Math.round(h / 24)} days ago`, `${Math.round(h / 24)} kun oldin`, `${Math.round(h / 24)} дн. назад`); };

  const STATIC = {
    loginTitle: ['Sign in to the admin panel', 'Admin panelga kirish'],
    loginIntro: ['For kindergarten directors and the KidNova team. Accounts are issued by the KidNova team.', 'Bog‘cha direktorlari va KidNova jamoasi uchun. Hisobni KidNova jamoasi beradi.'],
    email: ['Email', 'Email'], password: ['Password', 'Parol'], signIn: ['Sign in', 'Kirish'], signOut: ['Sign out', 'Chiqish'],
    backToSite: ['← Back to the website', '← Asosiy saytga qaytish'],
    syntheticOnly: ['Synthetic demo data only. Not a medical diagnosis.', 'Faqat uydirma (sintetik) demo ma’lumotlar. Tibbiy tashxis emas.']
  };
  const ROBOT_STATUS = { online: ['Online', 'Onlayn'], offline: ['Offline', 'Oflayn'], maintenance: ['Maintenance', 'Ta’mirda'] };
  const TICKET_STATUS = { open: ['Open', 'Ochiq'], in_progress: ['In progress', 'Jarayonda'], resolved: ['Resolved', 'Hal qilindi'] };
  const KG_STATUS = { pilot: ['Pilot', 'Pilot'], active: ['Active', 'Faol'], paused: ['Paused', 'To‘xtatilgan'] };
  const AUDIT = {
    alert_reviewed: ['Alert acknowledged', 'Ogohlantirish bilan tanishildi'], child_added: ['Synthetic child added', 'Uydirma bola qo‘shildi'],
    telegram_code_created: ['Telegram link code created', 'Telegram ulanish kodi yaratildi'], ticket_created: ['Service ticket created', 'Texnik murojaat yuborildi'],
    robot_status: ['Robot status changed', 'Robot holati o‘zgartirildi'], ticket_updated: ['Service ticket updated', 'Murojaat yangilandi'],
    kindergarten_status: ['Kindergarten status changed', 'Bog‘cha holati o‘zgartirildi']
  };
  const label = (map, key) => (map[key] ? tt(map[key][0], map[key][1], map[key][2]) : key);

  const KG_VIEWS = [
    ['dashboard', '▦', 'Overview', 'Bosh sahifa'], ['children', '☺', 'Children', 'Bolalar'], ['attendance', '▤', 'Attendance', 'Davomat'],
    ['alerts', '!', 'Alerts', 'Ogohlantirishlar'], ['telegram', '✈', 'Parents & Telegram', 'Ota-onalar va Telegram'],
    ['robots', '⚙', 'Robots & service', 'Robotlar va servis'], ['kitchen', '◔', 'Kitchen', 'Oshxona'], ['audit', '≡', 'Audit log', 'Audit jurnali']
  ];
  const HQ_VIEWS = [
    ['overview', '▦', 'Overview', 'Umumiy ko‘rinish'], ['kindergartens', '⌂', 'Kindergartens', 'Bog‘chalar'], ['fleet', '⚙', 'Robot fleet', 'Robotlar'],
    ['tickets', '✎', 'Service tickets', 'Texnik murojaatlar'], ['subscriptions', '₮', 'Subscriptions', 'Obunalar'], ['audit', '≡', 'Audit log', 'Audit jurnali']
  ];

  let me = null, current = null, cache = {};
  const setStatus = (msg, kind = '') => { const s = $('#status'); s.textContent = msg || ''; s.dataset.kind = kind; };
  const errorText = e => {
    const m = String(e?.message || '');
    if (/admin_role_required|kindergarten_admin_required|kidnova_admin_required/.test(m)) return tt('This account has no admin role. Ask the KidNova team to assign one.', 'Bu hisobga admin roli berilmagan. KidNova jamoasiga murojaat qiling.');
    if (/invalid login credentials/i.test(m) || e?.status === 400) return tt('Sign-in failed. Check the email and password.', 'Kirish amalga oshmadi. Email va parolni tekshiring.');
    if (/email_password_required/.test(m)) return tt('Enter your email and password.', 'Email va parolni kiriting.');
    if (/request_timeout|failed to fetch|networkerror/i.test(m)) return tt('Could not reach the server. Check the connection.', 'Serverga ulanib bo‘lmadi. Internetni tekshiring.');
    if (/no_synthetic_slots/.test(m)) return tt('No free synthetic profile slots left (A–Z).', 'Bo‘sh uydirma profil qolmadi (A–Z).');
    if (/schema cache|function .* not found|does not exist/i.test(m)) return tt('The admin database update is not installed yet (supabase/admin-panel.sql).', 'Admin uchun baza yangilanishi hali o‘rnatilmagan (supabase/admin-panel.sql).');
    if (/authentication_required/.test(m) || e?.status === 401) return tt('Your session ended. Sign in again.', 'Sessiya tugadi. Qayta kiring.');
    return tt('The request could not be completed.', 'So‘rovni bajarib bo‘lmadi.') + (m ? ` (${m.slice(0, 80)})` : '');
  };
  const rpc = async (name, body) => sb.rpc(name, body || {});

  function applyStatic() {
    document.documentElement.lang = lang;
    $$('[data-t]').forEach(el => { const v = STATIC[el.dataset.t]; if (v) el.textContent = tt(v[0], v[1], v[2]); });
    $$('[data-lang-toggle]').forEach(b => { b.textContent = NEXT_LANG[lang].toUpperCase(); b.setAttribute('aria-label', tt('Switch language', 'Tilni almashtirish', 'Сменить язык')); });
  }

  // ───────── auth ─────────
  function showLogin(message) {
    me = null; $('#appView').hidden = true; $('#loginView').hidden = false; applyStatic();
    $('#loginError').textContent = message || '';
  }
  async function enter() {
    me = await rpc('kidnova_admin_whoami');
    $('#loginView').hidden = true; $('#appView').hidden = false;
    current = me.role === 'kidnova_admin' ? 'overview' : 'dashboard';
    renderShell(); await go(current);
  }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('button[type="submit"]', e.target); btn.disabled = true; $('#loginError').textContent = '';
    try {
      const fd = new FormData(e.target);
      await sb.signIn(fd.get('email'), fd.get('password'));
      e.target.reset();
      await enter();
    } catch (err) {
      if (/admin_role_required/.test(String(err?.message))) { try { await sb.signOut(); } catch (_) {} }
      $('#loginError').textContent = errorText(err);
    } finally { btn.disabled = false; }
  });
  $('#signOut').addEventListener('click', async () => { try { await sb.signOut(); } catch (_) {} cache = {}; showLogin(); });
  $$('[data-lang-toggle]').forEach(b => b.addEventListener('click', () => {
    lang = NEXT_LANG[lang]; try { localStorage.setItem(LANG_KEY, lang); } catch (_) {}
    applyStatic(); if (me) { renderShell(); go(current, true); }
  }));

  // ───────── shell ─────────
  function renderShell() {
    applyStatic();
    const views = me.role === 'kidnova_admin' ? HQ_VIEWS : KG_VIEWS;
    $('#nav').innerHTML = views.map(([id, icon, en, uz]) => `<button type="button" data-view="${id}"${id === current ? ' aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${esc(tt(en, uz))}</button>`).join('');
    const kg = me.kindergarten;
    $('#orgBox').innerHTML = me.role === 'kidnova_admin'
      ? `<small>${tt('KidNova team', 'KidNova jamoasi')}</small><b>${tt('All kindergartens', 'Barcha bog‘chalar')}</b>`
      : `<small>${esc(kg?.code || '')} · ${esc(kg?.city || '')}</small><b>${esc(kg?.name || '')}</b>`;
    $('#rolePill').textContent = me.role === 'kidnova_admin' ? tt('KidNova team · no child identities', 'KidNova jamoasi · bolalar shaxsi ko‘rinmaydi') : tt('Kindergarten admin · own kindergarten only', 'Bog‘cha admini · faqat o‘z bog‘chasi');
  }
  $('#nav').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) go(b.dataset.view); });

  async function go(id, keepStatus) {
    current = id;
    $$('#nav [data-view]').forEach(b => b.toggleAttribute('aria-current', b.dataset.view === id));
    const views = me.role === 'kidnova_admin' ? HQ_VIEWS : KG_VIEWS;
    const v = views.find(x => x[0] === id);
    $('#viewTitle').textContent = v ? tt(v[2], v[3]) : '';
    if (!keepStatus) setStatus('');
    $('#view').innerHTML = `<div class="adm-loading">${tt('Loading…', 'Yuklanmoqda…')}</div>`;
    try { await (RENDER[id] || (() => {}))(); }
    catch (err) {
      if (/authentication_required/.test(String(err?.message)) || err?.status === 401) { showLogin(errorText(err)); return; }
      $('#view').innerHTML = `<div class="adm-empty">${esc(errorText(err))}</div>`;
    }
  }
  const refresh = () => go(current, true);

  // ───────── small UI helpers ─────────
  const card = (value, title, note = '', kind = '') => `<article class="adm-card ${kind}"><b>${value}</b><span>${esc(title)}</span>${note ? `<small>${esc(note)}</small>` : ''}</article>`;
  const badge = (text, kind) => `<span class="adm-badge ${kind || ''}">${esc(text)}</span>`;
  const robotBadge = s => badge(label(ROBOT_STATUS, s), s === 'online' ? 'ok' : s === 'maintenance' ? 'warn' : 'bad');
  const ticketBadge = s => badge(label(TICKET_STATUS, s), s === 'resolved' ? 'ok' : s === 'in_progress' ? 'info' : 'warn');
  const table = (head, rows, empty) => rows.length
    ? `<div class="adm-table-wrap"><table class="adm-table"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`
    : `<div class="adm-empty">${esc(empty)}</div>`;
  const select = (action, id, map, value) => `<select data-action="${action}" data-id="${esc(id)}" aria-label="${tt('Status', 'Holat')}">${Object.keys(map).map(k => `<option value="${k}"${k === value ? ' selected' : ''}>${esc(label(map, k))}</option>`).join('')}</select>`;
  function barChart(points) {
    const W = 560, H = 150, max = Math.max(1, ...points.map(p => p.count)), bw = W / points.length;
    return `<svg class="adm-chart" viewBox="0 0 ${W} ${H + 24}" role="img" aria-label="${tt('Check-ins over the last 7 days', 'Oxirgi 7 kundagi davomat')}">${points.map((p, i) => {
      const h = Math.round((p.count / max) * (H - 18)), x = i * bw + bw * 0.2, w = bw * 0.6;
      return `<rect x="${x}" y="${H - h}" width="${w}" height="${Math.max(h, 2)}" rx="6" class="${i === points.length - 1 ? 'today' : ''}"/><text x="${x + w / 2}" y="${H - h - 6}" text-anchor="middle" class="v">${p.count}</text><text x="${x + w / 2}" y="${H + 16}" text-anchor="middle">${day(p.date).slice(0, 5)}</text>`;
    }).join('')}</svg>`;
  }
  function lineChart(points) {
    if (!points.length) return '';
    const W = 520, H = 140, lo = Math.min(35.8, ...points), hi = Math.max(38.6, ...points), n = points.length;
    const xy = points.map((v, i) => [n === 1 ? W / 2 : 16 + i * (W - 32) / (n - 1), H - 14 - ((v - lo) / (hi - lo)) * (H - 28)]);
    const ref = H - 14 - ((37.5 - lo) / (hi - lo)) * (H - 28);
    return `<svg class="adm-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${tt('Temperature history', 'Harorat tarixi')}"><line x1="0" x2="${W}" y1="${ref}" y2="${ref}" class="ref"/><text x="${W - 4}" y="${ref - 5}" text-anchor="end" class="reft">37.5°C</text><path d="${xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')}" class="line"/>${xy.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" class="${points[i] >= 37.5 ? 'hot' : ''}"/>`).join('')}</svg>`;
  }
  function openDialog(html) { $('#dialogBody').innerHTML = html; const d = $('#dialog'); if (!d.open) d.showModal(); }
  $('#dialog').addEventListener('click', e => { if (e.target === e.currentTarget || e.target.closest('[data-close]')) e.currentTarget.close(); });

  // Telegram link code: same format and hash as the KidNova bot (sha256 of "KN-XXXXXX").
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function newCode() { const a = new Uint32Array(6); crypto.getRandomValues(a); return 'KN-' + [...a].map(n => ALPHABET[n % ALPHABET.length]).join(''); }
  async function sha256Hex(text) { const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
  async function createLinkCode(childId, childName) {
    const code = newCode();
    const res = await rpc('kidnova_kg_create_link_code', { p_child: childId, p_code_hash: await sha256Hex(code) });
    openDialog(`<h2>${tt('Telegram link code', 'Telegram ulanish kodi')}</h2><p class="adm-muted">${esc(childName)}</p>
      <div class="adm-code">${code}</div>
      <p>${tt('Give this code to the parent. In @kidnova_uz_bot they send:', 'Kodni ota-onaga bering. Ular @kidnova_uz_bot ga yuboradi:')} <code>/link ${code}</code></p>
      <p class="adm-muted">${tt('Valid for 24 hours, one use only. The code is not stored in readable form — copy it now.', '24 soat amal qiladi, faqat bir marta ishlatiladi. Kod bazada ochiq holda saqlanmaydi — hozir nusxalab oling.')} ${tt('Expires', 'Tugaydi')}: ${when(res.expires_at)}</p>
      <div class="adm-row"><button class="adm-btn adm-btn-primary" type="button" data-copy="/link ${code}">${tt('Copy', 'Nusxalash')}</button><button class="adm-btn adm-btn-ghost" type="button" data-close>${tt('Close', 'Yopish')}</button></div>`);
  }
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = tt('Copied', 'Nusxalandi'); } catch (_) { b.textContent = tt('Select and copy manually', 'Qo‘lda nusxalang'); }
  });

  // ───────── kindergarten admin views ─────────
  const RENDER = {};
  RENDER.dashboard = async () => {
    const d = await rpc('kidnova_kg_dashboard');
    $('#view').innerHTML = `
      <div class="adm-cards">
        ${card(`${d.checked_in_today} / ${d.children_total}`, tt('Children checked in today', 'Bugun kelgan bolalar'), day(d.today))}
        ${card(d.alerts_pending, tt('Alerts waiting for staff review', 'Xodim ko‘rishini kutayotgan ogohlantirishlar'), tt(`${d.alerts_today} today`, `bugun: ${d.alerts_today}`, `сегодня: ${d.alerts_today}`), d.alerts_pending ? 'warn' : '')}
        ${card(d.notifications_today, tt('Parent notifications today', 'Bugungi ota-ona xabarnomalari'), tt('Telegram preview / bot', 'Telegram preview / bot'))}
        ${card(`${d.telegram_linked_children} / ${d.children_total}`, tt('Children with Telegram linked', 'Telegram ulangan bolalar'))}
      </div>
      <div class="adm-grid2">
        <article class="adm-panel"><h2>${tt('Check-ins · last 7 days', 'Davomat · oxirgi 7 kun')}</h2>${barChart(d.week || [])}</article>
        <article class="adm-panel"><h2>${tt('Robots', 'Robotlar')}</h2>
          <ul class="adm-list">${(d.robots || []).map(r => `<li><b>${esc(r.serial)}</b>${robotBadge(r.status)}<small>${tt('last signal', 'oxirgi signal')}: ${ago(r.last_seen_at)}</small></li>`).join('') || `<li>${tt('No robots yet', 'Robot yo‘q')}</li>`}</ul>
          <p class="adm-muted">${tt(`Open service tickets: ${d.open_tickets}`, `Ochiq texnik murojaatlar: ${d.open_tickets}`, `Открытые заявки: ${d.open_tickets}`)} · <button type="button" class="adm-link" data-goto="robots">${tt('Open', 'Ochish')} →</button></p>
          <small class="adm-muted">${tt('Robot status is simulated in this MVP.', 'Bu MVP’da robot holati simulyatsiya qilingan.')}</small>
        </article>
      </div>`;
  };
  RENDER.children = async () => {
    const list = await rpc('kidnova_kg_children'); cache.children = list;
    $('#view').innerHTML = `
      <div class="adm-toolbar"><p class="adm-muted">${tt('Synthetic profiles only. New profiles get the next free code (Demo Child G, H…).', 'Faqat uydirma profillar. Yangi profil keyingi bo‘sh kodni oladi (Demo Child G, H…).')}</p>
        <form class="adm-inline" data-form="addChild"><select name="group" aria-label="${tt('Group', 'Guruh')}"><option>Kichik guruh</option><option>Katta guruh</option></select><button class="adm-btn adm-btn-primary" type="submit">＋ ${tt('Add synthetic child', 'Uydirma bola qo‘shish')}</button></form></div>
      ${table([tt('Child', 'Bola'), 'RFID', tt('Group', 'Guruh'), tt('Last visit', 'Oxirgi tashrif'), '°C', tt('Height', 'Bo‘y'), tt('Weight', 'Vazn'), tt('Status', 'Holat'), ''],
        list.map(c => `<tr><td><b>${esc(c.display_name)}</b></td><td><code>${esc(c.wristband_code)}</code></td><td>${esc(c.group_name || '—')}</td><td>${day(c.last_date)}</td>
          <td>${c.last_temperature_c != null ? num(c.last_temperature_c) : '—'}</td><td>${c.last_height_cm != null ? num(c.last_height_cm, 0) + ' cm' : '—'}</td><td>${c.last_weight_kg != null ? num(c.last_weight_kg) + ' kg' : '—'}</td>
          <td>${c.pending_alert ? badge(tt('Review needed', 'Ko‘rish kerak'), 'warn') : ''}${c.telegram_linked ? badge('Telegram', 'info') : ''}</td>
          <td><button class="adm-btn adm-btn-small" type="button" data-action="history" data-id="${esc(c.id)}">${tt('History', 'Tarix')}</button></td></tr>`),
        tt('No children yet.', 'Hali bola yo‘q.'))}`;
  };
  RENDER.attendance = async () => {
    const today = me.today || new Date().toISOString().slice(0, 10);
    const from = cache.from || new Date(new Date(today).getTime() - 6 * 864e5).toISOString().slice(0, 10), to = cache.to || today;
    const rows = await rpc('kidnova_kg_attendance', { p_from: from, p_to: to }); cache.attendance = rows;
    $('#view').innerHTML = `
      <form class="adm-toolbar adm-inline" data-form="range"><label>${tt('From', 'Dan')} <input type="date" name="from" value="${from}" max="${today}"></label><label>${tt('To', 'Gacha')} <input type="date" name="to" value="${to}" max="${today}"></label>
        <button class="adm-btn" type="submit">${tt('Show', 'Ko‘rsatish')}</button><button class="adm-btn adm-btn-ghost" type="button" data-action="csv"${rows.length ? '' : ' disabled'}>⇩ CSV</button></form>
      ${table([tt('Date', 'Sana'), tt('Time', 'Vaqt'), tt('Child', 'Bola'), 'RFID', tt('Group', 'Guruh'), '°C', tt('Height', 'Bo‘y'), tt('Weight', 'Vazn'), tt('Review', 'Tekshiruv')],
        rows.map(r => `<tr><td>${day(r.date)}</td><td>${when(r.checked_in_at).split(', ').pop()}</td><td>${esc(r.child)}</td><td><code>${esc(r.wristband_code)}</code></td><td>${esc(r.group_name || '—')}</td>
          <td class="${r.requires_staff_review ? 'hot' : ''}">${num(r.temperature_c)}</td><td>${num(r.height_cm, 0)} cm</td><td>${num(r.weight_kg)} kg</td>
          <td>${r.requires_staff_review ? (r.reviewed_at ? badge(tt('Acknowledged', 'Tanishilgan'), 'ok') : badge(tt('Pending', 'Kutilmoqda'), 'warn')) : '—'}</td></tr>`),
        tt('No check-ins in this period.', 'Bu davrda davomat yo‘q.'))}
      <p class="adm-muted">${tt('Check-ins are recorded by the staff account through the simulated RFID station on the main website.', 'Davomat asosiy saytdagi simulyatsiya RFID stansiyasi orqali xodim hisobi bilan qayd etiladi.')}</p>`;
  };
  RENDER.alerts = async () => {
    const list = await rpc('kidnova_kg_alerts');
    $('#view').innerHTML = `<p class="adm-muted">${tt('Synthetic screening flags from the last 30 days (≥ 37.5°C or ≤ 35.0°C). A flag is a workflow signal for staff, not a diagnosis.', 'Oxirgi 30 kundagi sintetik skrining belgilari (≥ 37.5°C yoki ≤ 35.0°C). Belgi xodim uchun signal, tashxis emas.')}</p>
      ${table([tt('Date', 'Sana'), tt('Child', 'Bola'), 'RFID', '°C', tt('Status', 'Holat'), ''],
        list.map(a => `<tr><td>${day(a.date)}</td><td>${esc(a.child)}</td><td><code>${esc(a.wristband_code)}</code></td><td class="hot">${num(a.temperature_c)}</td>
          <td>${a.reviewed_at ? badge(tt('Acknowledged', 'Tanishilgan') + ' · ' + when(a.reviewed_at), 'ok') : badge(tt('Waiting for review', 'Ko‘rib chiqilmagan'), 'warn')}</td>
          <td>${a.reviewed_at ? '' : `<button class="adm-btn adm-btn-small adm-btn-primary" type="button" data-action="review" data-id="${esc(a.screening_id)}">${tt('Mark reviewed', 'Tanishdim')}</button>`}</td></tr>`),
        tt('No alerts in the last 30 days.', 'Oxirgi 30 kunda ogohlantirish yo‘q.'))}`;
  };
  RENDER.telegram = async () => {
    const list = await rpc('kidnova_kg_children'); cache.children = list;
    const linked = list.filter(c => c.telegram_linked).length;
    $('#view').innerHTML = `
      <div class="adm-cards">${card(`${linked} / ${list.length}`, tt('Children with a linked parent chat', 'Ota-ona chati ulangan bolalar'))}${card('24h', tt('Link code validity, single use', 'Kod amal qilish muddati, bir martalik'))}</div>
      <article class="adm-panel"><h2>${tt('How parents connect', 'Ota-ona qanday ulanadi')}</h2><ol class="adm-steps"><li>${tt('Create a code for the child below.', 'Quyida bola uchun kod yarating.')}</li><li>${tt('Give the code to the parent in person or by message.', 'Kodni ota-onaga bering.')}</li><li>${tt('The parent sends /link KN-XXXXXX to @kidnova_uz_bot.', 'Ota-ona @kidnova_uz_bot ga /link KN-XXXXXX yuboradi.')}</li></ol>
        <a class="adm-btn adm-btn-small" href="https://t.me/kidnova_uz_bot" target="_blank" rel="noopener">✈ @kidnova_uz_bot ↗</a><br><small class="adm-muted">${tt('Parent chat IDs are never shown in the admin panel.', 'Ota-onaning chat raqamlari admin panelda ko‘rsatilmaydi.')}</small></article>
      ${table([tt('Child', 'Bola'), 'RFID', 'Telegram', ''],
        list.map(c => `<tr><td>${esc(c.display_name)}</td><td><code>${esc(c.wristband_code)}</code></td><td>${c.telegram_linked ? badge(tt('Linked', 'Ulangan'), 'ok') : badge(tt('Not linked', 'Ulanmagan'), '')}</td>
          <td><button class="adm-btn adm-btn-small" type="button" data-action="code" data-id="${esc(c.id)}" data-name="${esc(c.display_name)}">${tt('Create code', 'Kod yaratish')}</button></td></tr>`), tt('No children yet.', 'Hali bola yo‘q.'))}`;
  };
  RENDER.robots = async () => {
    const d = await rpc('kidnova_kg_robots'); cache.robots = d.robots;
    $('#view').innerHTML = `
      ${table([tt('Robot', 'Robot'), tt('Status', 'Holat'), tt('Last signal', 'Oxirgi signal'), tt('Calibrated', 'Kalibrovka'), tt('Firmware', 'Dastur')],
        d.robots.map(r => `<tr><td><b>${esc(r.serial)}</b> ${r.is_simulated ? badge(tt('simulated', 'simulyatsiya'), '') : ''}</td><td>${robotBadge(r.status)}</td><td>${ago(r.last_seen_at)}</td><td>${day(r.last_calibrated_at)}</td><td><code>${esc(r.firmware)}</code></td></tr>`),
        tt('No robots assigned yet.', 'Hali robot biriktirilmagan.'))}
      <article class="adm-panel"><h2>${tt('Request technical support', 'Texnik yordam so‘rash')}</h2>
        <form class="adm-form" data-form="ticket">
          <label>${tt('Robot', 'Robot')}<select name="robot"><option value="">${tt('General / no robot', 'Umumiy / robotsiz')}</option>${d.robots.map(r => `<option value="${esc(r.id)}">${esc(r.serial)}</option>`).join('')}</select></label>
          <label>${tt('Problem', 'Muammo')}<input name="title" required minlength="3" maxlength="120" placeholder="${tt('e.g. Temperature sensor needs calibration', 'masalan: Harorat sensori kalibrovka talab qiladi')}"></label>
          <label>${tt('Details (optional)', 'Batafsil (ixtiyoriy)')}<textarea name="details" maxlength="500" rows="3"></textarea></label>
          <button class="adm-btn adm-btn-primary" type="submit">${tt('Send to KidNova team', 'KidNova jamoasiga yuborish')}</button>
        </form></article>
      <h2 class="adm-h2">${tt('Our service tickets', 'Bizning murojaatlarimiz')}</h2>
      ${table([tt('Created', 'Yaratilgan'), tt('Robot', 'Robot'), tt('Problem', 'Muammo'), tt('Status', 'Holat'), tt('Technician', 'Texnik')],
        d.tickets.map(t => `<tr><td>${when(t.created_at)}</td><td>${esc(t.robot || '—')}</td><td><b>${esc(t.title)}</b>${t.details ? `<br><small class="adm-muted">${esc(t.details)}</small>` : ''}</td><td>${ticketBadge(t.status)}</td><td>${esc(t.assigned_to || '—')}</td></tr>`),
        tt('No tickets yet.', 'Murojaatlar yo‘q.'))}`;
  };
  RENDER.kitchen = async () => {
    $('#view').innerHTML = `<article class="adm-panel"><h2>${tt('Smart Nutrition', 'Smart Nutrition')} ${badge(tt('Planned for the admin panel', 'Admin panel uchun rejalashtirilgan'), 'info')}</h2>
      <p>${tt('The working calorie calculator (MVP) is on the main website. Saving daily menus per kindergarten, menu history and kitchen-staff accounts are planned for the next stage.', 'Ishlaydigan kaloriya kalkulyatori (MVP) asosiy saytda. Har bir bog‘cha uchun kunlik menyuni saqlash, menyu tarixi va oshpaz hisoblari keyingi bosqichda rejalashtirilgan.')}</p>
      <a class="adm-btn adm-btn-primary" href="/#future">${tt('Open the calorie calculator', 'Kaloriya kalkulyatorini ochish')} →</a></article>`;
  };
  RENDER.audit = async () => {
    const list = await rpc('kidnova_admin_audit', { p_limit: 100 });
    $('#view').innerHTML = `<p class="adm-muted">${me.role === 'kidnova_admin' ? tt('All admin actions across kindergartens.', 'Barcha bog‘chalardagi admin amallari.') : tt('Admin actions for your kindergarten, including changes made by the KidNova team.', 'Bog‘changizga oid admin amallari, KidNova jamoasi qilgan o‘zgarishlar ham.')}</p>
      ${table([tt('Time', 'Vaqt'), tt('Who', 'Kim'), tt('Action', 'Amal'), tt('Kindergarten', 'Bog‘cha'), tt('Details', 'Tafsilot')],
        list.map(a => `<tr><td>${when(a.at)}</td><td>${a.role === 'kidnova_admin' ? tt('KidNova team', 'KidNova jamoasi') : tt('Kindergarten admin', 'Bog‘cha admini')}</td><td>${esc(label(AUDIT, a.action))}</td><td>${esc(a.kindergarten || '—')}</td>
          <td><small>${esc(Object.entries(a.details || {}).map(([k, v]) => `${k}: ${v}`).join(' · '))}</small></td></tr>`),
        tt('No admin actions yet.', 'Hali admin amallari yo‘q.'))}`;
  };

  // ───────── KidNova team views ─────────
  RENDER.overview = async () => {
    const list = await rpc('kidnova_hq_overview'); cache.kgs = list;
    const sum = k => list.reduce((s, x) => s + Number(x[k] || 0), 0);
    $('#view').innerHTML = `
      <div class="adm-cards">
        ${card(list.length, tt('Kindergartens', 'Bog‘chalar'), tt(`${list.filter(k => k.status === 'active').length} active · ${list.filter(k => k.status === 'pilot').length} pilot`, `${list.filter(k => k.status === 'active').length} faol · ${list.filter(k => k.status === 'pilot').length} pilot`, `активных: ${list.filter(k => k.status === 'active').length} · пилот: ${list.filter(k => k.status === 'pilot').length}`))}
        ${card(`${sum('robots_online')} / ${sum('robots_total')}`, tt('Robots online', 'Onlayn robotlar'))}
        ${card(sum('checked_in_today'), tt('Screenings today', 'Bugungi skriningler'), tt(`${sum('screenings_7d')} in 7 days`, `7 kunda: ${sum('screenings_7d')}`, `за 7 дней: ${sum('screenings_7d')}`))}
        ${card(sum('open_tickets'), tt('Open service tickets', 'Ochiq texnik murojaatlar'), '', sum('open_tickets') ? 'warn' : '')}
      </div>
      <div class="adm-kg-grid">${list.map(k => `<article class="adm-panel adm-kg">
        <div class="adm-kg-head"><div><small>${esc(k.code)} · ${esc(k.city)}</small><h2>${esc(k.name)}</h2></div>${badge(label(KG_STATUS, k.status), k.status === 'active' ? 'ok' : k.status === 'paused' ? 'bad' : 'info')}</div>
        <dl><div><dt>${tt('Children', 'Bolalar')}</dt><dd>${k.children}</dd></div><div><dt>${tt('Today', 'Bugun')}</dt><dd>${k.checked_in_today}</dd></div><div><dt>${tt('Pending alerts', 'Kutilayotgan belgilar')}</dt><dd>${k.alerts_pending}</dd></div>
          <div><dt>Telegram</dt><dd>${k.telegram_linked_children}</dd></div><div><dt>${tt('Robots online', 'Onlayn robotlar')}</dt><dd>${k.robots_online}/${k.robots_total}</dd></div><div><dt>${tt('Open tickets', 'Ochiq murojaatlar')}</dt><dd>${k.open_tickets}</dd></div></dl>
      </article>`).join('')}</div>
      <p class="adm-muted">🔒 ${tt('The KidNova team sees counts only — no child names, temperatures or parent chats. Those belong to each kindergarten.', 'KidNova jamoasi faqat raqamlarni ko‘radi — bolalar ismi, harorati va ota-ona chatlari ko‘rinmaydi. Ular har bir bog‘chaga tegishli.')}</p>`;
  };
  RENDER.kindergartens = async () => {
    const list = await rpc('kidnova_hq_overview');
    $('#view').innerHTML = `${table([tt('Code', 'Kod'), tt('Kindergarten', 'Bog‘cha'), tt('City', 'Shahar'), tt('Children', 'Bolalar'), tt('Robots', 'Robotlar'), tt('Status', 'Holat')],
      list.map(k => `<tr><td><code>${esc(k.code)}</code></td><td><b>${esc(k.name)}</b></td><td>${esc(k.city)}</td><td>${k.children}</td><td>${k.robots_total}</td><td>${select('kgStatus', k.id, KG_STATUS, k.status)}</td></tr>`),
      tt('No kindergartens yet.', 'Bog‘chalar yo‘q.'))}
      <p class="adm-muted">${tt('Adding a new kindergarten and its director account is done by the KidNova team in Supabase in this MVP (it needs a server-side secret key that must never be in the browser).', 'Bu MVP’da yangi bog‘cha va uning direktor hisobini KidNova jamoasi Supabase’da qo‘shadi (buning uchun brauzerga hech qachon qo‘yilmaydigan maxfiy kalit kerak).')}</p>`;
  };
  RENDER.fleet = async () => {
    const d = await rpc('kidnova_hq_service');
    $('#view').innerHTML = `${table([tt('Robot', 'Robot'), tt('Kindergarten', 'Bog‘cha'), tt('Status', 'Holat'), tt('Last signal', 'Oxirgi signal'), tt('Calibrated', 'Kalibrovka'), tt('Firmware', 'Dastur')],
      d.robots.map(r => `<tr><td><b>${esc(r.serial)}</b></td><td>${esc(r.kindergarten)}</td><td>${select('robotStatus', r.id, ROBOT_STATUS, r.status)}</td><td>${ago(r.last_seen_at)}</td><td>${day(r.last_calibrated_at)}</td><td><code>${esc(r.firmware)}</code></td></tr>`),
      tt('No robots yet.', 'Robotlar yo‘q.'))}<p class="adm-muted">${tt('Robot status is simulated in this MVP; physical robots will report it automatically after hardware integration.', 'Bu MVP’da robot holati simulyatsiya; apparat integratsiyasidan keyin robotlar holatni o‘zi yuboradi.')}</p>`;
  };
  RENDER.tickets = async () => {
    const d = await rpc('kidnova_hq_service');
    $('#view').innerHTML = table([tt('Created', 'Yaratilgan'), tt('Kindergarten', 'Bog‘cha'), tt('Robot', 'Robot'), tt('Problem', 'Muammo'), tt('Technician', 'Texnik'), tt('Status', 'Holat')],
      d.tickets.map(t => `<tr><td>${when(t.created_at)}</td><td>${esc(t.kindergarten)}</td><td>${esc(t.robot || '—')}</td><td><b>${esc(t.title)}</b>${t.details ? `<br><small class="adm-muted">${esc(t.details)}</small>` : ''}</td>
        <td><input class="adm-input-small" data-assignee="${esc(t.id)}" value="${esc(t.assigned_to || '')}" maxlength="60" placeholder="${tt('Name', 'Ism')}" aria-label="${tt('Technician', 'Texnik')}"></td><td>${select('ticketStatus', t.id, TICKET_STATUS, t.status)}</td></tr>`),
      tt('No service tickets.', 'Murojaatlar yo‘q.'));
  };
  RENDER.subscriptions = async () => {
    $('#view').innerHTML = `<article class="adm-panel"><h2>KidNova Care ${badge(tt('Planned', 'Rejalashtirilgan'), 'info')}</h2>
      <p>${tt('Subscription status, renewal dates and payments for each kindergarten will appear here. No billing is connected in this MVP and no prices are confirmed.', 'Bu yerda har bir bog‘chaning obuna holati, yangilanish sanasi va to‘lovlari ko‘rinadi. Bu MVP’da to‘lov tizimi ulanmagan va narxlar tasdiqlanmagan.')}</p></article>`;
  };

  // ───────── actions ─────────
  $('#view').addEventListener('click', async e => {
    const goto = e.target.closest('[data-goto]'); if (goto) { go(goto.dataset.goto); return; }
    const b = e.target.closest('[data-action]'); if (!b || b.tagName === 'SELECT') return;
    const id = b.dataset.id;
    try {
      if (b.dataset.action === 'history') {
        const child = (cache.children || []).find(c => c.id === id);
        const rows = await rpc('kidnova_kg_child_history', { p_child: id });
        openDialog(`<h2>${esc(child?.display_name || '')} <small class="adm-muted">${esc(child?.wristband_code || '')} · ${esc(child?.group_name || '')}</small></h2>
          ${rows.length ? lineChart(rows.map(r => Number(r.temperature_c))) : ''}
          ${table([tt('Date', 'Sana'), '°C', tt('Height', 'Bo‘y'), tt('Weight', 'Vazn'), tt('Review', 'Tekshiruv')],
            rows.slice().reverse().map(r => `<tr><td>${day(r.date)}</td><td class="${r.requires_staff_review ? 'hot' : ''}">${num(r.temperature_c)}</td><td>${num(r.height_cm, 0)} cm</td><td>${num(r.weight_kg)} kg</td><td>${r.requires_staff_review ? (r.reviewed_at ? badge(tt('Acknowledged', 'Tanishilgan'), 'ok') : badge(tt('Pending', 'Kutilmoqda'), 'warn')) : '—'}</td></tr>`),
            tt('No visits recorded yet.', 'Hali tashrif yo‘q.'))}
          <p class="adm-muted">${tt('Synthetic data. Not a medical assessment.', 'Sintetik ma’lumot. Tibbiy baholash emas.')}</p>
          <div class="adm-row"><button class="adm-btn" type="button" data-action-dialog="code" data-id="${esc(id)}" data-name="${esc(child?.display_name || '')}">${tt('Create Telegram code', 'Telegram kodi yaratish')}</button><button class="adm-btn adm-btn-ghost" type="button" data-close>${tt('Close', 'Yopish')}</button></div>`);
      } else if (b.dataset.action === 'review') {
        b.disabled = true; await rpc('kidnova_kg_review_alert', { p_screening_id: id });
        setStatus(tt('Acknowledgement recorded · not a medical assessment', 'Tanishilgani qayd etildi · tibbiy baholash emas'), 'ok'); refresh();
      } else if (b.dataset.action === 'code') {
        b.disabled = true; await createLinkCode(id, b.dataset.name); b.disabled = false;
      } else if (b.dataset.action === 'csv') {
        const rows = cache.attendance || [];
        const head = ['date', 'time_tashkent', 'child', 'rfid', 'group', 'temperature_c', 'height_cm', 'weight_kg', 'staff_review', 'reviewed_at'];
        const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv = [head.join(','), ...rows.map(r => [r.date, when(r.checked_in_at), r.child, r.wristband_code, r.group_name, r.temperature_c, r.height_cm, r.weight_kg, r.requires_staff_review, r.reviewed_at || ''].map(q).join(','))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
        a.download = `kidnova-attendance-${(me.kindergarten?.code || 'kg').toLowerCase()}.csv`; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    } catch (err) { setStatus(errorText(err), 'error'); b.disabled = false; }
  });
  $('#dialog').addEventListener('click', async e => {
    const b = e.target.closest('[data-action-dialog="code"]'); if (!b) return;
    try { await createLinkCode(b.dataset.id, b.dataset.name); } catch (err) { setStatus(errorText(err), 'error'); $('#dialog').close(); }
  });
  $('#view').addEventListener('change', async e => {
    const s = e.target.closest('select[data-action]');
    const a = e.target.closest('[data-assignee]');
    try {
      if (s?.dataset.action === 'robotStatus') { await rpc('kidnova_hq_set_robot_status', { p_robot: s.dataset.id, p_status: s.value }); setStatus(tt('Robot status saved', 'Robot holati saqlandi'), 'ok'); }
      else if (s?.dataset.action === 'kgStatus') { await rpc('kidnova_hq_set_kindergarten_status', { p_kg: s.dataset.id, p_status: s.value }); setStatus(tt('Kindergarten status saved', 'Bog‘cha holati saqlandi'), 'ok'); }
      else if (s?.dataset.action === 'ticketStatus' || a) {
        const id = s ? s.dataset.id : a.dataset.assignee;
        const status = $(`select[data-action="ticketStatus"][data-id="${CSS.escape(id)}"]`).value;
        const who = $(`[data-assignee="${CSS.escape(id)}"]`).value;
        await rpc('kidnova_hq_update_ticket', { p_ticket: id, p_status: status, p_assigned_to: who }); setStatus(tt('Ticket updated', 'Murojaat yangilandi'), 'ok');
      } else return;
      refresh();
    } catch (err) { setStatus(errorText(err), 'error'); }
  });
  $('#view').addEventListener('submit', async e => {
    const f = e.target.closest('form[data-form]'); if (!f) return;
    e.preventDefault();
    const btn = $('button[type="submit"]', f); if (btn) btn.disabled = true;
    try {
      const fd = new FormData(f);
      if (f.dataset.form === 'addChild') {
        const r = await rpc('kidnova_kg_add_child', { p_group: fd.get('group') });
        setStatus(tt(`${r.display_name} (${r.wristband_code}) added`, `${r.display_name} (${r.wristband_code}) qo‘shildi`, `${r.display_name} (${r.wristband_code}) добавлен`), 'ok'); refresh();
      } else if (f.dataset.form === 'range') {
        cache.from = fd.get('from'); cache.to = fd.get('to'); refresh();
      } else if (f.dataset.form === 'ticket') {
        await rpc('kidnova_kg_create_ticket', { p_robot: fd.get('robot') || null, p_title: String(fd.get('title') || ''), p_details: String(fd.get('details') || '') || null });
        setStatus(tt('Ticket sent to the KidNova team', 'Murojaat KidNova jamoasiga yuborildi'), 'ok'); refresh();
      }
    } catch (err) { setStatus(errorText(err), 'error'); if (btn) btn.disabled = false; }
  });

  // ───────── start ─────────
  (async () => {
    applyStatic();
    if (!sb?.configured) { showLogin(tt('Supabase is not configured.', 'Supabase sozlanmagan.')); return; }
    try { const s = await sb.currentSession(); if (!s) { showLogin(); return; } await enter(); }
    catch (err) { showLogin(/admin_role_required/.test(String(err?.message)) ? errorText(err) : ''); }
  })();
})();
