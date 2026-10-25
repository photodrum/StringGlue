// Сценарии «из жизни»: готовый текст (оптимизация), графика из PDF, смешанное выделение.
const H = require('./harness.js');
const { srcFrame, font, rgb, pointText, areaText, pathItem } = H;
const BLACK = rgb(0, 0, 0), GRAY = rgb(120, 120, 120), BLUE = rgb(30, 110, 230), RED = rgb(200, 30, 30);
const st = (size, f = 'Reg', fill = BLACK, extra = {}) => Object.assign({ size, textFont: font(f), fillColor: fill }, extra);
const W = (t, sz) => [...t].reduce((x, ch) => x + (ch === ' ' ? 0.3 : 0.6) * sz, 0);
function L(text, a, base, x0 = 0) { const out = []; let x = x0;
  for (const ch of text) { if (ch === ' ') { x += a.size * 0.3; continue; } out.push(srcFrame(ch, x, base, a)); x += a.size * 0.6; } return out; }
const body = ['Рабочая зона и кнопка не делят внимание со служебными', 'элементами. Язык, автор и донат собраны в одну тихую',
  'полосу внизу — там, где их ищут в панелях Adobe. Секции', 'повторяют панель «Свойства» и показывают состояние.'];
const body2 = ['Второй абзац текста тоже переносится по ширине и занимает', 'несколько строк подряд до самого конца абзаца.'];

const T = [];
const S = (name, build, exp) => T.push({ name, build, exp });

// ---------- оптимизация готового текста ----------
S('Готовый точечный текст: заголовок + абзац с разрывами строк', () => [
  pointText([{ lines: ['Заголовок раздела'], attrs: st(20, 'Bold'), leading: 24 },
             { lines: body, attrs: st(12), leading: 16, spaceBefore: 8 }], 0, 800)
], { blocks: 1, kinds: { a: 1 }, paras: 2, text: 'Заголовок раздела\r' + body.join(' '), lead: [null, 16], sb: [null, 8] });

S('Абзац набран Enter в конце каждой строки', () => [
  pointText(body.map(t => ({ lines: [t], attrs: st(12), leading: 16 })), 0, 800)
], { blocks: 1, kinds: { a: 1 }, paras: 1, text: body.join(' ') });

S('Пустые абзацы-распорки вместо отбивок', () => [
  pointText([{ lines: ['Заголовок'], attrs: st(18, 'Bold'), leading: 16 }, { lines: [''], attrs: st(12), leading: 16 },
             { lines: body.slice(0, 2), attrs: st(12), leading: 16 }, { lines: [''], attrs: st(12), leading: 16 },
             { lines: body.slice(2), attrs: st(12), leading: 16 }], 0, 800)
], { blocks: 1, paras: 3, noEmpty: true, sbMin: [null, 15, 15] });

S('Абзац разрезан на два текстовых объекта', () => [
  pointText([{ lines: body.slice(0, 2), attrs: st(12), leading: 16 }], 0, 800),
  pointText([{ lines: body.slice(2), attrs: st(12), leading: 16 }], 0, 768)
], { blocks: 1, kinds: { a: 1 }, paras: 1, text: body.join(' '), allRemoved: true });

S('Хороший текст в области не портится', () => [
  areaText([{ lines: body.slice(0, 3), attrs: st(12), leading: 16 }, { lines: body2, attrs: st(12), leading: 16, spaceBefore: 8 }],
           { left: 0, top: 800 + 9.6, width: 380, height: 200 })
], { blocks: 1, kinds: { a: 1 }, paras: 2, text: body.slice(0, 3).join(' ') + '\r' + body2.join(' ') });

S('Две колонки — два готовых текста в области', () => [
  areaText([{ lines: body, attrs: st(12), leading: 16 }], { left: 0, top: 809.6, width: 360, height: 100 }),
  areaText([{ lines: body2.concat(body.slice(0, 2)), attrs: st(12), leading: 16 }], { left: 400, top: 809.6, width: 380, height: 100 })
], { blocks: 2, kinds: { a: 2 } });

S('Текст в области по центру', () => [
  areaText([{ lines: ['Центрированный абзац текста', 'в две строки по центру'], attrs: st(14), leading: 18, justification: 'CENTER' }],
           { left: 0, top: 811.2, width: 300, height: 60 })
], { blocks: 1, justs: [['CENTER']] });

S('Автоинтерлиньяж в готовом тексте', () => [
  pointText([{ lines: ['Заголовок'], attrs: st(20, 'Bold') }, { lines: ['Короткая строка', 'и ещё одна'], attrs: st(12) }], 0, 800, { autoLeading: true })
], { blocks: 1, kinds: { p: 1 }, baselines: { 'Заголовок': 800, 'Короткая строка': 785.6, 'и ещё одна': 771.2 } });

