// Labs: mini-games built on the course's formulas. Each lab writes a result into S.labs.<id>
// that the factory then uses (wafers per ingot, yield, opex, stack yield, field failure rate).
window.SG = window.SG || {};
SG.LABS = {};

// ---------- Crystal Puller (Module 02) ----------
SG.LABS.cz = {
  title: 'Crystal Puller',
  open(host, ctx) {
    const { el, S, fmtN, log, toast, save } = ctx;
    const W = 720, H = 260;
    const canvas = el('canvas', { width: W, height: H, class: 'lab-canvas' });
    const vSlider = el('input', { type: 'range', min: 0.2, max: 1.6, step: 0.01, value: 0.8 });
    const pSlider = el('input', { type: 'range', min: -5, max: 5, step: 0.1, value: 0 });
    const vOut = el('b', null, '0.80'); const pOut = el('b', null, '+0.0');
    const readout = el('div', { class: 'readout' });
    const startBtn = el('button', { class: 'btn primary' }, 'Dip the seed and start the body');
    const best = S.labs.cz ? `Best so far: score ${Math.round(S.labs.cz.score * 100)} → ${S.labs.cz.wpi} wafers per ingot.` : 'No run yet: your wafering plant gets 1,300 wafers per ingot by default.';
    host.append(
      el('div', { class: 'tag' }, 'LAB · Module 02 · Czochralski growth'),
      el('h2', null, el('span', { class: 'h-ic', html: '<svg class="ic"><use href="#i-chip"/></svg>' }), 'Crystal Puller'),
      el('p', null, 'Grow the 300 mm body. Keep the diameter at 305 ± 3 mm while the melt drifts (the crucible level drops and the hot zone changes as the charge is consumed). Two actuators, as in a real puller: ', el('b', null, 'pull rate'), ' acts immediately, ', el('b', null, 'heater power'), ' acts with a lag. Hotter melt or faster pull both make the crystal thinner. Stay inside the pull-rate window (0.5–1.0 mm/min, the 300 mm range, standing in for v/G) or the crystal goes vacancy-rich (COPs) or interstitial-rich (dislocation loops).'),
      canvas,
      el('div', { class: 'controls' },
        el('label', null, 'Pull rate v (mm/min): ', vOut, vSlider),
        el('label', null, 'Heater power trim (%): ', pOut, pSlider)),
      readout, el('p', { class: 'small muted' }, best), startBtn
    );
    const cx = canvas.getContext('2d');
    let running = false, t = 0, s = 0, Pact = 0, D = 305, len = 0, samples = [], profile = [], raf = null, lastT = 0;
    const DUR = 45;
    vSlider.oninput = () => vOut.textContent = Number(vSlider.value).toFixed(2);
    pSlider.oninput = () => pOut.textContent = (Number(pSlider.value) >= 0 ? '+' : '') + Number(pSlider.value).toFixed(1);
    function draw() {
      cx.clearRect(0, 0, W, H);
      cx.fillStyle = '#0d1117'; cx.fillRect(0, 0, W, H);
      // ingot silhouette: x = length, half-height = diameter
      const scale = 0.55, mid = 130, x0 = 40, pxPerMm = 0.9;
      cx.strokeStyle = '#2f6f4f'; cx.setLineDash([4, 4]);
      for (const d of [302, 308]) { cx.beginPath(); cx.moveTo(x0, mid - d * scale / 2); cx.lineTo(W - 10, mid - d * scale / 2); cx.moveTo(x0, mid + d * scale / 2); cx.lineTo(W - 10, mid + d * scale / 2); cx.stroke(); }
      cx.setLineDash([]);
      cx.fillStyle = '#8fb5d9';
      cx.beginPath(); cx.moveTo(x0, mid - 2);
      for (let i = 0; i < profile.length; i++) cx.lineTo(x0 + profile[i][0] * pxPerMm, mid - profile[i][1] * scale / 2);
      for (let i = profile.length - 1; i >= 0; i--) cx.lineTo(x0 + profile[i][0] * pxPerMm, mid + profile[i][1] * scale / 2);
      cx.closePath(); cx.fill();
      // melt
      const mx = x0 + len * pxPerMm; cx.fillStyle = '#f2a640'; cx.fillRect(mx, mid - 100, 6, 200);
      cx.fillStyle = '#e6edf3'; cx.font = '12px system-ui';
      cx.fillText('seed end', x0, 20); cx.fillText('melt →', Math.min(Math.max(mx + 10, x0 + 70), W - 60), 20);
      cx.fillText(`D = ${D.toFixed(1)} mm  ·  length ${(len).toFixed(0)} mm  ·  melt superheat ${(s + Pact * 0.4 >= 0 ? '+' : '')}${(s + Pact * 0.4).toFixed(2)}  ·  t = ${Math.min(DUR, t).toFixed(0)}/${DUR} s`, x0, H - 12);
      const v = Number(vSlider.value); const vOk = v >= 0.5 && v <= 1.0;
      cx.fillStyle = vOk ? '#62d4a0' : '#f06c5f';
      cx.fillText(vOk ? 'v/G inside window' : v > 1.0 ? 'v/G too high: vacancy-rich, COPs forming' : 'v/G too low: interstitial-rich, dislocation loops', x0, H - 28);
    }
    function physics(dt) {
      t += dt;
      const v = Number(vSlider.value), P = Number(pSlider.value);
      Pact += (P - Pact) * 0.25 * dt;
      s += (-0.06 * s + 0.20 * Math.sin(t / 5.5) + 0.12 * Math.cos(t / 2.1)) * dt + (Math.random() - 0.5) * 0.05 * Math.sqrt(dt);
      const h = s + Pact * 0.4;
      D += 5.0 * ((1 - h) - v / 0.8) * dt;
      D = Math.max(200, Math.min(400, D));
      len += v * 12 * dt; // exaggerated growth for visibility
      profile.push([len, D]);
      samples.push([Math.abs(D - 305) <= 3 ? 1 : 0, (v >= 0.5 && v <= 1.0) ? 1 : 0]);
    }
    function step(now) {
      let dt = Math.min(1.0, (now - lastT) / 1000); lastT = now;
      if (running) {
        while (dt > 0 && running) { const h = Math.min(0.02, dt); physics(h); dt -= h; if (t >= DUR) finish(); }
      }
      draw();
      if (running) raf = requestAnimationFrame(step);
    }
    function finish() {
      running = false;
      const band = samples.reduce((a, x) => a + x[0], 0) / samples.length;
      const vok = samples.reduce((a, x) => a + x[1], 0) / samples.length;
      const score = Math.round((0.7 * band + 0.3 * vok) * 100) / 100;
      const wpi = 1300 + Math.round(400 * score);
      const prevBest = S.labs.cz ? S.labs.cz.score : -1;
      if (score > prevBest) { S.labs.cz = { score, wpi }; log(`Crystal Puller: score ${Math.round(score * 100)}, wafering now yields ${wpi} wafers per ingot.`, 'lab'); }
      readout.innerHTML = `<b>Body finished.</b> In diameter band ${Math.round(band * 100)}% of the time; inside the v/G window ${Math.round(vok * 100)}%. Score ${Math.round(score * 100)}. ${score > prevBest ? `New best: ${wpi} wafers per ingot.` : `Best stays at ${S.labs.cz.wpi} wafers per ingot.`}<br><span class="muted">Out-of-band diameter is ground off (kerf and grinding waste), and out-of-window growth leaves COPs or dislocation loops that the wafer maker must reject. In a real puller, automatic diameter control does what you just did: the camera watches the meniscus ring, pull rate corrects quickly, and heater power corrects slowly.</span>`;
      startBtn.textContent = 'Grow another'; startBtn.disabled = false;
      toast('Crystal Puller', `Score ${Math.round(score * 100)} → ${S.labs.cz.wpi} wafers per ingot.`);
      if (SG.engine) SG.engine.buildChain(); save();
    }
    startBtn.onclick = () => { running = true; t = 0; s = 0; Pact = 0; D = 305; len = 0; samples = []; profile = []; readout.textContent = ''; startBtn.disabled = true; lastT = performance.now(); raf = requestAnimationFrame(step); };
    draw();
  }
};

