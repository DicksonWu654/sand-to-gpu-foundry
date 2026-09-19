/* Widget: plasma-reactor — "Inside a Plasma Etch Chamber" (Module 09) */
(function () {
  'use strict';
  // ---- physical constants (SI) and model parameters ----
  const KB = 1.380649e-23, EPS0 = 8.854e-12, QE = 1.602e-19, AMU = 1.6605e-27;
  const T_GAS = 300;            // K: neutrals stay near room temperature
  const D_AR = 3.6e-10;         // m: hard-sphere diameter of argon
  const M_ION = 39.95 * AMU;    // kg: argon-like ion
  const MTORR_PA = 0.133322;
  const V_P = 25;               // V: plasma potential above the grounded walls
  const ETA = 0.6, A_EFF = 1500; // share of bias power carried by ions; powered-electrode area, cm²
  const T_ION = 0.5, TH_SCAT = 20; // eV effective transverse ion energy; deg cone of scattered ions
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = n => String(n).split('').map(c => SUP[c] || c).join('');
  const sci = (v, d = 1) => { if (!(v > 0) || !isFinite(v)) return '–'; let e = Math.floor(Math.log10(v)), m = v / 10 ** e; if (+m.toFixed(d) >= 10) { m /= 10; e += 1; } return m.toFixed(d) + '×10' + sup(e); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mmf = v => v < 1 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : v.toFixed(0);   // mm with steady precision
  const pct = f => f < 0.001 ? '<0.1' : f < 0.1 ? (f * 100).toFixed(1) : (f * 100).toFixed(0);

  const MODES = {
    ccp: { name: 'CCP', nPerKw: 1e10, eps: 0.5, biasHz: '2 MHz', gas: 'C₄F₈ / Ar / O₂', def: { bias: 500, p: 20, src: 1000 },
      srcLabel: '60 MHz source power on the top electrode',
      info: 'Capacitively coupled plasma (CCP): two parallel plates a few centimetres apart. 60 MHz power on the silicon showerhead makes the plasma (sets ion flux); 2 MHz bias on the chuck sets the sheath voltage (ion energy). 10–200 mTorr, 10⁹–10¹⁰ ions/cm³, ions up to several keV — the platform for dielectric etch (SiO₂, Si₃N₄, low-k).' },
    icp: { name: 'ICP', nPerKw: 1e11, eps: 0.15, biasHz: '13.56 MHz', gas: 'Cl₂ / HBr / Ar', def: { bias: 300, p: 5, src: 1000 },
      srcLabel: '13.56 MHz power in the coil above the window',
      info: 'Inductively coupled plasma (ICP): a coil outside a quartz window drives a circulating electric field that heats electrons like a transformer secondary, so no top electrode is needed. 1–20 mTorr, 10¹¹–10¹² ions/cm³; the chuck’s own RF bias sets ion energy independently of the coil. Low pressure = long mean free path = tightly collimated ions — the platform for conductor etch (Si, poly, SiGe, metals) at 20–200 eV.' },
  };

  function calc(mode, bias, pmt, src) {
    const M = MODES[mode];
    const pPa = pmt * MTORR_PA;
    const lambda = KB * T_GAS / (Math.SQRT2 * Math.PI * D_AR * D_AR * pPa);      // m, gas-kinetic mean free path
    const nGas = pPa / (KB * T_GAS) * 1e-6;                                     // cm⁻³
    const Te = clamp(4.6 - 0.9 * Math.log10(pmt), 2, 5);                        // eV, falls slowly with pressure
    const n = M.nPerKw * (src + M.eps * bias) / 1000;                            // cm⁻³, ∝ absorbed power
    const uB = Math.sqrt(QE * Te / M_ION);                                       // m/s, Bohm velocity
    const flux = 0.61 * n * uB * 100;                                            // ions cm⁻² s⁻¹
    const J = flux * QE;                                                         // A/cm²
    const Vdc = ETA * bias / (J * A_EFF);                                        // V, self-bias magnitude from power balance
    const Vsh = V_P + Vdc, Ei = Vsh;                                             // eV, ion energy = e·(V_p − V_dc)
    const lamD = Math.sqrt(EPS0 * Te / (0.61 * n * 1e6 * QE));                   // m, Debye length at the sheath edge
    const child = V => (Math.SQRT2 / 3) * lamD * Math.pow(2 * V / Te, 0.75);     // m, Child–Langmuir sheath
    const sheath = child(Vsh), sTop = child(V_P);
    const ratio = sheath / lambda, f0 = Math.exp(-ratio);
    const th0 = Math.atan(Math.sqrt(T_ION / Ei)) * 180 / Math.PI;
    const theta = th0 + (1 - f0) * TH_SCAT;
    const rate = flux / 1e15 * 0.3 * 60;                                         // nm/min at one atom per ion, 0.3 nm monolayer
    return { pPa, lambda, nGas, Te, n, uB, flux, J, Vdc, Vsh, Ei, lamD, sheath, sTop, ratio, f0, theta, rate };
  }

  // ---- chamber geometry (viewBox 0 0 360 484) ----
  const IX0 = 28, IX1 = 242, CX = 135, WAF_Y = 310, WX0 = 40, WX1 = 230, LX = 258;
  const pxOfMm = mm => clamp(4 + 34 * Math.log10(mm / 0.1), 6, 90);

  window.registerWidget('plasma-reactor', {
    title: 'Inside a Plasma Etch Chamber',
    caption: 'Bias power sets how hard ions hit, source power sets how many, pressure sets whether they fly straight — watch the sheath and the ion paths respond, and switch between a CCP and an ICP chamber.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { mode: 'ccp', bias: 500, p: 20, src: 1000, playing: !reduced };
      let raf = 0, visible = true, last = 0, R = null, G = null;

      // ================= controls =================
      const modeBtns = {};
      const setMode = m => { st.mode = m; const d = MODES[m].def; st.bias = d.bias; st.p = d.p; st.src = d.src; biasIn.value = d.bias; pIn.value = Math.log10(d.p); srcIn.value = d.src; buildTop(); update(); };
      ['ccp', 'icp'].forEach(m => { modeBtns[m] = h('button', { class: 'w-btn', 'data-role': 'mode-' + m, 'aria-pressed': 'false', on: { click: () => setMode(m) } }, MODES[m].name + (m === 'ccp' ? ' · dielectric etch' : ' · conductor etch')); });
      const playBtn = h('button', { class: 'w-btn', 'data-role': 'play', on: { click: () => { st.playing = !st.playing; playBtn.textContent = st.playing ? 'Pause' : 'Play'; if (st.playing) start(); } } }, st.playing ? 'Pause' : 'Play');
      const biasIn = h('input', { type: 'range', min: 0, max: 1500, step: 10, value: st.bias, 'data-k': 'bias' });
      const pIn = h('input', { type: 'range', min: 0, max: 2.301, step: 0.01, value: Math.log10(st.p), 'data-k': 'pressure' });
      const srcIn = h('input', { type: 'range', min: 100, max: 3000, step: 50, value: st.src, 'data-k': 'source' });
      const biasOut = h('output'), pOut = h('output'), srcOut = h('output');
      const controls = h('div', { class: 'w-controls' },
        h('div', { class: 'w-step-nav' }, h('span', { style: { color: 'var(--muted)', fontSize: '13px' } }, 'Chamber'), modeBtns.ccp, modeBtns.icp, playBtn),
        h('label', { class: 'w-ctl' }, h('span', null, 'Bias power'), biasIn, biasOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Pressure'), pIn, pOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Source power'), srcIn, srcOut));
      [biasIn, pIn, srcIn].forEach(inp => inp.addEventListener('input', () => { st.bias = +biasIn.value; st.p = Math.pow(10, +pIn.value); st.src = +srcIn.value; update(); }));
      const modeInfo = h('div', { style: { fontSize: '13px', color: 'var(--muted)', margin: '4px 0 8px' } });
      const status = h('div', { style: { border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 12px', margin: '0 0 10px', fontSize: '13px' } });

      // ================= chamber drawing =================
      const D = svg('svg', { class: 'w-svg', viewBox: '0 0 360 484', role: 'img', 'aria-label': 'Cross-section of a plasma etch chamber: electrodes, plasma glow, sheaths, wafer on an electrostatic chuck' });
      const txt = (x, y, s, o = {}) => svg('text', { x, y, 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-size': o.fs || 12.5, fill: o.fill || 'var(--muted)', 'text-anchor': o.anchor || 'start', 'font-weight': o.bold ? 600 : null }, s);
      const ln = (x1, y1, x2, y2, o = {}) => svg('line', { x1, y1, x2, y2, stroke: o.stroke || 'var(--line2)', 'stroke-width': o.w || 1, 'stroke-dasharray': o.dash || null, opacity: o.op || null });
      D.append(svg('rect', { x: 20, y: 52, width: 230, height: 360, rx: 3, fill: 'var(--line2)' }));       // chamber wall
      D.append(svg('rect', { x: IX0, y: 60, width: IX1 - IX0, height: 344, fill: 'var(--panel2)' }));       // vacuum interior
      const topG = svg('g'); D.append(topG);
      const glow = svg('rect', { fill: 'var(--accent2)', 'fill-opacity': 0.3 });
      const core = svg('ellipse', { fill: 'var(--accent2)', 'fill-opacity': 0.2 });
      const edge = svg('rect', { fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 1, 'stroke-dasharray': '4 3', opacity: 0.7 });
      D.append(glow, core, edge);
      const bulkL1 = txt(CX, 0, 'plasma bulk (glow)', { anchor: 'middle', fill: 'var(--ink)', bold: true });
      const bulkL2 = txt(CX, 0, '', { anchor: 'middle', mono: true, fs: 12, fill: 'var(--ink)' });
      const bulkL3 = txt(CX, 0, '', { anchor: 'middle', mono: true, fs: 12, fill: 'var(--ink)' });
      const bulkL4 = txt(CX, 0, 'Vₚ ≈ +25 V', { anchor: 'middle', mono: true, fs: 12, fill: 'var(--ink)' });
      const eArrow = ln(46, 0, 46, WAF_Y - 5, { stroke: 'var(--accent)', w: 1.5 }), eHead = svg('path', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5 }), eLbl = txt(52, 0, 'E', { mono: true, fs: 12, fill: 'var(--accent)', bold: true });
      const radG = svg('g'), ionG = svg('g'), flG = svg('g');
      D.append(bulkL1, bulkL2, bulkL3, bulkL4, eArrow, eHead, eLbl, radG, ionG, flG);
      // wafer, edge ring, ESC
      D.append(svg('rect', { x: 30, y: WAF_Y - 2, width: 10, height: 12, fill: 'var(--si)', 'fill-opacity': 0.5, stroke: 'var(--si)' }));
      D.append(svg('rect', { x: WX1, y: WAF_Y - 2, width: 10, height: 12, fill: 'var(--si)', 'fill-opacity': 0.5, stroke: 'var(--si)' }));
      D.append(svg('rect', { x: WX0, y: WAF_Y, width: WX1 - WX0, height: 6, fill: 'var(--si)' }));
      D.append(svg('rect', { x: 48, y: WAF_Y + 6, width: 174, height: 48, rx: 2, fill: 'var(--muted)', 'fill-opacity': 0.4, stroke: 'var(--muted)' }));
      for (let x = 60; x < 220; x += 20) D.append(svg('circle', { cx: x, cy: WAF_Y + 10, r: 1.3, fill: 'var(--ink)', opacity: 0.5 })); // He cooling holes
      // pump port (through the right wall, low down)
      D.append(svg('rect', { x: IX1, y: 380, width: 8, height: 12, fill: 'var(--panel2)' }));
      D.append(ln(250, 386, 268, 386, { stroke: 'var(--muted)', w: 1.5 }));
      D.append(svg('path', { d: 'M263,381 L270,386 L263,391', fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.5 }));
      D.append(txt(274, 390, 'to turbopump'));
      // RF bias feed: feedthrough, blocking capacitor, generator, ground
      D.append(ln(CX, WAF_Y + 54, CX, 426, { stroke: 'var(--ink)', w: 1.5 }));
      D.append(svg('rect', { x: CX - 6, y: 400, width: 12, height: 16, fill: 'var(--panel)', stroke: 'var(--line2)' }));
      D.append(ln(CX - 10, 426, CX + 10, 426, { stroke: 'var(--ink)', w: 2 }), ln(CX - 10, 432, CX + 10, 432, { stroke: 'var(--ink)', w: 2 }));
      D.append(ln(CX, 432, CX, 443, { stroke: 'var(--ink)', w: 1.5 }));
      D.append(svg('circle', { cx: CX, cy: 453, r: 10, fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.5 }));
      D.append(txt(CX, 458, '~', { anchor: 'middle', fill: 'var(--ink)', fs: 15, bold: true }));
      D.append(ln(CX, 463, CX, 468, { stroke: 'var(--ink)', w: 1.5 }), ln(CX - 10, 468, CX + 10, 468, { stroke: 'var(--ink)', w: 1.5 }), ln(CX - 6, 472, CX + 6, 472, { stroke: 'var(--ink)', w: 1.5 }), ln(CX - 3, 476, CX + 3, 476, { stroke: 'var(--ink)', w: 1.5 }));
      D.append(txt(150, 433, 'blocking capacitor'));
      const biasLbl = txt(150, 457, ''); D.append(biasLbl);
      // grounded wall symbol
      D.append(ln(24, 412, 24, 420, { stroke: 'var(--ink)', w: 1.5 }), ln(14, 420, 34, 420, { stroke: 'var(--ink)', w: 1.5 }), ln(18, 424, 30, 424, { stroke: 'var(--ink)', w: 1.5 }), ln(21, 428, 27, 428, { stroke: 'var(--ink)', w: 1.5 }));
      D.append(txt(38, 428, 'walls grounded'));
      // margin labels with leaders
      const mlabel = (y, s, o) => { const t = txt(LX, y, s, o); D.append(t); return t; };
      const leader = (x1, y1, x2, y2) => { const l = ln(x1, y1, x2, y2, { stroke: 'var(--muted)', w: 1 }); D.append(l); return l; };
      const sTopLbl = mlabel(0, 'sheath (no glow)'), sTopLead = leader(0, 0, 0, 0);
      const sLbl1 = mlabel(0, 'wafer sheath'), sLbl2 = mlabel(0, '', { mono: true, fill: 'var(--ink)' }), sLead = leader(0, 0, 0, 0);
      const dimA = ln(238, 0, 238, WAF_Y - 2, { stroke: 'var(--accent2)', w: 1.2 }), dimT = ln(234, 0, 242, 0, { stroke: 'var(--accent2)', w: 1.2 }); D.append(dimA, dimT);
      mlabel(318, '300 mm wafer'); leader(254, 313, 244, 313);
      mlabel(334, 'edge ring (Si)'); leader(254, 330, 238, 321);
      mlabel(350, 'ESC chuck'); mlabel(364, '(He-cooled)'); leader(254, 346, 224, 346);

      function buildTop() {
        topG.innerHTML = '';
        const m = st.mode;
        topG.append(svg('rect', { x: CX - 6, y: 22, width: 12, height: 40, fill: 'var(--panel)', stroke: 'var(--line2)' }));
        topG.append(ln(CX, 28, CX, 56, { stroke: 'var(--ok)', w: 1.5 }), svg('path', { d: `M${CX - 4},51 L${CX},58 L${CX + 4},51`, fill: 'none', stroke: 'var(--ok)', 'stroke-width': 1.5 }));
        topG.append(txt(CX, 16, 'gas in · ' + MODES[m].gas, { anchor: 'middle' }));
        if (m === 'ccp') {
          topG.append(svg('rect', { x: 36, y: 62, width: 198, height: 20, fill: 'var(--si)', 'fill-opacity': 0.35, stroke: 'var(--si)' }));
          for (let x = 44; x <= 226; x += 12) topG.append(ln(x, 82, x, 87, { stroke: 'var(--si)', w: 1.5 }));
          topG.append(txt(CX, 76, 'Si showerhead · top electrode', { anchor: 'middle', fill: 'var(--ink)', fs: 12 }));
          topG.append(svg('circle', { cx: 228, cy: 34, r: 8, fill: 'var(--panel)', stroke: 'var(--ink)', 'stroke-width': 1.5 }), txt(228, 38.5, '~', { anchor: 'middle', fill: 'var(--ink)', fs: 13, bold: true }));
          topG.append(ln(228, 42, 228, 62, { stroke: 'var(--ink)', w: 1.5 }));
          topG.append(txt(360, 16, '60 MHz source', { anchor: 'end' }));
        } else {
          topG.append(svg('rect', { x: 20, y: 52, width: 230, height: 10, fill: 'var(--panel)', stroke: 'var(--si)', 'stroke-dasharray': '3 2' }));
          [52, 72, 92, 178, 198, 218].forEach(x => topG.append(svg('circle', { cx: x, cy: 42, r: 4.5, fill: 'var(--cu)', stroke: 'var(--ink)', 'stroke-width': 0.8 })));
          topG.append(txt(360, 16, 'ICP coil · 13.56 MHz', { anchor: 'end' }));
          topG.append(txt(360, 30, 'quartz window', { anchor: 'end' }));
        }
        Object.keys(modeBtns).forEach(k => { modeBtns[k].classList.toggle('primary', k === m); modeBtns[k].setAttribute('aria-pressed', String(k === m)); });
        modeInfo.textContent = MODES[m].info;
        biasLbl.textContent = 'RF bias · ' + MODES[m].biasHz;
      }

      // ================= particles =================
      const ions = [], rads = [], flashes = [];
      for (let i = 0; i < 24; i++) { const tr = svg('polyline', { fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.6, opacity: 0.75 }); const c = svg('circle', { r: 2.4, fill: 'var(--accent)' }); const g = svg('g'); g.append(tr, c); ionG.append(g); ions.push({ g, tr, c, x: 0, y: 0, vx: 0, vy: 0, toColl: 1, trail: [] }); }
      for (let i = 0; i < 32; i++) { const c = svg('circle', { r: 2, fill: 'var(--ok)' }); radG.append(c); rads.push({ c, x: 0, y: 0, vx: 0, vy: 0, t: 0 }); }
      for (let i = 0; i < 8; i++) { const c = svg('circle', { r: 0, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 1.5, opacity: 0 }); flG.append(c); flashes.push({ c, t: 1, x: 0, y: 0 }); }
      const rnd = Math.random;
      function spawnIon(o) { o.x = WX0 + 4 + rnd() * (WX1 - WX0 - 8); o.y = G.sheathTop - rnd() * 10; o.vx = (rnd() - 0.5) * 6; o.vy = 22; o.toColl = -G.lamPx * Math.log(rnd() + 1e-9); o.trail = []; }
      function spawnRad(o) { o.x = IX0 + 6 + rnd() * (IX1 - IX0 - 12); o.y = G.topY + 6 + rnd() * (WAF_Y - G.topY - 12); newDir(o); }
      function newDir(o) { const a = rnd() * 2 * Math.PI, s = 34 + rnd() * 16; o.vx = s * Math.cos(a); o.vy = s * Math.sin(a); o.t = 0.25 + rnd() * 0.45; }
      function flash(x, y) { const f = flashes.find(f => f.t >= 1) || flashes[0]; f.t = 0; f.x = x; f.y = y; }
      function step(dt) {
        const a = G.vEnd * G.vEnd / (2 * Math.max(G.sPx, 6));
        ions.forEach((o, i) => {
          if (i >= G.nIon) { o.g.setAttribute('display', 'none'); return; }
          o.g.removeAttribute('display');
          if (o.y > G.sheathTop) o.vy += a * dt;
          const dx = o.vx * dt, dy = o.vy * dt; o.x += dx; o.y += dy; o.toColl -= Math.hypot(dx, dy);
          if (o.toColl <= 0 && o.y > G.sheathTop) { const ang = rnd() * 2 * Math.PI, s = 18; o.vx = s * Math.cos(ang); o.vy = s * Math.sin(ang); o.toColl = -G.lamPx * Math.log(rnd() + 1e-9); }
          if (o.y >= WAF_Y) { flash(o.x, WAF_Y); spawnIon(o); }
          else if (o.x < IX0 + 2 || o.x > IX1 - 2 || o.y < G.topY + 2) spawnIon(o);
          o.trail.push(o.x.toFixed(1) + ',' + o.y.toFixed(1)); if (o.trail.length > 10) o.trail.shift();
          o.tr.setAttribute('points', o.trail.join(' ')); o.c.setAttribute('cx', o.x.toFixed(1)); o.c.setAttribute('cy', o.y.toFixed(1));
        });
        rads.forEach((o, i) => {
          if (i >= G.nRad) { o.c.setAttribute('display', 'none'); return; }
          o.c.removeAttribute('display');
          o.t -= dt; if (o.t <= 0) newDir(o);
          o.x += o.vx * dt; o.y += o.vy * dt;
          if (o.x < IX0 + 3) { o.x = IX0 + 3; o.vx = Math.abs(o.vx); } else if (o.x > IX1 - 3) { o.x = IX1 - 3; o.vx = -Math.abs(o.vx); }
          if (o.y < G.topY + 3) { o.y = G.topY + 3; o.vy = Math.abs(o.vy); }
          else if (o.y > WAF_Y - 3) { if (o.x > WX0 - 10 && o.x < WX1 + 10 && rnd() < 0.6) { spawnRad(o); } else { o.y = WAF_Y - 3; o.vy = -Math.abs(o.vy); } }
          o.c.setAttribute('cx', o.x.toFixed(1)); o.c.setAttribute('cy', o.y.toFixed(1));
        });
        flashes.forEach(f => { if (f.t >= 1) { f.c.setAttribute('opacity', 0); return; } f.t = Math.min(1, f.t + dt / 0.35); f.c.setAttribute('cx', f.x.toFixed(1)); f.c.setAttribute('cy', f.y); f.c.setAttribute('r', (2 + 7 * f.t).toFixed(1)); f.c.setAttribute('opacity', (1 - f.t).toFixed(2)); });
      }
      function frame(ts) {
        raf = 0; if (!st.playing || !visible) return;
        const dt = last ? Math.min(0.05, (ts - last) / 1000) : 1 / 60; last = ts;
        step(dt); raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(frame); } }

      // ================= right column: readouts + gauge =================
      const stats = {}; const readout = h('div', { class: 'w-readout' });
      [['Ei', 'ion energy at the wafer'], ['flux', 'ion flux at the wafer'], ['J', 'ion current density'], ['n', 'plasma density · Tₑ'], ['lambda', 'mean free path λ'], ['sheath', 'wafer sheath thickness s'], ['coll', 'collisions per sheath crossing (s/λ)'], ['f0', 'ions arriving unscattered'], ['theta', 'ion angular spread (half-width)'], ['rate', 'sputter-limited rate, 1 atom/ion']]
        .forEach(([k, l]) => { stats[k] = h('b'); readout.append(h('div', { class: 'w-stat' }, stats[k], h('span', null, l))); });
      const PG = svg('svg', { class: 'w-svg', viewBox: '0 0 300 238', role: 'img', 'aria-label': 'Sheath thickness versus mean free path, and the ion angular distribution' });
      const GX0 = 96, GX1 = 238, gx = mm => GX0 + (GX1 - GX0) * (Math.log10(clamp(mm, 0.1, 100)) + 1) / 3;
      PG.append(txt(4, 14, 'Sheath vs. mean free path (log scale)', { fill: 'var(--ink)', bold: true, fs: 13 }));
      [0.1, 1, 10, 100].forEach(v => { PG.append(ln(gx(v), 26, gx(v), 66, { stroke: 'var(--line)', w: 1 })); PG.append(txt(gx(v), 80, v + (v === 100 ? ' mm' : ''), { anchor: 'middle', mono: true, fs: 12 })); });
      PG.append(txt(GX0 - 6, 39, 'sheath s', { anchor: 'end', fs: 13 }), txt(GX0 - 6, 59, 'free path λ', { anchor: 'end', fs: 13 }));
      const barS = svg('rect', { x: GX0, y: 29, height: 13, rx: 2, fill: 'var(--accent2)' }), barL = svg('rect', { x: GX0, y: 49, height: 13, rx: 2, fill: 'var(--si)' });
      const barSv = txt(0, 39, '', { mono: true, fill: 'var(--ink)', fs: 12 }), barLv = txt(0, 59, '', { mono: true, fill: 'var(--ink)', fs: 12 });
      const gStat1 = txt(4, 102, '', { bold: true, fs: 13 }), gStat2 = txt(4, 119, '', { fs: 12.5 });
      PG.append(barS, barL, barSv, barLv, gStat1, gStat2);
      const iadTitle = txt(4, 146, '', { fill: 'var(--ink)', bold: true, fs: 13 }); PG.append(iadTitle);
      const IAD_Y0 = 212, IAD_H = 54, IAD_X = 150, IAD_K = 130 / 45;
      PG.append(ln(14, IAD_Y0, 286, IAD_Y0, { stroke: 'var(--line2)', w: 1 }));
      [[-45, '−45°'], [0, '0° (vertical)'], [45, '+45°']].forEach(([d, s]) => PG.append(txt(IAD_X + d * IAD_K, IAD_Y0 + 14, s, { anchor: 'middle', mono: true, fs: 12 })));
      const iad = svg('path', { fill: 'var(--accent)', 'fill-opacity': 0.35, stroke: 'var(--accent)', 'stroke-width': 1.5 }); PG.append(iad);
      const formula = h('div', { class: 'w-formula', style: { display: 'block', maxWidth: '100%', whiteSpace: 'normal', lineHeight: 1.6 } });

      function update() {
        R = calc(st.mode, st.bias, st.p, st.src);
        biasOut.textContent = fmt(st.bias, 0) + ' W'; srcOut.textContent = fmt(st.src, 0) + ' W';
        pOut.textContent = fmt(st.p, st.p < 10 ? 1 : 0) + ' mTorr (' + fmt(R.pPa, R.pPa < 10 ? 2 : 1) + ' Pa)';
        const lamMm = R.lambda * 1e3, sMm = R.sheath * 1e3, sTopMm = R.sTop * 1e3;
        const topY = st.mode === 'ccp' ? 82 : 62, sTopPx = Math.min(40, pxOfMm(sTopMm)), sPx = pxOfMm(sMm), sheathTop = WAF_Y - sPx;
        const nIon = clamp(Math.round(4 + 10 * Math.log10(R.flux / 1e15)), 3, 24), nRad = Math.min(32, 8 + nIon);
        G = { topY, sTopPx, sPx, sheathTop, nIon, nRad, vEnd: 70 + 160 * Math.sqrt(R.Ei / 1000), lamPx: Math.max(sPx / 8, sPx / Math.max(R.ratio, 1e-3)) };
        // chamber geometry
        const gy = topY + sTopPx, gh = sheathTop - gy, gx0 = IX0 + sTopPx, gw = IX1 - IX0 - 2 * sTopPx;
        const op = 0.15 + 0.35 * clamp((Math.log10(R.n) - 9) / 3, 0, 1);
        [glow, edge].forEach(r => { r.setAttribute('x', gx0); r.setAttribute('y', gy); r.setAttribute('width', gw); r.setAttribute('height', gh); });
        glow.setAttribute('fill-opacity', op.toFixed(2));
        core.setAttribute('cx', CX); core.setAttribute('cy', gy + gh / 2); core.setAttribute('rx', gw * 0.36); core.setAttribute('ry', gh * 0.32); core.setAttribute('fill-opacity', (op * 0.6).toFixed(2));
        const mid = gy + gh / 2;
        bulkL1.setAttribute('y', mid - 16); bulkL2.setAttribute('y', mid + 1); bulkL3.setAttribute('y', mid + 17); bulkL4.setAttribute('y', mid + 33);
        bulkL2.textContent = 'n = ' + sci(R.n) + ' cm⁻³'; bulkL3.textContent = 'Tₑ = ' + R.Te.toFixed(1) + ' eV';
        const yTop = topY + Math.max(sTopPx, 14) / 2 + 4;
        sTopLbl.setAttribute('y', yTop); [['x1', 254], ['y1', yTop - 4], ['x2', 244], ['y2', topY + sTopPx / 2]].forEach(([k, v]) => sTopLead.setAttribute(k, v));
        const y2 = sPx >= 36 ? WAF_Y - sPx / 2 + 13 : WAF_Y - sPx - 4, y1 = y2 - 16;
        sLbl1.setAttribute('y', y1); sLbl2.setAttribute('y', y2); sLbl2.textContent = 's = ' + mmf(sMm) + ' mm';
        [['x1', 254], ['y1', y1 - 4], ['x2', 244], ['y2', sheathTop + sPx / 2]].forEach(([k, v]) => sLead.setAttribute(k, v));
        dimA.setAttribute('y1', sheathTop); dimT.setAttribute('y1', sheathTop); dimT.setAttribute('y2', sheathTop);
        [dimA, dimT].forEach(l => l.setAttribute('opacity', sPx >= 10 ? 1 : 0));
        const showE = sPx >= 26;
        eArrow.setAttribute('y1', sheathTop + 5); eHead.setAttribute('d', `M42,${WAF_Y - 11} L46,${WAF_Y - 5} L50,${WAF_Y - 11}`); eLbl.setAttribute('y', sheathTop + sPx / 2 + 4);
        [eArrow, eHead, eLbl].forEach(e => e.setAttribute('opacity', showE ? 1 : 0));
        // readouts
        stats.Ei.textContent = R.Ei >= 1000 ? fmt(R.Ei / 1000, 2) + ' keV' : fmt(R.Ei, 0) + ' eV';
        stats.flux.textContent = sci(R.flux) + ' cm⁻² s⁻¹';
        stats.J.textContent = fmt(R.J * 1e3, R.J * 1e3 < 1 ? 2 : 1) + ' mA/cm²';
        stats.n.textContent = sci(R.n) + ' cm⁻³ · ' + R.Te.toFixed(1) + ' eV';
        stats.lambda.textContent = mmf(lamMm) + ' mm';
        stats.sheath.textContent = mmf(sMm) + ' mm';
        stats.coll.textContent = fmt(R.ratio, R.ratio < 1 ? 2 : 1);
        stats.f0.textContent = pct(R.f0) + ' %';
        stats.theta.textContent = '±' + fmt(R.theta, 1) + '°';
        stats.rate.textContent = fmt(R.rate, 0) + ' nm/min';
        // gauge
        barS.setAttribute('width', Math.max(2, gx(sMm) - GX0)); barL.setAttribute('width', Math.max(2, gx(lamMm) - GX0));
        barSv.setAttribute('x', gx(sMm) + 5); barSv.textContent = mmf(sMm) + ' mm';
        barLv.setAttribute('x', gx(lamMm) + 5); barLv.textContent = mmf(lamMm) + ' mm';
        const tier = R.ratio > 1 ? 2 : R.ratio > 0.2 ? 1 : 0;
        gStat1.textContent = ['λ ≫ s → collisionless: ions fly straight', 'λ > s → mostly collisionless', 'λ < s → collisional: ions scatter'][tier];
        gStat1.setAttribute('fill', ['var(--ok)', 'var(--accent)', 'var(--warn)'][tier]);
        gStat2.textContent = fmt(R.ratio, R.ratio < 1 ? 2 : 1) + ' collisions/crossing · ' + pct(R.f0) + '% unscattered';
        iadTitle.textContent = 'Ion angles at the wafer: half-width ±' + fmt(R.theta, 1) + '°';
        const sig = Math.max(0.6, R.theta / 1.177); let d = '';
        for (let a = -45; a <= 45; a += 0.5) { const yv = IAD_Y0 - IAD_H * Math.exp(-a * a / (2 * sig * sig)); d += (a === -45 ? 'M' : 'L') + (IAD_X + a * IAD_K).toFixed(1) + ',' + yv.toFixed(1); }
        iad.setAttribute('d', d + 'Z');
        // text
        const en = R.Ei >= 1000 ? fmt(R.Ei / 1000, 2) + ' keV' : fmt(R.Ei, 0) + ' eV';
        status.innerHTML = '<b>Now:</b> ' + [
          `ions cross the ${mmf(sMm)} mm sheath almost without collisions (mean free path ${mmf(lamMm)} mm), arriving at ${en} within ±${fmt(R.theta, 1)}° of vertical — a beam of ions aimed at the wafer, made from a gas that is otherwise isotropic. The green radicals still arrive from every direction.`,
          `ions cross the ${mmf(sMm)} mm sheath with a mean free path of ${mmf(lamMm)} mm: ${pct(R.f0)}% arrive unscattered at ${en}, the rest collide on the way down and land at an angle, widening the arrival cone to ±${fmt(R.theta, 1)}°. Lower the pressure (longer λ) or the bias (thinner sheath) to tighten it.`,
          `ions gain up to ${en} crossing a ${mmf(sMm)} mm sheath, but the mean free path is only ${mmf(lamMm)} mm — an ion suffers ~${fmt(R.ratio, 1)} collisions on the way down, so only ${pct(R.f0)}% arrive unscattered and the ion "beam" fans out to ±${fmt(R.theta, 0)}°. Anisotropy degrades; lower the pressure to fix it.`][tier];
        formula.innerHTML = `λ = k·T / (√2·π·d²·p) = (1.38×10⁻²³ J/K · 300 K) / (√2 · π · (0.36 nm)² · ${fmt(R.pPa, R.pPa < 10 ? 2 : 1)} Pa) = <b>${mmf(lamMm)} mm</b> (argon, neutrals at room temperature)<br>` +
          `E<sub>ion</sub> ≈ e·(V<sub>p</sub> − V<sub>dc</sub>) = e·(25 V + ${fmt(R.Vdc, 0)} V) = <b>${en}</b>; V<sub>dc</sub> ≈ η·P<sub>bias</sub> / (e·Γ·A) with η ≈ 0.6, A ≈ 1 500 cm² (power balance)<br>` +
          `Γ = 0.61·n·u<sub>B</sub>, u<sub>B</sub> = √(kT<sub>e</sub>/M) = ${fmt(R.uB / 1000, 1)} km/s → <b>${sci(R.flux)} cm⁻²s⁻¹</b>; n ≈ ${sci(MODES[st.mode].nPerKw, 0)} cm⁻³ per kW of source power (${MODES[st.mode].srcLabel})<br>` +
          `s ≈ (√2/3)·λ<sub>D</sub>·(2V<sub>sh</sub>/T<sub>e</sub>)<sup>3/4</sup>, λ<sub>D</sub> = √(ε₀T<sub>e</sub>/(n<sub>s</sub>e)) = ${fmt(R.lamD * 1e6, 0)} µm → <b>s = ${mmf(sMm)} mm</b> (Child–Langmuir); unscattered fraction = e<sup>−s/λ</sup> = ${pct(R.f0)}%`;
      }

      // ================= layout =================
      const legend = h('div', { class: 'w-legend' },
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent)', borderRadius: '50%' } }), 'ion (accelerated across the sheath)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--ok)', borderRadius: '50%' } }), 'radical (neutral, wanders in every direction)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--accent2)', opacity: 0.6 } }), 'plasma glow (electrons excite light)'),
        h('span', { class: 'w-legend-item' }, h('i', { style: { background: 'var(--panel2)', border: '1px dashed var(--accent2)' } }), 'sheath: no electrons, no glow, strong field'));
      const grid = h('div', { class: 'w-grid2', style: { display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '14px', alignItems: 'start' } },
        h('div', null, D, legend), h('div', null, readout, PG));
      let layoutFrame = 0, previousWidth = -1;
      const ro = new ResizeObserver(() => { const width = el.clientWidth; if (width === previousWidth) return; previousWidth = width; cancelAnimationFrame(layoutFrame); layoutFrame = requestAnimationFrame(() => { grid.style.gridTemplateColumns = width < 820 ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) minmax(0, 1fr)'; }); });
      ro.observe(el);
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);
      el.append(controls, modeInfo, status, grid, formula,
        h('div', { class: 'w-note' }, 'Simple model: density ∝ absorbed power (bias power counts at 50% in a CCP, 15% in an ICP), Tₑ falls slowly with pressure, an argon-like ion of 40 amu, and a collisionless Child–Langmuir sheath (a collisional sheath is somewhat thinner than shown; at 2 MHz the real energy distribution is bimodal around the value given). Sheath thickness is drawn log-compressed; a real ion crosses the sheath in ~0.1 µs — here it is slowed ~10⁷×. Ions and radicals shown are a handful of the ~10⁹–10¹² per cm³ present.'));
      buildTop(); update();
      for (let i = 0; i < ions.length; i++) spawnIon(ions[i]); for (let i = 0; i < rads.length; i++) spawnRad(rads[i]);
      for (let i = 0; i < 90; i++) step(1 / 60);
      start();
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); ro.disconnect(); cancelAnimationFrame(layoutFrame); };
    }
  });
})();
