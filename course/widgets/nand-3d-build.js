/* Widget: nand-3d-build — "Building 3D NAND" (Module 15, §10–12) */
(function () {
  'use strict';

  // ---------- numbers from Module 15 ----------
  const EXTRA_TIERS = 8;          // select gates + dummy word lines per deck (321 active → ~345 tiers over 3 decks)
  const T_MASK = 3.0;             // µm of carbon hard mask (2–4 µm) the ions must also travel through
  const RATE = 100, CRYO = 2.5;   // nm/min: ~1 h per ~6 µm deck; Lam's cryogenic etch (2024) is ~2.5× faster
  const WSPM = 100000, CH_HOURS = 600;   // fab wafer starts per month; productive chamber-hours per month
  const TB_BITS = 2 ** 40, BITS_PER_CELL = 3, TIERS_PER_PASS = 12;
  const SINGLE_DECK_MAX = 176;    // ~128–176 layers per etch before hole bowing wins
  const HAIR_UM = 70;             // a human hair, for scale
  const OX_NM = 20, SIN_NM = 22, T_BLOCK = 5, T_TRAP = 6, T_TUN = 6, T_POLY = 8, OVERLAY_NM = 25;
  const PRESETS = [
    { name: 'SK hynix', gen: '321-layer, 2025', layers: 321, decks: 3, pitch: 40 },
    { name: 'YMTC', gen: 'Xtacking 4.0', layers: 294, decks: 3, pitch: 42, approx: true },
    { name: 'Samsung', gen: 'V9', layers: 286, decks: 2, pitch: 42, approx: true },
    { name: 'Micron', gen: 'G9', layers: 276, decks: 2, pitch: 42 },
    { name: 'Kioxia / SanDisk', gen: 'BiCS8', layers: 218, decks: 2, pitch: 43 },
  ];
  const STEPS = [
    { t: 'Deposit the ON stack', tool: 'PECVD: Lam Vector, AMAT Producer, TEL', d: 'PECVD lays down alternating films of silicon oxide (SiO₂, ~20 nm) and silicon nitride (SiN, ~22 nm) at 400–550 °C, one pair per future word line, on a wafer whose CMOS periphery (page buffers and decoders) is already built underneath (CuA, CMOS-under-array). The nitride is only a placeholder: it is dissolved and replaced by metal in steps 7–8. Tensile and compressive films alternate so a ~15 µm stack does not warp the wafer.' },
    { t: 'Etch the channel holes', tool: 'HAR dielectric etch: Lam (cryogenic), TEL, AMAT', d: 'A 2–4 µm carbon hard mask is patterned with ~100 nm holes at ~160 nm pitch and a high-power fluorocarbon plasma drills straight down through the deck: ions accelerated by the bias voltage etch the bottom while a Teflon-like polymer protects the walls. Aspect ratio (depth ÷ width) reaches 60–100:1, and at roughly an hour per wafer per deck this is the step a NAND fab is sized around.' },
    { t: 'Line the hole: gate stack + channel', tool: 'ALD: ASM, TEL, Lam Striker', d: 'ALD coats the hole from the outside in: a blocking oxide, the ~6 nm SiN charge-trap layer that will hold the stored electrons, a ~5–7 nm tunnel oxide, then a ~5–10 nm polysilicon channel. The hollow core is filled with oxide (the "macaroni" channel: a thin tube switches off more sharply than a solid pillar), the bottom is punched through to the source, and a 600–800 °C anneal enlarges the poly grains.' },
    { t: 'String-stack the next deck', tool: 'PECVD + HAR etch + ALD again, per deck', d: 'One etch can only manage ~128–176 layers before the hole bows, so the wafer is planarized and another ON stack is deposited and drilled on top. Its holes must land on the lower deck\'s to within an overlay (the positional error between two patterned layers) of ~20–30 nm on a 100 nm hole; a poly plug joins the two channel tubes, and the tiers at the junction are dummies because a misaligned joint makes a poor transistor.', single: 'This device is single-deck (~128–176 layers is the limit of one etch), so the channel hole was drilled through the whole stack in step 2 and this step is skipped. Raise "Decks" below to see string stacking.' },
    { t: 'Carve the staircase', tool: 'KrF/ArF dry litho (Nikon, Canon) + trim etch', d: 'Every word line needs its own contact, so the array edge is cut into a staircase, one landing per tier: a thick resist is exposed with cheap KrF/ArF dry lithography, one tier is etched, the resist edge is trimmed sideways ~100–200 nm by an isotropic plasma (one that etches equally in all directions), the next tier is etched, and so on, ~12 tiers per lithography pass. The staircase costs ~5–8% of the die.' },
    { t: 'Etch the slit', tool: 'HAR dielectric etch', d: 'Long trenches (gate-line cuts) are etched through the entire stack between every 8–12 rows of holes. They expose the edge of every nitride layer, which is the access route for the next two steps, and later carry the source-line contact.' },
    { t: 'Dissolve the nitride', tool: 'Wet bench: SCREEN, TEL, SEMES', d: 'Hot phosphoric acid (H₃PO₄ at 150–170 °C) flows in through the slits and eats every SiN layer sideways, more than 100× faster than it attacks the oxide, leaving the oxide layers as free-standing shelves held up only by the channel pillars. Hole placement is now mechanical design as well as electrical: shelves that span too far between pillars sag and short.' },
    { t: 'Fill the word lines with tungsten', tool: 'ALD/CVD W (WF₆): Lam, AMAT', d: 'ALD lines each cavity with Al₂O₃ (a high-k blocking layer) and TiN, then tungsten from WF₆ fills every gap from the slit inward at 300–400 °C. The W is etched back inside the slit so the layers stay electrically separate, and the slit is refilled with oxide around a source-line contact. Each word line is now a ~20 nm metal sheet millimetres long; its RC delay sets read latency, which is why molybdenum is next.' },
    { t: 'Contacts and bit lines', tool: 'HAR contact etch + Cu BEOL', d: 'High-aspect-ratio contacts drop from the surface onto each staircase landing, and copper bit lines at ~40 nm pitch run over the tops of the strings, one per column of holes, with two or three more metal levels above. The string is complete: bit line, drain-select gate, N cells (one per word line), source-select gate, common source line.' },
  ];
  const ANIM_MS = { 1: 2600, 3: 2200, 6: 2400, 7: 2400 };   // animated steps (0-based) and their durations
  const f1 = n => (+n).toFixed(1);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  window.registerWidget('nand-3d-build', {
    title: 'Building 3D NAND',
    caption: 'Step through the nine-step gate-replacement flow, then drag the layer slider and watch the stack height, hole aspect ratio and etch time follow.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { L: 143, decks: 2, pitch: 42, d: 100, cryo: false };
      let step = 0, a = 1, raf = 0, visible = true, t0 = 0;

      const txt = (x, y, s, o) => { o = o || {}; return svg('text', Object.assign({ x: f1(x), y: f1(y), 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': o.size || 14, 'font-weight': o.bold ? 600 : 400, fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'start' }, o.extra || {}), s); };
      const R = (g, x, y, w, hh, fill, extra) => { if (w <= 0 || hh <= 0) return; g.append(svg('rect', Object.assign({ x: f1(x), y: f1(y), width: f1(w), height: f1(hh), fill }, extra || {}))); };
      const Ln = (g, x1, y1, x2, y2, stroke, extra) => g.append(svg('line', Object.assign({ x1: f1(x1), y1: f1(y1), x2: f1(x2), y2: f1(y2), stroke, 'stroke-width': 1 }, extra || {})));
      const W_FILL = 'var(--ink)', W_OP = { 'fill-opacity': 0.72 };

      // ---------- physics ----------
      function calc() {
        const tiersDeck = st.L + EXTRA_TIERS, hDeck = tiersDeck * st.pitch / 1000, hTot = st.decks * hDeck;
        const rate = RATE * (st.cryo ? CRYO : 1), tEtch = hDeck * 1000 / rate, chHours = st.decks * tEtch / 60;
        const layers = st.L * st.decks, strings = TB_BITS / BITS_PER_CELL / layers;
        return { tiersDeck, hDeck, hTot, ar: (hDeck + T_MASK) / (st.d / 1000), rate, tEtch, chHours, chambers: WSPM * chHours / CH_HOURS, layers, tiers: st.decks * tiersDeck, strings, holes: strings * st.decks, passes: Math.ceil(st.decks * tiersDeck / TIERS_PER_PASS) };
      }

      // ================= Panel A: array cross-section (viewBox 360×340) =================
      const AX0 = 112, AX1 = 352, HOLES = [140, 180, 220], HW = 22, SLIT = [244, 252], STAIR_X = 258, STACK_BOT = 288, TOP_MIN = 98, GAP = 5;
      const AY = [35, 52, 69];   // three annotation baselines above the stack (14 px text, 16 px leading)
      const A = svg('svg', { class: 'w-svg', viewBox: '0 0 360 340', role: 'img', 'aria-label': 'Cross-section of a 3D NAND array being built: ON stack, channel holes, staircase, slit, word lines' });
      function geomA(nDecks) {
        const avail = STACK_BOT - TOP_MIN;
        let deckPx = clamp(56 + 94 * (st.L - 32) / 224, 56, 150);
        if (nDecks * (deckPx + GAP) > avail) deckPx = avail / nDecks - GAP;
        const nP = Math.max(3, Math.round(deckPx / 8)), pairPx = deckPx / nP, decks = []; let bot = STACK_BOT;
        for (let i = 0; i < nDecks; i++) { decks.push({ top: bot - deckPx, bot, capTop: bot - deckPx - GAP }); bot -= deckPx + GAP; }
        return { deckPx, nP, pairPx, decks, top: decks[nDecks - 1].capTop, total: nDecks * nP, stepW: (AX1 - STAIR_X) / (nDecks * nP) };
      }
      function drawA() {
        A.innerHTML = '';
        const s = step + 1, n = calc(), built = s >= 4 ? st.decks : 1, G = geomA(st.decks), DH = G.deckPx + GAP;
        const stair = s >= 5, xr = k => stair ? AX1 - (k + 1) * G.stepW : AX1;   // right edge of drawn pair k (0 = bottom)
        const slitDone = s >= 9 || (s === 8 && a >= 1);
        A.append(txt(2, 14, 'Array cross-section', { bold: true, fill: 'var(--ink)' }), txt(154, 14, '(schematic, not to scale)'));
        R(A, 2, 21, 356, 317, 'var(--panel2)', { 'fill-opacity': 0.5, stroke: 'var(--line2)', rx: 8 });
        // substrate with CMOS-under-array periphery, common source line
        R(A, AX0, 304, AX1 - AX0, 33, 'var(--si)', { 'fill-opacity': 0.32 });
        A.append(txt(AX0 + 6, 317, 'Si wafer · CMOS periphery', { fill: 'var(--ink)' }), txt(AX0 + 6, 334, 'under the array (CuA)', { fill: 'var(--ink)' }));
        R(A, AX0, STACK_BOT, AX1 - AX0, 16, 'var(--accent)', { 'fill-opacity': 0.85 });
        A.append(txt(AX0 + 6, STACK_BOT + 12.5, 'common source line (poly)', { fill: 'var(--panel)' }));
        if (s === 9) R(A, STAIR_X, G.top, AX1 - STAIR_X, STACK_BOT - G.top, 'var(--line2)', { 'fill-opacity': 0.45 });   // oxide back-fill over the staircase
        // ON stack, deck by deck (one drawn pair stands for several real pairs)
        const recess = s === 7 ? a : s >= 8 ? 1 : 0, wfill = s === 8 ? a : s >= 9 ? 1 : 0;
        let k = 0;
        for (let i = 0; i < built; i++) {
          const D = G.decks[i];
          for (let j = 0; j < G.nP; j++, k++) {
            const yb = D.bot - j * G.pairPx, ox = G.pairPx * 0.48, xR = xr(k), yn = yb - G.pairPx, hn = G.pairPx - ox;
            R(A, AX0, yb - ox, xR - AX0, ox, 'var(--line2)');
            if (s < 6) R(A, AX0, yn, xR - AX0, hn, 'var(--si)');   // nitride placeholder, continuous until the slit is cut
            else if (recess < 1) {                              // then receding from the slit at step 7
              const lx = SLIT[0] - recess * (SLIT[0] - AX0), rx = SLIT[1] + recess * (xR - SLIT[1]);
              R(A, AX0, yn, lx - AX0, hn, 'var(--si)'); R(A, rx, yn, xR - rx, hn, 'var(--si)');
            }
            if (wfill > 0) {                                    // tungsten filling from the slit inward at step 8
              const lx = SLIT[0] - wfill * (SLIT[0] - AX0), rx = SLIT[1] + wfill * (xR - SLIT[1]);
              R(A, lx, yn, SLIT[0] - lx, hn, W_FILL, W_OP); R(A, SLIT[1], yn, rx - SLIT[1], hn, W_FILL, W_OP);
            }
          }
          R(A, AX0, D.capTop, xr(k - 1) - AX0, GAP, 'var(--line2)');                 // top oxide / inter-deck oxide
        }
        for (let i = built; i < st.decks; i++) {                 // ghost of decks still to come
          const D = G.decks[i];
          R(A, AX0, D.capTop, AX1 - AX0, D.bot - D.capTop, 'none', { stroke: 'var(--muted)', 'stroke-dasharray': '4 3', 'stroke-width': 1 });
          A.append(txt((AX0 + AX1) / 2, (D.capTop + D.bot) / 2 + 4, 'deck ' + (i + 1) + ' · added in step 4', { anchor: 'middle' }));
        }
        // holes: etched (empty) → lined with ONO + poly channel + oxide core
        const topBuilt = G.decks[built - 1], etching = (s === 2 || (s === 4 && st.decks > 1)) && a < 1;
        for (let i = 0; i < built && s >= 2; i++) {
          const D = G.decks[i], lined = s >= 3 && !(s === 4 && i > 0 && a < 1);
          let depth = DH;
          if (etching) depth = s === 2 ? a * DH : clamp(a * (built - 1) * DH - (built - 1 - i) * DH, 0, DH);
          HOLES.forEach(cx => {
            const x = cx - HW / 2 + (i > 0 ? 2 : 0), y0 = D.capTop;
            if (!lined) { R(A, x, y0, HW, depth, 'var(--panel)'); return; }
            R(A, x, y0, HW, DH, 'var(--si)'); R(A, x + 3, y0, HW - 6, DH, 'var(--line2)');
            R(A, x + 5, y0, HW - 10, DH, 'var(--accent)'); R(A, x + 8, y0, HW - 16, DH, 'var(--line2)');
            if (i > 0) R(A, x - 2, D.bot, HW + 2, GAP, 'var(--accent)');   // inter-deck poly plug
          });
        }
        if (s === 2 || (s === 4 && st.decks > 1 && a < 1)) {     // carbon hard mask on the deck being drilled (stripped before the ALD lining)
          R(A, AX0, topBuilt.capTop - 15, AX1 - AX0, 15, 'var(--muted)', { 'fill-opacity': 0.75 });
          HOLES.forEach(cx => R(A, cx - HW / 2, topBuilt.capTop - 15, HW, 15, 'var(--panel)'));
          A.append(txt(HOLES[2] + HW / 2 + 10, topBuilt.capTop - 3.5, 'hard mask', { fill: 'var(--panel)' }));
        }
        if (s >= 6) {                                            // slit (gate-line cut), later refilled with oxide around a source contact
          R(A, SLIT[0], G.top, SLIT[1] - SLIT[0], STACK_BOT - G.top, slitDone ? 'var(--line2)' : 'var(--panel)');
          if (slitDone) R(A, SLIT[0] + 3, G.top, 2, STACK_BOT - G.top, W_FILL, W_OP);
          if (s < 9) { A.append(txt(SLIT[1] + 3, G.top - 4, 'slit', { fill: 'var(--ink)' })); Ln(A, (SLIT[0] + SLIT[1]) / 2, G.top - 12, (SLIT[0] + SLIT[1]) / 2, G.top - 1, 'var(--ink)'); }
        }
        if (s === 9) {                                           // staircase contacts, word-line wiring, bit line
          for (let q = 0; q < G.total; q++) {
            const cx = xr(q) - G.stepW / 2, yTop = G.decks[Math.floor(q / G.nP)].bot - (q % G.nP + 1) * G.pairPx;
            R(A, cx - 0.9, G.top - 18, 1.8, yTop - G.top + 18, W_FILL, W_OP);
          }
          R(A, STAIR_X - 4, G.top - 20, AX1 - STAIR_X + 4, 3, W_FILL, W_OP);
          R(A, AX0, G.top - 16, SLIT[0] - 4 - AX0, 7, 'var(--cu)');
          HOLES.forEach(cx => R(A, cx - 3, G.top - 9, 6, 9, 'var(--cu)'));
        }
        // ---------- labels in place ----------
        const T = G.decks[built - 1], yOx = T.bot - (G.nP - 1) * G.pairPx - G.pairPx * 0.24, ySiN = T.bot - (G.nP - 1) * G.pairPx - G.pairPx * 0.74;
        const lbl = (yText, yStripe, sLabel, color) => { A.append(txt(104, yText + 4, sLabel, { anchor: 'end', fill: color || 'var(--muted)' })); Ln(A, 106, yText, AX0 - 1, yStripe, 'var(--muted)'); };
        lbl(yOx + 9, yOx, 'SiO₂ ~' + OX_NM + ' nm');
        lbl(ySiN - 5, ySiN, slitDone ? 'W word line' : s >= 7 ? (a >= 1 || s === 8 ? 'SiN dissolved' : 'SiN dissolving…') : 'SiN ~' + SIN_NM + ' nm', s >= 7 ? 'var(--ink)' : undefined);
        for (let i = 0; i < built; i++) {
          const D = G.decks[i], y = (D.top + D.bot) / 2;
          if (i === built - 1 && G.deckPx < 64) { A.append(txt(104, y + 7, 'deck ' + (i + 1), { anchor: 'end', fill: 'var(--ink)' })); continue; }
          A.append(txt(104, y - 4, 'deck ' + (i + 1), { anchor: 'end', fill: 'var(--ink)' }), txt(104, y + 13, st.L + ' layers', { anchor: 'end' }));
        }
        if (s >= 4 && st.decks > 1) A.append(txt(104, G.decks[0].capTop + 4, 'inter-deck plug', { anchor: 'end', fill: 'var(--accent)' }));
        const ann = (lines) => lines.forEach((L, i) => { if (L) A.append(txt(10, AY[i], L[0], Object.assign({ fill: 'var(--ink)' }, L[1] || {}))); });
        if (s === 1) ann([['ON stack: pitch ~' + st.pitch + ' nm · ' + n.tiersDeck + ' tiers per deck'], ['each stripe pair drawn ≈ ' + Math.round(n.tiersDeck / G.nP) + ' real pairs', { fill: 'var(--muted)' }]]);
        if (s === 2 || (s === 4 && st.decks > 1)) {
          const depthUm = (etching ? a : 1) * n.hDeck;
          ann([['carbon hard mask 2–4 µm, then plasma etch'], ['channel holes ⌀ ' + st.d + ' nm, AR ' + fmt(n.ar, 0) + ':1'], [(etching ? 'etching… ' : 'etched ') + f1(depthUm) + ' / ' + f1(n.hDeck) + ' µm · ' + fmt(depthUm * 1000 / n.rate, 0) + ' min', { mono: true, fill: 'var(--accent)' }]]);
        }
        if (s === 3) ann([['hole lined: ONO + poly channel'], ['oxide core: see the zoom at right', { fill: 'var(--muted)' }]]);
        if (s === 4 && st.decks === 1) ann([['single deck: no stacking needed'], [st.L + ' layers ' + (st.L > SINGLE_DECK_MAX ? '> ~176 single-etch limit ⚠' : '≤ ~176 single-etch limit'), { fill: st.L > SINGLE_DECK_MAX ? 'var(--warn)' : 'var(--muted)' }]]);
        if (s === 5) ann([['staircase: one landing per tier →'], [n.passes + ' litho passes of ~12 tiers each', { fill: 'var(--muted)' }]]);
        if (s === 6) ann([['slit: gate-line cut every 8–12 holes'], ['exposes the edge of every SiN layer', { fill: 'var(--muted)' }]]);
        if (s === 7) ann([['H₃PO₄ 150–170 °C in through the slit'], ['oxide shelves rest on the pillars', { fill: 'var(--muted)' }]]);
        if (s === 8) ann([['Al₂O₃ + TiN liner, then W from WF₆'], ['W fills each cavity from the slit', { fill: 'var(--muted)' }]]);
        if (s === 9) ann([['bit line (Cu, ~40 nm pitch)', { fill: 'var(--cu)' }], ['string done: ' + st.L * st.decks + ' cells per hole'], ['staircase contacts, one per tier →', { fill: 'var(--muted)' }]]);
      }

      // ================= Panel B: zoom into one hole (viewBox 360×316) =================
      const B = svg('svg', { class: 'w-svg', viewBox: '0 0 360 316', role: 'img', 'aria-label': 'Zoom into one channel hole: word line, blocking oxide, SiN charge trap, tunnel oxide, poly channel, oxide core' });
      const PXNM = 2.9, BPX = 1.6, BX0 = 118, BX1 = 158, BY0 = 34, BXMAX = 352;   // px per nm across the hole / along the stack; word-line band x-extent; right clip edge
      const BANDS = [['ox', OX_NM], ['wl', SIN_NM], ['ox', OX_NM], ['wl', SIN_NM], ['ox', OX_NM]];
      function drawB() {
        B.innerHTML = '';
        const s = step + 1, n = calc(), junction = s === 4 && st.decks > 1, ov = junction ? OVERLAY_NM * PXNM : 0;
        const layers = [['blocking oxide ~' + T_BLOCK + ' nm', T_BLOCK, 'var(--line2)', 'var(--ink)'], ['SiN charge trap ~' + T_TRAP + ' nm', T_TRAP, 'var(--si)', 'var(--panel)'], ['tunnel oxide ~' + T_TUN + ' nm', T_TUN, 'var(--line2)', 'var(--ink)'], ['poly channel ~' + T_POLY + ' nm', T_POLY, 'var(--accent)', 'var(--panel)'], ['oxide core', st.d / 2 - T_BLOCK - T_TRAP - T_TUN - T_POLY, 'var(--line2)', 'var(--ink)']];
        const axis = BX1 + (st.d / 2) * PXNM;
        B.append(txt(2, 14, 'Inside one hole', { bold: true, fill: 'var(--ink)' }), txt(122, 14, s < 2 ? '(one oxide + nitride pair)' : s === 2 ? '(one freshly etched, empty hole)' : junction ? '(the deck junction)' : '(a gate-all-around cell)'));
        R(B, 2, 21, 356, 293, 'var(--panel2)', { 'fill-opacity': 0.5, stroke: 'var(--line2)', rx: 8 });
        let y = BY0;
        BANDS.forEach((b, i) => {                                // horizontal bands: oxide / word line (SiN → cavity → W)
          const hh = b[1] * BPX, xEnd = s < 2 ? Math.min(axis + 40, BXMAX) : BX1, wl = b[0] === 'wl' && !(junction && i === 2);
          if (!wl) R(B, BX0, y, xEnd - BX0, hh, 'var(--line2)');
          else if (s < 7) R(B, BX0, y, xEnd - BX0, hh, 'var(--si)');
          else if (s >= 8) { R(B, BX0, y, xEnd - BX0, hh, W_FILL, W_OP); R(B, BX0, y, xEnd - BX0, 2.5, 'var(--warn)'); R(B, BX0, y + hh - 2.5, xEnd - BX0, 2.5, 'var(--warn)'); R(B, xEnd - 2.5, y, 2.5, hh, 'var(--warn)'); }
          if (i === 0) B.append(txt(BX0 - 5, y + hh / 2 + 5, 'SiO₂ ' + OX_NM + ' nm', { anchor: 'end' }));
          if (i === 1) B.append(txt(BX0 - 5, y + hh / 2 - 4, 'word line ' + SIN_NM + ' nm', { anchor: 'end', fill: 'var(--ink)' }), txt(BX0 - 5, y + hh / 2 + 13, s >= 8 ? 'W + Al₂O₃/TiN' : s === 7 ? 'empty cavity' : 'SiN placeholder', { anchor: 'end', fill: s === 7 ? 'var(--bad)' : 'var(--muted)' }));
          if (i === 2 && junction) B.append(txt(BX0 - 5, y + hh / 2 - 4, 'inter-deck SiO₂', { anchor: 'end', fill: 'var(--ink)' }), txt(BX0 - 5, y + hh / 2 + 13, 'overlay ~' + OVERLAY_NM + ' nm', { anchor: 'end', fill: 'var(--bad)' }));
          if (i === 3) B.append(txt(BX0 - 5, y + hh / 2 + 5, 'pitch ' + st.pitch + ' nm', { anchor: 'end', mono: true }));
          y += hh;
        });
        const yEnd = y, yMid = BY0 + (OX_NM + SIN_NM + OX_NM / 2) * BPX;
        if (s >= 2) {                                            // the hole: empty at step 2, lined afterwards; lower half shifted by the overlay at a deck junction
          const drawHalf = (yA, yB, dx) => {
            let x = BX1 + dx;
            if (s === 2) { R(B, x, yA, axis + 8 - x, yB - yA, 'var(--panel)'); return; }
            layers.forEach(L => { const w = Math.min(L[1] * PXNM, BXMAX - x); R(B, x, yA, w, yB - yA, L[2]); x += w; });
            R(B, x, yA, Math.min(8, BXMAX - x), yB - yA, 'var(--line2)');
          };
          if (junction) { drawHalf(BY0, yMid, 0); drawHalf(yMid, yEnd, ov); R(B, BX1, yMid - 7, BXMAX - BX1, 14, 'var(--accent)'); }
          else drawHalf(BY0, yEnd, 0);
          if (s >= 3 && !junction) {                             // rotated labels inside each layer
            let x = BX1;
            layers.forEach((L, i) => { const w = L[1] * PXNM, cx = x + w / 2, cy = (BY0 + yEnd) / 2; if (i < 4 || w > 40) B.append(txt(cx + 5, cy, L[0], { fill: L[3], anchor: 'middle', extra: { transform: `rotate(-90 ${f1(cx + 5)} ${f1(cy)})` } })); x += w; });
          }
          Ln(B, axis, BY0 - 6, axis, junction ? yMid : yEnd + 6, 'var(--muted)', { 'stroke-dasharray': '3 3' });
          if (junction) { Ln(B, BX1, yMid - 10, BX1 + ov, yMid - 10, 'var(--bad)', { 'stroke-width': 2.5 }); Ln(B, BX1, yMid - 14, BX1, yMid - 6, 'var(--bad)', { 'stroke-width': 1.5 }); Ln(B, BX1 + ov, yMid - 14, BX1 + ov, yMid - 6, 'var(--bad)', { 'stroke-width': 1.5 }); }
          if (s === 2) B.append(txt(BX1 + 6, (BY0 + yEnd) / 2 - 4, 'empty hole', { fill: 'var(--ink)' }), txt(BX1 + 6, (BY0 + yEnd) / 2 + 13, 'fluorocarbon polymer walls'));
          Ln(B, BX1, yEnd + 9, axis, yEnd + 9, 'var(--muted)'); Ln(B, BX1, yEnd + 5, BX1, yEnd + 13, 'var(--muted)');
          if (junction) B.append(txt(8, yEnd + 26, 'red bar: upper hole lands ~' + OVERLAY_NM + ' nm off-centre', { fill: 'var(--bad)' }), txt(8, yEnd + 43, 'orange plug: joins the two channel tubes', { fill: 'var(--accent)' }));
          else B.append(txt(BX1, yEnd + 26, '⌀ ' + st.d + ' nm hole: half shown,'), txt(BX1, yEnd + 43, 'mirrored at the dashed axis'));
        } else B.append(txt(BX1 + 6, (BY0 + yEnd) / 2 - 4, 'no hole yet: ' + n.tiersDeck + ' tiers', { fill: 'var(--ink)' }), txt(BX1 + 6, (BY0 + yEnd) / 2 + 13, 'per deck, one PECVD run'));
        // scale strip: stack height vs a human hair
        const ys = yEnd + 60, sx = 96, wMax = 110;
        B.append(txt(2, ys, 'Height for scale', { bold: true, fill: 'var(--ink)' }));
        const bar = (yy, um, name, color) => { const w = Math.max(1.5, wMax * um / HAIR_UM); R(B, sx, yy - 9, w, 10, color); B.append(txt(sx + w + 5, yy, name)); };
        bar(ys + 17, HAIR_UM, 'human hair ~' + HAIR_UM + ' µm', 'var(--muted)');
        bar(ys + 34, n.hTot, 'your stack ' + fmt(n.hTot, 1) + ' µm (' + st.decks + ' deck' + (st.decks > 1 ? 's' : '') + ')', 'var(--accent)');
        bar(ys + 51, 0.07, 'a logic transistor ~0.07 µm', 'var(--si)');
      }

      // ================= animation =================
      function frame(ts) {
        raf = 0;
        if (!visible) return;
        if (!t0) t0 = ts;
        a = clamp((ts - t0) / ANIM_MS[step], 0, 1);
        drawA(); drawB();
        if (a < 1) raf = requestAnimationFrame(frame);
      }
      function stopAnim() { if (raf) cancelAnimationFrame(raf); raf = 0; }
      function startAnim(force) {
        stopAnim();
        if (!(step in ANIM_MS) || (reduced && !force) || (step === 3 && st.decks === 1)) { a = 1; drawA(); drawB(); return; }
        a = 0; t0 = 0; drawA(); drawB();
        if (visible) raf = requestAnimationFrame(frame);
      }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible && a < 1 && !raf) { t0 = 0; raf = requestAnimationFrame(frame); } });
      io.observe(el);

      // ================= step chrome =================
      const counter = h('span', { class: 'count' });
      const prevBtn = h('button', { class: 'w-btn', 'aria-label': 'Previous step', on: { click: () => go(step - 1) } }, 'Prev');
      const nextBtn = h('button', { class: 'w-btn', 'aria-label': 'Next step', on: { click: () => go(step + 1) } }, 'Next');
      const dots = STEPS.map((s, i) => h('button', { class: 'w-step-dot', 'aria-label': 'Step ' + (i + 1) + ': ' + s.t, title: s.t, on: { click: () => go(i) } }));
      const replayBtn = h('button', { class: 'w-btn', 'aria-label': 'Replay animation', on: { click: () => startAnim(true) } }, reduced ? 'Play animation' : 'Replay animation');
      const nav = h('div', { class: 'w-step-nav' }, prevBtn, ...dots, nextBtn, counter, replayBtn);
      const title = h('div', { class: 'w-step-title' }), desc = h('div', { class: 'w-step-desc' }), toolLine = h('div', { class: 'w-note' });
      function go(i) {
        step = clamp(i, 0, STEPS.length - 1);
        const S = STEPS[step];
        title.textContent = 'Step ' + (step + 1) + ' · ' + S.t;
        desc.textContent = (step === 3 && st.decks === 1) ? S.single : S.d;
        toolLine.textContent = 'Tool: ' + S.tool;
        counter.textContent = `Step ${step + 1} / ${STEPS.length}`;
        dots.forEach((d, j) => { d.classList.toggle('active', j === step); d.classList.toggle('done', j < step); });
        prevBtn.disabled = step === 0; nextBtn.disabled = step === STEPS.length - 1;
        replayBtn.hidden = !(step in ANIM_MS) || (step === 3 && st.decks === 1);
        startAnim(false);
      }

      // ================= controls, presets, readouts =================
      const RNG = { minWidth: '0' }, NOWRAP = { whiteSpace: 'nowrap' };
      const inL = h('input', { type: 'range', min: 32, max: 256, step: 1, value: st.L, 'aria-label': 'Layers per deck', style: RNG }), outL = h('output');
      const selDecks = h('select', { 'aria-label': 'Decks' }, ...[1, 2, 3].map(v => h('option', { value: v }, v + (v === 1 ? ' deck' : ' decks')))); selDecks.value = String(st.decks);
      const outDecks = h('output', { style: NOWRAP });
      const inP = h('input', { type: 'range', min: 38, max: 48, step: 1, value: st.pitch, 'aria-label': 'Tier pitch', style: RNG }), outP = h('output');
      const inD = h('input', { type: 'range', min: 90, max: 130, step: 5, value: st.d, 'aria-label': 'Hole diameter', style: RNG }), outD = h('output');
      const inC = h('input', { type: 'checkbox', 'aria-label': 'Cryogenic etch' }), outC = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl', style: { minWidth: '240px' } }, h('span', null, 'Layers per deck'), inL, outL),
        h('label', { class: 'w-ctl', style: { minWidth: '0', flex: '0 0 auto' } }, h('span', null, 'Decks'), selDecks, outDecks),
        h('label', { class: 'w-ctl', style: { minWidth: '240px' } }, h('span', null, 'Tier pitch (SiO₂ + SiN)'), inP, outP),
        h('label', { class: 'w-ctl', style: { minWidth: '240px' } }, h('span', null, 'Hole diameter'), inD, outD),
        h('label', { class: 'w-ctl', style: { minWidth: '0', flex: '0 0 auto' } }, h('span', null, 'Cryogenic etch (×2.5 rate)'), inC, outC));
      const GRID = { display: 'grid', gridTemplateColumns: '112px 1fr 44px', gap: '8px', alignItems: 'center', width: '100%', textAlign: 'left', padding: '3px 8px' };
      const ladderRows = PRESETS.map(p => {
        const bar = h('i', { style: { display: 'block', height: '8px', borderRadius: '2px', background: 'var(--si)', width: (100 * p.layers / 360).toFixed(1) + '%' } });
        const row = h('button', { class: 'w-btn', type: 'button', 'aria-label': p.name + ' ' + p.gen + ', ' + p.layers + ' layers', style: GRID, on: { click: () => { st.decks = p.decks; st.L = Math.round(p.layers / p.decks); st.pitch = p.pitch; inL.value = st.L; selDecks.value = String(p.decks); inP.value = st.pitch; update(true); } } },
          h('span', { style: { fontSize: '12px', lineHeight: '1.15' } }, p.name, h('br'), h('span', { style: { color: 'var(--muted)', fontSize: '11px' } }, p.gen + ' · ' + p.decks + ' decks')), bar,
          h('span', { style: { fontFamily: 'var(--mono)', fontSize: '12px', textAlign: 'right' } }, (p.approx ? '~' : '') + p.layers));
        return { row, bar, p };
      });
      const yourBar = h('i', { style: { display: 'block', height: '8px', borderRadius: '2px', background: 'var(--accent)' } }), yourNum = h('span', { style: { fontFamily: 'var(--mono)', fontSize: '12px', textAlign: 'right' } });
      const yourRow = h('div', { style: Object.assign({}, GRID, { padding: '4px 9px', fontSize: '12px' }) }, h('span', null, 'your stack'), yourBar, yourNum);
      const ladder = h('div', { style: { display: 'grid', gap: '4px', marginTop: '8px' } },
        h('div', { style: { fontSize: '11px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'Layer counts in production, ~2025 (click to load)'),
        ...ladderRows.map(r => r.row), yourRow);

      const stat = () => { const b = h('b'), sp = h('span'); return { b, sp, el: h('div', { class: 'w-stat' }, b, sp) }; };
      const S1 = stat(), S2 = stat(), S3 = stat(), S4 = stat(), S5 = stat(), S6 = stat(), S7 = stat(), S8 = stat();
      const readout = h('div', { class: 'w-readout' }, S1.el, S2.el, S3.el, S4.el, S5.el, S6.el, S7.el, S8.el);
      const warnLine = h('div', { class: 'w-note', style: { color: 'var(--warn)' } });
      const formula = h('div', { class: 'w-formula', html: 'H = decks · (L + 8 select/dummy tiers) · pitch &nbsp;·&nbsp; AR = (H<sub>deck</sub> + 3 µm hard mask) / ⌀<br>t<sub>etch</sub> = H<sub>deck</sub> / rate, rate = 100 nm/min (cryo ×2.5) &nbsp;·&nbsp; chambers ≈ 100 000 wafers/month · decks · t<sub>etch</sub> / 600 h<br>strings per 1 Tb TLC die = 2⁴⁰ bits / (3 bits · L · decks) &nbsp;·&nbsp; litho passes ≈ tiers / 12' });

      function update(fromPreset) {
        if (!fromPreset) { st.L = +inL.value; st.decks = +selDecks.value; st.pitch = +inP.value; st.d = +inD.value; }
        st.cryo = inC.checked;
        outL.textContent = String(st.L); outDecks.textContent = '→ ' + st.L * st.decks + ' layers'; outP.textContent = st.pitch + ' nm'; outD.textContent = st.d + ' nm'; outC.textContent = st.cryo ? 'on' : 'off';
        const n = calc();
        S1.b.textContent = fmt(n.layers, 0); S1.sp.textContent = 'active word lines (' + fmt(n.tiers, 0) + ' tiers with selects + dummies)';
        S2.b.textContent = fmt(n.hTot, 1) + ' µm'; S2.sp.textContent = 'ON stack height (' + fmt(n.hDeck, 1) + ' µm per deck)';
        S3.b.textContent = fmt(n.ar, 0) + ' : 1'; S3.sp.textContent = 'hole aspect ratio per deck, incl. hard mask';
        S4.b.textContent = fmt(n.tEtch, 0) + ' min'; S4.sp.textContent = 'channel-hole etch per deck at ' + fmt(n.rate, 0) + ' nm/min';
        S5.b.textContent = fmt(n.chHours, 1) + ' h'; S5.sp.textContent = 'etch chamber-hours per wafer (' + st.decks + ' deck' + (st.decks > 1 ? 's' : '') + ')';
        S6.b.textContent = '≈ ' + fmt(n.chambers, 0); S6.sp.textContent = 'HAR etch chambers for a 100 k wafer/month fab';
        S7.b.textContent = fmt(n.strings / 1e9, 2) + ' bn'; S7.sp.textContent = 'strings per 1 Tb TLC die (' + fmt(n.holes / 1e9, 1) + ' bn holes drilled)';
        S8.b.textContent = fmt(n.passes, 0); S8.sp.textContent = 'staircase litho passes (~12 tiers each)';
        warnLine.textContent = st.L > SINGLE_DECK_MAX ? '⚠ ' + st.L + ' layers in one deck is beyond the ~128–176-layer limit of a single etch (hole bowing, etch rate); real devices add a deck instead.' : '';
        ladderRows.forEach(r => { const on = r.p.decks === st.decks && Math.round(r.p.layers / r.p.decks) === st.L; r.row.style.borderColor = on ? 'var(--accent)' : ''; r.bar.style.background = on ? 'var(--accent)' : 'var(--si)'; });
        yourBar.style.width = (100 * clamp(n.layers, 0, 360) / 360).toFixed(1) + '%'; yourNum.textContent = fmt(n.layers, 0);
        if (step === 3) { desc.textContent = st.decks === 1 ? STEPS[3].single : STEPS[3].d; replayBtn.hidden = st.decks === 1; }
        stopAnim(); a = 1; drawA(); drawB();
      }
      [inL, selDecks, inP, inD, inC].forEach(i => i.addEventListener('input', () => update(false)));
      selDecks.addEventListener('change', () => update(false));

      const legend = h('div', { class: 'w-legend' }, ...[['line2', 'SiO₂ (oxide)'], ['si', 'SiN (placeholder / charge trap)'], ['accent', 'polysilicon (channel, source line)'], ['ink', 'tungsten word lines & contacts'], ['muted', 'carbon hard mask'], ['cu', 'copper bit line'], ['warn', 'Al₂O₃ / TiN liner']].map(([c, t]) => h('span', { class: 'w-legend-item' }, h('i', { style: { background: `var(--${c})`, opacity: c === 'ink' ? 0.72 : 1 } }), t)));

      el.append(
        h('div', { class: 'w-steps' }, nav, title, desc, toolLine),
        h('div', { class: 'w-grid2' }, h('div', null, A, legend), h('div', null, B, ladder)),
        controls, readout, warnLine, formula,
        h('div', { class: 'w-note' }, 'The drawing is schematic: real holes are ~100 nm wide and 5–15 µm deep (scaled up, a 1 m well drilled 50–150 m straight down), and each drawn stripe pair stands for many real oxide/nitride pairs. Vendors count layers differently (with or without dummies and select gates), so "321" and "286" are not directly comparable; hole-pitch shrink (~10 % per generation) and bits per cell also set density.'));
      go(0);
      update(false);
      return () => { stopAnim(); visible = false; io.disconnect(); };
    }
  });
})();
