// Мини-имитация объектной модели Illustrator для прогона host.jsx в Node.
const fs = require('fs'), vm = require('vm');
const LEFTOVERS = [];
let NODUP = false;   // env.noDup: копии текста не создаются — проверка запасного разбора
const HOST = process.argv[2] || require('path').join(__dirname, '..', 'stringglue', 'jsx', 'host.jsx');

const ENUMS = {
  Justification: { LEFT: 'LEFT', CENTER: 'CENTER', RIGHT: 'RIGHT' },
  TextType: { POINTTEXT: 'POINTTEXT', AREATEXT: 'AREATEXT', PATHTEXT: 'PATHTEXT' },
  TextOrientation: { HORIZONTAL: 'H', VERTICAL: 'V' },
  FirstBaselineType: { FIXED: 'FIXED' },
  ElementPlacement: { PLACEBEFORE: 'PLACEBEFORE', PLACEATBEGINNING: 'PLACEATBEGINNING' },
  AutoKernType: { AUTO: 'AUTO', METRICSROMANONLY: 'MRO' },
};

const font = n => ({ name: n });
const rgb = (r, g, b) => ({ typename: 'RGBColor', red: r, green: g, blue: b });
const NOCOLOR = { typename: 'NoColor' };

function baseAttrs(o) {
  return Object.assign({ textFont: font('Reg'), size: 12, fillColor: rgb(0, 0, 0), strokeColor: NOCOLOR, strokeWeight: 1,
    horizontalScale: 100, verticalScale: 100, baselineShift: 0, tracking: 0, leading: 14.4, autoLeading: true }, o);
}

// ---- текстовый фрейм с символами ----
function makeChars(frame) {
  // range object over frame.chars [start, start+len)
  function range(start, len) {
    const r = { characterOffset: start };
    let L = len;
    Object.defineProperty(r, 'length', { get: () => L, set: v => { L = Math.min(v, frame.chars.length - start); } });
    Object.defineProperty(r, 'contents', { get: () => frame.chars.slice(start, start + L).map(c => c.contents).join('') });
    Object.defineProperty(r, 'characterAttributes', { get: () => attrProxy(() => frame.chars.slice(start, start + L)) });
    // атрибуты абзаца, в котором стоит начало диапазона (возврат каретки принадлежит абзацу, который он закрывает)
    Object.defineProperty(r, 'paragraphAttributes', { get: () => { let pi = 0; for (let i = 0; i < start; i++) if (frame.chars[i].contents === '\r') pi++;
      return frame.paraAttrs[pi] || (frame.paraAttrs[pi] = {}); } });
    r.remove = () => {
      // атрибуты абзаца хранятся в его конце: удалённые возвраты каретки уносят атрибуты своих абзацев
      let pi = 0; for (let i = 0; i < start; i++) if (frame.chars[i].contents === '\r') pi++;
      const k = frame.chars.slice(start, start + L).filter(c => c.contents === '\r').length;
      if (k && frame.paraAttrs.length) frame.paraAttrs.splice(pi, k);
      frame.chars.splice(start, L);
    };
    return r;
  }
  function attrProxy(get) {
    return new Proxy({}, {
      // как в Illustrator: у пустого диапазона (пустой абзац) атрибуты не читаются и не пишутся
      get: (_, k) => { if (frame.badAttrs) throw new Error('No such element'); const cs = get(); if (!cs.length) throw new Error('the value would result in an illegal text range'); return cs[0].attrs[k]; },
      set: (_, k, v) => { const cs = get(); if (!cs.length) throw new Error('the value would result in an illegal text range'); cs.forEach(c => { c.attrs[k] = v; }); return true; },
    });
  }
  const charsView = new Proxy([], {
    get: (_, k) => {
      if (k === 'length') return frame.chars.length;
      if (typeof k === 'string' && /^\d+$/.test(k)) { const i = +k; return i < frame.chars.length ? range(i, 1) : undefined; }
      return undefined;
    },
  });
  frame.textRange = {
    get characters() { return charsView; },
    get characterAttributes() { return attrProxy(() => frame.chars); },
  };
  Object.defineProperty(frame, 'paragraphs', { get: () => {
    const out = []; let s = 0, pn = 0;
    for (let i = 0; i <= frame.chars.length; i++) {
      if (i === frame.chars.length || frame.chars[i].contents === '\r') {
        const a = s, b = i;   // как в Illustrator: диапазон абзаца без завершающего \r, у пустого абзаца он пустой
        const pa = frame.paraAttrs[pn] || (frame.paraAttrs[pn] = {}); pn++;
        if (!(SKIPEMPTY && a === b)) out.push({ characterAttributes: attrProxy(() => frame.chars.slice(a, b)), paragraphAttributes: pa, contents: frame.chars.slice(a, b).map(c => c.contents).join('') });
        s = i + 1;
      }
    }
    return out;
  } });
}

