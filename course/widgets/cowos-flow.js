/* Widget: cowos-flow — "CoWoS Assembly, Step by Step" (Module 17) */
(function () {
  'use strict';
  const STEPS = [
    { title: 'Interposer wafer fab', desc: 'A bare 300 mm wafer gets TSVs (Bosch DRIE etch, then bottom-up Cu electroplating) and 4–5 damascene RDL wiring layers on 65 nm-class tools — no transistors, just wiring.', equip: 'Lam Syndion / TEL Tactras (TSV etch) · Lam SABRE 3D (Cu fill) · stitched-field RDL litho', view: 'wafer', flags: { tsv: true, rdl: true } },
    { title: 'µbump pads', desc: 'Ti/Cu under-bump metallization is sputtered and patterned on the RDL, giving every future die site a grid of solderable pads.', equip: 'Wafer bumping at TSMC AP2, Tainan', view: 'wafer', flags: { tsv: true, rdl: true, pads: true } },
    { title: 'Chip-on-wafer (CoW)', desc: 'GPU dies and known-good HBM stacks are placed face-down onto the interposer, bumps aligned to pads to within a few µm.', equip: 'Besi/ASMPT TCB bonders (logic) · Hanmi TC bonders (HBM) · mass-reflow oven, 221–250 °C', view: 'side', flags: { tsv: true, ubump: true, dies: true, tcb: true } },
    { title: 'Underfill', desc: 'A capillary underfill wicks into the 25–35 µm gap under every die and cures, spreading CTE shear stress across the whole footprint instead of concentrating it at the corner bumps.', equip: 'Capillary underfill dispense + cure oven, ~80–100 °C', view: 'side', flags: { tsv: true, ubump: true, dies: true, underfill: true } },
    { title: 'Molding / gap fill', desc: 'Epoxy mold compound is compression-molded over the whole wafer, filling every remaining gap between dies and capping the assembly for handling.', equip: 'Towa compression molder · EMC from Sumitomo Bakelite / Resonac', view: 'side', flags: { tsv: true, ubump: true, dies: true, underfill: true, mold: true } },
    { title: 'Temporary carrier bond', desc: 'The molded front is bonded face-down to a glass carrier wafer with a release adhesive, so the interposer\'s backside can now be processed.', equip: 'EV Group / SUSS MicroTec bonder · Brewer Science / 3M release adhesive', view: 'side', flags: { tsv: true, ubump: true, dies: true, underfill: true, mold: true, carrier: true } },
    { title: 'Backside grind to reveal TSVs', desc: 'A Disco grinder thins the interposer from 775 µm to ~100 µm in coarse-then-fine passes; a stress-relief etch then recesses silicon so the TSV copper tips stand slightly proud.', equip: 'Disco DFG backgrinder · CMP / stress-relief etch', view: 'side', flags: { tsv: true, ubump: true, dies: true, underfill: true, mold: true, carrier: true, grind: true } },
    { title: 'Backside passivation + C4 bumps', desc: 'A low-temperature SiN/SiO₂ passivation is deposited and polished back to expose the Cu tips; one backside RDL layer fans them out to a C4 pad grid at ~130–180 µm pitch.', equip: 'PECVD passivation · backside RDL · C4 solder ball drop', view: 'side', flags: { tsv: true, ubump: true, dies: true, underfill: true, mold: true, carrier: true, grind: true, c4: true } },
    { title: 'Carrier debond', desc: 'The glass carrier is released — by laser through the glass, or a thermal slide — and the module is cleaned and inspected before it becomes irreplaceable.', equip: 'EV Group / SUSS MicroTec debonder', view: 'side', flags: { tsv: true, ubump: true, dies: true, underfill: true, mold: true, grind: true, c4: true } },
    { title: 'Interposer singulation', desc: 'The wafer is diced into individual CoW modules — at 3.3× reticle, about 16 per wafer. Each is now among the most valuable objects in the building.', equip: 'Disco blade or laser dicing saw', view: 'side', flags: { tsv: true, ubump: true, dies: true, underfill: true, mold: true, grind: true, c4: true, singulated: true } },
    { title: 'Wafer-on-substrate (WoS)', desc: 'The CoW module is flip-chip reflowed onto a large ABF build-up substrate through its C4 bumps, then capillary underfill is applied beneath the whole interposer.', equip: 'Mass reflow, ~245 °C peak · ABF substrate: Ibiden, Unimicron, Shinko', view: 'side', flags: { tsv: true, ubump: true, dies: true, underfill: true, mold: true, grind: true, c4: true, singulated: true, substrate: true } },
    { title: 'Stiffener, lid, balls, test', desc: 'A metal stiffener ring controls warpage, a lid is attached over TIM1, SAC305 BGA balls are reflowed onto the substrate, and the package moves to final test and burn-in (Module 18).', equip: 'Lid attach + TIM1 · ball drop/reflow · test at TSMC, KYEC, ASE', view: 'side', flags: { tsv: true, ubump: true, dies: true, underfill: true, mold: true, grind: true, c4: true, singulated: true, substrate: true, lid: true, balls: true } },
  ];

  window.registerWidget('cowos-flow', {
    title: 'CoWoS Assembly, Step by Step',
    caption: 'Step through the twelve unit processes that turn a bare interposer wafer and known-good dies into a tested CoWoS package.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      const st = { i: 2, ipY: 0.98, gpuY: 0.999, hbmY: 0.999, asmY: 0.97, n: 8 };

      // ---------- step nav ----------
      const dotsWrap = h('div', { class: 'w-step-nav', role: 'tablist' });
      const count = h('span', { class: 'count' });
      const prevBtn = h('button', { class: 'w-btn', 'aria-label': 'Previous assembly step', on: { click: () => go(st.i - 1) } }, '← Prev');
      const nextBtn = h('button', { class: 'w-btn primary', 'aria-label': 'Next assembly step', on: { click: () => go(st.i + 1) } }, 'Next →');
      const nav = h('div', { class: 'w-step-nav' }, prevBtn, nextBtn, count);
      STEPS.forEach((s, i) => dotsWrap.append(h('button', { class: 'w-step-dot', 'data-step': i, 'aria-label': s.title, on: { click: () => go(i) } })));

      const stepTitle = h('div', { class: 'w-step-title' });
      const stepDesc = h('div', { class: 'w-step-desc' });
      const stepEquip = h('div', { class: 'w-note' });
      const xsec = svg('svg', { class: 'w-svg', role: 'img', 'aria-label': 'CoWoS assembly cross-section' });

      // ---------- yield stack ----------
      const mkSlider = (min, max, step, val) => h('input', { type: 'range', min, max, step, value: val });
      const inIp = mkSlider(80, 100, 0.5, st.ipY * 100), outIp = h('output');
      const inGpu = mkSlider(90, 100, 0.01, st.gpuY * 100), outGpu = h('output');
      const inHbm = mkSlider(90, 100, 0.1, st.hbmY * 100), outHbm = h('output');
      const inAsm = mkSlider(80, 100, 0.5, st.asmY * 100), outAsm = h('output');
      const inN = mkSlider(4, 12, 1, st.n), outN = h('output');
      const yieldCtl = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Interposer yield'), inIp, outIp),
        h('label', { class: 'w-ctl' }, h('span', null, 'GPU die sound after screen'), inGpu, outGpu),
        h('label', { class: 'w-ctl' }, h('span', null, 'HBM sound after screen'), inHbm, outHbm),
        h('label', { class: 'w-ctl' }, h('span', null, 'Assembly yield'), inAsm, outAsm),
        h('label', { class: 'w-ctl' }, h('span', null, 'HBM stacks (N)'), inN, outN));
      const rProb = h('b'), rRisk = h('b');
      const yieldReadout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rProb, h('span', null, 'P(package good)')),
        h('div', { class: 'w-stat' }, rRisk, h('span', null, '$ at risk if it fails late')));
      const yieldFormula = h('div', { class: 'w-formula', html: 'P(good) = Y<sub>interposer</sub> × Y<sub>GPU·KGD</sub><sup>2</sup> × Y<sub>HBM·KGD</sub><sup>N</sup> × Y<sub>assembly</sub> &nbsp;·&nbsp; $ at risk = 2·$<sub>GPU die</sub> + N·$<sub>HBM</sub> + $<sub>interposer</sub>' });
      const GPU_PRICE = 450, HBM_PRICE = 400, IP_PRICE = 1000;

      function updateYield() {
        st.ipY = +inIp.value / 100; st.gpuY = +inGpu.value / 100; st.hbmY = +inHbm.value / 100; st.asmY = +inAsm.value / 100; st.n = +inN.value;
        outIp.textContent = fmt(+inIp.value, 1) + '%'; outGpu.textContent = fmt(+inGpu.value, 2) + '%'; outHbm.textContent = fmt(+inHbm.value, 1) + '%'; outAsm.textContent = fmt(+inAsm.value, 1) + '%'; outN.textContent = st.n;
        const p = st.ipY * st.gpuY ** 2 * Math.pow(st.hbmY, st.n) * st.asmY;
        rProb.textContent = fmt(p * 100, 1) + '%';
        const risk = 2 * GPU_PRICE + st.n * HBM_PRICE + IP_PRICE;
        rRisk.textContent = '$' + fmt(risk, 0) + (p >= 1 ? ' (model: no failures)' : ' (1 in ' + fmt(1 / (1 - p), 0) + ' fails)');
      }
      [inIp, inGpu, inHbm, inAsm, inN].forEach(i => i.addEventListener('input', updateYield));

      // ---------- drawing ----------
      function waferView(flags) {
        const g = svg('svg', { class: 'w-svg', viewBox: '0 0 320 188', role: 'img', 'aria-label': 'Interposer wafer' });
        const cx = 90, cy = 88, r = 72;
        g.append(svg('circle', { cx, cy, r, fill: 'var(--panel2)', stroke: 'var(--line2)' }));
        const n = 7, cell = (2 * r) / n;
        let hi = null;
        for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
          const x = cx - r + col * cell, y = cy - r + row * cell;
          const dx = x + cell / 2 - cx, dy = y + cell / 2 - cy;
          if (dx * dx + dy * dy > (r - cell * 0.4) * (r - cell * 0.4)) continue;
          const isHi = row === 3 && col === 3;
          const rect = svg('rect', { x: x + 1, y: y + 1, width: cell - 2, height: cell - 2, fill: isHi ? 'var(--accent)' : 'var(--si)', 'fill-opacity': isHi ? 0.9 : 0.35, stroke: 'var(--panel)', 'stroke-width': 0.6 });
          g.append(rect);
          if (isHi) hi = { x: x + cell / 2, y: y + cell / 2 };
        }
        g.append(svg('line', { x1: hi.x + cell / 2, y1: hi.y, x2: 195, y2: cy, stroke: 'var(--muted)', 'stroke-dasharray': '3 3' }));
        // enlarged inset
        const ix = 200, iy = 30, iw = 110, ih = 120;
        g.append(svg('rect', { x: ix, y: iy, width: iw, height: ih, fill: 'var(--panel)', stroke: 'var(--line2)', rx: 4 }));
        const siH = 60;
        g.append(svg('rect', { x: ix + 15, y: iy + ih - siH - 15, width: iw - 30, height: siH, fill: 'var(--si)', stroke: 'var(--panel)', 'stroke-width': 0.6 }));
        if (flags.tsv) for (let k = 1; k <= 3; k++) {
          const tx = ix + 15 + (k * (iw - 30)) / 4;
          g.append(svg('line', { x1: tx, y1: iy + ih - siH - 10, x2: tx, y2: iy + ih - 20, stroke: 'var(--cu)', 'stroke-width': 2.4 }));
        }
        if (flags.rdl) g.append(svg('rect', { x: ix + 15, y: iy + ih - siH - 25, width: iw - 30, height: 10, fill: 'var(--accent2)', opacity: 0.8 }));
        if (flags.pads) for (let k = 0; k < 5; k++) {
          const px = ix + 22 + k * ((iw - 44) / 4);
          g.append(svg('circle', { cx: px, cy: iy + ih - siH - 25, r: 3, fill: 'var(--warn)' }));
        }
        g.append(svg('text', { x: ix + iw / 2, y: iy + ih + 14, 'text-anchor': 'middle', 'font-size': 11, 'font-family': 'var(--sans)', fill: 'var(--muted)' }, 'one site, enlarged'));
        g.append(svg('text', { x: cx, y: cy + r + 16, 'text-anchor': 'middle', 'font-size': 11, 'font-family': 'var(--sans)', fill: 'var(--muted)' }, '300 mm interposer wafer'));
        g.append(svg('text', { x: 255, y: 51, 'text-anchor': 'middle', 'font-size': 11.5, 'font-family': 'var(--sans)', fill: 'var(--ink)' }, 'Wiring layers'),
          svg('text', { x: 255, y: 104, 'text-anchor': 'middle', 'font-size': 11.5, 'font-family': 'var(--sans)', fill: 'var(--panel)' }, 'Si + copper vias'));
        return g;
      }

      function sideView(flags) {
        const W = 320;
        const rows = []; // bottom→top
        rows.push({ key: 'ip', h: flags.grind ? 18 : 26 });
        rows.push({ key: 'ubump', h: flags.ubump ? 6 : 0 });
        rows.push({ key: 'die', h: flags.dies ? 32 : 0 });
        rows.push({ key: 'mold', h: flags.mold ? 14 : 0 });
        rows.push({ key: 'top', h: (flags.carrier || flags.lid) ? 20 : 0 });
        rows.push({ key: 'sub', h: flags.substrate ? 22 : 0 });
        rows.push({ key: 'balls', h: flags.balls ? 12 : 0 });
        const order = ['balls', 'sub', 'ip', 'ubump', 'die', 'mold', 'top'];
        const TOPM = 24, BOTM = 16;
        const H = order.reduce((a, k) => a + rows.find(r => r.key === k).h, 0) + TOPM + BOTM;
        const g = svg('svg', { class: 'w-svg', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'CoW module cross-section' });
        const cx = W / 2;
        let cy = H - BOTM;
        // Every label is drawn INSIDE its own block (never in the gap above/below, which a
        // later-drawn neighbouring block would paint over) so nothing ever gets covered.
        const R = (x, y, w, hh, fill, op) => { const r = svg('rect', { x, y, width: w, height: Math.max(1, hh - 1), fill, 'fill-opacity': op == null ? 0.9 : op, stroke: 'var(--panel)', 'stroke-width': 0.6 }); g.append(r); return r; };
        const T = (x, y, s, opt) => g.append(svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 13, fill: 'var(--muted)' }, opt || {}), s));
        const mid = (y, hh) => y + hh / 2 + 3.5;
        order.forEach(key => {
          const row = rows.find(r => r.key === key); if (!row.h) return;
          cy -= row.h;
          if (key === 'balls') { R(cx - 100, cy, 200, row.h, 'var(--cu)'); T(cx, mid(cy, row.h), 'BGA balls', { 'text-anchor': 'middle', fill: 'var(--panel)', 'font-weight': 600 }); }
          else if (key === 'sub') { R(cx - 110, cy, 220, row.h, 'var(--accent)', 0.3); T(cx, mid(cy, row.h), 'ABF substrate', { 'text-anchor': 'middle' }); }
          else if (key === 'ip') {
            const w = 170;
            R(cx - w / 2, cy, w, row.h, 'var(--si)');
            if (flags.tsv) for (let k = 1; k <= 5; k++) { const tx = cx - w / 2 + (k * w) / 6; g.append(svg('line', { x1: tx, y1: cy + row.h * 0.15, x2: tx, y2: cy + row.h * 0.85, stroke: 'var(--cu)', 'stroke-width': 1.6 })); }
            T(cx, mid(cy, row.h), flags.grind ? 'Thin Si interposer' : 'Si interposer', { 'text-anchor': 'middle', fill: 'var(--panel)', 'font-weight': 600 });
            if (flags.c4) { const c4h = 6; R(cx - w / 2 + 10, cy + row.h, w - 20, c4h, 'var(--warn)'); T(cx + w / 2 + 10, cy + row.h + c4h / 2 + 3, 'C4 bumps', { 'text-anchor': 'start' }); }
          }
          else if (key === 'ubump') { R(cx - 95, cy, 190, row.h, 'var(--warn)', 0.85); }
          else if (key === 'die') {
            const gpuW = 66, hbmW = 14, gap = 4, n = 4;
            const totalW = gpuW + n * (hbmW + gap);
            let x = cx - totalW / 2;
            R(x, cy, gpuW, row.h, 'var(--accent2)');
            T(x + gpuW / 2, mid(cy, row.h), 'GPU', { 'text-anchor': 'middle', fill: 'var(--panel)', 'font-weight': 600 });
            x += gpuW + gap;
            for (let k = 0; k < n; k++) { R(x, cy - 4, hbmW, row.h + 4, 'var(--si)'); x += hbmW + gap; }
            if (!flags.mold && !flags.carrier && !flags.lid) T(cx + 35, cy - 9, 'HBM stacks', { 'text-anchor': 'middle', fill: 'var(--ink)' });
            if (flags.underfill) R(cx - totalW / 2 - 4, cy + row.h - 5, totalW + 8, 5, 'var(--ok)', 0.6);
          }
          else if (key === 'mold') { R(cx - 105, cy - 8, 210, row.h + 8, 'var(--panel2)', 0.92); T(cx, mid(cy, row.h) + 2, 'Mold compound', { 'text-anchor': 'middle' }); }
          else if (key === 'top') {
            if (flags.carrier) { R(cx - 105, cy, 210, row.h, 'var(--line2)'); T(cx, mid(cy, row.h), 'Glass carrier', { 'text-anchor': 'middle' }); }
            else if (flags.lid) { R(cx - 115, cy, 230, row.h, 'var(--muted)', 0.55); T(cx, mid(cy, row.h), 'Stiffener + lid', { 'text-anchor': 'middle', fill: 'var(--panel)' }); }
          }
        });
        if (flags.singulated) g.append(svg('rect', { x: 4, y: 4, width: W - 8, height: H - 8, fill: 'none', stroke: 'var(--bad)', 'stroke-dasharray': '5 4', 'stroke-width': 1.4 }));
        return g;
      }

      let xsecHolder = xsec;
      function go(i) { st.i = Math.max(0, Math.min(STEPS.length - 1, i)); renderWrap(); }
      function renderWrap() {
        const s = STEPS[st.i];
        count.textContent = `Step ${st.i + 1} / ${STEPS.length}`;
        stepTitle.textContent = s.title;
        stepDesc.textContent = s.desc;
        stepEquip.textContent = 'Tools & materials: ' + s.equip;
        dotsWrap.querySelectorAll('button').forEach((b, i) => { b.classList.toggle('active', i === st.i); b.classList.toggle('done', i < st.i); });
        prevBtn.disabled = st.i === 0; nextBtn.disabled = st.i === STEPS.length - 1;
        const fresh = s.view === 'wafer' ? waferView(s.flags) : sideView(s.flags);
        xsecHolder.replaceWith(fresh);
        xsecHolder = fresh;
      }

      const legend = h('div', { class: 'w-legend' },
        ...[['var(--accent2)', 'GPU die'], ['var(--si)', 'HBM stack / Si interposer'], ['var(--cu)', 'TSV / BGA balls'], ['var(--warn)', 'µbumps / C4'], ['var(--ok)', 'underfill'], ['var(--panel2)', 'mold compound'], ['var(--line2)', 'temp. carrier'], ['var(--muted)', 'lid'], ['var(--accent)', 'ABF substrate']].map(([c, t]) => h('span', { class: 'w-legend-item' }, h('i', { style: { background: c } }), t)));
      const drawing = h('div', { class: 'w-studio', style: { maxWidth: '640px', margin: '0 auto' } }, xsecHolder);
      el.append(h('div', { class: 'w-steps' }, h('div', { class: 'w-figure-title' }, stepTitle), drawing,
        h('div', { class: 'w-insight', 'aria-live': 'polite' }, stepDesc), h('div', { class: 'w-console' }, nav, dotsWrap)),
        yieldReadout,
        h('div', { class: 'w-note' }, 'Illustrative assembly and independent-yield model. The 2025 Blackwell-class example uses estimated costs, not a disclosed bill of materials. Once dies are placed and molded, a late failure can scrap the whole assembly.'),
        h('details', { class: 'w-reference' }, h('summary', null, 'Experiment with package yield'), yieldCtl, yieldFormula,
          h('div', { class: 'w-note' }, 'Two GPU dies at ~$450 each, 24 GB HBM3E stacks at ~$400 each, interposer and assembly ~$1,000. The default eight-stack example has ~$5,100 at risk. Soundness after screening means residual known-good-die quality, not raw wafer yield.')),
        h('details', { class: 'w-reference' }, h('summary', null, 'Process tools & material key'), stepEquip, legend));
      renderWrap();
      updateYield();
    }
  });
})();
