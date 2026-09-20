// Game-only incentives. Course physics and certification answers stay unchanged.
(function (root) {
  const jobs = [
    { id: 'first-station', title: 'Break ground', text: 'Commission your quartz mine. Every great chip starts with a rock.', target: 1, value: s => +s.st.mine.on, reward: 25000, station: 'mine', action: 'Commission mine' },
    { id: 'hands-on', title: 'Get your hands dirty', text: 'Run 8 productive manual shifts by clicking a working machine.', target: 8, value: s => s.shift.work, reward: 40000, station: 'mine', action: 'Go to the mine' },
    { id: 'capacity', title: 'Think in throughput', text: 'Upgrade the mine to level 3. More quartz keeps the furnace fed.', target: 3, value: s => s.st.mine.on ? s.st.mine.level : 0, reward: 60000, station: 'mine', action: 'Upgrade the mine' },
    { id: 'hot-metal', title: 'Turn up the heat', text: 'Commission the arc furnace and turn quartz into silicon.', target: 1, value: s => +s.st.furnace.on, reward: 150000, station: 'furnace', action: 'Go to the furnace' },
    { id: 'research', title: 'Knowledge pays', text: 'Answer 4 questions correctly on the first try, in missions or Study Hall.', target: 4, value: s => Object.values(s.answered).filter(v => v === true).length, reward: 100000, action: 'Open Study Hall' },
    { id: 'pure', title: 'One in a billion', text: 'Commission the Siemens plant. Purity is the product now.', target: 1, value: s => +s.st.siemens.on, reward: 500000, station: 'siemens', action: 'Go to Siemens' },
    { id: 'crystal', title: 'One perfect crystal', text: 'Commission the crystal puller and grow a single silicon lattice.', target: 1, value: s => +s.st.cz.on, reward: 1000000, station: 'cz', action: 'Go to the puller' },
    { id: 'fab', title: 'Enter the cleanroom', text: 'Commission your wafer fab. The smallest features create the biggest value.', target: 1, value: s => +s.st.fab.on, reward: 10000000, station: 'fab', action: 'Go to the fab' },
    { id: 'gpu', title: 'First silicon, proven', text: 'Produce your first tested GPU. A chip only counts when it works.', target: 1, value: s => Math.floor(s.made.gpu || 0), reward: 2000000, station: 'test', action: 'Go to final test' },
    { id: 'rack', title: 'Seventy-two, together', text: 'Build your first 72-GPU rack. You own the whole chain.', target: 1, value: s => Math.floor(s.made.rack || 0), reward: 10000000, station: 'systems', action: 'Go to systems' }
  ];
  function ensure(s) {
    s.assignments = s.assignments || {};
    s.shift = Object.assign({ charge: 0, until: 0, work: 0 }, s.shift);
    return s.shift;
  }
  function current(s) { ensure(s); return jobs.find(j => !s.assignments[j.id]) || null; }
  function claim(s) {
    const j = current(s);
    if (!j || j.value(s) < j.target) return null;
    s.assignments[j.id] = true; s.cash += j.reward;
    return j;
  }
  function worked(s) {
    const shift = ensure(s); shift.work++;
    // Work during a boost counts toward assignments, but cannot refill the boost.
    if (shift.until <= s.day) shift.charge = Math.min(8, shift.charge + 1);
  }
  function activate(s) {
    const shift = ensure(s);
    if (shift.charge < 8 || shift.until > s.day) return false;
    shift.charge = 0; shift.until = s.day + 20;
    return true;
  }
  function multiplier(s) { return s.shift && s.shift.until > s.day ? 1.35 : 1; }
  const api = { jobs, ensure, current, claim, worked, activate, multiplier };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.SG = root.SG || {}; root.SG.operations = api; }
})(typeof window !== 'undefined' ? window : globalThis);