// env.live: ведём себя как живой Illustrator 25.10 — у сконвертированной копии оформление не читается,
// а convertAreaObjectToPointObject оставляет исходную копию и возвращает новый объект
let LIVE = false;
// env.skipEmpty: коллекция paragraphs не содержит пустых абзацев — номера абзацев не совпадают с числом возвратов каретки
let SKIPEMPTY = false;
let ETXPARA = false;
function newFrame(kind, extra) {
  const f = Object.assign({ typename: 'TextFrame', kind, chars: [], paraAttrs: [], removed: false, hidden: false, name: '', story: { textFrames: { length: 1 } },
    remove() { if (this.dead) throw new Error('No such element'); this.removed = true; }, move(to, how) { this.placedIn = to; this.placedAt = how; },
    duplicate() { if (NODUP) throw new Error('the value would result in an illegal text range'); const d = newFrame(this.kind, { dyn: this.dyn, anchor: this.anchor && this.anchor.slice(), textPath: this.textPath && Object.assign({}, this.textPath),
        wraps: this.wraps && new Set(this.wraps), layer: this.layer, parent: this.parent, name: this.name, badAttrs: this.badAttrs });
      d.paraAttrs = this.paraAttrs.map(a => Object.assign({}, a));
      d.chars = this.chars.map(c => ({ contents: c.contents, attrs: Object.assign({}, c.attrs) }));
      if (this.kind === 'AREATEXT') d.convertAreaObjectToPointObject = () => convertArea(d);
      d.createOutline = () => { const g = { typename: 'GroupItem', geometricBounds: [0, 0, 1, 1], remove() { g.removed = true; } }; LEFTOVERS.push(g); d.removed = true; return g; };
      LEFTOVERS.push(d); if (this.layer && this.layer.all) this.layer.all.push(d); return d; } }, extra);
  Object.defineProperty(f, 'lines', { get: () => {
    if (f.wraps) return visualLines(f).map(t => ({ contents: t, characters: { length: t.length } }));
    const n = f.contents.split(/[\r\u0003]/).length; return Array.from({ length: n }, () => ({ characters: { length: 1e6 } })); } });
  if (extra && extra.dyn) Object.defineProperty(f, 'geometricBounds', { get: () => dynBounds(f) });
  Object.defineProperty(f, 'contents', {
    get: () => f.chars.map(c => c.contents).join(''),
    // как в Illustrator: записанный "\n" — принудительный разрыв строки, читается обратно как \u0003;
    // env.etxPara: записанный \u0003 становится концом абзаца (проверка, что плагин так не пишет)
    set: v => { f.chars = [...v].map(ch => ({ contents: ch === '\n' ? '\u0003' : (ch === '\u0003' && ETXPARA ? '\r' : ch), attrs: baseAttrs() })); },
  });
  makeChars(f);
  return f;
}

