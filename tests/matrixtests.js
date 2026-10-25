// Перебор: размеры рамок, кегль, интерлиньяж, отбивки, пустые абзацы — и наложение текстовых блоков друг на друга.
// Каждый случай гоняется тремя путями: обычный разбор, «живой Illustrator» (оформление копии не читается,
// номера абзацев сбиваются на пустых), запасной разбор (копии не создаются).
const H = require('./harness.js');
const { font, rgb, areaText, pointText } = H;
const BLACK = rgb(0, 0, 0), GRAY = rgb(110, 110, 110);
const st = (size, f = 'Reg', fill = BLACK) => ({ size, textFont: font(f), fillColor: fill });
const adv = (t, sz) => [...t].reduce((x, ch) => x + (ch === ' ' ? 0.3 : 0.6) * sz, 0);
const WORDS = ('Mineralne wsparcie przypominające naturalne szkliwo przeznaczone do rutyn pielęgnacyjnych ukierunkowanych ' +
  'na odbudowę oraz rekomendacji dla osób z nadwrażliwością oczyszczanie oparte na działaniu enzymów').split(' ');
const SYL = ['ka', 'mo', 'ri', 'le', 'su', 'na', 'pę', 'dzi', 'ło', 'wa', 'te', 'ść'];
// уникальные «слова» разной длины, чтобы строки разных карточек не совпадали
const word = i => { let w = '', k = i * 7 + 3; const n = 2 + (i % 4); for (let j = 0; j < n; j++) { w += SYL[k % SYL.length]; k = Math.floor(k / SYL.length) + j * 5 + i; } return w; };
const words = (n, from = 0) => Array.from({ length: n }, (_, i) => word(from * 13 + i)).join(' ');
// перенос по ширине рамки в модели ширины стенда (буква 0,6 кегля, пробел 0,3)
function wrap(text, width, size) {
  const out = []; let cur = '';
  for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && adv(t, size) > width) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}
// карточки: [заголовок, абзац] × n, между карточками пустые абзацы-распорки
function cardsFrame(o) {
  const paras = [], spacers = [];
  for (let c = 0; c < o.cards; c++) {
    if (c) for (let e = 0; e < o.empties; e++) { paras.push({ lines: [''], attrs: st(o.body), leading: o.emptyLead }); spacers.push(paras.length - 1); }
    paras.push({ lines: wrap(words(o.headWords, c * 3 + (o.seed || 0) * 40).toUpperCase(), o.width, o.head), attrs: st(o.head, 'Bold'), leading: +(o.head * o.lr).toFixed(2), head: true });
    paras.push({ lines: wrap(words(o.bodyWords, c * 5 + 2 + (o.seed || 0) * 40), o.width, o.body), attrs: st(o.body, 'Reg', GRAY), leading: +(o.body * o.lr).toFixed(2), spaceBefore: o.sb });
  }
  const f = areaText(paras, { left: o.x || 0, top: o.top || 900, width: o.width, height: 2000 });
  paras.forEach((p, i) => { if (p.head) f.paraAttrs[i].spaceAfter = o.sa; });
  f.srcParas = paras.filter(p => p.lines.join('')).map(p => p.lines.join(' '));
  return f;
}

// все видимые строки исходного текста в области: текст, базовая линия, расстояние от предыдущей видимой строки
function srcLines(f) {
  const lines = []; let cur = [], ps = true, pi = 0;
  f.chars.forEach((c, i) => { const br = c.contents === '\r', wr = f.wraps && f.wraps.has(i);
    if (br || wr) { cur.push(c); lines.push({ chars: cur, ps, pi }); cur = []; ps = br; if (br) pi++; } else cur.push(c); });
  lines.push({ chars: cur, ps, pi });
  const first = f.chars.find(c => c.contents.trim()); let y = f.textPath.top - first.attrs.size * 0.8, prev = null; const out = [];
  lines.forEach((L, i) => {
    if (i > 0) { y -= Math.max(...L.chars.map(c => c.attrs.autoLeading ? c.attrs.size * 1.2 : c.attrs.leading));
      if (L.ps) y -= (f.paraAttrs[L.pi].spaceBefore || 0) + (f.paraAttrs[L.pi - 1].spaceAfter || 0); }
    const txt = norm(L.chars.map(c => c.contents).join(''));
    if (txt) { out.push({ text: txt, y, gap: prev === null ? null : prev - y, ps: L.ps }); prev = y; }
  });
  return out;
}
const styleOf = c => c.attrs.textFont.name + '/' + c.attrs.size + '/' + JSON.stringify(c.attrs.fillColor);
const visChars = cs => cs.filter(c => /^[^\s\u0003]$/.test(c.contents));
const norm = t => t.replace(/[\s\u0003\r]+/g, ' ').trim();