// ---------- Design Studio (Modules 13, 19) ----------
SG.LABS.reticle = {
  title: 'Design Studio',
  open(host, ctx) {
    const { el, S, fmt$, fmtN, pct, diesPerWafer, yieldModel, currentD0, hbmGB, hbmConfig, commitDesign, closeModal } = ctx;
    const d = Object.assign({ A: 800, n: 2, h: 8, model: 'nb', name: 'Blackwell-class' }, S.design || {});
    let D0 = currentD0();
    const presets = [
      { name: 'H100-class', A: 814, n: 1, h: 5 }, { name: 'Blackwell-class', A: 800, n: 2, h: 8 }, { name: 'Mid-size', A: 400, n: 1, h: 4 }, { name: 'Compact', A: 150, n: 1, h: 4 }
    ];
    const canvas = el('canvas', { width: 300, height: 300, class: 'wafer-map' });
    const aS = el('input', { type: 'range', min: 50, max: 858, step: 1, value: d.A });
    const nS = el('input', { type: 'range', min: 1, max: 2, step: 1, value: d.n });
    const hS = el('input', { type: 'range', min: 4, max: 8, step: 1, value: d.h });
    const d0S = el('input', { type: 'range', min: 0.03, max: 0.5, step: 0.005, value: D0.toFixed(3) });
    const model = el('select', null, [['nb', 'Negative binomial (clustering α = 3; the course\'s worked example uses α = 2)'], ['murphy', 'Murphy'], ['poisson', 'Poisson (most pessimistic)']].map(([v, t]) => el('option', { value: v, selected: v === d.model ? '' : null }, t)));
    const out = el('div', { class: 'design-out' });
    const nameIn = el('input', { type: 'text', value: d.name, maxlength: 24 });
    const commit = el('button', { class: 'btn primary' });
    const presetRow = el('div', { class: 'preset-row' }, presets.map(p => el('button', { class: 'chip', onclick: () => { aS.value = p.A; nS.value = p.n; hS.value = p.h; nameIn.value = p.name; render(); } }, p.name)));
    host.append(
      el('div', { class: 'tag' }, 'LAB · Modules 13, 19 · die size, yield and the reticle limit'),
      el('h2', null, el('span', { class: 'h-ic', html: '<svg class="ic"><use href="#i-ruler"/></svg>' }), 'Design Studio'),
      el('p', null, 'Choose the die. Dies per wafer fall with area; yield falls with area × D0; price rises with silicon and memory. The reticle field is 26 × 33 mm = 858 mm², so no single die can be bigger: that is why Blackwell is two ~800 mm² dies on one package. ', el('b', null, 'Every redesign after the first costs a new mask set (' + fmt$(25e6) + ').')),
      presetRow,
      el('div', { class: 'design-grid' },
        el('div', null,
          el('label', null, 'Die area A (mm²): ', el('b', { id: 'dA' }), aS),
          el('label', null, 'Dies per package n: ', el('b', { id: 'dN' }), nS),
          el('label', null, 'HBM stacks h: ', el('b', { id: 'dH' }), hS),
          el('label', null, 'Yield model: ', model),
          el('label', null, el('span', { class: 'row' }, 'What-if D0 (/cm²): ', el('b', { id: 'dD0' }), el('button', { type: 'button', class: 'btn ghost small', style: 'margin-left:auto', onclick: e => { e.preventDefault(); d0S.value = currentD0().toFixed(3); render(); } }, 'use current D0')), d0S),
          el('label', null, 'Design name: ', nameIn)),
        el('div', null, canvas, el('div', { class: 'small muted', id: 'mapcap' }))),
      out, commit
    );
    function render() {
      const A = Number(aS.value), n = Number(nS.value), h = Number(hS.value), D0v = Number(d0S.value), m = model.value;
      host.querySelector('#dA').textContent = A; host.querySelector('#dN').textContent = n; host.querySelector('#dH').textContent = h; host.querySelector('#dD0').textContent = D0v.toFixed(3);
      const dpw = diesPerWafer(A); const Y = yieldModel(m, A / 100, D0v, 3); const good = dpw * Y;
      const waferCost = 16000; const gb = hbmGB(hbmConfig());
      const siCost = good > 0 ? n * waferCost / good : Infinity;
      const hbmCost = h * 18 * gb; const cowos = 3000; const test = 500;
      const price = 3000 + 14 * A * n + 25 * h * gb;
      const cost = siCost + hbmCost + cowos + test; const margin = price - cost;
      const pkgPerWafer = good / n;
      out.innerHTML = `<table class="kv">
        <tr><td>Candidate dies per 300 mm wafer</td><td><b>${dpw}</b> <span class="muted">= π(150)²/A − π·300/√(2A)</span></td></tr>
        <tr><td>Die yield at D0 = ${D0v.toFixed(3)}</td><td><b>${pct(Y)}</b> <span class="muted">${m === 'poisson' ? 'e^(−A·D0)' : m === 'murphy' ? '[(1−e^(−A·D0))/(A·D0)]²' : '(1 + A·D0/α)^(−α)'} with A = ${(A / 100).toFixed(2)} cm²</span></td></tr>
        <tr><td>Good dies per wafer</td><td><b>${good.toFixed(1)}</b> → ${pkgPerWafer.toFixed(1)} packages per wafer</td></tr>
        <tr><td>Silicon cost per package (at $16k/wafer)</td><td><b>${isFinite(siCost) ? fmt$(siCost) : '—'}</b> <span class="muted">${n} die${n > 1 ? 's' : ''} × $16k ÷ ${good.toFixed(1)}</span></td></tr>
        <tr><td>HBM (${h} × ${gb} GB at $18/GB) + CoWoS + test</td><td><b>${fmt$(hbmCost + cowos + test)}</b></td></tr>
        <tr><td>GPU price (silicon ${A * n} mm², ${h * gb} GB)</td><td><b>${fmt$(price)}</b></td></tr>
        <tr><td>Margin per package</td><td><b class="${margin > 0 ? 'ok' : 'warn'}">${fmt$(margin)}</b></td></tr>
        <tr><td>Margin per finished wafer</td><td><b class="${margin > 0 ? 'ok' : 'warn'}">${fmt$(margin * pkgPerWafer)}</b> <span class="muted">the number that decides what to build</span></td></tr>
      </table>`;
      // wafer map
      const cx = canvas.getContext('2d'); cx.clearRect(0, 0, 300, 300);
      cx.fillStyle = '#0d1117'; cx.fillRect(0, 0, 300, 300);
      cx.beginPath(); cx.arc(150, 150, 148, 0, Math.PI * 2); cx.fillStyle = '#1b2431'; cx.fill();
      const side = Math.sqrt(A) * (296 / 300); let drawn = 0, goodDrawn = 0;
      let seed = A * 7 + n * 13 + Math.round(D0v * 1000);
      const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      for (let y = 2; y + side <= 298; y += side) for (let x = 2; x + side <= 298; x += side) {
        const corners = [[x, y], [x + side, y], [x, y + side], [x + side, y + side]];
        if (!corners.every(([px, py]) => Math.hypot(px - 150, py - 150) <= 148)) continue;
        drawn++; const ok = rnd() < Y; if (ok) goodDrawn++;
        cx.fillStyle = ok ? '#62d4a0' : '#f06c5f'; cx.fillRect(x + 0.5, y + 0.5, side - 1, side - 1);
      }
      host.querySelector('#mapcap').textContent = `Wafer map: ${drawn} dies drawn on a grid, ${goodDrawn} good in this sample (formula says ${dpw} × ${pct(Y)} ≈ ${good.toFixed(0)}).`;
      const first = !S.design;
      commit.textContent = first ? 'Tape out this design (mask set included in the ' + fmt$(25e6) + ' you paid)' : 'Respin: tape out this design for a new ' + fmt$(25e6) + ' mask set';
      commit.disabled = !isFinite(siCost) || good < 1;
      commit.onclick = () => { if (commitDesign({ A, n, h, model: m, name: nameIn.value || 'Custom' })) closeModal(); };
    }
    [aS, nS, hS, d0S, model].forEach(i => i.addEventListener('input', render));
    render();
  }
};

