/* Widget: resist-chemistry — "Inside a Chemically Amplified Resist" (Module 07) */
(function () {
  'use strict';
  const S = 2;                                   // px per nm (isotropic)
  const FILM = 100, PITCH = 80, HALF = 20;       // nm: film thickness; line/space pitch; half-width of a bright space
  const CW = 12, ROWS = 8, RH = FILM / ROWS;     // cartoon lattice of protecting-group sites (12 × 12.5 nm cells)
  const NSTEP = 100;                             // random-walk steps per acid
  const E_C = 25;                                // mJ/cm²: PAG photolysis constant, fraction converted = 1 − e^(−E·I/E_C)
  const D0 = 0.8, T_REF = 110, K0 = 10;          // D = 0.8 nm²/s at 110 °C (module); k = 10 deprotections/s per acid at 110 °C
  const R_MAX = 200, R_MIN = 0.02;               // nm/s: dissolution rate of deprotected vs protected polymer
  const R_DEP = 7, R_Q = 6, Q_FRAC = 0.3;        // nm: catalytic reach and quench radius; quencher : PAG count ratio
  const Y0 = 96, FH = FILM * S, Y1 = Y0 + FH, H = 380;
  const DUR = [2600, 4200, 3200];                // ms per step animation
  const seeded = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const gauss = r => { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()); };
  const sig = z => 1 / (1 + Math.exp(-z));
  const Dof = T => D0 * Math.pow(2, (T - T_REF) / 10);
  const vis = (e, on) => { e.style.display = on ? '' : 'none'; };

  const STEPS = [
    { name: () => 'Exposure: one photon, one acid',
      text: () => '193 nm photons arrive where the aerial image (the light pattern the lens projects) is bright. Each absorbed photon splits one photoacid generator (PAG, a salt that releases acid when hit by light) into a proton, H⁺. Nothing has dissolved yet: this is the latent image.' },
    { name: st => `Post-exposure bake at ${st.T} °C: the acid catalyses`,
      text: () => 'Above its glass transition the polymer softens and each H⁺ random-walks a distance L = √(2Dt), cleaving every protecting group it meets and coming out unchanged — a catalyst, so one photon becomes hundreds of deprotections. Quencher (base) molecules snuff out acids that stray into the dark regions, sharpening the edge.' },
    { name: st => st.ntd ? 'Develop: negative tone (NTD) in n-butyl acetate' : 'Develop: positive tone in 0.26 N TMAH',
      text: st => st.ntd
        ? 'Negative-tone develop uses an organic solvent (n-butyl acetate) on the same resist: the still-protected, oil-like polymer dissolves and the deprotected, polar polymer stays, so exposed regions become the remaining lines. Used for contact holes and cut masks, where a bright-hole aerial image has the better contrast.'
        : 'Aqueous base (0.26 N tetramethylammonium hydroxide) dissolves the deprotected, polar polymer at 100–1,000 nm/s and leaves protected polymer (< 1 nm/s), so exposed regions become spaces: positive tone. The ragged edge is line-edge roughness, seeded by the discrete acids.' },
  ];

  window.registerWidget('resist-chemistry', {
    title: 'Inside a Chemically Amplified Resist',
    caption: 'Step through exposure, bake and develop inside a 100 nm resist film; drag dose and bake settings and watch each photon’s acid wander, deprotect site after site, and blur the edge.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { E: 30, T: 110, t: 60, ntd: false, step: 0, p: reduced ? 1 : 0.35, playing: !reduced };
      let W = 0, G = null, raf = 0, last = 0, visible = true;
      const els = {};

      // ---------- step navigation ----------
      const dots = STEPS.map((s, i) => h('button', { class: 'w-step-dot', type: 'button', 'aria-label': 'Step ' + (i + 1), title: 'Step ' + (i + 1) + ': ' + s.name(st),
        on: { click: () => goTo(i), pointerenter: e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.3)'; }, pointerleave: e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; } } }));
      const counter = h('span', { class: 'count' });
      const prevBtn = h('button', { class: 'w-btn prev', type: 'button', on: { click: () => goTo(st.step - 1) } }, 'Prev');
      const nextBtn = h('button', { class: 'w-btn next', type: 'button', on: { click: () => goTo(st.step + 1) } }, 'Next');
      const playBtn = h('button', { class: 'w-btn primary play', type: 'button', on: { click: togglePlay } }, 'Play');
      const nav = h('div', { class: 'w-step-nav', role: 'tablist' }, ...dots, counter, prevBtn, nextBtn, playBtn);
      const stepTitle = h('b'), stepText = h('div', { style: { color: 'var(--muted)', marginTop: '2px' } });

      // ---------- controls ----------
      const eIn = h('input', { type: 'range', min: 10, max: 60, step: 1, value: st.E }), eOut = h('output');
      const tIn = h('input', { type: 'range', min: 90, max: 130, step: 1, value: st.T }), tOut = h('output');
      const timeIn = h('input', { type: 'range', min: 30, max: 120, step: 5, value: st.t }), timeOut = h('output');
      const toneSel = h('select', { style: { minWidth: 0, width: '100%' } }, h('option', { value: 'ptd' }, 'positive: 0.26 N TMAH'), h('option', { value: 'ntd' }, 'negative (NTD): n-butyl acetate'));
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Exposure dose'), eIn, eOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'PEB temperature'), tIn, tOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'PEB time'), timeIn, timeOut),
        h('label', { class: 'w-ctl', style: { gridTemplateColumns: 'auto 1fr' } }, h('span', null, 'Develop tone'), toneSel));
      [eIn, tIn, timeIn].forEach(i => i.addEventListener('input', update));
      toneSel.addEventListener('change', update); toneSel.addEventListener('input', update);

      // ---------- readouts ----------
      const rd = { D: h('b'), L: h('b'), chain: h('b'), ler: h('b') };
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rd.D, h('span', null, 'acid diffusion coefficient D at the PEB temperature')),
        h('div', { class: 'w-stat' }, rd.L, h('span', null, 'acid diffusion length L = √(2Dt) — the edge blur')),
        h('div', { class: 'w-stat' }, rd.chain, h('span', null, 'deprotections per acid (catalytic chain length)')),
        h('div', { class: 'w-stat' }, rd.ler, h('span', null, 'line-edge roughness, 3σ (scaling estimate)')));
      const formula = h('div', { class: 'w-formula', html: 'D(T) ≈ 0.8 nm²/s · 2<sup>(T − 110 °C)/10 °C</sup> &nbsp;·&nbsp; L = √(2·D·t) &nbsp;·&nbsp; chain length ≈ k(T)·t, k ≈ 10 s⁻¹ at 110 °C &nbsp;·&nbsp; LER ≈ 4 nm · √(30 / E) · √(10 nm / L)' });
      const legend = h('div', { class: 'w-legend' }, ...[['si', 'polymer chain'], ['cu', 'protecting group (blocks dissolution)'], ['ok', 'deprotected site (polar, base-soluble)'], ['accent2', 'PAG'], ['accent', 'photon / acid H⁺'], ['ink', 'quencher (base)'], ['accent2', 'developer']]
        .map(([c, t], i) => h('span', { class: 'w-legend-item' }, h('i', { style: { background: `var(--${c})`, opacity: i === 6 ? 0.3 : 1 } }), t)));

      // ---------- drawing ----------
      const wrap = h('div');
      const D = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Cross-section of a chemically amplified resist film: polymer chains with protecting groups, PAG and quencher molecules, photons, acid and developer' });
      wrap.append(D);
      const txt = (x, y, s, o) => svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 11, fill: 'var(--muted)' }, o || {}), s);
      function fit(bg, t) {
        let w = 0; try { w = t.getComputedTextLength(); } catch (e) { /* not rendered */ }
        if (!w) w = t.textContent.length * 6.3;
        const a = t.getAttribute('text-anchor'), x = +t.getAttribute('x'), y = +t.getAttribute('y');
        const x0 = a === 'end' ? x - w : a === 'middle' ? x - w / 2 : x;
        bg.setAttribute('x', x0 - 3); bg.setAttribute('y', y - 10); bg.setAttribute('width', w + 6); bg.setAttribute('height', 13);
        return w;
      }
      const backing = () => svg('rect', { rx: 3, fill: 'var(--panel)', 'fill-opacity': 0.9 });

      function build() {
        D.innerHTML = '';
        D.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const Wnm = W / S, cols = Math.floor(Wnm / CW), xo = (Wnm - cols * CW) / 2;
        const rng = seeded(4242);
        const I = x => 0.5 * (1 + 0.9 * Math.cos(2 * Math.PI * (x - Wnm / 2) / PITCH));
        const sites = [], pags = [], quench = [], photons = [];
        for (let j = 0; j < ROWS; j++) for (let i = 0; i < cols; i++) sites.push({ i, j, x: xo + CW * (i + 0.5), y: RH * (j + 0.5), tDep: 2 });
        const nPag = Math.round(Wnm * FILM / 196);
        for (let k = 0; k < nPag; k++) {
          const g = new Float32Array(2 * NSTEP); for (let s = 0; s < 2 * NSTEP; s++) g[s] = gauss(rng);
          pags.push({ x: rng() * Wnm, y: 3 + rng() * (FILM - 6), u: rng(), tc: 0.1 + 0.75 * rng(), g });
        }
        for (let k = 0; k < Math.round(nPag * Q_FRAC); k++) quench.push({ x: rng() * Wnm, y: 3 + rng() * (FILM - 6), dead: 2 });
        for (let k = 0; k < Math.round(Wnm / 4); k++) { const x = rng() * Wnm; if (rng() < I(x)) photons.push({ x, t0: rng() * 0.88, yEnd: rng() * FILM }); }
        G = { Wnm, cols, xo, I, sites, pags, quench, photons, acids: [], L: 10, row0: sites.filter(s => s.j === 0), row1: sites.filter(s => s.j === 1) };
        const cellOf = m => sites[Math.min(ROWS - 1, Math.floor(m.y / RH)) * cols + Math.max(0, Math.min(cols - 1, Math.floor((m.x - xo) / CW)))];
        pags.forEach(pg => { pg.cell = cellOf(pg); }); quench.forEach(q => { q.cell = cellOf(q); });
        const X = nm => nm * S, Y = nm => Y0 + nm * S;

        // header, aerial image, region labels
        els.hdr = txt(6, 14, '');
        D.append(els.hdr, txt(W - 6, 14, W < 440 ? '40 nm half-pitch' : '40 nm lines & spaces (80 nm pitch) · 100 nm film', { 'text-anchor': 'end' }));
        let d = 'M0,80'; for (let x = 0; x <= W; x += 4) d += ` L${x},${(80 - 50 * I(x / S)).toFixed(1)}`; d += ` L${W},80 Z`;
        D.append(svg('path', { d, fill: 'var(--accent)', 'fill-opacity': 0.16, stroke: 'var(--accent)', 'stroke-width': 1.5 }));
        for (let k = -6; k <= 6; k++) {
          const bx = W / 2 + k * PITCH * S, dx = bx + PITCH * S / 2;
          if (bx - 26 >= 0 && bx + 26 <= W) D.append(txt(bx, 92, 'exposed', { 'text-anchor': 'middle', fill: 'var(--accent)' }));
          if (dx - 32 >= 0 && dx + 32 <= W) D.append(txt(dx, 92, 'unexposed', { 'text-anchor': 'middle' }));
        }
        // developer liquid (behind the film), film columns, substrate
        els.dev = svg('rect', { x: 0, y: Y0, width: W, height: FH, fill: 'var(--accent2)', 'fill-opacity': 0.22 });
        D.append(els.dev);
        els.cols = [];
        for (let i = 0; i < cols; i++) {
          const x0 = i === 0 ? 0 : X(xo + CW * i), x1 = i === cols - 1 ? W : X(xo + CW * (i + 1));
          const r = svg('rect', { x: x0, y: Y0, width: x1 - x0, height: FH, fill: 'var(--si)', 'fill-opacity': 0.22 });
          els.cols.push(r); D.append(r);
        }
        D.append(svg('rect', { x: 0, y: Y1, width: W, height: 22, fill: 'var(--muted)', 'fill-opacity': 0.35 }));
        D.append(svg('rect', { x: 0, y: Y1 + 22, width: W, height: 22, fill: 'var(--si)', 'fill-opacity': 0.55 }));
        D.append(txt(W / 2, Y1 + 15, 'underlayer (BARC / SOC)', { 'text-anchor': 'middle', fill: 'var(--ink)' }));
        D.append(txt(W / 2, Y1 + 37, 'Si wafer', { 'text-anchor': 'middle', fill: 'var(--ink)' }));
        // polymer lattice: chain segment + pendant protecting group per site
        const CELLS = svg('g'); D.append(CELLS);
        sites.forEach(s => {
          const x = X(s.x), y = Y(s.y); s.px = x; s.py = y;
          const chain = svg('path', { d: `M${x - 12},${y} q6,-3 12,0 t12,0`, fill: 'none', stroke: 'var(--si)', 'stroke-width': 1.5, 'stroke-opacity': 0.85 });
          const stub = svg('line', { x1: x, y1: y, x2: x, y2: y + 5, stroke: 'var(--si)', 'stroke-width': 1 });
          s.rect = svg('rect', { x: x - 3.5, y: y + 5, width: 7, height: 7, rx: 1.5, fill: 'var(--cu)' });
          s.dot = svg('circle', { cx: x, cy: y + 8.5, r: 3.5, fill: 'var(--ok)' });
          s.g = svg('g', null, chain, stub, s.rect, s.dot); CELLS.append(s.g);
        });
        // small molecules: quencher triangles, PAG dots, acids (+ their photon), background photons
        const MOL = svg('g'); D.append(MOL);
        quench.forEach(q => { const x = X(q.x), y = Y(q.y); q.px = x; q.py = y; q.el = svg('path', { d: `M${x},${y - 4.5} L${x + 4.5},${y + 3.5} L${x - 4.5},${y + 3.5} Z`, fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.3 }); MOL.append(q.el); });
        photons.forEach(f => { f.px = X(f.x); f.el = svg('line', { x1: f.px, x2: f.px, stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-opacity': 0.75 }); MOL.append(f.el); });
        pags.forEach(pg => {
          pg.px = X(pg.x); pg.py = Y(pg.y);
          pg.el = svg('circle', { cx: pg.px, cy: pg.py, r: 3.5, fill: 'var(--accent2)' });
          pg.halo = svg('circle', { r: 7, fill: 'var(--accent)', 'fill-opacity': 0.28 });
          pg.acid = svg('g', null, pg.halo, svg('circle', { r: 3, fill: 'var(--accent)' }));
          pg.ph = svg('line', { x1: pg.px, x2: pg.px, stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-linecap': 'round' });
          MOL.append(pg.el, pg.acid, pg.ph);
        });
        // blur zone around the right edge of the central space, scale bar
        const xe = W / 2 + HALF * S;
        els.blurL = svg('line', { y1: Y0, y2: Y1, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '4 3', 'stroke-opacity': 0.6 });
        els.blurR = svg('line', { y1: Y0, y2: Y1, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-dasharray': '4 3', 'stroke-opacity': 0.6 });
        els.bracket = svg('path', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.2 });
        els.blurT = txt(xe, 372, '', { 'text-anchor': 'middle', fill: 'var(--ink)', 'font-family': 'var(--mono)' });
        els.blur = svg('g', null, els.blurL, els.blurR, els.bracket, els.blurT); D.append(els.blur);
        D.append(svg('path', { d: `M6,353 v7 M6,356.5 h${20 * S} M${6 + 20 * S},353 v7`, stroke: 'var(--ink)', 'stroke-width': 1.2, fill: 'none' }));
        D.append(txt(6, 372, '20 nm', { fill: 'var(--ink)', 'font-family': 'var(--mono)' }));
        // labels on top: aerial-image caption, live status, in-place callouts
        const LAB = svg('g'); D.append(LAB);
        const aer = txt(6, 44, 'aerial image I(x)', { fill: 'var(--accent)' }); const aerBg = backing(); LAB.append(aerBg, aer); fit(aerBg, aer);
        els.status = txt(W - 6, 44, '', { 'text-anchor': 'end', fill: 'var(--ink)', 'font-family': 'var(--mono)' });
        els.statusBg = backing(); LAB.append(els.statusBg, els.status);
        function callout(text, x, y, side) {
          const t = txt(x, y, text, { fill: 'var(--ink)' }), bg = backing();
          const lead = svg('line', { stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-opacity': 0.7 });
          const g = svg('g', null, lead, bg, t); LAB.append(g);
          const w = fit(bg, t), right = x + w + 3;
          return { x, y, w, right, set(tx, ty) { vis(g, tx != null); if (tx == null) return; lead.setAttribute('x1', side === 'r' ? right : x - 3); lead.setAttribute('y1', y - 4); lead.setAttribute('x2', tx); lead.setAttribute('y2', ty); } };
        }
        els.c = { chain: callout('polymer chain', 6, 130.5, 'r'), pg: callout('protecting group', 6, 155.5, 'r'), pag: callout('PAG (acid generator)', 6, 180.5, 'r'),
          q: callout('quencher (base)', 6, 205.5, 'r'), acid: callout('acid H⁺', W / 2 + 44, 130.5, 'l'), dep: callout('deprotected (polar)', W / 2 + 44, 155.5, 'l') };
      }

      // ---------- simulation (deterministic for the current settings) ----------
      function simulate() {
        const { Wnm, cols, xo, I, sites, pags, quench } = G;
        const L = Math.sqrt(2 * Dof(st.T) * st.t), sd = L / Math.sqrt(NSTEP);
        sites.forEach(s => { s.tDep = 2; }); quench.forEach(q => { q.dead = 2; });
        const acids = [];
        pags.forEach(pg => { pg.conv = pg.u < 1 - Math.exp(-st.E * I(pg.x) / E_C); if (pg.conv) { const a = { pg, traj: [pg.x, pg.y], death: 2 }; pg.acidRef = a; acids.push(a); } });
        const deprotect = (x, y, tk) => {
          const i0 = Math.max(0, Math.ceil((x - R_DEP - xo) / CW - 0.5)), i1 = Math.min(cols - 1, Math.floor((x + R_DEP - xo) / CW - 0.5));
          const j0 = Math.max(0, Math.ceil((y - R_DEP) / RH - 0.5)), j1 = Math.min(ROWS - 1, Math.floor((y + R_DEP) / RH - 0.5));
          for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const s = sites[j * cols + i]; if (Math.hypot(s.x - x, s.y - y) <= R_DEP && tk < s.tDep) s.tDep = tk; }
        };
        for (let k = 0; k <= NSTEP; k++) {
          const tk = k / NSTEP;
          for (const a of acids) {
            if (a.death <= 1) continue;
            let x, y;
            if (k > 0) {
              x = a.traj[2 * k - 2] + sd * a.pg.g[2 * k - 2]; y = a.traj[2 * k - 1] + sd * a.pg.g[2 * k - 1];
              if (y < 0) y = -y; if (y > FILM) y = 2 * FILM - y;
              y = Math.max(0, Math.min(FILM, y)); x = Math.max(0, Math.min(Wnm, x));
              a.traj.push(x, y);
            } else { x = a.traj[0]; y = a.traj[1]; }
            for (const q of quench) if (q.dead > 1 && Math.hypot(q.x - x, q.y - y) < R_Q) { q.dead = tk; a.death = tk; break; }
            if (a.death > 1) deprotect(x, y, tk);
          }
        }
        // develop: local deprotection fraction sets a steep (high-contrast) dissolution rate; the front descends column by column
        const at = (i, j) => (i < 0 || j < 0 || i >= cols || j >= ROWS) ? null : sites[j * cols + i];
        sites.forEach(s => { let n = 0, sum = 0; for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const o = at(s.i + di, s.j + dj); if (o) { n++; if (o.tDep <= 1) sum++; } } s.f = sum / n; });
        const T_SHOW = 1.6 * FILM / R_MAX;
        sites.forEach(s => { const z = (s.f - 0.5) / 0.06; s.tau = RH / Math.max(R_MIN, R_MAX * sig(st.ntd ? -z : z)); });
        sites.forEach(s => { // lateral attack: an isolated slow cell between two fast-clearing columns is undercut from the sides
          const l = at(s.i - 1, s.j), r = at(s.i + 1, s.j);
          if (l && r && s.tau > 0.5 * T_SHOW && l.tau < 0.1 * T_SHOW && r.tau < 0.1 * T_SHOW) s.tau = 0.3 * T_SHOW;
        });
        for (let i = 0; i < cols; i++) {
          let cum = 0;
          for (let j = 0; j < ROWS; j++) { const s = sites[j * cols + i]; s.tStart = cum / T_SHOW; cum += s.tau; s.tEnd = cum / T_SHOW; }
        }
        G.acids = acids; G.L = L;
      }

      // ---------- render the current step & progress ----------
      function render() {
        if (!G) return;
        const { sites, pags, quench, photons, cols } = G, step = st.step, p = st.p;
        const tPeb = step === 1 ? p : step > 1 ? 1 : -1;
        let nMade = 0;
        sites.forEach(s => { s.dep = tPeb >= 0 && s.tDep <= tPeb; vis(s.rect, !s.dep); vis(s.dot, s.dep); s.vis = !(step === 2 && p >= (s.tStart + s.tEnd) / 2); vis(s.g, s.vis); });
        photons.forEach(f => { const u = (p - f.t0) / 0.12, on = step === 0 && u >= 0 && u < 1; vis(f.el, on); if (on) { const y = 22 + (Y0 + f.yEnd * S - 22) * u; f.el.setAttribute('y1', y - 12); f.el.setAttribute('y2', y); } });
        pags.forEach(pg => {
          const made = pg.conv && (step > 0 || p >= pg.tc); if (made) nMade++;
          pg.pagVis = !made && pg.cell.vis; vis(pg.el, pg.pagVis);
          const u = (p - (pg.tc - 0.14)) / 0.14, phOn = step === 0 && pg.conv && u >= 0 && u < 1;
          vis(pg.ph, phOn); if (phOn) { const y = 22 + (pg.py - 22) * u; pg.ph.setAttribute('y1', y - 12); pg.ph.setAttribute('y2', y); }
          let ax = null, ay = null;
          if (made && step === 0) { ax = pg.px; ay = pg.py; }
          else if (made && step === 1) { const a = pg.acidRef, k = Math.min(NSTEP, Math.floor(p * NSTEP)); if (a.death > p) { ax = a.traj[2 * k] * S; ay = Y0 + a.traj[2 * k + 1] * S; } }
          pg.ax = ax; pg.ay = ay; vis(pg.acid, ax != null);
          if (ax != null) { pg.acid.setAttribute('transform', `translate(${ax.toFixed(1)},${ay.toFixed(1)})`); pg.halo.setAttribute('r', 7 + (step === 0 ? 7 * Math.max(0, 1 - (p - pg.tc) / 0.15) : 0)); }
        });
        quench.forEach(q => { q.vis = !(tPeb >= 0 && q.dead <= tPeb) && q.cell.vis; vis(q.el, q.vis); });
        vis(els.dev, step === 2);
        for (let i = 0; i < cols; i++) {
          let depth = 0;
          if (step === 2) for (let j = 0; j < ROWS; j++) { const s = sites[j * cols + i]; if (p >= s.tEnd) depth = RH * (j + 1); else { if (p > s.tStart) depth = RH * j + RH * (p - s.tStart) / (s.tEnd - s.tStart); break; } }
          els.cols[i].setAttribute('y', Y0 + depth * S); els.cols[i].setAttribute('height', Math.max(0, FH - depth * S));
        }
        // annotations
        els.hdr.textContent = `193 nm light · ${st.E} mJ/cm²`;
        const Lnow = step === 1 ? G.L * Math.sqrt(p) : G.L;
        els.status.textContent = step === 0 ? `${nMade} of ${pags.length} PAG → acid` : step === 1 ? `bake ${fmt(p * st.t, 0)} s / ${st.t} s` : `${st.ntd ? 'n-butyl acetate' : 'TMAH 0.26 N'} · ${fmt(p * 100, 0)} %`;
        fit(els.statusBg, els.status);
        vis(els.blur, step >= 1);
        if (step >= 1) {
          const xe = W / 2 + HALF * S, xa = xe - Lnow * S, xb = xe + Lnow * S;
          els.blurL.setAttribute('x1', xa); els.blurL.setAttribute('x2', xa); els.blurR.setAttribute('x1', xb); els.blurR.setAttribute('x2', xb);
          els.bracket.setAttribute('d', `M${xa.toFixed(1)},353 v7 M${xa.toFixed(1)},356.5 H${xb.toFixed(1)} M${xb.toFixed(1)},353 v7`);
          els.blurT.textContent = `acid blur ±L = ${fmt(Lnow, 1)} nm`;
        }
        const near = (list, x, y, ok, gx, gy) => { let best = null, bd = 240; for (const o of list) { if (!ok(o)) continue; const dd = Math.hypot(gx(o) - x, gy(o) - y); if (dd < bd) { bd = dd; best = o; } } return best; };
        const c = els.c, tgt = (cc, o, gx, gy) => cc.set(o ? gx(o) : null, o ? gy(o) : null);
        tgt(c.chain, near(G.row0, c.chain.right + 24, 108.5, s => s.vis && s.px > c.chain.right + 8, s => s.px, s => s.py), s => s.px, s => s.py);
        tgt(c.pg, near(G.row1, c.pg.right + 24, 133.5, s => s.vis && s.px > c.pg.right + 8, s => s.px, s => s.py), s => s.px, s => s.py + 8.5);
        tgt(c.pag, near(pags, c.pag.right + 40, 176, pg => pg.pagVis, pg => pg.px, pg => pg.py), pg => pg.px, pg => pg.py);
        tgt(c.q, near(quench, c.q.right + 40, 201, q => q.vis, q => q.px, q => q.py), q => q.px, q => q.py);
        tgt(c.acid, near(pags, W / 2, 126, pg => pg.ax != null, pg => pg.ax, pg => pg.ay), pg => pg.ax, pg => pg.ay);
        tgt(c.dep, near(sites, W / 2, 151, s => s.vis && s.dep, s => s.px, s => s.py), s => s.px, s => s.py + 8.5);
      }

      // ---------- state plumbing ----------
      function syncStep() {
        dots.forEach((d, i) => { d.className = 'w-step-dot' + (i === st.step ? ' active' : i < st.step ? ' done' : ''); });
        counter.textContent = `Step ${st.step + 1} / ${STEPS.length}`;
        prevBtn.disabled = st.step === 0; nextBtn.disabled = st.step === STEPS.length - 1;
        stepTitle.textContent = STEPS[st.step].name(st); stepText.textContent = STEPS[st.step].text(st);
        playBtn.textContent = st.playing ? 'Pause' : st.p >= 1 ? 'Replay step' : 'Play';
      }
      function goTo(i) {
        if (i < 0 || i >= STEPS.length) return;
        st.step = i; st.p = reduced ? 1 : 0; st.playing = !reduced;
        render(); syncStep(); start();
      }
      function togglePlay() {
        if (st.playing) st.playing = false;
        else { if (st.p >= 1) st.p = 0; st.playing = true; start(); }
        syncStep();
      }
      function update() {
        st.E = +eIn.value; st.T = +tIn.value; st.t = +timeIn.value; st.ntd = toneSel.value === 'ntd';
        eOut.textContent = st.E + ' mJ/cm²'; tOut.textContent = st.T + ' °C'; timeOut.textContent = st.t + ' s';
        const Dv = Dof(st.T), L = Math.sqrt(2 * Dv * st.t), chain = K0 * Math.pow(2, (st.T - T_REF) / 10) * st.t, ler = 4 * Math.sqrt(30 / st.E) * Math.sqrt(10 / L);
        rd.D.textContent = fmt(Dv, 2) + ' nm²/s'; rd.L.textContent = fmt(L, 1) + ' nm';
        rd.chain.textContent = '≈ ' + fmt(Math.round(chain / 10) * 10, 0); rd.ler.textContent = '≈ ' + fmt(ler, 1) + ' nm';
        if (G) { simulate(); render(); }
        syncStep();
      }
      function frame(ts) {
        raf = 0; if (!st.playing || !visible) return;
        if (last) st.p = Math.min(1, st.p + (ts - last) / DUR[st.step]); last = ts;
        render();
        if (st.p >= 1) { st.playing = false; syncStep(); return; }
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(frame); } }
      function layout() {
        const w = Math.round(wrap.getBoundingClientRect().width);
        if (!w || Math.abs(w - W) < 2) return;
        W = Math.max(300, w); build(); simulate(); render();
      }

      el.append(h('div', { class: 'w-steps' }, nav, h('div', null, stepTitle, stepText)), wrap, controls, readout, formula, legend,
        h('div', { class: 'w-note', html: '<b>Cartoon, not to scale:</b> real PAG density is ~1 per (3–5 nm)³ and each acid deprotects hundreds of sites; here each acid touches only a few so you can follow it. <b>RLS trade-off:</b> LER² × dose × resolution³ ≈ constant — a hotter or longer bake spreads each acid further (more amplification, smoother edges) but blurs the edge, and a lower dose means fewer acids and more shot-noise roughness. You can have two of {resolution, low LER, sensitivity}, never all three.' }));
      update();
      const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(layout) : null;
      if (ro) ro.observe(wrap); else { W = 640; build(); simulate(); render(); }
      layout();
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);
      start();
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); if (ro) ro.disconnect(); };
    }
  });
})();
