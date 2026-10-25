function glueText(opt) {
    GLUE.begin();
    try { return GLUE.run(GLUE.prep(opt)); }
    catch (e) { return "ERR:" + e.message + (e.line ? " (" + GLUE.t("line") + " " + e.line + ")" : ""); }
    finally { GLUE.cleanup(); }
}

function glueAnalyze(opt) {
    try {
        opt = GLUE.prep(opt);
        if (opt.preview) GLUE.clearPreview();
        GLUE.begin();
        return GLUE.json(GLUE.analyze(opt));
    }
    catch (e) { return GLUE.json({ err: e.message }); }
    finally { GLUE.cleanup(); }
}

function glueClear() {
    try { GLUE.clearPreview(); return "OK"; } catch (e) { return "ERR:" + e.message; }
}

function glueSig() {
    try {
        if (app.documents.length === 0) return "none";
        var doc = app.activeDocument, sel = doc.selection;
        if (!sel || sel.length === undefined || !sel.length) return doc.name + "|0";
        var a = sel[0].geometricBounds, b = sel[sel.length - 1].geometricBounds;
        return doc.name + "|" + sel.length + "|" + Math.round(a[0]) + "," + Math.round(a[1]) + "|" + Math.round(b[2]) + "," + Math.round(b[3]);
    } catch (e) { return "err"; }
}

var GLUE = {};

GLUE.TMP = "__stringglue_tmp";
GLUE.tmp = [];
GLUE.conv = false;
GLUE.begin = function () { GLUE.tmp = []; GLUE.conv = false; };
GLUE.dup = function (x) {
    var d = x.duplicate();
    GLUE.tmp.push(d);
    try { d.name = GLUE.TMP; } catch (e) {}
    return d;
};
GLUE.keep = function (x) {
    GLUE.tmp.push(x);
    try { x.name = GLUE.TMP; } catch (e) {}
};
GLUE.drop = function (x) { try { if (x) x.remove(); } catch (e) {} };
GLUE.cleanup = function () {
    var list = GLUE.tmp, i;
    GLUE.tmp = [];
    for (i = list.length - 1; i >= 0; i--) GLUE.drop(list[i]);
    if (!GLUE.conv) return;
    GLUE.conv = false;
    try {
        var tf = app.activeDocument.textFrames;
        for (i = tf.length - 1; i >= 0; i--) { try { if (tf[i].name === GLUE.TMP) tf[i].remove(); } catch (e1) {} }
    } catch (e2) {}
};

GLUE.prep = function (o) {
    o = o || {};
    if (!o.mode) o.mode = "area";
    if (!(o.gap > 0)) o.gap = 0.12;
    if (!(o.para > 1)) o.para = 1.35;
    if (!(o.col > 0.3)) o.col = 1.2;
    GLUE.lang = o.lang === "en" ? "en" : "ru";
    return o;
};

GLUE.lang = "ru";
GLUE.L = {
    ru: { noDoc:"Нет открытого документа", noSel:"Выделите буквы или строки инструментом «Выделение» (V)",
          noText:"В выделении нет текстовых объектов", empty:"Выделенные тексты пустые", fail:"Не удалось собрать текст",
          line:"строка", chars:["буква", "буквы", "букв"], texts:["текст", "текста", "текстов"],
          lines:["строка", "строки", "строк"], paras:["абзац", "абзаца", "абзацев"],
          blocks:["блок", "блока", "блоков"], table:"таблица", skipped:"пропущено",
          onlySkipped:"Тексты по контуру, связанные, повёрнутые и вертикальные не обрабатываются",
          attrs:"Не удалось прочитать оформление текста — склейка отменена, чтобы не потерять шрифты" },
    en: { noDoc:"No document is open", noSel:"Select letters or lines with the Selection tool (V)",
          noText:"No text objects in the selection", empty:"The selected text is empty", fail:"Could not assemble the text",
          line:"line", chars:["letter", "letters"], texts:["text", "texts"],
          lines:["line", "lines"], paras:["paragraph", "paragraphs"],
          blocks:["block", "blocks"], table:"table", skipped:"skipped",
          onlySkipped:"Text on a path, threaded, rotated and vertical text are not processed",
          attrs:"Could not read the text formatting — gluing cancelled so fonts are not lost" }
};
GLUE.t = function (k) { return GLUE.L[GLUE.lang][k]; };
GLUE.n = function (n, k) { return n + " " + GLUE.plural(n, GLUE.t(k)); };

GLUE.getInput = function () {
    if (app.documents.length === 0) throw new Error(GLUE.t("noDoc"));
    var sel = app.activeDocument.selection;
    if (!sel || sel.length === undefined || sel.length === 0)
        throw new Error(GLUE.t("noSel"));
    var frames = [], deco = [];
    GLUE.skipped = 0;
    GLUE.collect(sel, frames, deco);
    if (!frames.length) throw new Error(GLUE.skipped ? GLUE.t("onlySkipped") : GLUE.t("noText"));
    return { frames: frames, deco: deco };
};

GLUE.analyze = function (opt) {
    if (app.documents.length === 0) return { err: GLUE.t("noDoc") };
    var sel = app.activeDocument.selection;
    if (!sel || sel.length === undefined || sel.length === 0) return { empty: true };
    var frames = [], deco = [];
    GLUE.skipped = 0;
    GLUE.collect(sel, frames, deco);
    if (!frames.length) return { err: GLUE.skipped ? GLUE.t("onlySkipped") : GLUE.t("noText") };

    var infos = [], fonts = {}, nFonts = 0, chars = 0, i, j;
    for (i = 0; i < frames.length; i++) {
        var arr = GLUE.frameInfos(frames[i], opt, false);
        for (j = 0; j < arr.length; j++) {
            infos.push(arr[j]);
            chars += arr[j].vis;
            if (arr[j].font && !fonts[arr[j].font]) { fonts[arr[j].font] = 1; nFonts++; }
        }
    }
    if (!infos.length) return { err: GLUE.t("empty") };
    GLUE.decorate(infos, deco, opt, false);

    if (opt.mode === "auto") {
        var seg = GLUE.segment(GLUE.fragments(infos, opt), opt), bl = [], nP = 0, bb = { l: 1e9, t: -1e9, r: -1e9, b: 1e9 };
        for (i = 0; i < seg.blocks.length; i++) {
            var B = seg.blocks[i], g = GLUE.blockBounds(B);
            nP += B.paras.length;
            bl.push({ l: GLUE.rnd(g.l), t: GLUE.rnd(g.t), r: GLUE.rnd(g.r), b: GLUE.rnd(g.b), k: B.kind, n: B.lines.length });
            if (g.l < bb.l) bb.l = g.l; if (g.r > bb.r) bb.r = g.r; if (g.t > bb.t) bb.t = g.t; if (g.b < bb.b) bb.b = g.b;
        }
        if (opt.preview) GLUE.drawPreview(seg.blocks);
        return { auto: true, objects: frames.length, chars: chars, fonts: nFonts, blocks: bl, paras: nP, skipped: GLUE.skipped,
                 tRows: seg.tRows, tCols: seg.tCols, bbox: { l: GLUE.rnd(bb.l), t: GLUE.rnd(bb.t), r: GLUE.rnd(bb.r), b: GLUE.rnd(bb.b) } };
    }

    var lines = GLUE.groupLines(infos, opt);
    var gLead = GLUE.globalLead(lines);
    var paras = GLUE.splitParas(lines, gLead, opt);
    var out = [], minL = 1e9, maxR = -1e9, p, k;
    for (p = 0; p < paras.length; p++) {
        for (k = 0; k < paras[p].lines.length; k++) {
            var L = paras[p].lines[k];
            out.push({ l: GLUE.rnd(L.left), r: GLUE.rnd(L.right), p: p });
            if (L.left < minL) minL = L.left;
            if (L.right > maxR) maxR = L.right;
        }
    }
    var just = GLUE.detectJust(lines);
    return {
        objects: frames.length, chars: chars, lines: out, paras: paras.length, skipped: GLUE.skipped,
        minL: GLUE.rnd(minL), maxR: GLUE.rnd(maxR),
        size: GLUE.rnd(lines[0].size), lead: GLUE.rnd(lines.length > 1 ? gLead : lines[0].size * 1.2),
        just: just === Justification.CENTER ? "center" : (just === Justification.RIGHT ? "right" : "left"),
        fonts: nFonts
    };
};

GLUE.quickInfo = function (fr) {
    var s = fr.contents;
    if (!s) return null;
    var tk = [], vis = 0, size = 12, font = "";
    s = s.replace(/[\r\n\u0003\t]/g, " ");
    for (var q = 0; q < s.length; q++) {
        tk.push({ ch: s.charAt(q), a: null });
        if (s.charAt(q) !== " ") vis++;
    }
    if (!vis) return null;
    var fill = null;
    try { var ca = fr.textRange.characterAttributes; size = ca.size; font = ca.textFont.name; fill = ca.fillColor; } catch (e) {}
    var b = fr.geometricBounds, base;
    try { base = fr.anchor[1]; } catch (e2) { base = b[3] + size * 0.2; }
    if (fr.kind !== TextType.POINTTEXT) base = b[3] + size * 0.2;
    return { toks: tk, size: size, base: base, left: b[0], right: b[2], text: s, vis: vis, font: font,
             sk: font + "|" + GLUE.rnd(size) + "|" + GLUE.colorKey(fill), fr: fr };
};