S('Буквы из PDF + готовый абзац под ними', () => [
  ...L('Заголовок из букв', st(20, 'Bold'), 860, 0),
  areaText([{ lines: body, attrs: st(12), leading: 16 }], { left: 0, top: 830 + 9.6, width: 360, height: 100 })
], { blocks: 1, kinds: { a: 1 }, paras: 2 });

// ---------- графика из PDF ----------
S('Подчёркивание и зачёркивание линиями', () => {
  const a = st(12), out = [...L('Перейти по ссылке на сайт', a, 800, 0), ...L('Цена 990 790 рублей', a, 780, 0)];
  const x0 = W('Перейти по ', 12), x1 = x0 + W('ссылке', 12) - 0.6;
  out.push(pathItem(x0, 800 - 1.6, x1, 800 - 2.4));                       // подчёркивание под «ссылке»
  const s0 = W('Цена ', 12), s1 = s0 + W('990', 12) - 0.6;
  out.push(pathItem(s0, 780 + 3.9, s1, 780 + 3.3));                        // зачёркивание «990»
  return out;
}, { blocks: 1, deco: { 'ссылке': 'u', '990': 's', 'Перейти': '', '790': '' }, pathsRemoved: 2 });

S('Маркеры-кружки из PDF', () => {
  const a = st(13), out = [];
  ['Первый пункт списка', 'Второй пункт подлиннее', 'Третий пункт'].forEach((t, i) => {
    const y = 800 - i * 20; out.push(pathItem(0, y + 6.5, 5, y + 1.5, { fill: BLUE })); out.push(...L(t, a, y, 14)); });
  return out;
}, { blocks: 1, kinds: { p: 1 }, list: 3, pathsRemoved: 3, bullets: 3 });

S('Список с переносами пунктов («•» текстом)', () => {
  const a = st(12), out = []; let y = 800;
  [['Первый пункт списка длинный и он переносится', 'на вторую строку под текстом'], ['Второй пункт в одну строку'],
   ['Третий пункт тоже длинный и тоже переносится', 'на следующую строку']].forEach(item => {
    out.push(...L('•', a, y, 0));
    item.forEach(t => { out.push(...L(t, a, y, 14)); y -= 16; });
  });
  return out;
}, { blocks: 1, paras: 3, list: 3 });

S('Диалог с тире — не список', () => {
  const a = st(12), out = [];
  ['— Привет, — сказал он и посмотрел в окно на улицу.', 'Ответа не было, и он продолжил писать свой текст', 'дальше, не отвлекаясь на шум за окном комнаты.'].forEach((t, i) => out.push(...L(t, a, 800 - i * 16, 0)));
  return out;
}, { blocks: 1, list: 0 });

// ---------- смешанное выделение ----------
S('Фон, линейка и значок не трогаются', () => {
  const out = [pathItem(-20, 900, 600, 600, { fill: rgb(245, 245, 245) })];                  // фон карточки
  out.push(...L('Заголовок карточки', st(20, 'Bold'), 860, 0));
  out.push(pathItem(-10, 852, 590, 851.5));                                                    // линейка на всю ширину под заголовком
  out.push(pathItem(-40, 880, -16, 856, { fill: BLUE }));                                      // значок 24×24 слева от заголовка
  body.forEach((t, i) => out.push(...L(t, st(12), 830 - i * 16, 0)));
  return out;
}, { blocks: 1, pathsRemoved: 0, pathsKept: 3 });

S('Текст по контуру, связанный и повёрнутый пропускаются', () => {
  const out = [...L('Обычный текст из букв', st(14), 800, 0)];
  const p = pointText([{ lines: ['по контуру'], attrs: st(12) }], 0, 700); p.kind = 'PATHTEXT'; out.push(p);
  const th = areaText([{ lines: ['связанный текст'], attrs: st(12), leading: 16 }], { left: 0, top: 660, width: 200, height: 20 }); th.nextFrame = {}; out.push(th);
  const rot = pointText([{ lines: ['повёрнутый'], attrs: st(12) }], 0, 600); rot.matrix = { mValueA: 0.7, mValueB: 0.7, mValueC: -0.7, mValueD: 0.7 }; out.push(rot);
  return out;
}, { blocks: 1, skipped: 3, keptFrames: 3 });

