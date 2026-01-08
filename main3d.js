// 3D Self-Driving Car Physics Playground using Three.js via CDN, no bundler or modules.

// --- DOM references ---

const rootEl = document.getElementById("threeRoot");
const introModal = document.getElementById("introModal");
const modalStartBtn = document.getElementById("modalStartBtn");

const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnReset = document.getElementById("btnReset");
const modeInputs = document.querySelectorAll("input[name='mode']");

const maxSpeedSlider = document.getElementById("maxSpeed");
const brakeStrengthSlider = document.getElementById("brakeStrength");
const sensorRangeSlider = document.getElementById("sensorRange");

const maxSpeedVal = document.getElementById("maxSpeedVal");
const brakeStrengthVal = document.getElementById("brakeStrengthVal");
const sensorRangeVal = document.getElementById("sensorRangeVal");

const metricTime = document.getElementById("metricTime");
const metricCollisions = document.getElementById("metricCollisions");
const metricDistance = document.getElementById("metricDistance");
const metricStatus = document.getElementById("metricStatus");

// --- Audio Manager (Web Audio API) ---
const SoundManager = {
  ctx: null,
  masterGain: null,
  engineOsc: null,
  engineGain: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Limit overall volume
    this.masterGain.connect(this.ctx.destination);

    this.initialized = true;
    this.startEngineSound();

    // Ambient loops
    setInterval(() => { if (running) this.playBird(); }, 4000 + Math.random() * 6000);
    setInterval(() => { if (running) this.playDistantHorn(); }, 8000 + Math.random() * 12000);
  },

  startEngineSound() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;

    // Low pass filter to muffle the harsh sawtooth
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.engineGain.gain.value = 0.1;
    this.engineOsc.start();
  },

  updateEngine(speed, maxSpeed) {
    if (!this.ctx) return;
    const ratio = Math.abs(speed) / maxSpeed;
    // Pitch shift based on speed
    const targetFreq = 60 + (ratio * 120);
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    // Volume wobble for idle
    const wobble = Math.sin(this.ctx.currentTime * 10) * 0.02;
    this.engineGain.gain.setTargetAtTime(0.1 + (ratio * 0.1) + wobble, this.ctx.currentTime, 0.1);
  },

  playBraking() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square'; // pseudo-noise
    // Actually typically we use a noise buffer, but for simple synthesis:
    // FM synthesis for "screech"
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.3);

    // Creating white noise buffer is better for brakes
    const bufferSize = this.ctx.sampleRate * 0.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filter it to be high-pitched hiss
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);

    noise.start();
  },

  playBird() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(2000, now);
    osc.frequency.linearRampToValueAtTime(2500, now + 0.1);
    osc.frequency.linearRampToValueAtTime(2000, now + 0.2);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain.gain.linearRampToValueAtTime(0, now + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(now + 0.3);
  },

  playDistantHorn() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 400; // Car hornish

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(now + 0.7);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(now + 0.7);
  },

  playOceanNoise() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2.0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.2;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.05;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();

    // Modulate volume for waves
    setInterval(() => {
      if (!running) return;
      const now = this.ctx.currentTime;
      gain.gain.linearRampToValueAtTime(0.15, now + 2);
      gain.gain.linearRampToValueAtTime(0.05, now + 4);
    }, 4000);
  }
};

// --- Three.js setup ---

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFFA07A); // Light Salmon / Sunset-ish
// Gradient background workaround or just a nice solid color
scene.background = new THREE.Color(0x87CEEB); // Keep blue for day, maybe brighter
scene.background = new THREE.Color(0x3bb9ff); // Deep Sky Blue (Tropical)
scene.fog = new THREE.Fog(0xFFFFFF, 80, 250); // White hazier mist (heat haze)




const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(rootEl.clientWidth, rootEl.clientHeight);
renderer.shadowMap.enabled = true;
rootEl.appendChild(renderer.domElement);



// Camera: positioned above and slightly behind the car, looking down.
const camera = new THREE.PerspectiveCamera(
  45,
  rootEl.clientWidth / rootEl.clientHeight,
  0.1,
  1000
);
camera.position.set(-40, 40, 80);
camera.lookAt(0, 0, 0);

// Lights
const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x0f172a, 0.8);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
dirLight.position.set(40, 60, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
scene.add(dirLight);

// Ground
// Ground (Sand/Grass/Pavement mix - simplified to dark asphalt for contrast)
const groundSize = 200; // Bigger world
const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 30, 30);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x2d2d2d,
  metalness: 0.1,
  roughness: 0.8,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Ocean
