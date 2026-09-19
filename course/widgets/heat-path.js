/* Widget: heat-path — "Where 1,000 Watts Go" (Module 19)
   Thermal-resistance ladder from the GPU transistors to the building's water. Heat flows in series, so every
   watt crosses every layer and the temperature drops (ΔT = P·R) add up to the junction temperature. */
(function () {
  'use strict';
  const CP_W = 4180, RHO_W = 1.0;          // water: J/(kg·K), kg/L
  const CP_A = 1005, RHO_A = 1.15;         // air:   J/(kg·K), kg/m³ (~30 °C)
  const M3S_PER_CFM = 0.000471947;
  const T_THROTTLE = 85, T_HARD = 90;      // °C, module 19: "maximum allowed transistor temperature ~85–90 °C"
  const UA_CDU = 35000;                    // W/K, rack CDU plate exchanger (≈3 °C approach at 110 kW)
  const RACK_OTHER_W = 24000;              // W, Grace CPUs + NVLink switches sharing the rack's liquid loop
  const CRAH_APPROACH = 8;                 // °C, illustrative coil approach in an air-cooled room
  const TIM_DEGRADE = 0.010;               // K/W added by a dried / pumped-out TIM2 (module worked example)
  const f1 = n => (+n).toFixed(1), f3 = n => (+n).toFixed(3);

  const FIXED = {
    die: { short: 'GPU die (Si)', name: 'GPU die (silicon)', R: 0.004, fill: 'var(--muted)', desc: 'The transistors sit on the die\'s face, which is flipped down onto the interposer, so their heat must conduct up through ~0.7 mm of silicon to the back of the die: ≈0.004 K/W for ~16 cm² of Blackwell silicon.' },
    tim1: { short: 'TIM1 (indium)', name: 'TIM1 (indium solder)', R: 0.005, fill: 'var(--accent)', desc: 'TIM = thermal interface material: a soft metal or paste that fills the microscopic air gaps between two "flat" surfaces (air is an excellent insulator). TIM1 sits between die back and lid; a 0.1 mm film costs about as much as 3 mm of solid copper.' },
    lid: { short: 'Lid (Cu)', name: 'Lid (copper heat spreader)', R: 0.003, fill: 'var(--cu)', desc: 'The lid (integrated heat spreader) is a copper cap that spreads the heat from ~16 cm² of dies out to the whole plate area and shields the dies from the clamping load.' },
    tim2: { short: 'TIM2 (paste)', name: 'TIM2 (paste under the plate)', R: 0.006, fill: 'var(--accent)', desc: 'TIM2 is the paste between lid and cold plate. Thermal cycling slowly squeezes it out ("pump-out"); a dried joint adds ~0.01 K/W, i.e. +12 °C at 1,200 W — enough to throttle. The plate\'s flatness decides whether the whole lid is loaded evenly.' },
  };
  const MODES = {
    liquid: {
      label: 'Liquid cold plate (NVL72)', flow: { min: 0.5, max: 4, step: 0.05, def: 1.75, unit: 'L/min' }, inletDef: 40,
      inletName: 'Coolant inlet', flowName: 'Flow per cold plate', inNode: 'coolant inlet', outNode: 'coolant outlet', fac: 'facility', fluid: 'water',
      base: { short: 'Plate base (Cu)', name: 'Cold-plate base (copper)', R: 0.003, desc: 'Cold plate: a copper block with microchannels that water at 25–45 °C flows through. Its 2–3 mm base carries the heat from the TIM into the channel walls.' },
      film: { short: 'Water film', name: 'Channel wall → water film', fill: 'var(--si)', desc: 'Heat crosses from the channel walls into the flowing water through a thin, almost stagnant boundary layer. Faster flow thins it, so R_film falls roughly as Q^−0.6.' },
      cal: { short: 'Coolant warms', name: 'Coolant warms (inlet → mean)', fill: 'var(--si)', desc: 'The water itself warms as it absorbs the heat: T_out − T_in = P / (ṁ·c_p). The plate "sees" roughly the mean of inlet and outlet, so half the rise counts against the junction.' },
      hx: { short: 'CDU approach', name: 'CDU heat exchanger (approach)', sub: 'UA 35 kW/K', desc: 'CDU = coolant distribution unit: a pump and plate heat exchanger that keep the treated secondary loop separate from the building\'s facility water. The approach ≈ P_rack / UA ≈ 3 °C, so facility water at 30–40 °C is enough — no chiller needed.' },
    },
    air: {
      label: 'Air heatsink (HGX server)', flow: { min: 20, max: 120, step: 5, def: 60, unit: 'CFM' }, inletDef: 27,
      inletName: 'Air inlet', flowName: 'Airflow per heatsink', inNode: 'cold-aisle air', outNode: 'exhaust air', fac: 'chilled water', fluid: 'air',
      base: { short: 'Vapor chamber', name: 'Vapor-chamber base (copper)', R: 0.006, desc: 'Vapor chamber: a sealed copper chamber whose working fluid boils at the hot spot and condenses at the fins, spreading ~700 W more evenly than solid copper could.' },
      film: { short: 'Fins → air', name: 'Fin stack → air', fill: 'var(--line2)', desc: 'Air\'s heat-transfer coefficient is ~50× lower than water\'s, so even a big fin stack driven by high-static-pressure fans leaves ~0.04 K/W — ten times the water film.' },
      cal: { short: 'Air warms', name: 'Air warms (inlet → mean)', fill: 'var(--line2)', desc: 'Air warms as it crosses the fins: with c_p ≈ 1 kJ/kg·K and density 1.15 kg/m³, 60 CFM carries only ~33 W per °C, against ~120 W per °C for 1.75 L/min of water.' },
      hx: { short: 'CRAH coil', name: 'CRAH chilled-water coil (approach)', sub: 'coil ≈ 8 °C (~)', desc: 'CRAH = computer-room air handler: hot-aisle air returns to a chilled-water coil. Chilled water at ~15–20 °C needs a chiller (compressors), unlike the warm facility water of a liquid loop.' },
    },
  };
  const PRESETS = [
    { name: 'H100 SXM · air · 700 W', mode: 'air', P: 700, Tin: 27, flow: 60 },
    { name: 'GB200 NVL72 · liquid · 1,200 W', mode: 'liquid', P: 1200, Tin: 40, flow: 1.75 },
    { name: 'GB300 NVL72 · liquid · 1,400 W', mode: 'liquid', P: 1400, Tin: 35, flow: 2.5 },
  ];

  // ---------------- physics ----------------
  function compute(st) {
    const M = MODES[st.mode], P = st.P, liquid = st.mode === 'liquid';
    const mdot = liquid ? st.flow / 60 * RHO_W : st.flow * M3S_PER_CFM * RHO_A;   // kg/s
    const cp = liquid ? CP_W : CP_A, mcp = mdot * cp;                            // W/K
    const Rfilm = liquid ? 0.008 * Math.pow(1.5 / st.flow, 0.6) : 0.040 * Math.pow(60 / st.flow, 0.7);
    const Rcal = 1 / (2 * mcp);
    const Rtim2 = FIXED.tim2.R + (st.timBad ? TIM_DEGRADE : 0);
    const mk = (id, src, R, fill) => ({ id, short: src.short, name: src.name, R, fill: fill || src.fill, desc: src.desc, sub: f3(R) + ' K/W' });
    const layers = [                                   // from the junction upward (hot → cold)
      mk('die', FIXED.die, FIXED.die.R), mk('tim1', FIXED.tim1, FIXED.tim1.R), mk('lid', FIXED.lid, FIXED.lid.R),
      mk('tim2', FIXED.tim2, Rtim2), mk('base', M.base, M.base.R, 'var(--cu)'), mk('film', M.film, Rfilm), mk('cal', M.cal, Rcal),
    ];
    if (st.timBad) { layers[3].name = 'TIM2 (pumped-out paste)'; layers[3].short = 'TIM2 (dried)'; }
    const rackW = 72 * P + RACK_OTHER_W;
    const approach = liquid ? rackW / UA_CDU : CRAH_APPROACH;
    layers.push({ id: 'hx', short: M.hx.short, name: M.hx.name, R: approach / P, fill: 'var(--accent2)', desc: M.hx.desc, sub: M.hx.sub, isApproach: true });
    layers.forEach(L => { L.dT = L.isApproach ? approach : P * L.R; });
    const T = new Array(layers.length + 1);            // T[i] = hot side of layer i; T[8] = facility / chilled water
    T[layers.length] = st.Tin - approach;
    for (let i = layers.length - 1; i >= 0; i--) T[i] = T[i + 1] + layers[i].dT;
    const Tj = T[0], rise = P / mcp, Tout = st.Tin + rise;
    const sumR = layers.slice(0, 7).reduce((s, L) => s + L.R, 0);
    const budget = (T_THROTTLE - st.Tin) / P;
    const rackFlow = rackW / (cp * rise);              // kg/s at the same rise everywhere
    const status = Tj >= T_HARD ? 'bad' : Tj >= T_THROTTLE ? 'warn' : 'ok';
    return { layers, T, Tj, rise, Tout, sumR, budget, rackW, rackFlow, mcp, approach, status, liquid };
  }

  window.registerWidget('heat-path', {
    title: 'Where 1,000 Watts Go',
    caption: 'Drag GPU power, inlet temperature and flow and watch the temperature climb layer by layer from the building\'s water to the transistors; switch to air cooling to see why an NVL72 rack cannot be fanned.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const st = { mode: 'liquid', P: 1200, Tin: 40, flow: 1.75, timBad: false, playing: !reduced, hover: null };
      const txt = (x, y, s, o) => { o = o || {}; return svg('text', { x: f1(x), y: f1(y), 'text-anchor': o.anchor || 'start', 'font-size': o.size || 13, 'font-family': o.mono ? 'var(--mono)' : 'var(--sans)', 'font-weight': o.bold ? 600 : 400, fill: o.fill || 'var(--ink)', 'pointer-events': 'none' }, s); };
      const estW = (s, size, mono) => s.length * (size || 13) * (mono ? 0.62 : 0.56);
      // label on a translucent panel-colored pill so it stays readable on any material fill in both themes
      const pill = (x, y, s, o) => { o = o || {}; const w = estW(s, o.size, o.mono) + 12; const x0 = o.anchor === 'end' ? x - w : o.anchor === 'middle' ? x - w / 2 : x; return svg('g', { 'pointer-events': 'none' }, svg('rect', { x: f1(x0), y: y - 10.5, width: f1(w), height: 15, rx: 3, fill: 'var(--panel)', 'fill-opacity': .9 }), txt(x, y + 1, s, Object.assign({ anchor: o.anchor || 'start' }, o))); };

      // ---------------- controls ----------------
      const playBtn = h('button', { class: 'w-btn primary', 'data-k': 'play', 'aria-pressed': String(st.playing), on: { click: () => { st.playing = !st.playing; playBtn.textContent = st.playing ? 'Pause flow' : 'Play flow'; playBtn.setAttribute('aria-pressed', String(st.playing)); if (st.playing) start(); } } }, st.playing ? 'Pause flow' : 'Play flow');
      const presetBtns = PRESETS.map(p => h('button', { class: 'w-btn', 'data-k': 'preset', on: { click: () => { setMode(p.mode); pIn.value = p.P; tIn.value = p.Tin; qIn.value = p.flow; timSel.value = '0'; update(); } } }, p.name));
      const modeSel = h('select', { 'data-k': 'mode', style: { minWidth: '0', width: '100%', gridColumn: '2 / 4' } }, ...Object.keys(MODES).map(k => h('option', { value: k }, MODES[k].label)));
      const timSel = h('select', { 'data-k': 'tim', style: { minWidth: '0', width: '100%', gridColumn: '2 / 4' } }, h('option', { value: '0' }, 'fresh'), h('option', { value: '1' }, 'pumped-out (+0.010 K/W)'));
      const pIn = h('input', { type: 'range', min: 400, max: 1400, step: 10, value: st.P, 'data-k': 'power' });
      const tIn = h('input', { type: 'range', min: 15, max: 50, step: 1, value: st.Tin, 'data-k': 'inlet' });
      const qIn = h('input', { type: 'range', 'data-k': 'flow' });
      const pOut = h('output'), tOut = h('output'), qOut = h('output'), tLbl = h('span', null, 'Coolant inlet'), qLbl = h('span', null, 'Flow per cold plate');
      const controls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Cooling'), modeSel),
        h('label', { class: 'w-ctl' }, h('span', null, 'GPU power'), pIn, pOut),
        h('label', { class: 'w-ctl' }, tLbl, tIn, tOut),
        h('label', { class: 'w-ctl' }, qLbl, qIn, qOut),
        h('label', { class: 'w-ctl' }, h('span', null, 'TIM2 condition'), timSel));
      function setMode(m) {
        const F = MODES[m].flow, changed = st.mode !== m || qIn.min === '';
        st.mode = m; modeSel.value = m;
        qIn.min = F.min; qIn.max = F.max; qIn.step = F.step;
        if (changed) { qIn.value = F.def; tIn.value = MODES[m].inletDef; }
        tLbl.textContent = MODES[m].inletName; qLbl.textContent = MODES[m].flowName;
      }
      setMode('liquid');

      // ---------------- panels ----------------
      const A = svg('svg', { class: 'w-svg', viewBox: '0 0 360 404', role: 'img', 'aria-label': 'Cross-section of the GPU package, its cold plate or heatsink, and the coolant loop out to the building' });
      const B = svg('svg', { class: 'w-svg', viewBox: '0 0 360 404', role: 'img', 'aria-label': 'Temperature ladder: each layer\'s temperature drop drawn as a band on a shared temperature axis, from the facility water up to the junction' });
      const info = h('div', { class: 'w-note', style: { minHeight: '3.4em', marginTop: '4px' } });
      const readout = h('div', { class: 'w-readout' });
      const formula = h('div', { class: 'w-formula' });
      const legend = h('div', { class: 'w-legend' });
      let hoverEls = {}, anim = [], fanG = null, res = null;

      function hoverOn(id) { st.hover = id; paintHover(); }
      function paintHover() {
        Object.keys(hoverEls).forEach(k => hoverEls[k].forEach(e => { e.setAttribute('stroke', k === st.hover ? 'var(--ink)' : e._stroke || 'none'); e.setAttribute('stroke-width', k === st.hover ? 2 : e._sw || 0); }));
        const L = res.layers.find(l => l.id === st.hover);
        if (!L) { info.textContent = 'Hover or tap any layer (in either panel) to read what it is and why it costs the degrees it does. Layer thicknesses are not to scale: the two TIMs are ~0.1 mm, the lid ~3 mm.'; return; }
        const k = res.layers.indexOf(L), math = L.isApproach
          ? (res.liquid ? 'ΔT = P_rack / UA = ' + fmt(res.rackW / 1000, 1) + ' kW ÷ 35 kW/K = ' : 'coil approach ≈ ') + f1(L.dT) + ' °C'
          : 'ΔT = ' + fmt(st.P, 0) + ' W × ' + f3(L.R) + ' K/W = ' + f1(L.dT) + ' °C';
        info.textContent = L.name + ' — ' + math + ' (' + f1(res.T[k + 1]) + ' → ' + f1(res.T[k]) + ' °C). ' + L.desc;
      }
      const hl = (elm, id) => { elm._stroke = elm.getAttribute('stroke'); elm._sw = elm.getAttribute('stroke-width'); (hoverEls[id] = hoverEls[id] || []).push(elm); return elm; };
      const hoverable = (elm, id, label) => { elm.setAttribute('cursor', 'pointer'); elm.setAttribute('tabindex', '0'); elm.setAttribute('role', 'button'); elm.setAttribute('aria-label', label || res.layers.find(l => l.id === id).name); elm.addEventListener('mouseenter', () => hoverOn(id)); elm.addEventListener('focus', () => hoverOn(id)); elm.addEventListener('mouseleave', () => hoverOn(null)); elm.addEventListener('blur', () => hoverOn(null)); return elm; };

      function drawA() {
        A.innerHTML = ''; anim = []; fanG = null; hoverEls = {};
        const liquid = res.liquid, T = res.T, add = (...e) => A.append(...e);
        const X0 = 92, X1 = 342, XC = (X0 + X1) / 2;
        const layerRect = (id, attrs) => hoverable(hl(svg('rect', attrs), id), id);
        const dashed = (d, col, w) => { const p = svg('path', { d, fill: 'none', stroke: col, 'stroke-width': w || 2, 'stroke-dasharray': '6 5', 'pointer-events': 'none' }); add(p); anim.push(p); return p; };
        const pipe = (d, col) => { add(svg('path', { d, fill: 'none', stroke: col, 'stroke-width': 7, 'stroke-linejoin': 'round' })); dashed(d, 'var(--panel)'); };
        const arrow = (x, y, up) => add(svg('path', { d: 'M' + (x - 6) + ' ' + y + ' h12 l-6 ' + (up ? -8 : 8) + ' z', fill: 'var(--accent2)', 'pointer-events': 'none' }));
        // ---- board and package (shared by both modes) ----
        add(svg('rect', { x: 60, y: 372, width: 290, height: 14, fill: 'var(--panel2)', stroke: 'var(--line)' }));
        add(txt(205, 382.5, 'SXM module / compute-tray PCB', { anchor: 'middle', fill: 'var(--muted)' }));
        for (let x = 116; x <= 328; x += 12) add(svg('circle', { cx: x, cy: 369, r: 3, fill: 'var(--muted)' }));
        add(svg('rect', { x: 100, y: 342, width: 234, height: 24, fill: 'var(--ok)', 'fill-opacity': .35, stroke: 'var(--line)' }));
        add(pill(XC, 354, 'package substrate (BGA below)', { anchor: 'middle' }));
        add(svg('rect', { x: 106, y: 328, width: 222, height: 14, fill: 'var(--muted)', 'fill-opacity': .45 }));
        add(pill(XC, 335, 'CoWoS interposer', { anchor: 'middle' }));
        [[106, 120], [300, 314]].forEach(([x, cx]) => { for (let k = 0; k < 4; k++) add(svg('rect', { x, y: 274 + k * 13.5, width: 28, height: 12.5, fill: 'var(--muted)', 'fill-opacity': .55, stroke: 'var(--panel)', 'stroke-width': .8 })); add(txt(cx, 305, 'HBM', { anchor: 'middle', bold: true })); });
        add(layerRect('die', { x: 150, y: 274, width: 134, height: 54, fill: 'var(--muted)' }));
        const jc = res.status === 'ok' ? 'var(--accent)' : 'var(--bad)';
        add(svg('rect', { x: 150, y: 320, width: 134, height: 8, fill: jc, 'pointer-events': 'none' }));
        for (let x = 160; x < 284; x += 14) add(svg('circle', { cx: x, cy: 324, r: 1.8, fill: 'var(--panel)', 'pointer-events': 'none' }));
        add(pill(217, 296, 'GPU die (Si)', { anchor: 'middle', bold: true }));
        add(svg('line', { x1: 90, y1: 324, x2: 150, y2: 324, stroke: jc, 'stroke-width': 1.5, 'stroke-dasharray': '3 2', 'pointer-events': 'none' }));
        add(txt(88, 318, 'junction', { anchor: 'end', bold: true, fill: jc }));
        add(txt(88, 332, 'transistors', { anchor: 'end', fill: jc }));
        add(svg('rect', { x: X0, y: 232, width: 8, height: 110, fill: 'var(--cu)' }), svg('rect', { x: X1 - 8, y: 232, width: 8, height: 110, fill: 'var(--cu)' }));
        add(layerRect('tim1', { x: 106, y: 258, width: 222, height: 16, fill: 'var(--accent)', 'fill-opacity': .85 }));
        add(pill(XC, 266, 'TIM1: indium solder, ~0.1 mm', { anchor: 'middle' }));
        add(layerRect('lid', { x: X0, y: 232, width: X1 - X0, height: 26, fill: 'var(--cu)' }));
        add(pill(XC, 245, 'Lid: copper heat spreader', { anchor: 'middle', bold: true }));
        add(layerRect('tim2', { x: X0, y: 216, width: X1 - X0, height: 16, fill: 'var(--accent)', 'fill-opacity': .85 }));
        add(pill(XC, 224, st.timBad ? 'TIM2: paste, pumped-out (dried)' : 'TIM2: paste (pump-out risk)', { anchor: 'middle' }));
        add(layerRect('base', { x: X0, y: 198, width: X1 - X0, height: 18, fill: 'var(--cu)' }));
        if (liquid) {
          add(pill(XC, 207, 'Cold plate: copper base', { anchor: 'middle', bold: true }));
          // microchannel cavity with water flowing left → right, copper walls all round
          add(layerRect('film', { x: X0, y: 158, width: X1 - X0, height: 40, fill: 'var(--cu)' }));
          add(svg('rect', { x: 104, y: 166, width: 226, height: 28, fill: 'var(--si)', 'fill-opacity': .75, 'pointer-events': 'none' }));
          for (let x = 114; x < 330; x += 12) add(svg('rect', { x, y: 166, width: 3, height: 20, fill: 'var(--cu)', 'pointer-events': 'none' }));
          dashed('M104 190 H330', 'var(--panel)');
          add(pill(XC, 177, 'water in Cu microchannels →', { anchor: 'middle' }));
          // secondary loop: supply down the left, return up the right, quick disconnects on both hoses
          pipe('M132 110 V134 H82 V182 H92', 'var(--si)');
          pipe('M342 182 H352 V134 H302 V110', 'var(--si)');
          [82, 352].forEach(x => add(svg('rect', { x: x - 6, y: 150, width: 12, height: 14, rx: 2, fill: 'var(--panel)', stroke: 'var(--line2)', 'stroke-width': 1.2, 'pointer-events': 'none' })));
          add(txt(XC, 152, 'quick disconnects → rack manifold', { anchor: 'middle', fill: 'var(--muted)' }));
          add(pill(88, 122, 'supply ' + f1(st.Tin) + ' °C', { bold: true }));
          add(pill(346, 122, 'return ' + f1(res.Tout) + ' °C', { bold: true, anchor: 'end' }));
          add(hoverable(svg('rect', { x: 74, y: 112, width: 286, height: 46, fill: 'transparent' }), 'cal'));
          // CDU: pump + plate heat exchanger; facility loop leaves through the top edge
          add(layerRect('hx', { x: X0, y: 56, width: X1 - X0, height: 54, rx: 4, fill: 'var(--panel2)', stroke: 'var(--line2)' }));
          add(txt(102, 72, 'CDU', { bold: true, size: 14 }));
          add(txt(102, 87, 'coolant distribution unit', { fill: 'var(--muted)' }));
          add(txt(102, 102, 'pump + heat exchanger', { fill: 'var(--muted)' }));
          const pump = svg('g', { transform: 'translate(278 83)', 'pointer-events': 'none' }, svg('circle', { r: 13, fill: 'var(--panel)', stroke: 'var(--line2)', 'stroke-width': 1.5 }));
          const imp = svg('g'); for (let k = 0; k < 3; k++) imp.append(svg('path', { d: 'M0 0 Q6 -6 2 -11 Q-4 -7 0 0', fill: 'var(--si)', transform: 'rotate(' + k * 120 + ')' })); pump.append(imp); pump._blades = imp; add(pump); fanG = pump;
          for (let i = 0; i < 2; i++) { let d = 'M300 ' + (64 + i * 4); for (let k = 0; k < 4; k++) d += ' l8 ' + (k % 2 ? -34 : 34); add(svg('path', { d, fill: 'none', stroke: i ? 'var(--accent2)' : 'var(--si)', 'stroke-width': 2.5, 'pointer-events': 'none' })); }
          pipe('M300 30 V50', 'var(--accent2)'); pipe('M326 56 V36', 'var(--accent2)'); arrow(300, 49, false); arrow(326, 37, true);
          add(txt(4, 16, 'Facility water (building loop) → cooling tower', { fill: 'var(--muted)' }));
          add(txt(291, 46, 'in ' + f1(T[8]) + ' °C', { anchor: 'end', bold: true, fill: 'var(--accent2)' }));
          add(txt(332, 46, 'out', { bold: true, fill: 'var(--accent2)' }));
        } else {
          add(pill(XC, 207, 'Vapor-chamber base (Cu)', { anchor: 'middle', bold: true }));
          // fin stack with fan-driven air crossing left → right
          add(layerRect('film', { x: X0, y: 118, width: X1 - X0, height: 80, fill: 'var(--cu)', 'fill-opacity': .12 }));
          for (let x = 96; x < X1; x += 12) add(svg('rect', { x, y: 118, width: 4, height: 80, fill: 'var(--cu)', 'pointer-events': 'none' }));
          [134, 158, 182].forEach(y => dashed('M100 ' + y + ' H338', 'var(--muted)'));
          add(pill(XC, 158, 'fin stack: air crosses →', { anchor: 'middle' }));
          fanG = svg('g', { transform: 'translate(72 160)' }, svg('circle', { r: 17, fill: 'var(--panel2)', stroke: 'var(--line2)', 'stroke-width': 1.5 }));
          const blades = svg('g'); for (let k = 0; k < 4; k++) blades.append(svg('path', { d: 'M0 0 Q7 -8 3 -15 Q-3 -9 0 0', fill: 'var(--muted)', transform: 'rotate(' + k * 90 + ')' })); fanG.append(blades); fanG._blades = blades; add(fanG);
          add(txt(72, 192, 'fan', { anchor: 'middle', fill: 'var(--muted)' }));
          dashed('M6 160 H52', 'var(--muted)'); dashed('M352 178 V100', 'var(--muted)');
          add(pill(4, 110, 'cold aisle ' + f1(st.Tin) + ' °C', { bold: true }));
          add(pill(340, 110, 'exhaust ' + f1(res.Tout) + ' °C ↑', { bold: true, anchor: 'end' }));
          add(hoverable(svg('rect', { x: 0, y: 100, width: 360, height: 18, fill: 'transparent' }), 'cal'));
          add(layerRect('hx', { x: X0, y: 48, width: X1 - X0, height: 52, rx: 4, fill: 'var(--panel2)', stroke: 'var(--line2)' }));
          add(txt(102, 64, 'CRAH', { bold: true, size: 14 }));
          add(txt(102, 80, 'computer-room air handler:', { fill: 'var(--muted)' }));
          add(txt(102, 95, 'hot-aisle air → chilled-water coil', { fill: 'var(--muted)' }));
          pipe('M300 30 V42', 'var(--accent2)'); pipe('M326 48 V36', 'var(--accent2)'); arrow(300, 41, false); arrow(326, 37, true);
          add(txt(4, 16, 'Chilled water ← chiller (compressors)', { bold: true, fill: 'var(--accent2)' }));
          add(txt(291, 46, 'in ' + f1(T[8]) + ' °C', { anchor: 'end', bold: true, fill: 'var(--accent2)' }));
          add(txt(332, 46, 'out', { bold: true, fill: 'var(--accent2)' }));
        }
        add(txt(356, 400, 'not to scale', { anchor: 'end', fill: 'var(--muted)' }));
        paintHover();
      }

      function drawB() {
        B.innerHTML = '';
        const T = res.T, L = res.layers, add = (...e) => B.append(...e);
        const XL = 126, X1 = 344, ROW0 = 40, RH = 38, AXY = 364;
        const span0 = Math.max(100, res.Tj + 8) - (T[8] - 3), step = span0 <= 80 ? 10 : span0 <= 160 ? 20 : 50;
        const tmin = step * Math.floor((T[8] - 3) / step), tmax = step * Math.ceil(Math.max(100, res.Tj + 8) / step);
        const xOf = t => XL + (t - tmin) / (tmax - tmin) * (X1 - XL);
        add(txt(0, 16, 'Each band = one layer\'s ΔT = P · R', { fill: 'var(--muted)' }));
        for (let t = tmin; t <= tmax + 0.01; t += step) {
          add(svg('line', { x1: f1(xOf(t)), y1: 36, x2: f1(xOf(t)), y2: AXY, stroke: 'var(--line)', 'stroke-width': 1 }));
          add(txt(xOf(t), AXY + 16, String(t), { anchor: 'middle', mono: true, fill: 'var(--muted)' }));
        }
        add(svg('line', { x1: XL, y1: AXY, x2: X1, y2: AXY, stroke: 'var(--line2)', 'stroke-width': 1 }));
        add(txt((XL + X1) / 2, AXY + 34, 'temperature at each node, °C', { anchor: 'middle', fill: 'var(--muted)' }));
        const xt = xOf(T_THROTTLE), xh = xOf(T_HARD);
        add(svg('rect', { x: f1(xt), y: 36, width: f1(Math.max(2, X1 - xt)), height: AXY - 36, fill: 'var(--bad)', 'fill-opacity': .08 }));
        add(svg('line', { x1: f1(xt), y1: 36, x2: f1(xt), y2: AXY, stroke: 'var(--bad)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }));
        add(svg('line', { x1: f1(xh), y1: 36, x2: f1(xh), y2: AXY, stroke: 'var(--bad)', 'stroke-width': 1, 'stroke-dasharray': '2 3' }));
        add(txt(X1, 30, 'throttles ≥ 85 °C · max 90', { anchor: 'end', bold: true, fill: 'var(--bad)' }));
        // one row per layer, cold (facility) at the top → hot (junction) at the bottom; bands chain into a staircase
        let prevX = null;
        for (let i = 0; i < L.length; i++) {
          const k = L.length - 1 - i, lay = L[k], y0 = ROW0 + i * RH;
          const xc = xOf(T[k + 1]), xhot = xOf(T[k]), w = Math.max(1.5, xhot - xc);
          add(svg('line', { x1: 0, y1: y0, x2: X1, y2: y0, stroke: 'var(--line)', 'stroke-width': 1 }));
          add(txt(0, y0 + 15, lay.short, {}));
          add(txt(0, y0 + 31, lay.sub, { mono: true, fill: 'var(--muted)' }));
          if (prevX !== null) add(svg('line', { x1: f1(xc), y1: y0 - 8, x2: f1(xc), y2: y0 + 8, stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-opacity': .55 }));
          add(hl(svg('rect', { x: f1(xc), y: y0 + 8, width: f1(w), height: 22, fill: lay.fill, 'fill-opacity': lay.id === 'die' ? .6 : .8, stroke: 'var(--muted)', 'stroke-width': .5, 'pointer-events': 'none' }), lay.id));
          const node = (lay.id === 'hx' ? MODES[st.mode].fac + ' ' : lay.id === 'cal' ? 'inlet ' : '') + f1(T[k + 1]) + ' °C';
          if (xc + estW(node, 12, true) + 4 <= X1) add(pill(xc + 3, y0 + 5, node, { mono: true, fill: 'var(--muted)' }));
          else add(pill(xc - 3, y0 + 5, node, { mono: true, fill: 'var(--muted)', anchor: 'end' }));
          const dl = '+' + f1(lay.dT) + ' °C';
          if (xhot + 8 + estW(dl, 12, true) <= X1) add(pill(xhot + 8, y0 + 22, dl, { mono: true, bold: true }));
          else add(pill(xc - 5, y0 + 22, dl, { mono: true, bold: true, anchor: 'end' }));
          add(hoverable(svg('rect', { x: 0, y: y0, width: X1, height: RH, fill: 'transparent' }), lay.id));
          prevX = xhot;
        }
        const jy = ROW0 + (L.length - 1) * RH + 19, jx = xOf(res.Tj), jcol = res.status === 'ok' ? 'var(--ok)' : res.status === 'warn' ? 'var(--warn)' : 'var(--bad)';
        add(svg('circle', { cx: f1(jx), cy: jy, r: 5, fill: jcol, stroke: 'var(--ink)', 'stroke-width': 1.5, 'pointer-events': 'none' }));
        const head = T_THROTTLE - res.Tj;
        const jlab = 'T_j = ' + f1(res.Tj) + ' °C · ' + (head >= 0 ? 'headroom ' + f1(head) + ' °C' : 'over by ' + f1(-head) + ' °C');
        const jw = estW(jlab, 13, true) / 2 + 8;
        add(pill(Math.min(Math.max(jx, jw), 358 - jw), AXY - 11, jlab, { anchor: 'middle', size: 13, bold: true, mono: true, fill: jcol }));
      }

      function update() {
        st.P = +pIn.value; st.Tin = +tIn.value; st.flow = +qIn.value; st.mode = modeSel.value; st.timBad = timSel.value === '1';
        const M = MODES[st.mode];
        pOut.textContent = fmt(st.P, 0) + ' W'; tOut.textContent = st.Tin + ' °C'; qOut.textContent = fmt(st.flow, 2) + ' ' + M.flow.unit;
        presetBtns.forEach((b, i) => { const p = PRESETS[i], on = p.mode === st.mode && p.P === st.P && p.Tin === st.Tin && Math.abs(p.flow - st.flow) < 1e-9 && !st.timBad; b.classList.toggle('primary', on); b.setAttribute('aria-pressed', String(on)); });
        res = compute(st);
        const liquid = res.liquid, head = T_THROTTLE - res.Tj;
        const col = res.status === 'ok' ? 'var(--ok)' : res.status === 'warn' ? 'var(--warn)' : 'var(--bad)';
        const stat = (v, l, c) => h('div', { class: 'w-stat' }, h('b', { style: c ? { color: c } : null }, v), h('span', null, l));
        readout.innerHTML = '';
        readout.append(
          stat(f1(res.Tj) + ' °C', 'junction temperature' + (res.status === 'bad' ? ' — above the ~90 °C maximum' : res.status === 'warn' ? ' — GPU throttles (≥ 85 °C)' : ' (throttles at 85 °C)'), col),
          stat((head >= 0 ? '' : '−') + f1(Math.abs(head)) + ' °C', head >= 0 ? 'headroom below the throttle point' : 'over the throttle point', col),
          stat(f3(res.sumR) + ' K/W', 'ΣR junction → ' + M.inNode + ' (budget (85 − ' + st.Tin + ') ÷ ' + fmt(st.P, 0) + ' = ' + f3(res.budget) + ' K/W)', res.sumR > res.budget ? 'var(--bad)' : null),
          stat('+' + f1(res.rise) + ' °C → ' + f1(res.Tout) + ' °C', M.fluid + ' rise through the ' + (liquid ? 'plate' : 'fins') + ' → ' + M.outNode + ' (' + fmt(res.mcp, 0) + ' W per °C)'),
          stat(fmt(res.rackW / 1000, 0) + ' kW', 'heat from an NVL72 rack of 72 such GPUs + CPUs + switches'),
          liquid ? stat(fmt(res.rackFlow * 60, 0) + ' L/min', 'rack coolant flow at the same ' + f1(res.rise) + ' °C rise (' + fmt(res.rackFlow, 1) + ' kg/s)')
                 : stat(fmt(res.rackFlow / RHO_A, 1) + ' m³/s', 'air that rack would need at the same ' + f1(res.rise) + ' °C rise (' + fmt(res.rackFlow / RHO_A / M3S_PER_CFM, 0) + ' CFM); water at a 10 °C rise: ' + fmt(res.rackW / (CP_W * 10) * 60, 0) + ' L/min'));
        formula.innerHTML = 'ΔT<sub>i</sub> = P · R<sub>i</sub> &nbsp;·&nbsp; T<sub>j</sub> = T<sub>in</sub> + P·(R<sub>die</sub>+R<sub>TIM1</sub>+R<sub>lid</sub>+R<sub>TIM2</sub>+R<sub>base</sub>+R<sub>film</sub>) + P/(2·ṁ·c<sub>p</sub>) &nbsp;·&nbsp; T<sub>out</sub> = T<sub>in</sub> + P/(ṁ·c<sub>p</sub>)<br>'
          + (liquid ? 'R<sub>film</sub> ≈ 0.008·(1.5 L/min ÷ Q)<sup>0.6</sup> K/W &nbsp;·&nbsp; ṁ = ' + fmt(res.mcp / CP_W * 1000, 1) + ' g/s, c<sub>p</sub> = 4.18 kJ/kg·K &nbsp;·&nbsp; CDU approach = P<sub>rack</sub>/UA = ' + fmt(res.rackW / 1000, 0) + ' kW ÷ 35 kW/K = ' + f1(res.approach) + ' °C'
                    : 'R<sub>fins</sub> ≈ 0.040·(60 CFM ÷ Q)<sup>0.7</sup> K/W &nbsp;·&nbsp; ṁ = ' + fmt(res.mcp / CP_A * 1000, 1) + ' g/s, c<sub>p</sub> = 1.005 kJ/kg·K &nbsp;·&nbsp; coil approach ≈ ' + CRAH_APPROACH + ' °C (~)');
        legend.innerHTML = '';
        const li = (c, l, op) => h('span', { class: 'w-legend-item' }, h('i', { style: { background: c, opacity: op || 1 } }), l);
        legend.append(li('var(--muted)', 'silicon'), li('var(--accent)', 'TIM (thermal interface material)'), li('var(--cu)', 'copper'),
          liquid ? li('var(--si)', 'secondary-loop water') : li('var(--line2)', 'air'),
          li('var(--accent2)', liquid ? 'facility water' : 'chilled water'), li('var(--bad)', '≥ 85 °C throttle zone', .5));
        drawA(); drawB();
      }
      [pIn, tIn, qIn].forEach(i => i.addEventListener('input', update));
      modeSel.addEventListener('change', () => { setMode(modeSel.value); update(); });
      timSel.addEventListener('change', update);

      // ---------------- animation: moving dashes show flow direction; the pump / fan spins ----------------
      let raf = 0, visible = true, last = 0, off = 0, ang = 0;
      function frame(ts) {
        raf = 0; if (!st.playing || !visible) return;
        if (last) { const dt = Math.min(0.1, (ts - last) / 1000), v = res.liquid ? 12 + 10 * st.flow : 10 + st.flow * 0.4; off -= v * dt; ang += 240 * dt; }
        last = ts;
        anim.forEach(a => a.setAttribute('stroke-dashoffset', f1(off)));
        if (fanG && fanG._blades) fanG._blades.setAttribute('transform', 'rotate(' + f1(ang % 360) + ')');
        raf = requestAnimationFrame(frame);
      }
      function start() { if (!raf && st.playing && visible) { last = 0; raf = requestAnimationFrame(frame); } }
      const io = new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); if (visible) start(); });
      io.observe(el);

      el.append(
        h('div', { class: 'w-controls' }, h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' } }, playBtn, h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, 'Presets:'), ...presetBtns)),
        controls,
        h('div', { class: 'w-grid2' }, A, B),
        legend, info, readout, formula,
        h('div', { class: 'w-note' }, 'Resistances are typical values (~) for a Blackwell-class package; the module\'s budget is ~40 °C ÷ 1,200 W ≈ 0.033 K/W from transistor to water. Heat flows in series, so every watt crosses every layer and the drops add up: the widest band is the layer to fix first. Switching cooling resets inlet and flow to typical values.'));
      update();
      start();
      ctx.onTheme(() => { drawA(); drawB(); });
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; st.playing = false; io.disconnect(); };
    }
  });
})();
