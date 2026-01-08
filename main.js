// Basic 2D self-driving car playground on a canvas, no external libraries.

const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

// DOM controls
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

// Simulation state
let lastTime = null;
let running = false;
let accumTime = 0;
let collisions = 0;

const keys = new Set();

// World layout (simple rectangular obstacles and a target)
const world = {
  width: canvas.width,
  height: canvas.height,
  obstacles: [],
  target: { x: 800, y: 250, radius: 14 },
};

// Car model
const car = {
  x: 100,
  y: 250,
  angle: 0, // radians, 0 = facing right
  width: 32,
  length: 60,
  speed: 0,
  maxSpeed: 150, // px/s, will be linked to slider
  accel: 240, // px/s^2
  brakeStrength: 350,
  friction: 80,
  sensorRange: 180,
  sensorAngles: [-0.7, -0.35, 0, 0.35, 0.7],
};

let mode = "auto"; // "auto" or "manual"

function resetWorld() {
  world.obstacles = [
    { x: 260, y: 70, w: 60, h: 360 },
    { x: 480, y: 0, w: 60, h: 250 },
    { x: 480, y: 280, w: 60, h: 220 },
  ];
  world.target = { x: 820, y: 250, radius: 16 };

  car.x = 100;
  car.y = 250;
  car.angle = 0;
  car.speed = 0;

  accumTime = 0;
  collisions = 0;
  lastTime = null;
  updateMetrics("Ready");
}

function updateMetrics(statusText) {
  metricTime.textContent = (accumTime / 1000).toFixed(1);
  metricCollisions.textContent = collisions.toString();
  const dx = world.target.x - car.x;
  const dy = world.target.y - car.y;
  const distance = Math.hypot(dx, dy);
  metricDistance.textContent = distance.toFixed(0);
  if (statusText != null) {
    metricStatus.textContent = statusText;
  }
}

// --- Physics and helpers ---

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rectIntersectsCar(ob) {
  // Approximate car as a rectangle by sampling its four corners
  const hw = car.length / 2;
  const hh = car.width / 2;

  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);

  const corners = [
    { x: car.x + cos * hw - sin * hh, y: car.y + sin * hw + cos * hh },
    { x: car.x + cos * hw + sin * hh, y: car.y + sin * hw - cos * hh },
    { x: car.x - cos * hw - sin * hh, y: car.y - sin * hw + cos * hh },
    { x: car.x - cos * hw + sin * hh, y: car.y - sin * hw - cos * hh },
  ];

  return corners.some(
    (p) => p.x >= ob.x && p.x <= ob.x + ob.w && p.y >= ob.y && p.y <= ob.y + ob.h
  );
}

function raycast(x, y, angle, maxDist, obstacles) {
  // Simple step-based raycast
  const step = 4;
  let dist = 0;
  while (dist < maxDist) {
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    // World bounds
    if (px < 0 || px > world.width || py < 0 || py > world.height) {
      return { hit: true, dist };
    }
    // Obstacles
    for (const ob of obstacles) {
      if (px >= ob.x && px <= ob.x + ob.w && py >= ob.y && py <= ob.y + ob.h) {
        return { hit: true, dist };
      }
    }
    dist += step;
  }
  return { hit: false, dist: maxDist };
}

function updateCar(dtMs) {
  const dt = dtMs / 1000;

  car.maxSpeed = parseFloat(maxSpeedSlider.value);
  car.brakeStrength = parseFloat(brakeStrengthSlider.value);
  car.sensorRange = parseFloat(sensorRangeSlider.value);

  // Manual controls
  let targetAccel = 0;
  let turn = 0;

  if (mode === "manual") {
    if (keys.has("KeyW")) targetAccel += car.accel;
    if (keys.has("KeyS")) targetAccel -= car.brakeStrength;
    if (keys.has("KeyA")) turn -= 1;
    if (keys.has("KeyD")) turn += 1;
  } else {
    // Auto mode: use sensors and target direction for a simple steering / speed logic
    const sensors = getSensorReadings();
    const front = sensors[2];
    const left = sensors[0];
    const right = sensors[4];

    // Steering: bias away from closer obstacle side, also aim toward target.
    const dx = world.target.x - car.x;
    const dy = world.target.y - car.y;
    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = normalizeAngle(targetAngle - car.angle);

    let avoid = 0;
    if (left.hit || right.hit) {
      avoid += (right.dist - left.dist) * 0.01;
    }

    turn = clamp(angleDiff * 1.2 + avoid, -1.5, 1.5);

    // Speed: slow down when something is close in front
    const danger = front.hit ? front.dist / car.sensorRange : 1;
    const desiredSpeed = car.maxSpeed * clamp(danger, 0.2, 1);
    const speedDiff = desiredSpeed - car.speed;
    targetAccel = clamp(speedDiff * 4, -car.brakeStrength, car.accel);
  }

  // Apply acceleration and friction
  car.speed += targetAccel * dt;

  // Friction always opposes motion
  if (car.speed > 0) {
    car.speed = Math.max(0, car.speed - car.friction * dt);
  } else if (car.speed < 0) {
    car.speed = Math.min(0, car.speed + car.friction * dt);
  }

  car.speed = clamp(car.speed, -car.maxSpeed * 0.4, car.maxSpeed);

  // Steering depends on speed
  const turnRate = 2.1; // rad/s at full turn input
  car.angle += turn * turnRate * dt * (car.speed / car.maxSpeed);

  // Position update
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;

  // Keep in bounds
  car.x = clamp(car.x, 10, world.width - 10);
  car.y = clamp(car.y, 10, world.height - 10);

  // Collisions
  for (const ob of world.obstacles) {
    if (rectIntersectsCar(ob)) {
      collisions += 1;
      // Simple response: bounce back a bit and reduce speed
      car.speed *= -0.3;
      car.x -= Math.cos(car.angle) * 10;
      car.y -= Math.sin(car.angle) * 10;
      updateMetrics("Collision!");
      break;
    }
  }

  // Reached target?
  const dxT = world.target.x - car.x;
  const dyT = world.target.y - car.y;
  const dT = Math.hypot(dxT, dyT);
  if (dT < world.target.radius + 8) {
    running = false;
    car.speed = 0;
    updateMetrics("Target reached!");
  }
}