function createOcean() {
  const geo = new THREE.PlaneGeometry(300, 100, 20, 20);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x006994,
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
    metalness: 0.5
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, -0.5, -90); // Far side
  scene.add(mesh);
  sceneryObjects.push(mesh);
  // Animation data
  mesh.userData = { isWater: true, vertices: geo.attributes.position };
}


// Grid overlay for visual reference
const grid = new THREE.GridHelper(groundSize, 30, 0x1f2937, 0x111827);
scene.add(grid);
// Note: OrbitControls caused issues in some environments when loaded from file://,
// so we keep the camera static but angled nicely. No interactive controls needed for demo.

// --- Environment Decoration ---
// --- Environment Decoration ---
const sceneryObjects = [];
const animatedClouds = [];
const animatedTrees = [];
const animatedBuildings = [];


function createClouds() {
  const cloudCount = 8;
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xeeeeee,
    emissiveIntensity: 0.2,
    roughness: 0.9,
    metalness: 0
  });

  for (let i = 0; i < cloudCount; i++) {
    const group = new THREE.Group();
    const blobs = 3 + Math.floor(Math.random() * 4);
    for (let b = 0; b < blobs; b++) {
      const r = 2 + Math.random() * 3;
      const geo = new THREE.DodecahedronGeometry(r, 0); // Low poly ball
      const mesh = new THREE.Mesh(geo, cloudMat);
      mesh.position.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 6
      );
      group.add(mesh);
    }
    group.position.set(
      (Math.random() - 0.5) * 160,
      30 + Math.random() * 15,
      (Math.random() - 0.5) * 120
    );
    scene.add(group);
    sceneryObjects.push(group);
    animatedClouds.push({ mesh: group, speed: 0.5 + Math.random() * 2 });
  }
}

function createRoadMarkings() {
  // 1. Double Yellow Center Lines (Emissive)
  const lineGeo = new THREE.PlaneGeometry(0.3, 8);
  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    emissive: 0xffcc00,
    emissiveIntensity: 0.5
  });
  const count = 40;
  const spacing = 12;

  // Z axis lines (double line)
  for (let i = -count / 2; i < count / 2; i++) {
    // Left yellow
    let m1 = new THREE.Mesh(lineGeo, yellowMat);
    m1.rotation.x = -Math.PI / 2;
    m1.position.set(-0.35, 0.05, i * spacing);
    m1.receiveShadow = true;
    scene.add(m1);
    sceneryObjects.push(m1);

    // Right yellow
    let m2 = new THREE.Mesh(lineGeo, yellowMat);
    m2.rotation.x = -Math.PI / 2;
    m2.position.set(0.35, 0.05, i * spacing);
    m2.receiveShadow = true;
    scene.add(m2);
    sceneryObjects.push(m2);
  }

  // 2. Dashed White Lane Lines (Outer lanes)
  const dashGeo = new THREE.PlaneGeometry(0.3, 4);
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.3
  });

  for (let i = -count / 2; i < count / 2; i++) {
    const mLeft = new THREE.Mesh(dashGeo, whiteMat);
    mLeft.rotation.x = -Math.PI / 2;
    mLeft.position.set(-7, 0.05, i * 12 + 6); // Offset
    scene.add(mLeft);
    sceneryObjects.push(mLeft);

    const mRight = new THREE.Mesh(dashGeo, whiteMat);
    mRight.rotation.x = -Math.PI / 2;
    mRight.position.set(7, 0.05, i * 12 + 6);
    scene.add(mRight);
    sceneryObjects.push(mRight);
  }

  // 3. Traffic Lights (Neon)
  const poleGeo = new THREE.CylinderGeometry(0.2, 0.2, 9);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 8);
  const boxGeo = new THREE.BoxGeometry(0.8, 2.5, 0.8);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

  // Simple Traffic Light placement
  const lightPos = [
    { x: 15, z: 25, rot: 0 },
    { x: -15, z: -25, rot: Math.PI }
  ];

  lightPos.forEach(p => {
    const group = new THREE.Group();

    // Vertical Pole
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 4.5;
    group.add(pole);

    // Horizontal Arm
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(-4, 8, 0);
    arm.rotation.z = Math.PI / 2;
    group.add(arm);

    // Signal Box
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(-7, 7.5, 0);
    group.add(box);

    // Lights
    const dotGeo = new THREE.CircleGeometry(0.3);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const greenMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green on
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0x222200 }); // Off

    const r = new THREE.Mesh(dotGeo, redMat);
    r.position.set(-7, 8.2, 0.41);
    group.add(r);

    // Green light (active)
    const g = new THREE.Mesh(dotGeo, greenMat);
    g.position.set(-7, 6.8, 0.41);
    group.add(g);

    // Red light glow
    const glow = new THREE.PointLight(0xff0000, 2, 10);
    glow.position.set(-7, 8.2, 1);
    // group.add(glow); // Maybe too expensive?

    group.position.set(p.x, 0, p.z);
    group.rotation.y = p.rot;
    scene.add(group);
    sceneryObjects.push(group);
  });
}


