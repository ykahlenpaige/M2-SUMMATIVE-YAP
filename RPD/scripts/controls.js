// WASD / arrows = walk, Q/E = down/up, Shift = faster, drag = look, scroll = move forward/back, R = top view, N = day/night

camera.position.set(0, 2.6, 15.4);
camera.rotation.order = 'YXZ';

let yaw = 0;
let pitch = 0.05;
camera.rotation.set(pitch, yaw, 0);

const keys = {};

window.addEventListener('keydown', function (e) {
  keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === 'r') goToTopView();
});

window.addEventListener('keyup', function (e) {
  keys[e.key.toLowerCase()] = false;
});

function goToTopView() {
  camera.position.set(0, 40, 0);
  yaw = 0;
  pitch = -1.55;
  camera.rotation.set(pitch, yaw, 0);
}

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

renderer.domElement.addEventListener('pointerdown', function (e) {
  isDragging = true;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});

renderer.domElement.addEventListener('pointerup', function () {
  isDragging = false;
});

renderer.domElement.addEventListener('pointermove', function (e) {
  if (!isDragging) return;

  yaw -= (e.clientX - lastMouseX) * 0.004;
  pitch -= (e.clientY - lastMouseY) * 0.004;
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;

  pitch = Math.min(Math.max(pitch, -1.55), 1.55);
  camera.rotation.set(pitch, yaw, 0);
});

renderer.domElement.addEventListener('wheel', function (e) {
  e.preventDefault();
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  camera.position.addScaledVector(direction, -e.deltaY * 0.02);
  camera.position.y = Math.max(camera.position.y, 0.5);
}, { passive: false });

function updateMovement(delta) {
  const step = (keys['shift'] ? 12 : 7) * delta;

  const forwardX = -Math.sin(yaw);
  const forwardZ = -Math.cos(yaw);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);

  if (keys['w'] || keys['arrowup']) {
    camera.position.x += forwardX * step;
    camera.position.z += forwardZ * step;
  }
  if (keys['s'] || keys['arrowdown']) {
    camera.position.x -= forwardX * step;
    camera.position.z -= forwardZ * step;
  }
  if (keys['d'] || keys['arrowright']) {
    camera.position.x += rightX * step;
    camera.position.z += rightZ * step;
  }
  if (keys['a'] || keys['arrowleft']) {
    camera.position.x -= rightX * step;
    camera.position.z -= rightZ * step;
  }
  if (keys['e']) camera.position.y += step;
  if (keys['q']) camera.position.y -= step;

  camera.position.y = Math.max(camera.position.y, 0.5);
}