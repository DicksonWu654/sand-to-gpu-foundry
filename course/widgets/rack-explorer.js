/* Widget: rack-explorer — "From Die to Rack" (Module 19 Part C) */
(function () {
  'use strict';
  const LEVELS = [
    { title: 'Blackwell package', desc: 'Two ~800 mm² Blackwell dies, joined by NV-HBI at 10 TB/s, sit with eight HBM3E stacks on a CoWoS-L interposer roughly 100 mm across — an organic RDL interposer with embedded silicon bridges, since the whole package is over 3 reticles.',
      spec: { GPUs: '1 logical GPU (2 dies)', HBM: '192 GB (8×24 GB HBM3E); 288 GB 12-hi on B300', NVLink: 'NV-HBI 10 TB/s (intra-package only)', Power: '~1,000 W (HGX) – ~1,200 W (GB200)', Weight: '—', Cooling: 'cold plate (tray level)', Cost: '~$6–8k package COGS (est.)' } },
    { title: 'GB200 superchip (Bianca board)', desc: 'One Grace CPU (72 Arm Neoverse V2 cores, 480 GB LPDDR5X) sits between two Blackwell GPU packages, linked to each by NVLink-C2C at 900 GB/s so the GPUs can borrow Grace’s memory as a slow extra tier.',
      spec: { GPUs: '2', HBM: '384 GB (2 × 192 GB)', NVLink: 'NVLink-C2C 900 GB/s, GPU↔Grace', Power: '~2,700 W / superchip', Weight: '—', Cooling: 'liquid cold plates', Cost: '~$14k COGS (GB200 superchip est.)' } },
    { title: 'Compute tray', desc: 'Two superchip boards — 4 GPUs and 2 Grace CPUs — share one 1U liquid-cooled MGX tray, with cold plates over every package and ConnectX NICs plus a BlueField-3 DPU at the rear.',
      spec: { GPUs: '4', HBM: '768 GB', NVLink: '1.8 TB/s per GPU (NVLink 5)', Power: '~5.4–6 kW / tray (est.)', Weight: '~78 kg (est., 1.4 t ÷ 18 trays)', Cooling: 'direct liquid, quick-disconnects', Cost: 'sold as part of the rack' } },
    { title: 'GB200 NVL72 rack', desc: '18 compute trays (72 GPUs, 36 Grace CPUs) and 9 NVLink switch trays (18 switch chips) sit alongside 6–8 power shelves, all tied together by a copper NVLink spine of ~5,000 cables (~2 miles) so every GPU shares one 130 TB/s NVLink domain.',
      spec: { GPUs: '72', HBM: '~13.4 TB HBM3E (+ ~17 TB LPDDR5X)', NVLink: '1.8 TB/s/GPU; 130 TB/s aggregate', Power: '~120–132 kW (GB300 ~135–142 kW)', Weight: '~1.36 t', Cooling: 'liquid, ~25–45 °C inlet, CDU-fed', Cost: '~$3–4 M' } },
    { title: 'Row / pod', desc: 'Eight NVL72 racks plus a row-level CDU and scale-out networking form a typical pod. The module does not specify a standard row size, so treat this level as illustrative rather than a quoted figure.',
      spec: { GPUs: '576', HBM: '~107 TB', NVLink: 'none beyond the rack — scale-out is optical', Power: '~1.0–1.06 MW', Weight: '—', Cooling: 'row-level CDU', Cost: '~$28 M hardware (8 × ~$3.5 M, est.)' } },
    { title: 'Data center hall', desc: 'A hall of NVL72 racks, sized by the sliders below: hall (utility) power, power per rack, and PUE set how many racks the building actually holds.',
      spec: null },
  ];
  const SUPPLIERS = {
    die: 'Blackwell die — TSMC 4NP, ~800 mm², NV-HBI 10 TB/s to its sibling die',
    hbm: 'HBM3E stack — SK hynix (leader), Micron, Samsung',
    substrate: 'ABF build-up substrate — Ibiden, Unimicron',
    grace: 'Grace CPU — 72 Arm Neoverse V2 cores, 480 GB LPDDR5X @ ~500 GB/s',
    vrm: 'VRM power stages — MPS, Infineon, Renesas, onsemi',
    coldplate: 'Cold plate — CoolIT, Boyd, Vertiv, Delta',
    nic: 'ConnectX-7/8 NIC — NVIDIA (Mellanox)',
    odm: 'Built by Foxconn / Quanta / Wistron (ODM)',
    switchTray: 'NVLink switch tray — 2× NVLink 5 switch chips, 7.2 TB/s each',
    spine: 'NVLink spine — ~5,000 copper cables, ~2 miles — Amphenol, Luxshare, Molex',
    power: 'Power shelves — DC busbar, ~33 kW each',
    cdu: 'CDU (coolant distribution unit) — Vertiv, Motivair, CoolIT, Boyd',
    net: 'Scale-out leaf switch — Quantum-X800 / Spectrum-X',
    sub: 'Utility substation / switchgear',
    plant: 'Central cooling plant feeding rack CDUs',
  };

  window.registerWidget('rack-explorer', {
    title: 'From Die to Rack',
    caption: 'Step through six levels of packaging, from one Blackwell package to a 100 MW hall, with real specs at each stop.',
    mount(el, ctx) {
      const { h, svg, fmt } = ctx;
      let step = 0;
      const hall = { power: 100, rackPower: 130, pue: 1.2 };

      function box(x, y, w, hh, fill, r) { return svg('rect', { x, y, width: w, height: hh, fill, rx: r == null ? 4 : r }); }
      function label(x, y, s, opt) { return svg('text', Object.assign({ x, y, 'font-family': 'var(--sans)', 'font-size': 11.5, fill: 'var(--ink)', 'text-anchor': 'middle' }, opt || {}), s); }
      function hov(rect, text) {
        rect.append(svg('title', null, text));
        rect.style.cursor = 'pointer';
        rect.addEventListener('mouseenter', () => { rect.setAttribute('stroke', 'var(--accent)'); rect.setAttribute('stroke-width', '2.5'); });
        rect.addEventListener('mouseleave', () => { rect.removeAttribute('stroke'); rect.removeAttribute('stroke-width'); });
        return rect;
      }

      const stage = svg('svg', { class: 'w-svg', viewBox: '0 0 700 300', role: 'img', 'aria-label': 'Packaging level diagram' });

      function drawL0(g) {
        g.append(box(190, 35, 320, 230, 'var(--panel2)', 8));
        hov(g.lastChild, SUPPLIERS.substrate);
        g.append(label(350, 24, 'Blackwell package — CoWoS-L, ~100 mm interposer', { 'font-size': 12, 'font-weight': 600 }));
        g.append(box(210, 55, 280, 190, 'var(--ground)', 6));
        const hbmXY = [[236, 65], [296, 65], [356, 65], [416, 65], [236, 193], [296, 193], [356, 193], [416, 193]];
        hbmXY.forEach(([x, y]) => { const r = box(x, y, 48, 32, 'var(--accent2)'); hov(r, SUPPLIERS.hbm); g.append(r); g.append(label(x + 24, y + 20, 'HBM', { fill: 'var(--panel)', 'font-size': 11 })); });
        const dA = box(248, 107, 95, 76, 'var(--accent)'); hov(dA, SUPPLIERS.die); g.append(dA); g.append(label(295, 148, 'Die A', { fill: 'var(--panel)' }));
        const dB = box(357, 107, 95, 76, 'var(--accent)'); hov(dB, SUPPLIERS.die); g.append(dB); g.append(label(404, 148, 'Die B', { fill: 'var(--panel)' }));
        g.append(svg('line', { x1: 343, y1: 145, x2: 357, y2: 145, stroke: 'var(--ink)', 'stroke-width': 2 }));
        g.append(label(350, 270, 'NV-HBI links the two dies at 10 TB/s; 8 HBM3E stacks flank them', { fill: 'var(--muted)', 'font-size': 11.5 }));
      }
      function drawL1(g) {
        g.append(box(140, 60, 420, 160, 'var(--panel2)', 8));
        g.append(label(350, 46, 'GB200 superchip — Bianca board', { 'font-size': 12, 'font-weight': 600 }));
        const gpu1 = box(150, 90, 120, 100, 'var(--accent)'); hov(gpu1, SUPPLIERS.die); g.append(gpu1); g.append(label(210, 144, 'Blackwell GPU', { fill: 'var(--panel)' }));
        const grace = box(290, 90, 120, 100, 'var(--si)'); hov(grace, SUPPLIERS.grace); g.append(grace); g.append(label(350, 144, 'Grace CPU', { fill: 'var(--panel)' }));
        const gpu2 = box(430, 90, 120, 100, 'var(--accent)'); hov(gpu2, SUPPLIERS.die); g.append(gpu2); g.append(label(490, 144, 'Blackwell GPU', { fill: 'var(--panel)' }));
        [[270, 290], [410, 430]].forEach(([x1, x2]) => g.append(svg('line', { x1, y1: 140, x2: x2, y2: 140, stroke: 'var(--ink)', 'stroke-width': 2 })));
        const v1 = box(190, 198, 40, 14, 'var(--warn)'); hov(v1, SUPPLIERS.vrm); g.append(v1);
        const v2 = box(470, 198, 40, 14, 'var(--warn)'); hov(v2, SUPPLIERS.vrm); g.append(v2);
        g.append(label(350, 240, 'NVLink-C2C links each GPU to Grace at 900 GB/s', { fill: 'var(--muted)', 'font-size': 11.5 }));
      }
      function drawL2(g) {
        g.append(box(70, 60, 560, 150, 'var(--panel2)', 8));
        hov(g.lastChild, SUPPLIERS.odm);
        g.append(label(350, 46, 'Compute tray — 2 superchips = 4 GPUs + 2 Grace CPUs', { 'font-size': 12, 'font-weight': 600 }));
        const b1 = box(95, 85, 250, 90, 'var(--ground)', 6); g.append(b1);
        const b2 = box(355, 85, 250, 90, 'var(--ground)', 6); g.append(b2);
        g.append(label(220, 133, 'Superchip 1', { 'font-size': 12 }));
        g.append(label(480, 133, 'Superchip 2', { 'font-size': 12 }));
        const c1 = box(95, 85, 250, 18, 'var(--accent2)', 6); c1.setAttribute('opacity', '0.55'); hov(c1, SUPPLIERS.coldplate); g.append(c1);
        const c2 = box(355, 85, 250, 18, 'var(--accent2)', 6); c2.setAttribute('opacity', '0.55'); hov(c2, SUPPLIERS.coldplate); g.append(c2);
        [110, 190, 410, 490].forEach(x => { const n = box(x, 180, 34, 12, 'var(--si)'); hov(n, SUPPLIERS.nic); g.append(n); });
        g.append(label(350, 226, '4 ConnectX NICs + a BlueField-3 DPU sit at the rear edge', { fill: 'var(--muted)', 'font-size': 11.5 }));
      }
      function drawL3(g) {
        g.append(box(255, 10, 175, 230, 'var(--panel2)', 8));
        g.append(label(342, 258, 'GB200 NVL72 rack', { 'font-size': 12, 'font-weight': 600 }));
        const compute = box(270, 25, 100, 110, 'var(--accent)'); hov(compute, '18 compute trays — ' + SUPPLIERS.odm); g.append(compute);
        g.append(label(320, 75, '18 compute trays', { fill: 'var(--panel)', 'font-size': 11.5 }));
        g.append(label(320, 90, '72 GPUs + 36 Grace', { fill: 'var(--panel)', 'font-size': 11 }));
        const swi = box(270, 135, 100, 55, 'var(--accent2)'); hov(swi, SUPPLIERS.switchTray); g.append(swi);
        g.append(label(320, 158, '9 switch trays', { fill: 'var(--panel)', 'font-size': 11.5 }));
        g.append(label(320, 173, '18 chips, 130 TB/s', { fill: 'var(--panel)', 'font-size': 10.5 }));
        const pwr = box(270, 190, 100, 35, 'var(--warn)'); hov(pwr, SUPPLIERS.power); g.append(pwr);
        g.append(label(320, 211, '6–8 power shelves', { fill: 'var(--panel)', 'font-size': 10.5 }));
        const spine = box(390, 25, 20, 200, 'var(--cu)'); hov(spine, SUPPLIERS.spine); g.append(spine);
        g.append(label(400, 130, 'NVLink spine', { fill: 'var(--panel)', 'font-size': 11, transform: 'rotate(-90 400 130)' }));
      }
      function drawL4(g) {
        g.append(label(350, 20, 'Row / pod — 8 × NVL72 + CDU + networking', { 'font-size': 12, 'font-weight': 600, 'text-anchor': 'middle' }));
        for (let i = 0; i < 8; i++) {
          const x = 30 + i * 58;
          const r = box(x, 70, 46, 150, 'var(--panel2)', 5); hov(r, 'NVL72 rack #' + (i + 1)); g.append(r);
          g.append(svg('rect', { x: x + 6, y: 80, width: 34, height: 130, fill: 'var(--accent)', rx: 3 }));
        }
        const cdu = box(500, 70, 60, 150, 'var(--accent2)'); hov(cdu, SUPPLIERS.cdu); g.append(cdu);
        g.append(label(530, 150, 'CDU', { fill: 'var(--panel)', transform: 'rotate(-90 530 150)' }));
        const net = box(580, 110, 90, 70, 'var(--si)'); hov(net, SUPPLIERS.net); g.append(net);
        g.append(label(625, 149, 'Network', { fill: 'var(--panel)' }));
        g.append(label(350, 245, 'Illustrative row size — the module does not specify one', { fill: 'var(--muted)', 'font-size': 11.5 }));
      }
      function drawL5(g) {
        const rackKW = hall.rackPower * 1.15;
        const itKW = (hall.power * 1000) / hall.pue;
        const racks = Math.max(0, Math.floor(itKW / rackKW));
        const pods = Math.ceil(racks / 8) || 0;
        g.append(box(50, 40, 600, 190, 'var(--panel2)', 8));
        g.append(label(350, 26, fmt(hall.power, 0) + ' MW hall — ' + fmt(racks, 0) + ' racks, ' + fmt(pods, 0) + ' pods', { 'font-size': 12, 'font-weight': 600 }));
        const cols = 12, gap = 5, maxRows = 4, maxShown = cols * maxRows;
        const shown = Math.min(pods, maxShown);
        const rows = Math.max(1, Math.min(maxRows, Math.ceil(shown / cols)));
        const iw = (560 - (cols - 1) * gap) / cols, ih = 22;
        for (let i = 0; i < shown; i++) {
          const cx = i % cols, cy = Math.floor(i / cols);
          const x = 70 + cx * (iw + gap), y = 55 + cy * (ih + gap);
          const r = box(x, y, iw, ih, 'var(--accent2)', 2); hov(r, 'Pod #' + (i + 1) + ' — 8 NVL72 racks'); g.append(r);
        }
        if (pods > maxShown) g.append(label(350, 55 + maxRows * (ih + gap) + 12, '+' + fmt(pods - maxShown, 0) + ' more pods', { fill: 'var(--muted)', 'font-size': 11.5 }));
        const sub = box(70, 210, 140, 16, 'var(--warn)'); hov(sub, SUPPLIERS.sub); g.append(sub); g.append(label(140, 222, 'Substation', { fill: 'var(--panel)', 'font-size': 10.5 }));
        const plant = box(490, 210, 140, 16, 'var(--cu)'); hov(plant, SUPPLIERS.plant); g.append(plant); g.append(label(560, 222, 'Cooling plant', { fill: 'var(--panel)', 'font-size': 10.5 }));
      }
      const DRAW = [drawL0, drawL1, drawL2, drawL3, drawL4, drawL5];

      function drawStage() {
        stage.innerHTML = '';
        const g = svg('g');
        stage.append(g);
        DRAW[step](g);
        // On a narrow screen the surrounding HTML carries the long title and specification sentence.
        // Keep component labels in the drawing and size them for the available physical geometry.
        if (el.clientWidth < 460) {
          const shapes = [...g.querySelectorAll('rect')].map(r => r.getBBox());
          const left = Math.min(...shapes.map(r => r.x)), right = Math.max(...shapes.map(r => r.x + r.width));
          const top = Math.min(...shapes.map(r => r.y)), bottom = Math.max(...shapes.map(r => r.y + r.height));
          const style = getComputedStyle(el);
          const contentWidth = el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          const fontSize = Math.max(12, 12 * (right - left + 28) / Math.max(240, contentWidth));
          const short = { 'Blackwell GPU': 'GPU', 'Grace CPU': 'CPU', '18 compute trays': '18 trays', '72 GPUs + 36 Grace': '72 GPUs', '18 chips, 130 TB/s': '18 chips', '6–8 power shelves': 'Power', 'NVLink spine': 'NVLink', 'Cooling plant': 'Cooling', 'Network': 'Fabric' };
          for (const t of g.querySelectorAll('text')) {
            const y = +t.getAttribute('y');
            if (y < top || y > bottom) t.style.display = 'none';
            else { t.textContent = short[t.textContent] || t.textContent; t.setAttribute('font-size', fontSize); }
          }
        }
        // Frame the actual assembly rather than leaving a fixed 700-unit canvas around it.
        const bounds = g.getBBox();
        stage.setAttribute('viewBox', `${bounds.x - 14} ${bounds.y - 12} ${bounds.width + 28} ${bounds.height + 24}`);
      }

      // ---------- step controls ----------
      const dots = LEVELS.map((_, i) => h('button', { class: 'w-step-dot' + (i === 0 ? ' active' : ''), 'aria-label': 'Level ' + (i + 1), on: { click: () => goto(i) } }));
      const prevBtn = h('button', { class: 'w-btn', on: { click: () => goto(step - 1) } }, '← Prev');
      const nextBtn = h('button', { class: 'w-btn', on: { click: () => goto(step + 1) } }, 'Next →');
      const counter = h('span', { class: 'count' });
      const stepTitle = h('div', { class: 'w-step-title' });
      const stepDesc = h('div', { class: 'w-step-desc' });
      const specTable = h('table');

      function renderSpec() {
        specTable.innerHTML = '';
        const lvl = LEVELS[step];
        if (!lvl.spec) return;
        for (const k in lvl.spec) {
          specTable.append(h('tr', null, h('th', null, k), h('td', null, lvl.spec[k])));
        }
      }
      function goto(i) {
        step = Math.max(0, Math.min(LEVELS.length - 1, i));
        dots.forEach((d, j) => d.classList.toggle('active', j === step));
        prevBtn.disabled = step === 0; nextBtn.disabled = step === LEVELS.length - 1;
        counter.textContent = `Step ${step + 1} / ${LEVELS.length}`;
        stepTitle.textContent = LEVELS[step].title;
        stepDesc.textContent = LEVELS[step].desc;
        renderSpec();
        hallPanel.hidden = step !== LEVELS.length - 1;
        drawStage();
      }

      // ---------- whole-hall sliders (level 6, and always available) ----------
      const inPower = h('input', { type: 'range', min: 10, max: 1000, step: 10, value: hall.power });
      const inRackP = h('input', { type: 'range', min: 100, max: 250, step: 5, value: hall.rackPower });
      const inPue = h('input', { type: 'range', min: 1, max: 1.6, step: 0.05, value: hall.pue });
      const outPower = h('output'), outRackP = h('output'), outPue = h('output');
      const hallControls = h('div', { class: 'w-controls' },
        h('label', { class: 'w-ctl' }, h('span', null, 'Hall (utility) power'), inPower, outPower),
        h('label', { class: 'w-ctl' }, h('span', null, 'Power per rack'), inRackP, outRackP),
        h('label', { class: 'w-ctl' }, h('span', null, 'PUE'), inPue, outPue));
      const rRacks = h('b'), rGpus = h('b'), rHbm = h('b'), rCopper = h('b'), rUsd = h('b');
      const hallReadout = h('div', { class: 'w-readout' },
        h('div', { class: 'w-stat' }, rRacks, h('span', null, 'NVL72 racks')),
        h('div', { class: 'w-stat' }, rGpus, h('span', null, 'GPUs')),
        h('div', { class: 'w-stat' }, rHbm, h('span', null, 'HBM capacity')),
        h('div', { class: 'w-stat' }, rCopper, h('span', null, 'NVLink copper length')),
        h('div', { class: 'w-stat' }, rUsd, h('span', null, '$ hardware (racks only)')));
      const hallPanel = h('div', { hidden: true }, hallControls, hallReadout,
        h('div', { class: 'w-note' }, 'IT power = hall power ÷ PUE; racks = IT power ÷ (rack power × 1.15 overhead). Hardware total uses ~$3.5M per rack; NVLink copper uses ~2 miles per rack (Module 19).'));

      function updateHall() {
        hall.power = +inPower.value; hall.rackPower = +inRackP.value; hall.pue = +inPue.value;
        outPower.textContent = fmt(hall.power, 0) + ' MW';
        outRackP.textContent = fmt(hall.rackPower, 0) + ' kW';
        outPue.textContent = fmt(hall.pue, 2);
        const rackKW = hall.rackPower * 1.15;
        const itKW = (hall.power * 1000) / hall.pue;
        const racks = Math.max(0, Math.floor(itKW / rackKW));
        rRacks.textContent = fmt(racks, 0);
        rGpus.textContent = fmt(racks * 72, 0);
        rHbm.textContent = fmt(racks * 13.4, 1) + ' TB';
        rCopper.textContent = fmt(racks * 2, 0) + ' mi';
        rUsd.textContent = '$' + fmt(racks * 3.5 / 1000, 2) + ' B';
        if (step === LEVELS.length - 1) drawStage();
      }
      [inPower, inRackP, inPue].forEach(i => i.addEventListener('input', updateHall));

      const shortcuts = h('div', { class: 'w-stage-strip', style: { display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '10px 0' } },
        ...['Package', 'Superchip', 'Tray', 'Rack', 'Pod', 'Hall'].map((name, i) => h('button', { class: 'w-btn', on: { click: () => goto(i) } }, name)));
      el.append(h('div', { class: 'w-steps' }, stepTitle,
        h('div', { class: 'w-studio', style: { maxWidth: '700px', margin: '0 auto' } }, stage),
        h('div', { class: 'w-insight', 'aria-live': 'polite' }, stepDesc),
        h('div', { class: 'w-console' }, h('div', { class: 'w-step-nav' }, prevBtn, ...dots, nextBtn, counter), shortcuts)),
        hallPanel,
        h('div', { class: 'w-note' }, 'Schematics are not to scale. Module 19 mixes published system specifications with labeled cost and configuration estimates; the pod is an illustrative grouping.'),
        h('details', { class: 'w-reference' }, h('summary', null, 'System specifications & estimates'), h('div', { style: { overflowX: 'auto' } }, specTable)));
      updateHall();
      goto(0);
      let narrow = el.clientWidth < 460;
      const responsive = new ResizeObserver(() => { const next = el.clientWidth < 460; if (next !== narrow) { narrow = next; drawStage(); } });
      responsive.observe(el);
      return () => responsive.disconnect();
    }
  });
})();