// --- Palms ---

const animatedPalms = [];

function createPalmTrees() {
  // Use a slightly curved trunk
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 2, 0),
    new THREE.Vector3(0.5, 5, 0),
    new THREE.Vector3(1.5, 7, 0)
  ]);
  const trunkGeo = new THREE.TubeGeometry(trunkCurve, 8, 0.35, 8, false);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 1.0 });

  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0);
  leafShape.bezierCurveTo(0.5, 0.5, 1.5, 1, 3, 0); // Leaf curve
  leafShape.lineTo(0, 0);
  const leafGeo = new THREE.ShapeGeometry(leafShape);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x228b22, side: THREE.DoubleSide
  });

  for (let i = 0; i < 40; i++) {
    const group = new THREE.Group();

    // Trunk
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.castShadow = true;
    group.add(trunk);

    // Leaves
    const leavesGroup = new THREE.Group();
    leavesGroup.position.set(1.5, 7, 0); // Top of the curved trunk

    for (let j = 0; j < 7; j++) {
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.rotation.x = -Math.PI * 0.1; // droop
      // leaf.rotation.y = Math.PI / 2;

      const holder = new THREE.Group();
      holder.rotation.y = j * (Math.PI * 2 / 7);
      holder.rotation.z = -Math.PI / 4; // Spread out
      holder.add(leaf);
      leavesGroup.add(holder);
    }
    group.add(leavesGroup);

    // Placement
    let tx, tz;
    const side = i % 2 === 0 ? 1 : -1;
    tx = (18 * side) + (Math.random() - 0.5) * 6;
    tz = (i * 8) - 160;

    if (Math.abs(tz) < 15) continue; // Intersection gap

    group.position.set(tx, 0, tz);

    // Rotate tree randomly for variety
    group.rotation.y = Math.random() * Math.PI * 2;
    const s = 0.8 + Math.random() * 0.4;
    group.scale.set(s, s, s);

    scene.add(group);
    sceneryObjects.push(group);
    animatedPalms.push({ mesh: leavesGroup, phase: Math.random() * 10 });
  }
}



// --- Buildings ---


function createArtDecoBuildings() {
  const colors = [0xff69b4, 0x00ced1, 0xffd700, 0x98fb98, 0xfffacd]; // Vice City Palette
  const buildGeo = new THREE.BoxGeometry(1, 1, 1);
  const winMat = new THREE.MeshStandardMaterial({
    color: 0xffea00,
    emissive: 0xffea00,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });

  // Emissive edges/strips
  const neonMat = new THREE.MeshStandardMaterial({
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 3.0,
    roughness: 0.2
  });

  for (let i = 0; i < 20; i++) { // More buildings
    const col = colors[Math.floor(Math.random() * colors.length)];
    const buildMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, metalness: 0.1 });

    const w = 12 + Math.random() * 10;
    const d = 12 + Math.random() * 10;
    // Make them shorter to avoid blocking view
    const h = 15 + Math.random() * 25;

    // Building Group
    const group = new THREE.Group();

    // Core
    const mesh = new THREE.Mesh(buildGeo, buildMat);
    mesh.scale.set(w, h, d);
    mesh.position.y = h / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Neon Strips (Vertical)
    const stripGeo = new THREE.BoxGeometry(0.5, h, 0.5);
    const s1 = new THREE.Mesh(stripGeo, neonMat);
    s1.position.set(w / 2, h / 2, d / 2);
    const s2 = new THREE.Mesh(stripGeo, neonMat);
    s2.position.set(-w / 2, h / 2, d / 2);
    const s3 = new THREE.Mesh(stripGeo, neonMat);
    s3.position.set(w / 2, h / 2, -d / 2);
    const s4 = new THREE.Mesh(stripGeo, neonMat);
    s4.position.set(-w / 2, h / 2, -d / 2);
    group.add(s1, s2, s3, s4);

    // Windows (Simple scattered boxes for now to simulate lit rooms)
    const winGeo = new THREE.BoxGeometry(1.5, 2.5, 0.5);
    const numWins = Math.floor(h / 5);
    for (let k = 0; k < numWins; k++) {
      // Randomly place some windows on faces
      if (Math.random() > 0.3) {
        const win = new THREE.Mesh(winGeo, winMat);
        win.position.set(0, 4 + k * 5, d / 2 + 0.1);
        win.position.x = (Math.random() - 0.5) * (w - 2);
        group.add(win);
      }
    }

    // Placement
    let bx, bz;
    if (Math.random() > 0.5) {
      // Move them further out to avoid camera blocking (Camera is offset by -40)
      bx = (Math.random() > 0.5 ? 1 : -1) * (90 + Math.random() * 40);
      bz = (Math.random() - 0.5) * 200;
    } else {
      bx = (Math.random() - 0.5) * 200;
      bz = (Math.random() > 0.5 ? 1 : -1) * (90 + Math.random() * 40);
    }

    group.position.set(bx, 0, bz);

    // Intro Animation
    group.scale.y = 0.01;
    group.userData = { targetScaleY: 1, currentScaleY: 0.01 };

    scene.add(group);
    animatedBuildings.push(group);
    sceneryObjects.push(group);

    // Collision Box
    const finalBox = new THREE.Box3();
    finalBox.min.set(bx - w / 2, 0, bz - d / 2);
    finalBox.max.set(bx + w / 2, h, bz + d / 2);
    world.obstacles.push({ mesh: group, box: finalBox });
  }
}