GLUE.run = function (opt) {
    var doc = app.activeDocument, inp = GLUE.getInput(), frames = inp.frames, i, j;
    GLUE.clearPreview();

    var infos = [];
    for (i = 0; i < frames.length; i++) {
        var arr = GLUE.frameInfos(frames[i], opt, true);
        for (j = 0; j < arr.length; j++) infos.push(arr[j]);
    }
    if (!infos.length) return "ERR:" + GLUE.t("empty");
    frames = frames.concat(GLUE.decorate(infos, inp.deco, opt, true));
    if (opt.mode === "auto") return GLUE.runAuto(doc, frames, infos, opt);

    var lines = GLUE.groupLines(infos, opt);
    if (!lines.length) return "ERR:" + GLUE.t("fail");
    var gLead = GLUE.globalLead(lines);

    var src = frames[0], host;
    host = GLUE.topLayer(doc);

    var created = [], nPara = 0, nChars = 0;
    for (i = 0; i < infos.length; i++) nChars += infos[i].vis;

    if (opt.mode === "split") {
        for (i = 0; i < lines.length; i++)
            created.push(GLUE.makeText(host, [{ lines: [lines[i]], lead: gLead, spaceBefore: 0 }], "point", opt, gLead, src, true));
        nPara = lines.length;
    } else {
        var paras = (opt.mode === "single")
            ? [{ lines: lines, lead: gLead, spaceBefore: 0 }]
            : GLUE.splitParas(lines, gLead, opt);
        nPara = paras.length;
        created.push(GLUE.makeText(host, paras, opt.mode === "area" ? "area" : "point", opt, gLead, src, opt.mode !== "lines"));
    }

    GLUE.finish(doc, frames, created, opt);

    return "OK:" + GLUE.n(nChars, "chars") + " → " + GLUE.n(created.length, "texts") + ": " +
        GLUE.n(lines.length, "lines") + (opt.mode === "split" ? "" : ", " + GLUE.n(nPara, "paras")) + GLUE.skipNote();
};

GLUE.topLayer = function (doc) {
    try {
        for (var i = 0; i < doc.layers.length; i++) {
            var L = doc.layers[i];
            if (L.name !== GLUE.PREVIEW && L.visible && !L.locked) return L;
        }
    } catch (e) {}
    return doc.activeLayer;
};

GLUE.finish = function (doc, frames, created, opt) {
    var parents = [], i;
    for (i = 0; i < frames.length; i++) {
        try {
            if (opt.del) { parents.push(frames[i].parent); frames[i].remove(); }
            else frames[i].hidden = true;
        } catch (e) {}
    }
    for (i = 0; i < parents.length; i++) GLUE.removeEmptyGroups(parents[i]);
    doc.selection = null;
    for (i = 0; i < created.length; i++) created[i].selected = true;
};

GLUE.runAuto = function (doc, frames, infos, opt) {
    var seg = GLUE.segment(GLUE.fragments(infos, opt), opt), created = [], nChars = 0, i;
    if (!seg.blocks.length) return "ERR:" + GLUE.t("fail");
    for (i = 0; i < infos.length; i++) nChars += infos[i].vis;
    for (i = 0; i < seg.blocks.length; i++) {
        var B = seg.blocks[i], src = GLUE.blockSrc(B) || frames[0], host;
        host = GLUE.topLayer(doc);
        created.push(GLUE.makeText(host, B.paras, B.kind === "a" ? "area" : "point", opt, B.lead, src, B.kind === "a"));
    }
    GLUE.finish(doc, frames, created, opt);
    return "OK:" + GLUE.n(nChars, "chars") + " → " + GLUE.n(created.length, "texts") +
        (seg.tRows ? ", " + GLUE.t("table") + " " + seg.tRows + "×" + seg.tCols : "") + GLUE.skipNote();
};

GLUE.fragments = function (infos, opt) {
    infos.sort(function (a, b) { return b.base - a.base; });
    var rows = [], i, q;
    for (i = 0; i < infos.length; i++) {
        var f = infos[i], L = rows.length ? rows[rows.length - 1] : null;
        if (L && Math.abs(L.ref - f.base) <= 0.4 * Math.max(L.size, f.size)) {
            L.items.push(f);
            if (f.size > L.size) { L.size = f.size; L.ref = f.base; }
        } else rows.push({ items: [f], ref: f.base, size: f.size });
    }
    var out = [];
    for (i = 0; i < rows.length; i++) {
        var it = rows[i].items;
        it.sort(function (a, b) { return a.left - b.left; });
        var lg = GLUE.letterGap(it);
        var frags = [], cur = [it[0]], right = it[0].right;
        for (q = 1; q < it.length; q++) {
            if (it[q].left - right > (lg + opt.col) * Math.min(it[q].size, it[q - 1].size)) { frags.push(cur); cur = []; }
            cur.push(it[q]);
            if (it[q].right > right) right = it[q].right;
        }
        frags.push(cur);
        var row = { ref: rows[i].ref, frags: [] };
        for (q = 0; q < frags.length; q++) {
            var fr = { items: frags[q], ref: frags[q][0].base, size: 0 };
            for (var k = 0; k < frags[q].length; k++) if (frags[q][k].size > fr.size) { fr.size = frags[q][k].size; fr.ref = frags[q][k].base; }
            GLUE.buildLine(fr, opt);
            if (fr.toks.length) row.frags.push(fr);
        }
        if (row.frags.length) out.push(row);
    }
    for (i = 0; i < out.length; i++) {
        var RM = out[i];
        if (RM.frags.length < 2) continue;
        var f0 = RM.frags[0], m0 = "";
        for (q = 0; q < f0.toks.length; q++) m0 += f0.toks[q].ch;
        var isBul = f0.items.length === 1 && f0.items[0].bullet;
        if (!isBul && !GLUE.MARK.test(m0)) continue;
        if (RM.frags[1].left - f0.right > 4 * f0.fsize) continue;
        var mi = f0.items.concat(RM.frags[1].items);
        var mf0 = { items: mi, ref: RM.frags[1].ref, size: Math.max(f0.size, RM.frags[1].size) };
        GLUE.buildLine(mf0, { gap: opt.gap, col: opt.col, para: opt.para });
        RM.frags.splice(0, 2, mf0);
    }
    for (i = 0; i < out.length; i++) {
        var R0 = out[i];
        if (R0.frags.length < 2) continue;
        var nb = [], ok = true, maxF = 0;
        for (q = 0; q < R0.frags.length; q++) maxF = Math.max(maxF, R0.frags[q].fsize);
        if (i > 0 && out[i - 1].ref - R0.ref <= 2.2 * maxF) nb.push(out[i - 1]);
        if (i < out.length - 1 && R0.ref - out[i + 1].ref <= 2.2 * maxF) nb.push(out[i + 1]);
        if (!nb.length) continue;
        for (var n = 0; n < nb.length && ok; n++) {
            if (nb[n].frags.length !== 1) { ok = false; break; }
            var F = nb[n].frags[0];
            for (q = 1; q < R0.frags.length; q++)
                if (!(F.left <= R0.frags[q - 1].right + maxF && F.right >= R0.frags[q].left - maxF)) { ok = false; break; }
        }
        if (!ok) continue;
        var all = [];
        for (q = 0; q < R0.frags.length; q++) all = all.concat(R0.frags[q].items);
        var mf = { items: all, ref: R0.frags[0].ref, size: 0 };
        for (q = 0; q < all.length; q++) if (all[q].size > mf.size) { mf.size = all[q].size; mf.ref = all[q].base; }
        GLUE.buildLine(mf, { gap: opt.gap, col: opt.col, para: opt.para, wide: true });
        R0.frags = [mf];
    }
    return out;
};

GLUE.xOver = function (a, b) { return a.left < b.right && b.left < a.right; };
GLUE.aligned = function (a, b) {
    var tol = 1.0 * Math.min(a.fsize, b.fsize);
    return Math.abs(a.left - b.left) <= 3 * tol || Math.abs(a.right - b.right) <= tol ||
        Math.abs((a.left + a.right) / 2 - (b.left + b.right) / 2) <= tol;
};

GLUE.isTable = function (multi, cols) {
    if (multi.length <= 2) return true;
    var words = [];
    for (var i0 = 0; i0 < multi.length; i0++)
        for (var j0 = 0; j0 < multi[i0].frags.length; j0++) {
            var tx = "", tk = multi[i0].frags[j0].toks;
            for (var t0 = 0; t0 < tk.length; t0++) tx += tk[t0].ch;
            words.push(tx.replace(/^\s+|\s+$/g, "").split(/\s+/).length);
        }
    if (GLUE.median(words) < 4) return true;
    for (var c = 0; c < cols.length; c++) {
        var w = [];
        for (var i = 0; i < multi.length; i++)
            for (var j = 0; j < multi[i].frags.length; j++) {
                var f = multi[i].frags[j];
                if (GLUE.colOf(cols, f) === c) w.push(f.right - f.left);
            }
        if (w.length && GLUE.median(w) < 0.6 * (cols[c].r - cols[c].l)) return true;
    }
    return false;
};

GLUE.colOf = function (cols, f) {
    for (var c = 0; c < cols.length; c++) if (f.left < cols[c].r && cols[c].l < f.right) return c;
    return -1;
};

