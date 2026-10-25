// Тесты режима «Авто»: деление выделения на блоки.
const H = require('./harness.js');
const { srcFrame, font, rgb } = H;
const BLACK = rgb(0,0,0), GRAY = rgb(120,120,120), BLUE = rgb(30,110,230);
const st = (size, f = 'Reg', fill = BLACK) => ({ size, textFont: font(f), fillColor: fill });
const W = (t, sz) => [...t].reduce((x, ch) => x + (ch === ' ' ? 0.3 : 0.6) * sz, 0);
function L(text, a, base, x0 = 0) { const out = []; let x = x0;
  for (const ch of text) { if (ch === ' ') { x += a.size * 0.3; continue; } out.push(srcFrame(ch, x, base, a)); x += a.size * 0.6; } return out; }
const C = (text, a, base, cx) => L(text, a, base, cx - W(text, a.size) / 2);
const body = ['Рабочая зона и кнопка не делят внимание со служебными', 'элементами. Язык, автор и донат собраны в одну тихую',
  'полосу внизу — там, где их ищут в панелях Adobe. Секции', 'повторяют панель «Свойства» и показывают состояние.'];

const T = [];
const S = (name, build, exp) => T.push({ name, build, exp });

S('Карточка «Разбор вариантов» (скриншот)', () => {
  const out = [], h = st(17, 'Bold'), s = st(15, 'Reg', GRAY), sym = st(20);
  out.push(...L('Разбор вариантов', st(28, 'Bold'), 1000, 30));
  out.push(...L('Оценка по законам UX: хорошо, компромисс, слабо', st(16, 'Reg', GRAY), 952, 30));
  const cx = [610, 790, 972];
  out.push(...L('Критерий', h, 880, 30)); ['A · Подвал', 'B · Шапка', 'C · Вкладки'].forEach((t, i) => out.push(...C(t, h, 880, cx[i])));
  const rows = [['Фокус на главном действии', 'фон Ресторфф, Фиттс'], ['Рабочие шаги видны сразу', 'Хик, когнитивная нагрузка'],
    ['Проблемы видны до сборки', 'шрифты в сводке секции'], ['Знакомо по Illustrator', 'Якоб: «Свойства», «Слои»'],
    ['Язык легко найти', 'угол/подвал — привычное место'], ['Донат не мешает работе', 'не спорит с кнопкой'],
    ['Место под рабочую зону', 'вертикаль у панели дорогая'], ['Доступность (WCAG AA)', 'контраст, фокус, 24 px цели']];
  rows.forEach(([a, b], r) => { const y = 824 - r * 88; out.push(...L(a, h, y, 30)); out.push(...L(b, s, y - 33, 30));
    cx.forEach(x => out.push(...C('●', sym, y - 16, x))); });
  out.push(...L('Итог: A · Подвал', st(22, 'Bold', BLUE), 824 - 8 * 88 - 30, 30));
  body.forEach((t, i) => out.push(...L(t, st(16), 824 - 8 * 88 - 76 - i * 32, 30)));
  return out;
}, { blocks: 1 + 4 + 8 * 4 + 1, tRows: 9, tCols: 4, kinds: { a: 1, p: 1, c: 36 } });

S('Две колонки текста рядом', () => {
  const a = st(12), out = [];
  for (let i = 0; i < 5; i++) { out.push(...L('Левая колонка текста строка ' + (i + 1), a, 500 - i * 16, 0));
                                out.push(...L('Правая колонка текста строка ' + (i + 1), a, 500 - i * 16, 260)); }
  return out;
}, { blocks: 2, kinds: { a: 2 } });

S('Заголовок над двумя колонками', () => {
  const a = st(12), out = [...L('Общий заголовок над двумя колонками текста', st(22, 'Bold'), 540, 0)];
  for (let i = 0; i < 4; i++) { out.push(...L('Левая колонка текста строка ' + (i + 1), a, 500 - i * 16, 0));
                                out.push(...L('Правая колонка текста строка ' + (i + 1), a, 500 - i * 16, 260)); }
  return out;
}, { blocks: 3, kinds: { p: 1, a: 2 } });