// ... previous code ...

function updateScenery(dt) {
  const time = Date.now() / 1000;

  // Clouds
  for (const c of animatedClouds) {
    c.mesh.position.x += c.speed * dt;
    if (c.mesh.position.x > 80) c.mesh.position.x = -80;
  }

  // Trees (Palms)
  for (const t of animatedPalms) {
    // Sway the leaves group
    t.mesh.rotation.z = Math.sin(time + t.phase) * 0.1;
    t.mesh.rotation.x = Math.cos(time * 0.7 + t.phase) * 0.05;
  }

  // Buildings (Intro animation)
  for (let i = animatedBuildings.length - 1; i >= 0; i--) {
    const b = animatedBuildings[i];
    // If it's a Group (new style)
    if (b.isGroup) {
      if (b.scale.y < b.userData.targetScaleY - 0.01) {
        // Lerp scale
        b.scale.y = THREE.MathUtils.lerp(b.scale.y, b.userData.targetScaleY, dt * 2);
      } else {
        b.scale.y = b.userData.targetScaleY;
        animatedBuildings.splice(i, 1);
      }
    } else {
      // Old style fallback (Mesh center pivot)
      if (b.scale.y < b.userData.targetScaleY - 0.1) {
        b.userData.currentScaleY = THREE.MathUtils.lerp(b.userData.currentScaleY, b.userData.targetScaleY, dt * 3);
        b.scale.y = b.userData.currentScaleY;
        b.position.y = b.userData.currentScaleY / 2;
      } else {
        b.scale.y = b.userData.targetScaleY;
        b.position.y = b.userData.targetScaleY / 2;
        animatedBuildings.splice(i, 1);
      }
    }
  }
}



// World config (in "meters" like units)
const world = {
  width: 100,
  depth: 50,
  obstacles: [],
  target: {
    position: new THREE.Vector3(40, 0, 0),
    radius: 3,
    mesh: null,
  },
};

// Obstacles: rectangular blocks on the ground
const obstacleMat = new THREE.MeshStandardMaterial({
  color: 0x111827,
  metalness: 0.3,
  roughness: 0.6,
});

function createObstacle(x, z, w, d, h = 4) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, obstacleMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(x, h / 2, z);
  scene.add(mesh);
  const box = new THREE.Box3().setFromObject(mesh);
  return { mesh, box, w, d, h };
}

function setupObstacles() {
  // corridor-like obstacles similar to 2D version
  world.obstacles.forEach((o) => scene.remove(o.mesh));
  world.obstacles = [];

  world.obstacles.push(createObstacle(-5, 0, 4, 40)); // center pillar
  world.obstacles.push(createObstacle(10, -12, 4, 22));
  world.obstacles.push(createObstacle(10, 12, 4, 22));
  world.obstacles.push(createObstacle(25, 0, 4, 40));
}

// --- Traffic System ---
const trafficCars = [];

function createTrafficCar(x, z, axis, speed) {
  const group = new THREE.Group();

  // Simple car mesh
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 1.4, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xd9534f, roughness: 0.2, metalness: 0.5 })
  );
  body.position.y = 0.7;
  body.castShadow = true;
  group.add(body);

  // Roof
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 1.0, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xb22222, roughness: 0.2 })
  );
  roof.position.set(-0.2, 1.6, 0);
  roof.castShadow = true;
  group.add(roof);

  group.position.set(x, 0, z);

  // Add logic data
  group.userData = {
    maxSpeed: Math.abs(speed),
    currentSpeed: speed,
    targetSpeed: speed,
    axis: axis, // 'x' or 'z'
    limit: 45 // distance limit
  };

  if (axis === 'z') group.rotation.y = Math.PI / 2;
  // Orient based on velocity sign
  if (speed < 0) group.rotation.y += Math.PI;

  scene.add(group);
  trafficCars.push(group);
}