// ---- геометрия готового текста (та же модель ширины, что и у исходных букв: буква 0,6 кегля, пробел 0,3) ----
const adv = c => (c.contents === ' ' ? 0.3 : (c.contents === '\t' ? 0.3 : 0.6)) * c.attrs.size;
function pointLines(f) {
  const out = []; let cur = [], pIdx = 0, paraStart = true;
  f.chars.forEach(c => { if (c.contents === '\r' || c.contents === '\u0003') { out.push({ chars: cur, pIdx, paraStart }); paraStart = c.contents === '\r'; if (paraStart) pIdx++; cur = []; } else cur.push(c); });
  out.push({ chars: cur, pIdx, paraStart });
  return out;
}
function dynBounds(f) {
  if (f.kind === 'AREATEXT') { const r = f.textPath; return [r.left, r.top, r.left + r.width, r.top - r.height]; }
  const lines = pointLines(f); let l = 1e9, r = -1e9, y = f.anchor[1], top = null, bot = y;
  lines.forEach((L, i) => {
    const pa = f.paraAttrs[L.pIdx] || {}, vis = L.chars, size = Math.max(1, ...vis.map(c => c.attrs.size));
    if (i > 0) y -= Math.max(...(vis.length ? vis : [{ attrs: { leading: 14.4, autoLeading: false, size: 12 } }]).map(c => c.attrs.autoLeading ? c.attrs.size * 1.2 : c.attrs.leading)) + (L.paraStart ? (pa.spaceBefore || 0) : 0);
    if (!vis.length) return;
    const w = vis.reduce((s, c) => s + adv(c), 0) - 0.05 * size, j = pa.justification || 'LEFT';
    let x = f.anchor[0];
    if (j === 'LEFT') x += (pa.leftIndent || 0) + (L.paraStart ? (pa.firstLineIndent || 0) : 0);
    if (j === 'CENTER') x -= w / 2;
    if (j === 'RIGHT') x -= w;
    l = Math.min(l, x); r = Math.max(r, x + w);
    if (top === null) top = y + size * 0.75; bot = y - size * 0.2;
  });
  return [l, top === null ? f.anchor[1] : top, r, bot];
}
function visualLines(f) {
  const out = []; let cur = '';
  f.chars.forEach((c, i) => { if (c.contents === '\r') { out.push(cur); cur = ''; } else if (f.wraps.has(i)) { cur += c.contents; out.push(cur); cur = ''; } else cur += c.contents; });
  out.push(cur); return out;
}
// текст в области → точечный: переносы становятся абзацами, точка привязки — первая базовая линия
function convertArea(d) {
  let t = d;
  if (LIVE) {   // как в живом Illustrator: возвращается новый объект, у которого оформление не читается, старая копия остаётся
    t = Object.assign(newFrame('AREATEXT', { dyn: true, textPath: Object.assign({}, d.textPath), wraps: new Set(d.wraps), layer: d.layer, parent: d.parent, name: '' }), {});
    t.paraAttrs = d.paraAttrs.map(a => Object.assign({}, a));
    t.chars = d.chars.map(c => ({ contents: c.contents, attrs: Object.assign({}, c.attrs) }));
    t.badAttrs = true;
    t.duplicate = d.duplicate.bind(t);
    LEFTOVERS.push(t); if (d.layer && d.layer.all) d.layer.all.push(t);
  }
  const r = t.textPath, j = (t.paraAttrs[0] || {}).justification || 'LEFT', newPA = []; let p = 0;
  newPA.push(Object.assign({}, t.paraAttrs[0] || {}));
  t.chars.forEach((c, i) => {
    if (c.contents === '\r') { p++; newPA.push(Object.assign({}, t.paraAttrs[p] || {})); }
    else if (t.wraps.has(i)) { c.contents = '\r'; newPA.push(Object.assign({}, t.paraAttrs[p] || {}, LIVE ? {} : { spaceBefore: 0, firstLineIndent: 0 })); }
  });
  t.paraAttrs = newPA; t.wraps = null; t.kind = 'POINTTEXT';
  const first = t.chars.find(c => c.contents.trim()) || { attrs: { size: 12 } };
  const x = j === 'CENTER' ? r.left + r.width / 2 : (j === 'RIGHT' ? r.left + r.width : r.left);
  t.anchor = [x, r.top - first.attrs.size * 0.8];
  return t;
}

// исходный «рассыпанный» фрагмент: строка из одного или нескольких символов одного стиля
function srcFrame(text, x, base, a, layer) {
  const size = a.size;
  const w = text.length * size * 0.55;
  const f = newFrame(ENUMS.TextType.POINTTEXT, { anchor: [x, base], geometricBounds: [x, base + size * 0.75, x + w, base - size * 0.2],
    layer, parent: layer });
  f.chars = [...text].map(ch => ({ contents: ch, attrs: baseAttrs(Object.assign({}, a)) }));
  return f;
}

