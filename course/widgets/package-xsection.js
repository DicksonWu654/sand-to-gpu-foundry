/* Widget: package-xsection — "Package Cross-Section Explorer" (Modules 16–17) */
(function () {
  'use strict';
  // Layer catalog: material/thickness/pitch/maker facts (Module 16 unless noted). Colors reuse the shared token set.
  const LIB = {
    pcb: { label: 'PCB (system board)', material: 'FR-4 glass-fibre/epoxy multilayer', thickness: '~1.6 mm', pitch: '—', maker: 'System board house (Foxconn, Quanta…)', color: 'var(--line2)', h: 22, wf: 1.00 },
    balls: { label: 'BGA solder balls', material: 'SAC305 (or SAC105 low-Ag for drop shock)', thickness: '~0.5–0.6 mm ball height', pitch: '~1.0 mm (0.4–0.5 mm mobile)', maker: 'Ball attach at the OSAT (ASE, Amkor)', color: 'var(--cu)', h: 13, wf: 0.86 },
    resist: { label: 'Solder resist', material: 'Photo-imageable epoxy', thickness: '~15–25 µm', pitch: '—', maker: 'Taiyo Ink', color: 'var(--line)', h: 5, wf: 0.86 },
    buildup: { label: 'Build-up substrate', material: 'Ajinomoto ABF film + Cu (SAP) over a BT/glass-epoxy core', thickness: 'core 0.4–1.2 mm + 6–12 ABF layers × 25–40 µm', pitch: 'L/S ~8–10 µm HVM, 5 µm leading', maker: 'Ibiden, Unimicron, Shinko · ABF: Ajinomoto', color: 'var(--accent)', op: 0.25, h: 42, wf: 0.86 },
    c4: { label: 'C4 / flip-chip bumps', material: 'SnAg solder on a Cu pillar', thickness: '~100 µm tall', pitch: '~130–180 µm (C4); ~100–130 µm Cu-pillar', maker: 'Wafer bumping: TSMC AP2, or OSAT', color: 'var(--warn)', h: 9, wf: 0.62 },
    interposer: { label: 'Silicon interposer', material: 'Passive Si, 65 nm-class Cu damascene RDL + TSVs', thickness: '~100 µm (thinned from 775 µm)', pitch: 'RDL 0.4–2 µm L/S; TSV ⌀ ~10 µm', maker: 'TSMC (CoWoS-S)', color: 'var(--si)', h: 20, wf: 0.70 },
    rdlL: { label: 'Organic RDL interposer (CoWoS-L)', material: 'Polyimide + electroplated Cu, embedded LSI bridges', thickness: 'built on a carrier; TIVs ~100 µm+ tall', pitch: '~2 µm L/S field, ~0.4 µm at bridges', maker: 'TSMC (InFO-derived process)', color: 'var(--cu)', op: 0.3, h: 20, wf: 0.70 },
    rdlF: { label: 'Fan-out RDL (InFO)', material: 'Polyimide + electroplated Cu over molded die', thickness: 'no substrate, no TSVs', pitch: '~2 µm L/S (finer than any substrate)', maker: 'TSMC AP3, Longtan', color: 'var(--cu)', op: 0.3, h: 18, wf: 0.55 },
    ubump: { label: 'Cu-pillar microbumps', material: 'Cu pillar + thin SnAg cap', thickness: '~30–50 µm tall', pitch: '~40–55 µm (HBM: ~25–36 µm)', maker: 'Die bumping (wafer sort output)', color: 'var(--warn)', h: 7, wf: 0.66 },
    tim: { label: 'TIM1', material: 'Indium solder foil, or a filled polymer gel', thickness: '~50–150 µm bond line', pitch: '—', maker: 'Assembled at OSAT/foundry', color: 'var(--bad)', op: 0.35, h: 7, wf: 0.5 },
    lid: { label: 'Lid / integrated heat spreader', material: 'Nickel-plated copper', thickness: '~1–2 mm', pitch: '—', maker: 'OSAT (lid attach)', color: 'var(--muted)', op: 0.5, h: 18, wf: 0.92 },
    leadframe: { label: 'Leadframe', material: 'Cu alloy (C194 Cu-Fe-P)', thickness: '~125–250 µm, Ag- or NiPdAu-plated', pitch: 'leads at 0.4–0.8 mm', maker: 'Mitsui High-tec, Shinko, Chang Wah', color: 'var(--cu)', h: 12, wf: 0.9 },
    wirebond: { label: 'Bond wires', material: 'Cu or Pd-coated-Cu wire (was Au)', thickness: 'loop height ~80–150 µm', pitch: '15–25 µm wire dia.; 15–25 wires/s', maker: 'K&S, ASMPT wire bonders', color: 'var(--muted)', h: 16, wf: 0.5 },
    mold: { label: 'Epoxy mold compound', material: '70–90 wt% silica-filled epoxy (EMC)', thickness: 'caps ~0.2–0.5 mm above the die', pitch: '—', maker: 'Sumitomo Bakelite, Resonac', color: 'var(--panel2)', h: 10, wf: 0.98 },
  };
  const DIE = {
    logic: { color: 'var(--accent2)', h: 26, material: 'Si logic die (flip-chip)', thickness: '~0.3–0.7 mm (thinned)', pitch: '—', maker: 'Foundry (TSMC/Samsung/Intel)' },
    gpu: { color: 'var(--accent2)', h: 30, material: 'Si logic die, reticle-class', thickness: '~0.3–0.7 mm (thinned)', pitch: '—', maker: 'TSMC N4/N3' },
    hbm: { color: 'var(--si)', h: 36, material: 'Stacked DRAM + base die, molded', thickness: '~0.72–0.775 mm tall (JEDEC)', pitch: 'µbumps ~55 µm to interposer', maker: 'SK hynix / Samsung / Micron' },
    soic: { color: 'var(--accent2)', h: 32, material: 'Hybrid-bonded logic chiplets, Cu-Cu, no bumps', thickness: '6–9 µm bond pitch; ~0.3–0.5 mm stacked', pitch: '6–9 µm', maker: 'TSMC SoIC' },
  };

  const PKGS = [
    { id: 'qfp', name: 'Wire-bond QFP', size: '~10–40 mm side', interposerArea: null, c4: '—', balls: '0 (gull-wing leads, 32–300)', ubumps: '0',
      stack: ['pcb', 'leadframe', { die: [{ t: 'logic', w: 60, label: 'MCU / legacy logic die' }] }, 'wirebond', 'mold'] },
    { id: 'fcbga', name: 'FCBGA', size: '~35–55 mm side (large CPU/GPU)', interposerArea: null, c4: '~2,000–5,000 bumps', balls: '~2,000–5,000', ubumps: '0',
      stack: ['pcb', 'balls', 'resist', 'buildup', 'c4', { die: [{ t: 'logic', w: 85, label: 'CPU/GPU die, flip-chip' }] }, 'tim', 'lid'] },
    { id: 'info', name: 'Fan-out (InFO)', size: '~15–20 mm side (phone AP)', interposerArea: null, c4: '—', balls: '~200–400', ubumps: '0 (TIVs instead)',
      stack: ['pcb', 'balls', 'resist', 'rdlF', { die: [{ t: 'logic', w: 55, label: 'SoC die, face-up beside TIVs' }] }, 'mold'] },
    { id: 'cowos-s', name: '2.5D CoWoS-S', size: '~55–80 mm side (H100-class)', interposerArea: '~2,100–2,800 mm² (2.5×–3.3× reticle)', c4: '~10,000–30,000 (interposer→substrate)', balls: '~4,000–6,000', ubumps: '~100,000+ (die→interposer)',
      stack: ['pcb', 'balls', 'resist', 'buildup', 'c4', 'interposer', 'ubump', { die: [{ t: 'gpu', w: 66, label: 'GPU die (reticle-size)' }, { t: 'hbm', w: 15, label: 'HBM3E stack', rep: 6 }] }, 'tim', 'lid'] },
    { id: 'cowos-l', name: '2.5D CoWoS-L', size: '~80–100+ mm side (B200-class)', interposerArea: 'RDL: whole package; LSI bridges ~0.4 µm class', c4: '~20,000–40,000', balls: '~6,000–7,000', ubumps: '~150,000+ (2 dies + 8 HBM)',
      stack: ['pcb', 'balls', 'resist', 'buildup', 'c4', 'rdlL', 'ubump', { die: [{ t: 'gpu', w: 46, label: 'GPU die', rep: 2 }, { t: 'hbm', w: 12, label: 'HBM3E/4 stack', rep: 8 }] }, 'tim', 'lid'] },
    { id: 'soic-cowos', name: '3D SoIC-on-CoWoS', size: '~55–75 mm side (MI300-class)', interposerArea: '~2,000–2,500 mm² (silicon interposer)', c4: '~15,000–25,000', balls: '~4,000–6,000', ubumps: '~100,000+; SoIC bond pads ~28,000/mm² at 6 µm',
      stack: ['pcb', 'balls', 'resist', 'buildup', 'c4', 'interposer', 'ubump', { die: [{ t: 'soic', w: 30, label: 'XCD-on-IOD hybrid-bonded stack', rep: 2, tiers: true }, { t: 'hbm', w: 15, label: 'HBM3 stack', rep: 8 }] }, 'tim', 'lid'] },
  ];

  window.registerWidget('package-xsection', {
    title: 'Package Cross-Section Explorer',
    caption: 'Pick a package family and hover or click any layer for its material, thickness, pitch and who makes it.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const st = { pkg: PKGS[3], sel: null };

      // ---------- controls ----------
      const sel = h('select', { 'aria-label': 'Package type' });
      PKGS.forEach(p => sel.append(h('option', { value: p.id }, p.name)));
      const controls = h('div', { class: 'w-controls' }, h('label', { class: 'w-ctl' }, h('span', null, 'Package type'), sel, h('output')));

      // ---------- SVG + detail panel ----------
      const xsec = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'Package cross-section' });
      const detail = h('div', { class: 'w-formula', style: { display: 'block' } }, 'Hover or click a layer below.');
      const btnRow = h('div', { class: 'w-legend', role: 'list' });

      // ---------- dimensions readout ----------
      const rSize = h('b'), rInt = h('b'), rC4 = h('b'), rBalls = h('b'), rUbump = h('b');
      const dims = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rSize, h('span', null, 'package size')),
        h('div', { class: 'w-stat' }, rInt, h('span', null, 'interposer area vs. reticle (858 mm²)')),
        h('div', { class: 'w-stat' }, rC4, h('span', null, 'C4 / flip-chip bumps')),
        h('div', { class: 'w-stat' }, rBalls, h('span', null, 'BGA balls')),
        h('div', { class: 'w-stat' }, rUbump, h('span', null, 'microbumps')));

      // ---------- CTE mini-calculator ----------
      const inD = h('input', { type: 'range', min: 5, max: 30, step: 0.5, value: 15 });
      const outD = h('output');
      const inDT = h('input', { type: 'range', min: 25, max: 250, step: 5, value: 192 });
      const outDT = h('output');
      const cteCtl = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Die half-diagonal d'), inD, outD),
        h('label', { class: 'w-ctl' }, h('span', null, 'ΔT (assembly → use)'), inDT, outDT));
      const rDelta = h('b'), rStrain = h('b');
      const cteReadout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rDelta, h('span', null, 'corner shear displacement δ')),
        h('div', { class: 'w-stat' }, rStrain, h('span', null, 'engineering strain over a 70 µm bump')));
      const cteFormula = h('div', { class: 'w-formula', html: 'δ = d · Δα · ΔT &nbsp; (Δα = α<sub>substrate</sub> − α<sub>die</sub> = 15 − 2.6 = 12.4 ppm/K) &nbsp;·&nbsp; γ = δ / h<sub>bump</sub>' });
      const cteNote = h('div', { class: 'w-note' }, 'This is why bare flip-chip on an organic substrate needs underfill (Module 16): without it, γ reaches tens of percent and solder fatigues in a handful of cycles. A silicon interposer (α = 2.6, matching the die exactly) removes this strain entirely for everything above it — the real reason CoWoS exists at large die sizes.');

      function updateCTE() {
        const d = +inD.value * 1000, dT = +inDT.value; // mm → µm
        outD.textContent = fmt(+inD.value, 1) + ' mm'; outDT.textContent = fmt(dT, 0) + ' K';
        const delta = d * 12.4e-6 * dT;
        rDelta.textContent = fmt(delta, 1) + ' µm';
        rStrain.textContent = fmt((delta / 70) * 100, 0) + ' %';
      }
      [inD, inDT].forEach(i => i.addEventListener('input', updateCTE));

      // ---------- drawing ----------
      function flatten(pkg) {
        // returns bottom-to-top array of {key, spec, dieSpec}
        const out = [];
        pkg.stack.forEach(item => {
          if (typeof item === 'string') out.push({ key: item, spec: LIB[item] });
          else item.die.forEach(d => { for (let i = 0; i < (d.rep || 1); i++) out.push({ key: 'die:' + d.label + i, spec: DIE[d.t], die: d, idx: i }); });
        });
        return out;
      }

      function draw() {
        const pkg = st.pkg;
        const layers = flatten(pkg);
        const W = 320;
        // Group into rows first: a die-row (several side-by-side entries sharing one y-band) or a single full-width layer.
        const rows = [];
        let i = 0;
        while (i < layers.length) {
          const l = layers[i];
          if (l.die) {
            const entries = [];
            let j = i;
            while (j < layers.length && layers[j].die) { entries.push(layers[j]); j++; }
            rows.push({ die: true, h: Math.max(...entries.map(e => e.spec.h)), entries });
            i = j;
          } else { rows.push({ die: false, h: l.spec.h, layer: l }); i++; }
        }
        const VBH = rows.reduce((a, r) => a + r.h, 0) + 16;
        xsec.setAttribute('viewBox', `0 0 ${W} ${VBH}`);
        xsec.innerHTML = '';
        const items = [];
        function mkRect(x, y, w, hh, color, op) {
          const r = svg('rect', { x, y, width: w, height: Math.max(2, hh - 1), fill: color, 'fill-opacity': op, stroke: 'var(--panel)', 'stroke-width': 0.6, style: { cursor: 'pointer' } });
          xsec.append(r);
          return r;
        }
        let cy = VBH - 8;
        rows.forEach(row => {
          cy -= row.h;
          if (row.die) {
            const totalW = row.entries.reduce((a, e) => a + e.die.w, 0) + (row.entries.length - 1) * 4;
            let cx = (W - totalW) / 2;
            row.entries.forEach(e => {
              const eh = e.spec.h, ey = cy + (row.h - eh);
              if (e.die.tiers) {
                const half = eh / 2;
                const r1 = mkRect(cx, ey + half, e.die.w, half, e.spec.color, 1);
                const r2 = mkRect(cx, ey, e.die.w, half, e.spec.color, 0.6);
                items.push({ id: e.key, label: e.die.label + ' (base tier)', spec: e.spec, els: [r1] });
                items.push({ id: e.key + ':top', label: e.die.label + ' (top tier)', spec: e.spec, els: [r2] });
              } else {
                const r = mkRect(cx, ey, e.die.w, eh, e.spec.color, 0.9);
                items.push({ id: e.key, label: e.die.label, spec: e.spec, els: [r] });
              }
              cx += e.die.w + 4;
            });
          } else if (['balls', 'c4', 'ubump'].includes(row.layer.key)) {
            // A joint row is an array of discrete connections, not a continuous metal film.
            const l = row.layer, w = l.spec.wf * (W - 20), x0 = (W - w) / 2;
            const els = [mkRect(x0, cy, w, l.spec.h, l.spec.color, 0.025)];
            const pitch = l.key === 'balls' ? 18 : l.key === 'c4' ? 13 : 9;
            const count = Math.floor(w / pitch), radius = Math.min(l.spec.h * .38, pitch * .3);
            for (let k = 0; k < count; k++) {
              const joint = svg('ellipse', { cx: x0 + (k + .5) * w / count, cy: cy + l.spec.h / 2, rx: radius, ry: radius, fill: l.spec.color, stroke: 'var(--panel)', 'stroke-width': .6, style: { cursor: 'pointer' } });
              xsec.append(joint); els.push(joint);
            }
            items.push({ id: l.key, label: l.spec.label, spec: l.spec, els });
          } else if (row.layer.spec === LIB.wirebond) {
            // Draw actual diagonal wire loops (die edge → leadframe finger) instead of a flat block.
            const l = row.layer, w = l.spec.wf * (W - 20), x0 = (W - w) / 2, els = [];
            const hit = mkRect(x0, cy, w, l.spec.h, l.spec.color, 0.05);
            els.push(hit);
            const dieHalf = 30, pairs = 4;
            for (let k = 0; k < pairs; k++) {
              const fromX = W / 2 - dieHalf + (k * 2 * dieHalf) / (pairs - 1);
              const toX = x0 + (k * w) / (pairs - 1);
              const wire = svg('path', { d: `M${fromX},${cy + l.spec.h} Q${(fromX + toX) / 2},${cy - 2} ${toX},${cy}`, fill: 'none', stroke: l.spec.color, 'stroke-width': 1.1, opacity: 0.9 });
              xsec.append(wire); els.push(wire);
            }
            items.push({ id: l.key, label: l.spec.label, spec: l.spec, els });
          } else {
            const l = row.layer, w = l.spec.wf * (W - 20);
            const r = mkRect((W - w) / 2, cy, w, l.spec.h, l.spec.color, l.spec.op == null ? 0.85 : l.spec.op);
            items.push({ id: l.key, label: l.spec.label, spec: l.spec, els: [r] });
          }
        });
        return items;
      }

      function select(item) {
        btnRow.querySelectorAll('button').forEach(b => b.classList.remove('primary'));
        const bi = btnRow.querySelector(`[data-id="${CSS.escape(item.id)}"]`);
        if (bi) bi.classList.add('primary');
        xsec.querySelectorAll('rect,ellipse').forEach(r => r.setAttribute('stroke-width', 0.6));
        xsec.querySelectorAll('path').forEach(p => p.setAttribute('stroke-width', 1.1));
        item.els.forEach(el => el.setAttribute('stroke-width', 2.2));
        const s = item.spec;
        detail.innerHTML = `<b>${item.label}</b> &nbsp;·&nbsp; material: ${s.material} &nbsp;·&nbsp; thickness: ${s.thickness} &nbsp;·&nbsp; pitch: ${s.pitch} &nbsp;·&nbsp; who makes it: ${s.maker}`;
      }

      function render() {
        const items = draw();
        btnRow.innerHTML = '';
        items.forEach(it => {
          const b = h('button', { class: 'w-btn', style: { fontSize: '11px', padding: '3px 8px' }, 'data-id': it.id, on: { click: () => select(it), mouseenter: () => select(it), focus: () => select(it) } }, it.label.length > 22 ? it.label.slice(0, 20) + '…' : it.label);
          it.els.forEach(el => { el.addEventListener('mouseenter', () => select(it)); el.addEventListener('click', () => select(it)); });
          btnRow.append(b);
        });
        select(items[items.length - 1] || items[0]);
        const p = st.pkg;
        rSize.textContent = p.size;
        rInt.textContent = p.interposerArea || 'n/a (no interposer)';
        rC4.textContent = p.c4; rBalls.textContent = p.balls; rUbump.textContent = p.ubumps;
      }
      sel.addEventListener('change', () => { st.pkg = PKGS.find(p => p.id === sel.value); render(); });

      el.append(controls, h('p', { class: 'w-note' }, 'Exploded layer schematic · thicknesses and spacing are not to scale. Solder and microbump joints are discrete connections.'), xsec, btnRow, detail,
        h('h5', { style: { margin: '18px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'Dimensions'),
        dims,
        h('h5', { style: { margin: '18px 0 4px', fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' } }, 'CTE mini-calculator: corner shear at a flip-chip bump'),
        cteCtl, cteReadout, cteFormula, cteNote);
      sel.value = st.pkg.id;
      render();
      updateCTE();
    }
  });
})();