GLUE.segment = function (rows, opt) {
    var blocks = [], open = [], i, j, c;
    var multi = [];
    for (i = 0; i < rows.length; i++) if (rows[i].frags.length >= 2) multi.push(rows[i]);

    var cols = [];
    for (i = 0; i < multi.length; i++)
        for (j = 0; j < multi[i].frags.length; j++) {
            var f0 = multi[i].frags[j], hit = -1;
            for (c = 0; c < cols.length; c++) if (f0.left < cols[c].r && cols[c].l < f0.right) { hit = c; break; }
            if (hit < 0) cols.push({ l: f0.left, r: f0.right });
            else { cols[hit].l = Math.min(cols[hit].l, f0.left); cols[hit].r = Math.max(cols[hit].r, f0.right); }
        }
    var merged = true;
    while (merged) {
        merged = false;
        for (i = 0; i < cols.length && !merged; i++)
            for (j = i + 1; j < cols.length && !merged; j++)
                if (cols[i].l < cols[j].r && cols[j].l < cols[i].r) {
                    cols[i].l = Math.min(cols[i].l, cols[j].l); cols[i].r = Math.max(cols[i].r, cols[j].r);
                    cols.splice(j, 1); merged = true;
                }
    }
    cols.sort(function (a, b) { return a.l - b.l; });
    var table = multi.length > 0 && GLUE.isTable(multi, cols);

    function closeOver(f, except) {
        var keep = [];
        for (var q = 0; q < open.length; q++)
            if (open[q] === except || !GLUE.xOver(open[q].lines[open[q].lines.length - 1], f)) keep.push(open[q]);
        open = keep;
    }
    function place(f) {
        var best = null, bestGap = 1e9, q, over = 0;
        for (q = 0; q < open.length; q++) if (GLUE.xOver(open[q].lines[open[q].lines.length - 1], f)) over++;
        if (over >= 2) {
            closeOver(f, null);
            var nb0 = { lines: [f], cell: false }; blocks.push(nb0); open.push(nb0);
            return;
        }
        for (q = 0; q < open.length; q++) {
            var last = open[q].lines[open[q].lines.length - 1];
            if (!GLUE.xOver(last, f) || last.ref <= f.ref) continue;
            var gap = last.ref - f.ref;
            if (gap <= 8.0 * Math.max(f.fsize, last.fsize) && GLUE.aligned(last, f) && gap < bestGap) { best = open[q]; bestGap = gap; }
        }
        closeOver(f, best);
        if (best) best.lines.push(f);
        else { var nb = { lines: [f], cell: false }; blocks.push(nb); open.push(nb); }
    }

    var anchors = table ? multi : [], pitch = 0, d = [];
    for (i = 1; i < anchors.length; i++) d.push(anchors[i - 1].ref - anchors[i].ref);
    var maxS = 0;
    for (i = 0; i < anchors.length; i++) for (j = 0; j < anchors[i].frags.length; j++) maxS = Math.max(maxS, anchors[i].frags[j].fsize);
    pitch = d.length ? GLUE.median(d) : 2.2 * maxS;
    function bandOf(f) {
        var best = -1, bd = 1e9;
        for (var q = 0; q < anchors.length; q++) {
            var dd = Math.abs(anchors[q].ref - f.ref);
            if (dd < bd) { bd = dd; best = q; }
        }
        return (best >= 0 && bd <= 0.6 * pitch) ? best : -1;
    }
    var cellMap = {};
    for (i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.frags.length >= 2) {
            var keepO = [];
            for (var o = 0; o < open.length; o++) {
                var lo = open[o].lines[open[o].lines.length - 1], n = 0;
                for (j = 0; j < row.frags.length; j++) if (GLUE.xOver(lo, row.frags[j])) n++;
                if (n < 2) keepO.push(open[o]);
            }
            open = keepO;
        }
        for (j = 0; j < row.frags.length; j++) {
            var f = row.frags[j];
            if (table) {
                var b = bandOf(f), hits = [];
                for (c = 0; c < cols.length; c++) if (f.left < cols[c].r && cols[c].l < f.right) hits.push(c);
                if (b >= 0 && hits.length === 1) {
                    var key = b + ":" + hits[0];
                    closeOver(f, null);
                    if (cellMap[key]) cellMap[key].lines.push(f);
                    else { cellMap[key] = { lines: [f], cell: true }; blocks.push(cellMap[key]); }
                    continue;
                }
            }
            place(f);
        }
    }
    var tRows = anchors.length;

    var split = [];
    for (i = 0; i < blocks.length; i++) {
        if (blocks[i].cell) { split.push(blocks[i]); continue; }
        var parts = GLUE.cutBlock(blocks[i], opt);
        for (j = 0; j < parts.length; j++) split.push(parts[j]);
    }
    blocks = split;

    for (i = 0; i < blocks.length; i++) {
        var B = blocks[i];
        B.lead = GLUE.globalLead(B.lines);
        B.paras = GLUE.splitParas(B.lines, B.lead, opt);
        var wrapped = false, k2;
        for (j = 0; j < B.paras.length; j++) {
            var PL = B.paras[j].lines, bw = 0;
            if (PL.length < 2) continue;
            for (k2 = 0; k2 < PL.length; k2++) bw = Math.max(bw, PL[k2].right - PL[k2].left);
            var full = true, hard = false;
            for (k2 = 1; k2 < PL.length; k2++) if (PL[k2].hb === "s" || PL[k2].hb === "p") hard = true;
            var need = hard ? 0.85 : 0.75;
            if (hard && PL.length < 3) full = false;
            var noSp = 0, pitch = [];
            for (k2 = 0; k2 < PL.length - 1; k2++) { if (!GLUE.hasSpace(PL[k2])) noSp++; pitch.push(PL[k2].ref - PL[k2 + 1].ref); }
            if (noSp * 2 > PL.length - 1 || GLUE.median(pitch) > 2.5 * PL[0].fsize) full = false;
            for (k2 = 0; k2 < PL.length - 1; k2++) if (PL[k2].right - PL[k2].left < need * bw) full = false;
            if (full) wrapped = true;
        }
        var lay = GLUE.paraLayout(B);
        B.kind = B.cell ? "c" : ((wrapped || lay.mixed) ? "a" : "p");
    }
    return { blocks: blocks, tRows: tRows, tCols: table ? cols.length : 0 };
};

GLUE.paraLayout = function (B) {
    var L = 1e9, R = -1e9, i, k, all = B.lines;
    for (i = 0; i < all.length; i++) { L = Math.min(L, all[i].left); R = Math.max(R, all[i].right); }
    var bj = GLUE.detectJust(all), seen = {}, n = 0;
    function fits(l, j, tol) {
        if (j === Justification.LEFT) return Math.abs(l.left - L) <= tol;
        if (j === Justification.CENTER) return Math.abs((l.left + l.right) / 2 - (L + R) / 2) <= tol;
        return Math.abs(l.right - R) <= tol;
    }
    for (i = 0; i < B.paras.length; i++) {
        var p = B.paras[i], ls = p.lines, tol = 0.5 * ls[0].fsize;
        p.li = 0; p.fli = 0; p.tab = -1;
        if (ls[0].mk) {
            var mk = ls[0].mk;
            p.just = Justification.LEFT;
            p.li = Math.max(0, mk.textLeft - L);
            p.fli = mk.left - mk.textLeft;
            p.tab = mk.s;
        } else if (ls.length > 1) {
            p.just = GLUE.detectJust(ls);
            if (p.just === Justification.LEFT) {
                var mr = 1e9;
                for (k = 1; k < ls.length; k++) mr = Math.min(mr, ls[k].left);
                p.li = mr - L > tol ? mr - L : 0;
                p.fli = Math.abs(ls[0].left - mr) > 1 ? ls[0].left - mr : 0;
            }
        } else {
            var l = ls[0];
            if (fits(l, bj, tol)) p.just = bj;
            else if (fits(l, Justification.LEFT, tol)) p.just = Justification.LEFT;
            else if (fits(l, Justification.CENTER, tol)) p.just = Justification.CENTER;
            else if (fits(l, Justification.RIGHT, tol)) p.just = Justification.RIGHT;
            else { p.just = Justification.LEFT; p.li = l.left - L; }
        }
        if (!seen[p.just]) { seen[p.just] = 1; n++; }
    }
    return { mixed: n > 1 };
};

GLUE.cutBlock = function (B, opt) {
    var lines = B.lines;
    if (lines.length < 2) return [B];
    var paras = GLUE.splitParas(lines, GLUE.globalLead(lines), opt), gaps = [], idx = [], i, k = 0;
    for (i = 0; i < paras.length; i++) {
        if (i > 0) { gaps.push(paras[i].gapBefore); idx.push(k); }
        k += paras[i].lines.length;
    }
    var cuts = {};
    for (i = 1; i < lines.length; i++) {
        var p0 = lines[i - 1], p1 = lines[i];
        if ((GLUE.isShort(p0) || GLUE.isShort(p1)) && p0.ref - p1.ref > 2.5 * Math.max(p0.fsize, p1.fsize)) cuts[i] = true;
    }
    for (i = 0; i < gaps.length; i++) {
        var a = lines[idx[i] - 1], b = lines[idx[i]], g = gaps[i];
        if (g <= 3.0 * Math.max(a.fsize, b.fsize)) continue;
        var others = [];
        for (var j = 0; j < gaps.length; j++) if (j !== i) others.push(gaps[j]);
        if (!others.length || g > 1.6 * GLUE.quantile(others, 0.75)) cuts[idx[i]] = true;
    }
    var out = [], cur = { lines: [], cell: false };
    for (i = 0; i < lines.length; i++) {
        if (cuts[i] && cur.lines.length) { out.push(cur); cur = { lines: [], cell: false }; }
        cur.lines.push(lines[i]);
    }
    out.push(cur);
    return out;
};

GLUE.isShort = function (L) {
    var n = 0;
    for (var q = 0; q < L.toks.length; q++) if (L.toks[q].ch !== " ") n++;
    return n <= 3;
};
GLUE.hasSpace = function (L) {
    for (var q = 0; q < L.toks.length; q++) if (L.toks[q].ch === " ") return true;
    return false;
};

GLUE.blockBounds = function (B) {
    var g = { l: 1e9, t: -1e9, r: -1e9, b: 1e9 };
    for (var i = 0; i < B.lines.length; i++) {
        var L = B.lines[i];
        g.l = Math.min(g.l, L.left); g.r = Math.max(g.r, L.right);
        g.t = Math.max(g.t, L.ref + L.size * 0.8); g.b = Math.min(g.b, L.ref - L.size * 0.25);
    }
    return g;
};

GLUE.PREVIEW = "String Glue preview";
GLUE.clearPreview = function () {
    if (app.documents.length === 0) return;
    var doc = app.activeDocument;
    if (!doc.layers) return;
    for (var i = doc.layers.length - 1; i >= 0; i--) {
        var L = doc.layers[i];
        if (L.name === GLUE.PREVIEW) { try { L.locked = false; L.visible = true; L.remove(); } catch (e) {} }
    }
};
GLUE.DASH = 3; GLUE.GAP = 2; GLUE.SW = 0.75; GLUE.PAD = 4;
GLUE.sideDash = function (len) {
    if (len < GLUE.DASH * 2 + GLUE.GAP) return null;
    var n = Math.max(2, Math.round((len + GLUE.GAP) / (GLUE.DASH + GLUE.GAP)));
    return [(len - (n - 1) * GLUE.GAP) / n, GLUE.GAP];
};
GLUE.drawPreview = function (blocks) {
    var doc = app.activeDocument, prev = doc.activeLayer;
    GLUE.clearPreview();
    var L = doc.layers.add();
    L.name = GLUE.PREVIEW;
    try { L.printable = false; } catch (e) {}
    var cols = { a: [47, 127, 224], p: [43, 163, 107], c: [201, 138, 18] };
    for (var i = 0; i < blocks.length; i++) {
        var g = GLUE.blockBounds(blocks[i]), P = GLUE.PAD;
        var l = g.l - P, r = g.r + P, t = g.t + P, b = g.b - P;
        var tiny = Math.max(r - l, t - b) < 36;
        var c = new RGBColor(), v = cols[blocks[i].kind];
        c.red = v[0]; c.green = v[1]; c.blue = v[2];
        var grp = L.groupItems.add();
        grp.name = "block " + (i + 1) + " · " + blocks[i].kind;
        var sides = [[[l, t], [r, t]], [[r, t], [r, b]], [[r, b], [l, b]], [[l, b], [l, t]]];
        for (var k = 0; k < 4; k++) {
            var pth = grp.pathItems.add();
            pth.setEntirePath(sides[k]);
            pth.filled = false; pth.stroked = true; pth.strokeColor = c; pth.strokeWidth = GLUE.SW;
            try { pth.strokeCap = StrokeCap.BUTTENDCAP; } catch (e1) {}
            var len = Math.abs(sides[k][1][0] - sides[k][0][0]) + Math.abs(sides[k][1][1] - sides[k][0][1]);
            var dd = tiny ? null : GLUE.sideDash(len);
            if (dd) { try { pth.strokeDashes = dd; } catch (e2) {} }
            if (tiny) pth.opacity = 60;
        }
    }
    L.locked = true;
    try { doc.activeLayer = prev; } catch (e3) {}
};