// ---------- Litho Planner (Modules 07, 08) ----------
SG.LABS.litho = {
  title: 'Litho Planner',
  open(host, ctx) {
    const { el, S, fmt$, pct, log, toast, save } = ctx;
    const TOOLS = [
      { id: 'krf', name: 'KrF (248 nm, NA 0.8)', lam: 248, na: 0.8, k1: 0.30, cost: 60 },
      { id: 'arf', name: 'ArF dry (193 nm, NA 0.93)', lam: 193, na: 0.93, k1: 0.30, cost: 90 },
      { id: 'arfi', name: 'ArF immersion (193 nm, NA 1.35)', lam: 193, na: 1.35, k1: 0.28, cost: 140 },
      { id: 'euv', name: 'EUV (13.5 nm, NA 0.33)', lam: 13.5, na: 0.33, k1: 0.32, cost: 400 },
      { id: 'hna', name: 'High-NA EUV (13.5 nm, NA 0.55)', lam: 13.5, na: 0.55, k1: 0.32, cost: 700 }
    ];
    const PAT = [
      { id: 'se', name: 'Single exposure', div: 1, passes: 1, extra: 0 },
      { id: 'lele', name: 'LELE (litho-etch ×2)', div: 2, passes: 2, extra: 80 },
      { id: 'sadp', name: 'SADP (spacer, ×2)', div: 2, passes: 1, extra: 220 },
      { id: 'saqp', name: 'SAQP (spacer, ×4)', div: 4, passes: 1, extra: 480 }
    ];
    const LAYERS = [
      { name: 'Fins', pitch: 28, count: 1 }, { name: 'Gate (CPP)', pitch: 45, count: 1 }, { name: 'M0', pitch: 24, count: 1 }, { name: 'M1', pitch: 28, count: 1 },
      { name: 'M2–M4', pitch: 34, count: 3 }, { name: 'M5–M8', pitch: 64, count: 4 }, { name: 'M9–M14', pitch: 120, count: 6 }, { name: 'M15–M17 (power)', pitch: 1200, count: 3 }
    ];
    const minPitch = (t, p) => 2 * t.k1 * t.lam / t.na / p.div;
    const layerCost = (t, p) => t.cost * p.passes + p.extra;
    const optimal = LAYERS.map(L => { let best = Infinity; for (const t of TOOLS) for (const p of PAT) if (minPitch(t, p) <= L.pitch) best = Math.min(best, layerCost(t, p)); return best * L.count; });
    const optTotal = optimal.reduce((a, b) => a + b, 0);
    const choice = LAYERS.map(() => ({ t: 'arfi', p: 'se' }));
    const table = el('table', { class: 'litho' }); const summary = el('div', { class: 'readout' }); const commit = el('button', { class: 'btn primary' }, 'Lock in this recipe');
    host.append(
      el('div', { class: 'tag' }, 'LAB · Modules 07, 08 · Rayleigh criterion and multi-patterning'),
      el('h2', null, el('span', { class: 'h-ic', html: '<svg class="ic"><use href="#i-flask"/></svg>' }), 'Litho Planner'),
      el('p', null, 'Minimum printable pitch = 2 × k1 × λ / NA (Rayleigh, with practical k1 ≈ 0.28–0.32). Multi-patterning divides the pitch but multiplies the passes and adds etch and spacer steps. Assign a tool and a patterning scheme to every layer group so that each meets its target pitch at the lowest cost per wafer (costs here are relative: what matters is that an EUV pass is ~2–3× an ArF immersion pass). The optimum is ', el('b', null, fmt$(optTotal)), ' per wafer for these 20 layers; your fab opex falls by up to 25% as you approach it.'),
      table, summary, commit
    );
    function render() {
      table.innerHTML = '<tr><th>Layer</th><th>Target pitch</th><th>Tool</th><th>Patterning</th><th>Min pitch</th><th>Cost (× layers)</th></tr>';
      let total = 0, valid = true;
      LAYERS.forEach((L, i) => {
        const t = TOOLS.find(x => x.id === choice[i].t), p = PAT.find(x => x.id === choice[i].p);
        const mp = minPitch(t, p); const ok = mp <= L.pitch; if (!ok) valid = false;
        const c = layerCost(t, p) * L.count; total += c;
        const tSel = el('select', { onchange: e => { choice[i].t = e.target.value; render(); } }, TOOLS.map(x => el('option', { value: x.id, selected: x.id === t.id ? '' : null }, x.name)));
        const pSel = el('select', { onchange: e => { choice[i].p = e.target.value; render(); } }, PAT.map(x => el('option', { value: x.id, selected: x.id === p.id ? '' : null }, x.name)));
        table.append(el('tr', { class: ok ? '' : 'bad' }, el('td', null, L.name + ' ×' + L.count), el('td', null, L.pitch + ' nm'), el('td', null, tSel), el('td', null, pSel), el('td', null, mp.toFixed(1) + ' nm ' + (ok ? '✓' : '✗ too coarse')), el('td', null, fmt$(c) + (c <= optimal[i] + 0.01 ? ' ★' : ''))));
      });
      const score = valid ? Math.min(1, optTotal / total) : 0;
      summary.innerHTML = `Total litho cost per wafer: <b>${fmt$(total)}</b> vs optimum ${fmt$(optTotal)} → score ${Math.round(score * 100)}${valid ? '' : ' (some layers do not resolve)'}.<br><span class="muted">★ marks a layer at its cheapest valid option. Notice where EUV single exposure beats ArFi SAQP, where ArFi SADP still wins, and which one layer needs a second EUV pass or High-NA.</span>`;
      commit.disabled = !valid;
      commit.onclick = () => {
        const prev = S.labs.litho ? S.labs.litho.score : -1;
        if (score > prev) { S.labs.litho = { score, opexMult: 1 - 0.25 * score }; log(`Litho Planner: score ${Math.round(score * 100)}, fab opex ×${(1 - 0.25 * score).toFixed(2)}.`, 'lab'); toast('Litho recipe locked', `Fab opex now ×${(1 - 0.25 * score).toFixed(2)}.`); if (SG.engine) SG.engine.buildChain(); save(); }
        else toast('Recipe kept', 'Your earlier recipe was at least as good.');
        ctx.closeModal();
      };
    }
    render();
  }
};