S('Заголовок + абзац', () => {
  const out = [...L('Заголовок раздела', st(22, 'Bold'), 600, 0)];
  body.forEach((t, i) => out.push(...L(t, st(14), 560 - i * 19, 0)));
  return out;
}, { blocks: 1, kinds: { a: 1 } });

S('Пары «метка — значение»', () => {
  const k = st(11, 'Reg', GRAY), v = st(11, 'Bold'), out = [];
  [['Кегль', '14 pt'], ['Интерлиньяж', '18,2 pt'], ['Выключка', 'влево'], ['Шрифтов', '2']].forEach(([a, b], i) => {
    out.push(...L(a, k, 500 - i * 20, 0)); out.push(...L(b, v, 500 - i * 20, 160 - W(b, 11))); });
  return out;
}, { tRows: 4, blocks: 8, kinds: { c: 8 } });

S('Афиша по центру + подпись внизу', () => {
  return [...C('БОЛЬШОЙ ЗАГОЛОВОК', st(36, 'Bold'), 800, 300), ...C('подзаголовок афиши', st(18), 760, 300),
          ...C('мелкая подпись внизу листа', st(9, 'Reg', GRAY), 200, 300)];
}, { blocks: 2, kinds: { p: 2 } });

S('Одна строка', () => L('Просто одна строка', st(16), 500), { blocks: 1, kinds: { p: 1 } });

S('Только колонка списка (заголовок + подпись), без значков', () => {
  const h = st(17, 'Bold'), s = st(15, 'Reg', GRAY), out = [...L('Критерий', h, 900, 30)];
  ['Фокус на главном действии', 'Рабочие шаги видны сразу', 'Проблемы видны до сборки', 'Знакомо по Illustrator',
   'Язык легко найти', 'Донат не мешает работе', 'Место под рабочую зону', 'Доступность (WCAG AA)'].forEach((t, r) => {
    const y = 840 - r * 88; out.push(...L(t, h, y, 30)); out.push(...L('подпись пункта номер ' + (r + 1), s, y - 33, 30)); });
  return out;
}, { blocks: 1, kinds: { p: 1 } });

S('Два раздела с большим отступом между ними', () => {
  const h = st(18, 'Bold'), a = st(12), out = [];
  let y = 900;
  out.push(...L('Раздел первый', h, y, 0)); y -= 26;
  for (let i = 0; i < 3; i++) { out.push(...L('Текст первого раздела строка длинная номер ' + i, a, y, 0)); y -= 16; }
  y -= 70;
  out.push(...L('Раздел второй', h, y, 0)); y -= 26;
  for (let i = 0; i < 3; i++) { out.push(...L('Текст второго раздела строка длинная номер ' + i, a, y, 0)); y -= 16; }
  return out;
}, { blocks: 2, kinds: { a: 2 } });

// ---------- расширенный набор ----------
// строка с буквами из произвольных позиций (для разрядки, отступов маркеров)
function LS(text, a, base, x0, track = 0, wordExtra = 0) { const out = []; let x = x0;
  for (const ch of text) { if (ch === ' ') { x += a.size * (0.3 + track + wordExtra); continue; } out.push(srcFrame(ch, x, base, a)); x += a.size * (0.6 + track); } return out; }
const para = ['Длинный абзац текста, который переносится по ширине', 'колонки и занимает несколько строк подряд, как в',
  'обычной вёрстке карточки или буклета, без отступов', 'и с последней строкой короче.'];

S('Маркированный список «•»', () => {
  const a = st(13), out = []; let y = 800;
  ['Первый пункт списка', 'Второй пункт списка подлиннее', 'Третий пункт', 'Четвёртый пункт списка'].forEach(t => {
    out.push(...L('•', a, y, 0)); out.push(...L(t, a, y, 13 * 1.0)); y -= 20; });
  return out;
}, { blocks: 1, kinds: { p: 1 }, list: 4 });

S('Нумерованный список с висячим отступом 1,4 em', () => {
  const a = st(13), out = []; let y = 800;
  ['Первый шаг инструкции', 'Второй шаг инструкции', 'Третий шаг', 'Четвёртый шаг инструкции'].forEach((t, i) => {
    out.push(...L((i + 1) + '.', a, y, 0)); out.push(...L(t, a, y, 13 * 2.6)); y -= 20; });
  return out;
}, { blocks: 1, kinds: { p: 1 }, list: 4 });

