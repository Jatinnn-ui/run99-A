/* RUN 99 — procedural Three.js city and cinematic browser presentation. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  if (!window.THREE) { $('loading-message').textContent = 'CITY OFFLINE — CHECK YOUR CONNECTION AND RELOAD.'; return; }
  const T = THREE;
  const sim = new RUN99.RunSimulation();
  const mobile = matchMedia('(pointer:coarse)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' });
  } catch (error) {
    $('loading-message').textContent = 'WEBGL IS UNAVAILABLE. TRY A BROWSER WITH HARDWARE ACCELERATION.'; return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  const baseSky = new T.Color('#929d9c');
  scene.background = baseSky.clone();
  scene.fog = new T.FogExp2(baseSky.clone(), .0105);
  const camera = new T.PerspectiveCamera(58, innerWidth / innerHeight, .15, 520);
  const hemi = new T.HemisphereLight('#d4e1e1', '#373932', 2.1); scene.add(hemi);
  const sun = new T.DirectionalLight('#f4d3aa', 3.1); sun.position.set(-38, 55, -85);
  sun.castShadow = !mobile; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 60, bottom: -35, near: .5, far: 200 });
  sun.shadow.bias = -.0006; sun.shadow.normalBias = .05; scene.add(sun);
  const fill = new T.DirectionalLight('#a1b9cf', .6); fill.position.set(10, 20, 35); scene.add(fill);
  const headlight = new T.SpotLight('#e0e8d7', 0, 85, .52, .55, 1.1); headlight.position.set(0, 3.5, 9); headlight.target.position.set(0, .5, -45); scene.add(headlight, headlight.target);
  const emergency = new T.PointLight('#799ead', 0, 28, 2); emergency.position.set(-7, 3, -9); scene.add(emergency);
  const mat = (color, roughness = .8, metalness = 0) => new T.MeshStandardMaterial({ color, roughness, metalness });
  const concrete = mat('#737873'); const darkConcrete = mat('#454d4c'); const curbMat = mat('#b1afa3');
  const metal = mat('#4b5554', .46, .65); const tireMat = mat('#171d1d');
  const whiteMark = mat('#d3d0bb', .78); const amberMat = mat('#c89258', .6);
  const glass = mat('#384b53', .2, .75);
  const lampMat = new T.MeshBasicMaterial({ color: '#ffe1ae' });
  const brakeMat = new T.MeshBasicMaterial({ color: '#b24432' });
  const blueMat = new T.MeshBasicMaterial({ color: '#abc8dc' });
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  function box(w, h, d, material, x = 0, y = 0, z = 0, parent = scene, shadow = false) {
    const mesh = new T.Mesh(boxGeo, material); mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
    mesh.castShadow = shadow; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function canvasTexture(w, h, draw) {
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); return texture;
  }
  const asphaltTexture = canvasTexture(512, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#424a4a'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 56000; i++) { const value = 50 + Math.random() * 52; ctx.fillStyle = `rgba(${value},${value + 4},${value + 3},.28)`; ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
    for (let i = 0; i < 24; i++) { ctx.strokeStyle = '#202a2830'; ctx.lineWidth = Math.random() * 1.2; let x = Math.random() * w; let y = Math.random() * h; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (Math.random() - .5) * 15; y += Math.random() * 12; ctx.lineTo(x, y); } ctx.stroke(); }
    for (const x of [105, 164, 230, 280, 350, 410]) { const gradient = ctx.createLinearGradient(x - 15, 0, x + 15, 0); gradient.addColorStop(0, '#171e2000'); gradient.addColorStop(.5, '#171e202a'); gradient.addColorStop(1, '#171e2000'); ctx.fillStyle = gradient; ctx.fillRect(x - 15, 0, 30, h); }
  });
  const roadMat = new T.MeshStandardMaterial({ map: asphaltTexture, roughness: .88, metalness: .12, color: '#aeb7b4' });
  const sidewalkTex = canvasTexture(256, 256, ctx => {
    ctx.fillStyle = '#85887f'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#60695f'; ctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); }
    for (let i = 0; i < 3000; i++) { ctx.fillStyle = '#d8d4be15'; ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  });
  sidewalkTex.wrapS = sidewalkTex.wrapT = T.RepeatWrapping; sidewalkTex.repeat.set(1, 8);
  const pavementMat = new T.MeshStandardMaterial({ map: sidewalkTex, roughness: .92 });
  const facadeMats = [];
  for (let variation = 0; variation < 6; variation++) {
    const texture = canvasTexture(256, 512, (ctx, w, h) => {
      const bases = ['#696f6d', '#7f837c', '#555e60', '#878880', '#59696e', '#a1a095'];
      ctx.fillStyle = bases[variation]; ctx.fillRect(0, 0, w, h);
      const cols = variation % 2 ? 8 : 6; const cw = w / cols;
      for (let y = 5; y < h; y += 28) {
        ctx.fillStyle = '#27333455'; ctx.fillRect(0, y + 23, w, 3);
        for (let x = 3; x < w; x += cw) {
          const lit = Math.random() > .88;
          const light = 35 + Math.floor(Math.random() * 28);
          ctx.fillStyle = lit ? '#b5ad8b' : `rgb(${light},${light + 12},${light + 16})`;
          ctx.fillRect(x, y, cw - 8, 19);
          ctx.fillStyle = '#c0d1cf25'; ctx.fillRect(x + 1, y + 1, cw - 10, 2);
          ctx.fillStyle = '#c4bda139'; ctx.fillRect(x + (cw - 8) * .5, y, 1, 19);
          if (Math.random() > .65) { ctx.fillStyle = '#a0a39935'; ctx.fillRect(x, y, cw - 8, 7); }
        }
      }
    });
    facadeMats.push(new T.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: .085, roughness: variation === 4 ? .37 : .79, metalness: variation === 4 ? .45 : .1 }));
  }
  function signTexture(text, sub, bg = '#32433f') {
    return canvasTexture(512, 160, ctx => {
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 160); ctx.strokeStyle = '#b3bdad'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, 496, 144);
      ctx.fillStyle = '#e1e4d5'; ctx.font = '500 48px sans-serif'; ctx.fillText(text, 30, 72); ctx.font = '21px sans-serif'; ctx.fillText(sub, 32, 121); ctx.font = '60px sans-serif'; ctx.fillText('↑', 443, 101);
    });
  }
  const signMat = new T.MeshStandardMaterial({ map: signTexture('DOWNTOWN', 'SECTOR 09  /  NORTHBOUND'), roughness: .65 });
  const shopMat = new T.MeshStandardMaterial({ map: signTexture('CENTRAL', 'CONVENIENCE  /  OPEN 24H', '#575c57') });
  const roadSegments = [], buildings = [], streetGroups = [], ambientCars = [];
  const roadLength = 40;
  for (let i = 0; i < 11; i++) {
    const group = new T.Group(); group.position.z = 25 - i * roadLength; scene.add(group);
    box(13.8, .2, roadLength + .15, roadMat, 0, -.14, 0, group);
    for (const side of [-1, 1]) {
      box(5.1, .25, roadLength, pavementMat, side * 9.5, .015, 0, group);
      box(.22, .35, roadLength, curbMat, side * 7.02, .03, 0, group);
      box(.1, .012, roadLength, whiteMark, side * 6.5, -.028, 0, group);
      box(.07, .013, roadLength, amberMat, side * 6.7, -.028, 0, group);
    }
    for (const x of [-1.8, 1.8]) for (let z = -16; z < 20; z += 10) box(.10, .018, 4.5, whiteMark, x, -.026, z, group);
    if (i % 3 === 0) {
      for (let x = -5.7; x < 6; x += 1.3) box(.7, .016, 3.3, whiteMark, x, -.02, -18, group);
      box(11.8, .016, .3, whiteMark, 0, -.02, -14.8, group);
    }
    for (const side of [-1, 1]) {
      box(.35, .025, 1.5, metal, side * 6.9, .02, -7, group);
      for (let j = 0; j < 5; j++) box(.4, .027, .045, tireMat, side * 6.9, .025, -7.5 + j * .23, group);
    }
    roadSegments.push(group);
  }
  const buildingCount = mobile ? 50 : 72;
  for (let i = 0; i < buildingCount; i++) {
    const side = i % 2 ? -1 : 1; const row = Math.floor(i / 2);
    const height = 18 + Math.random() * 49 + (row > 10 ? 12 : 0);
    const width = 9 + Math.random() * 9, depth = 13 + Math.random() * 8;
    const group = new T.Group();
    group.position.set(side * (13.8 + width / 2 + (row % 4 === 0 ? 3 : 0)), 0, 23 - row * 22);
    const faceMat = facadeMats[Math.floor(Math.random() * facadeMats.length)];
    const body = box(width, height, depth, faceMat, 0, height / 2, 0, group, true);
    box(width + .5, .55, depth + .4, darkConcrete, 0, height + .1, 0, group);
    box(width + .45, .6, depth + .3, concrete, 0, 4, 0, group);
    box(width * .48, 2, depth * .4, concrete, width * .1, height + 1.2, 0, group, true);
    box(width + .2, 3.8, depth + .2, darkConcrete, 0, 1.9, 0, group);
    for (let k = -1; k <= 1; k++) {
      box(width * .2, 2.8, .12, glass, k * width * .3, 1.6, depth / 2 + .15, group);
      box(.3, height, depth + .1, variationMaterial(i), k * width * .42, height / 2, 0, group);
    }
    // Street-facing retail glazing, recessed entries, canopies and structural mullions.
    const streetFace = -side * (width / 2 + .16);
    for (let shop = -1; shop <= 1; shop++) {
      box(.09, 2.5, depth * .24, glass, streetFace, 1.55, shop * depth * .3, group);
      box(.18, 3.2, .17, curbMat, streetFace - side * .07, 1.6, shop * depth * .3 - depth * .13, group);
      box(.1, .07, depth * .24, metal, streetFace - side * .05, 1.25, shop * depth * .3, group);
    }
    box(1.65, .16, depth * .9, metal, streetFace - side * .6, 3.25, 0, group, true);
    if (i % 4 === 1) {
      box(4.5, .9, .1, shopMat, 0, 3.1, depth / 2 + .24, group);
      box(.1, .8, 5.1, shopMat, streetFace - side * .12, 3.73, 0, group);
    }
    if (i % 3 === 0) {
      for (let floor = 10; floor < height; floor += 12) box(width + .2, .22, depth + .25, concrete, 0, floor, 0, group);
      box(.12, 7, .12, metal, 1, height + 4, 0, group);
    }
    group.userData = { startZ: group.position.z, side, width, height, seed: Math.random(), fallen: false };
    scene.add(group); buildings.push(group);
  }
  function variationMaterial(i) { return i % 3 === 0 ? darkConcrete : concrete; }
  function makeLamp(group, side, z) {
    const x = side * 8.4;
    box(.16, 7, .16, metal, x, 3.5, z, group, true);
    box(.4, .7, .4, darkConcrete, x, .35, z, group);
    box(2.3, .13, .14, metal, x - side * 1.1, 6.97, z, group);
    box(.9, .09, .36, lampMat, x - side * 2.05, 6.88, z, group);
    const poolMat = new T.MeshBasicMaterial({ color: '#e0cb9e', transparent: true, opacity: .065, depthWrite: false });
    const pool = new T.Mesh(new T.PlaneGeometry(2.4, 8), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(x - side * 2, .001, z + 1); group.add(pool);
  }
  for (let i = 0; i < 12; i++) {
    const group = new T.Group(); group.position.z = 16 - i * 34;
    makeLamp(group, -1, 0); makeLamp(group, 1, -11);
    for (const side of [-1, 1]) {
      box(.14, 1.2, .14, metal, side * 7.9, .6, -7, group);
      box(.18, .18, .18, whiteMark, side * 7.9, 1.08, -7, group);
      if (i % 2 === 0) {
        box(.8, 1.1, .7, darkConcrete, side * 10, .55, -4, group, true);
        box(.9, .13, .8, metal, side * 10, 1.1, -4, group);
        box(2.8, .22, .8, concrete, side * 10, .5, -11, group);
        box(.15, .6, .65, metal, side * 10 - 1, .25, -11, group);
        box(.15, .6, .65, metal, side * 10 + 1, .25, -11, group);
      }
    }
    if (i % 4 === 1) {
      box(.24, 8.6, .24, metal, -7.5, 4.3, -5, group);
      box(15, .25, .25, metal, 0, 8.35, -5, group);
      box(6.5, 2.04, .22, signMat, -.3, 7.55, -5, group);
      for (const side of [-1, 1]) {
        box(.45, 1.15, .4, tireMat, side * 5, 7.4, -4.6, group);
        box(.18, .18, .07, side === 1 ? amberMat : brakeMat, side * 5, 7.7, -4.36, group);
      }
    }
    scene.add(group); streetGroups.push(group);
  }
  // A warm, diffuse gap in the cloud cover rather than a bloom-heavy sun.
  const glowTexture = canvasTexture(128, 128, ctx => {
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 63); g.addColorStop(0, '#ffe5b795'); g.addColorStop(.3, '#e5d6b640'); g.addColorStop(1, '#d2cab500'); ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  });
  const sunGlow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, transparent: true, opacity: .7, depthWrite: false, fog: false })); sunGlow.scale.set(180, 115, 1); sunGlow.position.set(-35, 60, -320); scene.add(sunGlow);
  const carPaint = ['#a7aca5', '#414c51', '#767c72', '#8f8273', '#c3c1b6'].map(c => mat(c, .36, .45));
  function makeCar(seed = 0) {
    const group = new T.Group();
    box(1.9, .63, 4.15, carPaint[Math.floor(seed * 8) % carPaint.length], 0, .66, 0, group, true);
    box(1.62, .66, 1.97, glass, 0, 1.27, .12, group, true);
    box(1.69, .1, 1.45, carPaint[Math.floor(seed * 8) % carPaint.length], 0, 1.62, .16, group);
    box(1.79, .08, 2.07, metal, 0, .97, .12, group);
    box(1.87, .17, .14, metal, 0, .37, 2.08, group);
    box(1.5, .18, .035, tireMat, 0, .58, -2.086, group);
    box(.48, .12, .03, whiteMark, 0, .5, 2.165, group);
    for (const side of [-1, 1]) {
      box(.46, .16, .07, lampMat, side * .65, .8, 2.1, group);
      box(.42, .13, .07, brakeMat, side * .68, .83, -2.1, group);
      box(.13, .67, .08, metal, side * .82, 1.26, .1, group);
      box(.28, .16, .23, carPaint[1], side * .95, 1.04, .78, group);
      for (const z of [-1.3, 1.3]) {
        const wheel = new T.Mesh(new T.CylinderGeometry(.36, .36, .22, 16), tireMat); wheel.rotation.z = Math.PI / 2; wheel.position.set(side * .95, .39, z); group.add(wheel);
        const hub = new T.Mesh(new T.CylinderGeometry(.18, .18, .235, 12), metal); hub.rotation.z = Math.PI / 2; hub.position.copy(wheel.position); group.add(hub);
      }
      const beam = new T.Mesh(new T.PlaneGeometry(.8, 7), new T.MeshBasicMaterial({ color: '#eee9c0', transparent: true, opacity: .06, depthWrite: false })); beam.rotation.x = -Math.PI / 2; beam.position.set(side * .65, .035, 5.7); group.add(beam);
    }
    return group;
  }
  for (let i = 0; i < 8; i++) { const car = makeCar(Math.random()); car.position.set((i % 2 ? -1 : 1) * 5.25, 0, -35 - i * 39); car.rotation.y = i % 2 ? Math.PI : 0; scene.add(car); ambientCars.push(car); }
  const stripeTex = canvasTexture(256, 64, ctx => {
    ctx.fillStyle = '#c7c0a7'; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = '#4b514b';
    for (let x = -50; x < 300; x += 58) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 28, 0); ctx.lineTo(x + 78, 64); ctx.lineTo(x + 50, 64); ctx.fill(); }
    ctx.fillStyle = '#c39a66'; ctx.fillRect(0, 0, 256, 4); ctx.fillRect(0, 60, 256, 4);
  });
  const stripeMat = new T.MeshStandardMaterial({ map: stripeTex, roughness: .75 });
  const hazardMeshes = new Map(), pickupMeshes = new Map();
  const fragmentMat = new T.MeshStandardMaterial({ color: '#ecd7a9', emissive: '#ccb78a', emissiveIntensity: .5, metalness: .7, roughness: .24 });
  const fragmentGeo = new T.OctahedronGeometry(.25, 0);
  function makeHazard(h) {
    let group = new T.Group();
    if (h.type === 'car') group = makeCar(h.seed);
    else if (h.type === 'barrier') {
      box(2.35, .65, .32, stripeMat, 0, .65, 0, group, true);
      for (const side of [-1, 1]) { box(.13, .9, .14, metal, side * .83, .45, 0, group); box(.5, .12, .9, darkConcrete, side * .83, .06, 0, group); box(.11, .11, .05, lampMat, side * .95, .81, .18, group); }
    } else if (h.type === 'debris') {
      const rock = new T.Mesh(new T.DodecahedronGeometry(.83, 0), concrete); rock.scale.set(1.25, .7, .9); rock.position.y = .48; rock.rotation.set(.2, h.seed, .2); rock.castShadow = true; group.add(rock);
      box(1.5, .06, .07, metal, .2, .75, 0, group).rotation.z = -.25;
      if (h.falling) {
        const warning = new T.Mesh(new T.PlaneGeometry(2.8, 3.2), new T.MeshBasicMaterial({ color: '#c6a06a', transparent: true, opacity: .3, depthWrite: false })); warning.rotation.x = -Math.PI / 2; warning.position.y = .015; warning.name = 'warning'; group.add(warning);
      }
    } else if (h.type === 'floating') {
      box(2.3, 1.15, 1.5, concrete, 0, 3.05, 0, group, true);
      box(2.4, .1, 1.6, stripeMat, 0, 2.5, 0, group);
    } else {
      box(2.35, 3.7, 1.4, darkConcrete, 0, 1.85, 0, group, true);
      box(2.39, .22, 1.45, stripeMat, 0, 1.5, 0, group);
      for (const side of [-1, 1]) box(.08, 2.5, .03, whiteMark, side * 1.1, 1.9, .72, group);
    }
    scene.add(group); return group;
  }
  // A dressed, articulated human runner: hood, jacket, backpack, trouser seams and shoes.
  const runner = new T.Group(); scene.add(runner);
  const jacket = mat('#a0967e', .92); const jacketDark = mat('#726f60'); const trousers = mat('#303d40'); const shoes = mat('#b0afa0');
  function capsule(radius, length, material, parent, x, y, z) {
    const mesh = new T.Mesh(new T.CapsuleGeometry(radius, length, 5, 10), material); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
  }
  capsule(.32, .48, jacket, runner, 0, 1.32, 0);
  const hood = new T.Mesh(new T.SphereGeometry(.27, 16, 12), jacket); hood.scale.set(1, 1.1, 1); hood.position.set(0, 1.93, -.02); hood.castShadow = true; runner.add(hood);
  capsule(.20, .35, jacketDark, runner, 0, 1.36, .28);
  box(.34, .33, .14, jacketDark, 0, 1.22, .43, runner);
  box(.045, .46, .04, curbMat, -.2, 1.4, .38, runner);
  box(.045, .46, .04, curbMat, .2, 1.4, .38, runner);
  box(.18, .045, .02, whiteMark, 0, 1.37, .51, runner);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(side * .18, .94, 0); runner.add(leg);
    capsule(.125, .27, trousers, leg, 0, -.24, 0);
    const shin = new T.Group(); shin.position.y = -.43; leg.add(shin);
    capsule(.1, .3, trousers, shin, 0, -.22, .01);
    box(.23, .14, .41, shoes, 0, -.47, -.09, shin, true);
    box(.23, .05, .42, tireMat, 0, -.53, -.09, shin);
    legs.push({ leg, shin });
    const arm = new T.Group(); arm.position.set(side * .34, 1.58, 0); runner.add(arm);
    capsule(.12, .24, jacket, arm, 0, -.2, 0);
    const forearm = new T.Group(); forearm.position.y = -.34; forearm.rotation.x = -1; arm.add(forearm);
    capsule(.095, .21, jacket, forearm, 0, -.17, 0);
    capsule(.074, .06, jacketDark, forearm, 0, -.34, 0);
    arms.push(arm);
  }
  const contactShadowTexture = canvasTexture(64, 64, ctx => { const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, '#000000a0'); g.addColorStop(1, '#00000000'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); });
  const contactShadow = new T.Mesh(new T.PlaneGeometry(2.5, 3), new T.MeshBasicMaterial({ map: contactShadowTexture, transparent: true, depthWrite: false })); contactShadow.rotation.x = -Math.PI / 2; contactShadow.position.set(0, .005, 4); scene.add(contactShadow);
  const water = new T.Mesh(new T.PlaneGeometry(13.65, 260, 24, 120), new T.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uLight: { value: 1 } }, transparent: true, depthWrite: false,
    vertexShader: 'uniform float uTime; varying vec2 vUv; varying float vWave; void main(){vUv=uv; vec3 p=position; float w=sin(p.y*2.2+uTime*3.)*.035+sin(p.x*3.6+p.y*.7-uTime*2.)*.025; p.z+=w; vWave=w; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader: 'uniform float uTime; uniform float uOpacity; uniform float uLight; varying vec2 vUv; varying float vWave; void main(){float streak=pow(max(0.,sin(vUv.x*42.+sin(vUv.y*15.+uTime)*.4)),12.); vec3 c=mix(vec3(.16,.25,.27),vec3(.42,.49,.48),vUv.y); c+=streak*.06+vWave; gl_FragColor=vec4(c*uLight,uOpacity);}'
  })); water.rotation.x = -Math.PI / 2; water.position.set(0, -.05, -105); scene.add(water);
  const rainCount = mobile ? 650 : 1500;
  const rainPositions = new Float32Array(rainCount * 6);
  for (let i = 0; i < rainCount; i++) {
    const j = i * 6; rainPositions[j] = (Math.random() - .5) * 65; rainPositions[j + 1] = Math.random() * 36; rainPositions[j + 2] = 17 - Math.random() * 145;
    rainPositions[j + 3] = rainPositions[j] - .1; rainPositions[j + 4] = rainPositions[j + 1] + .9; rainPositions[j + 5] = rainPositions[j + 2];
  }
  const rainGeo = new T.BufferGeometry(); rainGeo.setAttribute('position', new T.BufferAttribute(rainPositions, 3));
  const rainMat = new T.LineBasicMaterial({ color: '#b8cdd0', transparent: true, opacity: 0, depthWrite: false });
  const rain = new T.LineSegments(rainGeo, rainMat); rain.frustumCulled = false; scene.add(rain);
  const dustCount = mobile ? 100 : 220;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) { dustPositions[i * 3] = (Math.random() - .5) * 55; dustPositions[i * 3 + 1] = Math.random() * 18; dustPositions[i * 3 + 2] = 10 - Math.random() * 160; }
  const dustGeo = new T.BufferGeometry(); dustGeo.setAttribute('position', new T.BufferAttribute(dustPositions, 3));
  const dustMat = new T.PointsMaterial({ color: '#c9bca0', size: .09, transparent: true, opacity: .24, depthWrite: false });
  const dust = new T.Points(dustGeo, dustMat); scene.add(dust);
  // Scenery-only rubble falls outside the playable lanes; collision debris has an amber ground warning.
  const rubble = [];
  for (let i = 0; i < 30; i++) {
    const mesh = new T.Mesh(new T.BoxGeometry(.6 + Math.random(), .4 + Math.random(), .7), i % 3 ? concrete : glass);
    mesh.position.set((i % 2 ? -1 : 1) * (8 + Math.random() * 14), 10 + Math.random() * 40, -15 - Math.random() * 140);
    mesh.userData = { fall: 2 + Math.random() * 5, spin: Math.random(), baseY: mesh.position.y }; mesh.visible = false; scene.add(mesh); rubble.push(mesh);
  }
  let audioContext = null, audioOn = false, masterGain = null, engineOsc = null, engineGain = null;
  function initAudio() {
    if (audioContext) { audioContext.resume().catch(() => {}); return; }
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioContext.createGain(); masterGain.gain.value = audioOn ? .17 : 0; masterGain.connect(audioContext.destination);
      engineOsc = audioContext.createOscillator(); engineOsc.type = 'triangle'; engineOsc.frequency.value = 42;
      engineGain = audioContext.createGain(); engineGain.gain.value = .035; engineOsc.connect(engineGain); engineGain.connect(masterGain); engineOsc.start();
    } catch (_) { audioOn = false; }
  }
  function tone(frequency, duration = .08, type = 'sine', level = .12, endFrequency = frequency) {
    if (!audioOn || !audioContext) return;
    const osc = audioContext.createOscillator(), gain = audioContext.createGain(), now = audioContext.currentTime;
    osc.type = type; osc.frequency.setValueAtTime(frequency, now); osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(level, now); gain.gain.exponentialRampToValueAtTime(.001, now + duration); osc.connect(gain); gain.connect(masterGain); osc.start(); osc.stop(now + duration);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  $('sound-toggle').addEventListener('click', () => {
    audioOn = !audioOn; initAudio(); if (masterGain) masterGain.gain.setTargetAtTime(audioOn ? .17 : 0, audioContext.currentTime, .05);
    $('sound-toggle').setAttribute('aria-pressed', String(audioOn)); $('sound-toggle').setAttribute('aria-label', audioOn ? 'Mute sound' : 'Enable sound');
    $('sound-waves').setAttribute('d', audioOn ? 'M17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14' : 'm17 9 5 6m0-6-5 6'); tone(520);
  });
  let best = 0;
  try { best = Number(localStorage.getItem('run99.best')) || 0; } catch (_) { /* Playable when browser storage is blocked. */ }
  let visualTime = 0, introDistance = 0, lastTime = performance.now(), accumulator = 0;
  let shake = 0, eventTimer = 0, bonusTimer = 0, cameraFov = 58, isPaused = false, lastStep = 0;
  let currentSky = baseSky.clone(); const targetSky = baseSky.clone(); const lookTarget = new T.Vector3();
  const routeLanes = [...document.querySelectorAll('.route-lanes i')];
  const speedTicks = [...document.querySelectorAll('.speed-ticks i')];
  function announce(phase) {
    const config = RUN99.PHASES[phase];
    $('event-number').textContent = `CITY ADVISORY / ${String(phase + 1).padStart(2, '0')}`;
    $('event-title').textContent = config.title; $('event-detail').textContent = config.detail;
    $('event-sign').classList.add('visible'); eventTimer = phase === 9 ? 4.1 : 3.6;
    $('phase-label').textContent = `${String(phase + 1).padStart(2, '0')} / 10 — ${config.name}`;
    $('game').classList.toggle('rain', phase === 1 || phase >= 8);
    $('game').classList.toggle('blackout', phase === 3);
    $('game').classList.toggle('flood', phase === 5 || phase >= 8);
    $('game').classList.toggle('collapse', phase === 4 || phase >= 9);
    $('game').classList.toggle('urgent', phase === 9);
    if (phase >= 4) shake = .3;
    tone(420, .13, 'sine', .2); setTimeout(() => { if (sim.state === 'running' && !isPaused) tone(330, .18, 'sine', .12); }, 170);
  }
  sim.onEvent = (name, data) => {
    if (name === 'phase') announce(sim.phase);
    if (name === 'bonus') {
      if (data.label !== 'FRAGMENT' || bonusTimer < .3) { $('bonus').textContent = `${data.label} +${data.value}`; $('bonus').classList.add('visible'); bonusTimer = data.label === 'FRAGMENT' ? .55 : 1.1; }
    }
    if (name === 'collect') tone(680 + sim.combo * 100, .07, 'sine', .07);
    if (name === 'jump') tone(140, .18, 'sine', .11, 290);
    if (name === 'dash') { tone(95, .35, 'sawtooth', .08, 42); shake = .1; }
    if (name === 'land') { shake = Math.max(shake, .10); tone(65, .09, 'triangle', .15, 30); }
    if (name === 'smash') { shake = .42; tone(75, .25, 'sawtooth', .25, 23); }
    if (name === 'end') showResults(data.survived);
  };
  function clearEntities() {
    for (const mesh of hazardMeshes.values()) disposeEntity(mesh);
    for (const mesh of pickupMeshes.values()) scene.remove(mesh);
    hazardMeshes.clear(); pickupMeshes.clear();
  }
  function disposeEntity(group) {
    scene.remove(group);
    group.traverse(obj => {
      if (!obj.isMesh) return;
      // Shared boxes/materials stay alive; per-vehicle wheels, beam planes and warning zones are freed.
      if (obj.geometry !== boxGeo && obj.geometry !== fragmentGeo) obj.geometry.dispose();
      if (obj.material.transparent && obj.material !== fragmentMat) obj.material.dispose();
    });
  }
  function beginRun() {
    clearEntities(); sim.start(); isPaused = false; accumulator = 0; shake = 0;
    $('game').className = 'playing'; $('result-screen').hidden = true; $('pause-screen').hidden = true;
    $('pause-button').hidden = false; $('system-status').textContent = 'RUN IN PROGRESS'; $('timer-caption').textContent = 'SECONDS TO SURVIVE';
    $('intro').inert = true; $('mission-note').inert = true;
    lastTime = performance.now(); lastStep = 0;
    for (const b of buildings) { b.rotation.set(0, 0, 0); b.position.y = 0; }
    initAudio(); announce(0); $('start-button').blur(); $('restart-button').blur();
  }
  $('start-button').addEventListener('click', beginRun); $('restart-button').addEventListener('click', beginRun);
  function pauseGame() {
    if (sim.state !== 'running') return;
    isPaused = !isPaused; $('pause-screen').hidden = !isPaused;
    $('pause-button').setAttribute('aria-label', isPaused ? 'Resume game' : 'Pause game');
    if (engineGain && audioContext) engineGain.gain.setTargetAtTime(isPaused ? 0 : .035, audioContext.currentTime, .1);
    if (isPaused) $('resume-button').focus(); else { lastTime = performance.now(); $('resume-button').blur(); }
  }
  $('pause-button').addEventListener('click', pauseGame); $('resume-button').addEventListener('click', pauseGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden && sim.state === 'running' && !isPaused) pauseGame(); });
  window.addEventListener('blur', () => { if (sim.state === 'running' && !isPaused) pauseGame(); });
  function action(name) {
    if (isPaused) return;
    if (name === 'left') sim.move(-1); if (name === 'right') sim.move(1);
    if (name === 'jump') sim.jump(); if (name === 'dash') sim.dash();
  }
  window.addEventListener('keydown', event => {
    const key = event.code;
    if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ShiftLeft', 'ShiftRight'].includes(key)) event.preventDefault();
    if (event.repeat) return;
    if (key === 'Escape' || key === 'KeyP') { pauseGame(); return; }
    if ((key === 'Enter' || key === 'Space') && sim.state !== 'running') { beginRun(); return; }
    if (key === 'KeyA' || key === 'ArrowLeft') action('left');
    if (key === 'KeyD' || key === 'ArrowRight') action('right');
    if (key === 'Space' || key === 'ArrowUp') action('jump');
    if (key === 'ShiftLeft' || key === 'ShiftRight') action('dash');
  });
  document.querySelectorAll('[data-action]').forEach(button => button.addEventListener('pointerdown', event => { event.preventDefault(); action(button.dataset.action); }));
  let touchStart = null;
  $('world').addEventListener('pointerdown', e => { touchStart = { x: e.clientX, y: e.clientY, time: performance.now() }; });
  $('world').addEventListener('pointerup', e => {
    if (!touchStart || sim.state !== 'running') return;
    const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
    if (Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy)) action(dx < 0 ? 'left' : 'right');
    else if (dy < -25) action('jump'); else if (dy > 35) action('dash'); else if (performance.now() - touchStart.time < 250) action('jump');
    touchStart = null;
  });
  function showResults(survived) {
    const newBest = sim.score > best; best = Math.max(best, sim.score);
    try { localStorage.setItem('run99.best', String(best)); } catch (_) { /* Session best remains available. */ }
    $('game').classList.add('ended'); $('event-sign').classList.remove('visible'); $('bonus').classList.remove('visible');
    $('pause-button').hidden = true; $('result-screen').hidden = false;
    const t = sim.time.toFixed(2).split('.'); $('result-time').innerHTML = `${t[0]}<span>.${t[1]}</span>`;
    $('result-title').textContent = survived ? 'SURVIVED' : 'RUN ENDED';
    $('result-eyebrow').textContent = survived ? 'TRANSMISSION COMPLETE / 99.00' : 'SIGNAL LOST / ' + sim.cause;
    $('result-message').textContent = survived ? "The city gave in. You didn't." : sim.phase < 2 ? 'Read the road. Find the gap. Take another breath.' : 'The city is still standing. So is your next chance.';
    $('result-distance').innerHTML = `${Math.floor(sim.distance).toLocaleString()} <small>M</small>`;
    $('result-score').textContent = sim.score.toLocaleString(); $('result-best').textContent = best.toLocaleString();
    $('result-events').innerHTML = `${survived ? 10 : Math.floor(sim.time / 10)} <small>/ 10</small>`;
    $('result-misses').textContent = sim.nearMisses; $('new-best').hidden = !newBest;
    $('result-id').textContent = survived ? 'SECTOR 09 / EVACUATED' : 'SECTOR 09 / DISCONNECTED';
    if (engineGain) engineGain.gain.setTargetAtTime(0, audioContext.currentTime, .05);
    tone(survived ? 330 : 90, survived ? .9 : .3, survived ? 'sine' : 'sawtooth', .25, survived ? 660 : 22);
    $('restart-button').focus({ preventScroll: true });
  }
  function updateScenery(travel, dt, phase) {
    const bend = sim.state === 'ready' ? 0 : sim.laneX(1);
    for (const road of roadSegments) {
      road.position.z += travel; if (road.position.z > 65) road.position.z -= roadSegments.length * roadLength;
      road.position.x = phase >= 7 ? sim.laneX(1, road.position.z - 4) : 0;
      road.rotation.z = phase >= 7 ? Math.sin(visualTime + road.position.z * .035) * .012 : 0;
    }
    for (const b of buildings) {
      b.position.z += travel;
      if (b.position.z > 55) { b.position.z -= Math.ceil(buildingCount / 2) * 22; b.rotation.set(0, 0, 0); b.position.y = 0; }
      const unstable = phase === 4 || phase >= 7;
      const progress = phase === 9 ? Math.min(1, (sim.time - 90) / 8) : .25;
      if (unstable && b.position.z > -145 && b.userData.seed > (phase === 9 ? .18 : .68)) {
        b.rotation.z += ((-b.userData.side * (.1 + progress * .28)) - b.rotation.z) * dt * .4;
        b.position.y -= dt * (phase === 9 ? 1.7 : .18);
        b.rotation.x = Math.sin(visualTime * 2 + b.userData.seed) * .007;
      } else { b.rotation.z *= 1 - dt; }
    }
    for (const group of streetGroups) { group.position.z += travel; if (group.position.z > 50) group.position.z -= streetGroups.length * 34; group.position.x = phase >= 7 ? bend * .6 : 0; }
    for (const car of ambientCars) { car.position.z += travel * .84; if (car.position.z > 30) car.position.z -= 340; }
    for (const piece of rubble) {
      piece.visible = phase === 4 || phase === 6 || phase >= 8;
      if (!piece.visible) continue;
      piece.position.z += travel; piece.rotation.x += dt * piece.userData.spin; piece.rotation.z += dt * .45;
      piece.position.y -= dt * (phase === 6 ? -.2 : piece.userData.fall * (phase === 9 ? 2.5 : 1));
      if (piece.position.z > 20 || piece.position.y < 0) { piece.position.y = 15 + Math.random() * 35; piece.position.z = -80 - Math.random() * 100; }
    }
  }
  function updateEntities(dt) {
    const liveHazards = new Set(sim.hazards.map(h => h.id));
    for (const [id, mesh] of hazardMeshes) if (!liveHazards.has(id)) { disposeEntity(mesh); hazardMeshes.delete(id); }
    for (const h of sim.hazards) {
      if (!hazardMeshes.has(h.id)) hazardMeshes.set(h.id, makeHazard(h));
      const mesh = hazardMeshes.get(h.id); mesh.position.set(h.x, 0, h.z + 4); mesh.visible = !h.destroyed;
      if (h.type === 'floating') { mesh.rotation.z = Math.sin(visualTime + h.seed) * .08; }
      if (h.falling) {
        const fallHeight = Math.max(0, (-h.z - 32) * .22);
        for (const child of mesh.children) {
          if (child.name === 'warning') child.material.opacity = .14 + Math.sin(visualTime * 9) * .09;
          else if (child === mesh.children[0]) child.position.y = .48 + fallHeight;
          else child.position.y = .75 + fallHeight;
        }
      }
      if (h.type === 'car' && h.switched && h.z < -10) mesh.rotation.y = (sim.laneX(h.targetLane) - h.x) * .09;
    }
    const livePickups = new Set(sim.pickups.map(p => p.id));
    for (const [id, mesh] of pickupMeshes) if (!livePickups.has(id)) { scene.remove(mesh); pickupMeshes.delete(id); }
    for (const p of sim.pickups) {
      if (!pickupMeshes.has(p.id)) { const mesh = new T.Mesh(fragmentGeo, fragmentMat); scene.add(mesh); pickupMeshes.set(p.id, mesh); }
      const mesh = pickupMeshes.get(p.id); mesh.position.set(sim.laneX(p.lane, p.z), p.y + Math.sin(visualTime * 3 + p.id) * .09, p.z + 4); mesh.rotation.y += dt * 1.5; mesh.rotation.z = .2;
    }
  }
  function updateAtmosphere(dt, phase) {
    const rainy = phase === 1 || phase >= 8;
    const dark = phase === 3;
    targetSky.set(dark ? '#131e25' : phase >= 9 ? '#777a71' : rainy ? '#6e858d' : phase === 6 ? '#8b9d9f' : '#929d9c');
    currentSky.lerp(targetSky, 1 - Math.exp(-dt * 1.1)); scene.background.copy(currentSky); scene.fog.color.copy(currentSky);
    const density = dark ? .041 : rainy ? .019 : phase >= 9 ? .019 : .0105;
    scene.fog.density += (density - scene.fog.density) * dt * 1.5;
    hemi.intensity += ((dark ? .25 : rainy ? 1.35 : 2.1) - hemi.intensity) * dt * 1.8;
    sun.intensity += ((dark ? .03 : rainy ? .7 : 3.1) - sun.intensity) * dt * 1.8;
    sunGlow.material.opacity += ((dark ? 0 : rainy ? .15 : .7) - sunGlow.material.opacity) * dt;
    fill.intensity += ((dark ? .08 : .6) - fill.intensity) * dt;
    headlight.intensity += ((dark ? 110 : rainy ? 24 : 0) - headlight.intensity) * dt * 2;
    headlight.position.x = sim.x; headlight.target.position.x = sim.x;
    emergency.intensity = dark || phase >= 8 ? Math.max(0, Math.sin(visualTime * 8)) * 28 : 0;
    roadMat.roughness += ((rainy || phase === 5 ? .24 : .88) - roadMat.roughness) * dt;
    roadMat.metalness += ((rainy || phase === 5 ? .5 : .12) - roadMat.metalness) * dt;
    rainMat.opacity += ((rainy ? .28 : 0) - rainMat.opacity) * dt * 1.8;
    if (rainMat.opacity > .01) {
      for (let i = 0; i < rainCount; i++) {
        const j = i * 6; rainPositions[j] += dt * 2; rainPositions[j + 1] -= dt * 28; rainPositions[j + 2] += dt * sim.speed * .85;
        if (rainPositions[j + 1] < 0 || rainPositions[j + 2] > 24) { rainPositions[j] = (Math.random() - .5) * 65; rainPositions[j + 1] = 22 + Math.random() * 18; rainPositions[j + 2] = 15 - Math.random() * 145; }
        rainPositions[j + 3] = rainPositions[j] - .08; rainPositions[j + 4] = rainPositions[j + 1] + .85; rainPositions[j + 5] = rainPositions[j + 2] - .22;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    const flood = phase === 5 || phase >= 8;
    water.material.uniforms.uTime.value = visualTime;
    water.material.uniforms.uOpacity.value += ((flood ? .68 : rainy ? .12 : 0) - water.material.uniforms.uOpacity.value) * dt * 1.5;
    water.material.uniforms.uLight.value = dark ? .2 : .85;
    water.position.y += ((flood ? .12 + (sim.time % 10) * .025 : -.035) - water.position.y) * dt * 2;
    water.position.x = sim.laneX(1);
    dustMat.opacity = phase >= 9 ? .7 : phase === 4 ? .45 : .2;
    for (let i = 0; i < dustCount; i++) { const j = i * 3; dustPositions[j + 2] += dt * sim.speed * .7; dustPositions[j] += Math.sin(visualTime + i) * dt * .3; if (dustPositions[j + 2] > 15) dustPositions[j + 2] = -160; }
    dustGeo.attributes.position.needsUpdate = true;
  }
  function updateRunner(dt, running) {
    const t = visualTime * (running ? 10.5 + sim.speed * .12 : 3.2);
    runner.position.set(running ? sim.x : 0, (running ? sim.y : 0) + Math.abs(Math.sin(t)) * (running ? .045 : .008), 4);
    const lean = running ? (sim.laneX(sim.lane) - sim.x) * -.09 : 0;
    runner.rotation.z += (lean - runner.rotation.z) * Math.min(1, dt * 8);
    runner.rotation.x += ((sim.dashTime > 0 ? -.28 : -.08) - runner.rotation.x) * dt * 8;
    for (let i = 0; i < 2; i++) {
      const stride = Math.sin(t + i * Math.PI);
      legs[i].leg.rotation.x = sim.y > .1 ? (i ? -.55 : .8) : stride * (running ? .8 : .1);
      legs[i].shin.rotation.x = sim.y > .1 ? -.8 : -Math.max(0, -stride) * 1.1;
      arms[i].rotation.x = sim.y > .1 ? -.5 : -stride * (running ? .65 : .08);
      arms[i].rotation.z = i ? -.08 : .08;
    }
    contactShadow.position.x = runner.position.x; contactShadow.material.opacity = 1 / (1 + sim.y * .5); contactShadow.scale.setScalar(1 + sim.y * .15);
    if (running && sim.y < .1 && Math.floor(t / Math.PI) !== lastStep) { lastStep = Math.floor(t / Math.PI); tone(65, .045, 'triangle', .045, 35); }
  }
  function updateCamera(dt, running) {
    const portrait = innerWidth < 760;
    const targetX = running ? sim.x * .38 : portrait ? -6.5 : -7.8;
    const targetY = running ? 5.2 + sim.y * .37 + (sim.phase === 6 ? .5 : 0) : 6.7;
    const targetZ = running ? 14.1 + (sim.dashTime > 0 ? 1.1 : 0) : 18;
    const smoothing = 1 - Math.exp(-dt * (running ? 5 : 2));
    camera.position.x += (targetX - camera.position.x) * smoothing;
    camera.position.y += (targetY - camera.position.y) * smoothing;
    camera.position.z += (targetZ - camera.position.z) * smoothing;
    lookTarget.set(running ? sim.x * .3 : 1.5, running ? 1.55 + sim.y * .24 : 3.15, running ? -26 : -36);
    if (!reducedMotion && running) {
      const quake = (sim.phase === 4 ? .027 : sim.phase >= 8 ? .035 + Math.max(0, sim.time - 90) * .006 : 0) + shake;
      camera.position.x += Math.sin(visualTime * 43) * quake;
      camera.position.y += Math.sin(visualTime * 38) * quake * .7;
    }
    camera.lookAt(lookTarget);
    cameraFov += (((running ? 59 : 58) + (portrait ? 9 : 0) + (sim.dashTime > 0 && !reducedMotion ? 9 : 0)) - cameraFov) * dt * 5;
    camera.fov = cameraFov; camera.updateProjectionMatrix(); shake = Math.max(0, shake - dt * 1.5);
  }
  function updateHUD() {
    const remaining = Math.max(0, 99 - sim.time); const parts = remaining.toFixed(2).split('.');
    $('countdown').textContent = parts[0].padStart(2, '0'); $('countdown-decimal').textContent = '.' + parts[1];
    $('time-progress').style.width = `${remaining / 99 * 100}%`;
    $('speed').textContent = String(Math.round(sim.speed * 3.6)).padStart(3, '0');
    $('distance').textContent = String(Math.floor(sim.distance)).padStart(4, '0');
    $('combo').innerHTML = `×${Math.floor(sim.combo)}<span>.${Math.floor(sim.combo % 1 * 10)}</span>`;
    $('score').textContent = `${String(sim.score).padStart(6, '0')} PTS`;
    $('dash-charge').style.width = `${(1 - sim.dashCooldown / 4.5) * 100}%`;
    $('dash-indicator').style.color = sim.dashCooldown ? '#aebbb76b' : '#dce8d5';
    speedTicks.forEach((tick, i) => tick.classList.toggle('on', i < sim.speed / 4.5));
    let threat = 0;
    const unsafe = [false, false, false];
    for (const h of sim.hazards) {
      if (h.z > -65 && h.z < 3 && !h.destroyed) {
        const gap = Math.abs(h.x - sim.x);
        threat = Math.max(threat, (1 - Math.max(0, -h.z) / 65) * (gap < 1.6 ? 1 : .5));
        if (h.z > -50) unsafe[h.switched ? h.targetLane : h.lane] = true;
      }
    }
    $('threat-arc').style.strokeDashoffset = 208 - (25 + threat * 153);
    $('threat-needle').style.transform = `rotate(${threat * 250}deg)`;
    $('threat-label').textContent = threat > .68 ? 'CRITICAL' : threat > .35 ? 'ELEVATED' : 'NOMINAL';
    $('threat-label').style.color = threat > .68 ? '#e5a775' : '';
    routeLanes.forEach((lane, i) => { lane.classList.toggle('active', i === sim.lane); lane.classList.toggle('danger', unsafe[i]); });
    $('route-advice').textContent = unsafe[sim.lane] ? sim.dashCooldown <= 0 ? 'GAP / JUMP / DASH' : 'FIND A GAP' : 'ROUTE OPEN';
  }
  // Capture the actual city once for physically filtered glass, paint and wet-asphalt reflections.
  const reflectionTarget = new T.WebGLCubeRenderTarget(mobile ? 64 : 128);
  const reflectionCamera = new T.CubeCamera(.5, 300, reflectionTarget);
  reflectionCamera.position.set(0, 3, -35);
  runner.visible = false; reflectionCamera.update(renderer, scene); runner.visible = true;
  const pmrem = new T.PMREMGenerator(renderer);
  const environment = pmrem.fromCubemap(reflectionTarget.texture);
  scene.environment = environment.texture;
  reflectionTarget.dispose(); pmrem.dispose();
  camera.position.set(-7.8, 6.7, 18); camera.lookAt(1.5, 3.15, -36);
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize);
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - lastTime) / 1000, .10); lastTime = now;
    if (isPaused || sim.state === 'dead' || sim.state === 'survived') { renderer.render(scene, camera); return; }
    visualTime += dt;
    const running = sim.state === 'running';
    if (running) {
      const before = sim.distance; accumulator += dt;
      while (accumulator >= 1 / 120 && sim.state === 'running') { sim.update(1 / 120); accumulator -= 1 / 120; }
      if (sim.state !== 'running') { updateHUD(); renderer.render(scene, camera); return; }
      updateScenery(sim.distance - before, dt, sim.phase); updateEntities(dt);
      eventTimer -= dt; bonusTimer -= dt;
      if (eventTimer <= 0) $('event-sign').classList.remove('visible');
      if (bonusTimer <= 0) $('bonus').classList.remove('visible');
      updateHUD();
      if (engineOsc && audioContext) { engineOsc.frequency.setTargetAtTime(35 + sim.speed * 1.8, audioContext.currentTime, .1); engineGain.gain.setTargetAtTime(.035, audioContext.currentTime, .2); }
    } else { introDistance += dt * 1.5; updateScenery(dt * 1.5, dt, 0); }
    updateAtmosphere(dt, running ? sim.phase : 0); updateRunner(dt, running); updateCamera(dt, running);
    renderer.render(scene, camera);
  }
  updateRunner(.016, false); renderer.render(scene, camera);
  $('loading').classList.add('loaded');
  requestAnimationFrame(frame);
})();