// ---------- готовый текст в обычных режимах ----------
S('Готовый текст в режиме «Сохранить строки»', () => [
  pointText([{ lines: ['Заголовок раздела'], attrs: st(20, 'Bold'), leading: 24 },
             { lines: body, attrs: st(12), leading: 16, spaceBefore: 8 }], 0, 800)
], { mode: 'lines', baselines: { 'Заголовок раздела': 800, [body[0]]: 776, [body[1]]: 760, [body[2]]: 744, [body[3]]: 728 } });

// ---------- прогон ----------
// ---------- ещё случаи из практики ----------
S('Разные цвета в одной строке заголовка', () => {
  const out = []; let x = 0;
  for (const [t, a] of [['Итог: ', st(22, 'Bold')], ['A · Подвал', st(22, 'Bold', BLUE)]]) { out.push(...L(t, a, 800, x)); x += W(t, 22); }
  body.forEach((t, i) => out.push(...L(t, st(16), 760 - i * 24, 0)));
  return out;
}, { blocks: 1, kinds: { a: 1 }, paras: 2 });

S('Верхний индекс в готовом тексте сохраняется', () => {
  const f = pointText([{ lines: ['Площадь 25 м2 и объём 3 м3'], attrs: st(14) }, { lines: ['вторая строка'], attrs: st(14) }], 0, 800, { leading: 18 });
  [11, 25].forEach(i => { f.chars[i].attrs.baselineShift = 5; f.chars[i].attrs.size = 8; });
  return [f];
}, { blocks: 1, sup: 2 });

S('Обтравочная маска в группе не трогается', () => {
  const clip = pathItem(-10, 900, 500, 600, { clipping: true });
  const letters = L('Текст внутри обтравочной группы', st(14), 800, 0);
  const g = { typename: 'GroupItem', pageItems: [clip, ...letters], hidden: false, locked: false, removed: false, remove() { this.removed = true; } };
  return [g];
}, { blocks: 1, groupClipKept: true });

S('Скрытые объекты в выделении остаются', () => {
  const out = L('Видимый текст', st(14), 800, 0);
  const h = pointText([{ lines: ['скрытый текст'], attrs: st(14) }], 0, 780); h.hidden = true;
  return [...out, h];
}, { blocks: 1, keptFrames: 1, hiddenKept: true });

S('Строки продублированы (поддельный жирный целыми строками)', () => {
  const out = [];
  body.slice(0, 3).forEach((t, i) => { const y = 800 - i * 16; out.push(srcFrame(t, 0, y, st(12))); out.push(srcFrame(t, 0.2, y, st(12))); });
  out.forEach(f => { f.geometricBounds = [f.anchor[0], f.anchor[1] + 9, f.anchor[0] + W(f.contents, 12) - 0.6, f.anchor[1] - 2.4]; });
  return out;
}, { blocks: 1, text: body.slice(0, 3).join(' '), dupes: true });

S('Готовый текст с выключкой вправо', () => [
  pointText([{ lines: ['Правая колонка', 'текст справа', 'ещё одна строка'], attrs: st(12), justification: 'RIGHT' }], 300, 800, { leading: 15 })
], { blocks: 1, justs: [['RIGHT']] });

S('Готовые абзацы с красной строкой', () => [
  areaText([{ lines: ['Первый абзац начинается с отступа и', 'продолжается обычными строками без', 'отступа до самого конца.'], attrs: st(12), leading: 16 },
            { lines: ['Второй абзац тоже с красной строки', 'и тоже в несколько строк подряд.'], attrs: st(12), leading: 16 }],
           { left: 0, top: 809.6, width: 300, height: 100 })
].map(f => { f.paraAttrs.forEach(a => a.firstLineIndent = 18); return f; }), { blocks: 1, paras: 2, fli: 18 });

S('Готовый нумерованный список с висячим отступом', () => [
  pointText([1, 2, 3].map(n => ({ lines: [n + '.\tПункт списка номер ' + n], attrs: st(12), leftIndent: 18, firstLineIndent: -18 })), 0, 800, { leading: 16 })
], { blocks: 1, list: 3 });

S('Подчёркивание свойством текста в готовом тексте', () => {
  const f = pointText([{ lines: ['Перейти по ссылке на сайт', 'вторая строка без ссылки'], attrs: st(12) }], 0, 800, { leading: 16 });
  for (let i = 11; i < 17; i++) f.chars[i].attrs.underline = true;
  return [f];
}, { blocks: 1, deco: { 'ссылке': 'u', 'Перейти': '' } });

