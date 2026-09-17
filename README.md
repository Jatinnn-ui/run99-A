# RUN 99 — Survive the City

A full-screen, frontend-only Three.js survival runner. Survive **99.00 seconds of active gameplay** while a modern city moves through ten escalating environmental phases. The opening title is integrated directly into the live 3D city; there is no landing page or menu hierarchy.

## Completed features

- Procedurally built city with textured building façades, storefront glazing, rooftop structures, sidewalks, lamps, street signs, road markings, drainage grates, vehicles, and an articulated hooded runner.
- Physically based materials, captured city environment reflections, contact and desktop directional shadows, distance fog, warm daylight, blackout headlights, muted emergency lighting, rain streaks, debris and dust.
- Lightweight vertex-wave water shader and reflective wet-road treatment. This is a browser-friendly visual water simulation, not computational fluid dynamics.
- Smooth third-person chase camera, lane lean, jump follow, gravity response, dash field-of-view changes, and restrained earthquake shake. Reduced-motion preferences disable shake and dash FOV effects.
- Fixed-step gameplay simulation (120 Hz) decoupled from rendering, increasing speed, three lanes, jumping, and a 0.78-second protective dash with a 4.5-second cooldown.
- Random obstacle rows with a reserved safe lane. Moving traffic targets blocked lanes; high-value fragments over obstacles reward risky jumps and dashes.
- Barriers, traffic, concrete blocks, falling rubble with impact-zone warnings, and floating overhead obstacles.
- Fragment scores, risky-fragment bonuses, near-miss bonuses, dash breakthrough bonuses, distance and survival-time scores, and a decaying 1–5× combo.
- A thin countdown, elapsed-time track, near-road route guidance, corner telemetry, circular proximity-based threat meter, dash charge, and compact emergency road-sign notifications.
- Immediate collision results, single-action restart, automatic pause on tab/window blur, keyboard pause/resume, and optional synthesized sound effects.
- Keyboard, touch buttons, swipes, and tap-to-jump controls; responsive desktop and phone presentation.
- Exact simulation-time finale at 99.00 seconds with a frozen scene, SURVIVED result, distance, score, personal best, events survived, and near misses.
- Local personal-best persistence with graceful fallback when browser storage is unavailable.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Change lane | A / D or ← / → | Arrow buttons or horizontal swipe |
| Jump | Space (also ↑) | Up button, upward swipe, or tap the scene |
| Dash | Shift | DASH button or downward swipe |
| Pause/resume | Esc / P | Header pause button |
| Start/retry | Enter / Space or main button | Main button |

Dash breaks through hazards but is not continuously available. Jumping is only available while grounded. Low barriers and cars can be jumped; tall concrete obstructions require a different lane or dash. Floating blocks should be passed underneath.

## Event schedule and gameplay consequences

| Active time | Phase | Gameplay effect |
| --- | --- | --- |
| 0–10 | The Calm | Baseline barriers, cars, reserved escape lanes |
| 10–20 | Downpour | Slower lateral steering response and reduced sight distance |
| 20–30 | Gridlock | Faster approaching cars and signaled-by-motion lane changes |
| 30–40 | Blackout | Sharply reduced visibility; headlights, reflectors and route guidance become essential |
| 40–50 | Falling Sky | Falling rubble / amber impact zones and denser patterns |
| 50–60 | High Water | Grounded water drag; jumping/dashing preserves speed and score |
| 60–70 | Weightless | Lower gravity, extended jump airtime and overhead floating obstacles |
| 70–80 | Fault Line | Physically drifting lane centers, architectural shift and tall blocks |
| 80–90 | Cascade | Rain steering, flood drag, moving vehicles, falling debris and denser patterns combined |
| 90–99 | Collapse | CITY INSTABILITY 98%, fastest target speed, combined hazards, sinking/tilting buildings and accelerated rubble |

Elapsed gameplay time pauses when the game is paused or the browser loses focus. The result screen never advances gameplay. Rendering is capped in resolution on mobile, with fewer scenery elements and no expensive directional shadows.

## Score model and storage

- Base score: `floor(distance × 2 + seconds × 15 + bonusPoints)`.
- Fragment: 35 base points; risky fragment: 150; near miss: 120; dash breakthrough: 80.
- Bonuses increase combo by 0.25, up to 5×; combo decays after five seconds without a bonus.
- Successful survival adds 9,900 points.
- Best score: browser `localStorage`, key `run99.best` (numeric string). It is local to the current origin/browser, not an online leaderboard.
- Current-run state and procedural entities remain in memory. No database, Table API, user account, backend, or uploaded assets are used.

## Entry URIs and project structure

| Path | Purpose | Parameters |
| --- | --- | --- |
| `/` or `/index.html` | Complete playable game and integrated title/results screens | None |
| `/tests/index.html` | Browser-based gameplay and real-page integration tests | None |
| `/js/core.js` | DOM-independent simulation model and phase configuration | — |
| `/js/game.js` | Three.js world, input, rendering, audio, HUD and results | — |
| `/css/style.css` | Instrument-panel visual system and responsive layouts | — |

The project is static and needs no compilation or package installation. Serve over HTTP(S) with any static host. Three.js 0.160.0 is pinned and loaded from jsDelivr; Barlow Condensed and IBM Plex Mono are loaded from Google Fonts, with local fallbacks. A working internet connection is needed for the CDN dependency on initial load. WebGL is required; initialization failures produce an explicit message.

## Public URLs / APIs

- Production URL: **not deployed or assigned in this implementation session**.
- Public API endpoints: **none**.
- Three.js CDN: `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js`.
- Font stylesheet: Google Fonts, referenced in `index.html`.

## Verification

The browser suite checks phase configuration, movement bounds, interpolation, jump/landing, collision/freeze, jump clearance, dash/invulnerability/cooldown, 500 procedural safe-route rows, fragment and combo scoring, combo decay, near-miss de-duplication, rain grip, flood drag, altered gravity, moving traffic, road drift, exact 99-second victory, and restart reset. Integration tests load the actual game in an iframe and exercise boot, start, pause/resume, audio controls, and countdown progression.

Desktop and phone screenshots are used for visual layout review. Software-rendered browser testing may emit GPU warnings. The legacy Three.js distribution emits a deprecation notice; it does not affect the pinned build. Synthetic audio-button clicks in automated tests can generate expected browser autoplay-policy warnings; normal user gestures unlock the audio context.

## Not implemented / intentional limits

- No photogrammetry assets, real rigid-body building destruction, expensive screen-space reflections, or full fluid solver. All scene geometry/materials and effects are generated in-browser.
- No online leaderboard, multiplayer, accounts, cloud saves, or replay export.
- No offline service worker or bundled font/Three.js assets yet.
- No gamepad integration or remappable controls.

## Recommended next steps

1. Playtest difficulty, mobile thermal performance, and reaction windows on physical devices; tune pattern density and dash cooldown from feedback.
2. Add authored high-detail environment/character assets and spatial environmental audio if an expanded asset budget is desired.
3. Migrate the pinned legacy Three.js script to a bundled ES-module build and self-host dependencies for offline support.
4. Add gamepad input, configurable control bindings, and optional accessibility difficulty settings.
5. Publish through the project's Publish tab when ready; production deployment has not been performed.
