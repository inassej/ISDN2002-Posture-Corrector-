// ================================
// imports
// ================================
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ================================
// shared IMU state (single source of truth)
// ================================
const imuState = {
  lower: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 },
  upper: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 },
};

const SAMPLE_CSV_LINE = "0.00,0.00,0.00,2,8,0,0.00,0.00,0.00,3,16,0";

// ================================
// scene setup
// ================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f3f5);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.2, 2.5);
camera.lookAt(0, 0.8, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.8, 0);
controls.enableDamping = true;
controls.minDistance = 1.2;
controls.maxDistance = 5.0;
controls.maxPolarAngle = Math.PI * 0.9;

scene.add(new THREE.AmbientLight(0xffffff, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(2.5, 4, 2.2);
scene.add(sun);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// ================================
// posture rig + spine line visualization
// ================================
const neutralJoints = {
  pelvis: new THREE.Vector3(0, 0, 0),
  lowerSpine: new THREE.Vector3(0, 0.35, 0),
  upperSpine: new THREE.Vector3(0, 0.75, 0),
  head: new THREE.Vector3(0, 1.1, 0),
};

const neutralPoints = [
  neutralJoints.pelvis.clone(),
  neutralJoints.lowerSpine.clone(),
  neutralJoints.upperSpine.clone(),
  neutralJoints.head.clone(),
];

const livePoints = neutralPoints.map((p) => p.clone());

const neutralGeometry = new THREE.BufferGeometry();
const neutralLine = new THREE.Line(
  neutralGeometry,
  new THREE.LineBasicMaterial({ color: 0x808991 })
);
scene.add(neutralLine);

const liveGeometry = new THREE.BufferGeometry();
const liveLine = new THREE.Line(
  liveGeometry,
  new THREE.LineBasicMaterial({ color: 0x1d9bf0 })
);
scene.add(liveLine);

function updateCurveLine(geometry, points) {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
  geometry.setFromPoints(curve.getPoints(48));
}

updateCurveLine(neutralGeometry, neutralPoints);
updateCurveLine(liveGeometry, livePoints);

// ================================
// optional avatar loading (spine visualization always works)
// ================================
const avatarState = {
  loaded: false,
  reliable: false,
  error: "avatar not loaded (using spine visualization)",
  root: null,
  base: {
    hipsQuat: new THREE.Quaternion(),
    chestQuat: new THREE.Quaternion(),
    upperChestQuat: new THREE.Quaternion(),
    headQuat: new THREE.Quaternion(),
  },
  bones: {
    hips: null,
    chest: null,
    upperChest: null,
    head: null,
  },
};

function normalizeName(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findBone(bones, hints) {
  for (const bone of bones) {
    const name = normalizeName(bone.name);
    if (hints.some((hint) => name.includes(hint))) return bone;
  }
  return null;
}

function tryLoadAvatar() {
  const loader = new GLTFLoader();
  const tryURLs = ["/avatar.glb", "/public/avatar.glb"];

  function attempt(index) {
    if (index >= tryURLs.length) return;
    const url = tryURLs[index];
    loader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        const bones = [];
        root.traverse((obj) => {
          if (obj.isBone) bones.push(obj);
        });

        console.log("Avatar bones:");
        bones.forEach((b) => console.log(`- ${b.name}`));

        avatarState.bones.hips = findBone(bones, ["hips", "hip", "pelvis"]);
        avatarState.bones.chest = findBone(bones, ["chest", "spine2", "thorax"]);
        avatarState.bones.upperChest = findBone(bones, ["upperchest", "spine3"]);
        avatarState.bones.head = findBone(bones, ["head", "neck"]);

        avatarState.loaded = true;
        avatarState.reliable = Boolean(avatarState.bones.hips && avatarState.bones.chest);
        avatarState.error = avatarState.reliable
          ? ""
          : "avatar loaded but key bones unreliable; using spine visualization only";

        if (avatarState.reliable) {
          avatarState.root = root;
          avatarState.root.position.set(0, 0, -0.45);
          scene.add(avatarState.root);

          avatarState.base.hipsQuat.copy(avatarState.bones.hips.quaternion);
          avatarState.base.chestQuat.copy(avatarState.bones.chest.quaternion);
          if (avatarState.bones.upperChest) {
            avatarState.base.upperChestQuat.copy(avatarState.bones.upperChest.quaternion);
          }
          if (avatarState.bones.head) {
            avatarState.base.headQuat.copy(avatarState.bones.head.quaternion);
          }
        }
      },
      undefined,
      () => {
        if (index < tryURLs.length - 1) {
          attempt(index + 1);
        } else {
          avatarState.loaded = false;
          avatarState.reliable = false;
          avatarState.error = "avatar.glb missing or failed to load; spine visualization active";
        }
      }
    );
  }

  attempt(0);
}

tryLoadAvatar();

// ================================
// UI controls + status
// ================================
const statusPanel = document.createElement("div");
statusPanel.style.position = "fixed";
statusPanel.style.left = "12px";
statusPanel.style.top = "12px";
statusPanel.style.padding = "10px 12px";
statusPanel.style.background = "rgba(20,20,22,0.82)";
statusPanel.style.color = "#ecf2f8";
statusPanel.style.font = "12px/1.4 Arial, sans-serif";
statusPanel.style.border = "1px solid rgba(255,255,255,0.2)";
statusPanel.style.borderRadius = "8px";
statusPanel.style.minWidth = "240px";
statusPanel.style.zIndex = "12";
document.body.appendChild(statusPanel);

const controlPanel = document.createElement("div");
controlPanel.style.position = "fixed";
controlPanel.style.right = "12px";
controlPanel.style.top = "12px";
controlPanel.style.width = "350px";
controlPanel.style.maxHeight = "calc(100vh - 24px)";
controlPanel.style.overflow = "auto";
controlPanel.style.padding = "10px 12px";
controlPanel.style.background = "rgba(20,20,22,0.82)";
controlPanel.style.color = "#ecf2f8";
controlPanel.style.font = "12px/1.4 Arial, sans-serif";
controlPanel.style.border = "1px solid rgba(255,255,255,0.2)";
controlPanel.style.borderRadius = "8px";
controlPanel.style.zIndex = "12";
document.body.appendChild(controlPanel);

const controlsMap = {};

function setStateValue(sensor, key, value) {
  imuState[sensor][key] = value;
}

function createControlRow(title, sensor, key, min, max, step) {
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "90px 1fr 64px";
  row.style.alignItems = "center";
  row.style.gap = "8px";
  row.style.marginBottom = "6px";

  const label = document.createElement("label");
  label.textContent = title;

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(imuState[sensor][key]);

  const number = document.createElement("input");
  number.type = "number";
  number.min = String(min);
  number.max = String(max);
  number.step = String(step);
  number.value = String(imuState[sensor][key]);
  number.style.width = "62px";

  function syncFromInput(newValue) {
    const value = Number.parseFloat(newValue);
    if (Number.isNaN(value)) return;
    const clamped = Math.min(max, Math.max(min, value));
    setStateValue(sensor, key, clamped);
    slider.value = String(clamped);
    number.value = String(clamped);
  }

  slider.addEventListener("input", () => syncFromInput(slider.value));
  number.addEventListener("input", () => syncFromInput(number.value));

  row.appendChild(label);
  row.appendChild(slider);
  row.appendChild(number);
  controlPanel.appendChild(row);

  controlsMap[`${sensor}.${key}`] = { slider, number };
}

function syncControlsFromState() {
  for (const sensor of ["lower", "upper"]) {
    for (const key of ["x", "y", "z", "roll", "pitch", "yaw"]) {
      const entry = controlsMap[`${sensor}.${key}`];
      if (!entry) continue;
      entry.slider.value = String(imuState[sensor][key]);
      entry.number.value = String(imuState[sensor][key]);
    }
  }
}

const controlTitle = document.createElement("div");
controlTitle.textContent = "Manual IMU Input";
controlTitle.style.fontWeight = "bold";
controlTitle.style.marginBottom = "8px";
controlPanel.appendChild(controlTitle);

for (const sensor of ["lower", "upper"]) {
  const heading = document.createElement("div");
  heading.textContent = sensor === "lower" ? "Lower IMU" : "Upper IMU";
  heading.style.margin = "10px 0 6px";
  heading.style.color = "#a7d8ff";
  heading.style.fontWeight = "bold";
  controlPanel.appendChild(heading);

  createControlRow("Pitch (deg)", sensor, "pitch", -45, 45, 0.1);
  createControlRow("Roll (deg)", sensor, "roll", -45, 45, 0.1);
  createControlRow("Yaw (deg)", sensor, "yaw", -45, 45, 0.1);
  createControlRow("X offset", sensor, "x", -0.25, 0.25, 0.005);
  createControlRow("Y offset", sensor, "y", -0.25, 0.25, 0.005);
  createControlRow("Z offset", sensor, "z", -0.25, 0.25, 0.005);
}

const csvHeading = document.createElement("div");
csvHeading.textContent = "CSV test input (12 values)";
csvHeading.style.margin = "12px 0 6px";
csvHeading.style.color = "#a7d8ff";
csvHeading.style.fontWeight = "bold";
controlPanel.appendChild(csvHeading);

const csvInput = document.createElement("input");
csvInput.type = "text";
csvInput.value = SAMPLE_CSV_LINE;
csvInput.style.width = "100%";
csvInput.style.boxSizing = "border-box";
csvInput.style.marginBottom = "6px";
controlPanel.appendChild(csvInput);

const csvMessage = document.createElement("div");
csvMessage.style.minHeight = "18px";
csvMessage.style.color = "#ffd2d2";
csvMessage.style.marginBottom = "8px";
controlPanel.appendChild(csvMessage);

const csvButton = document.createElement("button");
csvButton.textContent = "Apply CSV to imuState";
csvButton.style.width = "100%";
csvButton.style.padding = "6px 8px";
csvButton.style.cursor = "pointer";
controlPanel.appendChild(csvButton);

const resetButton = document.createElement("button");
resetButton.textContent = "Reset all values to zero";
resetButton.style.width = "100%";
resetButton.style.padding = "6px 8px";
resetButton.style.marginTop = "8px";
resetButton.style.cursor = "pointer";
controlPanel.appendChild(resetButton);

// ================================
// CSV interface for future IMU data
// ================================
function parseCSV12(line) {
  if (typeof line !== "string") return null;
  const parts = line.split(",").map((v) => v.trim());
  if (parts.length !== 12) return null;
  const numbers = parts.map((v) => Number.parseFloat(v));
  if (numbers.some((n) => Number.isNaN(n))) return null;
  return numbers;
}

function updateFromCSVLine(line) {
  const values = parseCSV12(line);
  if (!values) return false;

  imuState.lower.x = values[0];
  imuState.lower.y = values[1];
  imuState.lower.z = values[2];
  imuState.lower.roll = values[3];
  imuState.lower.pitch = values[4];
  imuState.lower.yaw = values[5];

  imuState.upper.x = values[6];
  imuState.upper.y = values[7];
  imuState.upper.z = values[8];
  imuState.upper.roll = values[9];
  imuState.upper.pitch = values[10];
  imuState.upper.yaw = values[11];

  syncControlsFromState();
  return true;
}

window.updateFromCSVLine = updateFromCSVLine;

csvButton.addEventListener("click", () => {
  const ok = updateFromCSVLine(csvInput.value);
  csvMessage.textContent = ok
    ? "CSV applied to imuState."
    : "Invalid CSV. Expected 12 comma-separated numbers.";
});

resetButton.addEventListener("click", () => {
  for (const sensor of ["lower", "upper"]) {
    for (const key of ["x", "y", "z", "roll", "pitch", "yaw"]) {
      imuState[sensor][key] = 0;
    }
  }
  syncControlsFromState();
  csvMessage.textContent = "Reset complete.";
});

// ================================
// posture computation + mapping
// ================================
const upAxis = new THREE.Vector3(0, 1, 0);
const forwardAxis = new THREE.Vector3(0, 0, 1);
const tmpQuatA = new THREE.Quaternion();
const tmpQuatB = new THREE.Quaternion();
const tmpEulerA = new THREE.Euler(0, 0, 0, "YXZ");
const tmpEulerB = new THREE.Euler(0, 0, 0, "YXZ");
const tmpVecA = new THREE.Vector3();
const tmpVecB = new THREE.Vector3();

function buildQuatFromIMU(data, pitchWeight, rollWeight, yawWeight) {
  tmpEulerA.set(
    THREE.MathUtils.degToRad(data.pitch * pitchWeight),
    THREE.MathUtils.degToRad(data.yaw * yawWeight),
    THREE.MathUtils.degToRad(data.roll * rollWeight),
    "YXZ"
  );
  return tmpQuatA.setFromEuler(tmpEulerA).clone();
}

function computeLivePosturePoints() {
  // Keep yaw influence low for stability while preserving data path.
  const qLower = buildQuatFromIMU(imuState.lower, 0.65, 0.6, 0.2);
  const qUpperRelative = buildQuatFromIMU(imuState.upper, 1.2, 0.75, 0.2);
  const qUpperWorld = tmpQuatB.copy(qLower).multiply(qUpperRelative);

  const pelvisOffset = new THREE.Vector3(
    imuState.lower.x * 0.35 + imuState.upper.x * 0.1,
    imuState.lower.y * 0.25 + imuState.upper.y * 0.08,
    imuState.lower.z * 0.35 + imuState.upper.z * 0.1
  );
  const pelvis = tmpVecA.copy(neutralJoints.pelvis).add(pelvisOffset).clone();

  const lowerSpine = pelvis
    .clone()
    .add(upAxis.clone().multiplyScalar(0.35).applyQuaternion(qLower));

  const upperSpine = lowerSpine
    .clone()
    .add(upAxis.clone().multiplyScalar(0.4).applyQuaternion(qUpperWorld));

  const headBase = upperSpine
    .clone()
    .add(upAxis.clone().multiplyScalar(0.35).applyQuaternion(qUpperWorld));

  const forwardSlouch = Math.max(0, imuState.upper.pitch) / 35;
  const headForwardOffset = tmpVecB
    .copy(forwardAxis)
    .applyQuaternion(qUpperWorld)
    .multiplyScalar(0.12 * forwardSlouch);

  const head = headBase.clone().add(headForwardOffset);

  livePoints[0].copy(pelvis);
  livePoints[1].copy(lowerSpine);
  livePoints[2].copy(upperSpine);
  livePoints[3].copy(head);

  // Optional avatar follow when bones are reliable.
  if (avatarState.reliable) {
    avatarState.bones.hips.quaternion.copy(avatarState.base.hipsQuat).multiply(qLower);
    avatarState.bones.chest.quaternion.copy(avatarState.base.chestQuat).multiply(qUpperRelative);
    if (avatarState.bones.upperChest) {
      tmpEulerB.set(
        THREE.MathUtils.degToRad(imuState.upper.pitch * 0.9),
        THREE.MathUtils.degToRad(imuState.upper.yaw * 0.15),
        THREE.MathUtils.degToRad(imuState.upper.roll * 0.6),
        "YXZ"
      );
      avatarState.bones.upperChest.quaternion
        .copy(avatarState.base.upperChestQuat)
        .multiply(new THREE.Quaternion().setFromEuler(tmpEulerB));
    }
    if (avatarState.bones.head) {
      tmpEulerB.set(
        THREE.MathUtils.degToRad(imuState.upper.pitch * 0.25),
        0,
        THREE.MathUtils.degToRad(imuState.upper.roll * 0.2),
        "YXZ"
      );
      avatarState.bones.head.quaternion
        .copy(avatarState.base.headQuat)
        .multiply(new THREE.Quaternion().setFromEuler(tmpEulerB));
    }
  }
}

function getPostureStatus() {
  const forwardBend = Math.abs(imuState.lower.pitch) + Math.abs(imuState.upper.pitch);
  if (forwardBend < 10) return "Good posture";
  if (forwardBend <= 25) return "Mild slouch";
  return "Strong slouch";
}

function updateStatusPanel() {
  statusPanel.innerHTML = [
    "<b>Posture MVP</b>",
    `Status: <b>${getPostureStatus()}</b>`,
    "",
    `lower pitch/roll/yaw: ${imuState.lower.pitch.toFixed(1)}, ${imuState.lower.roll.toFixed(1)}, ${imuState.lower.yaw.toFixed(1)}`,
    `upper pitch/roll/yaw: ${imuState.upper.pitch.toFixed(1)}, ${imuState.upper.roll.toFixed(1)}, ${imuState.upper.yaw.toFixed(1)}`,
    "",
    `avatar loaded: ${avatarState.loaded ? "yes" : "no"}`,
    `avatar reliable: ${avatarState.reliable ? "yes" : "no"}`,
    `avatar info: ${avatarState.error || "ok"}`,
    "",
    "Neutral spine: gray",
    "Live spine: blue",
  ].join("<br>");
}

// ================================
// animation loop
// ================================
function animate() {
  requestAnimationFrame(animate);

  computeLivePosturePoints();
  updateCurveLine(liveGeometry, livePoints);
  updateStatusPanel();

  controls.update();
  renderer.render(scene, camera);
}

animate();
