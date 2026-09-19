# Sand to GPU: Foundry

**A production-chain game that teaches how a chip gets made.** Start with a quartz mine and $300k; build the real chain, station by station, to a 72-GPU rack: arc furnace, Siemens plant, crystal puller, wafering, design and masks, a fab with eight tool bays, wafer sort, HBM, CoWoS, final test, systems.

Built from the [Sand to GPU](https://github.com/DicksonWu654/sand-to-gpu) course. The game reuses the course's own material: its 176 quiz questions, 292 authored figures, 17 apparatus drawings and 46 interactive widgets.

## How it teaches

You never have to read a chapter first. Every station is a **commissioning mission**:

1. **Brief.** A few cards written from the module, each with one of the course's figures.
2. **Build it.** Assemble the machine part by part on the course's own apparatus drawing (the arc furnace, the Siemens plant, the CZ puller, the HBM stack, the CoWoS package…), or stack a cross-section's layers, or order a process. Each correct placement tells you why that part exists.
3. **Commission it.** The course's real interactive widgets run inside the game with live targets: "ship at least 1,900 wafers from this ingot", "make a 12-high HBM stack fit under 720 µm", "print a 26 nm pitch in a single exposure".
4. **Certify.** A couple of questions from the course's quizzes, now that you have been taught.

Then the idle-game loop takes over: find the bottleneck, upgrade, click stations for manual shifts, catch rush orders, earn achievements, migrate the fab to a new node and watch the yield-learning curve restart. Every quiz question you answer anywhere adds 0.5% to all revenue forever.

## Run it

```bash
npm start
```

Open http://127.0.0.1:8791/. No dependencies; any static file server works too. Progress is saved in the browser.

## Update from the course

The course content is vendored here so the game runs standalone. To refresh it after the course changes, clone `sand-to-gpu` next to this repo (or set `COURSE_DIR`) and run:

```bash
npm run sync
```

This regenerates `generated/quiz-data.js` and `generated/figures.js` with the course's own renderer and copies `course/widgets`, `course/styles.css`, `course/widget-layout.js` and `course/section-figures.css`.

## Layout

```
index.html          the game
engine.js           state, simulation, economy, bonuses, UI
data.js             stations, resources, events, achievements, rush orders, card art
missions.js         commissioning missions (briefs, builds, widget targets, certification)
mission-runner.js   mission phases, explore panel
challenges.js       live targets checked against each widget's readouts
widget-frame.html   hosts one course widget with the reader's widget contract
labs.js             six formula mini-games (puller, design studio, litho, oxide, HBM, test)
generated/          quiz and figure bundles from the course
course/             vendored course widgets and stylesheets (MIT, from sand-to-gpu)
docs/GAME.md        design notes and extension points
```

## License

MIT. Course content, widgets and figures come from [Sand to GPU](https://github.com/DicksonWu654/sand-to-gpu), also MIT.
