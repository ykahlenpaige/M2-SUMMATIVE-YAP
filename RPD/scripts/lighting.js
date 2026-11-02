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

// A shaft of light falling from high in the roof onto the statue, like the game: a spotlight (lights her up) plus a soft see-through beam (the visible "light ray").
const beamDayOpacity = 0.2;
const beamNightOpacity = 0.55;
const beamTop = new THREE.Vector3(statuePos.x - 3.0, springY + 1.2, statuePos.z - 3.2);    // up in the roof, a bit behind and to the left of the statue
const beamBottom = new THREE.Vector3(statuePos.x, statueBaseY, statuePos.z + 0.2);          // lands on top of the dais
const beamTopRadius = 0.5;
const beamBottomRadius = 2.1;

const ceilingStatueDayIntensity = 100;
const ceilingStatueNightIntensity = 320;
const ceilingStatueLight = makeSpot(0xf2e8d8, 30, 0.3, 0.7);

ceilingStatueLight.position.set(statuePos.x, springY - 0.8, statuePos.z + 3.2);
ceilingStatueLight.target.position.set(statuePos.x, statueBaseY + 3.4, statuePos.z);

const beamUniforms = { uOpacity: { value: beamDayOpacity }, uColor: { value: new THREE.Color(0xe6dccc) } };
const beamLength = beamTop.distanceTo(beamBottom);
const beamGeometry = new THREE.CylinderGeometry(beamTopRadius, beamBottomRadius, beamLength, 40, 1, true);
beamGeometry.rotateX(-Math.PI / 2);                
beamGeometry.translate(0, 0, beamLength / 2);     
const beamMaterial = new THREE.ShaderMaterial({
  uniforms: beamUniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  vertexShader: `
    varying vec3 vNormalW;
    varying vec3 vViewW;
    varying float vAlong;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vNormalW = normalize(mat3(modelMatrix) * normal);
      vViewW = normalize(cameraPosition - world.xyz);
      vAlong = uv.y;                                  // 1 at the roof end, 0 at the statue end
      gl_Position = projectionMatrix * viewMatrix * world;
    }`,
  fragmentShader: `
    uniform float uOpacity;
    uniform vec3 uColor;
    varying vec3 vNormalW;
    varying vec3 vViewW;
    varying float vAlong;
    void main() {
      float edge = pow(abs(dot(normalize(vNormalW), normalize(vViewW))), 1.6);   // soft edges: brightest through the middle of the beam
      float fromRoof = smoothstep(1.0, 0.8, vAlong);                              // fades in below the roof
      float toStatue = smoothstep(0.0, 0.12, vAlong);                             // fades out as it reaches the statue
      float strength = mix(0.35, 1.0, vAlong);                                    // a little brighter near the top
      gl_FragColor = vec4(uColor, edge * fromRoof * toStatue * strength * uOpacity);
    }`
});
const lightBeam = new THREE.Mesh(beamGeometry, beamMaterial);
lightBeam.position.copy(beamTop);
lightBeam.lookAt(beamBottom);
lightBeam.renderOrder = 5;
lightBeam.userData.noShadow = true;
scene.add(lightBeam);

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
  ceilingStatueLight.intensity = night ? ceilingStatueNightIntensity : ceilingStatueDayIntensity;
  beamUniforms.uOpacity.value = night ? beamNightOpacity : beamDayOpacity;

  setDustNight(night);
}

updateDayNight();

// every mesh casts and receives shadows, except glass and anything marked noShadow
scene.traverse(function (object) {
  if (!object.isMesh) return;
  object.castShadow = object.material !== glassMaterial && !object.userData.noShadow;
  object.receiveShadow = true;
});

const statueShadowWatcher = setInterval(function () {
  let found = false;
  statueAnchor.traverse(function (object) {
    if (!object.isMesh) return;
    found = true;
    object.castShadow = false;
    object.receiveShadow = false;
  });
  if (found) clearInterval(statueShadowWatcher);
}, 300);

window.addEventListener('keydown', function (e) {
  if (e.key.toLowerCase() === 'n') {
    isNight = !isNight;
    updateDayNight();
  }
});