GLUE.skipped = 0;
GLUE.skipNote = function () { return GLUE.skipped ? " · " + GLUE.t("skipped") + ": " + GLUE.skipped : ""; };

GLUE.collect = function (items, out, deco) {
    for (var q = 0; q < items.length; q++) {
        var it = items[q], t = it.typename;
        try { if (it.hidden || it.locked) continue; } catch (e) {}
        if (t === "TextFrame") { if (GLUE.usable(it)) out.push(it); else GLUE.skipped++; }
        else if (t === "GroupItem") GLUE.collect(it.pageItems, out, deco);
        else if (deco && (t === "PathItem" || t === "CompoundPathItem")) {
            try { if (t === "PathItem" && it.clipping) continue; } catch (e2) {}
            deco.push(it);
        }
    }
};

GLUE.usable = function (fr) {
    try { if (fr.kind === TextType.PATHTEXT) return false; } catch (e) {}
    try { if (fr.kind === TextType.AREATEXT && fr.story.textFrames.length > 1) return false; } catch (e1) {}
    try { if (fr.orientation === TextOrientation.VERTICAL) return false; } catch (e2) {}
    try { var m = fr.matrix; if (Math.abs(m.mValueB) > 0.001 || Math.abs(m.mValueC) > 0.001) return false; } catch (e3) {}
    return true;
};

GLUE.blockSrc = function (B) {
    for (var i = 0; i < B.lines.length; i++)
        for (var j = 0; j < B.lines[i].items.length; j++) if (B.lines[i].items[j].fr) return B.lines[i].items[j].fr;
    return null;
};

GLUE.isMulti = function (fr) {
    if (fr.kind !== TextType.POINTTEXT) return true;
    var s = fr.contents.replace(/[\r\u0003\s]+$/, "");
    return /[\r\u0003]/.test(s);
};
GLUE.frameInfos = function (fr, o, precise) {
    if (!GLUE.isMulti(fr)) {
        var one = precise ? GLUE.frameInfo(fr, o) : GLUE.quickInfo(fr);
        return one ? [one] : [];
    }
    if (precise) { try { return GLUE.explode(fr, o); } catch (e) {} }
    try { return GLUE.explodeQuick(fr, o, precise); } catch (e1) {}
    return GLUE.explodeQuick(fr, o, false);
};

GLUE.WS = /[\s\u0003]/;

GLUE.align = function (s, src) {
    var m = [], j = 0, ws = GLUE.WS;
    for (var i = 0; i < s.length; i++) {
        var c = s.charAt(i);
        if (!ws.test(c)) {
            while (j < src.length && ws.test(src.charAt(j))) j++;
            m.push(j < src.length && src.charAt(j) === c ? j : -1);
            j++;
        } else if (j < src.length && ws.test(src.charAt(j))) { m.push(j); j++; }
        else m.push(j > 0 ? j - 1 : -1);
    }
    return m;
};

GLUE.explode = function (fr, o) {
    var P = null, out = [], i, wasArea = fr.kind !== TextType.POINTTEXT;
    var src = fr.contents, ends = {}, nv = 0, fpi = [], pc = 0;
    for (i = 0; i < src.length; i++) {
        var c0 = src.charAt(i);
        fpi.push(pc);
        if (c0 === "\r" || c0 === "\n") { ends[nv] = "p"; pc++; }
        else if (c0 === "\u0003") ends[nv] = "s";
        else if (!/\s/.test(c0)) nv++;
    }
    var F = { ch: fr.textRange.characters, pars: null, map: null, pm: GLUE.paraMap(src) }, fb = wasArea ? fr.geometricBounds : null;
    try { F.pars = fr.paragraphs; } catch (e0) {}
    try {
        P = GLUE.dup(fr);
        if (P.kind !== TextType.POINTTEXT) {
            var R = null;
            GLUE.conv = true;
            try { R = P.convertAreaObjectToPointObject(); } catch (e) {}
            if (R && R.typename === "TextFrame") { P = R; GLUE.keep(R); }
            if (P.kind !== TextType.POINTTEXT) throw new Error("convert");
        }
        var s = P.contents, lines = [], st = 0, hb = null, cnt = 0;
        F.map = GLUE.align(s, src);
        for (i = 0; i <= s.length; i++) {
            var c = i < s.length ? s.charAt(i) : "\r";
            if (c === "\r" || c === "\u0003" || c === "\n") {
                lines.push({ start: st, len: i - st, brk: i < s.length ? 1 : 0, hb: hb });
                hb = wasArea ? (ends[cnt] || "w") : (c === "\u0003" ? "s" : "p");
                st = i + 1;
            } else if (!/\s/.test(c)) cnt++;
        }
        var y = P.anchor[1], prevPi = -1;
        for (i = 0; i < lines.length; i++) {
            var Ln = lines[i], fi = -1, k;
            for (k = Ln.start; k <= Ln.start + Ln.len && k < F.map.length && fi < 0; k++) fi = F.map[k];
            if (fi < 0 && Ln.start > 0) fi = F.map[Ln.start - 1] + 1;
            var pIdx = fi >= 0 && fi < fpi.length ? fpi[fi] : (fi >= fpi.length ? pc : Math.max(prevPi, 0));
            var paraStart = i === 0 || Ln.hb === "p";
            var pa = null;
            pa = GLUE.paraPA(F.ch, F.pars, F.pm, pIdx);
            var amt = 120;
            try { if (pa && pa.autoLeadingAmount > 0) amt = pa.autoLeadingAmount; } catch (e2) {}
            var ri = GLUE.rangeInfo(P, Ln.start, Ln.len + Ln.brk, o, amt, F);
            if (i > 0) {
                y -= ri.lead;
                if (paraStart) {
                    try { y -= (pa ? pa.spaceBefore : 0) || 0; } catch (e3) {}
                    try { if (prevPi >= 0 && prevPi !== pIdx) y -= GLUE.paraPA(F.ch, F.pars, F.pm, prevPi).spaceAfter || 0; } catch (e4) {}
                }
            }
            prevPi = pIdx;
            if (!ri.info) continue;
            var g = GLUE.measureLine(P, Ln.start, Ln.len, pa, paraStart);
            ri.info.base = y; ri.info.left = g[0]; ri.info.right = g[2]; ri.info.fr = fr; ri.info.hb = Ln.hb;
            if (fb) { ri.info.frL = fb[0]; ri.info.frR = fb[2]; }
            out.push(ri.info);
        }
    } finally { GLUE.drop(P); }
    return out;
};

GLUE.charCA = function (P, F, q) {
    var j = F && F.map ? F.map[q] : -1;
    if (j >= 0) { try { var c = F.ch[j].characterAttributes; c.size; return c; } catch (e) {} }
    return P.textRange.characters[q].characterAttributes;
};

GLUE.rangeInfo = function (P, start, len, o, amt, F) {
    var ch = P.textRange.characters, tk = [], maxS = 0, lead = 0, vis = 0, txt = "", skc = {}, sk = "", skN = -1, lastA = null, nOk = 0;
    for (var q = start; q < start + len && q < ch.length; q++) {
        var s = ch[q].contents, ca = null;
        try { ca = GLUE.charCA(P, F, q); } catch (e9) {}
        var L = 0;
        try { L = ca.autoLeading ? ca.size * amt / 100 : ca.leading; } catch (e) { try { L = ca.size * 1.2; } catch (e0) { L = 0; } }
        if (L > lead) lead = L;
        if (s === "\r" || s === "\u0003" || s === "\n") continue;
        if (s === "\t") s = " ";
        var a = null;
        try { a = GLUE.readAttr(ca, o); nOk++; } catch (eA) { a = lastA; }
        if (!a) { tk.push({ ch: s, a: null }); txt += s; if (s !== " ") vis++; continue; }
        lastA = a;
        if (a.size > maxS) maxS = a.size;
        if (s !== " ") { vis++; skc[a.sk] = (skc[a.sk] || 0) + 1; if (skc[a.sk] > skN) { skN = skc[a.sk]; sk = a.sk; } }
        tk.push({ ch: s, a: a });
        txt += s;
    }
    if (vis && !nOk) throw new Error(GLUE.t("attrs"));
    for (q = tk.length - 1, lastA = null; q >= 0; q--) { if (tk[q].a) lastA = tk[q].a; else tk[q].a = lastA; }
    if (!lead) lead = maxS * amt / 100;
    return { lead: lead, info: vis ? { toks: tk, size: maxS, base: 0, left: 0, right: 0, text: txt, vis: vis, sk: sk } : null };
};

