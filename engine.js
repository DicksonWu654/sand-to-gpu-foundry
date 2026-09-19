// Sand to GPU: Foundry — game engine (state, simulation, missions, bonuses, UI).
(function () {
  const SG = window.SG;
  const QUIZ = window.SAND_QUIZ || {};
  const SAVE_KEY = 'sand-to-gpu-foundry-v1';
  const ORDER = SG.STATIONS.map(s => s.id);
  const byId = Object.fromEntries(SG.STATIONS.map(s => [s.id, s]));
  const $ = sel => document.querySelector(sel);
  const el = (tag, attrs, ...kids) => {
    const n = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) n.setAttribute(k, v);
    }
    for (const k of kids.flat(Infinity)) if (k !== null && k !== undefined) n.append(k.nodeType ? k : document.createTextNode(String(k)));
    return n;
  };
  const ic = (name, cls) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('class', 'ic' + (cls ? ' ' + cls : '')); const u = document.createElementNS('http://www.w3.org/2000/svg', 'use'); u.setAttribute('href', '#i-' + name); s.append(u); return s; };
  const REQUIRED_BAYS = ['bay-oxdep', 'bay-litho', 'bay-etch', 'bay-implant', 'bay-feol', 'bay-beol'];
  const OPTIONAL_BAYS = ['bay-clean', 'bay-metro'];

  // ---------- state ----------
  function freshState() {
    const st = {};
    for (const s of SG.STATIONS) st[s.id] = { on: !!s.startUnlocked, level: 1 };
    const res = {}; for (const r of Object.keys(SG.RES)) res[r] = 0;
    return {
      v: 1, day: 0, cash: 60000, res, st, design: null, wafersRun: 0, contract: null, missed: {},
      labs: {}, puzzles: {}, mitig: {}, events: [], log: [], milestones: {}, answered: {}, made: {},
      bays: {}, node: 'N5', nodeFx: { waferPrice: 16000, opex: 8000, density: 1 }, bonus: { thr: {}, d0: 0 }, missions: {},
      ach: {}, achMult: 0, lastSeen: Date.now(), nextRush: null,
      sell: {}, stats: { revenue: 0, sold: {}, capex: 0, clicks: 0, rush: 0 }, income: 0, won: false, speed: 1
    };
  }
  const PARAMS = new URLSearchParams(location.search);
  let noSave = PARAMS.has('nosave') || PARAMS.has('demo');
  let S = (PARAMS.has('demo') ? null : load()) || freshState();
  function save() { if (noSave) return; S.lastSeen = Date.now(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
  // Demo states for review and screenshots: ?demo=early|mid|late  (never saved)
  function applyDemo(kind) {
    const on = ids => ids.forEach(id => { S.st[id].on = true; });
    if (kind === 'early') { on(['mine', 'furnace', 'siemens']); S.cash = 2.4e6; S.st.mine.level = 3; S.st.furnace.level = 2; S.day = 21; S.res.quartz = 900; S.res.mgsi = 120; S.res.poly = 30000; S.answered['1:0'] = true; S.answered['1:2'] = true; }
    if (kind === 'mid' || kind === 'late') { on(['mine', 'furnace', 'siemens', 'cz', 'wafering', 'design', 'fab', 'sort', 'hbm']); S.design = { A: 800, n: 2, h: 8, model: 'nb', name: 'Blackwell-class' }; for (const b of ['bay-oxdep', 'bay-litho', 'bay-etch', 'bay-implant', 'bay-feol', 'bay-beol']) S.bays[b] = true; Object.assign(S.st, { mine: { on: true, level: 12 }, furnace: { on: true, level: 9 }, siemens: { on: true, level: 7 }, cz: { on: true, level: 6 }, wafering: { on: true, level: 5 }, fab: { on: true, level: 2 }, sort: { on: true, level: 2 }, hbm: { on: true, level: 2 } }); S.cash = 210e6; S.day = 188; S.wafersRun = 24000; S.res.wafer = 30000; S.res.poly = 400000; S.res.fwafer = 900; S.res.die = 3000; S.res.hbm = 2200; for (let i = 0; i < 31; i++) S.answered[(1 + i % 8) + ':' + (i % 8)] = true; for (const a of ['first_million', 'nine_nines', 'six_bays', 'clean_assembly']) { S.ach[a] = 100; } S.achMult = 0.13; S.labs.cz = { score: 0.82, wpi: 1628 }; S.missions = { mine: { targets: 1, targetsTotal: 1, mistakes: 0 }, furnace: { targets: 0, targetsTotal: 0, mistakes: 0 }, siemens: { targets: 1, targetsTotal: 1, mistakes: 1 } }; S.events = [{ id: 'abf', endsDay: 230 }]; }
    if (kind === 'late') { on(['cowos', 'test', 'systems']); Object.assign(S.st, { cowos: { on: true, level: 7 }, test: { on: true, level: 3 }, systems: { on: true, level: 2 }, fab: { on: true, level: 6 } }); S.cash = 4.2e9; S.day = 512; S.wafersRun = 160000; S.node = 'N3'; S.nodeFx = { waferPrice: 19000, opex: 10000, density: 1.35 }; S.made.rack = 40; S.stats.sold.rack = 40; S.won = true; S.res.gpu = 120; S.res.pkg = 300; }
    S.log = [{ day: Math.floor(S.day), text: 'Demo state "' + kind + '" loaded (not saved).', cls: 'muted' }];
  }
  if (PARAMS.has('demo')) applyDemo(PARAMS.get('demo'));
  function load() {
    try {
      const j = localStorage.getItem(SAVE_KEY); if (!j) return null; const s = JSON.parse(j); if (s.v !== 1) return null;
      const d = freshState();
      for (const k of Object.keys(d)) if (s[k] == null) s[k] = d[k];
      for (const k of Object.keys(d.stats)) if (s.stats[k] == null) s.stats[k] = d.stats[k];
      return s;
    } catch (e) { return null; }
  }
  function baysReady() { return REQUIRED_BAYS.every(b => S.bays[b]); }
  function baysMissing() { return REQUIRED_BAYS.filter(b => !S.bays[b]); }

  // ---------- derived quantities (the formulas from the course) ----------
  const WAFER_D = 300;
  function diesPerWafer(A) { return Math.max(0, Math.floor(Math.PI * Math.pow(WAFER_D / 2, 2) / A - Math.PI * WAFER_D / Math.sqrt(2 * A))); }
  function yieldModel(model, Acm2, D0, alpha) {
    const AD = Acm2 * D0;
    if (model === 'poisson') return Math.exp(-AD);
    if (model === 'murphy') return AD === 0 ? 1 : Math.pow((1 - Math.exp(-AD)) / AD, 2);
    return Math.pow(1 + AD / (alpha || 3), -(alpha || 3));
  }
  function currentD0() {
    const learn = 0.05 + 0.45 * Math.exp(-S.wafersRun / 20000);
    const bonus = ((S.labs.oxide && S.labs.oxide.d0bonus) || 0) + ((S.bonus && S.bonus.d0) || 0);
    return Math.max(0.03, learn - bonus);
  }
  function hbmConfig() { return S.labs.hbm || { height: 8, escape: 0.04, bond: 0.97, bondName: 'TC-NCF' }; }
  function hbmStackYield(c) { return Math.pow(1 - c.escape, c.height + 1) * Math.pow(c.bond, c.height); }
  function hbmGB(c) { return 3 * c.height; }
  function gpuPrice(d) { d = d || S.design; if (!d) return 0; return 3000 + 14 * d.A * d.n * ((S.nodeFx && S.nodeFx.density) || 1) + 25 * d.h * hbmGB(hbmConfig()); }
  function knowledgeMult() { return 1 + 0.005 * Object.values(S.answered).filter(v => v === true).length; }
  function revMult() { return (1 + (S.achMult || 0)) * knowledgeMult(); }
  function priceOf(r) {
    let p = SG.RES[r].price;
    if (r === 'fwafer' && S.nodeFx) p = S.nodeFx.waferPrice;
    if (r === 'die' && S.design) p = 1.5 * S.design.A;
    if (r === 'hbm') p = 18 * hbmGB(hbmConfig());
    if (r === 'gpu' && S.design) p = gpuPrice();
    if (r === 'pkg' && S.design) p = 0.8 * gpuPrice();
    if (r === 'rack' && S.design) p = 72 * gpuPrice() * 1.3 + 500000;
    for (const ev of S.events) { const e = SG.EVENTS.find(x => x.id === ev.id); if (e && e.priceMult && e.priceMult[r]) p *= e.priceMult[r]; }
    return p;
  }
  function wafersPerIngot() { return (S.labs.cz && S.labs.cz.wpi) || 1300; }
  function goodDiesPerWafer() { if (!S.design) return 0; return diesPerWafer(S.design.A) * yieldModel(S.design.model || 'nb', S.design.A / 100, currentD0(), 3); }
  function resolveQty(v) {
    if (typeof v === 'number') return v;
    if (v === 'WPI') return wafersPerIngot();
    if (v === 'DPW') return goodDiesPerWafer();
    if (v === 'HBMPW') return 30 * hbmStackYield(hbmConfig());
    if (v === 'NDIE') return S.design ? S.design.n : 2;
    if (v === 'NHBM') return S.design ? S.design.h : 8;
    return 0;
  }
  function fieldFail() { return (S.labs.test && S.labs.test.fieldFail != null) ? S.labs.test.fieldFail : 0.02; }
  function stationOpex(s) {
    let o = s.opex;
    if (s.id === 'fab' && S.nodeFx) o = S.nodeFx.opex;
    if (s.id === 'fab' && S.labs.litho) o *= S.labs.litho.opexMult;
    if (s.id === 'fab') o += outsourceFee();
    if (s.id === 'hbm' && S.labs.hbm && S.labs.hbm.stackCost) o = 30 * S.labs.hbm.stackCost;
    if (s.id === 'test' && S.labs.test) o = S.labs.test.costPerUnit;
    if (s.id === 'systems') o += fieldFail() * 72 * 100000;
    return o;
  }
  function eventMult(sid) {
    let m = 1;
    for (const ev of S.events) {
      const e = SG.EVENTS.find(x => x.id === ev.id);
      if (!e || e.station !== sid) continue;
      let mult = e.mult; if (e.mitigatedBy && S.mitig[e.mitigatedBy]) mult = 1 - (1 - mult) / 2;
      m *= mult;
    }
    return m;
  }
  function puzzleBonus(sid) { let b = 1; for (const p of SG.PUZZLES) if (p.station === sid && S.puzzles[p.id]) b += 0.1; return b; }
  function tier(s) { return Math.floor(S.st[s.id].level / 5); }
  function capacity(s) {
    let c = s.rate * S.st[s.id].level * (1 + 0.25 * tier(s)) * eventMult(s.id) * puzzleBonus(s.id) * (1 + ((S.bonus && S.bonus.thr && S.bonus.thr[s.id]) || 0));
    if (s.id === 'fab') c *= 1 + 0.1 * OPTIONAL_BAYS.filter(b => S.bays[b]).length;
    return c;
  }
  function valueAdd(s) { let v = 0; for (const [r, q] of Object.entries(s.outputs)) v += resolveQty(q) * priceOf(r); for (const [r, q] of Object.entries(s.inputs)) v -= resolveQty(q) * priceOf(r); return v - stationOpex(s); }
  function netPerDay(s) { const f = flow[s.id]; return f ? f.rate * valueAdd(s) : 0; }
  function paybackDays(s) { const perLevel = capacity(s) / Math.max(1, S.st[s.id].level) * valueAdd(s); return perLevel > 0 ? upgradeCost(s) / perLevel : Infinity; }
  function upgradeCost(s) { return Math.round((s.cost || 40000) * 0.5 * Math.pow(1.45, S.st[s.id].level - 1)); }
  function producerOf(r) { return SG.STATIONS.find(s => s.outputs[r] !== undefined); }
  function consumersOf(r) { return SG.STATIONS.filter(s => s.inputs[r] !== undefined); }
  // 30 days of live downstream consumption (90 with the inventory mitigation), never less than 2 days of output
  function warehouseCap(r) {
    const p = producerOf(r); if (!p) return Infinity;
    const out = capacity(p) * resolveQty(p.outputs[r]);
    let demand = 0; for (const c of consumersOf(r)) if (S.st[c.id].on && c.rate > 0 && !blocked(c)) demand += capacity(c) * resolveQty(c.inputs[r]);
    return Math.max(demand * 30 * (S.mitig.stockpile ? 3 : 1), out * 2);
  }
  function blocked(s) { return (s.needsDesign && !S.design) ? 'a mask set (open the Design Studio)' : null; }
  const OUTSOURCE_FEE = 2500; // per wafer per missing process bay: the steps are bought from another fab
  function outsourceFee() { return baysMissing().length * OUTSOURCE_FEE; }

  // ---------- simulation ----------
  const flow = {}; const soldTick = {}; const dump = {}; const producedTick = {};
  let incomeWindow = []; let simulating = false;
  // Run up to `cap` cycles of station s, limited by inputs and output warehouse. Returns cycles run.
  function produce(s, cap, respectWarehouse) {
    let cycles = cap; let starved = null; let blockedBy = null;
    for (const [r, q] of Object.entries(s.inputs)) {
      const per = resolveQty(q); if (per <= 0) continue;
      const possible = S.res[r] / per; if (possible < cycles) { cycles = possible; starved = SG.RES[r].name; }
    }
    if (respectWarehouse) for (const [r, q] of Object.entries(s.outputs)) {
      if (!consumersOf(r).some(c => S.st[c.id].on)) continue;
      const room = Math.max(0, warehouseCap(r) * 1.2 - S.res[r]); const per = resolveQty(q); if (per <= 0) continue;
      if (room / per < cycles) { cycles = room / per; blockedBy = SG.RES[r].name; }
    }
    cycles = Math.max(0, cycles);
    if (cycles > 0) {
      for (const [r, q] of Object.entries(s.inputs)) S.res[r] -= resolveQty(q) * cycles;
      for (const [r, q] of Object.entries(s.outputs)) { const made = resolveQty(q) * cycles; S.res[r] += made; S.made[r] = (S.made[r] || 0) + made; producedTick[r] = (producedTick[r] || 0) + made; if (S.made[r] >= 1) checkMilestone(r); }
      S.cash -= stationOpex(s) * cycles;
      if (s.id === 'fab') S.wafersRun += cycles;
    }
    return { cycles, starved, blockedBy };
  }
  function tick(dt) {
    const cashBefore = S.cash;
    S.day += dt;
    for (const id of ORDER) {
      const s = byId[id]; const st = S.st[id];
      if (!st.on || s.rate === 0) { flow[id] = null; continue; }
      const b = blocked(s); if (b) { flow[id] = { rate: 0, util: 0, starved: b }; continue; }
      const cap = capacity(s) * dt;
      const r = produce(s, cap, true);
      flow[id] = { rate: r.cycles / dt, util: cap > 0 ? r.cycles / cap : 0, starved: r.cycles < cap * 0.98 ? r.starved : null, blocked: r.cycles < cap * 0.98 ? r.blockedBy : null };
    }
    for (const r of Object.keys(SG.RES)) {
      const policy = S.sell[r] || 'auto';
      const hasConsumer = consumersOf(r).some(c => S.st[c.id].on);
      let qty = 0;
      if (policy === 'all' || (policy === 'auto' && !hasConsumer)) qty = S.res[r];
      else if (policy === 'auto') { const cap = warehouseCap(r); if (S.res[r] > cap) qty = S.res[r] - cap; }
      if (qty > 1e-9) {
        S.res[r] -= qty; let rev = 0;
        const c = S.contract; if (c && c.r === r && c.delivered < c.n) { const d = Math.min(qty, c.n - c.delivered); c.delivered += d; rev += d * c.price * revMult(); qty -= d; if (c.delivered >= c.n) completeContract(); }
        rev += qty * priceOf(r) * revMult(); S.cash += rev; S.stats.revenue += rev; S.stats.sold[r] = (S.stats.sold[r] || 0) + qty; soldTick[r] = (soldTick[r] || 0) + rev;
        if (hasConsumer && producedTick[r] > 0) dump[r] = 0.9 * (dump[r] || 0) + 0.1 * Math.min(1, qty / producedTick[r]);
      } else if (hasConsumer && producedTick[r] > 0) dump[r] = 0.9 * (dump[r] || 0);
      producedTick[r] = 0;
    }
    if (S.contract && S.day >= S.contract.deadline) failContract();
    for (const ev of S.events.slice()) if (S.day >= ev.endsDay) { S.events.splice(S.events.indexOf(ev), 1); log('Event over: ' + SG.EVENTS.find(e => e.id === ev.id).title, 'muted'); }
    if (!simulating && S.st.fab.on && (!S.nextEvent || S.day >= S.nextEvent)) { if (S.nextEvent) fireEvent(); S.nextEvent = S.day + 120 + Math.random() * 120; }
    if (!simulating && S.st.furnace.on && !S.contract && (!S.nextRush || S.day >= S.nextRush)) { if (S.nextRush) spawnRush(); S.nextRush = S.day + 60 + Math.random() * 90; }
    incomeWindow.push({ d: dt, c: S.cash - cashBefore });
    while (incomeWindow.length > 100) incomeWindow.shift();
    const totD = incomeWindow.reduce((a, x) => a + x.d, 0);
    S.income = totD > 0 ? incomeWindow.reduce((a, x) => a + x.c, 0) / totD : 0;
  }
  function checkMilestone(r) {
    const m = SG.MILESTONES.find(m => m.res === r);
    if (!m || S.milestones[m.id]) return;
    S.milestones[m.id] = true;
    log('Milestone: ' + m.title + ' — ' + m.text, 'milestone');
    if (!simulating) toast('🏁 ' + m.title, m.text);
    if (m.id === 'm_rack' && !S.won) { S.won = true; if (!simulating) setTimeout(showWin, 800); }
  }
  function checkAchievements() {
    const ctx = { d0: currentD0 };
    for (const a of SG.ACHIEVEMENTS) {
      if (S.ach[a.id]) continue;
      let ok = false; try { ok = a.check(S, ctx); } catch (e) {}
      if (!ok) continue;
      S.ach[a.id] = Math.floor(S.day);
      if (a.reward.cash) S.cash += a.reward.cash;
      if (a.reward.mult) S.achMult = (S.achMult || 0) + a.reward.mult;
      log(`Achievement: ${a.title}. ${a.reward.mult ? '+' + Math.round(a.reward.mult * 100) + '% revenue forever.' : '+' + fmt$(a.reward.cash) + '.'}`, 'ach');
      if (!simulating) toast('🏆 ' + a.title, a.text + (a.reward.mult ? ` +${Math.round(a.reward.mult * 100)}% revenue.` : ` +${fmt$(a.reward.cash)}.`));
      renderSide();
    }
  }
  function fireEvent(forced) {
    const candidates = SG.EVENTS.filter(e => !S.events.some(x => x.id === e.id) && (!e.station || S.st[e.station].on));
    if (!forced && !candidates.length) return;
    const e = forced || candidates[Math.floor(Math.random() * candidates.length)];
    if (!forced) S.events.push({ id: e.id, endsDay: S.day + e.days });
    if (e.scrapFrac && e.station === 'fab') {
      const frac = S.mitig.isolation ? 0.05 : e.scrapFrac;
      const wip = capacity(byId.fab) * 90; const scrapped = wip * frac; const cost = scrapped * (SG.RES.wafer.price + stationOpex(byId.fab) * 0.5);
      S.cash -= cost;
      log(`Earthquake scrapped ~${fmtN(scrapped)} wafers in process (Little's law WIP × ${Math.round(frac * 100)}%), costing ${fmt$(cost)}.`, 'event');
    }
    log('Event: ' + e.title, 'event');
    modal(el('div', { class: 'news' },
      el('div', { class: 'news-tag' }, 'INDUSTRY NEWS · day ' + Math.floor(S.day)),
      el('h2', null, e.title), el('p', null, e.text),
      el('p', { class: 'muted' }, e.station ? `Effect: ${byId[e.station].name} runs at ${Math.round((e.mitigatedBy && S.mitig[e.mitigatedBy] ? 1 - (1 - e.mult) / 2 : e.mult) * 100)}% for ${e.days} days.` : `Effect: prices change for ${e.days} days (${Object.entries(e.priceMult).map(([r, m]) => SG.RES[r].name + ' ×' + m).join(', ')}).`),
      e.mitigatedBy && !S.mitig[e.mitigatedBy] ? el('p', { class: 'hint' }, 'Mitigation available in Risk & Resilience: ' + SG.MITIGATIONS.find(m => m.id === e.mitigatedBy).name + '.') : null,
      el('div', { class: 'mission-nav' }, el('button', { class: 'btn primary', onclick: closeModal }, 'Noted'),
        (SG.EVENT_WIDGETS && SG.EVENT_WIDGETS[e.id] && SG.missions) ? el('button', { class: 'btn', onclick: () => SG.missions.explore(null, missionCtx, { title: e.title + ': the interactive behind it', widgets: [SG.EVENT_WIDGETS[e.id]], modules: [] }) }, '🧭 Open the interactive') : null)
    ));
  }
  // contracts: a customer wants N of your end product by a deadline at +30%; a shortfall costs 20% of the missing value
  function endProduct() { let last = null; for (const id of ORDER) { const s = byId[id]; if (S.st[id].on && s.rate > 0 && !blocked(s)) last = s; } if (!last) return null; const r = Object.keys(last.outputs)[0]; return { s: last, r }; }
  function spawnRush() {
    if ($('.rush') || S.contract) return;
    const ep = endProduct(); if (!ep) return;
    const perDay = capacity(ep.s) * resolveQty(ep.s.outputs[ep.r]); if (!(perDay > 0)) return;
    const c = SG.CONTRACTS[Math.floor(Math.random() * SG.CONTRACTS.length)];
    const n = Math.max(1, Math.round(perDay * 3)); const days = 8; const price = priceOf(ep.r) * 1.3;
    const btn = el('button', { class: 'rush', style: `left:${10 + Math.random() * 70}%; top:${20 + Math.random() * 50}%` }, el('b', null, ic('flag'), 'Contract offer'), el('span', null, `${c.title}: ${fmtN(n)} ${SG.RES_SHORT[ep.r] || ep.r} in ${days} days at +30%`));
    const timer = setTimeout(() => btn.remove(), 16000);
    btn.addEventListener('click', () => {
      clearTimeout(timer); btn.remove();
      modal(el('div', null, el('div', { class: 'tag' }, 'CONTRACT OFFER · day ' + Math.floor(S.day)), el('h2', null, c.title),
        el('p', null, `Deliver ${fmtN(n)} ${SG.RES[ep.r].name}${n > 1 ? 's' : ''} within ${days} days (by day ${Math.floor(S.day) + days}) at ${fmt$(price)} each, 30% above market: ${fmt$(n * price)} in total. Miss the deadline and you owe 20% of the undelivered value. Your line makes ~${fmtN(perDay)} a day, so this is about three days of output with eight to do it.`),
        el('p', { class: 'muted' }, c.text),
        el('div', { class: 'mission-nav' }, el('button', { class: 'btn primary', onclick: () => { S.contract = { r: ep.r, n, delivered: 0, deadline: S.day + days, price, title: c.title }; log(`Contract accepted: ${fmtN(n)} ${SG.RES[ep.r].name} by day ${Math.floor(S.contract.deadline)} at +30%.`, 'ach'); closeModal(); } }, 'Accept'), el('button', { class: 'btn', onclick: closeModal }, 'Decline'))));
    });
    document.body.append(btn);
  }
  function completeContract() { const c = S.contract; if (!c) return; S.contract = null; S.stats.rush = (S.stats.rush || 0) + 1; log(`Contract delivered in full: ${c.title}, ${fmtN(c.n)} ${SG.RES[c.r].name} at +30%.`, 'ach'); if (!simulating) toast('💰 Contract delivered', `${c.title}: ${fmtN(c.n)} ${SG.RES[c.r].name} on time. +30% on every unit.`); }
  function failContract() { const c = S.contract; if (!c) return; S.contract = null; const short = c.n - c.delivered; const penalty = 0.2 * short * c.price; S.cash -= penalty; log(`Contract missed: ${c.title}, ${fmtN(short)} ${SG.RES[c.r].name} short. Penalty ${fmt$(penalty)}.`, 'event'); if (!simulating) toast('⚠ Contract missed', `${fmtN(short)} ${SG.RES[c.r].name} short of ${fmtN(c.n)}: penalty ${fmt$(penalty)}. Capacity you promise has to exist when the date arrives.`); }
  // manual shift: click a station to run cycles now
  function manualShift(s, iconEl) {
    if (!S.st[s.id].on || s.rate === 0) return;
    if (blocked(s)) { floatText(iconEl, 'blocked', 'bad'); return; }
    const r = produce(s, capacity(s) * 0.1, true);
    S.stats.clicks = (S.stats.clicks || 0) + 1;
    if (r.cycles > 0.01) {
      const out = Object.entries(s.outputs)[0]; floatText(iconEl, '+' + fmtN(resolveQty(out[1]) * r.cycles) + ' ' + SG.RES[out[0]].unit, 'ok');
      iconEl.classList.remove('pulse'); void iconEl.offsetWidth; iconEl.classList.add('pulse');
      const belt = belts[s.id]; if (belt) { belt.classList.add('kick'); clearTimeout(belt._kick); belt._kick = setTimeout(() => belt.classList.remove('kick'), 450); }
    }
    else floatText(iconEl, r.starved ? 'no ' + r.starved : 'warehouse full', 'bad');
  }

  // ---------- formatting ----------
  function fmt$(x) { const a = Math.abs(x); const s = x < 0 ? '−$' : '$'; if (a >= 1e9) return s + (a / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return s + (a / 1e6).toFixed(2) + 'M'; if (a >= 1e3) return s + (a / 1e3).toFixed(1) + 'k'; return s + a.toFixed(0); }
  function fmtN(x) { const a = Math.abs(x); if (a >= 1e9) return (x / 1e9).toFixed(2) + 'B'; if (a >= 1e6) return (x / 1e6).toFixed(2) + 'M'; if (a >= 1e4) return (x / 1e3).toFixed(1) + 'k'; if (a >= 10) return x.toFixed(0); if (a >= 1) return x.toFixed(1); if (a < 0.005) return '0'; return x.toFixed(2); }
  function pct(x) { return (x * 100).toFixed(x < 0.1 ? 1 : 0) + '%'; }
  function log(text, cls) { S.log.unshift({ day: Math.floor(S.day), text, cls }); if (S.log.length > 80) S.log.pop(); renderLog(); }

  // ---------- modal, toast, floaters ----------
  const modalRoot = () => $('#modal');
  function modal(content, opts) {
    const root = modalRoot(); root.innerHTML = '';
    const box = el('div', { class: 'modal-box ' + ((opts && opts.wide) ? 'wide' : '') });
    if (!(opts && opts.noClose)) box.append(el('button', { class: 'modal-x', onclick: closeModal, 'aria-label': 'Close' }, '×'));
    box.append(content); root.append(box); root.classList.add('open'); document.body.classList.add('modal-open');
  }
  function closeModal() { const r = modalRoot(); r.classList.remove('open'); r.innerHTML = ''; document.body.classList.remove('modal-open'); if (SG.onModalClose) { const f = SG.onModalClose; SG.onModalClose = null; f(); } }
  function toast(title, text) {
    const gold = /^[🏆💰⬆]/.test(title);
    const t = el('div', { class: 'toast' + (gold ? ' gold' : '') }, el('b', null, title), el('div', null, text));
    const host = $('#toasts'); while (host.children.length >= 2) host.firstChild.remove();
    host.append(t); setTimeout(() => t.classList.add('show'), 10); setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 4500);
    // desktop: a one-line ticker in the control-room header instead of floating cards
    const tk = $('#ticker'); if (tk) { const item = el('span', { class: 'tick' + (gold ? ' gold' : ''), title: text }, title); tk.prepend(item); while (tk.children.length > 2) tk.lastChild.remove(); }
  }
  function floatText(anchor, text, cls) {
    const r = anchor.getBoundingClientRect();
    if (r.width === 0 || r.right < 0 || r.left > innerWidth || r.bottom < 0 || r.top > innerHeight) return; // off-screen: no floater
    const x = Math.max(40, Math.min(innerWidth - 40, r.left + r.width / 2 + (Math.random() - 0.5) * 30));
    const f = el('div', { class: 'floater ' + (cls || ''), style: `left:${x}px; top:${Math.max(130, r.top + 28)}px` }, text);
    document.body.append(f); setTimeout(() => f.remove(), 1300);
  }

  // ---------- quiz gate ----------
  function pickQuestions(modules, n) {
    const pool = [];
    for (const m of modules) { const q = QUIZ[m]; if (!q) continue; q.questions.forEach((qq, i) => pool.push({ m, i, q: qq })); }
    const fresh = pool.filter(p => !S.answered[p.m + ':' + p.i]);
    const src = fresh.length >= n ? fresh : pool;
    for (let i = src.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [src[i], src[j]] = [src[j], src[i]]; }
    return src.slice(0, n);
  }
  function quizGate(title, modules, n, onPass, reward) {
    let correct = 0; let queue = pickQuestions(modules, n * 3);
    const modName = m => (QUIZ[m] ? QUIZ[m].file.replace(/^\d+-/, '').replace(/-/g, ' ') : 'module ' + m);
    function ask() {
      if (correct >= n) { closeModal(); onPass(); return; }
      if (!queue.length) queue = pickQuestions(modules, n * 3);
      const item = queue.shift(); const q = item.q;
      const body = el('div', { class: 'quiz' },
        el('div', { class: 'quiz-head' }, el('span', { class: 'tag' }, 'CERTIFY · ' + title), el('span', { class: 'muted' }, `${correct}/${n} correct · Module ${String(item.m).padStart(2, '0')}: ${modName(item.m)}`)),
        el('p', { class: 'quiz-q' }, q.q),
        el('div', { class: 'quiz-opts' }, q.options.map((o, idx) => el('button', { class: 'opt', onclick: () => answer(idx) }, o))),
        el('p', { class: 'muted small' }, 'Read the chapter: ', el('a', { href: SG.courseLink(item.m), target: '_blank' }, 'open Module ' + String(item.m).padStart(2, '0')))
      );
      function answer(idx) {
        const ok = idx === q.answer; const key = item.m + ':' + item.i; const first = !S.answered[key]; const firstTry = !S.missed[key];
        if (!ok) S.missed[key] = true;
        if (ok) { correct++; if (first) S.answered[key] = firstTry ? true : 'retry'; if (first && firstTry && reward) { const g = reward(); S.cash += g; toast('Research grant +' + fmt$(g), `Right first time. Knowledge multiplier is now ×${knowledgeMult().toFixed(3)}.`); } else if (first && !firstTry) toast('Answered', 'Correct on a retry: no grant, and it does not count toward the knowledge multiplier. First tries do.'); }
        body.querySelector('.quiz-head .muted').textContent = `${correct}/${n} correct · Module ${String(item.m).padStart(2, '0')}: ${modName(item.m)}`;
        body.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; if (i === q.answer) b.classList.add('right'); else if (i === idx) b.classList.add('wrong'); });
        body.append(el('div', { class: 'explain ' + (ok ? 'ok' : 'bad') }, el('b', null, ok ? 'Correct. ' : 'Not quite. '), q.explanation),
          el('button', { class: 'btn primary', onclick: ask }, correct >= n ? 'Finish' : (ok ? 'Next question' : 'Try another question')));
      }
      modal(body, { wide: true });
    }
    ask();
  }
  function objectiveCost() { if (!S.st.mine.on) return 4e6; if (S.st.fab.on && !baysReady()) { const next = REQUIRED_BAYS.find(b => !S.bays[b]); return SG.MISSIONS[next].cost; } const nextLocked = SG.STATIONS.find(s => !S.st[s.id].on); if (nextLocked) return Math.max(4e6, nextLocked.cost); if (S.node !== 'N2') return SG.MISSIONS[S.node === 'N5' ? 'node-n3' : 'node-n2'].cost; return 2e9; }
  function grantAmount() { return Math.max(10000, 0.0025 * objectiveCost()); }

  // ---------- missions and actions ----------
  const missionCtx = { modal, closeModal, quizGate, grantAmount };
  function runMission(id, done) {
    if (!SG.missions || !SG.MISSIONS[id]) { const s = byId[id]; quizGate(s ? s.name : id, s ? s.modules : [1], 2, () => done({}), grantAmount); return; }
    SG.missions.run(id, missionCtx, results => { S.missions[id] = { targets: results.targets || 0, targetsTotal: results.targetsTotal || 0, mistakes: results.mistakes || 0, skippedBuild: !!results.skippedBuild, day: Math.floor(S.day) }; done(results); });
  }
  function applyMissionBonus(stationId, results, isBay) {
    const hits = results.targets || 0;
    if (isBay) { S.bonus.d0 = Math.min(0.06, (S.bonus.d0 || 0) + 0.006 * hits); if (hits) log(`Bay targets reached: ${hits}. Killer-defect density improves by ${(0.006 * hits).toFixed(3)}/cm².`, 'lab'); }
    else if (hits) { S.bonus.thr[stationId] = (S.bonus.thr[stationId] || 0) + 0.05 * hits; log(`Commissioning targets reached: ${hits}. ${byId[stationId].name} throughput +${5 * hits}%.`, 'lab'); }
    if (results.mistakes === 0 && !results.skippedBuild) { S.bonus.thr[stationId] = (S.bonus.thr[stationId] || 0) + 0.05; log('Assembled with no mistakes: +5% throughput at ' + byId[stationId].name + '.', 'lab'); }
  }
  function unlock(s) {
    if (S.cash < s.cost) return;
    runMission(s.id, results => {
      S.cash -= s.cost; S.stats.capex += s.cost;
      if (s.oneShot) { openLab('reticle'); } else { S.st[s.id].on = true; log('Commissioned ' + s.name + ' for ' + fmt$(s.cost), 'build'); }
      applyMissionBonus(s.id, results, false);
      toast('✅ Commissioned: ' + s.name, (results.targets || 0) + '/' + (results.targetsTotal || 0) + ' widget targets reached.');
      buildChain(); save();
    });
  }
  function upgrade(s) {
    const c = upgradeCost(s); if (S.cash < c) return;
    S.cash -= c; S.stats.capex += c; S.st[s.id].level++;
    const card = cards[s.id]; if (card) { floatText(card.icon, 'L' + S.st[s.id].level, 'gold'); card.card.classList.remove('flash'); void card.card.offsetWidth; card.card.classList.add('flash'); }
    if (S.st[s.id].level % 5 === 0) { toast('⚙ Automation tier ' + tier(s), `${s.name} reached level ${S.st[s.id].level}: +25% throughput per tier.`); log(`${s.name} reached automation tier ${tier(s)}.`, 'ach'); }
    save(); buildChain(); const nc = cards[s.id]; if (nc) nc.card.classList.add('flash');
  }
  function openGuide(s) {
    const g = s.guide;
    modal(el('div', { class: 'guide' },
      el('div', { class: 'tag' }, 'FIELD GUIDE · Stage ' + s.stage + ' · Module' + (s.modules.length > 1 ? 's ' : ' ') + s.modules.map(m => String(m).padStart(2, '0')).join(', ')),
      el('h2', null, s.icon + ' ' + s.name),
      el('p', null, el('b', null, 'What comes in: '), g.in), el('p', null, el('b', null, 'What goes out: '), g.out),
      el('p', null, el('b', null, 'The constraint that makes it hard: '), g.constraint),
      el('h3', null, 'Key numbers'), el('ul', null, g.numbers.map(n => el('li', null, n))),
      el('p', null, el('b', null, 'Why it matters in the game: '), g.why),
      el('p', { class: 'small' }, 'Read the full chapter: ', s.modules.map((m, i) => [i ? ', ' : '', el('a', { href: SG.courseLink(m), target: '_blank' }, 'Module ' + String(m).padStart(2, '0'))])),
      el('button', { class: 'btn', onclick: closeModal }, 'Back to the floor')
    ), { wide: true });
  }
  function openLab(id) {
    const lab = SG.LABS[id]; if (!lab) return;
    const host = el('div', { class: 'lab' }); modal(host, { wide: true });
    lab.open(host, {
      S, el, fmt$, fmtN, pct, diesPerWafer, yieldModel, currentD0, hbmStackYield, hbmGB, gpuPrice, priceOf, hbmConfig, closeModal, log, toast, save,
      commitDesign(d) {
        const first = !S.design;
        if (!first) { if (S.cash < byId.design.cost) { toast('Not enough cash', 'A new mask set costs ' + fmt$(byId.design.cost) + '.'); return false; } S.cash -= byId.design.cost; S.stats.capex += byId.design.cost; log('Redesign: new mask set bought for ' + fmt$(byId.design.cost), 'build'); }
        S.design = d; S.st.design.on = true;
        log(`Design committed: ${d.n} × ${d.A} mm² die${d.n > 1 ? 's' : ''}, ${d.h} HBM stacks (${d.name}).`, 'build');
        buildChain(); save(); return true;
      }
    });
  }
  function openPuzzle(p) {
    const order = p.steps.map((_, i) => i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    let next = 0, mistakes = 0;
    const placed = el('ol', { class: 'placed' }); const pool = el('div', { class: 'pool' }); const msg = el('p', { class: 'hint' }, 'Click the step that comes first.');
    function render() { pool.innerHTML = ''; for (const i of order) if (i >= next) pool.append(el('button', { class: 'chip', onclick: () => choose(i) }, p.steps[i][0])); }
    function choose(i) {
      if (i === next) { placed.append(el('li', null, el('b', null, p.steps[i][0]), el('span', { class: 'muted' }, ' — ' + p.steps[i][1]))); next++; msg.textContent = next < p.steps.length ? 'Right. What comes next?' : ''; render(); if (next === p.steps.length) finish(); }
      else { mistakes++; msg.innerHTML = `<b>Not yet.</b> "${p.steps[i][0]}": ${p.steps[i][1]} It comes later.`; }
    }
    function finish() {
      const passed = mistakes <= 2;
      if (passed && !S.puzzles[p.id]) { S.puzzles[p.id] = true; log(`Puzzle solved: ${p.title} (+10% throughput at ${byId[p.station].name})`, 'lab'); toast('🧩 Puzzle solved', `+10% throughput at ${byId[p.station].name}.`); buildChain(); save(); }
      msg.innerHTML = passed ? `<b>Done with ${mistakes} mistake${mistakes === 1 ? '' : 's'}.</b> ${S.puzzles[p.id] ? 'Bonus applied.' : ''}` : `<b>Done, but ${mistakes} mistakes.</b> Two or fewer earns the throughput bonus; try again.`;
      msg.append(' ', el('button', { class: 'btn', onclick: () => openPuzzle(p) }, 'Play again'));
    }
    render();
    modal(el('div', { class: 'puzzle' }, el('div', { class: 'tag' }, 'PROCESS FLOW PUZZLE · Module' + (p.modules.length > 1 ? 's ' : ' ') + p.modules.join(', ')), el('h2', null, p.title), el('p', null, p.intro), pool, msg, placed), { wide: true });
  }
  function openStudyHall() {
    const mods = Object.keys(QUIZ).map(Number).sort((a, b) => a - b);
    const total = mods.reduce((a, m) => a + QUIZ[m].questions.length, 0); const done = Object.keys(S.answered).length;
    const frac = total ? done / total : 0; const C = 2 * Math.PI * 34;
    const ring = el('div', { class: 'pring', html: `<svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="8"/><circle cx="42" cy="42" r="34" fill="none" stroke="#5fd6a3" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(frac * C).toFixed(1)} ${C.toFixed(1)}"/></svg><b>${Math.round(frac * 100)}%</b>` });
    modal(el('div', null,
      el('div', { class: 'tag' }, 'STUDY HALL'), el('h2', null, 'Research grants for learning'),
      el('div', { class: 'study-head' }, ring, el('p', null, `${done} of ${total} questions answered. Every first-time correct answer pays a grant (${fmt$(grantAmount())} right now) and adds 0.5% to the knowledge multiplier on all revenue, now ×${knowledgeMult().toFixed(3)}. Pick a module; each cell fills as you clear it.`)),
      el('div', { class: 'study-grid' }, mods.map(m => {
        const q = QUIZ[m]; const c = q.questions.filter((_, i) => S.answered[m + ':' + i]).length; const p = Math.round(100 * c / q.questions.length);
        return el('button', { class: 'study-cell' + (c === q.questions.length ? ' done' : ''), style: '--p:' + p + '%', onclick: () => quizGate('Study: Module ' + String(m).padStart(2, '0'), [m], q.questions.length, () => { toast('Module complete', 'You answered every question in Module ' + String(m).padStart(2, '0') + '.'); save(); }, grantAmount) },
          el('b', null, 'MODULE ' + String(m).padStart(2, '0')), el('span', null, q.file.replace(/^\d+-/, '').replace(/-/g, ' ')), el('small', null, `${c}/${q.questions.length}`));
      }))
    ), { wide: true });
  }
  function openRisk() {
    modal(el('div', null,
      el('div', { class: 'tag' }, 'RISK & RESILIENCE · Modules 00, 04, 20'), el('h2', null, 'Chokepoints and how to survive them'),
      el('p', null, 'The course names three chokepoints (EUV, the leading-edge foundry in Taiwan, CoWoS and HBM) and a fourth in Japanese materials protected by qualification lock-in. Events in this game come from those chapters. Mitigations are one-time purchases.'),
      el('div', { class: 'mitig' }, SG.MITIGATIONS.map(m => el('div', { class: 'mitig-row' + (S.mitig[m.id] ? ' owned' : '') },
        el('div', null, el('b', null, m.name), el('div', { class: 'small' }, m.text)),
        S.mitig[m.id] ? el('span', { class: 'tag' }, 'OWNED') : el('button', { class: 'btn', disabled: S.cash < m.cost ? '' : null, onclick: () => { if (S.cash < m.cost) return; S.cash -= m.cost; S.stats.capex += m.cost; S.mitig[m.id] = true; log('Bought ' + m.name, 'build'); save(); openRisk(); } }, 'Buy ' + fmt$(m.cost))
      ))),
      el('h3', null, 'Active events'),
      S.events.length ? el('ul', null, S.events.map(ev => { const e = SG.EVENTS.find(x => x.id === ev.id); return el('li', null, e.title + ' — ' + Math.ceil(ev.endsDay - S.day) + ' days left'); })) : el('p', { class: 'muted' }, 'None right now.')
    ), { wide: true });
  }
  function openFabFloor() {
    // serpentine layout: the wafer route runs left→right along the top row and right→left along the bottom row
    const order = ['bay-clean', 'bay-oxdep', 'bay-litho', 'bay-etch', 'bay-metro', 'bay-beol', 'bay-feol', 'bay-implant'];
    const floor = el('div', { class: 'floor' });
    order.forEach(id => {
      const M = SG.MISSIONS[id]; const done = !!S.bays[id]; const req = REQUIRED_BAYS.includes(id); const step = REQUIRED_BAYS.indexOf(id) + 1;
      const tile = el('div', { class: 'bay-tile' + (done ? ' done' : '') + (req ? ' req' : ' opt'), 'data-bay': id },
        el('span', { class: 'bay-n' }, req ? 'STEP ' + step + ' OF 6 · REQUIRED' : 'SUPPORT · OPTIONAL +10%'),
        el('b', null, M.title.replace(/ bay.*$/i, '')),
        el('span', { class: 'small' }, M.brief[0].h),
        done ? el('span', { class: 'ok small' }, ic('check'), 'commissioned' + (S.missions[id] ? ` · ${S.missions[id].targets}/${S.missions[id].targetsTotal} targets` : ''))
          : el('button', { class: 'btn primary small', disabled: S.cash < M.cost ? '' : null, onclick: () => { if (S.cash < M.cost) return; runMission(id, results => { S.cash -= M.cost; S.stats.capex += M.cost; S.bays[id] = true; applyMissionBonus('fab', results, true); log('Commissioned ' + M.title + ' for ' + fmt$(M.cost), 'build'); toast('✅ Bay commissioned', M.title); buildChain(); save(); openFabFloor(); }); } }, 'Commission · ' + fmt$(M.cost)));
      floor.append(tile);
    });
    // chevrons in the gutters mark the wafer's route through the six process bays
    requestAnimationFrame(() => {
      const fr = floor.getBoundingClientRect(); if (!fr.width) return;
      const tiles = REQUIRED_BAYS.map(id => floor.querySelector('.bay-tile[data-bay="' + id + '"]')).filter(Boolean);
      for (let i = 0; i < tiles.length - 1; i++) {
        const a = tiles[i].getBoundingClientRect(), b = tiles[i + 1].getBoundingClientRect();
        const sameRow = Math.abs(a.top - b.top) < 4;
        const x = sameRow ? (Math.max(a.right, b.right) + Math.min(a.left, b.left)) / 2 : a.left + a.width / 2;
        const y = sameRow ? a.top + a.height / 2 : (a.bottom + b.top) / 2;
        const dir = sameRow ? (b.left > a.left ? 0 : 180) : 90;
        floor.append(el('span', { class: 'chev', style: `left:${(x - fr.left).toFixed(1)}px; top:${(y - fr.top).toFixed(1)}px; transform: translate(-50%,-50%) rotate(${dir}deg)` }, '›'));
      }
    });
    modal(el('div', null, el('div', { class: 'tag' }, 'FAB FLOOR · Modules 05–13'), el('h2', null, 'The eight bays'),
      el('p', null, `A fab is a floor of tool bays that every wafer visits dozens of times; the dashed route is the wafer's path through the six process bays. They must all be commissioned before the first wafer moves (${REQUIRED_BAYS.filter(b => S.bays[b]).length}/6 done). Each bay is its own mission; targets reached in the bays lower your killer-defect density permanently.`),
      floor), { wide: true });
  }
  function openNodeMigration() {
    const order = ['N5', 'N3', 'N2']; const cur = order.indexOf(S.node); const nextNode = order[cur + 1];
    const id = nextNode === 'N3' ? 'node-n3' : nextNode === 'N2' ? 'node-n2' : null;
    const stops = [['N5', 16000, 1], ['N3', 19000, 1.35], ['N2', 30000, 1.7]];
    const timeline = el('div', { class: 'timeline' }, stops.map(([n, price, dens], i) => el('div', { class: 'tl-stop' + (i < cur ? ' done' : i === cur ? ' cur' : '') }, el('div', { class: 'tl-dot' }), el('b', null, n), el('span', { class: 'small' }, `${fmt$(price)}/wafer · silicon ×${dens}`))));
    // the yield learning curve on this node: D0 = 0.05 + 0.45·e^(−wafers/20,000)
    const W = 600, H = 150, pad = 30; const XM = Math.max(100000, S.wafersRun * 1.15); const xs = w => pad + (w / XM) * (W - pad - 10); const ys = d => H - 22 - (d / 0.5) * (H - 40);
    let d = ''; for (let w = 0; w <= XM; w += XM / 60) d += (w ? 'L' : 'M') + xs(w).toFixed(1) + ' ' + ys(0.05 + 0.45 * Math.exp(-w / 20000)).toFixed(1);
    const cx = xs(S.wafersRun), cy = ys(currentD0());
    const curve = el('div', { html: `<svg class="curve" viewBox="0 0 ${W} ${H}"><path d="M${pad} ${H - 22}H${W - 10}" stroke="#34445a" stroke-width="1"/><path d="M${pad} ${ys(0.5)}V${H - 22}" stroke="#34445a" stroke-width="1"/><path d="${d}" fill="none" stroke="#62b1e0" stroke-width="2.5"/><path d="M${pad} ${ys(0.1)}H${W - 10}" stroke="#5fd6a3" stroke-width="1" stroke-dasharray="4 4"/><text x="${pad + 8}" y="${ys(0.1) - 5}" fill="#5fd6a3" font-size="10" font-family="JetBrains Mono, monospace">mature D0 ≈ 0.1</text><circle cx="${cx}" cy="${cy}" r="6" fill="#f3cd6e"/><text x="${cx > W * 0.6 ? cx - 12 : cx + 12}" y="${cy - 14}" fill="#f3cd6e" font-size="11" text-anchor="${cx > W * 0.6 ? 'end' : 'start'}" font-family="JetBrains Mono, monospace">you: ${currentD0().toFixed(3)} after ${fmtN(S.wafersRun)} wafers</text><text x="${pad}" y="${H - 6}" fill="#8d9aab" font-size="10" font-family="JetBrains Mono, monospace">0</text><text x="${W - 10}" y="${H - 6}" fill="#8d9aab" font-size="11" text-anchor="end" font-family="JetBrains Mono, monospace">${fmtN(XM)} wafers run on this node</text><text x="${pad + 4}" y="${ys(0.5) + 11}" fill="#8d9aab" font-size="11" font-family="JetBrains Mono, monospace">D0 0.5/cm²</text></svg>`.replace(/font-size="10"/g, 'font-size="11"') });
    const body = el('div', null, el('div', { class: 'tag' }, 'PROCESS NODE · Modules 11, 20'), el('h2', null, 'Current node: ' + S.node), timeline, curve,
      el('p', null, `Finished wafers sell for ${fmt$(S.nodeFx.waferPrice)}, fab opex is ${fmt$(S.nodeFx.opex)} per wafer, and your GPU's silicon is worth ×${S.nodeFx.density} per mm² versus N5. Every node starts its own learning curve: D0 falls only with wafers run on it.`));
    if (!id) body.append(el('p', { class: 'ok' }, 'You are on the leading node. Push D0 down and redesign for it.'));
    else {
      const M = SG.MISSIONS[id];
      body.append(el('p', null, el('b', null, 'Migrate to ' + nextNode + ' for ' + fmt$(M.cost) + '. '), `Wafer price rises to ${fmt$(M.effect.waferPrice)}, opex to ${fmt$(M.effect.opex)}, silicon value ×${M.effect.density}. The yield learning curve restarts: D0 goes back to ~0.5/cm² and falls only as you run wafers on the new node.`),
        el('button', { class: 'btn primary', disabled: S.cash < M.cost ? '' : null, onclick: () => { if (S.cash < M.cost) return; runMission(id, results => { S.cash -= M.cost; S.stats.capex += M.cost; S.node = M.effect.node; S.nodeFx = { waferPrice: M.effect.waferPrice, opex: M.effect.opex, density: M.effect.density }; S.wafersRun = 0; applyMissionBonus('fab', results, true); log(`Migrated the fab to ${M.effect.node}. D0 learning restarts.`, 'build'); toast('⬆ Node migration', 'Welcome to ' + M.effect.node + '. Watch D0 in the header.'); buildChain(); save(); }); } }, 'Start the migration mission'));
    }
    modal(body, { wide: true });
  }
  function showWin() {
    modal(el('div', null, el('div', { class: 'tag' }, 'SAND → GPU'), el('h2', null, 'You shipped a rack.'),
      el('p', null, `Day ${Math.floor(S.day)}. Quartz became metallurgical silicon, then 9N polysilicon, a single crystal, a polished wafer, ~1,000 fab steps, a sorted die, an HBM stack, a CoWoS package, a tested GPU, and finally a 72-GPU NVLink domain drawing ~120 kW.`),
      el('p', null, `You have answered ${Object.keys(S.answered).length} of the course's quiz questions and earned ${Object.keys(S.ach).length} achievements. The chain keeps running: push D0 down, migrate the node, redesign for bigger dies, and finish the Study Hall.`),
      el('button', { class: 'btn primary', onclick: closeModal }, 'Keep building')));
  }
  function offlineProgress() {
    const away = (Date.now() - (S.lastSeen || Date.now())) / 1000;
    if (away < 60 || !S.st.furnace.on) return;
    const days = Math.min(60, Math.floor(away / 2)); const before = S.cash;
    simulating = true; for (let i = 0; i < days * 2; i++) tick(0.5); simulating = false;
    const gained = S.cash - before;
    log(`While you were away (${Math.round(away / 60)} min): the chain ran ${days} days, ${gained >= 0 ? 'earning ' + fmt$(gained) : 'losing ' + fmt$(-gained)}.`, 'ach');
    modal(el('div', null, el('div', { class: 'tag' }, 'WHILE YOU WERE AWAY'), el('h2', null, gained >= 0 ? '+' + fmt$(gained) : fmt$(gained)),
      el('p', null, `Your chain kept running for ${days} game days (one day for every two seconds away, up to 60 days per absence). Warehouses that filled up sold surplus at market price.`),
      el('button', { class: 'btn primary', onclick: closeModal }, 'Back to work')));
  }

  // ---------- objective ----------
  function objective() {
    if (!S.st.mine.on) return { text: 'Commission the quartz mine (free). It is the tutorial.', pct: 0 };
    const nextLocked = SG.STATIONS.find(s => !S.st[s.id].on);
    const sub = cost => `${fmt$(Math.min(S.cash, cost))} / ${fmt$(cost)}`;
    if (S.st.mine.on && !S.st.furnace.on && S.cash < byId.furnace.cost) return { text: `Arc Furnace · ${fmt$(byId.furnace.cost)} — sell quartz, or click the mine to run manual shifts.`, pct: Math.min(1, S.cash / byId.furnace.cost), sub: sub(byId.furnace.cost) };
    if (S.st.fab.on && !baysReady()) { const done = REQUIRED_BAYS.filter(b => S.bays[b]).length; const next = REQUIRED_BAYS.find(b => !S.bays[b]); const M = SG.MISSIONS[next]; return { text: `${M.title} · ${fmt$(M.cost)} — bays ${done}/6; you are outsourcing ${6 - done} step${6 - done > 1 ? 's' : ''} at ${fmt$(outsourceFee())}/wafer.`, pct: Math.min(1, S.cash / M.cost), sub: sub(M.cost) }; }
    if (nextLocked) return { text: `${nextLocked.name} · ${fmt$(nextLocked.cost)} — ${nextLocked.oneShot ? 'tape out a design' : 'commission it'}.`, pct: Math.min(1, S.cash / Math.max(1, nextLocked.cost)), sub: sub(nextLocked.cost) };
    if (S.node !== 'N2') { const id = S.node === 'N5' ? 'node-n3' : 'node-n2'; const M = SG.MISSIONS[id]; const ready = currentD0() < 0.1; return { text: ready ? `Migrate to ${M.effect.node} · ${fmt$(M.cost)} — resets D0 (≈${fmtN(diesPerWafer(S.design.A) * yieldModel(S.design.model || 'nb', S.design.A / 100, 0.5, 3))} good dies/wafer for ~20k wafers).` : `Racks shipping. Push D0 below 0.1 before migrating to ${M.effect.node}; each node restarts yield learning.`, pct: ready ? Math.min(1, S.cash / M.cost) : Math.min(1, (0.5 - currentD0()) / 0.4), sub: ready ? sub(M.cost) : `D0 ${currentD0().toFixed(3)} → 0.100` }; }
    return { text: 'Leading edge reached. Push D0 down, finish the Study Hall, collect every achievement.', pct: Object.keys(S.answered).length / 176, sub: Object.keys(S.answered).length + '/176 questions' };
  }

  // ---------- rendering ----------
  const cards = {}; const belts = {}; let shownCash = S.cash;
  function buildChain() {
    const host = $('#chain'); host.innerHTML = ''; for (const k in cards) delete cards[k]; for (const k in belts) delete belts[k];
    SG.STATIONS.forEach((s, idx) => {
      const st = S.st[s.id]; const on = st.on; const color = SG.STAGE_COLORS[s.id] || '#5fa8d3';
      const card = el('div', { class: 'station ' + (on ? 'on' : 'locked') + (s.parallel ? ' parallel' : ''), 'data-id': s.id, style: '--c:' + color });
      const modLabel = s.modules.length > 3 ? 'Modules ' + String(s.modules[0]).padStart(2, '0') + '–' + String(s.modules[s.modules.length - 1]).padStart(2, '0') : 'Module' + (s.modules.length > 1 ? 's ' : ' ') + s.modules.map(m => String(m).padStart(2, '0')).join(', ');
      const topRow = el('div', { class: 'st-top' }, el('div', { class: 'st-title' }, el('div', { class: 'st-name' }, s.name), el('div', { class: 'st-stage' }, 'Stage ' + s.stage + ' · ' + modLabel)));
      const lvlPill = on && !s.oneShot ? el('span', { class: 'lvl' }, 'L' + st.level + (tier(s) ? ' · T' + tier(s) : '')) : (on ? el('span', { class: 'lvl' }, 'built') : el('span', { class: 'lvl locked' }, 'locked'));
      // illustration: the course's apparatus scene or glyph, clickable for a manual shift
      const icon = el('button', { class: 'st-art', title: on ? 'Run a manual shift' : 'Locked', onclick: () => manualShift(s, icon) });
      const art = SG.STATION_ART[s.id];
      if (art && art.scene && window.SG_SCENES && window.SG_SCENES[art.scene]) { const sc = window.SG_SCENES[art.scene]; icon.innerHTML = `<figure class="section-figure sf-scene"><div class="sf-drawing"><svg viewBox="${art.box || ('0 0 700 ' + sc.height)}" preserveAspectRatio="xMidYMid meet"><defs><marker id="${sc.marker}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 6 3 0 6" class="sf-arrowhead"/></marker></defs>${sc.art}</svg></div></figure>`; }
      else if (art && art.glyph && window.SG_GLYPHS && window.SG_GLYPHS[art.glyph]) { icon.innerHTML = `<figure class="section-figure"><div class="sf-drawing"><svg viewBox="-54 -49 108 98" class="glyph">${window.SG_GLYPHS[art.glyph]}</svg></div></figure>`; }
      else icon.textContent = s.icon;
      icon.append(lvlPill);
      if (!s.oneShot) icon.append(el('span', { class: 'ring' }, el('span', { html: '<svg viewBox="0 0 44 44"><circle class="ring-bg" cx="22" cy="22" r="18"/><circle class="ring-fg" cx="22" cy="22" r="18"/></svg>' }), on ? el('span', { class: 'ring-t' }, '0%') : ic('lock')));
      card.append(icon, topRow);
      if (!on) card.append(el('p', { class: 'st-short' }, s.short));
      if (s.parallel) { lvlPill.textContent += ' · PARALLEL'; lvlPill.title = 'Parallel branch: uses polished wafers, feeds CoWoS'; }
      const status = el('div', { class: 'status' }); card.append(status);
      const actions = el('div', { class: 'actions' });
      if (!on) actions.append(el('button', { class: 'btn primary unlock', onclick: () => unlock(s) }, ic('play'), s.cost === 0 ? 'Commission (free)' : `${s.oneShot ? 'Tape out' : 'Commission'} · ${fmt$(s.cost)}`));
      else {
        if (!s.oneShot) actions.append(el('button', { class: 'btn primary upg', onclick: () => upgrade(s) }, ic('up'), 'Upgrade'));
        if (s.oneShot) actions.append(el('button', { class: 'btn primary', onclick: () => openLab('reticle') }, ic('ruler'), 'Design Studio'));
        if (s.id === 'fab') icon.append(el('span', { class: 'art-chips' },
          el('span', { class: 'chip-btn' + (baysReady() ? '' : ' attention'), role: 'button', title: 'Fab floor', onclick: e => { e.stopPropagation(); openFabFloor(); } }, ic('building'), `Bays ${REQUIRED_BAYS.filter(b => S.bays[b]).length}/6`),
          el('span', { class: 'chip-btn', role: 'button', title: 'Process node', onclick: e => { e.stopPropagation(); openNodeMigration(); } }, ic('chip'), S.node)));
      }
      const more = el('div', { class: 'more' });
      more.append(el('button', { class: 'btn ghost', title: 'Field guide', onclick: () => openGuide(s) }, ic('book'), 'Guide'));
      const extras = [];
      if (on && s.lab && !s.oneShot) extras.push(el('button', { class: 'btn ghost' + (S.labs[s.lab] ? ' done' : ''), title: 'Lab: ' + SG.LABS[s.lab].title, onclick: () => openLab(s.lab) }, ic('flask'), SG.LABS[s.lab].title));
      if (on && s.lab2) extras.push(el('button', { class: 'btn ghost' + (S.labs[s.lab2] ? ' done' : ''), title: 'Lab: ' + SG.LABS[s.lab2].title, onclick: () => openLab(s.lab2) }, ic('flask'), SG.LABS[s.lab2].title));
      for (const p of SG.PUZZLES) if (on && p.station === s.id) extras.push(el('button', { class: 'btn ghost' + (S.puzzles[p.id] ? ' done' : ''), title: 'Puzzle: ' + p.title, onclick: () => openPuzzle(p) }, ic('puzzle'), p.title));
      if (extras.length >= 3) {
        const pop = el('div', { class: 'popover' }, extras);
        const toggle = el('button', { class: 'btn ghost', title: 'Labs and puzzles', onclick: e => { e.stopPropagation(); pop.classList.toggle('open'); } }, ic('flask'), `Labs & puzzles (${extras.length})`);
        document.addEventListener('click', ev => { if (!pop.contains(ev.target) && ev.target !== toggle) pop.classList.remove('open'); });
        more.append(toggle, pop);
      } else extras.forEach(b => more.append(b));
      if (on && SG.missions && SG.EXPLORE && SG.EXPLORE[s.id]) more.append(el('button', { class: 'btn ghost', title: 'Interactives and figures', onclick: () => SG.missions.explore(s.id, missionCtx, { title: s.name + ': interactives and figures' }) }, ic('compass'), 'Explore'));
      card.append(actions, more);
      host.append(card);
      cards[s.id] = { card, status, actions, icon };
      if (idx < SG.STATIONS.length - 1) {
        const outRes = Object.keys(s.outputs)[0];
        const belt = el('div', { class: 'belt', style: '--c:' + (outRes ? SG.RES[outRes].color : color) }, el('div', { class: 'belt-track' }), el('div', { class: 'belt-label' }, outRes ? (SG.RES_SHORT[outRes] || SG.RES[outRes].name) : ''), el('div', { class: 'belt-rate' }, ''));
        host.append(belt); belts[s.id] = belt;
      }
    });
    // minimap: one dot per station
    const mm = $('#minimap'); if (mm) { mm.innerHTML = ''; SG.STATIONS.forEach(s => mm.append(el('span', { class: 'mm', 'data-id': s.id, style: '--c:' + (SG.STAGE_COLORS[s.id] || '#5fa8d3'), title: s.name, onclick: () => { const c = cards[s.id]; if (c) c.card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); } }))); }
    renderResources(true); renderSide();
  }
  function updateChain() {
    for (const s of SG.STATIONS) {
      const c = cards[s.id]; if (!c) continue; const st = S.st[s.id];
      if (!st.on) {
        const ok = S.cash >= s.cost; const p = s.cost ? Math.min(1, S.cash / s.cost) : 1;
        c.status.innerHTML = `<div class="bar save"><div class="fill" style="width:${Math.round(p * 100)}%"></div></div><div class="small ${ok ? 'ok' : 'muted'}">${ok ? 'Affordable. Play the commissioning mission.' : `Saving: ${fmt$(S.cash)} of ${fmt$(s.cost)} (${pct(p)})`}</div>`;
        const b = c.actions.querySelector('.unlock'); if (b) b.disabled = !ok; continue;
      }
      if (s.oneShot) { c.status.innerHTML = S.design ? `<div class="small"><b>${S.design.name}</b>: ${S.design.n} × ${S.design.A} mm², ${S.design.h} HBM · ${S.design.model === 'poisson' ? 'Poisson' : S.design.model === 'murphy' ? 'Murphy' : 'negative binomial'} yield</div>` : '<div class="small warn">No design yet.</div>'; const d = $('#minimap .mm[data-id="' + s.id + '"]'); if (d) d.className = 'mm ' + (S.design ? 'on' : 'idle'); continue; }
      const f = flow[s.id]; const cap = capacity(s); const em = eventMult(s.id);
      const util = f ? f.util : 0; const fg = c.icon.querySelector('.ring-fg'); if (fg) { fg.style.strokeDasharray = `${(util * 113.1).toFixed(1)} 113.1`; } const rt = c.icon.querySelector('.ring-t'); if (rt) rt.textContent = pct(util);
      const ring = c.icon.querySelector('.ring'); if (ring) { ring.classList.toggle('ok', util >= 0.98); ring.classList.toggle('warn', !!(f && f.starved) || (util > 0 && util < 0.5)); }
      c.card.classList.toggle('running', util > 0.02); c.card.classList.toggle('starved', !!(f && f.starved));
      const mmDot = $('#minimap .mm[data-id="' + s.id + '"]'); if (mmDot) { mmDot.className = 'mm ' + (f && f.starved ? 'starved' : util > 0.02 ? 'on' : 'idle'); }
      let html = `<div class="st-rate"><b>${f ? fmtN(f.rate) : 0}</b><span class="muted">/ ${fmtN(cap)} per day</span><div class="util-bar"><i style="width:${Math.round(util * 100)}%"></i></div></div>`;
      const unitN = (r, v) => (['ingot', 'rack', 'gpu', 'pkg', 'hbm', 'die'].includes(r) ? fmtN(Math.floor(v)) : fmtN(v));
      const ins = Object.entries(s.inputs).map(([r, q]) => { const cap = warehouseCap(r); const p = isFinite(cap) && cap > 0 ? Math.min(1, S.res[r] / cap) : 0; return `<div class="stock${f && f.starved && S.res[r] < resolveQty(q) ? ' short' : ''}"><span class="stock-name" style="color:${SG.RES[r].color}">${SG.RES_SHORT[r] || SG.RES[r].name}</span><div class="bar"><div class="fill" style="width:${Math.round(p * 100)}%;background:${SG.RES[r].color}"></div></div><span class="stock-n">${unitN(r, S.res[r])}<small> / ${isFinite(cap) ? fmtN(cap) : '∞'}</small></span></div>`; }).join('');
      const outs = Object.entries(s.outputs).map(([r, q]) => { const cap = warehouseCap(r); const hasC = consumersOf(r).some(c => S.st[c.id].on); const p = hasC && isFinite(cap) && cap > 0 ? Math.min(1, S.res[r] / cap) : 0; return `<div class="stock out"><span class="stock-name" style="color:${SG.RES[r].color}">→ ${SG.RES_SHORT[r] || SG.RES[r].name}</span><div class="bar"><div class="fill" style="width:${Math.round(p * 100)}%;background:${SG.RES[r].color}"></div></div><span class="stock-n">${hasC ? unitN(r, S.res[r]) + '<small> / ' + fmtN(cap) + '</small>' : '<small>sells</small>'}</span></div>`; }).join('');
      html += `<div class="stocks">${ins}${outs}</div>`;
      let msg = '';
      const sv = n => `<svg class="ic"><use href="#i-${n}"/></svg>`;
      if (f && f.starved) msg = `<span class="warn">${sv('hourglass')}starved of ${f.starved}</span>`;
      else if (f && f.blocked) msg = `<span class="warn">${sv('box')}warehouse full: ${f.blocked}</span>`;
      else if (f && f.util >= 0.98 && (dump[Object.keys(s.outputs)[0]] || 0) > 0.1) msg = `<span class="warn">${sv('box')}dumping ${pct(dump[Object.keys(s.outputs)[0]])} of output on the spot market</span>`;
      else if (f && f.util >= 0.98) msg = `<span class="ok">${sv('bolt')}running flat out</span>`;
      else if (f && f.util > 0.02) msg = `<span class="muted">${sv('play')}running at ${pct(util)}</span>`;
      if (em < 1) msg += ` <span class="warn">event ×${em.toFixed(2)}</span>`;
      const extra = [];
      if (s.id === 'sort' && S.design) extra.push(`${diesPerWafer(S.design.A)} dies × ${pct(yieldModel(S.design.model || 'nb', S.design.A / 100, currentD0(), 3))} = ${fmtN(goodDiesPerWafer())} good/wafer`);
      if (s.id === 'hbm') { const hc = hbmConfig(); extra.push(`${hc.height}-high · stack yield ${pct(hbmStackYield(hc))}`); }
      if (s.id === 'systems') extra.push(`field failures ${(fieldFail() * 100).toFixed(2)}%`);
      if (s.id === 'fab') extra.push(`opex ${fmt$(stationOpex(s))}/wafer · ${S.node}` + (baysReady() ? '' : ` · outsourcing ${baysMissing().length} bay${baysMissing().length > 1 ? 's' : ''}`));
      const net = netPerDay(s); extra.unshift(`<span class="${net >= 0 ? 'ok' : 'warn'}">net ${net >= 0 ? '+' : ''}${fmt$(net)}/day</span>`);
      html += `<div class="st-msg">${msg}${extra.length ? '<div class="small muted">' + extra.join(' · ') + '</div>' : ''}</div>`;
      c.status.innerHTML = html;
      const u = c.actions.querySelector('.upg'); if (u) { const uc = upgradeCost(s); const pb = paybackDays(s); u.innerHTML = `⬆ L${st.level + 1} <span class="price">${fmt$(uc)}</span>${isFinite(pb) ? `<span class="price muted">· ${pb < 1 ? '<1' : fmtN(pb)} d payback</span>` : ''}`; u.disabled = S.cash < uc; u.classList.toggle('affordable', S.cash >= uc); u.title = isFinite(pb) ? `One more level adds ${fmt$(capacity(s) / Math.max(1, st.level) * valueAdd(s))}/day; pays back in ${fmtN(pb)} days` : 'This station loses money per cycle right now'; }
      const belt = belts[s.id]; if (belt) { const rate = f ? f.util : 0; belt.classList.toggle('paused', !f || f.rate <= 0); belt.style.setProperty('--dur', (rate > 0 ? (2.4 - 1.8 * Math.min(1, rate)) : 3).toFixed(2) + 's'); belt.style.setProperty('--gap', Math.round(30 - 18 * Math.min(1, rate)) + 'px'); const outRes = Object.keys(s.outputs)[0]; const br = belt.querySelector('.belt-rate'); if (br && outRes) br.textContent = f && f.rate > 0 ? fmtN(f.rate * resolveQty(s.outputs[outRes])) + '/d' : '—'; }
    }
  }
  const resRows = {};
  function renderResources(rebuild) {
    const host = $('#resources');
    if (rebuild) { host.innerHTML = ''; for (const k in resRows) delete resRows[k];
      for (const r of Object.keys(SG.RES)) {
        const row = el('div', { class: 'res-row', style: '--c:' + SG.RES[r].color });
        const sel = el('select', { onchange: e => { S.sell[r] = e.target.value; save(); } }, ['auto', 'hold', 'all'].map(v => el('option', { value: v, selected: (S.sell[r] || 'auto') === v ? '' : null }, v === 'auto' ? 'Auto' : v === 'hold' ? 'Hold' : 'Sell all')));
        row.append(el('span', { class: 'res-name' }, SG.RES[r].name), el('span', { class: 'res-stock' }), el('span', { class: 'res-price small muted' }), el('span', { class: 'res-sold small' }), sel);
        host.append(row); resRows[r] = row;
      }
    }
    for (const r of Object.keys(SG.RES)) {
      const row = resRows[r]; const p = producerOf(r);
      const visible = S.res[r] > 0 || (p && S.st[p.id].on) || (S.stats.sold[r] || 0) > 0;
      row.style.display = visible ? '' : 'none'; if (!visible) continue;
      row.querySelector('.res-stock').textContent = fmtN(S.res[r]) + ' ' + SG.RES[r].unit;
      const cap = warehouseCap(r); row.querySelector('.res-price').textContent = fmt$(priceOf(r)) + (isFinite(cap) && consumersOf(r).some(c => S.st[c.id].on) ? ` · cap ${fmtN(cap)}` : ' · spot');
      row.querySelector('.res-sold').textContent = (S.stats.sold[r] || 0) > 0 ? 'sold ' + fmtN(S.stats.sold[r]) : '';
    }
  }
  function renderLog() { const host = $('#log'); if (!host) return; host.innerHTML = ''; for (const l of S.log) host.append(el('div', { class: 'log-row ' + (l.cls || '') }, el('span', { class: 'log-day' }, 'd' + l.day), ' ', l.text)); }
  function renderSide() {
    const host = $('#achievements'); if (!host) return; host.innerHTML = '';
    const earned = SG.ACHIEVEMENTS.filter(a => S.ach[a.id]).length;
    host.append(el('div', { class: 'small muted' }, `${earned}/${SG.ACHIEVEMENTS.length} earned · revenue ×${(1 + (S.achMult || 0)).toFixed(2)} from achievements · ×${knowledgeMult().toFixed(3)} from knowledge`));
    for (const a of SG.ACHIEVEMENTS) host.append(el('div', { class: 'ach' + (S.ach[a.id] ? ' earned' : '') }, el('span', { class: 'ach-ic' }, ic('trophy')), el('div', null, el('b', null, a.title), el('div', { class: 'small muted' }, a.text + ' · ' + (a.reward.mult ? '+' + Math.round(a.reward.mult * 100) + '% revenue' : '+' + fmt$(a.reward.cash))))));
  }
  function renderHeader() {
    $('#h-day').textContent = String(Math.floor(S.day));
    shownCash += (S.cash - shownCash) * 0.35; if (Math.abs(S.cash - shownCash) < 1) shownCash = S.cash;
    $('#h-cash').textContent = fmt$(shownCash); $('#h-cash').classList.toggle('neg', S.cash < 0);
    $('#h-income').textContent = (S.income >= 0 ? '+' : '') + fmt$(S.income) + '/day'; $('#h-income').classList.toggle('neg', S.income < 0);
    $('#h-d0').textContent = currentD0().toFixed(3) + '/cm²';
    $('#h-node').textContent = S.node + ' · ' + fmtN(S.wafersRun) + ' wafers';
    const total = Object.values(QUIZ).reduce((a, q) => a + q.questions.length, 0);
    $('#h-know').textContent = Object.keys(S.answered).length + '/' + total;
    $('#h-mult').textContent = '×' + revMult().toFixed(2);
    $('#h-events').textContent = S.events.length ? S.events.length + ' event' + (S.events.length > 1 ? 's' : '') : '';
    const o = objective(); $('#obj-text').textContent = o.text; $('#obj-fill').style.width = Math.round((o.pct || 0) * 100) + '%'; $('#obj-sub').textContent = o.sub || '';
    let cl = $('#contract-line'); if (!cl) { cl = el('div', { id: 'contract-line', class: 'small gold' }); $('.obj-body').append(cl); }
    cl.textContent = S.contract ? `Contract: ${fmtN(S.contract.delivered)} / ${fmtN(S.contract.n)} ${SG.RES_SHORT[S.contract.r] || S.contract.r} · ${Math.max(0, Math.ceil(S.contract.deadline - S.day))} days left · +30%` : '';
    const ready = (o.pct || 0) >= 1 && !!o.sub; $('#obj-tag').textContent = ready ? 'READY' : 'NEXT'; $('#obj-tag').classList.toggle('ready', ready);
    const nextLocked = SG.STATIONS.find(s => !S.st[s.id].on); document.querySelectorAll('#minimap .mm').forEach(d => d.classList.toggle('next', !!nextLocked && d.dataset.id === nextLocked.id));
  }
  function flushFloaters() {
    let total = 0; let lastRes = null;
    for (const r of Object.keys(soldTick)) { if (soldTick[r] > 0) { total += soldTick[r]; lastRes = r; soldTick[r] = 0; } }
    if (total > 0 && lastRes) { const p = producerOf(lastRes); const c = p && cards[p.id]; if (c) floatText(c.icon, '+' + fmt$(total), 'gold'); }
  }

  // ---------- loop ----------
  let last = performance.now(); let acc = 0, acc2 = 0;
  function frame(now) {
    const dtReal = Math.min(1.0, (now - last) / 1000); last = now;
    const speed = S.speed == null ? 1 : S.speed;
    if (speed > 0 && !modalRoot().classList.contains('open')) { let remaining = dtReal * speed; while (remaining > 1e-6) { const h = Math.min(0.1, remaining); tick(h); remaining -= h; } }
    acc += dtReal; acc2 += dtReal;
    if (acc > 0.25) { acc = 0; renderHeader(); updateChain(); renderResources(false); }
    if (acc2 > 1.0) { acc2 = 0; checkAchievements(); flushFloaters(); }
    requestAnimationFrame(frame);
  }
  setInterval(save, 5000);

  // ---------- wiring ----------
  function init() {
    $('#btn-study').addEventListener('click', openStudyHall);
    $('#btn-risk').addEventListener('click', openRisk);
    $('#btn-help').addEventListener('click', showHelp);
    $('#btn-reset').addEventListener('click', () => { if (confirm('Start over? This wipes your save.')) { S = freshState(); localStorage.removeItem(SAVE_KEY); buildChain(); renderLog(); } });
    $('#speed').addEventListener('change', e => { S.speed = Number(e.target.value); });
    $('#speed').value = String(S.speed == null ? 1 : S.speed);
    document.querySelectorAll('.side-tab').forEach(t => t.addEventListener('click', () => { document.querySelectorAll('.side-tab').forEach(x => x.classList.toggle('sel', x === t)); document.querySelectorAll('.side-pane').forEach(p => p.classList.toggle('show', p.id === t.dataset.pane)); }));
    buildChain(); renderLog(); renderHeader();
    // establishing shot: pan from the rack end of the line back to the mine
    const wrap = $('.chain-wrap');
    let panned = false; try { panned = sessionStorage.getItem('sg-panned') === '1'; } catch (e) {}
    const reduce = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (wrap && !PARAMS.has('open') && !panned && !reduce && !document.hidden && wrap.scrollWidth > wrap.clientWidth + 40) {
      try { sessionStorage.setItem('sg-panned', '1'); } catch (e) {}
      const from = wrap.scrollWidth - wrap.clientWidth; wrap.scrollLeft = from; const t0 = performance.now();
      (function pan(now) { const k = Math.min(1, (now - t0) / 1400); wrap.scrollLeft = from * Math.pow(1 - k, 3); if (k < 1) requestAnimationFrame(pan); })(t0);
    }
    if (PARAMS.has('demo')) { if (PARAMS.get('speed') != null) S.speed = Number(PARAMS.get('speed')); openView(PARAMS.get('open')); }
    else if (!S.log.length) { log('Welcome. You have a quartz claim and $300k. Build the chain from sand to a 72-GPU rack. Every station is a commissioning mission: brief, build it, tune the real thing, certify. Click a station icon to run a manual shift.', 'milestone'); showHelp(); }
    else offlineProgress();
    requestAnimationFrame(frame);
  }
  // ?open=mission:furnace | fabfloor | node | study | risk | help | win | rush | lab:reticle | guide:cz | explore:cz | puzzle:litho | event:quake
  function openView(spec) {
    if (!spec) return; const [kind, id] = spec.split(':');
    const views = { fabfloor: openFabFloor, node: openNodeMigration, study: openStudyHall, risk: openRisk, help: showHelp, win: showWin, rush: spawnRush };
    if (views[kind]) return views[kind]();
    if (kind === 'mission') return runMission(id, () => {});
    if (kind === 'lab') return openLab(id);
    if (kind === 'guide' && byId[id]) return openGuide(byId[id]);
    if (kind === 'explore' && SG.missions) return SG.missions.explore(id, missionCtx, { title: (byId[id] ? byId[id].name : id) + ': interactives and figures' });
    if (kind === 'puzzle') { const p = SG.PUZZLES.find(p => p.id === id); if (p) openPuzzle(p); return; }
    if (kind === 'event') { const e = SG.EVENTS.find(e => e.id === id); if (e) { S.events.push({ id: e.id, endsDay: S.day + e.days }); fireEvent(e); } }
  }
  function showHelp() {
    modal(el('div', null,
      el('div', { class: 'tag' }, 'HOW TO PLAY'), el('h2', null, 'Sand to GPU: Foundry'),
      el('p', null, 'A production-chain game built from the course. One game second is one day. Resources flow left to right along the belt; whatever the furthest station makes is sold, and upstream surplus beyond a 30-day warehouse (sized to what the next station can actually use) sells at market price.'),
      el('ul', null,
        el('li', null, el('b', null, 'Commission each station. '), 'No reading required first: a briefing on the course\'s figures, then you assemble the machine part by part on the course\'s own drawing, then you tune the course\'s real interactives against live targets, then a short certification from the course\'s quizzes.'),
        el('li', null, el('b', null, 'Click to work. '), 'Click any station illustration to run a manual shift (10% of a day). Contract offers pop up now and then: three days of output within eight, at +30%, with a penalty for a shortfall.'),
        el('li', null, el('b', null, 'Find the bottleneck. '), 'Cards show the gauge, "starved of X" and "warehouse full". Upgrade levels; every fifth level is an automation tier worth +25%.'),
        el('li', null, el('b', null, 'Go deep in the fab. '), 'Eight tool bays, each its own mission. Six are required before a wafer moves. Later, migrate the node and watch D0 learning restart.'),
        el('li', null, el('b', null, 'Multiply. '), 'Every question answered right on the first try adds 0.5% to all revenue forever and pays a grant scaled to your next goal; achievements add more. Your chain keeps running while you are away (up to 60 days).')),
      el('p', { class: 'small muted' }, 'Capex and rates are scaled for play; the numbers in the briefings, widgets, labs and quizzes are the course\'s.'),
      el('button', { class: 'btn primary', onclick: closeModal }, 'To the floor')
    ), { wide: true });
  }
  window.addEventListener('DOMContentLoaded', init);
  SG.engine = { get S() { return S; }, buildChain, openLab, priceOf, currentD0, tick, upgradeCost, capacity, byId, flow, spawnRush, valueAdd, netPerDay, warehouseCap };
})();