function updateTraffic(dt) {
  // 1. Check for potential collisions
  // Simplistic: check if anything is in front of us within X meters

  trafficCars.forEach(t => {
    const u = t.userData;
    const radius = 6.0; // Check distance
    let blocked = false;

    // Raycast origin
    const fwd = new THREE.Vector3(
      Math.cos(t.rotation.y), 0, Math.sin(t.rotation.y)
    );
    const origin = t.position.clone().add(new THREE.Vector3(0, 1, 0));

    // Check against other traffic
    for (const other of trafficCars) {
      if (other === t) continue;
      const dist = t.position.distanceTo(other.position);
      if (dist < radius) {
        // Is it in front?
        const toOther = other.position.clone().sub(t.position).normalize();
        if (fwd.dot(toOther) > 0.7) blocked = true;
      }
    }

    // Check against player car
    if (car.position.distanceTo(t.position) < radius + 2) {
      const toPlayer = car.position.clone().sub(t.position).normalize();
      if (fwd.dot(toPlayer) > 0.7) blocked = true;
    }

    // Adjust speed
    if (blocked) {
      u.currentSpeed = THREE.MathUtils.lerp(u.currentSpeed, 0, dt * 5);
    } else {
      u.currentSpeed = THREE.MathUtils.lerp(u.currentSpeed, u.targetSpeed, dt * 2);
    }

    // Move
    if (u.axis === 'x') {
      t.position.x += u.currentSpeed * dt;
      if (t.position.x > u.limit) { t.position.x = -u.limit; }
      if (t.position.x < -u.limit) { t.position.x = u.limit; }
    } else {
      t.position.z += u.currentSpeed * dt;
      if (t.position.z > u.limit) { t.position.z = -u.limit; }
      if (t.position.z < -u.limit) { t.position.z = u.limit; }
    }

    // Suspension/Bump animation
    t.position.y = Math.sin(Date.now() / 150 + t.id) * 0.05; // ID-based offset

    t.updateMatrixWorld();
  });
}



// Target
function createTarget() {
  if (world.target.mesh) {
    scene.remove(world.target.mesh);
  }
  const outerGeo = new THREE.CylinderGeometry(
    world.target.radius + 1.5,
    world.target.radius + 1.5,
    0.2,
    32
  );
  const outerMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.4,
  });
  const pad = new THREE.Mesh(outerGeo, outerMat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.copy(world.target.position);
  pad.receiveShadow = true;

  const innerGeo = new THREE.CylinderGeometry(
    world.target.radius,
    world.target.radius,
    0.3,
    32
  );
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 0.6,
  });
  const core = new THREE.Mesh(innerGeo, innerMat);
  core.rotation.x = -Math.PI / 2;
  core.position.copy(world.target.position).add(new THREE.Vector3(0, 0.15, 0));
  core.castShadow = true;

  const group = new THREE.Group();
  group.add(pad);
  group.add(core);
  scene.add(group);
  world.target.mesh = group;
}

// Car model
const car = {
  object: null,
  chassis: null, // New chassis group for tilt
  width: 3,
  length: 6,

  height: 1.8,
  // State
  position: new THREE.Vector3(-35, 0.9, 0),
  heading: 0, // yaw, radians (0 = +X)
  speed: 0,
  maxSpeed: 18,
  accel: 25,
  brakeStrength: 40,
  friction: 10,
  sensorRange: 22,
  sensorAngles: [-0.7, -0.35, 0, 0.35, 0.7],
};