const PATHS = [['обычный', {}], ['живой', { live: true, skipEmpty: true }], ['запасной', { noDup: true, skipEmpty: true }]];
let total = 0, fail = 0;
function check(name, build, exp = {}) {
  for (const [pn, env] of PATHS) {
    total++;
    const frames = build(), msgs = [];
    const srcStyle = frames.flatMap(f => visChars(f.chars)).map(c => c.contents + styleOf(c)).sort().join('|');
    const r = H.run(frames, { mode: 'auto', track: true, hyph: false, del: true, gap: 0.12, para: 1.35, col: 1.2, lang: 'ru' }, env);
    if (!r.res.startsWith('OK:')) msgs.push(r.res);
    else {
      const out = r.created;
      if (r.junk) msgs.push('оставлены лишние объекты: ' + r.junk);
      if (frames.some(f => !f.removed)) msgs.push('не все исходные удалены');
      const os = out.flatMap(t => visChars(t.chars)).map(c => c.contents + styleOf(c)).sort().join('|');
      if (os !== srcStyle) msgs.push('буквы или оформление не совпадают');
      // каждый исходный абзац целиком лежит в одном результате — тексты не перемешаны
      const outText = out.map(t => norm(t.contents));
      frames.forEach(f => (f.srcParas || []).forEach(p => { if (!outText.some(t => t.includes(norm(p)))) msgs.push('абзац разорван или перемешан: «' + p.slice(0, 40) + '»'); }));
      if (exp.gaps) { // строки на своих местах: у точечного текста — базовые линии, у текста в области — первая строка и зазоры абзацев
        const src = srcLines(frames[0]), used = new Set();
        const find = t => { const k = src.findIndex((x, i) => !used.has(i) && norm(t).startsWith(x.text.slice(0, 24))); if (k >= 0) used.add(k); return src[k]; };
        out.forEach(t => H.layout(t).forEach((l, i, a) => { if (!norm(l.text)) return; const sl = find(l.text);
          if (!sl) { msgs.push('строка не найдена в исходнике: «' + l.text.slice(0, 30) + '»'); return; }
          if (t.kind === 'POINTTEXT' || i === 0) { if (Math.abs(sl.y - l.y) > 0.35) msgs.push(`«${l.text.slice(0, 20)}» на ${l.y.toFixed(2)}, в исходнике ${sl.y.toFixed(2)}`); }
          else if (Math.abs(sl.gap - (a[i - 1].y - l.y)) > 0.35) msgs.push(`зазор перед «${l.text.slice(0, 20)}» ${(a[i - 1].y - l.y).toFixed(2)}, в исходнике ${sl.gap.toFixed(2)}`); }));
        out.filter(t => t.kind === 'AREATEXT').forEach(t => { const R = t.textPath; if (Math.abs(R.left - frames[0].textPath.left) > 0.01 || Math.abs(R.width - frames[0].textPath.width) > 0.01) msgs.push(`рамка ${R.left}/${R.width.toFixed(1)}, ждали ${frames[0].textPath.left}/${frames[0].textPath.width}`); });
      }
    }
    const u = [...new Set(msgs)].slice(0, 4);
    if (u.length) { fail++; console.log('✗ ' + name + ' [' + pn + ']\n    ' + u.join('\n    ')); }
  }
}