S('Прайс: название слева, цена справа', () => {
  const a = st(12), b = st(12, 'Bold'), out = []; let y = 800;
  [['Капучино', '250 ₽'], ['Латте большой', '290 ₽'], ['Американо', '180 ₽'], ['Раф ванильный', '320 ₽']].forEach(([n, p]) => {
    out.push(...L(n, a, y, 0)); out.push(...L(p, b, y, 300 - W(p, 12))); y -= 22; });
  return out;
}, { tRows: 4, tCols: 2, blocks: 8, kinds: { c: 8 } });

S('Документ: заголовок, абзац, таблица, абзац', () => {
  const out = [...L('Заголовок документа', st(22, 'Bold'), 1000, 0)];
  para.forEach((t, i) => out.push(...L(t, st(12), 962 - i * 16, 0)));
  let y = 880;
  [['Параметр', 'Значение'], ['Ширина', '120 мм'], ['Высота', '80 мм']].forEach(([k, v], i) => {
    out.push(...L(k, st(12, i ? 'Reg' : 'Bold'), y, 0)); out.push(...L(v, st(12, i ? 'Reg' : 'Bold'), y, 250)); y -= 20; });
  para.forEach((t, i) => out.push(...L(t, st(12), 790 - i * 16, 0)));
  return out;
}, { blocks: 1 + 6 + 1, tRows: 3, tCols: 2, kinds: { a: 2, c: 6 } });

S('Абзац по ширине с растянутой строкой (пробелы 1,5 em)', () => {
  const a = st(12), out = []; let y = 800;
  const lines = ['Длинный абзац текста, который переносится по ширине', 'колонки   и   занимает   строки', 'обычной вёрстке карточки или буклета, без отступов', 'и с последней строкой короче.'];
  const target = W(lines[0], 12);
  lines.forEach((t, i) => {
    let extra = 0;
    if (i === 1) { t = t.replace(/ +/g, ' '); const sp = (t.match(/ /g) || []).length, base = W(t, 12); extra = (target - base) / sp / 12; }
    out.push(...LS(t, a, y, 0, 0, extra)); y -= 16; });
  return out;
}, { blocks: 1, kinds: { a: 1 } });

S('Заголовок с разрядкой 0,5 em', () => {
  const out = [...LS('СКЛЕЙКА ТЕКСТА ДЛЯ ВСЕХ', st(20, 'Bold'), 800, 0, 0.5)];
  para.forEach((t, i) => out.push(...L(t, st(12), 760 - i * 16, 0)));
  return out;
}, { blocks: 1, kinds: { a: 1 } });

S('Две колонки + подвал на всю ширину', () => {
  const a = st(12), out = [];
  for (let i = 0; i < 5; i++) { out.push(...L('Левая колонка текста строка ' + (i + 1), a, 800 - i * 16, 0));
    if (i < 3) out.push(...L('Правая колонка текста строка ' + (i + 1), a, 800 - i * 16, 260)); }
  out.push(...L('Подвал документа на всю ширину страницы, мелкий текст сноски внизу', st(9, 'Reg', GRAY), 620, 0));
  return out;
}, { blocks: 3, kinds: { a: 2, p: 1 } });

S('Абзац по центру в несколько строк', () => {
  const a = st(14), out = [];
  ['Центрированный абзац текста в три', 'строки, переносится по ширине рамки', 'и стоит по центру'].forEach((t, i) => out.push(...C(t, a, 800 - i * 19, 300)));
  return out;
}, { blocks: 1, kinds: { a: 1 } });

S('Визитка: имя, должность, контакты слева и сайт справа', () => {
  const out = [...L('Денис Лампусов', st(20, 'Bold'), 300, 20), ...L('дизайнер интерфейсов', st(11, 'Reg', GRAY), 278, 20)];
  out.push(...L('+7 900 000-00-00', st(10), 120, 20), ...L('mail@example.ru', st(10), 106, 20));
  out.push(...L('example.ru', st(10, 'Bold'), 106, 300 - W('example.ru', 10)));
  return out;
}, { blocks: 4 });

