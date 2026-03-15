# IMU-to-Posture Visualization MVP

Minimal Vite + Three.js demo to visualize posture from two IMUs.

This MVP focuses on:
- stable visualization
- clear slouch behavior
- manual demo controls
- easy future ESP32 integration

## What this shows

The scene renders two spine curves:
- **Neutral spine** (gray): fixed upright reference
- **Live spine** (blue): driven by IMU values

The live curve uses four joints:
- pelvis `(0, 0, 0)`
- lower spine `(0, 0.35, 0)`
- upper spine `(0, 0.75, 0)`
- head `(0, 1.1, 0)`

A `CatmullRomCurve3` is generated through those points to keep posture smooth and connected.

## Run

```bash
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`).

## Manual IMU controls

A UI panel is shown on the right with sliders and numeric inputs for:
- `lowerPitch`, `lowerRoll`, `lowerYaw`
- `upperPitch`, `upperRoll`, `upperYaw`
- plus optional `x`, `y`, `z` for lower and upper

The app uses exactly one shared state object:

```js
const imuState = {
  lower: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 },
  upper: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 },
};
```

Both UI and rendering read/write this same object.

## Posture status label

The left panel displays posture status from:

`forwardBend = abs(lower.pitch) + abs(upper.pitch)`

- `< 10` -> Good posture
- `10 to 25` -> Mild slouch
- `> 25` -> Strong slouch

## CSV interface for future hardware

Use function:

`updateFromCSVLine(line)`

Expected order (12 values):

`lowerX,lowerY,lowerZ,lowerRoll,lowerPitch,lowerYaw,upperX,upperY,upperZ,upperRoll,upperPitch,upperYaw`

Example:

`0.00,0.00,0.00,2,8,0,0.00,0.00,0.00,3,16,0`

Returns `true` on success, `false` on invalid input, and updates `imuState`.

It is also available from browser console:

```js
updateFromCSVLine("0,0,0,0,12,0,0,0,0,0,18,0");
```

## Avatar behavior

The app can try loading:
- `/avatar.glb` (Vite static path)
- `/public/avatar.glb` (fallback attempt)

If loading fails or bones are unreliable, the demo still works perfectly with spine curves only.

## Notes on mapping behavior

- Lower pitch/roll mostly affect the lower torso.
- Upper pitch strongly affects upper spine/head, making slouch easy to see.
- Yaw path is kept but visually damped for stability.
- Spine remains anchored at pelvis with direct point computation (no drifting parent/child accumulation).
# IMU to Avatar Mapping Demo (Vite + Three.js)

This is a minimal browser demo that proves **two IMUs can drive lower and upper torso motion** on a humanoid avatar structure.

It maps:
- `x, y, z` -> translation (position offset)
- `roll, pitch, yaw` -> rotation

The app works in two cases:
- real avatar at `public/avatar.glb`
- automatic fallback torso rig (if the avatar is missing or fails to load)

## What this demo proves

- Lower IMU and upper IMU can be mapped independently.
- Each IMU includes all 6 values (`x,y,z,roll,pitch,yaw`).
- Position and rotation are both visible in real-time.
- Mapping works whether you have real bones or only fallback torso groups.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite (usually `http://localhost:5173`).

## Where to place `avatar.glb`

Place your model at:

`public/avatar.glb`

The app first tries to load `/public/avatar.glb`, then also tries `/avatar.glb` for Vite compatibility.

If loading fails, it shows a clear debug message and uses a fallback torso rig so the demo still moves.

## CSV format (12 values)

Input line example:

`0.02,0.01,-0.03,10,5,-3,0.01,0.04,0.02,15,2,8`

Meaning:

1. `lowerX`
2. `lowerY`
3. `lowerZ`
4. `lowerRoll`
5. `lowerPitch`
6. `lowerYaw`
7. `upperX`
8. `upperY`
9. `upperZ`
10. `upperRoll`
11. `upperPitch`
12. `upperYaw`

## Mapping rules used

- Lower IMU drives mostly:
  - hips
  - spine
- Upper IMU drives mostly:
  - chest
  - upper chest

Rotation meaning:
- `pitch` = forward/back bend
- `yaw` = twist
- `roll` = side lean

Degrees are converted to radians in code.

## Switch fake mode vs CSV mode

In `main.js`:

```js
const USE_FAKE_DATA = true;
const SAMPLE_CSV_LINE = "0.02,0.01,-0.03,10,5,-3,0.01,0.04,0.02,15,2,8";
```

- `USE_FAKE_DATA = true` -> uses smooth sine-wave animation from `getFakeIMU()`
- `USE_FAKE_DATA = false` -> uses `parseIMU(SAMPLE_CSV_LINE)`

## Replacing fake data with real ESP32 data later

You can replace the fake/sample source with live serial/WebSocket data:

1. Receive one CSV line at a time from ESP32.
2. Call `parseIMU(line)`.
3. If parsing succeeds, pass result into `applyIMUToAvatar(imuData)`.
4. Keep the same object shape:
   - `lower: { x, y, z, roll, pitch, yaw }`
   - `upper: { x, y, z, roll, pitch, yaw }`

No other mapping logic needs to change.