// ---------- перебор размеров ----------
const widths = [110, 180, 260, 420], sizes = [[7, 6], [9, 8], [13, 13], [16, 12], [24, 14], [36, 16], [48, 18]];
const leads = [1.15, 1.5], seps = [[0, 0, 0, 12], [6, 0, 1, 9], [0, 8, 2, 14], [4, 4, 3, 30]];
let n = 0;
for (const width of widths) for (const [head, body] of sizes) for (const lr of leads) for (const [sb, sa, empties, emptyLead] of seps) {
  if (Array.from({ length: 40 }, (_, i) => word(i)).some(w => adv(w.toUpperCase(), head) > width)) continue; // слово шире рамки — так в Illustrator не бывает
  n++;
  const o = { width, head, body, lr, sb, sa, empties, emptyLead, cards: 2, headWords: 2, bodyWords: 9 + (n % 7) };
  check(`ширина ${width}, кегль ${head}/${body}, интерлиньяж ×${lr}, отбивки ${sb}/${sa}, пустых ${empties}×${emptyLead}`, () => [cardsFrame(o)], { gaps: true });
}

// ---------- наложения ----------
const OV = {};
const A = (o) => cardsFrame(Object.assign({ cards: 1, head: 14, body: 11, lr: 1.4, sb: 4, sa: 0, empties: 0, emptyLead: 0, headWords: 2, bodyWords: 14 }, o));
check('Рамки накладываются пустыми краями (вторая рамка начинается внутри высокой первой)', () => {
  const a = A({ width: 240, top: 900 }), b = A({ width: 240, top: 790, seed: 1 }); a.textPath.height = 400; return [a, b]; });
check('Длинная рамка уходит под соседнюю колонку, но текст в ней короткий', OV.long = () => {
  const a = A({ width: 200, top: 900, x: 0 }); a.textPath.width = 520; const b = A({ width: 220, top: 900, x: 260, seed: 1 }); return [a, b]; });
check('Колонки внахлёст: правая рамка начинается на 20 pt левее конца левой', OV.cols = () => [A({ width: 240, x: 0 }), A({ width: 240, x: 220, bodyWords: 18, seed: 1 })]);
check('Подпись точечным текстом поверх абзаца', () => {
  const a = A({ width: 300, top: 900, bodyWords: 30 }); const p = pointText([{ lines: ['НОВИНКА'], attrs: st(20, 'Bold') }], 120, 860);
  p.srcParas = ['НОВИНКА']; return [a, p]; });
check('Строки двух текстов перемежаются (второй сдвинут на половину интерлиньяжа)', () => [A({ width: 260, top: 900 }), A({ width: 260, top: 892.3, x: 6, seed: 1 })]);
check('Один текст целиком внутри рамки другого (вложенные блоки)', () => {
  const a = A({ width: 400, top: 900, bodyWords: 40 }); const b = A({ width: 150, top: 820, x: 120, head: 9, body: 8, seed: 1 }); return [a, b]; });
check('Мелкий и крупный текст накладываются: сноска 6 pt на заголовке 48 pt', () => {
  const a = A({ width: 400, head: 48, body: 18, bodyWords: 8 }); const b = A({ width: 200, head: 7, body: 6, top: 880, x: 100, seed: 1 }); return [a, b]; });

console.log(`\nПеребор и наложения: ${total - fail}/${total} прогонов без ошибок (${n} сочетаний размеров × 3 пути + наложения)`);