function makeApp(frames, env = {}) {
  const created = [];
  const mkLayer = (name, o = {}) => { const L = Object.assign({ name, locked: false, visible: true }, o);
    L.pathItems = { rectangle: (top, left, w, h) => ({ top, left, width: w, height: h, geometricBounds: [left, top, left + w, top - h] }) };
    L.textFrames = {
      pointText: ([x, y]) => { const f = newFrame('POINTTEXT', { anchor: [x, y], created: true, layer: L, dyn: true }); created.push(f); return f; },
      areaText: rect => { const f = newFrame('AREATEXT', { textPath: rect, created: true, layer: L, dyn: true, wraps: new Set() }); created.push(f); return f; },
    };
    return L; };
  const layer = mkLayer('Layer 1');
  layer.all = [];
  frames.forEach(f => { f.layer = layer; f.parent = layer; });
  (function walk(a) { a.forEach(x => { if (x.typename === 'GroupItem') walk(x.pageItems); else if (x.typename === 'TextFrame') layer.all.push(x); }); })(frames);
  // env.above: слои над слоем с текстом, сверху вниз, например [{ name: 'Плашки' }, { name: 'Замок', locked: true }]
  const layers = [...(env.above || []).map(o => mkLayer(o.name, o)), layer];
  layers.add = () => { const L = { name: '', locked: false, visible: true, printable: true, rects: [], groups: [],
    pathItems: { rectangle: (t, l, w, h) => { const r = { top: t, left: l, width: w, height: h }; L.rects.push(r); return r; } },
    groupItems: { add: () => { const g = { paths: [], pathItems: { add: () => { const q = { setEntirePath(pts) { this.pts = pts; } }; g.paths.push(q); return q; } } }; L.groups.push(g); return g; } },
    remove() { layers.splice(layers.indexOf(L), 1); } }; layers.unshift(L); return L; };
  // doc.textFrames: все тексты документа, кроме удалённых (для поиска по имени)
  const textFrames = new Proxy([], { get: (_, k) => { const live = layer.all.concat(created).filter(f => !f.removed);
    if (k === 'length') return live.length; if (typeof k === 'string' && /^\d+$/.test(k)) return live[+k]; return undefined; } });
  const doc = { name: 'test.ai', selection: frames, activeLayer: layer, layers, textFrames };
  return { app: { documents: { length: 1 }, activeDocument: doc }, created, doc };
}

// раскладка результата: базовые линии каждой строки (строки = \r и \u0003; переносов по ширине не моделируем)
function layout(tf) {
  const lines = []; let cur = []; let paraStart = true, pIdx = 0;
  const flush = (brk) => { lines.push({ chars: cur, paraStart, pIdx }); cur = []; paraStart = brk === '\r'; if (brk === '\r') pIdx++; };
  tf.chars.forEach(c => { if (c.contents === '\r' || c.contents === '\u0003') { cur.push(c); flush(c.contents); } else cur.push(c); });
  flush(null);
  let y;
  if (tf.kind === 'POINTTEXT') y = tf.anchor[1];
  else y = tf.textPath.top - tf.firstBaselineMin;
  const out = [];
  lines.forEach((L, i) => {
    const vis = L.chars.filter(c => c.contents !== '\r' && c.contents !== '\u0003');
    const lead = Math.max(...(vis.length ? vis : L.chars).map(c => c.attrs.leading));
    if (i > 0) y -= lead + (L.paraStart ? ((tf.paraAttrs[L.pIdx] || {}).spaceBefore || 0) : 0);
    out.push({ y, text: vis.map(c => c.contents).join(''), size: Math.max(...vis.map(c => c.attrs.size)) });
  });
  return out;
}

function run(frames, opt, env) {
  const { app, created, doc } = makeApp(frames, env);
  NODUP = !!(env && env.noDup);
  LIVE = !!(env && env.live);
  SKIPEMPTY = !!(env && env.skipEmpty);
  ETXPARA = !!(env && env.live);
  const ctx = Object.assign({ app, console, RGBColor: function () {}, StrokeCap: { BUTTENDCAP: 'BUTT' } }, ENUMS);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(HOST, 'utf8').replace(/^\s+/, ''), ctx);
  ctx.__opt = opt;
  LEFTOVERS.length = 0;
  const ana = JSON.parse(vm.runInContext('glueAnalyze(__opt)', ctx));
  const anaJunk = LEFTOVERS.filter(x => !x.removed).length;
  LEFTOVERS.length = 0;
  const res = vm.runInContext('glueText(__opt)', ctx);
  const junk = LEFTOVERS.filter(x => !x.removed).length + anaJunk;
  LIVE = false; SKIPEMPTY = false; ETXPARA = false;
  return { res, created, frames, ana, doc, junk };
}

