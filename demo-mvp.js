(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const app = $('.demo-app');
  if (!app) return;
  const t = (en, uz, ru) => window.kidnovaT(en, uz, ru);
  const supabase = window.KidNovaSupabase;
  const start = $('.demo-screen[data-screen="0"] .demo-next');
  const topbar = $('.demo-topbar');
  const status = document.createElement('div');
  status.className = 'backend-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  topbar.after(status);
  const authPanel = document.createElement('section');
  authPanel.className = 'demo-auth-panel'; authPanel.setAttribute('aria-live', 'polite');
  authPanel.innerHTML = '<form class="demo-login-form"><div><b class="auth-title"></b><p class="auth-intro"></p></div><label><span class="auth-email-label"></span><input name="email" type="email" inputmode="email" autocomplete="username" required maxlength="254"></label><label><span class="auth-password-label"></span><input name="password" type="password" autocomplete="current-password" required minlength="8"></label><button class="button button-primary auth-submit" type="submit"></button><p class="auth-error" role="alert"></p></form><div class="demo-auth-user" hidden><span class="auth-role"></span><span class="auth-email"></span><button class="demo-reset-day" type="button"></button><button class="auth-signout" type="button"></button></div>';
  status.after(authPanel);
  const history = document.createElement('section');
  history.className = 'persistent-history'; history.setAttribute('aria-live', 'polite');
  $('.demo-main').append(history);
  const loginForm = $('.demo-login-form', authPanel);
  const roleBadge = $('.demo-auth-user', authPanel);
  const resetDay = $('.demo-reset-day', authPanel);
  const codeFor = key => `SIM-RFID-${String(key || 'a').toUpperCase()}`;
  const selectedKey = () => $('.child-card.selected:not([hidden])')?.dataset.child || $('.child-card:not([hidden])')?.dataset.child || 'a';
  const tashkentToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(new Date());
  const checkedInToday = code => state.events.some(item => item.wristband_code === code && String(item.attendance_date) === tashkentToday());
  const guestMessage = () => t('Guest mode · everything runs in your browser and nothing is saved. Sign in with a demo account below to use the live database.', 'Mehmon rejimi · hammasi brauzeringizda simulyatsiya qilinadi, hech narsa saqlanmaydi. Jonli bazani ishlatish uchun pastdagi demo hisobiga kiring.');
  const setStatus = (message, kind = '') => { status.textContent = message; status.dataset.state = kind; };
  let loginError = null;
  const authCopy = () => {
    $('.auth-title', authPanel).textContent = t('Live mode · demo account', 'Jonli rejim · demo hisobi');
    $('.auth-intro', authPanel).textContent = t('Optional. Sign in with the staff or parent account you were given to save synthetic records in Supabase. Without signing in, the demo runs in guest mode.', 'Ixtiyoriy. Sizga berilgan xodim yoki ota-ona hisobi bilan kirsangiz, sintetik yozuvlar Supabase’da saqlanadi. Kirmasangiz, demo mehmon rejimida ishlaydi.');
    $('.auth-email-label', authPanel).textContent = t('Email', 'Email');
    $('.auth-password-label', authPanel).textContent = t('Password', 'Parol');
    $('.auth-submit', authPanel).textContent = t('Sign in', 'Kirish');
    resetDay.textContent = t("Reset selected child's demo today", 'Tanlangan bolaning bugungi demosini tiklash');
    $('.auth-signout', authPanel).textContent = t('Sign out', 'Chiqish');
    const role = state.role;
    $('.auth-role', authPanel).textContent = role === 'staff' ? t('Staff demo account', 'Demo xodim hisobi') : role === 'parent' ? t('Parent demo account', 'Demo ota-ona hisobi') : '';
    $('.auth-email', authPanel).textContent = state.email || '';
    $('.auth-error', authPanel).textContent = loginError ? errorMessage(loginError) : '';
  };
  let state = { role: null, email: '', children: [], events: [] }, busy = false;
  const errorMessage = error => {
    const raw = String(error?.message || '');
    if (raw === 'supabase_not_configured') return t('Supabase is not configured. Add the project URL and public publishable/anon key, then reload.', 'Supabase sozlanmagan. Loyiha URL’i va ochiq publishable/anon kalitini kiriting, so‘ng yangilang.');
    if (raw === 'request_timeout') return t('The database request timed out. Check the connection and try again.', 'Ma’lumotlar bazasi so‘rovi vaqti tugadi. Ulanishni tekshirib, qayta urinib ko‘ring.');
    if (/demo_role_not_assigned/i.test(raw)) return t('This account has no KidNova demo role. Ask the project administrator to assign staff or parent access.', 'Bu hisobga KidNova demo roli biriktirilmagan. Administratorga murojaat qiling.');
    if (/staff_role_required/i.test(raw)) return t('Only the assigned staff demo account can record a check-in.', 'Davomatni faqat demo xodim hisobi qayd eta oladi.');
    if (/reviewable_alert_not_found/i.test(raw)) return t('This alert is unavailable or does not require staff review.', 'Bu ogohlantirish mavjud emas yoki xodim ko‘rigini talab qilmaydi.');
    if (/duplicate_checkin/i.test(raw)) return t('This fictional child already has an attendance record for today (Tashkent time).', 'Bu uydirma bola uchun bugun (Toshkent vaqti) davomat qayd etilgan.');
    if (/unknown_rfid/i.test(raw)) return t('Unknown simulated RFID wristband. No records were saved.', 'RFID bilaguzuk simulyatsiyasi topilmadi. Yozuv saqlanmadi.');
    if (/invalid_simulated_temperature/i.test(raw)) return t('The synthetic temperature is outside the allowed demo range.', 'Sintetik harorat demo uchun ruxsat etilgan chegaradan tashqarida.');
    if (/email not confirmed|email_not_confirmed/i.test(raw)) return t('Confirm this demo account in Supabase Auth, then try again.', 'Supabase Auth’da demo hisobini tasdiqlang va qayta urinib ko‘ring.');
    if (raw === 'authentication_required' || error?.status === 401 || /invalid login credentials/i.test(raw)) return t('Sign-in failed. Check the demo account email and password.', 'Kirish amalga oshmadi. Demo hisob emaili va parolini tekshiring.');
    if (/failed to fetch|networkerror|fetch failed/i.test(raw)) return t('Could not reach Supabase. Check the project URL, public key, and network.', 'Supabase’ga ulanib bo‘lmadi. Loyiha URL’i, ochiq kalit va internetni tekshiring.');
    if (/relation .* does not exist|schema cache|function .* not found/i.test(raw)) return t('The database schema is missing or not fully installed. Follow supabase/README.md.', 'Ma’lumotlar bazasi sxemasi to‘liq o‘rnatilmagan. supabase/README.md yo‘riqnomasini bajaring.');
    return t('The request could not be completed. Check account role and database setup.', 'So‘rovni bajarib bo‘lmadi. Hisob roli va baza sozlamalarini tekshiring.');
  };
  const renderHistory = () => {
    history.replaceChildren();
    const title = document.createElement('h3'); title.textContent = t('Saved demo records', 'Saqlangan demo yozuvlari'); history.append(title);
    const hint = document.createElement('p'); hint.className = 'history-note'; hint.textContent = t('Synthetic data only · Telegram previews are stored; no messages are sent.', 'Faqat sintetik ma’lumot · Telegram preview yozuvlari saqlanadi, xabar yuborilmaydi.'); history.append(hint);
    if (!state.role) { history.hidden = true; return; }
    history.hidden = false;
    if (!state.events?.length) { const empty = document.createElement('p'); empty.className = 'history-empty'; empty.textContent = t('No check-ins recorded yet.', 'Hali davomat yozuvi yo‘q.'); history.append(empty); return; }
    const list = document.createElement('ul');
    state.events.slice(0, 12).forEach(item => {
      const row = document.createElement('li');
      const main = document.createElement('b'); main.textContent = item.child_name;
      const detail = document.createElement('span'); detail.textContent = `${item.wristband_code} · ${item.temperature_c}°C · ${item.height_cm} cm · ${item.weight_kg} kg · ${item.attendance_date}`;
      const review = document.createElement('strong'); review.className = item.requires_staff_review ? 'record-warning' : 'record-ok';
      review.textContent = item.requires_staff_review ? t('Staff review required · synthetic screening flag', 'Xodim tekshiruvi kerak · sintetik skrining belgisi') : t('No demo review flag', 'Demo tekshiruv belgisi yo‘q');
      if (item.requires_staff_review) {
        const acknowledgement = document.createElement('small'); acknowledgement.className = item.reviewed_at ? 'record-review-done' : 'record-review-pending';
        acknowledgement.textContent = item.reviewed_at ? t('Staff acknowledgement recorded · not a medical assessment', 'Xodim tanishgani qayd etildi · tibbiy baholash emas') : t('Staff acknowledgement pending · not a diagnosis', 'Xodim tanishishi kutilmoqda · tashxis emas');
        row.append(main, detail, review, acknowledgement);
        if (state.role === 'staff' && !item.reviewed_at) {
          const action = document.createElement('button'); action.className = 'record-review-button'; action.type = 'button'; action.dataset.screeningId = item.screening_id;
          action.textContent = t('Mark alert reviewed', 'Ogohlantirish bilan tanishdim'); action.setAttribute('aria-label', t(`Mark ${item.child_name}'s synthetic alert as reviewed`, `${item.child_name} sintetik ogohlantirishi bilan tanishilganini qayd etish`, `Отметить синтетическое оповещение (${item.child_name}) как проверенное`));
          row.append(action);
        }
      } else row.append(main, detail, review);
      const preview = document.createElement('small');
      preview.textContent = item.message_preview
        ? `${t('Stored notification preview', 'Saqlangan xabarnoma preview’i')}: ${item.message_preview}`
        : t('Notification: preview only · not sent', 'Xabarnoma: faqat preview · yuborilmagan');
      row.append(preview); list.append(row);
    });
    history.append(list);
  };
  const renderChildren = () => {
    const allowed = new Set(state.children.map(c => c.wristband_code));
    $$('.child-card').forEach(card => {
      const code = codeFor(card.dataset.child);
      card.hidden = Boolean(state.role) && !allowed.has(code);
      const done = Boolean(state.role) && checkedInToday(code);
      card.classList.toggle('checked-today', done);
      let badge = $('.today-badge', card);
      if (done && !badge) { badge = document.createElement('em'); badge.className = 'today-badge'; $('div', card).append(badge); }
      if (badge) { badge.hidden = !done; badge.textContent = t('Checked in today', 'Bugun tekshirilgan'); }
    });
    const selected = $('.child-card.selected');
    if (selected?.hidden) { const first = $('.child-card:not([hidden])'); if (first) first.click(); }
    if (!state.role) { start.disabled = false; start.hidden = false; resetDay.hidden = true; return; }
    const hasChildren = state.children.length > 0;
    start.disabled = !hasChildren || state.role !== 'staff';
    start.hidden = state.role === 'parent';
    resetDay.hidden = state.role !== 'staff';
    if (!hasChildren && state.role) setStatus(t('No fictional child is assigned to this account.', 'Bu hisobga uydirma bola biriktirilmagan.'), 'error');
  };
  const loadState = async () => {
    const data = await supabase.rpc('kidnova_demo_state');
    state = { ...state, role: data?.role || null, children: Array.isArray(data?.children) ? data.children : [], events: Array.isArray(data?.events) ? data.events : [] };
    $$('.demo-screen').forEach(screen => { screen.hidden = false; });
    renderChildren(); renderHistory(); authCopy();
    loginForm.hidden = true; roleBadge.hidden = false; $('.demo-main').dataset.authenticated = 'true';
    setStatus(state.role === 'staff' ? t('Connected · staff access · synthetic records only', 'Ulandi · xodim ruxsati · faqat sintetik yozuvlar') : t('Connected · parent access · assigned child only', 'Ulandi · ota-ona ruxsati · faqat biriktirilgan bola'), 'ok');
    document.dispatchEvent(new CustomEvent('kidnova:attendance'));
  };
  const showSignedOut = message => {
    loginError = null;
    state = { role: null, email: '', children: [], events: [] };
    loginForm.hidden = false; roleBadge.hidden = true; $('.demo-main').dataset.authenticated = 'false';
    $$('.demo-screen').forEach(screen => { screen.hidden = false; });
    loginForm.hidden = !supabase.configured;
    renderChildren(); authCopy(); renderHistory();
    setStatus(message || guestMessage(), message ? 'error' : '');
    document.dispatchEvent(new CustomEvent('kidnova:attendance'));
  };
  const bootstrap = async () => {
    authCopy();
    if (!supabase.configured) { showSignedOut(); return; }
    try {
      const current = await supabase.currentSession();
      if (!current) { showSignedOut(); return; }
      state.email = current.user?.email || '';
      await loadState();
      const first = $('.demo-screen[data-screen="0"]'); first.hidden = false; first.classList.add('active');
    } catch (error) { showSignedOut(errorMessage(error)); }
  };
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = $('.auth-submit', loginForm); const errorNode = $('.auth-error', loginForm);
    submit.disabled = true; loginError = null; errorNode.textContent = '';
    try {
      const formData = new FormData(loginForm);
      const result = await supabase.signIn(formData.get('email'), formData.get('password'));
      state.email = result.user?.email || String(formData.get('email') || '').trim();
      await loadState();
      const first = $('.demo-screen[data-screen="0"]'); first.hidden = false; first.classList.add('active');
      loginForm.reset();
    } catch (error) { loginError = error; authCopy(); errorNode.textContent = errorMessage(error); }
    finally { submit.disabled = false; }
  });
  $('.auth-signout', authPanel).addEventListener('click', async () => {
    try { await supabase.signOut(); } catch (_) { /* Clear the local session even if the remote logout endpoint fails. */ }
    showSignedOut();
    window.kidnovaGoToDemo(0);
  });
  resetDay.addEventListener('click', async () => {
    if (busy || state.role !== 'staff') return;
    const code = codeFor(selectedKey());
    const child = state.children.find(item => item.wristband_code === code);
    if (!child) { setStatus(t('Select an available fictional child first.', 'Avval mavjud uydirma bolani tanlang.'), 'error'); return; }
    const confirmed = window.confirm(t(
      `Delete only today's synthetic demo record for ${child.display_name}? This also removes its dependent screening and notification preview.`,
      `${child.display_name} uchun faqat bugungi sintetik demo yozuvi o‘chirilsinmi? Unga bog‘liq skrining va xabarnoma preview’i ham o‘chadi.`, `Удалить только сегодняшнюю синтетическую запись (${child.display_name})? Вместе с ней удалятся связанный скрининг и предпросмотр уведомления.`
    ));
    if (!confirmed) return;
    busy = true; resetDay.disabled = true;
    setStatus(t('Resetting the selected fictional child’s current-day demo…', 'Tanlangan uydirma bolaning bugungi demosi tiklanmoqda…'));
    try {
      const result = await supabase.rpc('kidnova_reset_demo_day', { p_rfid_code: code });
      await loadState();
      window.kidnovaGoToDemo(0);
      setStatus(result?.deleted
        ? t(`${child.display_name}'s synthetic record for today was removed. The demo can run again.`, `${child.display_name}ning bugungi sintetik yozuvi o‘chirildi. Demoni qayta ishga tushirish mumkin.`, `Сегодняшняя синтетическая запись (${child.display_name}) удалена. Демо можно запустить снова.`)
        : t(`No current-day record existed for ${child.display_name}.`, `${child.display_name} uchun bugungi yozuv mavjud emas edi.`, `Сегодняшней записи (${child.display_name}) не было.`), 'ok');
    } catch (error) { setStatus(errorMessage(error), 'error'); }
    finally { busy = false; resetDay.disabled = false; }
  });
  history.addEventListener('click', async event => {
    const action = event.target.closest('.record-review-button');
    if (!action || state.role !== 'staff' || !action.dataset.screeningId) return;
    action.disabled = true;
    try {
      await supabase.rpc('kidnova_review_demo_alert', { p_screening_id: action.dataset.screeningId });
      await loadState();
      setStatus(t('Staff acknowledgement recorded · this is not a medical assessment', 'Xodim tanishgani qayd etildi · bu tibbiy baholash emas'), 'ok');
    } catch (error) { setStatus(errorMessage(error), 'error'); action.disabled = false; }
  });
  app.addEventListener('click', async event => {
    const button = event.target.closest('.demo-screen[data-screen="0"] .demo-next');
    if (!button) return;
    if (state.role !== 'staff') return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (busy) return;
    const childKey = selectedKey();
    const code = codeFor(childKey);
    const sample = window.kidnovaDemoData?.[childKey] || { height: '104', weight: '17.2' };
    if (!state.children.some(item => item.wristband_code === code)) { setStatus(t('This RFID is not assigned to this staff demo.', 'Bu RFID ushbu demo xodimiga biriktirilmagan.'), 'error'); return; }
    const attention = $('input[name="scenario"]:checked')?.value === 'attention';
    busy = true; start.disabled = true; setStatus(t('Saving simulated RFID check-in and infrared reading…', 'Simulyatsiya qilingan RFID davomat va infraqizil o‘lchov saqlanmoqda…'));
    try {
      const result = await supabase.rpc('kidnova_record_demo_checkin', { p_rfid_code: code, p_temperature_c: attention ? 38.4 : 36.6, p_height_cm: Number(sample.height), p_weight_kg: Number(sample.weight) });
      if (!result?.ok && result?.code === 'duplicate_checkin') {
        const name = state.children.find(item => item.wristband_code === code)?.display_name || code;
        setStatus(t(`${name} has already been checked in today, so the duplicate was blocked ✓ (this is the system's protection, not an error). Choose another child or press "Reset selected child's demo today" to run it again.`,
          `${name} bugun allaqachon tekshirilgan, shuning uchun takroriy davomat bloklandi ✓ (bu xato emas, tizim himoyasi). Boshqa bolani tanlang yoki qayta sinash uchun “Tanlangan bolaning bugungi demosini tiklash” tugmasini bosing.`, `${name} уже отмечен сегодня, поэтому повтор заблокирован ✓ (это защита системы, а не ошибка). Выберите другого ребёнка или нажмите «Сбросить сегодняшнее демо ребёнка», чтобы запустить снова.`), 'info');
        renderChildren();
        return;
      }
      if (!result?.ok) throw new Error('save_failed');
      await loadState();
      const warning = result.requires_staff_review ? t('Staff review required · no diagnosis', 'Xodim tekshiruvi kerak · tashxis emas') : t('No synthetic review flag · no diagnosis', 'Sintetik tekshiruv belgisi yo‘q · tashxis emas');
      $('#resultTemp').textContent = `${result.temperature_c}°C`;
      $('#tempFlag').textContent = warning; $('#tempFlag').className = result.requires_staff_review ? 'warning' : 'ok';
      $('#resultSummary').textContent = warning;
      $('#resultNote p').textContent = warning;
      const profile = result.child_name;
      const savedPreview = result.notification_preview || t(`${profile}'s synthetic screening is complete. ${warning}. This is not a medical diagnosis.`, `${profile} uchun sintetik skrining yakunlandi. ${warning}. Bu tibbiy tashxis emas.`, `Синтетический скрининг (${profile}) завершён. ${warning}. Это не медицинский диагноз.`);
      $('#messageBody').textContent = `${t('Stored notification preview', 'Saqlangan xabarnoma preview’i')}: ${savedPreview}`;
      $('#msgTemp').textContent = String(result.temperature_c);
      setStatus(result.requires_staff_review ? t('Saved · synthetic staff-review warning displayed · no Telegram message sent', 'Saqlandi · sintetik xodim tekshiruvi ogohlantirishi ko‘rsatildi · Telegram xabari yuborilmadi') : t('Saved to Supabase · simulated infrared reading · no Telegram message sent', 'Supabase’da saqlandi · infraqizil ko‘rsatkich simulyatsiya qilingan · Telegram xabari yuborilmadi'), result.requires_staff_review ? 'warning' : 'ok');
      window.kidnovaGoToDemo(1);
    } catch (error) { setStatus(errorMessage(error), 'error'); }
    finally { busy = false; start.disabled = state.role !== 'staff'; }
  }, true);
  window.kidnovaTodayAttendance = () => state.role === 'staff' ? state.events.filter(item => String(item.attendance_date) === tashkentToday()).length : null;
  window.kidnovaLiveHistory = key => {
    if (!state.role) return null;
    const code = codeFor(key);
    const temps = state.events.filter(item => item.wristband_code === code).slice(0, 6).map(item => Number(item.temperature_c)).filter(Number.isFinite).reverse();
    return temps.length ? temps : null;
  };
  document.addEventListener('kidnova:language', () => {
    authCopy(); renderHistory(); renderChildren();
    if (!state.role) setStatus(guestMessage(), '');
    else setStatus(state.role === 'staff' ? t('Connected · staff access · synthetic records only', 'Ulandi · xodim ruxsati · faqat sintetik yozuvlar') : t('Connected · parent access · assigned child only', 'Ulandi · ota-ona ruxsati · faqat biriktirilgan bola'), 'ok');
  });
  bootstrap();
})();
