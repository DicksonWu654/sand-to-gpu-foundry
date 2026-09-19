# Sand to GPU: Foundry — design notes

A production-chain game built from the [Sand to GPU](https://github.com/DicksonWu654/sand-to-gpu) course. It is its own repository; `npm start` serves it. Two generated bundles and the vendored widgets come from the course repo via `npm run sync` (`tools/sync-course.js`, which expects a checkout of sand-to-gpu next door or `COURSE_DIR`): `generated/quiz-data.js` (the course quizzes) and `generated/figures.js` (every authored figure, apparatus scene and glyph, rendered with the course's own renderer), plus `course/widgets`, `course/styles.css`, `course/widget-layout.js` and `course/section-figures.css`.

## The idea

The course already is a supply chain, so the game is the chain: a Factorio-style line of stations from a quartz mine to a 72-GPU rack. Fun comes from the tycoon loop (find the bottleneck, add capacity, sell what you cannot use). Teaching happens inside play, not before it: you do not read a chapter to unlock a station, you commission it.

## Commissioning missions

Every station, every fab bay and every node migration is a mission with four phases, defined in `missions.js` and run by `mission-runner.js`:

1. **Brief.** Three or four short cards written from the module, each with one of the course's authored figures rendered in place.
2. **Build it.** For stations with an apparatus scene (charge bed, arc furnace, Siemens plant, CZ puller, interconnect stack, HBM stack, CoWoS package, generic package) the scene's numbered callouts are blanked and a parts bin appears, with one or two decoys. You pick a part and click where it goes; each correct placement reveals why that part exists. For the rest, you stack the layers of a cross-section figure top to bottom or order the components of a process figure, and the course's drawing appears when you finish.
3. **Commission it.** The course's real interactive widgets are mounted inside the game (in `widget-frame.html`, an iframe that replicates the reader's widget contract) with a live target from `challenges.js`, for example "ship at least 1,900 wafers from this ingot", "make a 12-high stack fit under 720 µm", "get half the ions to the wafer unscattered". The frame checks the widget's own readouts and posts back when the target is met. Reaching it is a permanent bonus; you may also continue without it.
4. **Certify.** Two (sometimes one or three) questions from the course's quiz JSON for those modules, now after you have been taught. Wrong answers show the explanation and swap in another question.

Bonuses: each widget target reached gives +5% throughput at that station (bays give −0.006/cm² of D0 each); assembling with no mistakes gives +5%.

## The fab has depth

The fab station is a floor of eight bays, each its own mission: cleanroom and AMHS, oxidation and deposition, lithography, etch, implant and anneal, transistor (FEOL/MOL), interconnect (BEOL), metrology and yield. The six process bays must be commissioned before the fab runs a wafer; the two optional bays add 10% throughput each. Bay missions carry the deepest widgets: Deal–Grove, ALD, Rayleigh, SADP, the EUV source, resist chemistry, plasma reactor, etch profile, the implanter beamline, implant range, MOSFET I–V, transistor architectures, dual damascene, CMP, the yield calculator.

Node migration (N5 → N3 → N2) is a mission too. Wafer price and opex rise, silicon value per mm² rises, and D0 learning restarts from ~0.5/cm², so the migration only pays if you can run enough wafers to learn.

## Stations and the numbers behind them

One game second is one day. Each station runs `rate × level` cycles per day, consuming inputs and producing outputs per cycle, and pays an opex per cycle. Capex and rates are scaled for play; product prices and the numbers in briefings, widgets, labs and quizzes are the course's.

| Station | Stage | Modules | Per cycle | Build puzzle | Widgets |
|---|---|---|---|---|---|
| Quartz Mine | B | 01 | → 1 t quartz | charge-bed scene | chain-map |
| Arc Furnace | B | 01 | 3 t quartz → 1 t MG-Si | arc-furnace scene | – |
| Siemens Plant | B | 01 | 1 t MG-Si → 700 kg poly | siemens scene | purity |
| Crystal Puller | C | 02 | 300 kg poly → 1 ingot | cz-puller scene | cz-puller |
| Wafering | D | 03 | 1 ingot → 1,300–1,700 wafers | order (multi-wire slicing) | wafer-slicing |
| Design & Mask Shop | A | 19, 04 | one-shot mask set | order (verification cycle) | gpu-bom |
| Wafer Fab | E–G | 05–13 | 1 wafer → 1 finished wafer | stack (fab building) + 8 bays | fab-flow + bay widgets |
| Wafer Sort | H | 13, 14 | 1 finished wafer → good dies | order (prober) | wafer-sort-sim, test-cost |
| HBM Plant | K | 15 | 1 wafer → 30 × stack yield | hbm-section scene | dram-cell, hbm-stack |
| CoWoS | I–N | 16, 17 | n dies + h HBM → 1 package | package-section scene | cowos-flow, hybrid-bond, package-xsection |
| Final Test | N | 18 | 1 package → 0.97 GPU | order (test cell) | yield-cascade |
| Systems | O | 19, 20 | 72 GPUs → 1 NVL72 rack | generic-package scene | heat-path, nvlink-topology, rack-explorer |