// ---------- Oxide Lab (Module 06) ----------
SG.LABS.oxide = {
  title: 'Oxide Lab',
  open(host, ctx) {
    const { el, S, log, toast, save } = ctx;
    const k = 8.617e-5;
    const TARGETS = [
      { name: 'Screen oxide before implant', nm: 20 }, { name: 'Sacrificial oxide', nm: 40 }, { name: 'LOCOS-era gate oxide', nm: 25 }, { name: 'Field oxide', nm: 500 }
    ];
    const done = TARGETS.map(() => null);
    const amb = el('select', null, el('option', { value: 'dry' }, 'Dry O₂'), el('option', { value: 'wet' }, 'Wet (steam, H₂O)'));
    const T = el('input', { type: 'range', min: 800, max: 1200, step: 5, value: 1000 });
    const tm = el('input', { type: 'range', min: 0, max: 100, step: 0.5, value: 50 }); // log scale 0.5–600 min
    const canvas = el('canvas', { width: 520, height: 200, class: 'lab-canvas' });
    const out = el('div', { class: 'readout' }); const list = el('div', { class: 'targets' });
    host.append(
      el('div', { class: 'tag' }, 'LAB · Module 06 · Deal-Grove oxidation'),
      el('h2', null, el('span', { class: 'h-ic', html: '<svg class="ic"><use href="#i-flask"/></svg>' }), 'Oxide Lab'),
      el('p', null, 'Thermal oxidation follows x² + A·x = B·(t + τ). Thin oxide grows linearly (the surface reaction limits it); thick oxide grows as √t (oxygen must diffuse through the oxide already there, so doubling the thickness takes four times as long). Wet oxidation is much faster than dry and gives a slightly less dense film. Hit each target within ±5% with the least furnace time. (The rapid initial growth of very thin dry oxides, the τ term, is left out here, so the model is only trustworthy above ~20 nm.)'),
      el('div', { class: 'controls' }, el('label', null, 'Ambient: ', amb), el('label', null, 'Temperature: ', el('b', { id: 'oT' }), T), el('label', null, 'Time: ', el('b', { id: 'ot' }), tm)),
      canvas, out, list,
      el('p', { class: 'small muted' }, 'Bonus question, answered for you: the real gate dielectric at 2 nm-class nodes is not a Deal-Grove oxide. A ~0.5 nm chemical oxide plus ~1.5–2 nm of HfO₂ by ALD gives EOT = t × 3.9/k ≈ 0.8–1.0 nm while leaking far less than a real 0.9 nm SiO₂ would (Module 11).')
    );
    const minutes = () => 0.5 * Math.pow(1200, Number(tm.value) / 100);
    function consts() {
      const TK = Number(T.value) + 273.15; const kT = k * TK;
      if (amb.value === 'dry') return { B: 772 * Math.exp(-1.23 / kT), BA: 3.71e6 * Math.exp(-2.00 / kT) };
      return { B: 386 * Math.exp(-0.78 / kT), BA: 0.97e8 * Math.exp(-2.05 / kT) };
    }
    function thick(tHours) { const { B, BA } = consts(); const A = B / BA; return (A / 2) * (Math.sqrt(1 + 4 * B * tHours / (A * A)) - 1) * 1000; } // nm
    function render() {
      host.querySelector('#oT').textContent = T.value + ' °C'; host.querySelector('#ot').textContent = minutes().toFixed(1) + ' min';
      const x = thick(minutes() / 60); const { B, BA } = consts(); const A = B / BA;
      const regime = x / 1000 < A / 4 ? 'linear regime (reaction-limited)' : x / 1000 > A * 2 ? 'parabolic regime (diffusion-limited)' : 'transition between linear and parabolic';
      out.innerHTML = `Oxide thickness: <b>${x < 10 ? x.toFixed(2) : x.toFixed(1)} nm</b> · ${regime} · B = ${B.toExponential(2)} µm²/h, B/A = ${BA.toExponential(2)} µm/h, A = ${(A * 1000).toFixed(1)} nm`;
      // growth curve
      const cx = canvas.getContext('2d'); cx.fillStyle = '#0d1117'; cx.fillRect(0, 0, 520, 200);
      const tmax = minutes() * 1.5; const xmax = thick(tmax / 60) * 1.1 || 1;
      cx.strokeStyle = '#5fa8d3'; cx.lineWidth = 2; cx.beginPath();
      for (let i = 0; i <= 100; i++) { const tt = tmax * i / 100; const xx = thick(tt / 60); const px = 40 + (i / 100) * 460; const py = 180 - (xx / xmax) * 160; if (i === 0) cx.moveTo(px, py); else cx.lineTo(px, py); }
      cx.stroke();
      const px = 40 + (minutes() / tmax) * 460, py = 180 - (x / xmax) * 160; cx.fillStyle = '#f2b880'; cx.beginPath(); cx.arc(px, py, 5, 0, Math.PI * 2); cx.fill();
      cx.fillStyle = '#e6edf3'; cx.font = '11px system-ui'; cx.fillText('thickness vs time', 44, 16); cx.fillText('0', 30, 184); cx.fillText(tmax.toFixed(0) + ' min', 470, 195); cx.fillText(xmax.toFixed(0) + ' nm', 2, 24);
      list.innerHTML = '';
      TARGETS.forEach((tg, i) => {
        const hit = Math.abs(x - tg.nm) / tg.nm <= 0.05;
        const row = el('div', { class: 'target-row' + (done[i] ? ' done' : '') },
          el('span', null, `${tg.name}: ${tg.nm} nm`),
          done[i] ? el('span', { class: 'ok' }, `locked: ${done[i].amb} ${done[i].T} °C, ${done[i].min.toFixed(1)} min`) : el('button', { class: 'btn small', disabled: hit ? null : '', onclick: () => { done[i] = { amb: amb.value, T: T.value, min: minutes() }; render(); check(); } }, hit ? 'Lock in this recipe' : 'Not within ±5%'));
        list.append(row);
      });
    }
    function check() {
      const n = done.filter(Boolean).length; if (n < TARGETS.length) return;
      const totalMin = done.reduce((a, d) => a + d.min, 0);
      const eff = Math.max(0, Math.min(1, 1 - Math.max(0, totalMin - 90) / 600));
      const bonus = 0.02 * (0.5 + 0.5 * eff);
      const prev = S.labs.oxide ? S.labs.oxide.d0bonus : 0;
      if (bonus > prev) { S.labs.oxide = { d0bonus: bonus, totalMin }; log(`Oxide Lab: all targets hit in ${totalMin.toFixed(0)} furnace-minutes; D0 improves by ${bonus.toFixed(3)}/cm².`, 'lab'); toast('Oxide Lab complete', `D0 bonus −${bonus.toFixed(3)}/cm². Less furnace time is a smaller thermal budget, which is why the field oxide wants steam and the thin films want dry O₂.`); if (SG.engine) SG.engine.buildChain(); save(); }
      else toast('Oxide Lab', 'Completed, but not better than your previous run.');
      ctx.closeModal();
    }
    [amb, T, tm].forEach(i => i.addEventListener('input', render));
    render();
  }
};

