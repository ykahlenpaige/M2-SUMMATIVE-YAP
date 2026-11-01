const ambientLight = new THREE.HemisphereLight(0xffffff, 0x8a7a66, 1);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff1d6, 2);
sunLight.position.set(6, 16, 10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -26;
sunLight.shadow.camera.right = 26;
sunLight.shadow.camera.top = 26;
sunLight.shadow.camera.bottom = -26;
sunLight.shadow.camera.near = 0.1;
sunLight.shadow.camera.far = 80;
scene.add(sunLight);

// spot/point lights all start switched off (intensity 0); updateDayNight() turns them on
function makeSpot(color, distance, angle, penumbra) {
  const light = new THREE.SpotLight(color, 0, distance);
  light.angle = angle;
  light.penumbra = penumbra;
  light.decay = 2;
  light.castShadow = false;
  scene.add(light);
  scene.add(light.target);
  return light;
}

// window behind the statue (on in the day)
const backWindowLightIntensity = 60;
const backWindowLight = makeSpot(0xfff3dc, 30, 0.9, 0.8);
backWindowLight.position.set(0, 9, -depth / 2 + 0.5);
backWindowLight.target.position.set(0, 2, 2);

// lamps on the pillars (on at night)
const sconceLightIntensity = 12;
const sconceLights = sconceSpots.map(function (spot) {
  const light = new THREE.PointLight(0xffd9a0, 0, 9);
  light.position.set(spot.x, spot.y, spot.z);
  light.decay = 2;
  scene.add(light);
  return light;
});

// two floor spotlights aimed at the statue (on at night)
const statueLightIntensity = 60;
const statueLights = [-1, 1].map(function (side) {
  const light = makeSpot(0xfff0d6, 14, 0.45, 0.6);
  light.position.set(statuePos.x + side * 2.2, hallY + 0.3, statuePos.z + 2.6);
  light.target.position.set(statuePos.x, statueBaseY + 1.8, statuePos.z);
  return light;
});

// reception desk light (on at night)
const deskLightDayIntensity = 0;
const deskLightNightIntensity = 40;
const deskLight = makeSpot(0xffe2b8, 12, Math.PI / 4, 0.7);
deskLight.position.set(0, 4.3, 5.0);
deskLight.target.position.set(0, deskLevelY, 4.5);

// press N to switch
let isNight = false;

function updateDayNight() {
  const night = isNight;

  scene.background.set(night ? 0x05070d : 0xcfe8ff);
  ambientLight.intensity = night ? 0.2 : 1;
  sunLight.intensity = night ? 0.2 : 2;
  sunLight.color.set(night ? 0x8899ff : 0xfff1d6);
  skyGlassMaterial.color.set(night ? 0x0c1424 : 0xfff3dc);
  lampGlowMaterial.emissiveIntensity = night ? 1.6 : 0.2;

  backWindowLight.intensity = night ? 0 : backWindowLightIntensity;
  sconceLights.forEach(function (l) { l.intensity = night ? sconceLightIntensity : 0; });
  statueLights.forEach(function (l) { l.intensity = night ? statueLightIntensity : 0; });
  deskLight.intensity = night ? deskLightNightIntensity : deskLightDayIntensity;

  setDustNight(night);
}

updateDayNight();

// every mesh casts and receives shadows, except glass and anything marked noShadow
scene.traverse(function (object) {
  if (!object.isMesh) return;
  object.castShadow = object.material !== glassMaterial && !object.userData.noShadow;
  object.receiveShadow = true;
});

window.addEventListener('keydown', function (e) {
  if (e.key.toLowerCase() === 'n') {
    isNight = !isNight;
    updateDayNight();
  }
});