Formulas used by the simulation (all from Module 13 and Module 21's glossary): dies per wafer `π(d/2)²/A − πd/√(2A)`; Poisson, Murphy and negative-binomial yield; yield learning `D0 = 0.05 + 0.45·exp(−wafers run / 20,000)` minus bonuses, floored at 0.03; HBM stack yield `(1 − escape)^(n+1) × bond^n`; burn-in escapes `exp(−h·78/700)`; Rayleigh `2·k1·λ/NA`; Deal–Grove; Little's law for earthquake scrap.

## Economy rules

Warehouse caps are 30 days of live downstream consumption (90 with the inventory mitigation), never less than two days of output, so building a consumer never causes an income cliff. Surplus beyond the cap sells at market price. Cards show net $/day, a "dumping X% on the spot market" flag when most of the output is bypassing the next station, and the payback of the next level on the upgrade button. The fab runs before all six bays are commissioned, paying a $2,500-per-wafer outsourcing fee for each missing process bay. Contract offers (three days of your end product within eight days at +30%, 20% penalty on the shortfall) replace rush orders. Quiz grants are 0.25% of the current objective's cost and, like the knowledge multiplier, count only first-try answers. Offline progress is capped at 60 game days. Capex is scaled ×5 from the first version so each save phase is 30–90 s of floor time; the HBM plant's opex is 30 × the stack cost chosen in the HBM Stacker lab.

## The fun layer (idle-game mechanics)

- **Manual shifts.** Click a station's icon to run 10% of a day's output instantly, limited by inputs and warehouse room. Floating "+n units" and "+$" texts show what happened.
- **Rush orders.** After the furnace is built, a golden-cookie-style button appears every 60–150 days for 14 seconds; clicking it pays a few days of income and shows a one-paragraph lesson (prepayments, subsidies, reclaim wafers, the memory price cycle).
- **Automation tiers.** Every fifth level of a station is a tier worth +25% throughput.
- **Knowledge multiplier.** Every quiz question answered correctly, anywhere, adds 0.5% to all revenue forever (176 questions → ×1.88).
- **Achievements.** Sixteen achievements in `data.js` (`SG.ACHIEVEMENTS`) with permanent revenue multipliers or cash; checked once a second.
- **Offline progress.** On load, if more than a minute passed, the chain runs at half speed for up to 300 game days and a "While you were away" card reports the result.
- **Objective banner.** Always shows the next thing to do (commission the mine, save for the next station, commission bays, migrate the node) with a progress bar.
- **Belts.** The conveyor between stations animates at a speed tied to actual utilisation and pauses when nothing flows.

Balance reference (bot that buys in order and upgrades bottlenecks): whole chain and ten racks by about day 240; the fab-plus-bays wall (~$265M) around days 100–165 is the longest save.

## Labs, explore, events

The six original labs (Crystal Puller, Design Studio, Litho Planner, Oxide Lab, HBM Stacker, Test Strategy) remain as upgrades on built stations. Every built station has an **Explore** button that opens its widgets and all of its modules' figures. Chokepoint events (neon, resist, EUV collector, ABF, earthquake, AI boom, HBM spike, export controls) each link to the widget that explains them. The Study Hall pays a research grant for every first-time correct quiz answer (176 questions).

## Files

```
site/game/index.html        shell
site/game/game.css          styles (includes the tokens the course's figure CSS expects)
site/game/data.js           resources, stations, guides, events, mitigations, puzzles, milestones
site/game/missions.js       commissioning missions, explore lists, event → widget map
site/game/mission-runner.js briefing / build / commission / certify runner, explore panel
site/game/challenges.js     widget targets (runs inside widget-frame.html)
site/game/widget-frame.html hosts one course widget with the reader's widget contract
site/game/labs.js           the six labs
site/game/engine.js         state, simulation tick, selling, quiz gate, fab floor, node migration, rendering, save/load
site/game/quiz-data.js      generated from course/quizzes by tools/game/build-quiz-data.js
site/game/figures.js        generated from course/visuals by tools/game/build-game-assets.js
```

Save state is in `localStorage` under `sand-to-gpu-foundry-v1`. `SG.engine` exposes `S`, `tick`, `buildChain`, `openLab`, `flow` and friends for debugging and balance runs from the console.

## Extending it

- **New station:** add to `SG.STATIONS` in `data.js` and a mission of the same id in `missions.js`. Inputs and outputs may be numbers or the tokens `WPI`, `DPW`, `HBMPW`, `NDIE`, `NHBM`.
- **New mission build:** `{scene, fig, why[], decoys[]}` for an apparatus scene (the `why` array must match the scene key length) or `{fig, mode: 'stack' | 'order'}` for an authored figure. Figure keys are `mNN/<section id>`; run `node tools/game/build-game-assets.js` after adding figures to the course.
- **New widget target:** add an entry to `challenges.js` keyed by widget id; `check(box, utils)` reads `.w-stat` readouts and `.w-ctl` controls and returns true or `{done, detail}`.
- **New bay:** add a mission with `bay: true` and a `cost`; list it in `REQUIRED_BAYS` or `OPTIONAL_BAYS` in `engine.js`.
- **Quizzes and figures** come from the course; edit them there and rebuild.

## Simplifications to know about

- Flows are continuous, so stocks are fractional; milestones wait for a whole unit.
- The HBM plant takes polished wafers directly and stands in for a DRAM fab plus TSV, thinning and stacking.
- Widget targets are checked from the widgets' displayed readouts, so a widget whose labels change needs its check updated.
- Prices do not respond to your volume (except through events), and there is no competitor.
