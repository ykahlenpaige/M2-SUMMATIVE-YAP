const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.style.display = 'block';
renderer.domElement.style.touchAction = 'none';

document.documentElement.style.overflow = 'hidden';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
document.body.style.background = '#1b1f2a';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1f2a);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);

// room size (x = left/right, z = entrance/statue, y = up)
const width = 20;
const depth = 35;
const height = 18.5;
const wallThickness = 0.4;

window.addEventListener('resize', function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  updateMovement(delta);
  updateParticles(delta);
  renderer.render(scene, camera);
}

window.addEventListener('load', animate);