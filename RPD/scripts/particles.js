// ---------- Floating dust ----------

const dustCount = 500;
const dustSize = 0.05;
const dustDayOpacity = 0.35;
const dustNightOpacity = 0.15;
const dustSpeed = 0.15;

const dustArea = { x: 9, yMin: 0.3, yMax: 17, z: depth / 2 - 0.5 };

const dustPositions = new Float32Array(dustCount * 3);
const dustSpeeds = [];

for (let i = 0; i < dustCount; i++) {

  dustPositions[i * 3] = (Math.random() * 2 - 1) * dustArea.x;
  dustPositions[i * 3 + 1] = dustArea.yMin + Math.random() * (dustArea.yMax - dustArea.yMin);
  dustPositions[i * 3 + 2] = (Math.random() * 2 - 1) * dustArea.z;

  dustSpeeds.push({
    x: (Math.random() - 0.5) * dustSpeed,
    y: (Math.random() - 0.3) * dustSpeed * 0.5,
    z: (Math.random() - 0.5) * dustSpeed
  });
}

const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));

const dustMaterial = new THREE.PointsMaterial({
  color: 0xfff1d6,
  size: dustSize,
  transparent: true,
  opacity: dustDayOpacity,
  depthWrite: false
});

const dust = new THREE.Points(dustGeometry, dustMaterial);
dust.frustumCulled = false;
dust.userData.noShadow = true;
scene.add(dust);


function setDustNight(night) {
  dustMaterial.opacity = night ? dustNightOpacity : dustDayOpacity;
  rainIsNight = night;
  fogIsNight = night;
  rainMaterial.opacity = night ? rainNightOpacity : rainDayOpacity;
  windowRainMaterials.forEach(function (m) { m.opacity = night ? windowRainNightOpacity : windowRainDayOpacity; });
}

function updateParticles(delta) {

  for (let i = 0; i < dustCount; i++) {

    const p = i * 3;
    dustPositions[p] += dustSpeeds[i].x * delta;
    dustPositions[p + 1] += dustSpeeds[i].y * delta;
    dustPositions[p + 2] += dustSpeeds[i].z * delta;

    if (dustPositions[p] > dustArea.x) dustPositions[p] = -dustArea.x;
    if (dustPositions[p] < -dustArea.x) dustPositions[p] = dustArea.x;
    if (dustPositions[p + 1] > dustArea.yMax) dustPositions[p + 1] = dustArea.yMin;
    if (dustPositions[p + 1] < dustArea.yMin) dustPositions[p + 1] = dustArea.yMax;
    if (dustPositions[p + 2] > dustArea.z) dustPositions[p + 2] = -dustArea.z;
    if (dustPositions[p + 2] < -dustArea.z) dustPositions[p + 2] = dustArea.z;
  }

  dustGeometry.attributes.position.needsUpdate = true;

  updateRain(delta);
  updateFog();
}


// ---------- RAIN ----------

let rainEnabled = true;
const rainCount = 8000;
const rainSpeed = 22;
const rainSpeedSpread = 6;
const rainStreakLength = 0.9;
const rainWind = 2.5;
const rainTopY = 30;
const rainDayOpacity = 0.35;
const rainNightOpacity = 0.2;
const rainColor = 0xb7c9da;

const windowRainDayOpacity = 0.55;
const windowRainNightOpacity = 0.25;
const windowRainSpeed = 0.35;

const rainArea = { x: 38, zBack: 38, zFront: 45 };

const rainWallThickness = (typeof wallThickness !== 'undefined') ? wallThickness : 0.5;
const rainFrontFace = depth / 2 + rainWallThickness;
const rainCovered = [
  [-(width / 2 + rainWallThickness + 0.3), width / 2 + rainWallThickness + 0.3, -depth / 2 - rainWallThickness - 0.3, rainFrontFace + 1.0],
  [-25, 25, rainFrontFace - 9.5, rainFrontFace + 1.2],
  [-4.8, 4.8, rainFrontFace, rainFrontFace + 6.3]
];

function rainIsCovered(x, z) {
  for (let i = 0; i < rainCovered.length; i++) {
    const r = rainCovered[i];
    if (x > r[0] && x < r[1] && z > r[2] && z < r[3]) return true;
  }
  return false;
}