S('Таблица из готовых точечных текстов по ячейкам', () => {
  const out = [];
  [['Товар', 'Цена', 'Остаток'], ['Кофе', '250', '12'], ['Чай', '180', '30'], ['Какао', '220', '7']].forEach((row, r) =>
    row.forEach((t, c) => out.push(pointText([{ lines: [t], attrs: st(12, r ? 'Reg' : 'Bold') }], c * 120, 800 - r * 22))));
  return out;
}, { blocks: 12, kinds: { c: 12 } });

S('Выделены только фигуры — понятная ошибка', () => [pathItem(0, 100, 100, 0), pathItem(10, 50, 20, 40)],
  { err: 'В выделении нет текстовых объектов' });

S('Выделен только неподходящий текст — понятная ошибка', () => {
  const p = pointText([{ lines: ['по контуру'], attrs: st(12) }], 0, 700); p.kind = 'PATHTEXT';
  return [p];
}, { err: 'Тексты по контуру, связанные, повёрнутые и вертикальные не обрабатываются' });

let fail = 0;
for (const sc of T) {
  const frames = sc.build(), msgs = [], mode = sc.exp.mode || 'auto';
  const flat = []; (function walk(a) { a.forEach(x => x.typename === 'GroupItem' ? walk(x.pageItems) : flat.push(x)); })(frames);
  const texts = flat.filter(f => f.typename === 'TextFrame'), paths = flat.filter(f => f.typename !== 'TextFrame');
  const usable = texts.filter(f => f.kind !== 'PATHTEXT' && !f.nextFrame && !f.matrix && !f.hidden);
  const srcChars = usable.map(f => f.contents).join('').replace(/[\s\u0003\r]/g, '').split('').sort().join('');
  const r = H.run(frames, { mode, track: true, hyph: false, del: true, gap: 0.12, para: 1.35, col: 1.2, lang: 'ru' });
  if (sc.exp.err) { if (r.res !== 'ERR:' + sc.exp.err) msgs.push('ждали ошибку «' + sc.exp.err + '», получили ' + r.res);
    if (r.ana.err !== sc.exp.err) msgs.push('анализ: ' + JSON.stringify(r.ana)); }
  else if (!r.res.startsWith('OK:')) { msgs.push(r.res); }
  else {
    const E = sc.exp, out = r.created;
    let outChars = out.map(t => t.contents).join('').replace(/[\s\u0003\r]/g, '');
    if (E.bullets) outChars = outChars.replace(/•/g, '');
    const want = E.dupes ? [...new Set([0])] && usable.filter((f, i) => i % 2 === 0).map(f => f.contents).join('').replace(/[\s\u0003\r]/g, '').split('').sort().join('') : srcChars;
    if (outChars.split('').sort().join('') !== want) msgs.push('буквы потеряны или добавлены');
    if (r.junk) msgs.push(`оставлены лишние объекты: ${r.junk}`);
    if (E.blocks !== undefined && out.length !== E.blocks) msgs.push(`текстов ${out.length}, ждали ${E.blocks}`);
    if (mode === 'auto' && E.blocks !== undefined && r.ana.blocks.length !== E.blocks) msgs.push(`анализ: блоков ${r.ana.blocks.length}, ждали ${E.blocks}`);
    if (E.kinds) { const k = {}; (r.ana.blocks || []).forEach(b => k[b.k] = (k[b.k] || 0) + 1);
      for (const x in E.kinds) if (k[x] !== E.kinds[x]) msgs.push(`вид ${x}: ${k[x] || 0}, ждали ${E.kinds[x]}`); }
    const t0 = out[0];
    if (E.paras !== undefined && t0.contents.split('\r').length !== E.paras) msgs.push(`абзацев ${t0.contents.split('\r').length}, ждали ${E.paras}: ${JSON.stringify(t0.contents.slice(0, 120))}`);
    if (E.text !== undefined && t0.contents !== E.text) msgs.push(`текст: ${JSON.stringify(t0.contents.slice(0, 160))}`);
    if (E.noEmpty && /\r\r|^\r|\r$/.test(t0.contents)) msgs.push('остались пустые абзацы');
    if (E.lead) E.lead.forEach((v, i) => { if (v === null) return; const ps = t0.paragraphs; const lv = ps[i] && ps[i].characterAttributes.leading;
      if (Math.abs(lv - v) > 0.3) msgs.push(`интерлиньяж абзаца ${i + 1}: ${lv}, ждали ${v}`); });
    if (E.sb) E.sb.forEach((v, i) => { if (v === null) return; const g = (t0.paraAttrs[i] || {}).spaceBefore || 0; if (Math.abs(g - v) > 0.3) msgs.push(`отбивка абзаца ${i + 1}: ${g}, ждали ${v}`); });
    if (E.sbMin) E.sbMin.forEach((v, i) => { if (v === null) return; const g = (t0.paraAttrs[i] || {}).spaceBefore || 0; if (g < v) msgs.push(`отбивка абзаца ${i + 1}: ${g}, ждали ≥ ${v}`); });
    if (E.justs) E.justs.forEach((js, bi) => js.forEach((j, pi) => { const g = ((out[bi] || {}).paraAttrs || [])[pi]; if (!g || g.justification !== j) msgs.push(`выключка ${g && g.justification}, ждали ${j}`); }));
    if (E.list !== undefined) { const ps = t0.contents.split('\r'), items = ps.filter(x => /^\S{1,4}\t/.test(x)).length;
      const hang = t0.paraAttrs.slice(0, ps.length).filter(a => (a.leftIndent || 0) > 0 && (a.firstLineIndent || 0) < 0).length;
      if (items !== E.list || hang !== E.list) msgs.push(`список: с табуляцией ${items}, с висячим отступом ${hang}, ждали ${E.list}: ${JSON.stringify(t0.contents.slice(0, 90))}`); }
    if (E.baselines) out.filter(t => t.kind === 'POINTTEXT').forEach(t => H.layout(t).forEach(l => {
      if (E.baselines[l.text] !== undefined && Math.abs(E.baselines[l.text] - l.y) > 0.35) msgs.push(`«${l.text}» на ${l.y.toFixed(2)}, ждали ${E.baselines[l.text]}`); }));
    if (E.baselines) { const seen = new Set(); out.forEach(t => H.layout(t).forEach(l => seen.add(l.text)));
      for (const k in E.baselines) if (!seen.has(k)) msgs.push(`строка «${k}» не найдена отдельной строкой`); }
    if (E.deco) { const txt = out.map(t => t.chars.map(c => c.contents).join('')).join(''), all = out.flatMap(t => t.chars);
      for (const w in E.deco) { const i = txt.indexOf(w); if (i < 0) { msgs.push(`нет слова «${w}»`); continue; }
        for (let k = i; k < i + w.length; k++) { const a = all[k].attrs, want = E.deco[w];
          if (!!a.underline !== (want === 'u') || !!a.strikeThrough !== (want === 's')) { msgs.push(`оформление «${w}»: подч. ${!!a.underline}, зачёрк. ${!!a.strikeThrough}`); break; } } } }
    if (E.pathsRemoved !== undefined && paths.filter(p => p.removed).length !== E.pathsRemoved) msgs.push(`удалено фигур ${paths.filter(p => p.removed).length}, ждали ${E.pathsRemoved}`);
    if (E.pathsKept !== undefined && paths.filter(p => !p.removed).length !== E.pathsKept) msgs.push(`осталось фигур ${paths.filter(p => !p.removed).length}, ждали ${E.pathsKept}`);
    if (E.allRemoved && texts.some(f => !f.removed)) msgs.push('не все исходные удалены');
    if (E.keptFrames !== undefined && texts.filter(f => !f.removed).length !== E.keptFrames) msgs.push(`осталось текстов ${texts.filter(f => !f.removed).length}, ждали ${E.keptFrames}`);
    if (E.sup) { const sh = out.flatMap(t => t.chars).filter(c => c.attrs.baselineShift === 5 && c.attrs.size === 8).length; if (sh !== E.sup) msgs.push(`индексов ${sh}, ждали ${E.sup}`); }
    if (E.fli !== undefined) { const f = (t0.paraAttrs || []).slice(0, t0.contents.split('\r').length).map(a => Math.round(a.firstLineIndent || 0)); if (f.some(v => Math.abs(v - E.fli) > 1)) msgs.push(`красная строка: ${JSON.stringify(f)}`); }
    if (E.groupClipKept) { const g = frames[0], clip = g.pageItems[0]; if (clip.removed) msgs.push('обтравочный контур удалён'); }
    if (E.hiddenKept && texts.filter(f => f.hidden && f.removed).length) msgs.push('скрытый объект удалён');
    if (E.skipped !== undefined && !r.res.includes('пропущено: ' + E.skipped)) msgs.push(`в статусе нет «пропущено: ${E.skipped}»: ${r.res}`);
  }
  const u = [...new Set(msgs)].slice(0, 6);
  console.log((u.length ? '✗ ' : '✓ ') + sc.name + (u.length ? '\n    ' + u.join('\n    ') : ''));
  if (u.length) fail++;
}
console.log(`\nИз жизни: ${T.length - fail}/${T.length} сценариев без ошибок`);