// 80s Sports Car (Testarossa style)
function createCar() {
  if (car.object) {
    scene.remove(car.object);
  }
  const group = new THREE.Group();
  const chassis = new THREE.Group();
  group.add(chassis);

  // Ferrari Testarossa White
  const carColor = 0xffffff;
  const paintMat = new THREE.MeshStandardMaterial({
    color: carColor,
    metalness: 0.6,
    roughness: 0.2,
    envMapIntensity: 1
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.9,
    roughness: 0.1,
  });

  // 1. Main Body (Lower/Wedge)
  // Slightly wider at rear
  const bodyGeo = new THREE.BoxGeometry(4.8, 0.7, 2.2);
  const body = new THREE.Mesh(bodyGeo, paintMat);
  body.position.y = 0.5;
  body.castShadow = true;
  chassis.add(body);

  // 2. Cabin (Slope)
  const cabinGeo = new THREE.BoxGeometry(2.4, 0.65, 1.7);
  const cabin = new THREE.Mesh(cabinGeo, glassMat);
  cabin.position.set(-0.4, 1.15, 0);
  chassis.add(cabin);

  // 3. Side Strakes (The iconic vents)
  const strakeGeo = new THREE.BoxGeometry(1.6, 0.6, 2.4); // Wider than body
  const strake = new THREE.Mesh(strakeGeo, paintMat);
  strake.position.set(-0.8, 0.6, 0);
  chassis.add(strake);

  // 4. Rear Spoiler (Wing)
  const wingStalks = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.8), paintMat);
  wingStalks.position.set(-2.2, 0.9, 0);
  // chassis.add(wingStalks); // Optional, maybe clean look is better

  // 5. Rear Engine Cover / Slats
  const slatGeo = new THREE.BoxGeometry(1.2, 0.1, 1.6);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(slatGeo, paintMat);
    s.position.set(-1.6 - (i * 0.2), 0.9 + (i * 0.05), 0);
    chassis.add(s);
  }

  // Headlights (Pop-up style - closed)
  const lightGeo = new THREE.BoxGeometry(0.4, 0.1, 0.5);
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 2
  });
  const hl1 = new THREE.Mesh(lightGeo, lightMat);
  const hl2 = new THREE.Mesh(lightGeo, lightMat);
  hl1.position.set(2.2, 0.6, 0.6);
  hl2.position.set(2.2, 0.6, -0.6);
  chassis.add(hl1, hl2);

  // Rear Lights (Neon strip style)
  const tailGeo = new THREE.BoxGeometry(0.1, 0.2, 2.0);
  const tailMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 3 });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(-2.4, 0.6, 0);
  chassis.add(tail);

  // Wheels (Deep dish)
  const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.5, 24);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 });

  const wheelPos = [
    [1.6, 0.35, 1.1], [1.6, 0.35, -1.1],
    [-1.6, 0.35, 1.16], [-1.6, 0.35, -1.16] // Rear wider
  ];
  wheelPos.forEach(p => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.rotation.x = Math.PI / 2;
    // Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.52, 16), rimMat);
    rim.rotation.x = Math.PI / 2;
    w.add(tire);
    w.add(rim);
    w.position.set(...p);
    chassis.add(w);
  });

  group.position.copy(car.position);
  group.rotation.y = car.heading;
  scene.add(group);
  car.object = group;
  car.chassis = chassis; // Store ref
}



// Sensors (visualization only)
const sensorLines = [];
const sensorMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });

function initSensors() {
  sensorLines.forEach((l) => scene.remove(l));
  sensorLines.length = 0;

  for (let i = 0; i < car.sensorAngles.length; i++) {
    const points = [new THREE.Vector3(), new THREE.Vector3()];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geo, sensorMat.clone());
    scene.add(line);
    sensorLines.push(line);
  }
}

// --- Simulation state ---

let mode = "auto";
let running = false;
let lastTime = null;
let accumTime = 0;
let collisions = 0;
let lastBrakeTime = 0;

const keys = new Set();

// --- Helpers ---

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Raycast in XZ plane manually against ground-level obstacle boxes
function raycastXZ(origin, angle, maxDist) {
  const step = 0.4;
  let dist = 0;
  const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const p = new THREE.Vector3();

  while (dist < maxDist) {
    p.copy(origin).addScaledVector(dir, dist);
    // World bounds
    if (
      p.x < -groundSize / 2 ||
      p.x > groundSize / 2 ||
      p.z < -groundSize / 2 ||
      p.z > groundSize / 2
    ) {
      return { hit: true, dist };
    }

    // Check against obstacle boxes (projected on XZ)
    for (const ob of world.obstacles) {
      const b = ob.box;
      if (
        p.x >= b.min.x &&
        p.x <= b.max.x &&
        p.z >= b.min.z &&
        p.z <= b.max.z &&
        p.y >= b.min.y - 1 &&
        p.y <= b.max.y + 1
      ) {
        return { hit: true, dist };
      }
    }

    dist += step;
  }

  return { hit: false, dist: maxDist };
}

// Check collision with traffic
function raycastTraffic(p1, p2) {
  // Simple point-to-box check or ray-box
  // We already have p2 as end point
  const ray = new THREE.Ray(p1, p2.clone().sub(p1).normalize());
  const maxDist = p1.distanceTo(p2);

  let closest = null;
  let closestDist = maxDist;

  for (const t of trafficCars) {
    const box = new THREE.Box3().setFromObject(t);
    // Expand box slightly for "sensor width"
    box.expandByScalar(1.0);

    const intersection = ray.intersectBox(box, new THREE.Vector3());
    if (intersection) {
      const d = p1.distanceTo(intersection);
      if (d < closestDist) {
        closestDist = d;
        closest = t;
      }
    }
  }

  return closest ? { hit: true, dist: closestDist, obj: closest } : null;
}


