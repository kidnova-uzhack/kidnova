/* KidNova Smart Nutrition — MVP calculator.
   Runs entirely in the browser; nothing is saved. Values are approximate
   reference values per 100 g of RAW product from general food-composition tables
   and must be replaced with verified Uzbekistan data and dietitian review before real use. */
(() => {
  'use strict';
  const root = document.getElementById('nutritionCalc');
  if (!root) return;
  const uz = () => document.documentElement.lang === 'uz';
  const t = (en, txt, ru) => window.kidnovaT(en, txt, ru);
  const pick = pair => window.kidnovaT(pair[0], pair[1], pair[2]);

  // kcal, protein, carbs, fat, fiber per 100 g raw · allergens: m = milk, e = egg, g = gluten
  const FOODS = {
    rice:      { en: 'Rice (raw)',            uz: 'Guruch (xom)',            v: [365, 7.1, 80, 0.7, 1.3] },
    buckwheat: { en: 'Buckwheat (raw)',       uz: 'Grechka (xom)',           v: [343, 13.3, 71.5, 3.4, 10] },
    oats:      { en: 'Rolled oats',           uz: 'Suli yormasi',            v: [379, 13.2, 67.7, 6.5, 10.1], a: 'g' },
    flour:     { en: 'Wheat flour',           uz: 'Bug‘doy uni',             v: [364, 10.3, 76.3, 1.0, 2.7], a: 'g' },
    pasta:     { en: 'Pasta (dry)',           uz: 'Makaron (quruq)',         v: [371, 13, 75, 1.5, 3.2], a: 'g' },
    bread:     { en: 'Wheat bread',           uz: 'Bug‘doy noni',            v: [266, 8.9, 49, 3.3, 2.7], a: 'g' },
    mung:      { en: 'Mung beans (dry)',      uz: 'Mosh (quruq)',            v: [347, 23.9, 62.6, 1.2, 16.3] },
    chickpeas: { en: 'Chickpeas (dry)',       uz: 'No‘xat (quruq)',          v: [378, 20.5, 63, 6.0, 12.2] },
    potato:    { en: 'Potato',                uz: 'Kartoshka',               v: [77, 2.0, 17.5, 0.1, 2.2] },
    carrot:    { en: 'Carrot',                uz: 'Sabzi',                   v: [41, 0.9, 9.6, 0.2, 2.8] },
    onion:     { en: 'Onion',                 uz: 'Piyoz',                   v: [40, 1.1, 9.3, 0.1, 1.7] },
    cabbage:   { en: 'Cabbage',               uz: 'Karam',                   v: [25, 1.3, 5.8, 0.1, 2.5] },
    pumpkin:   { en: 'Pumpkin',               uz: 'Oshqovoq',                v: [26, 1.0, 6.5, 0.1, 0.5] },
    tomato:    { en: 'Tomato',                uz: 'Pomidor',                 v: [18, 0.9, 3.9, 0.2, 1.2] },
    cucumber:  { en: 'Cucumber',              uz: 'Bodring',                 v: [15, 0.7, 3.6, 0.1, 0.5] },
    beef:      { en: 'Beef, lean (raw)',      uz: 'Mol go‘shti, yog‘siz',    v: [176, 20, 0, 10, 0] },
    lamb:      { en: 'Lamb (raw)',            uz: 'Qo‘y go‘shti',            v: [282, 16.6, 0, 23.4, 0] },
    chicken:   { en: 'Chicken breast (raw)',  uz: 'Tovuq go‘shti (to‘sh)',   v: [120, 22.5, 0, 2.6, 0] },
    egg:       { en: 'Egg',                   uz: 'Tuxum',                   v: [143, 12.6, 0.7, 9.5, 0], a: 'e' },
    milk:      { en: 'Milk 3.2%',             uz: 'Sut 3.2%',                v: [61, 3.2, 4.8, 3.3, 0], a: 'm' },
    kefir:     { en: 'Kefir / plain yogurt',  uz: 'Kefir / qatiq',           v: [61, 3.5, 4.7, 3.3, 0], a: 'm' },
    tvorog:    { en: 'Cottage cheese 4%',     uz: 'Tvorog 4%',               v: [98, 11.1, 3.4, 4.3, 0], a: 'm' },
    butter:    { en: 'Butter',                uz: 'Sariyog‘',                v: [717, 0.9, 0.1, 81, 0], a: 'm' },
    oil:       { en: 'Vegetable oil',         uz: 'O‘simlik yog‘i',          v: [884, 0, 0, 100, 0] },
    sugar:     { en: 'Sugar',                 uz: 'Shakar',                  v: [387, 0, 100, 0, 0] },
    apple:     { en: 'Apple',                 uz: 'Olma',                    v: [52, 0.3, 13.8, 0.2, 2.4] },
    banana:    { en: 'Banana',                uz: 'Banan',                   v: [89, 1.1, 22.8, 0.3, 2.6] },
    raisins:   { en: 'Raisins',               uz: 'Mayiz',                   v: [299, 3.1, 79, 0.5, 3.7] }
  };
  const ALLERGENS = { m: ['Milk', 'Sut'], e: ['Egg', 'Tuxum'], g: ['Gluten', 'Glyuten'] };
  const MEALS = { breakfast: ['Breakfast', 'Nonushta'], lunch: ['Lunch', 'Tushlik'], snack: ['Snack', 'Tamaddi'], dinner: ['Dinner', 'Kechki ovqat'] };
  // Sample per-portion recipes for the demo — illustrative, not an approved menu.
  const RECIPES = [
    { id: 'shirguruch', meal: 'breakfast', en: 'Milk rice porridge', uz: 'Sutli guruch bo‘tqasi', items: [['rice', 30], ['milk', 150], ['sugar', 5], ['butter', 5]] },
    { id: 'suli', meal: 'breakfast', en: 'Oat porridge with apple', uz: 'Olmali suli bo‘tqasi', items: [['oats', 30], ['milk', 150], ['apple', 50], ['sugar', 5]] },
    { id: 'mosh', meal: 'lunch', en: 'Mung bean soup (mosh sho‘rva)', uz: 'Mosh sho‘rva', items: [['mung', 20], ['rice', 10], ['potato', 40], ['carrot', 15], ['onion', 10], ['beef', 25], ['oil', 5]] },
    { id: 'palov', meal: 'lunch', en: 'Plov', uz: 'Palov', items: [['rice', 50], ['beef', 30], ['carrot', 40], ['onion', 15], ['oil', 8], ['chickpeas', 5]] },
    { id: 'grechka', meal: 'lunch', en: 'Buckwheat with chicken', uz: 'Grechka va tovuq', items: [['buckwheat', 40], ['chicken', 50], ['carrot', 10], ['butter', 4]] },
    { id: 'zapekanka', meal: 'snack', en: 'Cottage cheese bake', uz: 'Tvorogli zapekanka', items: [['tvorog', 80], ['egg', 15], ['flour', 8], ['sugar', 8], ['butter', 3], ['raisins', 5]] },
    { id: 'kefir', meal: 'snack', en: 'Kefir and bread', uz: 'Kefir va non', items: [['kefir', 150], ['bread', 25]] },
    { id: 'dimlama', meal: 'dinner', en: 'Vegetable dimlama with beef', uz: 'Sabzavotli dimlama', items: [['potato', 70], ['cabbage', 50], ['carrot', 20], ['onion', 10], ['beef', 25], ['oil', 5]] }
  ];

  const state = { meal: 'breakfast', recipe: 'shirguruch', rows: RECIPES[0].items.map(([food, grams]) => ({ food, grams })), portions: 25 };
  const clampNum = (value, min, max) => { const n = Number(String(value).replace(',', '.')); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : 0; };
  const fmt = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toLocaleString(({ uz: 'uz-UZ', ru: 'ru-RU' })[document.documentElement.lang] || 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
  const weight = g => g >= 1000 ? `${fmt(g / 1000, 2)} kg` : `${fmt(g, 0)} g`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const foodName = key => t(FOODS[key].en, FOODS[key].uz);

  const totals = () => {
    const sum = [0, 0, 0, 0, 0];
    const allergens = new Set();
    state.rows.forEach(({ food, grams }) => {
      const item = FOODS[food]; if (!item || !(grams > 0)) return;
      item.v.forEach((value, i) => { sum[i] += value * grams / 100; });
      if (item.a) allergens.add(item.a);
    });
    return { sum, allergens };
  };

  const attendanceCount = () => (typeof window.kidnovaTodayAttendance === 'function' ? window.kidnovaTodayAttendance() : null);

  function renderForm() {
    const recipeOptions = RECIPES.filter(r => r.meal === state.meal)
      .map(r => `<option value="${r.id}"${r.id === state.recipe ? ' selected' : ''}>${esc(t(r.en, r.uz))}</option>`).join('');
    const foodOptions = selected => Object.keys(FOODS)
      .map(key => `<option value="${key}"${key === selected ? ' selected' : ''}>${esc(foodName(key))}</option>`).join('');
    const live = attendanceCount();
    root.innerHTML = `
      <div class="nc-head">
        <div><span class="nc-badge">${t('Working MVP · approximate data', 'Ishlaydigan MVP · taxminiy ma’lumot')}</span>
        <h3>${t('Smart Nutrition calculator', 'Smart Nutrition kalkulyatori')}</h3>
        <p>${t('Enter the raw ingredients for ONE portion. The calculator shows calories, protein, carbohydrates, fat and fiber per portion, then multiplies by the number of children.', 'BITTA porsiya uchun xom masalliqlarni kiriting. Kalkulyator bir porsiyadagi kaloriya, oqsil, uglevod, yog‘ va kletchatkani ko‘rsatadi, so‘ng bolalar soniga ko‘paytiradi.')}</p></div>
      </div>
      <div class="nc-body">
        <div class="nc-form">
          <div class="nc-row2">
            <label><span>${t('Meal', 'Ovqat vaqti')}</span><select data-nc="meal">${Object.entries(MEALS).map(([k, v]) => `<option value="${k}"${k === state.meal ? ' selected' : ''}>${pick(v)}</option>`).join('')}</select></label>
            <label><span>${t('Sample recipe', 'Namuna taom')}</span><select data-nc="recipe">${recipeOptions}<option value="custom"${state.recipe === 'custom' ? ' selected' : ''}>${t('Custom (empty)', 'O‘zim kiritaman (bo‘sh)')}</option></select></label>
          </div>
          <div class="nc-table" role="table" aria-label="${t('Ingredients for one portion', 'Bir porsiya uchun masalliqlar')}">
            <div class="nc-th" role="row"><span>${t('Ingredient', 'Masalliq')}</span><span>${t('g / portion', 'g / porsiya')}</span><span>${t('kcal', 'kkal')}</span><span></span></div>
            ${state.rows.map((row, i) => `<div class="nc-tr" role="row">
              <select data-nc="food" data-i="${i}" aria-label="${t('Ingredient', 'Masalliq')} ${i + 1}">${foodOptions(row.food)}</select>
              <input data-nc="grams" data-i="${i}" type="number" inputmode="decimal" min="0" max="1000" step="1" value="${row.grams}" aria-label="${t('Grams per portion', 'Porsiyadagi gramm')} ${i + 1}">
              <output data-nc-kcal="${i}">0</output>
              <button type="button" class="nc-remove" data-nc="remove" data-i="${i}" aria-label="${t('Remove ingredient', 'Masalliqni o‘chirish')} ${i + 1}">×</button>
            </div>`).join('')}
          </div>
          <button type="button" class="nc-add" data-nc="add">＋ ${t('Add ingredient', 'Masalliq qo‘shish')}</button>
          <div class="nc-portions">
            <label><span>${t('Number of children (portions)', 'Bolalar soni (porsiyalar)')}</span><input data-nc="portions" type="number" inputmode="numeric" min="1" max="500" step="1" value="${state.portions}"></label>
            <button type="button" class="nc-rfid" data-nc="rfid"${live === null ? ' disabled' : ''}>⌁ ${t('Use today’s RFID attendance', 'Bugungi RFID davomatidan olish')}</button>
            <small class="nc-hint">${live === null
              ? t('Sign in with the staff demo account in the simulation above to use today’s simulated RFID check-ins.', 'Bugungi simulyatsiya RFID davomatidan foydalanish uchun yuqoridagi simulyatsiyada demo xodim hisobi bilan kiring.')
              : t(`Today’s simulated RFID check-ins: ${live}`, `Bugungi simulyatsiya RFID davomati: ${live} ta bola`, `Сегодняшние RFID-отметки (симуляция): ${live}`)}</small>
          </div>
        </div>
        <div class="nc-out" aria-live="polite"></div>
      </div>
      <p class="nc-caveat">${t('Approximate reference values per 100 g of raw product from general food-composition tables. Cooking losses are not included and no age norms are applied. Not a medical or dietary prescription; values must be verified with Uzbekistan data and a qualified dietitian before use in a kindergarten. Nothing is saved.', 'Umumiy oziq-ovqat jadvallaridan olingan 100 g xom mahsulot uchun taxminiy qiymatlar. Pishirishdagi yo‘qotishlar hisobga olinmagan, yosh me’yorlari qo‘llanmagan. Bu tibbiy yoki parhez retsepti emas; bog‘chada qo‘llashdan oldin qiymatlar O‘zbekiston ma’lumotlari va malakali dietolog bilan tekshirilishi kerak. Hech narsa saqlanmaydi.')}</p>`;
    renderOutput();
  }

  function renderOutput() {
    const out = root.querySelector('.nc-out'); if (!out) return;
    state.rows.forEach((row, i) => { const cell = root.querySelector(`[data-nc-kcal="${i}"]`); if (cell) cell.textContent = FOODS[row.food] ? fmt(FOODS[row.food].v[0] * row.grams / 100, 0) : '0'; });
    const { sum, allergens } = totals();
    const [kcal, protein, carbs, fat, fiber] = sum;
    const energy = protein * 4 + carbs * 4 + fat * 9 || 1;
    const share = n => Math.round(n / energy * 100);
    const n = state.portions;
    const shopping = {};
    state.rows.forEach(({ food, grams }) => { if (FOODS[food] && grams > 0) shopping[food] = (shopping[food] || 0) + grams * n; });
    out.innerHTML = `
      <div class="nc-card">
        <small>${t('Per 1 portion', '1 porsiya uchun')}</small>
        <div class="nc-kcal"><strong>${fmt(kcal, 0)}</strong><span>${t('kcal', 'kkal')}</span></div>
        <div class="nc-macros">
          <div><b>${fmt(protein)} g</b><span>${t('Protein', 'Oqsil')}</span></div>
          <div><b>${fmt(carbs)} g</b><span>${t('Carbohydrates', 'Uglevod')}</span></div>
          <div><b>${fmt(fat)} g</b><span>${t('Fat', 'Yog‘')}</span></div>
          <div><b>${fmt(fiber)} g</b><span>${t('Fiber', 'Kletchatka')}</span></div>
        </div>
        <div class="nc-bar" aria-label="${t('Energy share', 'Energiya ulushi')}"><i class="p" style="width:${share(protein * 4)}%"></i><i class="c" style="width:${share(carbs * 4)}%"></i><i class="f" style="width:${share(fat * 9)}%"></i></div>
        <div class="nc-legend"><span class="p">${t('Protein', 'Oqsil')} ${share(protein * 4)}%</span><span class="c">${t('Carbs', 'Uglevod')} ${share(carbs * 4)}%</span><span class="f">${t('Fat', 'Yog‘')} ${share(fat * 9)}%</span></div>
        <div class="nc-allergens">${allergens.size ? `<b>${t('Contains', 'Tarkibida bor')}:</b> ${[...allergens].map(a => `<em>${pick(ALLERGENS[a])}</em>`).join('')}` : `<span>${t('No milk, egg or gluten ingredients listed', 'Sut, tuxum yoki glyutenli masalliq yo‘q')}</span>`}</div>
      </div>
      <div class="nc-card nc-group">
        <small>${t(`For ${n} children`, `${n} ta bola uchun`, `На ${n} детей`)}</small>
        <div class="nc-group-kcal">${fmt(kcal * n, 0)} ${t('kcal', 'kkal')} · ${t('protein', 'oqsil')} ${weight(protein * n)} · ${t('fiber', 'kletchatka')} ${weight(fiber * n)}</div>
        <b class="nc-shop-title">${t('Shopping list (raw)', 'Xarid ro‘yxati (xom)')}</b>
        <ul class="nc-shop">${Object.entries(shopping).map(([food, g]) => `<li><span>${esc(foodName(food))}</span><b>${weight(g)}</b></li>`).join('') || `<li><span>—</span></li>`}</ul>
        <button type="button" class="nc-copy" data-nc="copy">${t('Copy kitchen sheet', 'Oshxona varag‘ini nusxalash')}</button>
        <small class="nc-copy-status" role="status"></small>
      </div>`;
  }

  function kitchenSheet() {
    const { sum } = totals();
    const recipe = RECIPES.find(r => r.id === state.recipe);
    const title = recipe ? t(recipe.en, recipe.uz) : t('Custom dish', 'Maxsus taom');
    const lines = [
      `KidNova Smart Nutrition — ${pick(MEALS[state.meal])}: ${title}`,
      t('1 portion', '1 porsiya') + `: ${fmt(sum[0], 0)} ${t('kcal', 'kkal')} · ${t('protein', 'oqsil')} ${fmt(sum[1])} g · ${t('carbs', 'uglevod')} ${fmt(sum[2])} g · ${t('fat', 'yog‘')} ${fmt(sum[3])} g · ${t('fiber', 'kletchatka')} ${fmt(sum[4])} g`,
      t(`For ${state.portions} children:`, `${state.portions} ta bola uchun:`, `На ${state.portions} детей:`),
      ...state.rows.filter(r => r.grams > 0).map(r => `- ${foodName(r.food)}: ${weight(r.grams * state.portions)}`),
      t('Approximate values · requires dietitian review', 'Taxminiy qiymatlar · dietolog tekshiruvi talab etiladi')
    ];
    return lines.join('\n');
  }

  root.addEventListener('change', event => {
    const el = event.target.closest('[data-nc]'); if (!el) return;
    const kind = el.dataset.nc;
    if (kind === 'meal') { state.meal = el.value; const first = RECIPES.find(r => r.meal === state.meal); state.recipe = first.id; state.rows = first.items.map(([food, grams]) => ({ food, grams })); renderForm(); }
    else if (kind === 'recipe') { state.recipe = el.value; const r = RECIPES.find(x => x.id === el.value); state.rows = r ? r.items.map(([food, grams]) => ({ food, grams })) : [{ food: 'rice', grams: 0 }]; renderForm(); }
    else if (kind === 'food') { state.rows[+el.dataset.i].food = el.value; state.recipe = 'custom'; root.querySelector('[data-nc="recipe"]').value = 'custom'; renderOutput(); }
  });
  root.addEventListener('input', event => {
    const el = event.target.closest('[data-nc]'); if (!el) return;
    if (el.dataset.nc === 'grams') { state.rows[+el.dataset.i].grams = clampNum(el.value, 0, 1000); renderOutput(); }
    if (el.dataset.nc === 'portions') { state.portions = Math.round(clampNum(el.value, 1, 500)) || 1; renderOutput(); }
  });
  root.addEventListener('click', async event => {
    const el = event.target.closest('button[data-nc]'); if (!el) return;
    const kind = el.dataset.nc;
    if (kind === 'add') { state.rows.push({ food: 'carrot', grams: 0 }); state.recipe = 'custom'; renderForm(); root.querySelector(`[data-nc="grams"][data-i="${state.rows.length - 1}"]`)?.focus(); }
    if (kind === 'remove') { state.rows.splice(+el.dataset.i, 1); if (!state.rows.length) state.rows.push({ food: 'rice', grams: 0 }); state.recipe = 'custom'; renderForm(); }
    if (kind === 'rfid') { const n = attendanceCount(); if (n) { state.portions = n; renderForm(); } else { root.querySelector('.nc-hint').textContent = t('No simulated RFID check-ins recorded today yet.', 'Bugun hali simulyatsiya RFID davomati qayd etilmagan.'); } }
    if (kind === 'copy') {
      const status = root.querySelector('.nc-copy-status');
      try { await navigator.clipboard.writeText(kitchenSheet()); status.textContent = t('Copied', 'Nusxalandi'); }
      catch (_) { status.textContent = t('Copy failed — select the text manually', 'Nusxalab bo‘lmadi — matnni qo‘lda belgilang'); }
    }
  });
  document.addEventListener('kidnova:language', renderForm);
  document.addEventListener('kidnova:attendance', renderForm);
  renderForm();
})();