S('Основной текст и сноска далеко внизу', () => {
  const out = [];
  para.forEach((t, i) => out.push(...L(t, st(12), 800 - i * 16, 0)));
  out.push(...L('* Сноска мелким кеглем внизу страницы', st(8, 'Reg', GRAY), 600, 0));
  return out;
}, { blocks: 2, kinds: { a: 1, p: 1 } });

S('Цитата с отступом внутри текста', () => {
  const out = [];
  para.forEach((t, i) => out.push(...L(t, st(12), 900 - i * 16, 0)));
  ['«Цитата с отступом слева, набранная', 'курсивом и стоящая между абзацами»'].forEach((t, i) => out.push(...L(t, st(12, 'Italic'), 820 - i * 16, 40)));
  para.forEach((t, i) => out.push(...L(t, st(12), 772 - i * 16, 0)));
  return out;
}, { blocks: 3 });

S('Заголовок по центру над абзацем влево', () => {
  const out = [...C('Заголовок по центру', st(20, 'Bold'), 820, W(para[0], 12) / 2)];
  para.forEach((t, i) => out.push(...L(t, st(12), 790 - i * 16, 0)));
  return out;
}, { blocks: 1, kinds: { a: 1 }, justs: [['CENTER', 'LEFT']] });

S('Абзацы с красной строкой 1,5 em', () => {
  const a = st(12), out = []; let y = 800;
  const txt = [['Первый абзац начинается с отступа', 'и продолжается обычными строками без', 'отступа до самого конца.'],
               ['Второй абзац тоже с красной строки', 'и тоже в несколько строк подряд.']];
  txt.forEach(pp => pp.forEach((t, i) => { out.push(...L(t, a, y, i === 0 ? 18 : 0)); y -= 16; }));
  return out;
}, { blocks: 1, kinds: { a: 1 }, fli: 18 });