function getSensorReadings() {
  const readings = [];
  const origin = car.position.clone().add(new THREE.Vector3(0, 0.4, 0));
  for (const rel of car.sensorAngles) {
    const angle = car.heading + rel;
    const hitWorld = raycastXZ(origin, angle, car.sensorRange);

    // Check traffic
    const endPoint = origin.clone().add(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(hitWorld.dist));
    const hitTraffic = raycastTraffic(origin, endPoint);

    if (hitTraffic) {
      readings.push(hitTraffic);
    } else {
      readings.push(hitWorld);
    }
  }
  return readings;
}

function updateCar(dtMs) {
  const dt = dtMs / 1000;

  car.maxSpeed = parseFloat(maxSpeedSlider.value) / 10; // scale sliders to world units
  car.brakeStrength = parseFloat(brakeStrengthSlider.value) / 10;
  car.sensorRange = parseFloat(sensorRangeSlider.value) / 10 + 10;

  let accelCmd = 0;
  let turnCmd = 0;

  if (mode === "manual") {
    if (keys.has("KeyW")) accelCmd += car.accel;
    if (keys.has("KeyS")) {
      accelCmd -= car.brakeStrength;
      if (Date.now() - lastBrakeTime > 400) {
        lastBrakeTime = Date.now();
        SoundManager.playBraking();
      }
    }
    if (keys.has("KeyA")) turnCmd -= 1;
    if (keys.has("KeyD")) turnCmd += 1;
  } else {
    const sensors = getSensorReadings();
    const front = sensors[2];
    const left = sensors[0];
    const right = sensors[4];

    const toTarget = world.target.position.clone().sub(car.position);
    const targetAngle = Math.atan2(toTarget.z, toTarget.x);
    let angleDiff = normalizeAngle(targetAngle - car.heading);

    let avoid = 0;
    if (left.hit || right.hit) {
      avoid += (right.dist - left.dist) * 0.05;
    }

    turnCmd = clamp(angleDiff * 1.4 + avoid, -1.6, 1.6);

    const danger = front.hit ? front.dist / car.sensorRange : 1;
    const desiredSpeed = car.maxSpeed * clamp(danger, 0.2, 1);
    const speedDiff = desiredSpeed - car.speed;
    accelCmd = clamp(speedDiff * 8, -car.brakeStrength, car.accel);

    if (accelCmd < -15) {
      if (Date.now() - lastBrakeTime > 400) {
        lastBrakeTime = Date.now();
        SoundManager.playBraking();
      }
    }
  }

  car.speed += accelCmd * dt;

  if (car.speed > 0) {
    car.speed = Math.max(0, car.speed - car.friction * dt);
  } else if (car.speed < 0) {
    car.speed = Math.min(0, car.speed + car.friction * dt);
  }

  car.speed = clamp(car.speed, -car.maxSpeed * 0.4, car.maxSpeed);

  const turnRate = 1.8;
  car.heading += turnCmd * turnRate * dt * (car.speed / car.maxSpeed);

  const forward = new THREE.Vector3(Math.cos(car.heading), 0, Math.sin(car.heading));
  car.position.addScaledVector(forward, car.speed * dt);

  car.position.x = clamp(car.position.x, -groundSize / 2 + 2, groundSize / 2 - 2);
  car.position.z = clamp(car.position.z, -groundSize / 2 + 2, groundSize / 2 - 2);

  car.object.position.copy(car.position);
  car.object.rotation.y = -car.heading;

  // Body roll animation
  if (car.chassis) {
    // Roll based on turnCmd and speed (centripetal force approximation)
    // Pitch based on accel (acceleration/braking)
    const speedRatio = car.speed / car.maxSpeed;
    const roll = turnCmd * speedRatio * 0.15;
    const pitch = accelCmd * 0.002;

    car.chassis.rotation.z = THREE.MathUtils.lerp(car.chassis.rotation.z, roll, dt * 5);
    car.chassis.rotation.x = THREE.MathUtils.lerp(car.chassis.rotation.x, -pitch, dt * 5);
  }

  // Collision detection with obstacles

  const carBox = new THREE.Box3().setFromObject(car.object);
  for (const ob of world.obstacles) {
    if (carBox.intersectsBox(ob.box)) {
      collisions += 1;
      car.speed *= -0.3;
      car.position.addScaledVector(forward, -2);
      car.object.position.copy(car.position);
      updateMetrics("Collision!");
      break;
    }
  }

  // Target reached?
  const distToTarget = car.position.distanceTo(world.target.position);
  if (distToTarget < world.target.radius + 1.2) {
    running = false;
    car.speed = 0;
    updateMetrics("Target reached!");
  }
}

