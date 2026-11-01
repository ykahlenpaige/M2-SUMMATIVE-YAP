// Keys 1-6 open / close doors: 1 gate, 2 entrance doors, 3 + 4 garage doors, 5 gallery doors (2nd floor), 6 ground floor doors
// Needs room.js loaded first (it builds the doors and fills "animatedDoors")

const showDoorHint = true;

function swingLeaves(leaves, t) {
  leaves.forEach(function (leaf) {
    leaf.group.rotation.y = leaf.openAngle * t;
  });
}

function rollGarageDoor(index, t) {
  const slab = animatedDoors.garageSlabs[index];
  if (!slab) return;
  slab.scale.y = 1 - 0.96 * t;
  slab.visible = t < 0.999;
}

// seconds = how long it takes; set(t) puts the door at t (0 = closed, 1 = open)
const doorList = [
  { key: '1', label: 'Gate',                      seconds: 2.6, set: function (t) { swingLeaves(animatedDoors.gateLeaves, t); } },
  { key: '2', label: 'Entrance doors',            seconds: 1.6, set: function (t) { swingLeaves(animatedDoors.mainDoorLeaves, t); } },
  { key: '3', label: 'Garage door 1',             seconds: 2.2, set: function (t) { rollGarageDoor(0, t); } },
  { key: '4', label: 'Garage door 2',             seconds: 2.2, set: function (t) { rollGarageDoor(1, t); } },
  { key: '5', label: 'Gallery doors (2nd floor)', seconds: 1.8, set: function (t) { swingLeaves(animatedDoors.upperSideLeaves, t); } },
  { key: '6', label: 'Ground floor doors',        seconds: 1.8, set: function (t) { swingLeaves(animatedDoors.lowerSideLeaves, t); } }
];

doorList.forEach(function (door) {
  door.progress = 0;
  door.target = 0;
  door.set(0);
});

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function updateDoorAnimations(delta) {
  doorList.forEach(function (door) {
    if (door.progress === door.target) return;

    const step = delta / door.seconds;
    if (door.progress < door.target) door.progress = Math.min(door.progress + step, door.target);
    else door.progress = Math.max(door.progress - step, door.target);

    door.set(smooth(door.progress));
  });
}

window.addEventListener('keydown', function (e) {
  if (e.repeat) return;

  doorList.forEach(function (door) {
    if (e.key === door.key) {
      door.target = door.target === 0 ? 1 : 0;
      updateHint();
    }
  });
});

let hintElement = null;

if (showDoorHint) {
  hintElement = document.createElement('div');
  hintElement.style.cssText = 'position:fixed;left:12px;bottom:12px;padding:8px 10px;border-radius:6px;' +
    'background:rgba(0,0,0,0.55);color:#fff;font:12px/1.5 sans-serif;pointer-events:none;white-space:pre';
  document.body.appendChild(hintElement);
}

function updateHint() {
  if (!hintElement) return;
  hintElement.textContent = doorList.map(function (door) {
    return door.key + '  ' + door.label + (door.target === 1 ? '  (open)' : '');
  }).join('\n');
}

updateHint();

const doorClock = new THREE.Clock();

function doorAnimationLoop() {
  requestAnimationFrame(doorAnimationLoop);
  updateDoorAnimations(Math.min(doorClock.getDelta(), 0.1));
}

doorAnimationLoop();