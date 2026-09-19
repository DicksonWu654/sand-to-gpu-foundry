/* Widget: litho-track — "The Litho Track, Step by Step" (Module 07) */
(function () {
  'use strict';

  // ---- numbers from Module 07 ----
  const RPM0 = 2000, ETA0 = 2, T0 = 100;          // spin-curve reference: 100 nm at 2,000 rpm for a 2 cP thin ArF resist
  const OX_NM = 40, BARC_NM = 60, TOPCOAT_NM = 30; // drawn stack (BARC 30–90 nm, topcoat ~30 nm)
  const CD_MIN_NM = 40, AR_MAX = 2.5;              // 193i single-exposure half-pitch; collapse limit for aspect ratio
  const T_BAKE_S = 90, T_COAT_S = 60;              // seconds a wafer occupies a bake plate / a coat cup
  const RESIST_ML = 1.0, RESIST_USD_PER_L = 2000;  // 0.5–1.5 mL at $1,000–3,000/L
  const VISC = [
    { eta: 2, name: '2 cP (thin ArF immersion)' },
    { eta: 5, name: '5 cP (standard ArF / KrF)' },
    { eta: 12, name: '12 cP (thick KrF)' },
    { eta: 30, name: '30 cP (i-line)' },
  ];
  const thickness = (rpm, eta) => T0 * Math.sqrt(eta / ETA0) * Math.sqrt(RPM0 / rpm); // Meyerhofer: t ∝ η^0.5 / ω^0.5

  const STEPS = [
    { t: 'HMDS prime', st: ['hmds'], where: 'vapour-prime chamber', time: '~60 s at 120–150 °C', secs: 60,
      d: 'Bare oxide is hydrophilic: a water drop spreads flat on it (contact angle ≈ 0°) and an organic resist would lift off in the developer. A vapour of HMDS reacts with the surface –OH groups and caps them with trimethylsilyl groups, one molecule thick, raising the contact angle to ~60–70° so the resist sticks. Skipped when the resist goes onto an organic underlayer.' },
    { t: 'Underlayer: BARC coat + bake', st: ['barc', 'bake'], where: 'coat cup, then hot plate', time: '~30 s spin + 60 s bake at ~200 °C', secs: 90,
      d: 'A bottom anti-reflective coating (BARC), 30–90 nm of a light-absorbing polymer, is spun on and baked. Without it, light reflected from the substrate interferes with the incoming wave and prints standing waves (bright and dark planes every λ/2n ≈ 57 nm through the film), so 1 nm of thickness variation becomes several nm of CD error. At advanced nodes this is the SiARC + spin-on-carbon tri-layer.' },
    { t: 'Spin coat the resist', st: ['coat'], where: 'coat cup (solvent-saturated, exhausted)', time: '20–60 s at 1,500–4,000 rpm', secs: 40,
      d: 'About 1 mL of resist solution (2–10 % solids in a solvent such as PGMEA) is dispensed while the wafer turns slowly, then the wafer is accelerated to thousands of rpm. Centrifugal force flings off the excess within a second; as the film thins, the solvent evaporates, viscosity rises and the film freezes at a thickness set by spin speed and viscosity (calculator below).' },
    { t: 'Edge-bead removal (EBR)', st: ['coat'], where: 'same coat cup, EBR nozzle', time: '~10 s', secs: 10,
      d: 'Surface tension piles the fluid up at the rim into an edge bead several micrometres tall; left there it flakes off during handling and lands on chucks and other wafers. A nozzle aims solvent at the outer 1.5–2 mm while the wafer spins, dissolving the bead. The backside is rinsed too: a resist droplet under the wafer would lift it off the scanner chuck and throw a die out of focus.' },
    { t: 'Soft bake + chill', st: ['bake', 'chill'], where: 'proximity hot plate, then chill plate', time: '60–90 s at 90–110 °C, then 23 °C', secs: 120,
      d: 'The as-coated film still holds 10–30 % solvent. A hot plate (the wafer floats 0.1 mm above it on pins, for uniform heating without contact) drives that down to 2–5 % and densifies the film; a 23 °C chill plate then stops the bake reproducibly. Residual solvent changes how far acid moves later, so plates are held to ±0.1–0.2 °C.' },
    { t: 'Topcoat (immersion, optional)', st: ['coat'], where: 'coat cup', time: '~30 s spin', secs: 30,
      d: 'For immersion lithography a water-repellent topcoat (~30 nm) can be spun on so the water between lens and wafer does not leach the acid generator out of the resist. Most modern immersion resists build the water repellency in and skip this step; the topcoat dissolves in the developer.' },
    { t: 'Exposure: hand-off to the scanner', st: ['scanner', 'iface'], where: 'scanner, through the sealed interface', time: '~10–12 s for ~100 fields · 20–40 mJ/cm²', secs: 40,
      d: 'The wafer is aligned to ~1 nm, its height mapped, and each 26 × 33 mm field is exposed in ~0.1 s through the mask. Where 193 nm light lands, the photoacid generator releases a little acid: a latent image. The resist’s solubility has not changed yet.' },
    { t: 'Post-exposure bake (PEB) + chill', st: ['peb', 'chill2'], where: 'PEB hot plate, then chill plate', time: '60–90 s at 90–130 °C, then 23 °C', secs: 120,
      d: 'For a chemically amplified resist this is where the pattern forms: heat lets each acid diffuse 5–20 nm and catalyse hundreds of deprotection reactions, switching the exposed polymer from oil-like to base-soluble. The delay between exposure and PEB is held to the second: even ppb of airborne amines neutralise acid at the surface and leave T-shaped line tops.' },
    { t: 'Puddle develop', st: ['dev'], where: 'develop cup, slot nozzle', time: '30–60 s in 0.26 N TMAH', secs: 60,
      d: 'A slot nozzle lays a puddle of 0.26 N (2.38 wt %) tetramethylammonium hydroxide in water over the whole wafer. Deprotected resist dissolves at 100–1,000 nm/s, unexposed resist at < 1 nm/s, so the exposed spaces open up (positive tone). Negative-tone development uses an organic solvent and removes the unexposed regions instead, the standard for contact and via layers.' },
    { t: 'Rinse + spin dry', st: ['rinse'], where: 'develop cup, DI-water nozzle', time: '~20 s rinse + spin dry', secs: 30,
      d: 'Deionised water rinses away the developer and dissolved resist, then the wafer spins dry. As the last water evaporates from between neighbouring lines its curved surface pulls them together with ~3.6 MPa across a 40 nm gap; lines taller than ~2.5× their width fold over, which is why resist is ~100 nm thick and no more.' },
    { t: 'After-develop inspection + disposition', st: ['metro', 'foup'], where: 'CD-SEM and overlay tools, outside the cell', time: 'minutes, on a sample of sites', secs: 300,
      d: 'CD-SEM measures line widths, overlay metrology checks the alignment to the layer below, and optical inspection looks for defects. Nothing irreversible has happened yet: a failing wafer is stripped in an oxygen plasma and sent round the cell again (rework, ~1 hour); a passing wafer goes to etch, where the pattern becomes permanent.' },
  ];
  const START_STEP = 6;     // exposure: full stack, mask and scanner hand-off visible on the first frame
  const ANIM = { 2: 1600, 8: 2000 }; // step index -> one-shot animation length (ms)

  window.registerWidget('litho-track', {
    title: 'The Litho Track, Step by Step',
    caption: 'Follow one wafer through the coater/developer wrapped around the scanner: the map shows which module it is in, the cross-section shows the resist stack building and the pattern appearing. Then see why spin speed sets thickness and why takt time sets how many bake plates a track needs.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      let step = START_STEP, rpm = 2000, eta = 2, wph = 275, prog = 1, raf = 0, visible = true, playing = false, playTimer = 0;
      const sh = () => ({ margin: '18px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' });

      // ================= step-through chrome =================
      const counter = h('span', { class: 'count' });
      const prevBtn = h('button', { class: 'w-btn', 'aria-label': 'Previous step', on: { click: () => go(step - 1) } }, 'Prev');
      const nextBtn = h('button', { class: 'w-btn', 'aria-label': 'Next step', on: { click: () => go(step + 1) } }, 'Next');
      const playBtn = h('button', { class: 'w-btn', 'aria-label': 'Play or pause the sequence', on: { click: () => setPlaying(!playing) } }, 'Play sequence');
      const dots = STEPS.map((s, i) => h('button', { class: 'w-step-dot', 'aria-label': 'Step ' + (i + 1), title: (i + 1) + '. ' + s.t, on: { click: () => go(i) } }));
      const nav = h('div', { class: 'w-step-nav' }, prevBtn, ...dots, nextBtn, counter, playBtn);
      const title = h('div', { class: 'w-step-title' });
      const desc = h('div', { class: 'w-step-desc' });
      const whereLine = h('div', { class: 'w-note', style: { marginTop: '2px' } });
      const replayBtn = h('button', { class: 'w-btn', 'aria-label': 'Replay animation', style: { marginTop: '6px' }, on: { click: () => animate(ANIM[step] || 1600, true) } }, 'Replay animation');

      // ================= cell map (side view) =================
      const XM = svg('svg', { class: 'w-svg', viewBox: '0 0 330 200', role: 'img', 'aria-label': 'Side view of a litho cell: load port, track modules, interface and scanner' });
      const ST = {}; // station key -> {r, cx, cy}
      const mt = (x, y, txt, o) => XM.append(svg('text', Object.assign({ x, y, 'font-size': 11.5, 'font-family': 'var(--sans)', fill: 'var(--muted)' }, o || {}), txt));
      function station(key, x, y, w, hh, lines) {
        const r = svg('rect', { x, y, width: w, height: hh, rx: 3, fill: 'var(--panel)', stroke: 'var(--line2)', 'stroke-width': 1 });
        XM.append(r);
        const cy0 = lines.length ? y + 8 + 5 : y + hh / 2;
        lines.forEach((ln, i) => mt(x + w / 2, cy0 + 8 + i * 13, ln, { 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 11.5 }));
        ST[key] = { r, cx: x + w / 2, cy: y + hh - 9 };
      }
      mt(52, 20, 'Track: coater / developer', { fill: 'var(--ink)', 'font-size': 12, 'font-weight': 600 });
      mt(302, 20, 'Scanner', { 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 12, 'font-weight': 600 });
      XM.append(svg('rect', { x: 50, y: 28, width: 196, height: 160, rx: 5, fill: 'var(--panel2)', 'fill-opacity': .7, stroke: 'var(--line2)' }));
      mt(54, 41, 'hot & chill plates');
      ['hmds', 'bake', 'chill', 'peb', 'chill2'].forEach((k, i) => station(k, 54 + i * 38, 45, 36, 44, [{ hmds: 'HMDS', bake: 'Bake', chill: 'Chill', peb: 'PEB', chill2: 'Chill' }[k]]));
      XM.append(svg('line', { x1: 54, y1: 105, x2: 242, y2: 105, stroke: 'var(--muted)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
      mt(148, 101, 'transfer robot', { 'text-anchor': 'middle' });
      mt(54, 118, 'spin cups');
      [['barc', ['BARC', 'coat']], ['coat', ['Resist', 'coat']], ['dev', ['Develop']], ['rinse', ['Rinse', 'dry']]].forEach(([k, l], i) => station(k, 55 + i * 47, 122, 45, 60, l));
      mt(25, 54, 'load port', { 'text-anchor': 'middle' });
      station('foup', 3, 58, 44, 44, ['FOUP']);
      mt(25, 124, 'inspect', { 'text-anchor': 'middle' });
      station('metro', 3, 128, 44, 56, ['CD-SEM', 'overlay']);
      station('iface', 250, 60, 22, 104, []);
      XM.append(svg('text', { x: 261, y: 112, 'font-size': 11, 'font-family': 'var(--sans)', fill: 'var(--ink)', 'text-anchor': 'middle', transform: 'rotate(-90 261 112)' }, 'interface'));
      station('scanner', 276, 28, 52, 160, []);
      XM.append(svg('ellipse', { cx: 302, cy: 62, rx: 16, ry: 5, fill: 'var(--si)', 'fill-opacity': .6, stroke: 'var(--si)' }));
      mt(302, 48, 'lens', { 'text-anchor': 'middle', 'font-size': 11 });
      XM.append(svg('path', { d: 'M 286 67 L 318 67 L 306 148 L 298 148 Z', fill: 'var(--accent2)', 'fill-opacity': .18 }));
      XM.append(svg('rect', { x: 282, y: 152, width: 40, height: 8, rx: 2, fill: 'var(--line2)' }));
      XM.append(svg('ellipse', { cx: 302, cy: 150, rx: 17, ry: 3.5, fill: 'var(--si)', 'fill-opacity': .5, stroke: 'var(--si)' }));
      mt(302, 176, 'ASML NXT', { 'text-anchor': 'middle', fill: 'var(--ink)', 'font-size': 11 });
      ST.scanner.cx = 302; ST.scanner.cy = 150; ST.iface.cy = 155;
      const marker = svg('g', { style: { transition: reduced ? 'none' : 'transform .45s ease' } },
        svg('circle', { r: 6, fill: 'var(--accent)', stroke: 'var(--ground)', 'stroke-width': 2 }));
      XM.append(marker);
      const mapNote = h('div', { class: 'w-note' }, 'Track: TEL CLEAN TRACK LITHIUS Pro Z (≈85–90 % of leading-edge tracks) or SCREEN SOKUDO DUO. Bake plates are stacked in towers above the spin cups; a robot shuttles wafers between modules on a schedule that is deterministic to the second. Amber dot = this wafer; lit modules = in use at this step.');
      function drawMap() {
        const st = STEPS[step].st;
        Object.keys(ST).forEach(k => {
          const idx = st.indexOf(k);
          ST[k].r.setAttribute('fill', idx >= 0 ? 'var(--accent)' : 'var(--panel)');
          ST[k].r.setAttribute('fill-opacity', idx === 0 ? .35 : idx > 0 ? .16 : 1);
          ST[k].r.setAttribute('stroke', idx >= 0 ? 'var(--accent)' : 'var(--line2)');
          ST[k].r.setAttribute('stroke-width', idx === 0 ? 2 : 1);
        });
        const p = ST[st[0]];
        marker.style.transform = `translate(${p.cx}px, ${p.cy}px)`;
      }

      // ================= wafer cross-section =================
      const XS = svg('svg', { class: 'w-svg', viewBox: '0 0 330 262', role: 'img', 'aria-label': 'Wafer cross-section showing the resist stack and pattern at this step' });
      function drawXS() {
        XS.innerHTML = '';
        const s = step + 1;
        const t = thickness(rpm, eta), sc = Math.min(0.45, 100 / (OX_NM + BARC_NM + TOPCOAT_NM + t)); // px per nm; whole stack ≤ 100 px
        const X0 = 12, X1 = 210, W = X1 - X0, LX = 216, AX = 165, ySi = 206, siH = 26;
        const labels = [];
        const R = (x, y, w, hh, fill, o) => XS.append(svg('rect', Object.assign({ x, y, width: w, height: hh, fill }, o || {})));
        const T = (x, y, txt, o) => XS.append(svg('text', Object.assign({ x, y, 'font-size': 11.5, 'font-family': 'var(--sans)', fill: 'var(--muted)' }, o || {}), txt));
        const TC = (y, txt, o) => T(AX, y, txt, Object.assign({ 'text-anchor': 'middle' }, o || {}));
        const MONO = { 'font-family': 'var(--mono)', 'font-size': 11 };
        const Ln = (x1, y1, x2, y2, o) => XS.append(svg('line', Object.assign({ x1, y1, x2, y2, stroke: 'var(--muted)', 'stroke-width': 1 }, o || {})));
        const P = (d, o) => XS.append(svg('path', Object.assign({ d, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.2 }, o || {})));
        const arrow = (x1, y1, x2, y2, o) => { P(`M${x1},${y1} L${x2},${y2}`, o); const a = Math.atan2(y2 - y1, x2 - x1); P(`M${x2},${y2} L${x2 - 5 * Math.cos(a - .5)},${y2 - 5 * Math.sin(a - .5)} M${x2},${y2} L${x2 - 5 * Math.cos(a + .5)},${y2 - 5 * Math.sin(a + .5)}`, o); };
        const nozzle = (x, y, ang, len) => { const a = ang * Math.PI / 180; P(`M${x},${y} L${x - len * Math.cos(a)},${y - len * Math.sin(a)}`, { stroke: 'var(--line2)', 'stroke-width': 6, 'stroke-linecap': 'round' }); };

        // ---- what the wafer sits on ----
        const under = { 1: ['vapour-prime plate, 120–150 °C', true], 2: ['BARC bake plate, ~200 °C', true], 5: ['hot plate 90–110 °C, wafer on pins · then chill 23 °C', true], 8: ['PEB plate 90–130 °C · then chill plate 23 °C', true], 3: ['vacuum chuck, spinning', false], 6: ['vacuum chuck, spinning', false], 9: ['develop chuck, stationary', false], 10: ['vacuum chuck, spinning dry', false], 7: ['scanner wafer stage', false], 11: ['CD-SEM stage', false], 4: ['backside rinse: no resist under the wafer', false] }[s];
        const yPl = ySi + siH + 7;
        if (under) {
          const [txt, hot] = under;
          if (hot) {
            for (let i = 0; i < 6; i++) P(`M${X0 + 14 + i * 34},${yPl - 3} q3,-4 6,0 t6,0`, { stroke: 'var(--warn)', 'stroke-width': 1.2, opacity: .8 });
            R(X0 - 6, yPl, W + 12, 6, 'var(--warn)', { rx: 2, 'fill-opacity': .85 });
            if (s === 5) [X0 + 40, X0 + W / 2, X1 - 40].forEach(x => R(x - 2, ySi + siH, 4, 7, 'var(--line2)'));
          } else if (s === 4) {
            for (let k = 0; k < 4; k++) Ln(X0 + W / 2 - 18 + k * 12, yPl + 10, X0 + W / 2 - 6 + k * 12 - 6, ySi + siH + 1, { stroke: 'var(--si)', 'stroke-width': 1.2 });
          } else R(X0 + 50, ySi + siH + 1, W - 100, 6, 'var(--line2)', { rx: 2 });
          TC(yPl + 20, txt, { fill: hot ? 'var(--warn)' : 'var(--muted)', 'font-size': 11 });
        }
        // ---- silicon, film, HMDS ----
        R(X0, ySi, W, siH, 'var(--si)', { 'fill-opacity': .85 });
        labels.push({ y: ySi + siH / 2, name: 'Si wafer' });
        let y = ySi;
        const oxH = OX_NM * sc; y -= oxH; R(X0, y, W, oxH, 'var(--line2)');
        labels.push({ y: y + oxH / 2, name: 'SiO₂ film to etch' });
        Ln(X0, y + .8, X1, y + .8, { stroke: 'var(--ok)', 'stroke-width': 1.6, 'stroke-dasharray': '2 2' });
        labels.push({ y: y, name: 'HMDS monolayer' });
        const yOx = y;
        let bH = 0;
        if (s >= 2) { bH = BARC_NM * sc; y -= bH; R(X0, y, W, bH, 'var(--cu)', { 'fill-opacity': .75 }); labels.push({ y: y + bH / 2, name: 'BARC ' + BARC_NM + ' nm' }); }
        // ---- resist geometry: lines at the collapse-safe CD, pitch = 2·CD ----
        const CD = Math.max(CD_MIN_NM, t / AR_MAX), cdPx = CD * sc, pitchPx = 2 * cdPx;
        const n = Math.max(1, Math.floor((W - cdPx - 10) / pitchPx));
        const margin = (W - (n * pitchPx + cdPx)) / 2;
        const spaces = []; for (let i = 0; i < n; i++) { const a = X0 + margin + cdPx + i * pitchPx; spaces.push([a, a + cdPx]); }
        const lines = [[X0, spaces[0][0]]]; for (let i = 0; i < n; i++) lines.push([spaces[i][1], i + 1 < n ? spaces[i + 1][0] : X1]);
        let tH = 0, yR = y, grow = 1;
        if (s >= 3) {
          const G = Math.max(0, Math.min(3, (y - 84) / (t * sc) - 1)); // spin animation: film starts thick but stays on canvas
          grow = s === 3 ? 1 + G * Math.pow(1 - prog, 2) : 1;
          tH = t * sc * grow; yR = y - tH; y = yR;
          const resist = { 'fill-opacity': .55 };
          if (s <= 8) {
            R(X0, yR, W, tH, 'var(--accent)', resist);
            if (s === 7) spaces.forEach(([a, b]) => R(a, yR, b - a, tH, 'var(--accent2)', { 'fill-opacity': .32 }));
            if (s === 8) spaces.forEach(([a, b]) => { R(a - 3, yR, b - a + 6, tH, 'var(--accent2)', { 'fill-opacity': .25 }); R(a, yR, b - a, tH, 'var(--accent2)', { 'fill-opacity': .7 }); });
          } else {
            lines.forEach(([a, b]) => R(a, yR, b - a, tH, 'var(--accent)', resist));
            if (s === 9) { const rem = tH * (1 - prog); if (rem > 0.5) spaces.forEach(([a, b]) => R(a, yR + tH - rem, b - a, rem, 'var(--accent2)', { 'fill-opacity': .7 })); }
          }
          labels.push({ y: yR + tH / 2, name: 'resist ' + fmt(t * grow, 0) + ' nm' });
          if (s === 7) labels.push({ y: yR + tH / 2 + 10, name: 'latent acid image', color: 'var(--accent2)' });
          if (s === 8) labels.push({ y: yR + tH / 2 + 10, name: 'deprotected: soluble', color: 'var(--accent2)' });
          if (s >= 9) labels.push({ y: yR + tH / 2 + 10, name: s === 9 && prog < 1 ? 'spaces dissolving' : 'open spaces', color: 'var(--accent2)' });
        }
        if (s >= 6 && s <= 8) { const cH = TOPCOAT_NM * sc; y -= cH; R(X0, y, W, cH, 'var(--ok)', { 'fill-opacity': .5 }); labels.push({ y: y + cH / 2, name: 'topcoat ' + TOPCOAT_NM + ' nm' }); }
        const yTop = y;

        // ---- per-step annotations above the stack ----
        if (s === 1) {
          TC(40, '2 Si–OH + HMDS → 2 Si–O–Si(CH₃)₃ + NH₃', Object.assign({ fill: 'var(--ok)' }, MONO));
          TC(56, 'HMDS vapour caps the –OH groups with –Si(CH₃)₃');
          for (let i = 0; i < 26; i++) XS.append(svg('circle', { cx: X0 + 8 + ((i * 37) % (W - 16)), cy: 128 + ((i * 23) % 52), r: 1.8, fill: 'var(--ok)', opacity: .7 }));
          T(X1 + 6, 150, 'HMDS', { fill: 'var(--ok)', 'font-size': 11 }); T(X1 + 6, 163, 'vapour', { fill: 'var(--ok)', 'font-size': 11 });
          const yS = 100;
          T(X0 + 50, yS - 24, 'before: θ ≈ 0°', { 'text-anchor': 'middle', fill: 'var(--ink)' });
          P(`M${X0 + 24},${yS} a 26 5 0 0 1 52 0 z`, { fill: 'var(--si)', 'fill-opacity': .5, stroke: 'var(--si)' });
          Ln(X0 + 10, yS, X0 + 90, yS, { stroke: 'var(--line2)', 'stroke-width': 2 });
          T(X0 + 152, yS - 24, 'after HMDS: θ ≈ 65°', { 'text-anchor': 'middle', fill: 'var(--ink)' });
          P(`M${X0 + 138},${yS} a 14 14 0 0 1 28 0 z`, { fill: 'var(--si)', 'fill-opacity': .5, stroke: 'var(--si)' });
          Ln(X0 + 112, yS, X0 + 192, yS, { stroke: 'var(--ok)', 'stroke-width': 2, 'stroke-dasharray': '2 2' });
          TC(yS + 14, 'water drop on oxide vs. on the HMDS-primed surface', { 'font-size': 11 });
        }
        if (s === 2) {
          TC(40, 'reflected wave absorbed in the BARC');
          TC(56, 'n ≈ 1.8, κ ≈ 0.4 → substrate reflectivity < 1 %', MONO);
          arrow(X0 + 128, 70, X0 + 152, yTop + bH - 3, { stroke: 'var(--accent2)', 'stroke-width': 1.6 });
          arrow(X0 + 152, yTop + bH - 3, X0 + 170, yTop + bH * .3, { stroke: 'var(--accent2)', 'stroke-width': 1.6, opacity: .3 });
          T(X0 + 122, 80, '193 nm', Object.assign({ fill: 'var(--accent2)', 'text-anchor': 'end' }, MONO));
          // inset: what happens without a BARC
          const ix = X0 + 4, iy = 72, iw = 78, ih = 46;
          R(ix, iy, iw, ih, 'var(--accent)', { 'fill-opacity': .35, stroke: 'var(--line2)' });
          for (let k = 0; k < 4; k++) R(ix, iy + 4 + k * 11, iw, 5, 'var(--accent2)', { 'fill-opacity': .45 });
          T(ix + iw / 2, iy + ih + 13, 'without BARC:', { 'text-anchor': 'middle', 'font-size': 11 });
          T(ix + iw / 2, iy + ih + 25, 'standing waves', { 'text-anchor': 'middle', 'font-size': 11 });
          T(ix + iw / 2, iy + ih + 37, 'every λ/2n ≈ 57 nm', { 'text-anchor': 'middle', 'font-size': 11 });
        }
        if (s === 3) {
          const cx = X0 + 30;
          R(cx - 4, 14, 8, 18, 'var(--line2)', { rx: 1 });
          if (prog < .4) XS.append(svg('circle', { cx, cy: 36 + (yR - 40) * Math.min(1, prog * 2.5), r: 3.5, fill: 'var(--accent)' }));
          T(cx + 14, 24, 'dispense ~1 mL, then spin');
          T(cx + 14, 38, fmt(rpm, 0) + ' rpm → ' + fmt(t, 0) + ' nm final', MONO);
          TC(yR - 32, 'excess flung off; film thins to ' + fmt(t * grow, 0) + ' nm', { 'font-size': 11 });
          const wob = 4 * Math.sin(prog * 12);
          arrow(X0 + W / 2 - 22, yR - 6, X0 + 44 - wob, yR - 6, { stroke: 'var(--accent)', 'stroke-width': 1.6 });
          arrow(X0 + W / 2 + 22, yR - 6, X1 - 44 + wob, yR - 6, { stroke: 'var(--accent)', 'stroke-width': 1.6 });
          if (prog > .6) { P(`M${X0},${yR} q5,-18 14,0`, { fill: 'var(--accent)', 'fill-opacity': .55, stroke: 'none' }); P(`M${X1 - 14},${yR} q9,-18 14,0`, { fill: 'var(--accent)', 'fill-opacity': .55, stroke: 'none' }); T(X0 + 2, yR - 14, 'edge bead', { 'font-size': 11, fill: 'var(--accent)' }); }
        }
        if (s === 4) {
          P(`M${X0},${yR} q5,-18 14,0`, { stroke: 'var(--accent)', 'stroke-width': 1.5, 'stroke-dasharray': '2 2' }); P(`M${X1 - 14},${yR} q9,-18 14,0`, { stroke: 'var(--accent)', 'stroke-width': 1.5, 'stroke-dasharray': '2 2' });
          nozzle(X0 + 14, yR - 24, 60, 28); nozzle(X1 - 14, yR - 24, 120, 28);
          for (let k = 0; k < 3; k++) { Ln(X0 + 14, yR - 22, X0 + 1 + k * 4, yR - 2, { stroke: 'var(--si)', 'stroke-width': 1.2 }); Ln(X1 - 14, yR - 22, X1 - 1 - k * 4, yR - 2, { stroke: 'var(--si)', 'stroke-width': 1.2 }); }
          TC(yR - 70, 'EBR nozzles: solvent on the outer 1.5–2 mm');
          TC(yR - 56, 'dashed = edge bead (µm tall) being dissolved', { 'font-size': 11 });
          T(X0 + 40, yR - 30, 'solvent', { fill: 'var(--si)', 'font-size': 11 }); T(X1 - 40, yR - 30, 'solvent', { fill: 'var(--si)', 'font-size': 11, 'text-anchor': 'end' });
        }
        if (s === 5) {
          for (let i = 0; i < 6; i++) { const x = X0 + 18 + i * 33; P(`M${x},${yR - 4} c-4,-8 4,-12 0,-20 c-4,-8 4,-12 0,-20`, { stroke: 'var(--muted)', 'stroke-width': 1.2, opacity: .8 }); }
          TC(yR - 56, 'solvent driven off: 10–30 % → 2–5 %');
          TC(yR - 70, 'film densifies; CD later moves 1–3 nm per °C of bake', { 'font-size': 11 });
        }
        if (s === 6) {
          TC(yTop - 44, 'water-repellent topcoat: keeps the immersion water');
          TC(yTop - 30, 'from pulling acid generator out of the resist');
          TC(yTop - 16, 'most modern resists are topcoat-free', { 'font-size': 11 });
        }
        if (s === 7) {
          const ym = yTop - 56;
          lines.forEach(([a, b]) => R(a, ym, b - a, 5, 'var(--ink)'));
          spaces.forEach(([a, b]) => { R(a, ym + 5, b - a, yTop - ym - 5, 'var(--accent2)', { 'fill-opacity': .16 }); Ln((a + b) / 2, ym + 5, (a + b) / 2, yTop, { stroke: 'var(--accent2)', 'stroke-width': 1.2 }); });
          T(X1 + 6, ym + 4, 'mask image', { fill: 'var(--ink)', 'font-size': 11 }); T(X1 + 6, ym + 20, '(4× reduced)', { 'font-size': 11 });
          T(X1 + 6, ym + 38, '193 nm light', { fill: 'var(--accent2)', 'font-size': 11 });
          TC(ym - 24, 'dose 20–40 mJ/cm² · ~0.1 s per 26 × 33 mm field', MONO);
          TC(ym - 10, 'chrome blocks light; clear openings expose the spaces');
        }
        if (s === 8) {
          const [a, b] = spaces[Math.min(1, n - 1)];
          arrow(a + 1, yTop - 10, a - 9, yTop - 10, { stroke: 'var(--accent2)', 'stroke-width': 1.6 }); arrow(b - 1, yTop - 10, b + 9, yTop - 10, { stroke: 'var(--accent2)', 'stroke-width': 1.6 });
          TC(yTop - 42, 'acid diffuses 5–20 nm and deprotects hundreds');
          TC(yTop - 28, 'of sites each: chemical gain 10²–10³', { 'font-size': 11 });
        }
        if (s === 9) {
          R(X0 - 4, yTop - 16, W + 8, 16, 'var(--si)', { 'fill-opacity': .28 });
          spaces.forEach(([a, b]) => { const rem = tH * (1 - prog); R(a, yTop, b - a, tH - rem, 'var(--si)', { 'fill-opacity': .28 }); });
          R(X0 + 20, yTop - 50, W - 40, 6, 'var(--line2)', { rx: 1 });
          for (let i = 0; i < 6; i++) Ln(X0 + 34 + i * 31, yTop - 44, X0 + 34 + i * 31, yTop - 18, { stroke: 'var(--si)', 'stroke-dasharray': '2 3' });
          TC(yTop - 70, 'slot nozzle lays a puddle of 0.26 N TMAH, 30–60 s');
          TC(yTop - 56, 'exposed resist 100–1,000 nm/s · unexposed < 1 nm/s', MONO);
          T(X1 + 6, yTop - 4, 'developed ' + fmt(prog * 100, 0) + ' %', Object.assign({ fill: 'var(--ink)' }, MONO));
        }
        if (s === 10) {
          spaces.forEach(([a, b]) => R(a, yTop + tH * .45, b - a, tH * .55, 'var(--si)', { 'fill-opacity': .28 }));
          const [a, b] = spaces[Math.min(1, n - 1)];
          arrow(a - 2, yTop - 8, a + 7, yTop - 8, { stroke: 'var(--bad)', 'stroke-width': 1.6 }); arrow(b + 2, yTop - 8, b - 7, yTop - 8, { stroke: 'var(--bad)', 'stroke-width': 1.6 });
          TC(yTop - 56, 'DI-water rinse (translucent), then spin dry', { 'font-size': 11 });
          TC(yTop - 42, 'drying water pulls neighbours together: ~3.6 MPa');
          TC(yTop - 26, 'aspect ratio t/CD = ' + fmt(t / CD, 1) + ' (keep ≤ 2.5 or lines fold)', MONO);
        }
        if (s === 11) {
          const la = spaces[0][1], lb = la + cdPx, pa = spaces[0][0], pb = pa + pitchPx; // one line, one pitch
          Ln(la, yTop - 4, la, yTop - 22); Ln(lb, yTop - 4, lb, yTop - 22);
          arrow(la - 14, yTop - 13, la, yTop - 13); arrow(lb + 14, yTop - 13, lb, yTop - 13);
          T((la + lb) / 2, yTop - 26, 'CD ' + fmt(CD, 0) + ' nm', Object.assign({ 'text-anchor': 'middle', fill: 'var(--ink)' }, MONO));
          Ln(pa, yTop - 36, pa, yTop - 50); Ln(pb, yTop - 36, pb, yTop - 50);
          arrow(pa, yTop - 43, pb, yTop - 43); arrow(pb, yTop - 43, pa, yTop - 43);
          T((pa + pb) / 2, yTop - 54, 'pitch ' + fmt(2 * CD, 0) + ' nm', Object.assign({ 'text-anchor': 'middle', fill: 'var(--ink)' }, MONO));
          TC(yTop - 82, 'CD-SEM measures CD; overlay checked to ≤ 2–3 nm');
          TC(yTop - 68, 'pass → etch · fail → strip in O₂ plasma and rework', { fill: 'var(--ink)' });
        }

        // ---- layer labels: text spread so it never overlaps, leader anchored at the true layer y ----
        labels.sort((a, b) => a.y - b.y);
        labels.forEach(l => { l.ly = l.y; });
        for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 13.5) labels[i].y = labels[i - 1].y + 13.5;
        const over = labels[labels.length - 1].y - 250; if (over > 0) labels.forEach(l => { l.y -= over; });
        for (let i = labels.length - 2; i >= 0; i--) if (labels[i + 1].y - labels[i].y < 13.5) labels[i].y = labels[i + 1].y - 13.5;
        labels.forEach(l => {
          Ln(X1 + 2, l.ly, LX - 3, l.y, { stroke: 'var(--line2)' });
          T(LX, l.y + 4, l.name, { fill: l.color || 'var(--muted)', 'font-size': 11.5 });
        });
      }

      // ================= animation (one-shot per step; forced = user pressed Replay) =================
      function animate(ms, forced) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if ((reduced && !forced) || !visible) { prog = 1; drawXS(); return; }
        prog = 0; let last = 0;
        const frame = ts => {
          raf = 0;
          if (last) prog += (ts - last) / ms; last = ts;
          if (prog >= 1) { prog = 1; drawXS(); return; }
          drawXS(); raf = requestAnimationFrame(frame);
        };
        raf = requestAnimationFrame(frame);
      }
      function setPlaying(on) {
        playing = on; playBtn.textContent = on ? 'Pause sequence' : 'Play sequence';
        clearTimeout(playTimer); playTimer = 0;
        if (on) schedule();
      }
      function schedule() { clearTimeout(playTimer); playTimer = setTimeout(() => { if (!playing) return; go((step + 1) % STEPS.length); if (visible) schedule(); }, 3200); }
      const io = new IntersectionObserver(es => {
        visible = es.some(e => e.isIntersecting);
        if (visible) { if (prog < 1 && !raf) animate(ANIM[step] || 1600); if (playing && !playTimer) schedule(); }
        else { clearTimeout(playTimer); playTimer = 0; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
      });
      io.observe(el);

      // ================= step change =================
      function go(i) {
        step = Math.max(0, Math.min(STEPS.length - 1, i));
        const S = STEPS[step];
        title.textContent = S.t; desc.textContent = S.d;
        const cum = STEPS.slice(0, step + 1).reduce((a, s) => a + s.secs, 0);
        whereLine.textContent = 'Where: ' + S.where + ' · typical: ' + S.time + ' · process time so far ≈ ' + fmt(cum / 60, 1) + ' min';
        counter.textContent = `Step ${step + 1} / ${STEPS.length}`;
        dots.forEach((d, k) => { d.classList.toggle('active', k === step); d.classList.toggle('done', k < step); });
        prevBtn.disabled = step === 0; nextBtn.disabled = step === STEPS.length - 1;
        replayBtn.hidden = !ANIM[step];
        drawMap();
        if (ANIM[step]) animate(ANIM[step]); else { if (raf) { cancelAnimationFrame(raf); raf = 0; } prog = 1; drawXS(); }
      }

      const legend = h('div', { class: 'w-legend' }, ...[
        ['si', 'Si wafer'], ['line2', 'SiO₂ film'], ['ok', 'HMDS / topcoat'], ['cu', 'BARC'], ['accent', 'resist'], ['accent2', 'exposed → deprotected'], ['si', 'developer / water (translucent)'],
      ].map(([c, t]) => h('span', { class: 'w-legend-item' }, h('i', { style: { background: `var(--${c})`, opacity: t.includes('translucent') ? .35 : 1 } }), t)));

      // ================= spin-coat calculator =================
      const rpmIn = h('input', { type: 'range', min: 1000, max: 5000, step: 50, value: rpm });
      const rpmOut = h('output');
      const viscSel = h('select', { style: { minWidth: 0, maxWidth: '100%' } }, ...VISC.map(v => h('option', { value: v.eta, selected: v.eta === eta || null }, v.name)));
      const spinStats = h('div', { class: 'w-readout' });
      const spinFormula = h('div', { class: 'w-formula' });
      function updateSpin() {
        rpm = +rpmIn.value; eta = +viscSel.value; rpmOut.textContent = fmt(rpm, 0) + ' rpm';
        const t = thickness(rpm, eta), dt1 = 0.005 * t, ar40 = t / CD_MIN_NM, CD = Math.max(CD_MIN_NM, t / AR_MAX);
        const stat = (v, l, c) => h('div', { class: 'w-stat' }, h('b', { style: c ? { color: c } : null }, v), h('span', null, l));
        spinStats.innerHTML = '';
        spinStats.append(
          stat(fmt(t, 0) + ' nm', 'resist thickness'),
          stat('±' + fmt(dt1, 2) + ' nm', 'per 1 % spin-speed error'),
          stat(fmt(ar40, 2), '40 nm-line aspect ratio (collapse > 2.5)', ar40 > AR_MAX ? 'var(--bad)' : 'var(--ok)'),
          stat(fmt(CD, 0) + ' nm', 'narrowest safe line at this thickness'),
          stat('$' + fmt(RESIST_ML * RESIST_USD_PER_L / 1000, 2), 'resist per wafer-layer (1 mL at $2,000/L)'));
        spinFormula.innerHTML = 't = t₀ · (η/η₀)<sup>0.5</sup> · (ω₀/ω)<sup>0.5</sup>, t₀ = 100 nm at ω₀ = 2,000 rpm, η₀ = 2 cP  →  t = ' + fmt(t, 0) + ' nm. Meyerhofer 1978: t ∝ C·η<sup>a</sup>/ω<sup>b</sup>, a ≈ 0.4–0.6, b ≈ 0.5; doubling the speed thins the film by ~30 %.';
        drawXS();
      }
      rpmIn.addEventListener('input', updateSpin); viscSel.addEventListener('change', updateSpin);
      const spinControls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Spin speed'), rpmIn, rpmOut),
        h('label', { class: 'w-ctl', style: { gridTemplateColumns: 'auto minmax(0, 1fr)' } }, h('span', null, 'Resist viscosity'), viscSel));

      // ================= throughput / takt =================
      const wphIn = h('input', { type: 'range', min: 150, max: 320, step: 5, value: wph });
      const wphOut = h('output');
      const taktStats = h('div', { class: 'w-readout' });
      const taktFormula = h('div', { class: 'w-formula' });
      const totalSecs = STEPS.reduce((a, s) => a + s.secs, 0);
      function updateTakt() {
        wph = +wphIn.value; wphOut.textContent = fmt(wph, 0) + ' wph';
        const takt = 3600 / wph, plates = Math.ceil(T_BAKE_S / takt), cups = Math.ceil(T_COAT_S / takt), perDay = wph * 24, litres = perDay * RESIST_ML / 1000;
        const stat = (v, l) => h('div', { class: 'w-stat' }, h('b', null, v), h('span', null, l));
        taktStats.innerHTML = '';
        taktStats.append(
          stat(fmt(takt, 1) + ' s', 'takt time between wafers'),
          stat(fmt(plates, 0), 'plates per bake step (90 s bake)'),
          stat(fmt(cups, 0), 'coat cups in parallel (60 s coat)'),
          stat(fmt(perDay, 0), 'wafer-passes per day'),
          stat(fmt(litres, 1) + ' L ≈ $' + fmt(litres * RESIST_USD_PER_L, 0), 'resist per day'),
          stat(fmt(totalSecs / 60, 0) + ' min', 'process time in this recipe (30–60 min real, with queues)'));
        taktFormula.innerHTML = 'takt = 3,600 s / ' + fmt(wph, 0) + ' wph = ' + fmt(takt, 1) + ' s · plates per bake step = ⌈t<sub>bake</sub> / takt⌉ = ⌈90 / ' + fmt(takt, 1) + '⌉ = ' + plates;
      }
      wphIn.addEventListener('input', updateTakt);
      const taktControls = h('div', { class: 'w-controls' }, h('label', { class: 'w-ctl' }, h('span', null, 'Scanner throughput'), wphIn, wphOut));

      // ================= assemble =================
      el.append(
        h('div', { class: 'w-steps' }, nav, title, desc, whereLine),
        h('div', { class: 'w-grid2', style: { marginTop: '8px' } },
          h('div', null, h('h5', { style: Object.assign(sh(), { margin: '4px 0 4px' }) }, 'Where the wafer is: the litho cell'), XM, mapNote),
          h('div', null, h('h5', { style: Object.assign(sh(), { margin: '4px 0 4px' }) }, 'What the wafer looks like: cross-section (vertical scale in nm)'), XS, legend, replayBtn)),
        h('h5', { style: sh() }, 'Spin-coat calculator: speed and viscosity set the thickness'),
        spinControls, spinStats, spinFormula,
        h('h5', { style: sh() }, 'Throughput: the track must keep pace with the scanner'),
        taktControls, taktStats, taktFormula,
        h('div', { class: 'w-note' }, 'An ArF immersion scanner runs ~275–300 wafers per hour (≥310 wph for the NXT:2150i), so a wafer leaves the cell every ~12 s while each one sits on a bake plate for 60–90 s: the track parallelises with 6–8 plates per bake step and several coat and develop cups. Scanner: ASML TWINSCAN NXT (Nikon NSR-S63x a distant second). Rework of a failed resist pattern costs ~1 hour; a wrong pattern that reaches etch costs the wafer.'));

      updateSpin(); updateTakt(); go(START_STEP);
      ctx.onTheme(() => { drawMap(); drawXS(); });
      return () => { if (raf) cancelAnimationFrame(raf); raf = 0; clearTimeout(playTimer); playTimer = 0; playing = false; io.disconnect(); };
    }
  });
})();