GLUE.measureLine = function (P, start, len, pa, paraStart) {
    var D = GLUE.dup(P);
    try {
        var ch = D.textRange.characters, n = ch.length;
        GLUE.cut(D, start + len, n - (start + len));
        GLUE.cut(D, 0, start);
        if (pa) {
            try {
                var q = D.paragraphs[0].paragraphAttributes;
                q.justification = pa.justification;
                q.leftIndent = pa.leftIndent || 0;
                q.rightIndent = pa.rightIndent || 0;
                q.firstLineIndent = paraStart ? (pa.firstLineIndent || 0) : 0;
            } catch (e1) {}
        }
        return D.geometricBounds;
    } finally { GLUE.drop(D); }
};
GLUE.cut = function (D, start, len) {
    if (len <= 0) return;
    var ch = D.textRange.characters;
    try { var r = ch[start]; r.length = len; if (r.length === len) { r.remove(); return; } } catch (e) {}
    for (var q = start + len - 1; q >= start; q--) { try { D.textRange.characters[q].remove(); } catch (e2) {} }
};

GLUE.explodeQuick = function (fr, o, withAttrs) {
    var parts = [], i, out = [], isArea = fr.kind !== TextType.POINTTEXT, raw = fr.contents;
    function brk(c) { return c === "\r" || c === "\n" || c === "\u0003"; }
    function paraOf(at) { var n = 0; for (var j = 0; j < at && j < raw.length; j++) if (raw.charAt(j) === "\r" || raw.charAt(j) === "\n") n++; return n; }
    try {
        if (isArea) {
            var Ls = fr.lines, cur = 0;
            for (i = 0; i < Ls.length; i++) {
                var t0 = Ls[i].contents.replace(/[\r\n\u0003]+$/, ""), at = -1;
                if (t0.length) { at = raw.indexOf(t0, cur); }
                else at = cur < raw.length && brk(raw.charAt(cur)) && i > 0 ? cur + 1 : cur;
                if (at < 0) { parts = []; break; }
                var pc = at > 0 ? raw.charAt(at - 1) : "";
                parts.push({ t: t0, at: at, hb: i ? (pc === "\u0003" ? "s" : (pc === "\r" || pc === "\n" ? "p" : "w")) : null, p: paraOf(at) });
                cur = at + t0.length;
            }
        }
    } catch (e) { parts = []; }
    if (!parts.length) {
        var cs = "", hb = null, pi = 0, st = 0;
        for (i = 0; i <= raw.length; i++) {
            var c = i < raw.length ? raw.charAt(i) : "\r";
            if (brk(c)) { parts.push({ t: cs, at: st, hb: hb, p: pi }); cs = ""; hb = c === "\u0003" ? "s" : "p"; if (hb === "p") pi++; st = i + 1; }
            else cs += c;
        }
    }
    var pars = null, pa = [], fch = null, nOk = 0, pm = GLUE.paraMap(raw);
    try { pars = fr.paragraphs; } catch (e1) {}
    try { fch = fr.textRange.characters; } catch (e1b) {}
    function attrsOf(k) {
        if (pa[k]) return pa[k];
        var ca = null, r = { size: 12, lead: 14.4, font: "", fill: null, a: null, sb: 0, sa: 0, amt: 120 };
        ca = GLUE.paraCA(fr, fch, raw, pm, k);
        try { var pp = GLUE.paraPA(fch, pars, pm, k); r.sb = pp.spaceBefore || 0; r.sa = pp.spaceAfter || 0; if (pp.autoLeadingAmount > 0) r.amt = pp.autoLeadingAmount; } catch (e5) {}
        try { r.size = ca.size; r.font = ca.textFont.name; r.fill = ca.fillColor; } catch (e3) {}
        try { r.lead = ca.autoLeading ? r.size * r.amt / 100 : ca.leading; } catch (e4) { r.lead = r.size * r.amt / 100; }
        if (withAttrs) { try { r.a = GLUE.readAttr(ca, o); } catch (e6) { r.a = null; } }
        return (pa[k] = r);
    }
    function justOf(k) { try { return GLUE.paraPA(fch, pars, pm, k).justification || Justification.LEFT; } catch (e) { return Justification.LEFT; } }
    function lineLead(pt, A) {
        if (!fch) return A.lead;
        var L = 0, n = pt.t.length, j, ca, v;
        if (pt.at + n < raw.length && brk(raw.charAt(pt.at + n))) n++;
        for (j = 0; j < n; j++) {
            if (!withAttrs && j && j !== n - 1) continue;
            try { ca = fch[pt.at + j].characterAttributes; v = ca.autoLeading ? ca.size * A.amt / 100 : ca.leading; if (v > L) L = v; } catch (e) {}
        }
        return L || A.lead;
    }
    var b = fr.geometricBounds, y;
    var A0 = attrsOf(parts.length ? parts[0].p : 0);
    if (!isArea) { try { y = fr.anchor[1]; } catch (e7) { y = b[1] - A0.size * 0.8; } }
    else y = b[1] - A0.size * 0.8;
    var k = 0;
    for (i = 0; i < parts.length; i++) k = Math.max(k, parts[i].t.replace(/\s+$/, "").length * attrsOf(parts[i].p).size);
    k = k > 0 ? (b[2] - b[0]) / k : 0.5;
    for (i = 0; i < parts.length; i++) {
        var A = attrsOf(parts[i].p);
        if (i > 0) {
            y -= lineLead(parts[i], A);
            if (parts[i].hb === "p") { y -= A.sb; if (parts[i - 1].p !== parts[i].p) y -= attrsOf(parts[i - 1].p).sa; }
        }
        var t = parts[i].t.replace(/[\r\u0003\n]/g, "").replace(/\s+$/, ""), tk = [], vis = 0;
        for (var q = 0; q < t.length; q++) {
            var c2 = t.charAt(q) === "\t" ? " " : t.charAt(q), ca2 = A.a;
            if (withAttrs && fch && c2 !== " ") { try { ca2 = GLUE.readAttr(fch[parts[i].at + q].characterAttributes, o); } catch (e8) { ca2 = A.a; } }
            if (ca2) nOk++;
            tk.push({ ch: c2, a: ca2 });
            if (c2 !== " ") vis++;
        }
        if (!vis) continue;
        var w = t.length * A.size * k, l = b[0], just = justOf(parts[i].p);
        if (just === Justification.CENTER) l = (b[0] + b[2]) / 2 - w / 2;
        if (just === Justification.RIGHT) l = b[2] - w;
        out.push({ toks: tk, size: A.size, base: y, left: l, right: l + w, text: t, vis: vis, font: A.font, hb: parts[i].hb,
                   sk: A.font + "|" + GLUE.rnd(A.size) + "|" + GLUE.colorKey(A.fill), fr: fr, frL: isArea ? b[0] : undefined, frR: isArea ? b[2] : undefined });
    }
    if (withAttrs) {
        if (out.length && !nOk) throw new Error(GLUE.t("attrs"));
        var last = null, j2, q2;
        for (j2 = 0; j2 < out.length; j2++) for (q2 = 0; q2 < out[j2].toks.length; q2++) { if (out[j2].toks[q2].a) last = out[j2].toks[q2].a; else out[j2].toks[q2].a = last; }
        for (j2 = out.length - 1; j2 >= 0; j2--) for (q2 = out[j2].toks.length - 1; q2 >= 0; q2--) { if (out[j2].toks[q2].a) last = out[j2].toks[q2].a; else out[j2].toks[q2].a = last; }
        for (j2 = 0; j2 < out.length; j2++) { var mx = 0; for (q2 = 0; q2 < out[j2].toks.length; q2++) if (out[j2].toks[q2].a.size > mx) mx = out[j2].toks[q2].a.size; if (mx) out[j2].size = mx; }
    }
    return out;
};

GLUE.paraMap = function (raw) {
    var st = [0], en = [], i;
    for (i = 0; i < raw.length; i++) { var c = raw.charAt(i); if (c === "\r" || c === "\n") { en.push(i); st.push(i + 1); } }
    en.push(raw.length);
    return { start: st, end: en, len: raw.length };
};
GLUE.paraPA = function (fch, pars, pm, k) {
    var i = pm.start[k];
    if (fch && i !== undefined) {
        if (i >= pm.len && i > 0) i = pm.len - 1;
        try { var p = fch[i].paragraphAttributes; p.spaceBefore; return p; } catch (e) {}
    }
    try { if (pars && pars.length === pm.start.length) return pars[k].paragraphAttributes; } catch (e1) {}
    return null;
};
GLUE.paraCA = function (fr, fch, raw, pm, k) {
    var n = pm.start.length, d, j, q;
    if (fch) {
        for (d = 0; d < n; d++) {
            for (j = k - d; j <= k + d; j += d ? 2 * d : 1) {
                if (j < 0 || j >= n) continue;
                for (q = pm.start[j]; q < pm.end[j]; q++) {
                    if (/\s/.test(raw.charAt(q)) || raw.charAt(q) === "\u0003") continue;
                    try { var ca = fch[q].characterAttributes; ca.size; return ca; } catch (e1) {}
                    break;
                }
            }
        }
    }
    try { return fr.textRange.characterAttributes; } catch (e2) {}
    return null;
};
GLUE.defAttr = function () {
    return { font: null, size: 12, fill: null, stroke: null, sw: 0, hs: 100, vs: 100, bs: 0, tr: 0, ul: false, st: false, sk: "|12|none", key: "default" };
};

GLUE.decorate = function (infos, deco, o, precise) {
    var used = [], i;
    if (!deco || !deco.length || !infos.length) return used;
    var n0 = infos.length;
    for (i = 0; i < deco.length; i++) {
        var d = deco[i], b;
        try { b = d.geometricBounds; } catch (e) { continue; }
        var hit = GLUE.decoLine(infos, n0, b);
        if (hit) { GLUE.markDeco(hit.items, b[0], b[2], hit.kind, precise); used.push(d); continue; }
        var bl = GLUE.decoBullet(infos, n0, d, b, precise);
        if (bl) { infos.push(bl); used.push(d); }
    }
    return used;
};