// ---------- HBM Stacker (Module 15) ----------
SG.LABS.hbm = {
  title: 'HBM Stacker',
  open(host, ctx) {
    const { el, S, fmt$, pct, hbmStackYield, log, toast, save } = ctx;
    const TESTS = [
      { name: 'No KGD test', escape: 0.10, cost: 2 }, { name: 'Basic probe', escape: 0.04, cost: 5 }, { name: 'Full probe (hot/cold)', escape: 0.02, cost: 10 }, { name: 'Probe + burn-in-like stress', escape: 0.01, cost: 20 }
    ];
    const BONDS = [
      { name: 'TC-NCF', bond: 0.97, cost: 40, note: 'thermocompression with a film per layer' }, { name: 'MR-MUF', bond: 0.985, cost: 60, note: 'mass reflow then molded underfill' }, { name: 'Hybrid bonding (Cu–Cu)', bond: 0.995, cost: 150, note: 'no solder gap; what 20-high and later generations will need' }
    ];
    const cur = S.labs.hbm || { height: 8, escape: 0.04, bond: 0.97, bondName: 'TC-NCF', testName: 'Basic probe' };
    let height = cur.height, ti = Math.max(0, TESTS.findIndex(t => t.escape === cur.escape)), bi = Math.max(0, BONDS.findIndex(b => b.bond === cur.bond));
    const out = el('div', { class: 'readout' }); const commit = el('button', { class: 'btn primary' }, 'Run the line this way');
    const hRow = el('div', { class: 'preset-row' }); const tRow = el('div', { class: 'preset-row' }); const bRow = el('div', { class: 'preset-row' });
    host.append(
      el('div', { class: 'tag' }, 'LAB · Module 15 · compound yield and known-good dies'),
      el('h2', null, el('span', { class: 'h-ic', html: '<svg class="ic"><use href="#i-flask"/></svg>' }), 'HBM Stacker'),
      el('p', null, 'A stack of n DRAM dies plus a base die is only good if every one of the n + 1 dies is good and every one of the n bonds succeeds: stack yield = (1 − escape)ⁿ⁺¹ × bondⁿ. Per-die testing costs money on every die, including the ones that would have been fine; skipping it scraps whole stacks after they have consumed twelve good dies\' worth of work. Pick the height, the test rigor and the bonding method. (HBM3E caps the stack at 720 µm; HBM4 raised it to 775 µm, so a 16-high of ~30 µm dies still fits with microbumps, with little margin: in this model 16-high microbump stacks pay a handling penalty.)'),
      el('h3', null, 'Stack height'), hRow, el('h3', null, 'Known-good-die test'), tRow, el('h3', null, 'Bonding'), bRow, out, commit
    );
    function render() {
      hRow.innerHTML = ''; [8, 12, 16].forEach(h => hRow.append(el('button', { class: 'chip' + (h === height ? ' sel' : ''), onclick: () => { height = h; render(); } }, `${h}-high (${3 * h} GB)`)));
      tRow.innerHTML = ''; TESTS.forEach((t, i) => tRow.append(el('button', { class: 'chip' + (i === ti ? ' sel' : ''), onclick: () => { ti = i; render(); } }, `${t.name}: ${pct(t.escape)} escape, $${t.cost}/die`)));
      bRow.innerHTML = ''; BONDS.forEach((b, i) => bRow.append(el('button', { class: 'chip' + (i === bi ? ' sel' : ''), onclick: () => { bi = i; render(); } }, `${b.name}: ${pct(b.bond)} per bond, $${b.cost}/stack`)));
      const t = TESTS[ti], b = BONDS[bi];
      const invalid = false; const thinPenalty = (height === 16 && b.name !== 'Hybrid bonding (Cu–Cu)') ? 0.93 : 1;
      const cfg = { height, escape: t.escape, bond: b.bond }; const Y = hbmStackYield(cfg) * thinPenalty;
      const gb = 3 * height; const price = 18 * gb;
      const dieCost = 10; const stackCost = (height + 1) * (dieCost + t.cost) + b.cost;
      const costPerGood = Y > 0 ? stackCost / Y : Infinity; const margin = price - costPerGood;
      const stacksPerWafer = 30 * Y;
      out.innerHTML = `<table class="kv">
        <tr><td>Dies in the stack</td><td><b>${height + 1}</b> (${height} DRAM + base)</td></tr>
        <tr><td>Stack yield</td><td><b>${pct(Y)}</b> <span class="muted">= ${(1 - t.escape).toFixed(2)}^${height + 1} × ${b.bond}^${height} = ${pct(Math.pow(1 - t.escape, height + 1))} × ${pct(Math.pow(b.bond, height))}${thinPenalty < 1 ? ' × 0.93 (16-high on ~30 µm dies with solder: thin-die handling loss)' : ''}</span></td></tr>
        <tr><td>Cost put into each stack</td><td><b>${fmt$(stackCost)}</b> <span class="muted">${height + 1} × ($${dieCost} die + $${t.cost} test) + $${b.cost} bonding</span></td></tr>
        <tr><td>Cost per good stack</td><td><b>${fmt$(costPerGood)}</b></td></tr>
        <tr><td>Price (${gb} GB at $18/GB)</td><td><b>${fmt$(price)}</b> → margin <b class="${margin > 0 ? 'ok' : 'warn'}">${fmt$(margin)}</b> per good stack</td></tr>
        <tr><td>Good stacks per wafer × margin</td><td><b class="${margin > 0 ? 'ok' : 'warn'}">${fmt$(stacksPerWafer * margin)}</b> per wafer <span class="muted">(${stacksPerWafer.toFixed(1)} stacks)</span></td></tr>
        </table>`;
      commit.disabled = false;
      commit.onclick = () => {
        S.labs.hbm = { height, escape: t.escape, bond: b.bond, bondName: b.name, testName: t.name, yield: Y, stackCost };
        log(`HBM line: ${height}-high, ${t.name}, ${b.name}; stack yield ${pct(Y)}.`, 'lab'); toast('HBM line configured', `${height}-high at ${pct(Y)} stack yield, ${gb} GB per stack.`);
        if (SG.engine) SG.engine.buildChain(); save(); ctx.closeModal();
      };
    }
    render();
  }
};