function analyzeOnly(frames, opt) {
  const { app, doc } = makeApp(frames);
  const ctx = Object.assign({ app, console, RGBColor: function () {}, StrokeCap: { BUTTENDCAP: 'BUTT' } }, ENUMS);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(HOST, 'utf8').replace(/^\s+/, ''), ctx);
  ctx.__opt = opt;
  const ana = JSON.parse(vm.runInContext('glueAnalyze(__opt)', ctx));
  const L = doc.layers.find(l => l.name === 'String Glue preview');
  const preview = L && { rects: L.groups.slice(), locked: L.locked, printable: L.printable };
  const after = vm.runInContext('glueClear()', ctx);
  return { ana, preview, cleared: !doc.layers.some(l => l.name === 'String Glue preview'), after, doc };
}

// ---- готовые тексты для проверки оптимизации ----
// paras: [{ lines: [[text, attrs], ...] | [text,...], attrs, spaceBefore, justification, leftIndent, firstLineIndent }]
// в точечном тексте строки абзаца разделены разрывом строки (Shift+Enter), абзацы — Enter
function pointText(paras, x, y, opts = {}) {
  const f = newFrame('POINTTEXT', { anchor: [x, y], dyn: true });
  const chars = [];
  paras.forEach((P, pi) => {
    // возврат каретки принадлежит абзацу, который он закрывает, и несёт его оформление
    if (pi) { const Q = paras[pi - 1]; chars.push({ contents: '\r', attrs: baseAttrs(Object.assign({}, Q.attrs, { leading: Q.leading || opts.leading || 14.4, autoLeading: !!opts.autoLeading })) }); }
    P.lines.forEach((t, li) => {
      if (li) chars.push({ contents: '\u0003', attrs: baseAttrs(Object.assign({}, P.attrs, { leading: P.leading || opts.leading || 14.4, autoLeading: !!opts.autoLeading })) });
      for (const ch of t) chars.push({ contents: ch, attrs: baseAttrs(Object.assign({}, P.attrs, { leading: P.leading || opts.leading || 14.4, autoLeading: !!opts.autoLeading })) });
    });
    f.paraAttrs[pi] = { spaceBefore: P.spaceBefore || 0, justification: P.justification || 'LEFT', leftIndent: P.leftIndent || 0, firstLineIndent: P.firstLineIndent || 0, autoLeadingAmount: 120 };
  });
  f.chars = chars;
  return f;
}
// текст в области: абзацы из видимых строк (переносы — на пробелах между ними)
function areaText(paras, rect, opts = {}) {
  const f = newFrame('AREATEXT', { textPath: Object.assign({}, rect), dyn: true, wraps: new Set() });
  const chars = [];
  paras.forEach((P, pi) => {
    const A = (Q = P) => baseAttrs(Object.assign({}, Q.attrs, { leading: Q.leading || opts.leading || 14.4, autoLeading: !!opts.autoLeading }));
    if (pi) chars.push({ contents: '\r', attrs: A(paras[pi - 1]) });
    P.lines.forEach((t, li) => {
      if (li) { f.wraps.add(chars.length); chars.push({ contents: ' ', attrs: A() }); }
      for (const ch of t) chars.push({ contents: ch, attrs: A() });
    });
    f.paraAttrs[pi] = { spaceBefore: P.spaceBefore || 0, justification: P.justification || 'LEFT', leftIndent: 0, firstLineIndent: 0, autoLeadingAmount: 120 };
  });
  f.chars = chars;
  return f;
}
// графика в выделении: прямоугольник/линия/кружок
function pathItem(l, t, r, b, o = {}) {
  return Object.assign({ typename: o.compound ? 'CompoundPathItem' : 'PathItem', geometricBounds: [l, t, r, b], closed: o.closed !== false,
    filled: o.filled !== false, fillColor: o.fill || rgb(0, 0, 0), clipping: !!o.clipping, hidden: false, locked: false, removed: false,
    remove() { this.removed = true; } }, o.extra || {});
}

module.exports = { run, analyzeOnly, srcFrame, font, rgb, layout, ENUMS, pointText, areaText, pathItem, baseAttrs };