const rainState = new Float32Array(rainCount * 3);
const rainFall = new Float32Array(rainCount);
const rainPositions = new Float32Array(rainCount * 6);

function rainRespawn(i, anywhereHigh) {
  let x, z;
  do {
    x = (Math.random() * 2 - 1) * rainArea.x;
    z = -rainArea.zBack + Math.random() * (rainArea.zBack + depth / 2 + rainArea.zFront);
  } while (rainIsCovered(x, z));

  rainState[i * 3] = x;
  rainState[i * 3 + 1] = anywhereHigh ? Math.random() * rainTopY : rainTopY + Math.random() * 4;
  rainState[i * 3 + 2] = z;
  rainFall[i] = rainSpeed + (Math.random() - 0.5) * rainSpeedSpread;
}

for (let i = 0; i < rainCount; i++) rainRespawn(i, true);

const rainGeometry = new THREE.BufferGeometry();
rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

const rainMaterial = new THREE.LineBasicMaterial({
  color: rainColor,
  transparent: true,
  opacity: rainDayOpacity,
  depthWrite: false
});

const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
rain.frustumCulled = false;
rain.visible = rainEnabled;
rain.userData.noShadow = true;
scene.add(rain);

let rainIsNight = false;

function setRain(on) {
  rainEnabled = on;
  rain.visible = on;
  windowRainMeshes.forEach(function (mesh) { mesh.visible = on; });
}

function updateRain(delta) {

  if (!rainEnabled) return;
  const dt = Math.min(delta, 0.1);

  for (let i = 0; i < rainCount; i++) {

    const s = i * 3;
    rainState[s] += rainWind * dt;
    rainState[s + 1] -= rainFall[i] * dt;

    if (rainState[s + 1] < 0.05 || rainIsCovered(rainState[s], rainState[s + 2])) rainRespawn(i, false);

    const len = Math.sqrt(rainWind * rainWind + rainFall[i] * rainFall[i]);
    const p = i * 6;
    rainPositions[p] = rainState[s];
    rainPositions[p + 1] = rainState[s + 1];
    rainPositions[p + 2] = rainState[s + 2];
    rainPositions[p + 3] = rainState[s] - (rainWind / len) * rainStreakLength;
    rainPositions[p + 4] = rainState[s + 1] + (rainFall[i] / len) * rainStreakLength;
    rainPositions[p + 5] = rainState[s + 2];
  }

  rainGeometry.attributes.position.needsUpdate = true;
  updateWindowRain(dt);
}


// ---------- Rain running down the tall back windows ----------

const windowRainMeshes = [];
const windowRainTextures = [];
const windowRainMaterials = [];
let windowRainBuilt = false;

