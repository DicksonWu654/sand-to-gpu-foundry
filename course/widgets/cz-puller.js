/* Widget: cz-puller — "Czochralski Puller" (Module 02) */
(function () {
  'use strict';
  const RHO_S = 2.33, RHO_L = 2.57;                 // g/cm3, solid / liquid silicon
  const CHARGE_KG = 400;                            // polysilicon charge
  const D_BODY = 306, R_MELT_MM = 395;              // mm: body diameter set point (ADC), melt radius in a 32 in crucible
  const NECK = { len: 150, d: 3, rate: 4 };         // mm, mm, mm/min
  const CROWN = { len: 80, rate: 1.2 };             // mm, mm/min
  const BODY = { len: 2000 };                       // mm (pull rate from the slider)
  const TAIL = { len: 200, rate: 2.0 };             // mm, mm/min
  const MELT_H = 8;                                 // h: charge, meltdown (6–10 h), stabilise, seed dip
  const SEED_RPM = 15, G_KPCM = 30;                 // crystal rotation; axial gradient at the interface, K/cm
  const ANIM_S = [3, 3, 2.5, 14, 3];                // animation seconds per phase at 1× (short phases stretched)
  const LIFT_MM_PER_KG = 1000 / RHO_L / (Math.PI * Math.pow(R_MELT_MM / 10, 2)) * 10; // ≈0.79 mm of melt height per kg grown
  const NAMES = ['Charge & meltdown', 'Dash neck', 'Shoulder (crown)', 'Body growth', 'Tail (end cone)'];
  const WHY = [
    'Ramping the graphite heater melts the 400 kg pile of polysilicon chunks through 1,414 °C in 6–10 hours; solid silicon floats on the denser liquid, so the pile slumps as the melt rises under it. The melt is held 30–60 min to settle, then the seed crystal is dipped.',
    'The seed is pulled fast (3–6 mm/min) and thin (~3 mm) so every dislocation — a line defect in the lattice, created by the thermal shock of the dip — glides out to the surface. After a few centimetres the crystal is dislocation-free: Dash’s trick.',
    'Pull rate is dropped and the melt cooled slightly so the crystal flares from 3 mm out to the 306 mm body diameter over some tens of millimetres. The crown is scrap, so it is grown flat, but not so abruptly that new dislocations form.',
    'The quiet part: ~2 m at 0.5–1.5 mm/min while automatic diameter control (a camera watching the meniscus) trims pull rate and heater power, and the crucible is lifted so the melt surface stays at the same height in the hot zone.',
    'With 5–10% of the melt left, pull rate and temperature are raised to taper the crystal to a point, so it detaches without the thermal shock that would send dislocations back up ~300 mm into the body.'];

  const dCrown = f => NECK.d + (D_BODY - NECK.d) * Math.pow(f, 0.45);   // shallow, convex shoulder
  const dTail = f => D_BODY * (1 - f);                                    // straight end cone
  function schedule(v) {
    const P = [{ h: MELT_H, len: 0 }, { h: NECK.len / NECK.rate / 60, len: NECK.len }, { h: CROWN.len / CROWN.rate / 60, len: CROWN.len },
      { h: BODY.len / v / 60, len: BODY.len }, { h: TAIL.len / TAIL.rate / 60, len: TAIL.len }];
    let acc = 0; P.forEach(p => { p.start = acc; acc += p.h; p.end = acc; });
    return { P, total: acc };
  }
  function progressAt(P, simH) {
    const done = P.map(p => simH >= p.end ? p.len : simH > p.start ? p.len * (simH - p.start) / p.h : 0);
    let cur = P.length - 1; for (let i = 0; i < P.length; i++) if (simH < P[i].end - 1e-9) { cur = i; break; }
    return { done, cur, frac: Math.max(0, Math.min(1, (simH - P[cur].start) / P[cur].h)) };
  }
  function massKg(done) {
    const cyl = (d, l) => Math.PI * Math.pow(d / 20, 2) * (l / 10);
    let v = cyl(NECK.d, done[1]) + cyl(D_BODY, done[3]);
    const fc = done[2] / CROWN.len, n = 24;
    for (let i = 0; i < n; i++) v += Math.PI * Math.pow(dCrown(fc * (i + 0.5) / n) / 20, 2) * (fc * CROWN.len / n / 10);
    const r0 = D_BODY / 20, r1 = dTail(done[4] / TAIL.len) / 20, l = done[4] / 10;
    v += Math.PI * l / 3 * (r0 * r0 + r0 * r1 + r1 * r1);
    return v * RHO_S / 1000;
  }
  const ease = t => t * t * (3 - 2 * t);

  window.registerWidget('cz-puller', {
    title: 'Czochralski Puller',
    caption: 'Play the run: the crystal is pulled up out of the melt while the crucible is lifted so the melt surface stays put; the inset magnifies the 3 mm Dash neck that the whole ~360 kg ingot hangs from.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const uid = 'czp' + Math.random().toString(36).slice(2, 7);
      const st = { v: 0.8, rpm: 10, speed: 1, playing: !reduced, simH: 0, angS: 0, angC: 0, drift: 0 };
      { const sc = schedule(st.v); st.simH = sc.P[3].start + 0.4 * sc.P[3].h; }   // first frame: 40% into the body
      el.classList.add(uid);
      el.append(h('style', null, `.${uid} .w-step-dot:hover{border-color:var(--accent);transform:scale(1.35)} .${uid} .w-step-dot{transition:transform .12s}`));

      // ---------- controls ----------
      const playBtn = h('button', { class: 'w-btn primary', type: 'button' }, 'Pause');
      const speedOut = h('output'), vOut = h('output'), rpmOut = h('output');
      const speedSlider = h('input', { type: 'range', min: 0.5, max: 4, step: 0.5, value: st.speed });
      const vSlider = h('input', { type: 'range', min: 0.5, max: 1.5, step: 0.1, value: st.v });
      const rpmSlider = h('input', { type: 'range', min: 5, max: 15, step: 1, value: st.rpm });
      const ctl = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl', style: { minWidth: '0', flex: '0 0 auto' } }, playBtn),
        h('label', { class: 'w-ctl' }, h('span', null, 'Animation speed'), speedSlider, speedOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Pull rate (body)'), vSlider, vOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'Crucible rotation'), rpmSlider, rpmOut));
      const stage = h('div', { class: 'w-studio' });

      // ---------- readouts / phase card / formula ----------
      const B = () => h('b');
      const stHour = B(), stLen = B(), stMass = B(), stMelt = B(), stLift = B(), stNeck = B(), stOx = B(), stVG = B();
      const readout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, stHour, h('span', null, 'elapsed h:mm / total run')),
        h('div', { class: 'w-stat' }, stLen, h('span', null, 'crystal length')),
        h('div', { class: 'w-stat' }, stMass, h('span', null, 'crystal mass grown')),
        h('div', { class: 'w-stat' }, stMelt, h('span', null, 'melt left in crucible')),
        h('div', { class: 'w-stat' }, stLift, h('span', null, 'crucible lift so far')),
        h('div', { class: 'w-stat' }, stNeck, h('span', null, 'stress on 3 mm neck (unsupported)')),
        h('div', { class: 'w-stat' }, stOx, h('span', null, 'interstitial oxygen (indicative, from crucible rpm)')),
        h('div', { class: 'w-stat' }, stVG, h('span', null, 'v/G, cm²/(min·K), with G ≈ 30 K/cm')));
      const prevBtn = h('button', { class: 'w-btn', type: 'button', 'aria-label': 'Previous phase' }, '‹ Prev');
      const nextBtn = h('button', { class: 'w-btn', type: 'button', 'aria-label': 'Next phase' }, 'Next ›');
      const countSpan = h('span', { class: 'count' });
      const phaseName = h('div', { class: 'w-step-title' }), phaseWhy = h('div', { class: 'w-step-desc' });
      const phaseCard = h('div', { class: 'w-steps' }, h('div', { class: 'w-step-nav' }, prevBtn, nextBtn, countSpan), phaseName, phaseWhy);
      const formula = h('div', { class: 'w-formula' });
      const note = h('div', { class: 'w-note' },
        'The main view is drawn to scale (roughly 5–6 mm per pixel on a desktop screen; the exact figure is printed under the time bar) except that the body is shortened at the break mark so the full 2.4 m crystal fits, the neck is drawn 4 px wide instead of under 1 px so it is visible (the inset has the true proportions), and the animation stretches meltdown, neck, crown and tail so they can be watched — the time bar is to scale. Crucible rotation carries hot, oxygen-rich melt from the dissolving quartz wall toward the centre, so more rpm means more oxygen (the readout is indicative, not a model). 300 mm pullers usually add a mechanical crystal support after the crown so the neck does not carry the full load.');
      let detailView = false;
      const viewButtons = [h('button', { type: 'button', class: 'w-btn', 'data-cz-view': 'apparatus', on: { click: () => { detailView = false; render(); } } }, 'Puller apparatus'), h('button', { type: 'button', class: 'w-btn', 'data-cz-view': 'neck', on: { click: () => { detailView = true; render(); } } }, 'Inspect the seed neck')];
      const viewNav = h('div', { class: 'w-step-nav' }, viewButtons);
      const phaseRail = h('div', { class: 'w-lab-progress', 'aria-label': 'Crystal growth phases' });
      const phaseButtons = NAMES.map((name, i) => h('button', { type: 'button', 'data-phase': i, on: { click: () => jump(i) } }, h('span', null, String(i + 1).padStart(2, '0')), h('b', null, name)));
      phaseRail.append(...phaseButtons);
      const secondary = h('div', { class: 'w-readout' }, ...Array.from(readout.children).slice(4));
      const reference = h('details', { class: 'w-details' }, h('summary', null, 'Mass balance, neck stress and model assumptions'), secondary, formula, note);
      el.append(h('div', { class: 'w-lab-kicker' }, 'Grow one continuous crystal'), phaseRail, viewNav, stage, phaseCard,
        h('div', { class: 'w-console' }, h('div', { class: 'w-lab-kicker' }, 'Control the growth run'), ctl, readout),
        h('div', { class: 'w-note' }, 'Body length is compressed at the break mark. The inset magnifies the Dash neck; oxygen and defect readouts are illustrative. Open the model notes for assumptions.'), reference);

      // ---------- SVG scene ----------
      let scene = null;
      // mode 'wide': puller pane 510 px + inset column beside it in a 760-wide viewBox (stage >= 650 px; the course page gives 658).
      // mode 'narrow': pane as wide as the stage (460–640, drawn 1:1) with the inset stacked below; phones get the 460 pane scaled down.
      function build(mode, fs, paneW, cw) {
        const wide = mode === 'wide';
        const S = wide ? 0.2 : 0.14 * paneW / 460, mm = v => v * S, ifs = 13, k = wide ? 1 : fs / 12.5;   // main scale px/mm; inset font; inset scale
        const cx = paneW / 2, roomy = wide || paneW >= 500;                                                // roomy: label columns fit the long labels
        const lh = Math.round(fs * 13) / 10, fsm = fs;
        // radii, outside in (px)
        const rX = mm(D_BODY / 2), rC = mm(R_MELT_MM), tq = Math.max(4, mm(14)), tS = Math.max(5, mm(30));
        const rSo = rC + tq + tS, rHi = rSo + 4, rHo = rHi + Math.max(8, mm(45)), rIi = rHo + 3, rIo = rIi + Math.max(10, mm(60)), rCh = rIo + 13;
        const rPC = Math.max(rX + 26, mm(260)), tPC = 6, xL = cx - rCh - 14, xR = cx + rCh + 14;
        // heights
        const yTop = 8, yValve = 170, yInt = 370;
        const hMelt0 = Math.round(mm(317)), rim0 = yInt - Math.round(mm(120)), floor0 = yInt + hMelt0, susB0 = floor0 + tq + Math.max(6, mm(30));
        const yHeat0 = yInt - Math.round(mm(500)), yHeat1 = susB0 + 8, yIns0 = yHeat0 - 4, yIns1 = yHeat1 + Math.max(8, mm(45));
        const yChB0 = yIns1 + 5, yChB1 = yChB0 + 8, yLab = yChB1 + 8, yBot = yLab + 2 * lh + 4;
        const seedW = Math.max(6, mm(15)), seedH = Math.max(16, mm(100)), holdH = 10;
        const Sb = (yInt - (yTop + tPC + 22 + holdH) - seedH - mm(NECK.len) - mm(CROWN.len) - mm(TAIL.len)) / BODY.len;   // compressed body scale
        const shY0 = yInt - Math.round(mm(450)), shY1 = yInt - Math.round(mm(130)), rPT = rX + 10;
        const insW = 248, insH = 340, tbH = 104;
        const insetX = wide ? 512 : Math.round((paneW - insW * k) / 2), insetY = wide ? 6 : yBot + 10;
        const timeX = insetX, timeY = Math.round(insetY + insH * k + 14), noteY = Math.round(timeY + tbH * k + 10);
        const W = wide ? 760 : paneW, H = wide ? Math.max(yBot + 4, noteY + 3 * lh + 2) : Math.round(timeY + tbH * k + 6);
        const D = svg('svg', { class: 'w-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Cross-section of a Czochralski puller growing a 300 mm silicon crystal, with a magnified view of the seed and Dash neck' });
        const SANS = 'var(--sans)', MONO = 'var(--mono)';
        const T = (x, y, s, o = {}) => svg('text', Object.assign({ x, y, 'font-family': o.mono ? MONO : SANS, 'font-size': o.size || (o.mono ? fsm : fs), fill: o.fill || 'var(--ink)', 'text-anchor': o.anchor || 'start' }, o.attrs || {}), s);
        const bowl = (hw, y0, y1, r) => `M${(cx - hw).toFixed(1)},${y0} L${(cx - hw).toFixed(1)},${(y1 - r).toFixed(1)} Q${(cx - hw).toFixed(1)},${y1} ${(cx - hw + r).toFixed(1)},${y1} L${(cx + hw - r).toFixed(1)},${y1} Q${(cx + hw).toFixed(1)},${y1} ${(cx + hw).toFixed(1)},${(y1 - r).toFixed(1)} L${(cx + hw).toFixed(1)},${y0} Z`;
        // ---- defs ----
        const defs = svg('defs', null);
        const grad = svg('linearGradient', { id: uid + '-melt', gradientUnits: 'userSpaceOnUse', x1: 0, y1: yInt, x2: 0, y2: floor0 },
          svg('stop', { offset: 0, style: 'stop-color:var(--warn)' }), svg('stop', { offset: 1, style: 'stop-color:var(--bad)' }));
        const meltClip = svg('rect', { x: 0, y: yInt, width: W, height: 900 });
        const chunkClip = svg('rect', { x: 0, y: rim0, width: W, height: 0 });
        defs.append(grad,
          svg('pattern', { id: uid + '-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--ink)', 'stroke-opacity': .35, 'stroke-width': 1.5 })),
          svg('clipPath', { id: uid + '-int' }, svg('path', { d: bowl(rC - 0.5, rim0, floor0, rC * 0.35) })),
          svg('clipPath', { id: uid + '-mc' }, meltClip), svg('clipPath', { id: uid + '-cc' }, chunkClip),
          svg('clipPath', { id: uid + '-pane' }, svg('rect', { x: 0, y: 0, width: paneW, height: wide ? H : yBot })));
        D.append(defs);
        // ---- chamber: double-walled, water-cooled steel (thin blue line = water channel) ----
        const wall = (x, y, w, hh) => svg('g', null, svg('rect', { x, y, width: w, height: hh, fill: 'var(--panel2)', stroke: 'var(--ink)', 'stroke-opacity': .6, 'stroke-width': 1 }),
          w > hh ? svg('line', { x1: x + 2, y1: y + hh / 2, x2: x + w - 2, y2: y + hh / 2, stroke: 'var(--si)', 'stroke-width': 1.2 }) : svg('line', { x1: x + w / 2, y1: y + 2, x2: x + w / 2, y2: y + hh - 2, stroke: 'var(--si)', 'stroke-width': 1.2 }));
        D.append(wall(cx - rPC - tPC, yTop, tPC, yValve - 4 - yTop), wall(cx + rPC, yTop, tPC, yValve - 4 - yTop), wall(cx - rPC - tPC, yTop, 2 * rPC + 2 * tPC, tPC),
          wall(cx - rCh, yValve - 4, rCh - rPC - tPC + 1, 8), wall(cx + rPC + tPC - 1, yValve - 4, rCh - rPC - tPC + 1, 8),
          wall(cx - rCh, yValve - 4, 8, yChB1 - yValve + 4), wall(cx + rCh - 8, yValve - 4, 8, yChB1 - yValve + 4),
          wall(cx - rCh, yChB0, rCh - 8, 8), wall(cx + 8, yChB0, rCh - 8, 8));
        // isolation valve: dashed gate line across the bore + gate housing on the right
        D.append(svg('line', { x1: cx - rPC, y1: yValve, x2: cx + rPC, y2: yValve, stroke: 'var(--ink)', 'stroke-width': 1.5, 'stroke-dasharray': '5 3', 'stroke-opacity': .85 }),
          svg('rect', { x: cx + rPC + tPC, y: yValve - 7, width: 20, height: 14, fill: 'var(--panel2)', stroke: 'var(--ink)', 'stroke-opacity': .6 }));
        // argon in (top, into the purge tube) and argon + SiO out (bottom port)
        const portX = cx - Math.round(rSo * 0.7);
        D.append(svg('rect', { x: cx + rPC, y: 26, width: 16, height: 8, fill: 'var(--panel2)', stroke: 'var(--ink)', 'stroke-opacity': .6 }),
          svg('path', { d: `M${cx + rPC - 1},30 l8,-5 v10 z`, fill: 'var(--ok)' }),
          svg('rect', { x: portX - 4, y: yChB1, width: 8, height: 10, fill: 'var(--panel2)', stroke: 'var(--ink)', 'stroke-opacity': .6 }),
          svg('path', { d: `M${portX - 5},${yChB1 + 10} h10 l-5,7 z`, fill: 'var(--ok)' }));
        // purge tube around the crystal + argon flow chevrons
        [-1, 1].forEach(s => D.append(svg('line', { x1: cx + s * rPT, y1: yValve + 6, x2: cx + s * rPT, y2: yHeat0 - 8, stroke: 'var(--muted)', 'stroke-width': 1.5 })));
        [yValve + 30, yValve + 48].forEach(y => D.append(svg('path', { d: `M${cx - rPT + 2},${y} l3,4 l3,-4 M${cx + rPT - 8},${y} l3,4 l3,-4`, fill: 'none', stroke: 'var(--ok)', 'stroke-width': 1.3 })));
        // carbon-felt insulation + graphite heater with meander slots
        const ins = (x, y, w, hh) => svg('rect', { x, y, width: w, height: hh, fill: 'var(--muted)', 'fill-opacity': .22 });
        D.append(ins(cx - rIo, yIns0, rIo - rIi, yIns1 - yIns0), ins(cx + rIi, yIns0, rIo - rIi, yIns1 - yIns0), ins(cx - rIo, yIns1 - 10, rIo - 9, 10), ins(cx + 9, yIns1 - 10, rIo - 9, 10));
        const heater = svg('g', null);
        [[cx - rHo, 0], [cx + rHi, 1]].forEach(([x, side]) => {
          heater.append(svg('rect', { x, y: yHeat0, width: rHo - rHi, height: yHeat1 - yHeat0, fill: 'var(--cu)' }));
          for (let y = yHeat0 + 9, i = 0; y < yHeat1 - 5; y += 11, i++) {
            const full = rHo - rHi, x0 = (i % 2 === 0) === (side === 0) ? x : x + 3, x1 = x0 + full - 3;
            heater.append(svg('line', { x1: x0, y1: y, x2: x1, y2: y, stroke: 'var(--panel)', 'stroke-width': 1.6 }));
          }
        });
        D.append(heater);
        // ---- crucible group: shaft, susceptor shell, quartz crucible, chunks, melt (rises with lift) ----
        const cruc = svg('g', null), hatch = `url(#${uid}-hatch)`;
        const shaftH = H - susB0 + mm(400) + 20;
        cruc.append(svg('rect', { x: cx - 6, y: susB0 - 2, width: 12, height: shaftH, fill: 'var(--line2)', stroke: 'var(--ink)', 'stroke-opacity': .5 }), svg('rect', { x: cx - 6, y: susB0 - 2, width: 12, height: shaftH, fill: hatch }));
        const susD = bowl(rSo, rim0 + 6, susB0, rSo * 0.35) + ' ' + bowl(rC + tq, rim0 + 6, floor0 + tq, (rC + tq) * 0.35);
        cruc.append(svg('path', { d: susD, 'fill-rule': 'evenodd', fill: 'var(--line2)', stroke: 'var(--ink)', 'stroke-opacity': .55, 'stroke-width': 1 }), svg('path', { d: susD, 'fill-rule': 'evenodd', fill: hatch }));
        cruc.append(svg('path', { d: bowl(rC + tq, rim0, floor0 + tq, (rC + tq) * 0.35) + ' ' + bowl(rC, rim0, floor0, rC * 0.35), 'fill-rule': 'evenodd', fill: 'var(--panel2)', stroke: 'var(--si)', 'stroke-width': 1.5 }));
        const chunks = svg('g', { 'clip-path': `url(#${uid}-cc)` });
        let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const chw = Math.max(12, mm(80)), chh = chw * 0.8;                     // polysilicon chunk cell size
        for (let r = 0, y = floor0 - chh / 2; y > rim0 + 4; r++, y -= chh) for (let x = cx - rC + 4 + (r % 2) * chw / 2; x < cx + rC - 4; x += chw) {
          const pts = []; for (let a = 0; a < 6; a++) { const ang = a * Math.PI / 3 + rnd() * .5, rr = (chw / 2) * (0.7 + rnd() * .35); pts.push((x + rr * Math.cos(ang)).toFixed(1) + ',' + (y + rr * 0.8 * Math.sin(ang)).toFixed(1)); }
          chunks.append(svg('polygon', { points: pts.join(' '), fill: 'var(--muted)', 'fill-opacity': .85, stroke: 'var(--panel)', 'stroke-width': 1 }));
        }
        const melt = svg('path', { d: bowl(rC, rim0, floor0, rC * 0.35), fill: `url(#${uid}-melt)`, 'clip-path': `url(#${uid}-mc)` });
        cruc.append(svg('g', { 'clip-path': `url(#${uid}-int)` }, melt, chunks));
        D.append(svg('g', { 'clip-path': `url(#${uid}-pane)` }, cruc));
        // heat shield: conical reflector hanging above the melt around the crystal
        [-1, 1].forEach(s => D.append(svg('line', { x1: cx + s * (rC - 6), y1: shY0, x2: cx + s * (rX + 12), y2: shY1, stroke: 'var(--muted)', 'stroke-width': 7 })));
        // ---- crystal (bottom to top: tail, body, crown, neck, seed, holder, cable) ----
        const tail = svg('polygon', { fill: 'var(--si)', stroke: 'var(--ink)', 'stroke-opacity': .5, 'stroke-width': .8 });
        const body = svg('rect', { fill: 'var(--si)', stroke: 'var(--ink)', 'stroke-opacity': .5, 'stroke-width': .8 });
        const habit = [-0.71, 0.71].map(() => svg('line', { stroke: 'var(--ink)', 'stroke-opacity': .3, 'stroke-width': 1 }));
        const brk = svg('g', null, svg('polyline', { fill: 'none', stroke: 'var(--panel)', 'stroke-width': 4 }), svg('polyline', { fill: 'none', stroke: 'var(--ink)', 'stroke-opacity': .7, 'stroke-width': 1 }));
        const crown = svg('path', { fill: 'var(--si)', stroke: 'var(--ink)', 'stroke-opacity': .5, 'stroke-width': .8 });
        const neck = svg('rect', { fill: 'var(--accent2)', x: cx - 2, width: 4 });
        const cable = svg('line', { x1: cx, y1: yTop + tPC, x2: cx, stroke: 'var(--muted)', 'stroke-width': 1.5 });
        const holder = svg('rect', { x: cx - 9, width: 18, height: holdH, fill: 'var(--ink)', 'fill-opacity': .75 });
        const seedR = svg('rect', { x: cx - seedW / 2, width: seedW, height: seedH, fill: 'var(--si)', stroke: 'var(--ink)', 'stroke-opacity': .6 });
        const menis = svg('path', { fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-linecap': 'round' });
        D.append(tail, body, ...habit, brk, crown, neck, cable, holder, seedR, menis);
        // rotation arrows (seed cable at the top, crucible shaft at the bottom) + lift chevrons on the shaft
        const arrow = (x, y, r, col) => svg('g', null, svg('path', { d: `M${x + r},${y} A${r},${r} 0 1 1 ${x},${y - r}`, fill: 'none', stroke: col, 'stroke-width': 1.6 }), svg('path', { d: `M${x - 4},${y - r - 4} L${x + 3},${y - r} L${x - 4},${y - r + 4} Z`, fill: col }));
        const arrS = arrow(cx + 30, 30, 8, 'var(--accent2)'), arrC = arrow(cx - 26, yLab + lh, 8, 'var(--warn)');
        D.append(arrS, arrC, svg('path', { d: `M${cx - 4},${yLab + 10} l4,-5 l4,5 M${cx - 4},${yLab + 18} l4,-5 l4,5`, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.4 }));
        const shaftRpm = T(cx + 14, yLab + 1.8 * lh, '', { mono: true, fill: 'var(--muted)' });
        D.append(T(cx + 14, yLab + 0.8 * lh, 'crucible shaft'), shaftRpm, T(portX - 10, yLab + 0.8 * lh, 'argon + SiO out', { anchor: 'end' }));
        // ---- leader-line labels: [side, lines, target(F) -> [x, y] | null, preferred label centre y (optional)] ----
        const shPt = t => [cx - (rC - 6) + t * ((rC - 6) - (rX + 12)), shY0 + t * (shY1 - shY0)];
        const LAB = [
          ['L', ['seed cable', '10–20 rpm'], () => [cx - 1, 34]],
          ['L', ['pull chamber'], () => [cx - rPC - tPC + 3, 105]],
          ['L', roomy ? ['furnace chamber', 'water-cooled', 'double wall'] : ['chamber', 'water-cooled'], () => [cx - rCh + 4, yValve + 48]],
          ['L', ['scale break', 'body ÷' + fmt(S / Sb, 1)], F => F.breakY == null ? null : [cx - rX * 0.75, F.breakY]],
          ['L', ['heat shield'], () => shPt(0.25)],
          ['L', roomy ? ['quartz crucible', '32–36 in'] : ['quartz', 'crucible'], F => [cx - rC - tq / 2, F.rimY + 10], F => F.rimY + 10],
          ['L', roomy ? ['polysilicon', 'chunks, 400 kg'] : ['polysilicon', 'chunks'], F => F.chunkH > 10 ? [cx - rC * 0.5, F.chunkY] : null],
          ['L', ['Si melt', '1,420 °C'], F => F.meltDepth > 5 ? [cx - rC * 0.5, F.meltTop + Math.min(16, F.meltDepth * 0.6)] : null],
          ['L', ['carbon-felt', 'insulation'], () => [cx - rIo + 6, yIns1 - 5]],
          ['R', roomy ? ['argon in', '10–50 mbar', 'via purge tube'] : ['argon in', '10–50 mbar'], () => [cx + rPC + 17, 30]],
          ['R', ['seed'], F => [cx + seedW / 2, F.seedY]],
          ['R', roomy ? ['Dash neck', '3 mm × 150 mm'] : ['Dash neck', '3 × 150 mm'], F => F.neckY == null ? null : [cx + 2, F.neckY]],
          ['R', roomy ? ['crown (shoulder)'] : ['crown'], F => F.crownY == null ? null : [cx + rX * 0.55, F.crownY]],
          ['R', roomy ? ['body, 306 mm', '4 habit lines'] : ['body 306 mm'], F => F.bodyY == null ? null : [cx + rX - 1, F.bodyY]],
          ['R', roomy ? ['isolation valve'] : ['isolation', 'valve'], () => [cx + rPC + tPC + 21, yValve]],
          ['R', roomy ? ['tail (end cone)'] : ['tail'], F => F.tailY == null ? null : [cx + rX * 0.45, F.tailY]],
          ['R', ['meniscus'], F => F.touch ? [cx + F.hwBot + 5, yInt - 2] : null],
          ['R', roomy ? ['graphite heater', '~150 kW', '1,500–1,600 °C'] : ['graphite', 'heater', '~150 kW'], () => [cx + rHo - 1, yHeat0 + (yHeat1 - yHeat0) * 0.72], () => yHeat0 + (yHeat1 - yHeat0) * 0.72],
          ['R', ['graphite', 'susceptor'], F => [cx + rSo - 2, F.floorY - 6], F => F.floorY + 6],
        ].map(([side, lines, t, pref]) => {
          const texts = lines.map((s, i) => T(0, 0, s, i === 0 ? {} : { mono: /\d/.test(s), fill: 'var(--muted)' }));
          const line = svg('line', { stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-opacity': .9 }), dot = svg('circle', { r: 2.2, fill: 'var(--muted)' });
          const g = svg('g', null, line, dot, texts); D.append(g);
          return { side, t, pref, texts, line, dot, g, n: lines.length };
        });
        // ---- inset: seed end magnified (local coords 248 × 340, scaled by k) ----
        const IN = svg('g', { transform: `translate(${insetX},${insetY}) scale(${k})` });
        const IT = (x, y, s, o = {}) => svg('text', { x, y, 'font-family': o.mono ? MONO : SANS, 'font-size': ifs, fill: o.fill || 'var(--ink)', 'text-anchor': o.anchor || 'start' }, s);
        IN.append(svg('rect', { x: .5, y: .5, width: insW - 1, height: insH - 1, rx: 6, fill: 'var(--ground)', stroke: 'var(--line)' }), IT(8, 17, 'seed end, magnified'));
        const ic = 124;
        IN.append(svg('line', { x1: ic, y1: 20, x2: ic, y2: 30, stroke: 'var(--muted)', 'stroke-width': 2 }),
          svg('rect', { x: ic - 20, y: 30, width: 40, height: 10, fill: 'var(--ink)', 'fill-opacity': .75 }),
          svg('rect', { x: ic - 18, y: 40, width: 36, height: 60, fill: 'var(--si)', stroke: 'var(--ink)', 'stroke-opacity': .6 }),
          svg('polygon', { points: `${ic - 18},100 ${ic + 18},100 ${ic + 4},118 ${ic - 4},118`, fill: 'var(--si)', stroke: 'var(--ink)', 'stroke-opacity': .6 }),
          svg('rect', { x: ic - 4, y: 118, width: 8, height: 100, fill: 'var(--accent2)' }));
        // dislocations in the seed lie on {111} glide planes, ~35° to the <100> pull axis (dx/dy = tan 35.3° ≈ 0.71)
        const disl = svg('g', { stroke: 'var(--bad)', 'stroke-width': 1.4, 'stroke-linecap': 'round' });
        [[111, 60, 12], [131, 50, 11], [115, 82, 14], [133, 78, 12], [123, 46, 10], [117, 104, 8]].forEach(([a, b, d]) => disl.append(svg('line', { x1: a, y1: b, x2: (a + 0.71 * d).toFixed(1), y2: b + d })));
        const dislNeck = [0, 1, 2, 3].map(() => svg('line', { stroke: 'var(--bad)', 'stroke-width': 1.4, 'stroke-linecap': 'round' }));
        IN.append(disl, ...dislNeck);
        // shortened-neck break mark, 3 mm dimension, crown flare, melt + meniscus
        let zz = ''; for (let x = ic - 8, i = 0; x <= ic + 8; x += 4, i++) zz += `${x},${166 + (i % 2 ? 3 : -3)} `;
        IN.append(svg('polyline', { points: zz, fill: 'none', stroke: 'var(--ground)', 'stroke-width': 4 }), svg('polyline', { points: zz, fill: 'none', stroke: 'var(--ink)', 'stroke-opacity': .7, 'stroke-width': 1 }));
        IN.append(svg('path', { d: `M${ic - 30},204 H${ic - 4} M${ic + 30},204 H${ic + 4}`, stroke: 'var(--muted)', 'stroke-width': 1, fill: 'none' }),
          svg('path', { d: `M${ic - 4},204 l-5,-3 v6 z M${ic + 4},204 l5,-3 v6 z`, fill: 'var(--muted)' }), IT(ic + 34, 208, '3 mm', { mono: true }));
        let cp = ''; const N = 16, rr = i => 4 + 58 * Math.pow(i / N, 0.55);
        for (let i = 0; i <= N; i++) cp += (i ? ' L' : 'M') + (ic - rr(i)).toFixed(1) + ',' + (218 + i / N * 62).toFixed(1);
        for (let i = N; i >= 0; i--) cp += ' L' + (ic + rr(i)).toFixed(1) + ',' + (218 + i / N * 62).toFixed(1);
        const igrad = svg('linearGradient', { id: uid + '-imelt', x1: 0, y1: 0, x2: 0, y2: 1 }, svg('stop', { offset: 0, style: 'stop-color:var(--warn)' }), svg('stop', { offset: 1, style: 'stop-color:var(--bad)' }));
        defs.append(igrad);
        IN.append(svg('rect', { x: 1, y: 280, width: insW - 2, height: 40, fill: `url(#${uid}-imelt)` }),
          svg('path', { d: cp + ' Z', fill: 'var(--si)', stroke: 'var(--ink)', 'stroke-opacity': .5 }),
          svg('path', { d: `M${ic - 70},281 Q${ic - 64},280 ${ic - 62},276 M${ic + 70},281 Q${ic + 64},280 ${ic + 62},276`, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-linecap': 'round' }),
          svg('rect', { x: 1, y: 320, width: insW - 2, height: 19, fill: 'var(--ground)' }));
        [[98, 38, 'seed holder', { fill: 'var(--muted)' }], [98, 64, 'seed', {}], [98, 84, '10–20 mm', { mono: true, fill: 'var(--muted)' }],
         [98, 124, 'dislocations', {}], [98, 142, 'glide out on', { fill: 'var(--muted)' }], [98, 160, '{111} planes,', { fill: 'var(--muted)' }], [98, 178, '~35° to axis', { fill: 'var(--muted)' }]]
          .forEach(([x, y, s, o]) => IN.append(IT(x, y, s, Object.assign({ anchor: 'end' }, o))));
        [[136, 126, 'Dash neck', {}], [136, 145, '3 mm × 150 mm', { mono: true, fill: 'var(--muted)' }], [136, 164, 'pulled at', { fill: 'var(--muted)' }], [136, 183, '3–6 mm/min', { mono: true, fill: 'var(--muted)' }], [8, 258, 'meniscus', {}]]
          .forEach(([x, y, s, o]) => IN.append(IT(x, y, s, o)));
        IN.append(svg('line', { x1: 30, y1: 262, x2: ic - 66, y2: 277, stroke: 'var(--muted)', 'stroke-width': 1 }));   // leader from the label to the meniscus curve
        IN.append(IT(ic, 333, 'crown flares to 306 mm over ~80 mm', { anchor: 'middle' }));
        D.append(IN);
        // ---- time bar (to scale) ----
        const tb = svg('g', { transform: `translate(${timeX},${timeY}) scale(${k})` });
        const totalTxt = IT(insW - 6, 10, '', { mono: true, anchor: 'end' });
        tb.append(IT(0, 10, 'process time, to scale', { fill: 'var(--muted)' }), totalTxt);
        const segCol = [['var(--warn)', .55], ['var(--accent2)', 1], ['var(--si)', .55], ['var(--si)', 1], ['var(--si)', .55]];
        const segs = segCol.map(([c, o]) => svg('rect', { y: 18, height: 14, fill: c, 'fill-opacity': o }));
        tb.append(svg('rect', { x: 0, y: 18, width: insW, height: 14, fill: 'var(--panel)', stroke: 'var(--line)' }), ...segs);
        const cursor = svg('g', null, svg('line', { y1: 16, y2: 34, stroke: 'var(--ink)', 'stroke-width': 2 }), svg('path', { d: 'M-4,40 h8 l-4,-5 z', fill: 'var(--ink)' }));
        const nowTxt = IT(0, 52, '', { mono: true, fill: 'var(--muted)' });
        tb.append(cursor, nowTxt);
        const keyTxt = [];
        [[0, 68], [124, 68], [0, 85], [124, 85], [0, 102]].forEach(([x, y], i) => { tb.append(svg('rect', { x, y: y - 9, width: 10, height: 10, fill: segCol[i][0], 'fill-opacity': segCol[i][1] })); const t = IT(x + 14, y, '', { fill: 'var(--muted)' }); keyTxt.push(t); tb.append(t); });
        D.append(tb);
        let scaleNote = null;
        if (wide) ['', 'Body shortened at the break mark;', 'neck drawn 4 px wide (inset is true).'].forEach((s, i) => { const t = T(timeX, noteY + (i + 0.8) * lh, s, { fill: 'var(--muted)', size: fsm }); if (i === 0) scaleNote = t; D.append(t); });
        const setScaleNote = w => { if (scaleNote) scaleNote.textContent = 'Main view: 1 screen px ≈ ' + fmt(W / Math.max(1, w) / S, 1) + ' mm.'; };
        setScaleNote(cw);
        return { D, wide, W, H, primaryH: yBot + 4, detailX: insetX, detailY: insetY, detailW: insW * k, detailH: timeY + tbH * k + 6 - insetY, IN, tb, primaryNodes: [...D.children].filter(node => node !== defs && node !== IN && node !== tb), S, Sb, cx, lh, rX, rC, tq, rSo, rCh, rPC, xL, xR, paneW, yTop, tPC, yValve, yInt, hMelt0, rim0, floor0, yChB1, yLab, seedW, seedH, holdH, insW, setScaleNote,
          grad, meltClip, chunkClip, heater, cruc, tail, body, habit, brk, crown, neck, cable, holder, seedR, menis, arrS, arrC, shaftRpm, LAB, dislNeck, totalTxt, nowTxt, segs, cursor, keyTxt };
      }
      function fitLabels(sc) {
        sc.LAB.forEach(o => o.texts.forEach(t => {
          const avail = (o.side === 'L' ? sc.xL - 6 : sc.paneW - sc.xR - 6);            // keep a 6 px margin to the pane edge
          const hidden = t.getAttribute('display') === 'none';                              // hidden labels measure 0: reveal while measuring
          if (hidden) t.removeAttribute('display');
          t.removeAttribute('textLength'); t.removeAttribute('lengthAdjust');
          try { if (t.getComputedTextLength() > avail) { t.setAttribute('textLength', avail); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); } } catch (e) { }
          if (hidden) t.setAttribute('display', 'none');
        }));
      }
      const show = (e, on) => { if (on) e.removeAttribute('display'); else e.setAttribute('display', 'none'); };

      // ---------- per-frame drawing ----------
      function draw() {
        const G = scene; if (!G) return null;
        const sch = schedule(st.v), simH = Math.min(st.simH, sch.total);
        const { done, cur, frac } = progressAt(sch.P, simH);
        const mass = massKg(done), liftMM = mass * LIFT_MM_PER_KG, liftPx = liftMM * G.S;
        const F = { rimY: G.rim0 - liftPx, floorY: G.floor0 - liftPx, chunkH: 0, breakY: null, neckY: null, crownY: null, bodyY: null, tailY: null };
        G.cruc.setAttribute('transform', `translate(0,${(-liftPx).toFixed(2)})`);
        // meltdown: melt rises from the floor, the floating chunk pile slumps down onto it, heater glow ramps up
        let meltTopG;
        if (cur === 0) {
          meltTopG = G.floor0 - frac * G.hMelt0; const pileTop = (G.rim0 + 4) + (G.yInt - G.rim0 - 4) * frac;
          F.chunkH = meltTopG - pileTop; F.chunkY = (pileTop + meltTopG) / 2;
          G.chunkClip.setAttribute('y', pileTop.toFixed(1)); G.chunkClip.setAttribute('height', Math.max(0, F.chunkH).toFixed(1));
          G.heater.setAttribute('opacity', (0.35 + 0.65 * Math.min(1, frac / 0.6)).toFixed(2));
        } else { meltTopG = G.yInt + liftPx; G.chunkClip.setAttribute('height', 0); G.heater.setAttribute('opacity', 1); }
        G.meltClip.setAttribute('y', meltTopG.toFixed(1)); G.grad.setAttribute('y1', meltTopG.toFixed(1));
        F.meltTop = meltTopG - liftPx; F.meltDepth = G.floor0 - meltTopG;
        // crystal stack, from the interface upward
        const S = G.S, cx = G.cx, rX = G.rX; let y = G.yInt, hwBot = 0;
        const tailPx = done[4] * S, bodyPx = done[3] * G.Sb, crownPx = done[2] * S, neckPx = done[1] * S;
        if (tailPx > 0) { const hb = rX * (1 - done[4] / TAIL.len); hwBot = hb; G.tail.setAttribute('points', `${cx - rX},${y - tailPx} ${cx + rX},${y - tailPx} ${cx + hb},${y} ${cx - hb},${y}`); F.tailY = y - tailPx / 2; y -= tailPx; }
        show(G.tail, tailPx > 0);
        if (bodyPx > 0) {
          if (!tailPx) hwBot = rX;
          G.body.setAttribute('x', cx - rX); G.body.setAttribute('width', 2 * rX); G.body.setAttribute('y', y - bodyPx); G.body.setAttribute('height', bodyPx);
          G.habit.forEach((l, i) => { const x = cx + (i ? 0.71 : -0.71) * rX; l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('y1', y - bodyPx + 1); l.setAttribute('y2', y - 1); });
          F.bodyY = y - bodyPx / 2;
          if (bodyPx > 40) { const yb = y - bodyPx * 0.5; let pts = ''; for (let x = cx - rX - 3, i = 0; x <= cx + rX + 3; x += 6, i++) pts += `${x},${yb + (i % 2 ? 3 : -3)} `; G.brk.querySelectorAll('polyline').forEach(p => p.setAttribute('points', pts)); F.breakY = yb; }
          y -= bodyPx;
        }
        show(G.body, bodyPx > 0); G.habit.forEach(l => show(l, bodyPx > 0)); show(G.brk, F.breakY != null);
        if (crownPx > 0) {
          const f = done[2] / CROWN.len, N = 12, top = y - crownPx; let L = '', R = '';
          if (!bodyPx && !tailPx) hwBot = Math.max(2, dCrown(f) / 2 * S);
          for (let i = 0; i <= N; i++) { const ff = f * i / N, r = Math.max(2, dCrown(ff) / 2 * S), yy = top + ff * CROWN.len * S; L += ` L${(cx - r).toFixed(1)},${yy.toFixed(1)}`; R = ` L${(cx + r).toFixed(1)},${yy.toFixed(1)}` + R; }
          G.crown.setAttribute('d', 'M' + L.slice(2) + R + ' Z'); F.crownY = y - crownPx / 2; y -= crownPx;
        }
        show(G.crown, crownPx > 0);
        if (neckPx > 0) { if (!crownPx) hwBot = 2; G.neck.setAttribute('y', y - neckPx); G.neck.setAttribute('height', neckPx); F.neckY = y - neckPx / 2; y -= neckPx; }
        show(G.neck, neckPx > 0);
        let seedBot = y;
        if (cur === 0) { const d = ease(Math.max(0, Math.min(1, (frac - 0.8) / 0.2))), up = 600 * S; seedBot = (G.yInt - up) + up * d; if (frac >= 0.985) hwBot = G.seedW / 2; }
        F.touch = cur > 0 || frac >= 0.985; F.hwBot = hwBot;
        G.seedR.setAttribute('y', seedBot - G.seedH); G.holder.setAttribute('y', seedBot - G.seedH - G.holdH); G.cable.setAttribute('y2', seedBot - G.seedH - G.holdH); F.seedY = seedBot - G.seedH / 2;
        if (F.touch) G.menis.setAttribute('d', `M${cx - hwBot - 7},${G.yInt + 0.5} Q${cx - hwBot - 1.5},${G.yInt} ${cx - hwBot + 0.3},${G.yInt - 4} M${cx + hwBot + 7},${G.yInt + 0.5} Q${cx + hwBot + 1.5},${G.yInt} ${cx + hwBot - 0.3},${G.yInt - 4}`);
        show(G.menis, F.touch);
        G.arrS.setAttribute('transform', `rotate(${st.angS.toFixed(1)} ${cx + 30} 30)`); G.arrC.setAttribute('transform', `rotate(${(-st.angC).toFixed(1)} ${cx - 26} ${G.yLab + G.lh})`);
        // neck dislocations drift up and run out to the surface along {111}: ~35° from the pull axis (dx/dy = 0.71)
        G.dislNeck.forEach((l, i) => { const yy = 124 + ((i * 10 + st.drift) % 40), s = i % 2 ? 1 : -1; l.setAttribute('x1', 124); l.setAttribute('y1', yy); l.setAttribute('x2', 124 + s * 3.5); l.setAttribute('y2', yy - 5); });
        // leader labels: per side, keep order by preferred y and spread so nothing overlaps
        ['L', 'R'].forEach(side => {
          const items = [];
          G.LAB.forEach(o => { if (o.side !== side) return; const t = o.t(F); [o.line, o.dot, ...o.texts].forEach(e => show(e, !!t)); if (!t) return; o.tx = t[0]; o.ty = t[1]; o.hh = o.n * G.lh; o.y0 = (o.pref ? o.pref(F) : t[1]) - o.hh / 2; items.push(o); });
          items.sort((a, b) => a.y0 - b.y0);
          const gap = 5; let yy = 4; items.forEach(o => { o.y = Math.max(o.y0, yy); yy = o.y + o.hh + gap; });
          let maxY = G.yChB1 - 2; for (let i = items.length - 1; i >= 0; i--) { const o = items[i]; if (o.y + o.hh > maxY) o.y = maxY - o.hh; maxY = o.y - gap; }
          items.forEach(o => {
            const x = side === 'L' ? G.xL : G.xR, yc = o.y + o.hh / 2;
            o.texts.forEach((tx, i) => { tx.setAttribute('x', x); tx.setAttribute('y', (o.y + (i + 0.78) * G.lh).toFixed(1)); tx.setAttribute('text-anchor', side === 'L' ? 'end' : 'start'); });
            o.line.setAttribute('x1', side === 'L' ? x + 3 : x - 3); o.line.setAttribute('y1', yc.toFixed(1)); o.line.setAttribute('x2', o.tx.toFixed(1)); o.line.setAttribute('y2', o.ty.toFixed(1));
            o.dot.setAttribute('cx', o.tx.toFixed(1)); o.dot.setAttribute('cy', o.ty.toFixed(1));
          });
        });
        // time bar
        let x0 = 0; sch.P.forEach((p, i) => { const w = G.insW * p.h / sch.total; G.segs[i].setAttribute('x', x0.toFixed(2)); G.segs[i].setAttribute('width', w.toFixed(2)); x0 += w; });
        const cxT = G.insW * simH / sch.total;
        G.cursor.setAttribute('transform', `translate(${cxT.toFixed(2)},0)`);
        G.totalTxt.textContent = 'total ~' + fmt(sch.total, 1) + ' h';
        G.nowTxt.textContent = 'now ' + hm(simH);
        let nowW = 9 * 0.6 * 13; try { nowW = G.nowTxt.getComputedTextLength() || nowW; } catch (e) { }       // keep the label inside the bar's column
        G.nowTxt.setAttribute('x', Math.min(G.insW - nowW - 6, Math.max(0, cxT - 20)).toFixed(1));
        const kh = ['meltdown ' + fmt(MELT_H, 0) + ' h', 'neck ' + fmt(sch.P[1].h, 1) + ' h', 'crown ' + fmt(sch.P[2].h, 1) + ' h', 'body ' + fmt(sch.P[3].h, 1) + ' h', 'tail ' + fmt(sch.P[4].h, 1) + ' h'];
        G.keyTxt.forEach((t, i) => { if (t.textContent !== kh[i]) t.textContent = kh[i]; });
        G.shaftRpm.textContent = '↑ lift · ↻ ' + st.rpm + ' rpm';
        return { done, cur, frac, mass, liftMM, sch, simH };
      }
      const hm = x => { const H = Math.floor(x), M = Math.floor((x - H) * 60); return H + ':' + String(M).padStart(2, '0'); };

      function updateText(r) {
        if (!r) return;
        const { done, cur, mass, liftMM, sch, simH } = r;
        stHour.textContent = hm(simH) + ' / ~' + fmt(sch.total, 0) + ' h';
        const lenMM = done[1] + done[2] + done[3] + done[4];
        stLen.textContent = lenMM >= 1000 ? fmt(lenMM / 1000, 2) + ' m' : fmt(lenMM, 0) + ' mm';
        stMass.textContent = fmt(mass, 0) + ' kg';
        stMelt.textContent = fmt(Math.max(0, CHARGE_KG - mass), 0) + ' kg';
        stLift.textContent = fmt(liftMM, 0) + ' mm';
        stNeck.textContent = fmt(mass * 9.81 / (Math.PI * 1.5e-3 * 1.5e-3) / 1e6, 0) + ' MPa';
        stOx.textContent = fmt(10 + (st.rpm - 5) * 0.8, 0) + ' ppma';
        const vG = st.v / 10 / G_KPCM * 1000;
        stVG.textContent = vG.toFixed(1) + '×10⁻³ · ' + (vG < 1.3 ? 'I-rich' : vG <= 2.0 ? 'near critical' : 'V-rich (COPs)');
        phaseName.textContent = 'Phase ' + (cur + 1) + ' — ' + NAMES[cur];
        phaseWhy.textContent = WHY[cur];
        countSpan.textContent = 'Phase ' + (cur + 1) + ' / 5';
        phaseButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === cur)));
        prevBtn.disabled = cur === 0; nextBtn.disabled = cur === 4;
        vOut.textContent = fmt(st.v, 1) + ' mm/min'; rpmOut.textContent = st.rpm + ' rpm'; speedOut.textContent = fmt(st.speed, 1) + '×';
        playBtn.textContent = st.playing ? 'Pause' : 'Play';
        const lift = st.v * Math.pow(D_BODY / 2 / R_MELT_MM, 2) * RHO_S / RHO_L;
        formula.innerHTML = `body time = L / v = 2 000 mm / ${fmt(st.v, 1)} mm/min ≈ ${fmt(sch.P[3].h, 1)} h &nbsp;·&nbsp; crucible lift = v (r<sub>crystal</sub>/r<sub>melt</sub>)² (ρ<sub>s</sub>/ρ<sub>l</sub>) = ${fmt(lift, 2)} mm/min &nbsp;·&nbsp; mass = ρ<sub>s</sub> π r² L = 343 kg per 2 m body &nbsp;·&nbsp; neck stress = m g / (π r²) ≈ 416 MPa at 300 kg on 3 mm`;
      }
      function render() {
        updateText(draw());
        if (!scene) return;
        const g = scene;
        viewButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(detailView === !!i)));
        g.primaryNodes.forEach(node => { node.style.display = detailView ? 'none' : ''; });
        g.IN.style.display = g.tb.style.display = detailView || g.wide ? '' : 'none';
        g.D.setAttribute('viewBox', detailView ? `${g.detailX} ${g.detailY} ${g.detailW} ${g.detailH}` : `0 0 ${g.W} ${g.wide ? g.H : g.primaryH}`);
        g.D.setAttribute('aria-label', detailView ? 'Magnified seed, Dash neck, dislocations escaping to the surface, and the process time budget' : 'Czochralski puller apparatus growing a silicon crystal from a heated melt');
      }

      // ---------- layout / rebuild ----------
      let mode = '', fsCur = 0, paneCur = 0;
      function relayout() {
        const cw = stage.clientWidth || (el.clientWidth - 36) || 658;                       // content width the SVG renders at (course page: 658 px)
        const m = cw >= 650 ? 'wide' : 'narrow';
        const paneW = m === 'wide' ? 510 : Math.round(Math.min(640, Math.max(460, cw)) / 20) * 20;
        // font sizes chosen so text renders at ≥ 11 px: wide = 760-px viewBox scaled to cw; narrow = 1:1 above 460 px, scaled down on phones
        const fs = m === 'wide' ? Math.max(12.5, Math.round(11.2 * 760 / cw * 2) / 2) : cw >= 460 ? 13 : Math.min(18, Math.max(13, Math.round(11.2 * 460 / cw * 2) / 2));
        if (m === mode && fs === fsCur && paneW === paneCur) { if (scene) scene.setScaleNote(cw); return; }
        mode = m; fsCur = fs; paneCur = paneW;
        if (scene) scene.D.remove();
        scene = build(m, fs, paneW, cw); stage.append(scene.D);
        render(); fitLabels(scene);
      }

      // ---------- animation loop (runs only while playing and visible) ----------
      let raf = 0, last = 0, visible = true;
      const onScreen = () => { const r = el.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight; return r.width > 0 && r.bottom > 0 && r.top < vh; };
      function tick(now) {
        raf = 0; if (!st.playing) return;
        if (!visible && !(visible = onScreen())) return;               // off-screen: stop (a stale flag is corrected by the rect test)
        if (!last) last = now;
        const dt = Math.min(0.1, (now - last) / 1000); last = now;
        const sch = schedule(st.v), { cur } = progressAt(sch.P, st.simH), p = sch.P[cur];
        st.simH = Math.min(p.end, st.simH + dt * st.speed / ANIM_S[cur] * p.h);
        if (st.simH >= sch.total - 1e-9) { st.simH = sch.total; st.playing = false; }
        st.angS = (st.angS + dt * SEED_RPM * 6) % 360; st.angC = (st.angC + dt * st.rpm * 6) % 360; st.drift = (st.drift + dt * 5) % 40;
        render();
        if (st.playing) raf = requestAnimationFrame(tick);
      }
      // self-healing: never trust only the cached flag — re-check the viewport directly before deciding not to run
      function ensureLoop() {
        if (raf || !st.playing) return;
        if (!visible) visible = onScreen();
        if (visible) { last = 0; raf = requestAnimationFrame(tick); }
      }
      function jump(i) { st.simH = schedule(st.v).P[i].start + 1e-6; render(); }

      playBtn.addEventListener('click', () => {
        if (!st.playing && st.simH >= schedule(st.v).total - 1e-9) st.simH = 0;
        st.playing = !st.playing; ensureLoop();
        if (st.playing && !raf) st.playing = false;                     // loop could not start (widget off-screen): keep the label honest
        render();
      });
      speedSlider.addEventListener('input', () => { st.speed = +speedSlider.value; render(); });
      vSlider.addEventListener('input', () => { const { cur, frac } = progressAt(schedule(st.v).P, st.simH); st.v = +vSlider.value; const P = schedule(st.v).P; st.simH = P[cur].start + frac * P[cur].h; render(); });
      rpmSlider.addEventListener('input', () => { st.rpm = +rpmSlider.value; render(); });
      prevBtn.addEventListener('click', () => { const { cur } = progressAt(schedule(st.v).P, st.simH); if (cur > 0) jump(cur - 1); });
      nextBtn.addEventListener('click', () => { const { cur } = progressAt(schedule(st.v).P, st.simH); if (cur < 4) jump(cur + 1); });

      // entries can arrive batched ([false, true] after a viewport change): the LAST one is the current state
      const io = new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) ensureLoop(); });
      io.observe(el);
      const ro = new ResizeObserver(() => relayout());
      ro.observe(el);
      ctx.onTheme(render);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (scene) fitLabels(scene); });
      relayout();
      ensureLoop();
      return () => { cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); ro.disconnect(); };
    }
  });
})();