GLUE.decoLine = function (infos, n0, b) {
    var l = b[0], t = b[1], r = b[2], bt = b[3], h = t - bt, cy = (t + bt) / 2, items = [], kind = null, size = 0, i;
    if (r - l <= 0 || h < 0) return null;
    for (i = 0; i < n0; i++) {
        var f = infos[i];
        if (f.right <= l || f.left >= r) continue;
        if (h > Math.max(0.15 * f.size, 0.6)) continue;
        var rel = (cy - f.base) / f.size;
        var k = (rel <= 0.03 && rel >= -0.4) ? "u" : ((rel >= 0.15 && rel <= 0.5) ? "s" : null);
        if (!k || (kind && k !== kind)) continue;
        kind = k; items.push(f); size = Math.max(size, f.size);
    }
    if (!items.length) return null;
    var base0 = items[0].base, rowL = 1e9, rowR = -1e9;
    for (i = 1; i < items.length; i++) if (Math.abs(items[i].base - base0) > 0.4 * size) return null;
    for (i = 0; i < n0; i++) if (Math.abs(infos[i].base - base0) <= 0.4 * size) {
        rowL = Math.min(rowL, infos[i].left); rowR = Math.max(rowR, infos[i].right);
    }
    if (l < rowL - 0.6 * size || r > rowR + 0.6 * size) return null;
    return { items: items, kind: kind };
};

GLUE.markDeco = function (items, l, r, kind, precise) {
    for (var i = 0; i < items.length; i++) {
        var f = items[i], n = f.toks.length;
        for (var q = 0; q < n; q++) {
            var cx = f.left + (f.right - f.left) * (q + 0.5) / n;
            if (cx < l - 0.1 || cx > r + 0.1 || !f.toks[q].a || !precise) continue;
            var a = GLUE.cloneA(f.toks[q].a);
            if (kind === "u") a.ul = true; else a.st = true;
            a.key += "|" + kind;
            f.toks[q] = { ch: f.toks[q].ch, a: a };
        }
    }
};

GLUE.decoBullet = function (infos, n0, d, b, precise) {
    var l = b[0], t = b[1], r = b[2], bt = b[3], w = r - l, h = t - bt, cy = (t + bt) / 2, i;
    if (w <= 0 || h <= 0) return null;
    try { if (d.typename === "PathItem" && (!d.closed || !d.filled)) return null; } catch (e) {}
    var best = null, bd = 1e9;
    for (i = 0; i < n0; i++) {
        var f = infos[i], gap = f.left - r;
        if (gap < -0.1 || gap > 3 * f.size) continue;
        if (w > 0.7 * f.size || h > 0.7 * f.size || w < 0.12 * f.size || h < 0.12 * f.size) continue;
        if (w / h > 1.8 || h / w > 1.8) continue;
        if (cy < f.base - 0.1 * f.size || cy > f.base + 0.75 * f.size) continue;
        if (gap < bd) { bd = gap; best = f; }
    }
    if (!best) return null;
    for (i = 0; i < n0; i++) {
        var g = infos[i];
        if (g !== best && Math.abs(g.base - best.base) <= 0.4 * best.size && g.left < best.left && g.right > l) return null;
    }
    var a = null;
    if (precise) {
        for (i = 0; i < best.toks.length && !a; i++) if (best.toks[i].a && best.toks[i].ch !== " ") a = GLUE.cloneA(best.toks[i].a);
        try { if (a && d.fillColor) { a.fill = d.fillColor; a.key += "|b" + GLUE.colorKey(d.fillColor); } } catch (e2) {}
    }
    return { toks: [{ ch: "•", a: a }], size: best.size, base: best.base, left: l, right: r, text: "•", vis: 1,
             sk: best.sk, font: best.font, fr: null, bullet: true };
};

GLUE.cloneA = function (a) {
    var c = {};
    for (var k in a) if (a.hasOwnProperty(k)) c[k] = a[k];
    return c;
};

GLUE.frameInfo = function (fr, o) {
    var ch = fr.textRange.characters, cnt = ch.length;
    if (!cnt) return null;
    var tk = [], maxS = 0, txt = "", vis = 0, skc = {}, sk = "", skN = -1, lastA = null;
    for (var q = 0; q < cnt; q++) {
        var cc = ch[q], s = cc.contents;
        if (s === "\r" || s === "\n" || s === "\u0003" || s === "\t") s = " ";
        var a = null;
        try { a = GLUE.readAttr(cc.characterAttributes, o); } catch (eA) { a = lastA; }
        if (!a) { try { a = GLUE.readAttr(fr.textRange.characterAttributes, o); } catch (eB) { throw new Error(GLUE.t("attrs")); } }
        lastA = a;
        if (a.size > maxS) maxS = a.size;
        if (s !== " ") {
            vis++;
            skc[a.sk] = (skc[a.sk] || 0) + 1;
            if (skc[a.sk] > skN) { skN = skc[a.sk]; sk = a.sk; }
        }
        tk.push({ ch: s, a: a });
        txt += s;
    }
    if (!vis) return null;
    var b = fr.geometricBounds, base;
    try { base = fr.anchor[1]; } catch (e) { base = b[3] + maxS * 0.2; }
    if (fr.kind !== TextType.POINTTEXT) base = b[3] + maxS * 0.2;
    return { toks: tk, size: maxS, base: base, left: b[0], right: b[2], text: txt, vis: vis, sk: sk, fr: fr };
};

GLUE.groupLines = function (infos, opt) {
    infos.sort(function (a, b) { return b.base - a.base; });
    var lines = [], i;
    for (i = 0; i < infos.length; i++) {
        var f = infos[i], L = lines.length ? lines[lines.length - 1] : null;
        if (L && Math.abs(L.ref - f.base) <= 0.4 * Math.max(L.size, f.size)) {
            L.items.push(f);
            if (f.size > L.size) { L.size = f.size; L.ref = f.base; }
        } else lines.push({ items: [f], ref: f.base, size: f.size });
    }
    var out = [];
    for (i = 0; i < lines.length; i++) { GLUE.buildLine(lines[i], opt); if (lines[i].toks.length) out.push(lines[i]); }
    return out;
};

GLUE.letterGap = function (items) {
    var g = [], q;
    for (q = 1; q < items.length; q++) {
        var a = items[q - 1], b = items[q];
        if (a.vis !== 1 || b.vis !== 1 || a.text.length !== 1 || b.text.length !== 1) continue;
        if (a.text === b.text && Math.abs(a.left - b.left) < a.size * 0.05) continue;
        g.push((b.left - a.right) / Math.min(a.size, b.size));
    }
    if (g.length < 3) return 0;
    g.sort(function (x, y) { return x - y; });
    var t = [];
    for (q = 0; q < g.length && g[q] <= g[0] + 0.1; q++) t.push(g[q]);
    if (t.length < g.length * 0.5) return 0;
    return Math.max(0, GLUE.median(t));
};

GLUE.buildLine = function (line, opt) {
    line.items.sort(function (a, b) { return a.left - b.left; });
    var lg = GLUE.letterGap(line.items);
    var out = [], prev = null, starts = [], bulletItem = false;
    line.left = 1e9; line.right = -1e9;
    for (var q = 0; q < line.items.length; q++) {
        var it = line.items[q];
        if (prev && it.text === prev.text && Math.abs(it.left - prev.left) < it.size * 0.05) continue;
        if (prev && out.length) {
            var gap = it.left - prev.right;
            if (gap > (lg + opt.gap) * Math.min(it.size, prev.size) && out[out.length - 1].ch !== " " && it.toks[0].ch !== " ")
                out.push({ ch: " ", a: out[out.length - 1].a });
            else if (prev.bullet && out[out.length - 1].ch !== " ") out.push({ ch: " ", a: out[out.length - 1].a });
        }
        if (q === 0 && it.bullet) bulletItem = true;
        starts.push({ idx: out.length, left: it.left, right: it.right, n: it.toks.length });
        var shift = it.base - line.ref;
        for (var r = 0; r < it.toks.length; r++) {
            var tt = { ch: it.toks[r].ch, a: it.toks[r].a };
            if (Math.abs(shift) > 0.5) tt.extra = shift;
            if (tt.ch === " " && out.length && out[out.length - 1].ch === " ") continue;
            out.push(tt);
        }
        if (it.left < line.left) line.left = it.left;
        if (it.right > line.right) line.right = it.right;
        prev = it;
    }
    var lead0 = 0;
    while (out.length && out[0].ch === " ") { out.shift(); lead0++; }
    while (out.length && out[out.length - 1].ch === " ") out.pop();
    line.toks = out;
    GLUE.findMarker(line, starts, lead0, bulletItem);
    line.hb = line.items.length ? line.items[0].hb : null;
    var w = {}, best = -1;
    line.sk = "";
    for (q = 0; q < line.items.length; q++) {
        var k = line.items[q].sk || "";
        w[k] = (w[k] || 0) + line.items[q].vis;
        if (w[k] > best) { best = w[k]; line.sk = k; }
    }
    var parts = line.sk.split("|");
    line.font = parts[0] || "";
    line.fsize = parseFloat(parts[1]) || line.size;
    line.color = parts[2] || "";
};

GLUE.MARK = /^([•·▪▫●○■□◦‣⁃–—\-\*✓✔➤►▸→]|\d{1,3}[.)]|[A-Za-zА-я][.)])$/;
GLUE.markClass = function (m) {
    if (/^\d/.test(m)) return "num";
    if (/^[A-Za-zА-я][.)]$/.test(m)) return "let";
    return "g" + m;
};
GLUE.findMarker = function (line, starts, lead0, bulletItem) {
    line.mk = null;
    var t = line.toks, sp = -1, m = "", q;
    for (q = 0; q < t.length && q < 6; q++) { if (t[q].ch === " ") { sp = q; break; } m += t[q].ch; }
    if (sp <= 0 || sp >= t.length - 1 || !GLUE.MARK.test(m)) return;
    var tl = null;
    for (q = 0; q < starts.length; q++) if (starts[q].idx - lead0 > sp) { tl = starts[q].left; break; }
    if (tl === null) {
        var it = starts[0];
        tl = it ? it.left + (it.right - it.left) * (sp + 1) / Math.max(1, it.n) : line.left;
    }
    line.mk = { s: sp, left: line.left, textLeft: tl, cls: GLUE.markClass(m), sure: bulletItem };
};

GLUE.restyle = function (a, b, minL, maxR) {
    if (Math.abs(a.fsize - b.fsize) > 0.03 * Math.max(a.fsize, b.fsize)) return true;
    if (a.color !== b.color) return true;
    if (a.font !== b.font) return (a.right - a.left) < 0.7 * (maxR - minL);
    return false;
};

