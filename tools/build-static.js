// Package only public game assets; no repository metadata or local tooling.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');
const files = ['index.html', 'widget-frame.html', 'game.css', 'data.js', 'missions.js', 'labs.js', 'mission-runner.js', 'operations.js', 'engine.js', 'challenges.js', 'generated', 'course', 'LICENSE'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const file of files) fs.cpSync(path.join(root, file), path.join(out, file), { recursive: true });
console.log('Static game ready in dist/');