function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function getSensorReadings() {
  const readings = [];
  for (const rel of car.sensorAngles) {
    const angle = car.angle + rel;
    const hit = raycast(car.x, car.y, angle, car.sensorRange, world.obstacles);
    readings.push(hit);
  }
  return readings;
}

// --- Rendering ---

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "#1f2933";
  ctx.lineWidth = 1;
  for (let x = 0; x < world.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, world.height);
    ctx.stroke();
  }
  for (let y = 0; y < world.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(world.width, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawObstacles() {
  ctx.save();
  for (const ob of world.obstacles) {
    ctx.fillStyle = "#111827";
    ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 2;
    ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);
  }
  ctx.restore();
}

function drawTarget() {
  const t = world.target;
  ctx.save();
  const gradient = ctx.createRadialGradient(
    t.x,
    t.y,
    2,
    t.x,
    t.y,
    t.radius + 10
  );
  gradient.addColorStop(0, "rgba(52, 211, 153, 0.9)");
  gradient.addColorStop(0.6, "rgba(16, 185, 129, 0.4)");
  gradient.addColorStop(1, "rgba(5, 150, 105, 0.0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.radius + 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#22c55e";
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCar() {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);

  // Shadow
  ctx.fillStyle = "rgba(15,23,42,0.9)";
  ctx.beginPath();
  ctx.roundRect(-car.length / 2, -car.width / 2, car.length, car.width, 8);
  ctx.fill();

  // Body
  const bodyGradient = ctx.createLinearGradient(
    -car.length / 2,
    0,
    car.length / 2,
    0
  );
  bodyGradient.addColorStop(0, "#38bdf8");
  bodyGradient.addColorStop(1, "#0ea5e9");
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.roundRect(-car.length / 2, -car.width / 2, car.length, car.width, 8);
  ctx.fill();

  // Windows
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(0 - 10, -car.width / 2 + 4, 22, car.width - 8, 6);
  ctx.fill();

  // Headlights
  ctx.fillStyle = "#facc15";
  ctx.fillRect(car.length / 2 - 4, -car.width / 2 + 6, 4, 6);
  ctx.fillRect(car.length / 2 - 4, car.width / 2 - 12, 4, 6);

  ctx.restore();
}

function drawSensors() {
  const readings = getSensorReadings();
  ctx.save();
  for (let i = 0; i < car.sensorAngles.length; i++) {
    const rel = car.sensorAngles[i];
    const angle = car.angle + rel;
    const reading = readings[i];
    const endX = car.x + Math.cos(angle) * reading.dist;
    const endY = car.y + Math.sin(angle) * reading.dist;

    const danger = 1 - reading.dist / car.sensorRange;
    const alpha = 0.2 + 0.6 * clamp(danger, 0, 1);

    ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(car.x, car.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    if (reading.hit) {
      ctx.fillStyle = "rgba(248,250,252,0.8)";
      ctx.beginPath();
      ctx.arc(endX, endY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, world.width, world.height);
  drawGrid();
  drawObstacles();
  drawTarget();
  drawSensors();
  drawCar();
}

// --- Main loop ---

function loop(timestamp) {
  if (!running) {
    render();
    return;
  }

  if (lastTime == null) lastTime = timestamp;
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  accumTime += dt;

  updateCar(dt);
  updateMetrics();
  render();

  requestAnimationFrame(loop);
}

// --- Event wiring ---

btnStart.addEventListener("click", () => {
  if (!running) {
    running = true;
    metricStatus.textContent = "Running";
    lastTime = null;
    requestAnimationFrame(loop);
  }
});

btnPause.addEventListener("click", () => {
  running = false;
  updateMetrics("Paused");
});

btnReset.addEventListener("click", () => {
  running = false;
  resetWorld();
  render();
});

modeInputs.forEach((el) => {
  el.addEventListener("change", () => {
    mode = el.value;
    updateMetrics(mode === "auto" ? "Auto‑drive" : "Manual");
  });
});

function updateSliderLabels() {
  maxSpeedVal.textContent = maxSpeedSlider.value;
  brakeStrengthVal.textContent = brakeStrengthSlider.value;
  sensorRangeVal.textContent = sensorRangeSlider.value;
}

maxSpeedSlider.addEventListener("input", updateSliderLabels);
brakeStrengthSlider.addEventListener("input", updateSliderLabels);
sensorRangeSlider.addEventListener("input", updateSliderLabels);

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

// --- Initial setup ---

resetWorld();
updateSliderLabels();
render();