GLUE.hasBig = function (L) { return L.size > L.fsize * 1.15; };

GLUE.tight = function (d) {
    if (!d.length) return 0;
    d.sort(function (x, y) { return x - y; });
    var t = [];
    for (var i = 0; i < d.length && d[i] <= d[0] * 1.2; i++) t.push(d[i]);
    return GLUE.median(t);
};

GLUE.styleLeads = function (lines, gLead, opt) {
    var by = {}, out = {}, all = [], ratios = [], id, i, v;
    for (i = 1; i < lines.length; i++) {
        var a = lines[i - 1], b = lines[i];
        if (GLUE.hasBig(a) || GLUE.hasBig(b)) continue;
        v = a.ref - b.ref;
        if (v <= 0.5 * b.fsize) continue;
        all.push(v / Math.max(a.fsize, b.fsize));
        if (GLUE.styleId(a) !== GLUE.styleId(b)) continue;
        id = GLUE.styleId(b);
        (by[id] = by[id] || []).push(v);
    }
    var ref = all.length ? GLUE.tight(all) : 1.2;
    if (!(ref > 0.8 && ref < 3)) ref = 1.2;
    for (id in by) if (by.hasOwnProperty(id)) {
        var fs = parseFloat(id.split("|")[1]), L = GLUE.tight(by[id]);
        if (L / fs > ref * opt.para) continue;
        out[id] = L;
        ratios.push(L / fs);
    }
    out.ratio = ratios.length ? Math.min(GLUE.median(ratios), ref * opt.para) : ref;
    return out;
};

GLUE.expectLead = function (L, leads) {
    var e = leads[GLUE.styleId(L)] || L.fsize * leads.ratio;
    if (GLUE.hasBig(L)) e = Math.max(e, L.size * leads.ratio);
    return e;
};

GLUE.globalLead = function (lines) {
    var d = [], i;
    for (i = 1; i < lines.length; i++) {
        var v = lines[i - 1].ref - lines[i].ref;
        if (v > 0.5 * Math.min(lines[i - 1].size, lines[i].size)) d.push(v);
    }
    if (!d.length) return lines[0].size * 1.2;
    d.sort(function (x, y) { return x - y; });
    var tight = [];
    for (i = 0; i < d.length && d[i] <= d[0] * 1.2; i++) tight.push(d[i]);
    return GLUE.median(tight);
};

GLUE.splitParas = function (lines, gLead, opt) {
    var paras = [], cur = { lines: [lines[0]], gapBefore: 0 }, i, k, maxR = -1e9, minL = 1e9;
    paras.push(cur);
    for (i = 0; i < lines.length; i++) {
        if (lines[i].right > maxR) maxR = lines[i].right;
        if (lines[i].left < minL) minL = lines[i].left;
    }
    var leads = GLUE.styleLeads(lines, gLead, opt);
    var atLeft = 0;
    for (i = 0; i < lines.length; i++) if (lines[i].left - minL <= 0.3 * lines[i].fsize) atLeft++;
    var leftBlock = lines.length >= 3 && atLeft >= 0.6 * lines.length;
    var mcount = {};
    for (i = 0; i < lines.length; i++) if (lines[i].mk) mcount[lines[i].mk.cls] = (mcount[lines[i].mk.cls] || 0) + 1;
    for (i = 0; i < lines.length; i++) if (lines[i].mk && !lines[i].mk.sure && mcount[lines[i].mk.cls] < 2) lines[i].mk = null;
    for (i = 1; i < lines.length; i++) {
        var d = lines[i - 1].ref - lines[i].ref;
        var restyle = GLUE.restyle(lines[i - 1], lines[i], minL, maxR);
        var item = cur.lines[0].mk;
        var cont = !lines[i].mk && item && Math.abs(lines[i].left - item.textLeft) <= 0.5 * lines[i].fsize;
        var indent = !cont && leftBlock && lines[i].left - minL > 0.6 * lines[i].fsize &&
            lines[i].left - lines[i - 1].left > 0.6 * lines[i].fsize && lines[i].left - minL < 4 * lines[i].fsize;
        var startItem = !!lines[i].mk;
        if (lines[i].hb === "p" && (lines[i - 1].right - lines[i - 1].left) < 0.75 * (maxR - minL)) startItem = true;
        var endList = item && !lines[i].mk && !cont;
        if (d > opt.para * GLUE.expectLead(lines[i], leads) || restyle || indent || startItem || endList) { cur = { lines: [lines[i]], gapBefore: d }; paras.push(cur); }
        else cur.lines.push(lines[i]);
    }
    var byStyle = {};
    for (i = 0; i < paras.length; i++) {
        var p = paras[i], dd = [];
        for (k = 1; k < p.lines.length; k++) if (!GLUE.hasBig(p.lines[k]) && !GLUE.hasBig(p.lines[k - 1])) dd.push(p.lines[k - 1].ref - p.lines[k].ref);
        if (dd.length) { p.lead = GLUE.median(dd); byStyle[GLUE.styleId(p.lines[0])] = p.lead; }
    }
    for (i = 0; i < paras.length; i++) {
        var q = paras[i], s = q.lines[0].size;
        if (!q.lead) q.lead = byStyle[GLUE.styleId(q.lines[0])] || leads[GLUE.styleId(q.lines[0])] || q.lines[0].fsize * leads.ratio;
        if (i > 0 && q.lines.length === 1 && q.gapBefore < q.lead) q.lead = q.gapBefore;
        q.spaceBefore = i > 0 ? Math.max(0, q.gapBefore - q.lead) : 0;
    }
    return paras;
};

GLUE.styleId = function (L) { return L.font + "|" + Math.round(L.fsize * 2) / 2 + "|" + L.color; };

GLUE.detectJust = function (all) {
    var lefts = [], rights = [], centers = [], i;
    for (i = 0; i < all.length; i++) {
        lefts.push(all[i].left); rights.push(all[i].right); centers.push((all[i].left + all[i].right) / 2);
    }
    var tol = all[0].size * 0.15;
    if (all.length > 1 && GLUE.spread(lefts) > tol) {
        if (GLUE.spread(centers) <= tol) return Justification.CENTER;
        if (GLUE.spread(rights) <= tol) return Justification.RIGHT;
    }
    return Justification.LEFT;
};

GLUE.makeText = function (host, paras, kind, opt, gLead, src, join) {
    var all = [], i, k;
    for (i = 0; i < paras.length; i++) for (k = 0; k < paras[i].lines.length; k++) all.push(paras[i].lines[k]);

    var minL = 1e9, maxR = -1e9;
    for (i = 0; i < all.length; i++) {
        if (all[i].left < minL) minL = all[i].left;
        if (all[i].right > maxR) maxR = all[i].right;
    }
    var just = GLUE.detectJust(all);

    var toks = [], spans = [];
    for (i = 0; i < paras.length; i++) {
        if (i > 0) toks.push({ ch: "\r", a: null });
        var pl = paras[i].lines;
        for (k = 0; k < pl.length; k++) {
            var lt = pl[k].toks;
            if (k > 0) {
                var last = toks[toks.length - 1];
                var prev2 = toks.length > 1 ? toks[toks.length - 2].ch : "";
                var hy = GLUE.isHyphen(last.ch) && GLUE.isLetter(prev2);
                if (!join) toks.push({ ch: "\u0003", a: null });
                else if (hy) { if (opt.hyph && GLUE.isLower(lt[0].ch)) toks.pop(); }
                else toks.push({ ch: " ", a: last.a });
            }
            spans.push({ start: toks.length, len: lt.length, p: i, k: k, line: pl[k] });
            for (var t = 0; t < lt.length; t++) {
                if (k === 0 && paras[i].tab === t && lt[t].ch === " ") toks.push({ ch: "\t", a: lt[t].a });
                else toks.push(lt[t]);
            }
        }
    }
    var str = "";
    for (i = 0; i < toks.length; i++) str += toks[i].ch;

    var counts = {}, dom = null, best = -1;
    for (i = 0; i < toks.length; i++) {
        if (!toks[i].a) continue;
        var key = toks[i].a.key;
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] > best) { best = counts[key]; dom = toks[i].a; }
    }

    var s0 = all[0].size, asc = s0 * 0.8, tf, mixedJ = false, pad = s0 * 0.6;
    for (i = 0; i < paras.length; i++) if (paras[i].just && paras[i].just !== (paras[0].just || just)) mixedJ = true;
    if (!mixedJ && paras[0].just) just = paras[0].just;
    if (kind === "area") {
        var left = minL, width = (maxR - minL) + pad, fL = 1e9, fR = -1e9, allF = true;
        if (!mixedJ && just === Justification.CENTER) left -= pad / 2;
        if (!mixedJ && just === Justification.RIGHT) left -= pad;
        for (i = 0; i < all.length && allF; i++) {
            var its = all[i].items || [];
            if (!its.length) allF = false;
            for (k = 0; k < its.length; k++) {
                if (its[k].frL === undefined) { allF = false; break; }
                if (its[k].frL < fL) fL = its[k].frL;
                if (its[k].frR > fR) fR = its[k].frR;
            }
        }
        if (allF && fR - fL > s0 && minL >= fL - s0 && maxR <= fR + s0) { left = fL; width = fR - fL; }
        var height = (all[0].ref - all[all.length - 1].ref) + asc + gLead * 3 + s0;
        var rect = host.pathItems.rectangle(all[0].ref + asc, left, width, height);
        tf = host.textFrames.areaText(rect);
        try { tf.firstBaseline = FirstBaselineType.FIXED; tf.firstBaselineMin = asc; } catch (e) {}
    } else {
        var ax = minL;
        if (just === Justification.CENTER) ax = (minL + maxR) / 2;
        if (just === Justification.RIGHT) ax = maxR;
        tf = host.textFrames.pointText([ax, all[0].ref]);
    }
    tf.contents = str;

    var tr = tf.textRange;
    if (dom) GLUE.applyAttr(tr.characterAttributes, dom, 0, opt);
    try { tr.characterAttributes.autoLeading = false; tr.characterAttributes.leading = gLead; } catch (e2) {}

    if (tr.characters.length === toks.length) GLUE.applyRuns(tr, toks, dom, opt);
    else GLUE.applyByMatch(tr, toks, dom, opt);

    var tps = tf.paragraphs;
    for (i = 0; i < tps.length && i < paras.length; i++) {
        try {
            var pr = tps[i];
            pr.characterAttributes.autoLeading = false;
            pr.characterAttributes.leading = paras[i].lead;
            var pj = paras[i].just || just;
            pr.paragraphAttributes.justification = pj;
            pr.paragraphAttributes.spaceBefore = paras[i].spaceBefore || 0;
            pr.paragraphAttributes.spaceAfter = 0;
            pr.paragraphAttributes.hyphenation = false;
            pr.paragraphAttributes.firstLineIndent = paras[i].fli || 0;
            pr.paragraphAttributes.leftIndent = paras[i].li || 0;
            pr.paragraphAttributes.rightIndent = (mixedJ && kind === "area" && pj !== Justification.LEFT) ? pad : 0;
        } catch (e3) {}
    }
    if (opt.mode !== "single" && tr.characters.length === toks.length) GLUE.lineLeading(tr, spans, paras);
    if (kind === "area") GLUE.fitHeight(tf, all, asc, gLead);
    try { tf.move(host, ElementPlacement.PLACEATBEGINNING); } catch (e4) {}
    return tf;
};

