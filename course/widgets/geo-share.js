/* geo-share — selected supplier footprints (Module 20).
 * Company roles: official catalogs linked in course/review/neutrality-visuals-2026-09-14.md.
 * This is a qualitative roster, not a market-share or factory-location dataset. */
(function () {
  'use strict';
  const COUNTRIES = {
    TW: { name: 'Taiwan', v: 'var(--accent)' },
    KR: { name: 'South Korea', v: 'var(--accent2)' },
    JP: { name: 'Japan', v: 'var(--cu)' },
    NL: { name: 'Netherlands', v: 'var(--warn)' },
    US: { name: 'United States', v: 'var(--ok)' },
    CN: { name: 'China', v: 'var(--si)' },
    DE: { name: 'Germany', v: 'var(--ink)' },
  };
  // Geography describes these selected companies' headquarters, except the
  // explicitly labeled Siemens parent group. It does not assign their factories.
  const LAYERS = [
    { label: 'EUV lithography', entries: [['NL', 'ASML']] },
    { label: 'Immersion DUV lithography', entries: [['NL', 'ASML'], ['JP', 'Nikon']] },
    { label: 'Wafer processing equipment', entries: [['US', 'Applied Materials, Lam Research'], ['JP', 'Tokyo Electron, SCREEN'], ['NL', 'ASML, ASM International'], ['CN', 'NAURA, AMEC']] },
    { label: 'Silicon wafers', entries: [['JP', 'Shin-Etsu, SUMCO'], ['TW', 'GlobalWafers'], ['KR', 'SK Siltron'], ['DE', 'Siltronic'], ['CN', 'NSIG / Shanghai Xinsheng']] },
    { label: 'Photoresist', entries: [['JP', 'JSR, TOK, Shin-Etsu, Fujifilm'], ['DE', 'Merck / EMD']] },
    { label: 'Foundry services', entries: [['TW', 'TSMC, UMC, PSMC, VIS'], ['CN', 'SMIC, Hua Hong'], ['KR', 'Samsung'], ['US', 'GlobalFoundries, Intel Foundry']] },
    { label: 'DRAM', entries: [['KR', 'Samsung, SK hynix'], ['US', 'Micron'], ['CN', 'CXMT']] },
    { label: 'NAND', entries: [['KR', 'Samsung, SK hynix'], ['JP', 'Kioxia'], ['US', 'Micron'], ['CN', 'YMTC']] },
    { label: 'HBM', entries: [['KR', 'SK hynix, Samsung'], ['US', 'Micron']] },
    { label: 'Packaging services', entries: [['TW', 'ASE / SPIL, TSMC'], ['CN', 'JCET, Tongfu'], ['US', 'Amkor']] },
    { label: 'EDA software', entries: [['US', 'Synopsys, Cadence'], ['DE', 'Siemens EDA — German parent group'], ['CN', 'Empyrean']] },
    { label: 'Fabless design', entries: [['US', 'NVIDIA, AMD, Qualcomm, Broadcom'], ['TW', 'MediaTek'], ['CN', 'HiSilicon, UNISOC']] },
  ];

  window.registerWidget('geo-share', {
    title: 'Who Makes What: Selected Supplier Footprints',
    caption: 'Explore company examples by supply-chain role. The country or region identifies headquarters, or an explicitly named parent group. Card size and order do not represent market share, production capacity or technical equivalence.',
    mount(el, ctx) {
      const { h } = ctx;
      let activeCountry = null;
      const cards = [];
      const tip = h('div', { class: 'w-note', 'aria-live': 'polite' }, 'Select a country or region to highlight its examples. These lists are not exhaustive; an absent entry does not mean no activity.');
      const rows = h('div', { style: { display: 'grid', gap: '14px' } });
      LAYERS.forEach(layer => {
        const examples = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', minWidth: '0' } });
        layer.entries.forEach(([cc, companies]) => {
          const card = h('div', { style: { flex: '1 1 170px', minWidth: '0', padding: '8px 10px', border: '1px solid var(--line)', borderLeft: `3px solid ${COUNTRIES[cc].v}`, borderRadius: '5px', background: 'var(--panel)', fontSize: '12px', overflowWrap: 'anywhere' } },
            h('div', { style: { fontWeight: '650', marginBottom: '3px' } }, COUNTRIES[cc].name),
            h('div', { style: { lineHeight: '1.45' } }, companies));
          cards.push({ el: card, cc }); examples.append(card);
        });
        rows.append(h('div', { style: { display: 'grid', gap: '8px', alignItems: 'start' } },
          h('div', { style: { fontSize: '13px', fontWeight: '650', paddingTop: '8px' } }, layer.label), examples));
      });
      const legend = h('div', { class: 'w-legend', 'aria-label': 'Highlight supplier headquarters or parent group' });
      const buttons = new Map();
      Object.entries(COUNTRIES).forEach(([cc, country]) => {
        const button = h('button', { class: 'w-btn', 'aria-pressed': 'false', 'data-country': cc }, country.name);
        button.addEventListener('click', () => {
          activeCountry = activeCountry === cc ? null : cc;
          cards.forEach(card => { card.el.style.opacity = activeCountry && card.cc !== activeCountry ? '.35' : '1'; });
          buttons.forEach((btn, key) => { btn.classList.toggle('primary', key === activeCountry); btn.setAttribute('aria-pressed', String(key === activeCountry)); });
          const roles = LAYERS.filter(layer => layer.entries.some(entry => entry[0] === activeCountry)).map(layer => layer.label);
          tip.textContent = activeCountry
            ? COUNTRIES[activeCountry].name + ' examples shown: ' + roles.join(' · ') + '. This is a selected roster, not a complete national capability inventory.'
            : 'Select a country or region to highlight its examples. These lists are not exhaustive; an absent entry does not mean no activity.';
        });
        buttons.set(cc, button); legend.append(button);
      });
      el.append(legend, tip, rows,
        h('div', { class: 'w-note' }, 'Supplier examples reviewed September 2026. A company can design, manufacture or serve customers in several countries. Capabilities also differ by process, product and qualification. Assembly location, customer billing and final use are separate measures; none is plotted as a market-share percentage here.'));
      return () => {};
    }
  });
})();