// ---------- сетка карточек (скриншот 25.10): четыре текста в области 2×2 ----------
// каждый готовый текст — свой блок; соседние колонки не складываются в таблицу по общим базовым линиям
function grid(cols, rows, o = {}) {
  const out = []; let s = 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const f = cardsFrame(Object.assign({ cards: 1, head: 14, body: 12, lr: 1.4, sb: 6, sa: 0, empties: 0, emptyLead: 0, headWords: 2, bodyWords: 18 + (r * cols + c) * 5,
      width: (o.widths || [])[r * cols + c] || 210, x: c * 250, top: 900 - r * (o.rowStep || 330), seed: s++ }, o));
    if (o.fit) f.textPath.height = 900 - r * (o.rowStep || 330) - Math.min(...srcLines(f).map(l => l.y)) + 8;
    out.push(f);
  }
  return out;
}
function checkGrid(name, build, blocks, kinds) {
  for (const [pn, env] of PATHS) {
    total++;
    const msgs = [], fr = build();
    const a = H.analyzeOnly(fr, { mode: 'auto', gap: 0.12, para: 1.35, col: 1.2, lang: 'ru' }).ana;
    if (!a.blocks || a.blocks.length !== blocks || a.tRows) msgs.push(`анализ: блоков ${a.blocks && a.blocks.length}, таблица ${a.tRows}×${a.tCols}, ждали ${blocks} без таблицы`);
    if (!a.fonts) msgs.push('анализ: шрифтов 0');
    if (kinds) { const k = {}; (a.blocks || []).forEach(b => k[b.k] = (k[b.k] || 0) + 1); for (const x in kinds) if (k[x] !== kinds[x]) msgs.push(`анализ: вид ${x} — ${k[x] || 0}, ждали ${kinds[x]} (${JSON.stringify(k)})`); }
    const fr2 = build(), r = H.run(fr2, { mode: 'auto', track: true, del: true, gap: 0.12, para: 1.35, col: 1.2, lang: 'ru' }, env);
    if (!r.res.startsWith('OK:')) msgs.push(r.res);
    else {
      if (r.created.length !== blocks) msgs.push(`текстов ${r.created.length}, ждали ${blocks}`);
      const outText = r.created.map(t => norm(t.contents));
      fr2.filter(f => f.srcParas && f.kind === 'AREATEXT').forEach(f => { if (!outText.some(t => t.includes(norm(f.srcParas.join(' '))))) msgs.push('текст рамки не собран целиком: «' + f.srcParas[0].slice(0, 30) + '»'); });
    }
    const u = [...new Set(msgs)].slice(0, 4);
    if (u.length) { fail++; console.log('✗ ' + name + ' [' + pn + ']\n    ' + u.join('\n    ')); }
  }
}
checkGrid('Сетка 2×2 карточек', () => grid(2, 2), 4);
checkGrid('Сетка 3×1, колонки с зазором 40 pt', () => grid(3, 1), 3);
checkGrid('Сетка 2×2, кегль 9, узкий зазор между колонками 12 pt', () => grid(2, 2, { head: 10, body: 9, width: 238 }), 4);
// скриншот 25.10, вторая сетка: строки заметно короче рамки (перенос по рамке шире текста),
// маленький отдельный текст на уровне заголовка третьей карточки — не должен утянуть заголовок в «таблицу»
checkGrid('Сетка 2×2: строки короче рамки и мелкий текст у заголовка', () => {
  const g = grid(2, 2);
  g.forEach(f => { const P = f.srcParas; f.textPath.width += 70; });
  const t = pointText([{ lines: ['•'], attrs: st(8) }], 190, 900 - 330 - 11.2); t.srcParas = ['•'];
  return [...g, t];
}, 5, { a: 4, p: 1 });
checkGrid('Сетка 2×2: мелкий текст справа от рамки на уровне заголовка', () => {
  const g = grid(2, 2); const t = pointText([{ lines: ['•'], attrs: st(8) }], 222, 900 - 330 - 11.2); t.srcParas = ['•'];
  return [...g, t];
}, 5, { a: 4, p: 1 });
// скриншот 25.10: сетка 2×2, рамки по размеру текста, ряды близко, у нижних карточек рамки уже —
// четыре текста, ни одна карточка не склеивается с соседней по колонке
checkGrid('Сетка 2×2: рамки по тексту, ряды близко, нижние рамки уже', () => grid(2, 2, { fit: true, rowStep: 200, widths: [230, 210, 200, 210] }), 4, { a: 4 });
checkGrid('Сетка 2×2: рамки одной ширины, ряды близко', () => grid(2, 2, { fit: true, rowStep: 200 }), 4, { a: 4 });
// скриншот 25.10 (колонка у схемы): три рамки разной ширины столбиком, вплотную — каждая остаётся своим текстом,
// переносы не меняются (общая рамка шире заставила бы текст переноситься иначе)
checkGrid('Столбец из трёх рамок разной ширины, вплотную', () => grid(1, 3, { fit: true, rowStep: 170, widths: [230, 215, 230] }), 3, { a: 3 });
checkGrid('Столбец из трёх рамок одной ширины, вплотную — склеиваются', () => grid(1, 3, { fit: true, rowStep: 170 }), 1, { a: 1 });
console.log(`Сетки: итого ${total - fail}/${total}`);