GLUE.lineLeading = function (tr, spans, paras) {
    for (var i = 1; i < spans.length; i++) {
        var sp = spans[i], p = paras[sp.p];
        var want = spans[i - 1].line.ref - sp.line.ref;
        if (sp.k === 0) want -= (p.spaceBefore || 0);
        if (want <= 0 || Math.abs(want - p.lead) < 0.3) continue;
        GLUE.rangeDo(tr, sp.start, sp.len, function (ca) { ca.autoLeading = false; ca.leading = want; });
    }
};

GLUE.rangeDo = function (tr, start, len, fn) {
    var chars = tr.characters, ok = false;
    if (len > 1) {
        try {
            var r = chars[start];
            r.length = len;
            if (r.length === len) { fn(r.characterAttributes); ok = true; }
        } catch (e) {}
    }
    if (!ok) for (var q = start; q < start + len; q++) { try { fn(chars[q].characterAttributes); } catch (e2) {} }
};

GLUE.applyRuns = function (tr, toks, dom, opt) {
    var i = 0, n = toks.length;
    while (i < n) {
        var tk = toks[i];
        if (!tk.a || (dom && tk.a.key === dom.key && !tk.extra)) { i++; continue; }
        var ex = tk.extra || 0, j = i + 1;
        while (j < n && toks[j].a && toks[j].a.key === tk.a.key && (toks[j].extra || 0) === ex) j++;
        GLUE.applyRange(tr, i, j - i, tk.a, ex, opt);
        i = j;
    }
};

GLUE.applyRange = function (tr, start, len, a, extra, opt) {
    var chars = tr.characters, ok = false;
    if (len > 1) {
        try {
            var r = chars[start];
            r.length = len;
            if (r.length === len) { GLUE.applyAttr(r.characterAttributes, a, extra, opt); ok = true; }
        } catch (e) {}
    }
    if (!ok) for (var q = start; q < start + len; q++) GLUE.applyAttr(chars[q].characterAttributes, a, extra, opt);
};

GLUE.applyByMatch = function (tr, toks, dom, opt) {
    var chars = tr.characters, n = chars.length, j = 0;
    for (var i = 0; i < n; i++) {
        var c = chars[i], oc = c.contents;
        while (j < toks.length && toks[j].ch !== oc && GLUE.isSep(toks[j].ch)) j++;
        if (j >= toks.length) break;
        var tk = toks[j]; j++;
        if (!tk.a) continue;
        if (dom && tk.a.key === dom.key && !tk.extra) continue;
        GLUE.applyAttr(c.characterAttributes, tk.a, tk.extra || 0, opt);
    }
};

GLUE.fitHeight = function (tf, all, asc, lead) {
    try {
        var path = tf.textPath, last = all[all.length - 1];
        var need = asc + (all[0].ref - last.ref) + last.size * 0.35;
        var t0 = path.top, l0 = path.left;
        if (need > 0 && need < path.height) { path.height = need; path.top = t0; path.left = l0; }
        for (var k = 0; k < 40 && GLUE.overflows(tf, all.length); k++) {
            path.height = path.height + lead; path.top = t0; path.left = l0;
        }
    } catch (e) {}
};
GLUE.overflows = function (tf, nLines) {
    try {
        var L = tf.lines, vis = 0;
        if (L.length < nLines) return true;
        for (var i = 0; i < L.length; i++) vis += L[i].characters.length;
        return vis + tf.paragraphs.length + 1 < tf.characters.length;
    } catch (e) { return false; }
};

GLUE.readAttr = function (ca, o) {
    var a = {};
    try { a.font = ca.textFont; } catch (e) { a.font = null; }
    a.size = ca.size;
    if (!(a.size > 0)) throw new Error(GLUE.t("attrs"));
    try { a.fill = ca.fillColor; } catch (e2) { a.fill = null; }
    try { a.stroke = ca.strokeColor; a.sw = ca.strokeWeight; } catch (e3) { a.stroke = null; a.sw = 0; }
    try { a.hs = ca.horizontalScale; a.vs = ca.verticalScale; a.bs = ca.baselineShift; a.tr = ca.tracking; } catch (e5) { a.hs = 100; a.vs = 100; a.bs = 0; a.tr = 0; }
    try { a.ul = !!ca.underline; a.st = !!ca.strikeThrough; } catch (e4) { a.ul = false; a.st = false; }
    a.sk = (a.font ? a.font.name : "") + "|" + GLUE.rnd(a.size) + "|" + GLUE.colorKey(a.fill);
    a.key = (a.font ? a.font.name : "") + "|" + GLUE.rnd(a.size) + "|" + GLUE.colorKey(a.fill) + "|" +
        GLUE.colorKey(a.stroke) + "/" + GLUE.rnd(a.sw) + "|" +
        GLUE.rnd(a.hs) + "|" + GLUE.rnd(a.vs) + "|" + GLUE.rnd(a.bs) + (a.ul ? "|u" : "") + (a.st ? "|s" : "") + (o.track ? "" : "|" + a.tr);
    return a;
};

GLUE.applyAttr = function (ca, a, extra, o) {
    try { if (a.font) ca.textFont = a.font; } catch (e) {}
    try { ca.size = a.size; } catch (e1) {}
    try { if (a.fill) ca.fillColor = a.fill; } catch (e2) {}
    try { if (a.stroke) { ca.strokeColor = a.stroke; if (a.stroke.typename !== "NoColor") ca.strokeWeight = a.sw; } } catch (e3) {}
    try { ca.horizontalScale = a.hs; ca.verticalScale = a.vs; } catch (e4) {}
    try { ca.baselineShift = a.bs + extra; } catch (e5) {}
    try { ca.tracking = o.track ? 0 : a.tr; } catch (e6) {}
    try { ca.kerningMethod = AutoKernType.AUTO; } catch (e7) {}
    try { ca.underline = !!a.ul; ca.strikeThrough = !!a.st; } catch (e8) {}
};

GLUE.colorKey = function (c) {
    if (!c) return "none";
    var r = GLUE.rnd;
    switch (c.typename) {
        case "RGBColor": return "rgb" + r(c.red) + "," + r(c.green) + "," + r(c.blue);
        case "CMYKColor": return "cmyk" + r(c.cyan) + "," + r(c.magenta) + "," + r(c.yellow) + "," + r(c.black);
        case "GrayColor": return "g" + r(c.gray);
        case "SpotColor": return "s" + c.spot.name + r(c.tint);
        case "GradientColor": try { return "grad" + c.gradient.name; } catch (e) { return "grad"; }
        case "PatternColor": try { return "pat" + c.pattern.name; } catch (e2) { return "pat"; }
        default: return c.typename;
    }
};

GLUE.removeEmptyGroups = function (g) {
    try { while (g && g.typename === "GroupItem" && g.pageItems.length === 0) { var up = g.parent; g.remove(); g = up; } }
    catch (e) {}
};
GLUE.median = function (arr) {
    var a = arr.slice(0); a.sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
GLUE.quantile = function (arr, q) {
    var a = arr.slice(0); a.sort(function (x, y) { return x - y; });
    var pos = (a.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return a[lo] + (a[hi] - a[lo]) * (pos - lo);
};
GLUE.spread = function (arr) {
    var mn = 1e9, mx = -1e9;
    for (var q = 0; q < arr.length; q++) { if (arr[q] < mn) mn = arr[q]; if (arr[q] > mx) mx = arr[q]; }
    return mx - mn;
};
GLUE.rnd = function (v) { return Math.round(v * 100) / 100; };
GLUE.isSep = function (c) { return c === "\r" || c === "\u0003" || c === " " || c === "\t"; };
GLUE.isHyphen = function (c) { return c === "-" || c === "­" || c === "‐"; };
GLUE.isLetter = function (c) { return !!c && c.toLowerCase() !== c.toUpperCase(); };
GLUE.isLower = function (c) { return GLUE.isLetter(c) && c === c.toLowerCase(); };
GLUE.plural = function (n, f) {
    if (f.length === 2) return n === 1 ? f[0] : f[1];
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return f[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return f[1];
    return f[2];
};

GLUE.json = function (v) {
    if (v === null || v === undefined) return "null";
    var t = typeof v, i, out;
    if (t === "number") return isFinite(v) ? String(v) : "null";
    if (t === "boolean") return v ? "true" : "false";
    if (t === "string") {
        return '"' + v.replace(/[\\"\u0000-\u001f]/g, function (c) {
            var m = { "\\": "\\\\", '"': '\\"', "\n": "\\n", "\r": "\\r", "\t": "\\t" };
            return m[c] || ("\\u" + ("0000" + c.charCodeAt(0).toString(16)).slice(-4));
        }) + '"';
    }
    if (v instanceof Array) {
        out = [];
        for (i = 0; i < v.length; i++) out.push(GLUE.json(v[i]));
        return "[" + out.join(",") + "]";
    }
    out = [];
    for (i in v) if (v.hasOwnProperty(i)) out.push(GLUE.json(String(i)) + ":" + GLUE.json(v[i]));
    return "{" + out.join(",") + "}";
};
