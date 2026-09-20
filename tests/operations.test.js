const { test } = require('node:test');
const assert = require('node:assert/strict');
const Ops = require('../operations');
const fresh = () => ({ day: 0, cash: 60000, st: { mine: { on: false, level: 1 }, furnace: { on: false }, siemens: { on: false }, cz: { on: false }, fab: { on: false } }, answered: {}, made: {} });

test('an incomplete assignment cannot pay; completed assignments pay exactly once', () => {
  const s = fresh(); assert.equal(Ops.claim(s), null);
  s.st.mine.on = true;
  assert.equal(Ops.claim(s).id, 'first-station');
  assert.equal(s.cash, 85000);
  assert.equal(Ops.claim(s), null); assert.equal(s.cash, 85000);
});
test('old saves receive new defaults without losing existing progress', () => {
  const s = fresh(); s.assignments = { 'first-station': true }; s.shift = { work: 6 };
  Ops.ensure(s); assert.equal(s.shift.work, 6); assert.equal(s.shift.charge, 0);
  assert.equal(Ops.current(s).id, 'hands-on'); assert.equal(s.cash, 60000);
});
test('charge is capped and cannot be refilled during an active boost', () => {
  const s = fresh();
  for (let i = 0; i < 30; i++) Ops.worked(s);
  assert.equal(s.shift.charge, 8); assert.equal(Ops.activate(s), true);
  assert.equal(Ops.multiplier(s), 1.35);
  for (let i = 0; i < 10; i++) Ops.worked(s);
  assert.equal(s.shift.charge, 0); assert.equal(s.shift.work, 40);
  assert.equal(Ops.activate(s), false); assert.equal(s.shift.until, 20);
  s.day = 20; assert.equal(Ops.multiplier(s), 1); Ops.worked(s);
  assert.equal(s.shift.charge, 1); assert.equal(Ops.activate(s), false);
});
test('boost survives save round trips and expires by game time', () => {
  const s = fresh(); for (let i = 0; i < 8; i++) Ops.worked(s); Ops.activate(s);
  const loaded = JSON.parse(JSON.stringify(s)); Ops.ensure(loaded);
  assert.equal(Ops.multiplier(loaded), 1.35);
  loaded.day = 60; assert.equal(Ops.multiplier(loaded), 1);
});
test('retry answers do not count toward the first-try research assignment', () => {
  const s = fresh(); Ops.ensure(s);
  for (const j of Ops.jobs.slice(0, 4)) s.assignments[j.id] = true;
  s.answered = { a: true, b: true, c: true, d: 'retry' };
  assert.equal(Ops.claim(s), null);
  s.answered.e = true; assert.equal(Ops.claim(s).id, 'research');
  assert.equal(s.cash, 160000);
});
test('all assignments finish cleanly and never pay a second time', () => {
  const s = fresh(); Ops.ensure(s);
  Object.values(s.st).forEach(x => { x.on = true; x.level = 3; });
  s.shift.work = 8; s.answered = { a: true, b: true, c: true, d: true }; s.made = { gpu: 1, rack: 1 };
  for (let i = 0; i < Ops.jobs.length; i++) assert.ok(Ops.claim(s));
  assert.equal(Ops.current(s), null); assert.equal(Ops.claim(s), null);
  assert.equal(s.cash, 60000 + Ops.jobs.reduce((sum, j) => sum + j.reward, 0));
});
