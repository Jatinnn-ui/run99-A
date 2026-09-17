/* RUN 99 — deterministic-friendly gameplay model; no rendering dependencies. */
(function (global) {
  'use strict';
  const PHASES = [
    { name: 'THE CALM', title: 'THE CITY IS STILL STANDING', detail: 'FIND THE GAPS · KEEP MOVING', speed: 21 },
    { name: 'DOWNPOUR', title: 'HEAVY RAIN', detail: 'SLIPPERY ROAD · STEERING RESPONSE REDUCED', speed: 23 },
    { name: 'GRIDLOCK', title: 'TRAFFIC OUT OF CONTROL', detail: 'VEHICLES CHANGE LANES · WATCH THEIR SIGNALS', speed: 25 },
    { name: 'BLACKOUT', title: 'GRID FAILURE', detail: 'VISIBILITY CRITICAL · FOLLOW THE REFLECTORS', speed: 27 },
    { name: 'FALLING SKY', title: 'STRUCTURAL FAILURE', detail: 'FALLING DEBRIS · AVOID AMBER IMPACT ZONES', speed: 28 },
    { name: 'HIGH WATER', title: 'FLOOD WARNING', detail: 'WATER DRAG · JUMP OR DASH TO KEEP SPEED', speed: 29 },
    { name: 'WEIGHTLESS', title: 'GRAVITY ANOMALY', detail: 'LONGER JUMPS · FLOATING OBSTACLES', speed: 30 },
    { name: 'FAULT LINE', title: 'THE ROAD IS SHIFTING', detail: 'LANES DRIFT · CORRECT YOUR ROUTE', speed: 32 },
    { name: 'CASCADE', title: 'ALL SYSTEMS FAILING', detail: 'RAIN + TRAFFIC + DEBRIS · DASH TO BREAK THROUGH', speed: 34 },
    { name: 'COLLAPSE', title: 'CITY INSTABILITY 98%', detail: 'TOTAL COLLAPSE · NINE SECONDS REMAIN', speed: 38 }
  ];
  class RunSimulation {
    constructor(random = Math.random) { this.random = random; this.onEvent = () => {}; this.reset(); }
    reset() {
      this.state = 'ready'; this.time = 0; this.distance = 0; this.points = 0; this.score = 0;
      this.phase = 0; this.lane = 1; this.x = 0; this.y = 0; this.vy = 0; this.speed = 21;
      this.dashTime = 0; this.dashCooldown = 0; this.combo = 1; this.comboTime = 0;
      this.nearMisses = 0; this.fragments = 0; this.hazards = []; this.pickups = [];
      this.spawnTime = 0.6; this.nextId = 0; this.lastSafe = 1; this.cause = '';
    }
    start() { this.reset(); this.state = 'running'; }
    laneX(lane, z = 0) {
      const bend = this.phase >= 7 ? Math.sin(this.distance * .008 - z * .012) * (this.phase === 7 ? 1.25 : .9) : 0;
      return (lane - 1) * 3.6 + bend;
    }
    move(direction) {
      if (this.state !== 'running') return false;
      const next = Math.max(0, Math.min(2, this.lane + direction));
      if (next === this.lane) return false;
      this.lane = next; this.onEvent('move'); return true;
    }
    jump() {
      if (this.state !== 'running' || this.y > .05) return false;
      this.vy = this.phase === 6 ? 8.7 : 10.7; this.onEvent('jump'); return true;
    }
    dash() {
      if (this.state !== 'running' || this.dashCooldown > 0) return false;
      this.dashTime = .78; this.dashCooldown = 4.5; this.onEvent('dash'); return true;
    }
    addBonus(points, label) {
      this.combo = Math.min(5, this.combo + .25); this.comboTime = 5;
      const value = Math.round(points * this.combo); this.points += value;
      this.onEvent('bonus', { label, value });
    }
    spawnRow(z = -142) {
      // Every row reserves an unobstructed lane. Reward trails on blocked lanes are jump/dash shortcuts.
      const r = this.random; const safe = Math.max(0, Math.min(2, this.lastSafe + (r() < .5 ? -1 : 1)));
      this.lastSafe = safe;
      const lanes = [0, 1, 2].filter(lane => lane !== safe);
      if (this.phase < 2 && r() < .5) lanes.splice(Math.floor(r() * lanes.length), 1);
      for (const lane of lanes) {
        let type = r() < .5 ? 'barrier' : 'car';
        if (this.phase >= 4 && r() < .42) type = 'debris';
        if (this.phase === 6 && r() < .4) type = 'floating';
        if (this.phase >= 7 && r() < .24) type = 'block';
        const moving = type === 'car' && (this.phase === 2 || this.phase >= 8) && r() < .42;
        const h = { id: this.nextId++, type, lane, z, x: this.laneX(lane, z), targetLane: moving ? lanes.find(l => l !== lane) ?? lane : lane,
          switchAt: -58 - r() * 15, moving, switched: false, passed: false, destroyed: false,
          width: type === 'debris' ? .85 : 1.05, depth: type === 'car' ? 2.05 : .7,
          height: type === 'block' ? 3.7 : type === 'car' ? 1.6 : type === 'floating' ? 3.5 : type === 'debris' ? .9 : 1,
          falling: type === 'debris' && (this.phase === 4 || this.phase >= 8), seed: r() * 10 };
        this.hazards.push(h);
      }
      for (let i = 0; i < 3; i++) this.pickups.push({ id: this.nextId++, lane: safe, z: z + 7 + i * 4, y: 1.05, collected: false });
      if (r() < .65 && lanes.length) this.pickups.push({ id: this.nextId++, lane: lanes[0], z, y: 2.65, collected: false, risky: true });
    }
    update(dt) {
      if (this.state !== 'running') return;
      dt = Math.max(0, Math.min(dt, .05, 99 - this.time));
      this.time = Math.min(99, this.time + dt);
      const phase = Math.min(9, Math.floor(this.time / 10));
      if (phase !== this.phase) { this.phase = phase; this.onEvent('phase', PHASES[phase]); }
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      this.dashTime = Math.max(0, this.dashTime - dt);
      const dashing = this.dashTime > 0;
      const flooded = this.phase === 5 || this.phase >= 8;
      const speedTarget = PHASES[this.phase].speed + (this.time % 10) * .15 + (dashing ? 14 : 0);
      this.speed += (speedTarget * (flooded && this.y < .15 && !dashing ? .78 : 1) - this.speed) * Math.min(1, dt * 5);
      this.distance += this.speed * dt;
      let grip = this.phase === 1 || this.phase >= 8 ? 6 : flooded ? 7 : 13;
      if (dashing) grip = 18;
      this.x += (this.laneX(this.lane) - this.x) * (1 - Math.exp(-dt * grip));
      if (this.y > 0 || this.vy > 0) {
        this.vy -= (this.phase === 6 ? 8.5 : 22) * dt; this.y += this.vy * dt;
        if (this.y < 0) { this.y = 0; this.vy = 0; this.onEvent('land'); }
      }
      this.comboTime = Math.max(0, this.comboTime - dt);
      if (this.comboTime === 0) this.combo = Math.max(1, this.combo - dt * .45);
      this.spawnTime -= dt;
      if (this.spawnTime <= 0) {
        this.spawnRow(); this.spawnTime = (this.phase >= 8 ? 1.2 : this.phase >= 4 ? 1.5 : 1.8) + this.random() * .35;
      }
      for (const h of this.hazards) {
        const previousZ = h.z;
        h.z += this.speed * dt * (h.type === 'car' && this.phase === 2 ? 1.23 : 1);
        if (h.moving && h.z > h.switchAt) h.switched = true;
        const targetLane = h.switched ? h.targetLane : h.lane;
        h.x += (this.laneX(targetLane, h.z) - h.x) * (1 - Math.exp(-dt * (h.switched ? 2 : 15)));
        const dx = Math.abs(h.x - this.x);
        const intersects = h.z + h.depth > -.42 && previousZ - h.depth < .42;
        const verticalHit = h.type === 'floating' ? this.y > 1.1 && this.y < 3.8 : this.y < h.height;
        if (!h.destroyed && intersects && dx < h.width + .28 && verticalHit) {
          if (dashing) { h.destroyed = true; this.addBonus(80, 'BREAKTHROUGH'); this.onEvent('smash', h); }
          else { this.cause = h.type === 'car' ? 'TRAFFIC COLLISION' : h.type === 'floating' ? 'GRAVITY MISJUDGED' : h.falling ? 'CAUGHT IN THE COLLAPSE' : 'ROUTE COMPROMISED'; this.finish(false); return; }
        }
        if (!h.passed && h.z > h.depth + .6) {
          h.passed = true;
          if (!h.destroyed && dx < 2.7) { this.nearMisses++; this.addBonus(120, 'NEAR MISS'); }
        }
      }
      for (const p of this.pickups) {
        p.z += this.speed * dt;
        if (!p.collected && Math.abs(p.z) < 1.5 && Math.abs(this.laneX(p.lane, p.z) - this.x) < 1.05 && Math.abs(p.y - (this.y + 1)) < 1.05) {
          p.collected = true; this.fragments++; this.addBonus(p.risky ? 150 : 35, p.risky ? 'RISK REWARDED' : 'FRAGMENT'); this.onEvent('collect', p);
        }
      }
      this.hazards = this.hazards.filter(h => h.z < 16);
      this.pickups = this.pickups.filter(p => p.z < 14 && !p.collected);
      this.score = Math.floor(this.distance * 2 + this.time * 15 + this.points);
      if (this.time >= 99) this.finish(true);
    }
    finish(survived) {
      this.state = survived ? 'survived' : 'dead';
      this.score = Math.floor(this.distance * 2 + this.time * 15 + this.points + (survived ? 9900 : 0));
      this.onEvent('end', { survived });
    }
  }
  global.RUN99 = { RunSimulation, PHASES };
})(typeof window !== 'undefined' ? window : globalThis);