function makeWindowRainCanvas() {
  const w = 128, h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < 16; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const len = 50 + Math.random() * 170;
    const gradient = ctx.createLinearGradient(0, y, 0, y + len);
    gradient.addColorStop(0, 'rgba(225,238,250,0)');
    gradient.addColorStop(1, 'rgba(225,238,250,0.6)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1 + Math.random() * 1.8;
    [-h, 0].forEach(function (wrap) {
      ctx.beginPath();
      ctx.moveTo(x, y + wrap);
      ctx.lineTo(x, y + len + wrap);
      ctx.stroke();
    });
    ctx.fillStyle = 'rgba(235,245,255,0.7)';
    [-h, 0].forEach(function (wrap) {
      ctx.beginPath();
      ctx.arc(x, y + len + wrap, 1.5 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(235,245,255,' + (0.2 + Math.random() * 0.3) + ')';
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function buildWindowRain() {

  windowRainBuilt = true;
  if (typeof backWindowXs === 'undefined') return;

  const canvas = makeWindowRainCanvas();
  const archTopY = backWindowBottomY + backWindowRectH;

  [{ z: 0.09, repeatX: 1, repeatY: 1, speed: 1 }, { z: 0.1, repeatX: 1.6, repeatY: 1.3, speed: 0.6 }].forEach(function (layer) {

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(layer.repeatX, layer.repeatY);
    texture.userData = { speed: layer.speed };
    windowRainTextures.push(texture);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: rainIsNight ? windowRainNightOpacity : windowRainDayOpacity,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    windowRainMaterials.push(material);

    backWindowXs.forEach(function (x) {
      const rect = new THREE.Mesh(new THREE.PlaneGeometry(backWindowW, backWindowRectH), material);
      rect.position.set(x, backWindowBottomY + backWindowRectH / 2, -depth / 2 + layer.z);
      const top = new THREE.Mesh(new THREE.CircleGeometry(backWindowW / 2, 24, 0, Math.PI), material);
      top.position.set(x, archTopY, -depth / 2 + layer.z);
      [rect, top].forEach(function (mesh) {
        mesh.userData.noShadow = true;
        mesh.visible = rainEnabled;
        scene.add(mesh);
        windowRainMeshes.push(mesh);
      });
    });
  });
}

function updateWindowRain(dt) {
  if (!windowRainBuilt) buildWindowRain();
  windowRainTextures.forEach(function (texture) {
    texture.offset.y += windowRainSpeed * texture.userData.speed * dt;
  });
}


// ---------- FOG ----------

let fogEnabled = true;

// ---------- tweak these ----------
const fogOutsideDensity = 0.08;
const fogOutsideMax = 0.97;
const fogInsideHaze = 0.3;
const fogInsideDensity = 0.02;
const fogCrispNear = 6;
const fogCrispFar = 30;
const fogDayColor = 0xb4bec6;
const fogNightColor = 0x10141a;

const fogHallHalfX = width / 2 + ((typeof wallThickness !== 'undefined') ? wallThickness : 0.5) + 0.2;
const fogHallHalfZ = depth / 2 + ((typeof wallThickness !== 'undefined') ? wallThickness : 0.5) + 0.2;

let fogShaderPatched = false;
(function patchFogShader() {
  const chunks = THREE.ShaderChunk;
  if (!chunks.fog_vertex || !chunks.fog_pars_vertex || !chunks.fog_pars_fragment) return;
  if (chunks.fog_vertex.indexOf('vFogDepth = - mvPosition.z;') === -1) return;
  if (chunks.fog_pars_vertex.indexOf('varying float vFogDepth;') === -1) return;
  if (chunks.fog_pars_fragment.indexOf('varying float vFogDepth;') === -1) return;

  function n(value) { return value.toFixed(4); }

  chunks.fog_pars_vertex = chunks.fog_pars_vertex.replace('varying float vFogDepth;', 'varying float vFogDepth;\nvarying vec3 vFogWorld;');
  chunks.fog_vertex = chunks.fog_vertex.replace('vFogDepth = - mvPosition.z;', 'vFogDepth = - mvPosition.z;\nvFogWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  chunks.fog_pars_fragment = chunks.fog_pars_fragment.replace('varying float vFogDepth;', 'varying float vFogDepth;\nvarying vec3 vFogWorld;');
  chunks.fog_fragment = `
#ifdef USE_FOG
  vec2 fogAway = max(abs(vFogWorld.xz) - vec2(${n(fogHallHalfX)}, ${n(fogHallHalfZ)}), 0.0);
  float fogOutside = (1.0 - exp(-length(fogAway) * ${n(fogOutsideDensity)})) * ${n(fogOutsideMax)} * smoothstep(${n(fogCrispNear)}, ${n(fogCrispFar)}, vFogDepth);
  float fogInside = (1.0 - exp(-vFogDepth * ${n(fogInsideDensity)})) * ${n(fogInsideHaze)};
  float fogFactor = clamp(max(fogOutside, fogInside), 0.0, 1.0);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;
  fogShaderPatched = true;
})();

const weatherFog = new THREE.Fog(fogDayColor, fogShaderPatched ? 1 : 12, fogShaderPatched ? 100 : 70);
let fogIsNight = true;
if (fogEnabled) scene.fog = weatherFog;

if (!fogShaderPatched) console.warn('Fog: this three.js version was not recognised, so plain distance fog is used (not heavy-outside / thin-inside).');

function setFog(on) {
  fogEnabled = on;
  scene.fog = on ? weatherFog : null;
}

function updateFog() {
  if (!fogEnabled) return;
  if (scene.fog !== weatherFog) scene.fog = weatherFog;
  if (scene.background && scene.background.isColor) weatherFog.color.copy(scene.background);
  else weatherFog.color.setHex(fogIsNight ? fogNightColor : fogDayColor);
}