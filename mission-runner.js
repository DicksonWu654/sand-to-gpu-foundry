// Mission runner: briefing cards -> build it (scene parts / layer stack / component order)
// -> commission with the course's widgets and live targets -> certify with the quiz.
(function () {
  const SG = window.SG;
  const FIGS = window.SG_FIGS || {}; const SCENES = window.SG_SCENES || {};
  const WIDGET_TITLES = {};
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v; else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const k of kids.flat(Infinity)) if (k !== null && k !== undefined) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  }
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const modLink = m => el('a', { href: SG.courseLink(m), target: '_blank' }, 'Module ' + String(m).padStart(2, '0'));

  function figureNode(key, opts) {
    const f = FIGS[key]; if (!f) return el('div', { class: 'muted small' }, 'Figure ' + key + ' not bundled.');
    const wrap = el('div', { class: 'fig-host' + ((opts && opts.compact) ? ' compact' : '') }); wrap.innerHTML = f.html; return wrap;
  }
  function sceneSvg(name, marker) {
    const s = SCENES[name]; if (!s) return null;
    const defs = `<defs><marker id="${s.marker}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 6 3 0 6" class="sf-arrowhead"/></marker></defs>`;
    const svg = el('div', { class: 'scene-host' }); svg.innerHTML = `<figure class="section-figure sf-scene sf-scene-${name}"><div class="sf-drawing"><svg viewBox="0 0 700 ${s.height}" class="scene-svg">${defs}${s.art}</svg></div></figure>`; return svg;
  }

  // ---------- build puzzles ----------
  function buildScene(spec, host, onDone) {
    const s = SCENES[spec.scene]; if (!s) { onDone(); return; }
    const parts = s.key.map((label, i) => ({ i, label })); const chips = shuffle(parts.concat((spec.decoys || []).map((d, k) => ({ i: -1 - k, label: d }))));
    let selected = null; let placed = 0; let mistakes = 0;
    const msg = el('p', { class: 'hint' }, 'Pick a part from the bin, then click the numbered position where it belongs.');
    const bin = el('div', { class: 'parts-bin' }); const why = el('ol', { class: 'placed-why' });
    const svgHost = sceneSvg(spec.scene); svgHost.classList.add('puzzle');
    const callouts = [...svgHost.querySelectorAll('.sf-callout')];
    callouts.forEach((c, idx) => { c.classList.add('open'); c.style.cursor = 'pointer'; c.addEventListener('click', () => choose(idx)); });
    function renderBin() {
      bin.innerHTML = ''; for (const c of chips) if (!c.done) bin.append(el('button', { class: 'chip' + (selected === c ? ' sel' : ''), onclick: () => { selected = c; renderBin(); msg.textContent = `"${c.label}": now click its position on the drawing.`; } }, c.label));
    }
    function choose(idx) {
      if (!selected) { msg.textContent = 'Pick a part from the bin first.'; return; }
      const c = callouts[idx]; if (c.classList.contains('done')) { msg.textContent = 'That position is already filled.'; return; }
      if (selected.i === idx) {
        c.classList.remove('open'); c.classList.add('done'); selected.done = true; placed++;
        why.append(el('li', null, el('b', null, s.key[idx]), ' — ', (spec.why && spec.why[idx]) || ''));
        msg.textContent = placed < parts.length ? 'Right. Next part.' : '';
        selected = null; renderBin();
        if (placed === parts.length) { const left = chips.filter(x => !x.done); msg.innerHTML = `<b>Assembled${mistakes ? ' with ' + mistakes + ' misplacement' + (mistakes > 1 ? 's' : '') : ' with no mistakes'}.</b>${left.length ? ' Left in the bin, correctly: ' + left.map(x => x.label).join(', ') + '.' : ''}`; onDone({ mistakes }); }
      } else {
        mistakes++; c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 500);
        msg.innerHTML = selected.i < 0 ? `<b>"${selected.label}" does not belong in this apparatus at all.</b> Leave it in the bin.` : `<b>Not there.</b> Position ${idx + 1} is "${s.key[idx]}".`;
      }
    }
    renderBin();
    host.append(el('div', { class: 'build-grid' }, el('div', null, svgHost), el('div', null, el('h3', null, 'Parts bin'), bin, msg)), why);
  }
  function buildOrder(spec, host, onDone, mode) {
    const f = FIGS[spec.fig]; if (!f) { onDone(); return; }
    const nodes = f.nodes; const order = shuffle(nodes.map((_, i) => i)); let next = 0, mistakes = 0;
    const isStack = mode === 'stack';
    const placed = el('ol', { class: 'placed' + (isStack ? ' stack' : '') }); const pool = el('div', { class: 'pool' });
    const msg = el('p', { class: 'hint' }, isStack ? 'Stack the layers from the top down: click the layer that is on top.' : (f.family === 'cycle' ? 'Order the steps of the cycle: click the step that comes first.' : 'Connect the components in process order: click the one that comes first.'));
    function render() { pool.innerHTML = ''; for (const i of order) if (i >= next) pool.append(el('button', { class: 'chip', onclick: () => choose(i) }, nodes[i].label)); }
    function choose(i) {
      if (i === next) { placed.append(el('li', null, el('b', null, nodes[i].label), el('span', { class: 'muted' }, ' — ' + nodes[i].detail))); next++; render(); msg.textContent = next < nodes.length ? (isStack ? 'Right. What is directly underneath?' : 'Right. What comes next?') : ''; if (next === nodes.length) finish(); }
      else { mistakes++; msg.innerHTML = `<b>Not yet.</b> "${nodes[i].label}": ${nodes[i].detail}`; }
    }
    function finish() {
      msg.innerHTML = `<b>Done${mistakes ? ' with ' + mistakes + ' mistake' + (mistakes > 1 ? 's' : '') : ' with no mistakes'}.</b> Here is the course's drawing of it:`;
      host.append(figureNode(spec.fig)); onDone({ mistakes });
    }
    render();
    host.append(el('p', { class: 'muted' }, f.caption), pool, msg, placed);
  }

  // ---------- widget host ----------
  let listeners = new Map();
  window.addEventListener('message', ev => { const d = ev.data; if (!d || d.type !== 'sg-widget') return; const fn = listeners.get(d.id); if (fn) fn(d); });
  function widgetFrame(id, onMsg) {
    const frame = el('iframe', { class: 'widget-iframe', src: 'widget-frame.html?w=' + encodeURIComponent(id) + '&t=dark', title: 'Course widget: ' + id, loading: 'eager' });
    listeners.set(id, onMsg || (() => {}));
    return frame;
  }
  function commissionStep(item, host, onDone, ctx) {
    const ch = window.SG_CHALLENGES && window.SG_CHALLENGES[item.widget];
    const status = el('div', { class: 'target' }, el('span', { class: 'tag' }, 'TARGET'), ' ', el('span', { class: 'target-text' }, (item.goal || (ch && ch.goal) || 'Explore this widget.')), el('span', { class: 'target-state' }, ''));
    let done = false, started = Date.now();
    const frame = widgetFrame(item.widget, d => {
      if (d.error) { status.querySelector('.target-state').textContent = ' · widget error: ' + d.error; onDone({ skipped: true }); return; }
      if (d.ready) { status.querySelector('.target-state').textContent = d.goal ? ' · not yet' : ''; if (d.goal && !item.goal) status.querySelector('.target-text').textContent = d.goal; if (!d.goal) { onDone({ reached: true, free: true }); } }
      if ('done' in d) {
        status.querySelector('.target-state').textContent = d.done ? ' · ✓ target reached' + (d.detail ? ' (' + d.detail + ')' : '') : ' · not yet' + (d.detail ? ' (' + d.detail + ')' : '');
        status.classList.toggle('reached', !!d.done);
        if (d.done && !done) { done = true; onDone({ reached: true, seconds: (Date.now() - started) / 1000 }); }
      }
    });
    host.append(status, frame, el('p', { class: 'small muted' }, 'This is the course\'s own interactive from ', ctx.moduleLinks, '. Reaching the target earns a permanent bonus; you may also continue without it.'));
  }

  // ---------- runner ----------
  function run(missionId, ctx, onComplete) {
    const M = SG.MISSIONS[missionId]; if (!M) { onComplete({}); return; }
    const phases = [];
    if (M.brief && M.brief.length) phases.push('Brief');
    if (M.build) phases.push('Build');
    for (const c of (M.commission || [])) phases.push('Commission');
    if (M.certify) phases.push('Certify');
    let phase = 0; const results = { targets: 0, targetsTotal: (M.commission || []).length, mistakes: 0 };
    const root = el('div', { class: 'mission' });
    const strip = el('div', { class: 'phase-strip' });
    const body = el('div', { class: 'mission-body' });
    const nav = el('div', { class: 'mission-nav' });
    root.append(el('div', { class: 'tag' }, 'COMMISSIONING MISSION'), el('h2', null, M.title), strip, body, nav);
    ctx.modal(root, { wide: true });
    let briefIndex = 0;
    function renderStrip() {
      strip.innerHTML = '';
      const nC = phases.filter(p => p === 'Commission').length; const firstC = phases.indexOf('Commission'); const lastC = phases.lastIndexOf('Commission');
      const kinds = phases.filter((p, i) => p !== 'Commission' || i === firstC);
      kinds.forEach(p => {
        let cls = 'phase', label = p;
        if (p === 'Commission') { const cur = phases.slice(0, phase + 1).filter(x => x === 'Commission').length; const active = phase >= firstC && phase <= lastC; cls += active ? ' active' : phase > lastC ? ' done' : ''; label = nC > 1 ? 'Commission ' + Math.max(1, Math.min(nC, cur)) + '/' + nC : 'Commission'; }
        else { const i = phases.indexOf(p); cls += i === phase ? ' active' : i < phase ? ' done' : ''; }
        strip.append(el('span', { class: cls }, label));
      });
    }
    function next() { phase++; if (phase >= phases.length) { ctx.closeModal(); onComplete(results); return; } renderPhase(); }
    function renderPhase() {
      renderStrip(); body.innerHTML = ''; nav.innerHTML = '';
      const p = phases[phase];
      if (p === 'Brief') {
        const card = M.brief[briefIndex];
        body.append(el('div', { class: 'brief-card' }, el('div', { class: 'small muted' }, `Briefing ${briefIndex + 1} of ${M.brief.length}`), el('h3', null, card.h), el('p', null, card.p), card.fig ? figureNode(card.fig) : null));
        if (briefIndex > 0) nav.append(el('button', { class: 'btn', onclick: () => { briefIndex--; renderPhase(); } }, '← Back'));
        nav.append(el('button', { class: 'btn primary', onclick: () => { if (briefIndex < M.brief.length - 1) { briefIndex++; renderPhase(); } else next(); } }, briefIndex < M.brief.length - 1 ? 'Next card →' : (M.build ? 'Build it →' : 'Continue →')));
      } else if (p === 'Build') {
        const spec = M.build; let finished = false;
        body.append(el('p', { class: 'muted' }, spec.scene ? 'Assemble the apparatus. Parts bin on the right; the drawing is the course\'s own.' : ''));
        const cta = el('button', { class: 'btn primary', disabled: '', onclick: next }, 'Commission it →');
        const skip = el('button', { class: 'btn link', onclick: () => { if (!finished) { results.skippedBuild = true; } next(); } }, 'Skip the build (no bonus)');
        const done = r => { finished = true; results.mistakes += r ? r.mistakes || 0 : 0; cta.disabled = false; skip.remove(); };
        if (spec.scene) buildScene(spec, body, done); else buildOrder(spec, body, done, spec.mode);
        nav.append(cta, skip);
      } else if (p === 'Commission') {
        const idx = phases.slice(0, phase).filter(x => x === 'Commission').length; const item = M.commission[idx];
        body.append(el('p', { class: 'muted' }, `Commission ${idx + 1} of ${M.commission.length}: tune the real thing.`));
        let reached = false;
        const cont = el('button', { class: 'btn', onclick: next }, 'Continue without the target');
        commissionStep(item, body, r => { if (r.reached && !reached) { reached = true; results.targets++; cont.textContent = 'Continue →'; cont.classList.add('primary'); } if (r.skipped) { cont.textContent = 'Continue →'; } }, { moduleLinks: (M.certify ? M.certify.modules : []).map((m, i) => [i ? ', ' : '', modLink(m)]) });
        nav.append(cont);
      } else if (p === 'Certify') {
        body.append(el('p', null, 'Now prove it: answer the course\'s questions on what you just built. A wrong answer shows the explanation and gives you another question.'));
        nav.append(el('button', { class: 'btn primary', onclick: () => { ctx.quizGate(M.title, M.certify.modules, M.certify.n, () => { onComplete(results); }, ctx.grantAmount); } }, 'Take the certification →'));
      }
    }
    renderPhase();
  }

  // explore panel: figures + widgets for a built station
  function explore(stationId, ctx, opts) {
    const E = SG.EXPLORE[stationId] || { widgets: [], modules: [] };
    const widgets = (opts && opts.widgets) || E.widgets; const modules = (opts && opts.modules) || E.modules;
    const root = el('div', { class: 'explore' });
    const tabs = el('div', { class: 'preset-row' }); const content = el('div', { class: 'explore-body' });
    let active = null;
    function show(kind, id) {
      content.innerHTML = ''; active = kind + ':' + id; [...tabs.children].forEach(c => c.classList.toggle('sel', c.dataset.k === active));
      if (kind === 'w') content.append(widgetFrame(id, () => {}));
      else { for (const [key, f] of Object.entries(FIGS)) if (f.module === id) content.append(figureNode(key)); }
    }
    for (const w of widgets) tabs.append(el('button', { class: 'chip', 'data-k': 'w:' + w, onclick: () => show('w', w) }, '🧭 ' + w.replace(/-/g, ' ')));
    for (const m of modules) tabs.append(el('button', { class: 'chip', 'data-k': 'f:' + m, onclick: () => show('f', m) }, '🖼 Module ' + String(m).padStart(2, '0') + ' figures'));
    root.append(el('div', { class: 'tag' }, 'EXPLORE'), el('h2', null, (opts && opts.title) || 'Interactives and figures'), el('p', { class: 'small muted' }, 'The course\'s own widgets and drawings for this part of the chain. ', modules.map((m, i) => [i ? ' · ' : '', modLink(m)])), tabs, content);
    ctx.modal(root, { wide: true });
    if (widgets.length) show('w', widgets[0]); else if (modules.length) show('f', modules[0]);
  }

  SG.missions = { run, explore, widgetFrame, figureNode };
})();
