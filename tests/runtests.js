const H = require('./harness.js');
const scenarios = require('./scenarios.js');
let fail = 0;
const refs = frames => { // исходные базовые линии строк (по крупнейшему кеглю в строке)
  const by = frames.filter(f => f.chars.some(c => c.contents.trim())).sort((a, b) => b.anchor[1] - a.anchor[1]); const lines = [];
  for (const f of by) { const s = f.chars[0].attrs.size, l = lines[lines.length - 1];
    if (l && Math.abs(l.y - f.anchor[1]) <= 0.4 * Math.max(l.s, s)) { if (s > l.s) { l.s = s; l.y = f.anchor[1]; } } else lines.push({ y: f.anchor[1], s }); }
  return lines.map(l => l.y);
};
for (const sc of scenarios) {
  const msgs = [];
  for (const mode of ['lines', 'area', 'single', 'split']) {
    const frames = sc.build();
    const src = refs(frames);
    const r = H.run(frames, { mode, track: true, hyph: !!sc.expect.hyph, del: true, gap: 0.12, para: 1.35, lang: 'ru' });
    if (!r.res.startsWith('OK:')) { msgs.push(`${mode}: ${r.res}`); continue; }
    if (r.junk) msgs.push(`${mode}: оставлены лишние объекты: ${r.junk}`);
    const tf = r.created;
    if (mode === 'split') { if (tf.length !== src.length) msgs.push(`split: ${tf.length} объектов вместо ${src.length}`); continue; }
    const t = tf[0];
    const nP = t.contents.split('\r').length;
    if (sc.expect.paras && mode !== 'single' && nP !== sc.expect.paras) msgs.push(`${mode}: абзацев ${nP}, ждали ${sc.expect.paras}`);
    if (sc.expect.paras && r.ana.paras !== sc.expect.paras) msgs.push(`анализ: абзацев ${r.ana.paras}, ждали ${sc.expect.paras}`);
    if (mode === 'lines') {
      if (sc.expect.text && t.contents.replace(/\r/g, '\u0003') !== sc.expect.text) msgs.push(`текст: ${JSON.stringify(t.contents)}`);
      const lay = H.layout(t);
      if (lay.length !== src.length) msgs.push(`строк ${lay.length}, ждали ${src.length}`);
      lay.forEach((l, i) => { if (src[i] !== undefined && Math.abs(l.y - src[i]) > 0.35) msgs.push(`строка ${i + 1} «${l.text}»: базовая ${l.y.toFixed(2)}, в исходнике ${src[i].toFixed(2)}`); });
      if (sc.expect.just && (t.paraAttrs[0] || {}).justification !== sc.expect.just) msgs.push(`выключка ${(t.paraAttrs[0] || {}).justification}`);
      // кегль каждой буквы сохранён
      const srcSizes = {}; frames.forEach(f => f.chars.forEach(c => { srcSizes[c.contents] = srcSizes[c.contents] || new Set(); srcSizes[c.contents].add(c.attrs.size); }));
      t.chars.forEach(c => { if (srcSizes[c.contents] && !srcSizes[c.contents].has(c.attrs.size)) msgs.push(`кегль «${c.contents}» ${c.attrs.size}`); });
      if (frames.some(f => !f.removed)) msgs.push('не все исходные удалены');
      if (sc.expect.deco) { const txt = t.chars.map(c => c.contents).join('');
        const chk = (word, ul, stt) => { const i = txt.indexOf(word); for (let k = i; k < i + word.length; k++) { const a = t.chars[k].attrs;
          if (!!a.underline !== ul || !!a.strikeThrough !== stt) msgs.push(`оформление «${word}»: подч. ${!!a.underline}, зачёрк. ${!!a.strikeThrough}`); } };
        chk('ссылкой', true, false); chk('старой', false, true); chk('Текст', false, false); chk('ценой', false, false); }
    }
    if (mode === 'area' && sc.expect.areaText && t.contents !== sc.expect.areaText) msgs.push(`area текст: ${JSON.stringify(t.contents)}`);
    if (mode === 'single' && t.contents.includes('\r')) msgs.push('single: есть разрыв абзаца');
  }
  const uniq = [...new Set(msgs)].slice(0, 6);
  console.log((uniq.length ? '✗ ' : '✓ ') + sc.name + (uniq.length ? '\n    ' + uniq.join('\n    ') : ''));
  if (uniq.length) fail++;
}
console.log(`\n${scenarios.length - fail}/${scenarios.length} сценариев без ошибок`);