// ---------- Test Strategy (Module 18) ----------
SG.LABS.test = {
  title: 'Test Strategy',
  open(host, ctx) {
    const { el, S, fmt$, pct, log, toast, save, gpuPrice } = ctx;
    const LATENT = 0.02, AF = 78, TAU = 700, FIELD = 100000;
    const ATE = [{ name: 'Basic package ATE', catch: 0.30, cost: 30 }, { name: 'Extended multi-temperature ATE', catch: 0.45, cost: 60 }];
    const BURN = [0, 4, 10, 24, 48];
    const cur = S.labs.test || {};
    let ai = cur.ai || 0, hi = cur.hi != null ? cur.hi : 0, slt = !!cur.slt;
    const price = gpuPrice() || 25000;
    const calc = (ai, hi, slt) => {
      const h = BURN[hi]; const a = ATE[ai];
      let esc = LATENT * (1 - a.catch); esc *= Math.exp(-h * AF / TAU); if (slt) esc *= 0.5;
      const over = 0.002 * h / 24; // good parts damaged by long stress
      const testCost = a.cost + (h > 0 ? 30 + 6 * h : 0) + (slt ? 120 : 0);
      const total = testCost + over * price + esc * FIELD;
      return { esc, over, testCost, total, h };
    };
    let optimal = Infinity; for (let a = 0; a < ATE.length; a++) for (let b = 0; b < BURN.length; b++) for (const s of [false, true]) optimal = Math.min(optimal, calc(a, b, s).total);
    const aRow = el('div', { class: 'preset-row' }), bRow = el('div', { class: 'preset-row' }), sRow = el('div', { class: 'preset-row' });
    const out = el('div', { class: 'readout' }); const commit = el('button', { class: 'btn primary' }, 'Adopt this test flow');
    host.append(
      el('div', { class: 'tag' }, 'LAB · Module 18 · burn-in, Arrhenius and the rule of ten'),
      el('h2', null, el('span', { class: 'h-ic', html: '<svg class="ic"><use href="#i-flask"/></svg>' }), 'Test Strategy'),
      el('p', null, `Illustrative model: about ${pct(LATENT)} of packaged GPUs carry a latent defect that ATE cannot see (the course puts SLT fallout at ~0.5–2% of parts that passed ATE). Burn-in at 125 °C ages a part ≈78× faster than 55 °C service (Ea = 0.7 eV), so 10 h ≈ 780 field hours; the fraction of infant-mortality failures forced out is modelled as 1 − e^(−h·78/700), where the 700 h time constant is a modelling choice. Every hour also costs money and slightly overstresses good parts. An escape that fails in the field is charged ${fmt$(FIELD)} here: the course's rule-of-ten $10,000 replacement plus an interrupted training job. Find the cheapest flow per unit.`),
      el('h3', null, 'Package ATE'), aRow, el('h3', null, 'Burn-in hours'), bRow, el('h3', null, 'System-level test'), sRow, out, commit
    );
    function render() {
      aRow.innerHTML = ''; ATE.forEach((a, i) => aRow.append(el('button', { class: 'chip' + (i === ai ? ' sel' : ''), onclick: () => { ai = i; render(); } }, `${a.name}: catches ${pct(a.catch)}, $${a.cost}`)));
      bRow.innerHTML = ''; BURN.forEach((h, i) => bRow.append(el('button', { class: 'chip' + (i === hi ? ' sel' : ''), onclick: () => { hi = i; render(); } }, h === 0 ? 'None' : `${h} h (≈ ${Math.round(h * AF / 24)} field days)`)));
      sRow.innerHTML = ''; [false, true].forEach(v => sRow.append(el('button', { class: 'chip' + (v === slt ? ' sel' : ''), onclick: () => { slt = v; render(); } }, v ? 'SLT on real workloads: halves remaining escapes, $120' : 'No SLT')));
      const r = calc(ai, hi, slt); const score = Math.min(1, optimal / r.total);
      out.innerHTML = `<table class="kv">
        <tr><td>Escapes reaching the field</td><td><b>${(r.esc * 100).toFixed(3)}%</b> <span class="muted">${pct(LATENT)} × (1 − ${ATE[ai].catch}) × e^(−${r.h}·78/700)${slt ? ' × 0.5' : ''}</span></td></tr>
        <tr><td>Test cost per unit</td><td><b>${fmt$(r.testCost)}</b></td></tr>
        <tr><td>Good parts damaged by overstress</td><td><b>${(r.over * 100).toFixed(2)}%</b> → ${fmt$(r.over * price)} per unit</td></tr>
        <tr><td>Expected field cost per unit</td><td><b>${fmt$(r.esc * FIELD)}</b></td></tr>
        <tr><td>Total cost of quality per unit</td><td><b>${fmt$(r.total)}</b> vs optimum ${fmt$(optimal)} → score ${Math.round(score * 100)}</td></tr>
        </table>`;
      commit.onclick = () => {
        S.labs.test = { ai, hi, slt, fieldFail: r.esc, costPerUnit: r.testCost + r.over * price, score };
        log(`Test flow: ${ATE[ai].name}, ${r.h} h burn-in${slt ? ', SLT' : ''}; field failure rate ${(r.esc * 100).toFixed(3)}%.`, 'lab'); toast('Test flow adopted', `Field failure rate ${(r.esc * 100).toFixed(3)}%, ${fmt$(r.testCost)} test cost per GPU.`);
        if (SG.engine) SG.engine.buildChain(); save(); ctx.closeModal();
      };
    }
    render();
  }
};
