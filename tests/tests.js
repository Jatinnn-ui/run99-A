(function () {
  'use strict';
  const { RunSimulation, PHASES } = RUN99;
  let passed = 0, failed = 0;
  function assert(value, message) { if (!value) throw new Error(message); }
  function test(name, fn) {
    const item = document.createElement('li');
    try { fn(); passed++; item.className = 'pass'; item.textContent = 'PASS — ' + name; console.log('PASS: ' + name); }
    catch (error) { failed++; item.className = 'fail'; item.textContent = 'FAIL — ' + name + ': ' + error.message; console.error(item.textContent); }
    document.getElementById('results').appendChild(item);
  }
  function run(seconds, s, clear = false) { for (let i = 0; i < Math.ceil(seconds * 120); i++) { if (clear) { s.hazards = []; s.pickups = []; } s.update(1 / 120); } }
  function hazard(type = 'barrier', lane = 1) { return { id: 555, type, lane, x: (lane - 1) * 3.6, z: -1, width: 1, depth: .7, height: type === 'car' ? 1.6 : 1, targetLane: lane, moving: false, destroyed: false, passed: false }; }
  test('Ten distinct 10-second phases, with a nine-second finale', () => assert(PHASES.length === 10 && PHASES[9].title === 'CITY INSTABILITY 98%', 'phase configuration'));
  test('Lane boundaries and smooth movement', () => { const s = new RunSimulation(); s.start(); s.move(-1); s.move(-1); assert(s.lane === 0, 'left boundary'); run(.5, s); assert(s.x < -3.5, 'lane interpolation'); s.move(1); s.move(1); s.move(1); assert(s.lane === 2, 'right boundary'); });
  test('Grounded jumping, no double jump, stable landing', () => { const s = new RunSimulation(); s.start(); assert(s.jump(), 'jump accepted'); run(.1, s); assert(!s.jump(), 'double jump blocked'); run(1, s, true); assert(s.y === 0 && s.vy === 0, 'landing'); });
  test('Collision ends the run immediately and time freezes', () => { const s = new RunSimulation(); s.start(); s.hazards.push(hazard()); run(.1, s); assert(s.state === 'dead', 'collision'); const time = s.time; run(2, s); assert(s.time === time, 'frozen'); });
  test('Jumping clears low barriers', () => { const s = new RunSimulation(); s.start(); s.jump(); run(.3, s); s.hazards.push(hazard()); run(.2, s); assert(s.state === 'running', 'clearance'); });
  test('Dash breaks obstacles, scores and enforces cooldown', () => { const s = new RunSimulation(); s.start(); assert(s.dash(), 'dash accepted'); s.hazards.push(hazard()); run(.1, s); assert(s.state === 'running' && s.hazards[0].destroyed, 'smash'); assert(s.points > 0 && !s.dash(), 'bonus and cooldown'); run(4.5, s, true); assert(s.dash(), 'recharged'); });
  test('Every generated row reserves a safe lane', () => { for (let phase = 0; phase < 10; phase++) { const s = new RunSimulation(); s.phase = phase; for (let n = 0; n < 50; n++) { s.hazards = []; s.spawnRow(); assert(!s.hazards.some(h => h.lane === s.lastSafe || (h.moving && h.targetLane === s.lastSafe)), 'reserved lane'); } } });
  test('Fragments award points and increase the combo', () => { const s = new RunSimulation(); s.start(); s.pickups.push({ id: 1, lane: 1, z: -1, y: 1, collected: false }); run(.1, s); assert(s.fragments === 1 && s.points > 0 && s.combo > 1, 'collect'); });
  test('Combo decays after its grace period', () => { const s = new RunSimulation(); s.start(); s.addBonus(10, 'TEST'); run(6, s, true); assert(s.combo === 1, 'decay'); });
  test('Near misses are awarded once per obstacle', () => { const s = new RunSimulation(); s.start(); const h = hazard(); h.x = 2; h.lane = 2; h.z = 2; s.hazards.push(h); run(.01, s); assert(s.nearMisses === 1, 'bonus'); run(.2, s); assert(s.nearMisses === 1, 'not duplicated'); });
  test('Rain reduces steering grip', () => { const a = new RunSimulation(), b = new RunSimulation(); a.start(); b.start(); b.time = 10; b.phase = 1; a.move(1); b.move(1); run(.1, a); run(.1, b); assert(a.x > b.x, 'slower response'); });
  test('Flooding slows grounded travel; dash counters drag', () => { const a = new RunSimulation(), b = new RunSimulation(); a.start(); b.start(); a.time = b.time = 50; a.phase = b.phase = 5; b.dash(); run(.5, a, true); run(.5, b, true); assert(a.speed < 25 && b.speed > 35, 'water drag'); });
  test('Gravity anomaly extends airtime', () => { const s = new RunSimulation(); s.start(); s.time = 60; s.phase = 6; s.jump(); run(1.2, s, true); assert(s.y > 2, 'long airtime'); });
  test('Phase transition changes vehicle lane behavior', () => { const s = new RunSimulation(() => .3); s.start(); s.time = 20; s.phase = 2; const h = hazard('car', 0); h.z = -50; h.moving = true; h.switchAt = -60; h.targetLane = 2; s.hazards.push(h); run(.3, s); assert(h.switched && h.x > -2, 'moving traffic'); });
  test('Distorted roads physically move the lane centers', () => { const s = new RunSimulation(); s.phase = 7; s.distance = 100; assert(Math.abs(s.laneX(1)) > .5, 'road displacement'); });
  test('All ten phases, exact 99.00 finish, bonus, frozen simulation', () => {
    const s = new RunSimulation(); const phases = []; let ends = 0; s.onEvent = (name) => { if (name === 'phase') phases.push(s.phase); if (name === 'end') ends++; }; s.start(); run(100, s, true);
    assert(s.state === 'survived' && s.time === 99, 'exact finish'); assert(phases.length === 9 && phases[8] === 9, 'phase schedule'); assert(ends === 1 && s.score > 9900, 'single end and bonus'); const d = s.distance; run(10, s); assert(s.distance === d, 'world frozen');
  });
  test('Restart resets all per-run state', () => { const s = new RunSimulation(); s.start(); s.points = 1234; s.nearMisses = 7; s.time = 40; s.finish(false); s.start(); assert(s.time === 0 && s.points === 0 && s.nearMisses === 0 && s.state === 'running' && s.hazards.length === 0, 'reset'); });
  function summary() { document.getElementById('summary').textContent = `${passed} passed / ${failed} failed`; document.getElementById('summary').dataset.complete = 'true'; }
  const iframe = document.getElementById('game-frame');
  iframe.addEventListener('load', () => {
    const doc = iframe.contentDocument, win = iframe.contentWindow;
    test('Real game boots its WebGL scene', () => assert(doc.querySelector('#loading.loaded'), 'scene initialized'));
    test('BEGIN RUN activates the actual game UI', () => { doc.getElementById('start-button').click(); assert(doc.getElementById('game').classList.contains('playing'), 'running class'); assert(doc.getElementById('pause-button').hidden === false, 'pause available'); });
    test('Escape pauses and resume returns to the game', () => { win.dispatchEvent(new win.KeyboardEvent('keydown', { code: 'Escape' })); assert(!doc.getElementById('pause-screen').hidden, 'pause overlay'); doc.getElementById('resume-button').click(); assert(doc.getElementById('pause-screen').hidden, 'resumed'); });
    test('Sound can be enabled and muted', () => { const sound = doc.getElementById('sound-toggle'); sound.click(); assert(sound.getAttribute('aria-pressed') === 'true', 'audio enabled'); sound.click(); assert(sound.getAttribute('aria-pressed') === 'false', 'audio muted'); });
    setTimeout(() => {
      test('Game countdown advances in the real scene', () => assert(Number(doc.getElementById('countdown').textContent) < 99, 'clock advanced'));
      // Return focus and leave the live renderer running for inspection.
      summary();
    }, 1700);
  });
})();