function updateSensorsVisual() {
  const readings = getSensorReadings();
  const origin = car.position.clone().add(new THREE.Vector3(0, 0.6, 0));

  for (let i = 0; i < sensorLines.length; i++) {
    const rel = car.sensorAngles[i];
    const angle = car.heading + rel;
    const reading = readings[i];

    const end = origin.clone().add(
      new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(reading.dist)
    );

    const positions = sensorLines[i].geometry.attributes.position.array;
    positions[0] = origin.x;
    positions[1] = origin.y;
    positions[2] = origin.z;
    positions[3] = end.x;
    positions[4] = end.y;
    positions[5] = end.z;
    sensorLines[i].geometry.attributes.position.needsUpdate = true;

    const danger = 1 - reading.dist / car.sensorRange;
    const opacity = 0.2 + 0.6 * clamp(danger, 0, 1);
    sensorLines[i].material.opacity = opacity;
    sensorLines[i].material.color.setHex(danger > 0.6 ? 0xf97316 : 0x38bdf8);
  }
}

function updateMetrics(statusText) {
  metricTime.textContent = (accumTime / 1000).toFixed(1);
  metricCollisions.textContent = collisions.toString();
  const d = car.position.distanceTo(world.target.position);
  metricDistance.textContent = d.toFixed(1);
  if (statusText != null) {
    metricStatus.textContent = statusText;
  }
}

// --- Main loop ---

// --- Main loop ---

function animate(timestamp) {
  if (!running) {
    updateSensorsVisual();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
    return;
  }

  if (lastTime == null) lastTime = timestamp;
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  accumTime += dt;
  updateScenery(dt / 1000); // Update animations
  updateTraffic(dt / 1000);
  updateCar(dt);


  if (SoundManager.ctx) SoundManager.updateEngine(car.speed, car.maxSpeed);

  updateSensorsVisual();
  updateMetrics();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// --- UI wiring ---
// Modal Logic
modalStartBtn.addEventListener("click", () => {
  introModal.classList.add("hidden");
  // Trigger start
  if (!running) {
    running = true;
    metricStatus.textContent = "Running";
    lastTime = null;
    SoundManager.init();
    if (SoundManager.ctx && SoundManager.ctx.state === 'suspended') SoundManager.ctx.resume();
  }
});

function updateSliderLabels() {
  maxSpeedVal.textContent = maxSpeedSlider.value;
  brakeStrengthVal.textContent = brakeStrengthSlider.value;
  sensorRangeVal.textContent = sensorRangeSlider.value;
}

btnStart.addEventListener("click", () => {
  if (!running) {
    running = true;
    metricStatus.textContent = "Running";
    lastTime = null;
    SoundManager.init();
    if (SoundManager.ctx && SoundManager.ctx.state === 'suspended') SoundManager.ctx.resume();
  }
});

btnPause.addEventListener("click", () => {
  running = false;
  updateMetrics("Paused");
});

btnReset.addEventListener("click", () => {
  running = false;
  resetSimulation();
  updateMetrics("Ready");
});

modeInputs.forEach((el) => {
  el.addEventListener("change", () => {
    mode = el.value;
    updateMetrics(mode === "auto" ? "Auto‑drive" : "Manual");
  });
});

maxSpeedSlider.addEventListener("input", updateSliderLabels);
brakeStrengthSlider.addEventListener("input", updateSliderLabels);
sensorRangeSlider.addEventListener("input", updateSliderLabels);

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

// --- Resize handling ---

function onResize() {
  const w = rootEl.clientWidth;
  const h = rootEl.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", onResize);

// --- Setup / reset ---

function resetSimulation() {
  setupObstacles();
  createTarget();
  car.position.set(-35, 0.9, 0);
  car.heading = 0;
  car.speed = 0;
  createCar();
  initSensors();

  collisions = 0;
  accumTime = 0;
  lastTime = null;

  // Scenery reset
  sceneryObjects.forEach(o => scene.remove(o));
  sceneryObjects.length = 0;
  animatedClouds.length = 0;
  animatedPalms.length = 0;
  animatedBuildings.length = 0;

  createOcean(); // New
  createPalmTrees(); // New
  createArtDecoBuildings(); // New
  createRoadMarkings();
  createClouds();

  // Traffic reset
  trafficCars.forEach(t => scene.remove(t));
  trafficCars.length = 0;
  // Add some dummy traffic
  createTrafficCar(-20, -25, 'x', 8);
  createTrafficCar(20, 25, 'x', -6);
  createTrafficCar(45, 0, 'z', 5);
}

// Initial boot
updateSliderLabels();
resetSimulation();
onResize();
requestAnimationFrame(animate);