let fail = 0;
for (const sc of T) {
  const frames = sc.build(), msgs = [];
  const srcChars = frames.map(f => f.contents).join('').replace(/\s/g, '').split('').sort().join('');
  const r = H.run(frames, { mode: 'auto', track: true, hyph: false, del: true, gap: 0.12, para: 1.35, col: 1.2, lang: 'ru' });
  if (!r.res.startsWith('OK:')) msgs.push(r.res);
  else {
    const out = r.created.map(t => t.contents).join('').replace(/[\s\u0003]/g, '').split('').sort().join('');
    if (out !== srcChars) msgs.push('буквы потеряны или добавлены');
    if (r.junk) msgs.push(`оставлены лишние объекты: ${r.junk}`);
    if (r.created.length !== sc.exp.blocks) msgs.push(`текстов ${r.created.length}, ждали ${sc.exp.blocks}`);
    if (r.ana.blocks.length !== sc.exp.blocks) msgs.push(`анализ: блоков ${r.ana.blocks.length}`);
    if (sc.exp.tRows !== undefined && r.ana.tRows !== sc.exp.tRows) msgs.push(`строк таблицы ${r.ana.tRows}, ждали ${sc.exp.tRows}`);
    if (sc.exp.tCols !== undefined && r.ana.tCols !== sc.exp.tCols) msgs.push(`колонок ${r.ana.tCols}, ждали ${sc.exp.tCols}`);
    const kinds = {}; r.ana.blocks.forEach(b => kinds[b.k] = (kinds[b.k] || 0) + 1);
    if (sc.exp.list !== undefined) { const t = r.created[0], ps = t.contents.split('\r');
      const items = ps.filter(x => /^\S{1,4}\t/.test(x)).length;
      const pa = t.paraAttrs.slice(0, ps.length), hang = pa.filter(a => (a.leftIndent || 0) > 0 && (a.firstLineIndent || 0) < 0).length;
      if (items !== sc.exp.list || hang !== sc.exp.list) msgs.push(`список: пунктов с табуляцией ${items}, с висячим отступом ${hang}, ждали ${sc.exp.list}`); }
    if (sc.exp.justs) sc.exp.justs.forEach((js, bi) => { const t = r.created[bi]; if (!t) return;
      js.forEach((j, pi) => { const got = (t.paraAttrs[pi] || {}).justification; if (got !== j) msgs.push(`абзац ${pi + 1}: выключка ${got}, ждали ${j}`); }); });
    if (sc.exp.fli !== undefined) { const t = r.created[0], f = (t.paraAttrs || []).map(a => Math.round(a.firstLineIndent || 0));
      if (!f.length || f.some(v => Math.abs(v - sc.exp.fli) > 1)) msgs.push(`красная строка: ${JSON.stringify(f)}, ждали ${sc.exp.fli}`); }
    for (const k in sc.exp.kinds) if (kinds[k] !== sc.exp.kinds[k]) msgs.push(`вид ${k}: ${kinds[k] || 0}, ждали ${sc.exp.kinds[k]} (${JSON.stringify(kinds)})`);
    // базовые линии точечных текстов совпадают с исходником
    const srcLines = {}; frames.forEach(f => { const y = f.anchor[1]; (srcLines[y] = srcLines[y] || []).push(f); });
    r.created.filter(t => t.kind === 'POINTTEXT').forEach(t => H.layout(t).forEach(l => {
      if (!l.text) return;
      const ys = frames.filter(f => l.text.includes(f.contents)).map(f => f.anchor[1]);
      if (ys.length && !ys.some(y => Math.abs(y - l.y) < 0.35)) msgs.push(`«${l.text}» встала на ${l.y.toFixed(1)}`);
    }));
  }
  const u = [...new Set(msgs)].slice(0, 6);
  console.log((u.length ? '✗ ' : '✓ ') + sc.name + (u.length ? '\n    ' + u.join('\n    ') : ''));
  if (u.length) fail++;
}
{
  const sc = T[0], fr = sc.build();
  const p = H.analyzeOnly(fr, { mode: 'auto', preview: true, gap: 0.12, para: 1.35, col: 1.2, lang: 'ru' });
  const ok = p.preview && p.preview.rects.length === sc.exp.blocks && p.preview.locked && !p.preview.printable && p.cleared && p.doc.activeLayer.name === 'Layer 1';
  console.log((ok ? '✓ ' : '✗ ') + 'Рамки блоков на артборде: ' + (p.preview ? p.preview.rects.length : 0) + ' шт., слой убран: ' + p.cleared);
  if (!ok) fail++;
  const r = H.run(sc.build(), { mode: 'auto', preview: true, del: true, gap: 0.12, para: 1.35, col: 1.2, lang: 'ru' });
  const ok2 = !r.doc.layers.some(l => l.name === 'String Glue preview');
  console.log((ok2 ? '✓ ' : '✗ ') + 'Рамки убираются при склейке');
  if (!ok2) fail++;
}
console.log(`\nАвто: ${T.length + 2 - fail}/${T.length + 2} проверок без ошибок`);

// пунктир рамок: штрихи начинаются в углах, у значков — сплошная рамка
{
  const p = H.analyzeOnly(T[0].build(), { mode: 'auto', preview: true, gap: 0.12, para: 1.35, col: 1.2, lang: 'ru' });
  let bad = 0;
  p.preview.rects.forEach(g => g.paths.forEach(q => {
    const len = Math.abs(q.pts[1][0] - q.pts[0][0]) + Math.abs(q.pts[1][1] - q.pts[0][1]);
    if (q.strokeDashes) { const [d, gp] = q.strokeDashes, n = Math.round((len + gp) / (d + gp));
      if (Math.abs(n * d + (n - 1) * gp - len) > 0.01 || d < 2 || d > 4.5) bad++; }
    if (q.strokeWidth !== 0.75) bad++;
  }));
  const tinySolid = p.preview.rects.filter(g => g.paths.every(q => !q.strokeDashes)).length;
  const okTiny = tinySolid === 24; if (!okTiny) bad++;
  console.log((bad ? '✗ ' : '✓ ') + `Пунктир: стороны кратны штриху, штрих 2–4,5 pt, сплошных (только значки) ${tinySolid} из 24`);
}
