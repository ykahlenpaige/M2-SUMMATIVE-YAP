// ---------- THE HALL ----------

// ---------- Hall shape ----------

const pierX = 6.5;
const secondFloorY = 4.5;
const thirdFloorY = 9.5;
const springY = 13.5;
const apexY = height - 0.6;
const pierZs = [-15, -10.5, -6, -1.5, 3, 7.5, 12, 16.5];
const statuePos = { x: 0, z: -12.1 };

const deskLevelY = 0;
const hallY = 1.2;
const entranceY = 0.9;
const platformEdgeZ = 11.2;
const rampStartZ = 6.0;
const hallEdgeZ = 2.5;
const deskHalfWidth = 4.5;
const rampWidth = 1.5;
const statueBaseY = hallY + 1.9;

const archRise = apexY - springY;
const archRadius = (pierX * pierX + archRise * archRise) / (2 * archRise);
const archCenterY = apexY - archRadius;
const archHalfAngle = Math.asin(pierX / archRadius);

const sconceSpots = [];


// ---------- Helpers ----------

function sizeBoxPicture(geometry, w, h, d, material) {
  const uv = geometry.attributes.uv;
  const faceSizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let face = 0; face < 6; face++) {
    const m = Array.isArray(material) ? material[face] : material;
    if (m && m.userData.fitWidth) {
      if (face === 2 || face === 3) {
        for (let i = face * 4; i < face * 4 + 4; i++) {
          uv.setXY(i, uv.getY(i) * d / w, uv.getX(i));
        }
      }
      continue;
    }
    if (!m || !(m.userData.tile || m.userData.fitHeight)) continue;
    const unit = m.userData.fitHeight ? h : 1;
    for (let i = face * 4; i < face * 4 + 4; i++) {
      uv.setXY(i, uv.getX(i) * faceSizes[face][0] / unit, uv.getY(i) * faceSizes[face][1] / unit);
    }
  }
}

function addBox(w, h, d, material, x, y, z, noShadow) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  sizeBoxPicture(geometry, w, h, d, material);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  if (noShadow) mesh.userData.noShadow = true;
  scene.add(mesh);
  return mesh;
}

function addBeam(from, to, thickness, material, parent) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, direction.length(), thickness), material);
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  (parent || scene).add(mesh);
  return mesh;
}

function archPoint(angle, radius) {
  return new THREE.Vector3(Math.sin(angle) * radius, archCenterY + Math.cos(angle) * radius, 0);
}


function addSolidRailWall(x, thickness, zFront, yFront, zBack, yBack, wallH, capWidth, wallMaterial, capMaterial) {

  const length = zFront - zBack;

  const profile = new THREE.Shape();
  profile.moveTo(0, 0);
  profile.lineTo(length, 0);
  profile.lineTo(length, yBack + wallH);
  profile.lineTo(0, yFront + wallH);
  profile.closePath();

  const geometry = new THREE.ExtrudeGeometry(profile, { depth: thickness, bevelEnabled: false });
  geometry.rotateY(Math.PI / 2);

  const wall = new THREE.Mesh(geometry, wallMaterial);
  wall.position.set(x - thickness / 2, 0, zFront);
  scene.add(wall);

  const rise = yBack - yFront;
  const slopeLength = Math.sqrt(length * length + rise * rise);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(capWidth, 0.08, slopeLength + 0.1), capMaterial);
  cap.rotation.x = Math.atan2(rise, length);
  cap.position.set(x, (yFront + yBack) / 2 + wallH + 0.04, (zFront + zBack) / 2);
  scene.add(cap);
}

function addNewel(x, z, topY, material) {
  addBox(0.4, topY, 0.4, material, x, topY / 2, z);
  addBox(0.55, 0.15, 0.55, material, x, topY + 0.07, z);
}


// ---------- Doors that open and close ----------

const animatedDoors = { gateLeaves: [], mainDoorLeaves: [], garageSlabs: [], upperSideLeaves: [], lowerSideLeaves: [] };

const doorwayHalfW = 1.1;
const doorwayH = 2.9;

function addWallWithDoorway(halfW, bottomY, topY, thick, material, zCenter, openBottomY) {
  const openTopY = openBottomY + doorwayH;
  const sideW = halfW - doorwayHalfW;

  [-1, 1].forEach(function (side) {
    addBox(sideW, topY - bottomY, thick, material, side * (doorwayHalfW + sideW / 2), (bottomY + topY) / 2, zCenter);
  });
  addBox(doorwayHalfW * 2, topY - openTopY, thick, material, 0, (openTopY + topY) / 2, zCenter);
  if (openBottomY - bottomY > 0.001) {
    addBox(doorwayHalfW * 2, openBottomY - bottomY, thick, material, 0, (bottomY + openBottomY) / 2, zCenter);
  }
}


// ---------- Arch frames ----------

function archOutline(openW, openH, post, cut) {
  const o = openW / 2 + post;
  const oc = cut + post * 0.6;
  const shape = new THREE.Shape();
  shape.moveTo(-o, 0);
  shape.lineTo(-o, openH + post - oc);
  shape.lineTo(-o + oc, openH + post);
  shape.lineTo(o - oc, openH + post);
  shape.lineTo(o, openH + post - oc);
  shape.lineTo(o, 0);
  shape.lineTo(openW / 2, 0);
  shape.lineTo(openW / 2, openH - cut);
  shape.lineTo(openW / 2 - cut, openH);
  shape.lineTo(-openW / 2 + cut, openH);
  shape.lineTo(-openW / 2, openH - cut);
  shape.lineTo(-openW / 2, 0);
  shape.closePath();
  return shape;
}

function archFrameGeometry(openW, openH, post, cut, thick) {
  return new THREE.ExtrudeGeometry(archOutline(openW, openH, post, cut), { depth: thick, bevelEnabled: false });
}

function archOpeningGeometry(openW, openH, cut) {
  const shape = new THREE.Shape();
  shape.moveTo(-openW / 2, 0);
  shape.lineTo(openW / 2, 0);
  shape.lineTo(openW / 2, openH - cut);
  shape.lineTo(openW / 2 - cut, openH);
  shape.lineTo(-openW / 2 + cut, openH);
  shape.lineTo(-openW / 2, openH - cut);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function addWallArch(side, z, baseY, openW, openH, frameMaterial, fillMaterial) {
  const post = 0.4;
  const cut = Math.min(0.6, openW * 0.3);
  const x = side * (width / 2 - 0.01);

  const frame = new THREE.Mesh(archFrameGeometry(openW, openH, post, cut, 0.2), frameMaterial);
  frame.rotation.y = -side * Math.PI / 2;
  frame.position.set(x, baseY, z);
  frame.userData.noShadow = true;
  scene.add(frame);

  if (fillMaterial) {
    const fill = new THREE.Mesh(archOpeningGeometry(openW, openH, cut), fillMaterial);
    fill.rotation.y = -side * Math.PI / 2;
    fill.position.set(side * (width / 2 - 0.02), baseY, z);
    fill.userData.noShadow = true;
    scene.add(fill);
  }
}


// ---------- Floor ----------

const floorGeometry = new THREE.PlaneGeometry(width, depth);
floorGeometry.attributes.uv.array.forEach(function (value, i) { floorGeometry.attributes.uv.array[i] = value * (i % 2 === 0 ? width : depth); });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);


// ---------- Raised hall level ----------

const hallLevelDepth = depth / 2 + hallEdgeZ;
addBox(width, hallY, hallLevelDepth, floorMaterial, 0, hallY / 2, -depth / 2 + hallLevelDepth / 2);


// ---------- Entrance platform, with the curved steps cut into it ----------

const stepsHalfWidth = 3.6;
const stepArcWidths = [2.6, 3.1, 3.6];
const stepArcDepths = [0.8, 1.15, 1.5];

function addNotchedBlock(halfX, arcHalfWidth, arcDepth, topY, materials) {

  const zBack = depth / 2;
  const outline = new THREE.Shape();
  outline.moveTo(-halfX, -platformEdgeZ);
  outline.lineTo(-arcHalfWidth, -platformEdgeZ);

  const points = 40;
  for (let i = 1; i <= points; i++) {
    const angle = Math.PI - (i / points) * Math.PI;
    outline.lineTo(arcHalfWidth * Math.cos(angle), -(platformEdgeZ + arcDepth * Math.sin(angle)));
  }

  outline.lineTo(halfX, -platformEdgeZ);
  outline.lineTo(halfX, -zBack);
  outline.lineTo(-halfX, -zBack);
  outline.closePath();

  const geometry = new THREE.ExtrudeGeometry(outline, { depth: topY, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  scene.add(new THREE.Mesh(geometry, materials));
}

addNotchedBlock(width / 2, stepArcWidths[2], stepArcDepths[2], entranceY, [floorMaterial, stepRiserMaterial]);

for (let i = 0; i < 2; i++) {
  addNotchedBlock(stepsHalfWidth, stepArcWidths[i], stepArcDepths[i], entranceY * (i + 1) / 3, [stepTreadMaterial, stepRiserMaterial]);
}

const sideWallStartX = stepsHalfWidth + 0.2;
const sideWallEndX = pierX - 0.43 - 0.2;

[-1, 1].forEach(function (side) {
  const x1 = side * sideWallStartX;
  const x2 = side * sideWallEndX;
  const centerX = (x1 + x2) / 2;
  const length = Math.abs(x2 - x1);
  const z = platformEdgeZ + 0.2;

  addBox(length, entranceY, 0.4, deskWoodMaterial, centerX, entranceY / 2, z);
  addBox(length, 0.1, 0.55, deskWoodMaterial, centerX, entranceY + 0.05, z);
  addBox(length, 0.1, 0.12, deskWoodMaterial, centerX, entranceY + 0.75, z);

  const posts = Math.floor(length / 0.5);
  for (let i = 1; i < posts; i++) {
    addBox(0.06, 0.65, 0.06, deskWoodMaterial, x1 + (x2 - x1) * i / posts, entranceY + 0.42, z);
  }

  [x1, x2].forEach(function (x) {
    addBox(0.4, entranceY + 1.2, 0.4, deskWoodMaterial, x, (entranceY + 1.2) / 2, z);
    addBox(0.55, 0.15, 0.55, deskWoodMaterial, x, entranceY + 1.27, z);
  });
});


// ---------- Ramps ----------

function addRamp(xCenter) {

  const length = rampStartZ - hallEdgeZ;

  const profile = new THREE.Shape();
  profile.moveTo(0, 0);
  profile.lineTo(length, 0);
  profile.lineTo(length, hallY);
  profile.lineTo(0, deskLevelY);
  profile.closePath();

  const geometry = new THREE.ExtrudeGeometry(profile, { depth: rampWidth, bevelEnabled: false });
  geometry.rotateY(Math.PI / 2);

  const ramp = new THREE.Mesh(geometry, floorMaterial);
  ramp.position.set(xCenter - rampWidth / 2, 0, rampStartZ);
  scene.add(ramp);

  [-1, 1].forEach(function (edge) {
    const x = xCenter + edge * (rampWidth / 2 - 0.06);

    const railHeight = 0.95;
    const lowRailHeight = 0.15;
    const frontEnd = new THREE.Vector3(x, deskLevelY, rampStartZ);
    const backEnd = new THREE.Vector3(x, hallY, hallEdgeZ);

    addBeam(frontEnd.clone().setY(deskLevelY + railHeight), backEnd.clone().setY(hallY + railHeight), 0.1, deskWoodMaterial);
    addBeam(frontEnd.clone().setY(deskLevelY + lowRailHeight), backEnd.clone().setY(hallY + lowRailHeight), 0.08, deskWoodMaterial);

    const barCount = Math.round(length / 0.35);
    for (let i = 0; i <= barCount; i++) {
      const t = i / barCount;
      const barBaseY = deskLevelY + (hallY - deskLevelY) * t + lowRailHeight;
      const barHeight = railHeight - lowRailHeight;
      addBox(0.07, barHeight, 0.07, deskWoodMaterial, x, barBaseY + barHeight / 2, rampStartZ + (hallEdgeZ - rampStartZ) * t, true);
    }

    addBox(0.2, deskLevelY + 1.05, 0.2, deskWoodMaterial, x, (deskLevelY + 1.05) / 2, rampStartZ + 0.1);
    addBox(0.3, 0.1, 0.3, deskWoodMaterial, x, deskLevelY + 1.1, rampStartZ + 0.1);
    addBox(0.2, hallY + 1.05, 0.2, deskWoodMaterial, x, (hallY + 1.05) / 2, hallEdgeZ + 0.04);
  });
}

addRamp(-(deskHalfWidth + rampWidth / 2));
addRamp(deskHalfWidth + rampWidth / 2);


// ---------- Curved roof ----------

const vaultGeometry = new THREE.CylinderGeometry(
  archRadius, archRadius, depth, 40, 1, true,
  Math.PI - archHalfAngle, archHalfAngle * 2
);
vaultGeometry.rotateX(Math.PI / 2);

const vault = new THREE.Mesh(vaultGeometry, vaultMaterial);
vault.position.y = archCenterY;
vault.userData.noShadow = true;
scene.add(vault);


// ---------- Gallery ceilings ----------

[-1, 1].forEach(function (side) {
  const galleryRoof = new THREE.Mesh(new THREE.PlaneGeometry(width / 2 - pierX + 0.5, depth), roofMaterial);
  galleryRoof.position.set(side * (pierX + (width / 2 - pierX) / 2 - 0.25), springY + 0.3, 0);
  galleryRoof.rotation.x = Math.PI / 2;
  galleryRoof.userData.noShadow = true;
  scene.add(galleryRoof);
});


// ---------- Side walls ----------

configureUpperWall(secondFloorY, springY + 0.4, secondFloorY - 0.15);

[-1, 1].forEach(function (side) {
  const inner = side === 1 ? 1 : 0;
  const outer = side === 1 ? 0 : 1;
  function wallFaces(hallSideMaterial) {
    const faces = [wallMaterial, wallMaterial, wallMaterial, wallMaterial, wallMaterial, wallMaterial];
    faces[inner] = hallSideMaterial;
    faces[outer] = outerBrickMaterial;
    return faces;
  }
  const sideWallX = side * (width / 2 + wallThickness / 2);
  const wallLength = depth + wallThickness * 2;
  const cut1 = secondFloorY - 0.15;
  const top = springY + 0.4;
  addBox(wallThickness, cut1, wallLength, wallFaces(wallLowerMaterial), sideWallX, cut1 / 2, 0);
  addBox(wallThickness, top - cut1, wallLength, wallFaces(wallUpperMaterial), sideWallX, (cut1 + top) / 2, 0);
});


// ---------- Dark brick strip along the bottom of the side walls ----------

const showDarkBrickStrips = false;
if (showDarkBrickStrips) [-1, 1].forEach(function (side) {
  const wainscotX = side * (width / 2 - 0.05);
  addBox(0.1, 1.1, platformEdgeZ - hallEdgeZ, brickMaterial, wainscotX, 0.55, (platformEdgeZ + hallEdgeZ) / 2);
  addBox(0.1, 1.1, depth / 2 + hallEdgeZ, brickMaterial, wainscotX, hallY + 0.55, -depth / 2 + (depth / 2 + hallEdgeZ) / 2);
});


// ---------- Gallery floors and railings ----------

const balconyZs = [-12.75, -8.25, -3.75, 0.75, 5.25, 9.75, 14.25];
const balconyOpening = 1.56;

const railPillarHalf = 0.45;

function addRailRun(railX, floorY, zFrom, zTo) {

  const pieces = [];
  let start = zFrom;

  pierZs.slice().sort(function (p, q) { return p - q; }).forEach(function (pz) {
    const cutFrom = pz - railPillarHalf;
    const cutTo = pz + railPillarHalf;
    if (cutTo <= start || cutFrom >= zTo) return;
    if (cutFrom - start > 0.05) pieces.push([start, cutFrom]);
    start = Math.max(start, cutTo);
  });
  if (zTo - start > 0.05) pieces.push([start, zTo]);

  pieces.forEach(function (piece) {
    const length = piece[1] - piece[0];
    const centerZ = (piece[0] + piece[1]) / 2;

    addBox(0.14, 0.1, length, railMaterial, railX, floorY + 1.05, centerZ);
    addBox(0.1, 0.08, length, railMaterial, railX, floorY + 0.2, centerZ);

    const bars = Math.max(1, Math.round(length / 0.9));
    for (let i = 0; i < bars; i++) {
      addBox(0.06, 0.9, 0.06, railMaterial, railX, floorY + 0.6, piece[0] + length * (i + 0.5) / bars);
    }
  });
}

[-1, 1].forEach(function (side) {

  addBox(4, 0.3, depth, [stoneMaterial, stoneMaterial, corridorFloorMaterial, stoneMaterial, stoneMaterial, stoneMaterial], side * 8, secondFloorY - 0.15, 0);

  const railX = side * 6.1;
  let from = -depth / 2 + 2.6;

  balconyZs.concat([depth / 2 + balconyOpening]).forEach(function (bz) {
    const to = bz - balconyOpening;
    if (to - from > 0.2) addRailRun(railX, secondFloorY, from, to);
    from = bz + balconyOpening;
  });
});


// ---------- Balconies ----------

const balconyDepth = 0.6;
const balconyLength = 2.9;

function addBalcony(side, z) {

  const centerX = side * (6.1 - balconyDepth / 2);
  const frontX = side * (6.1 - balconyDepth);

  addBox(balconyDepth + 0.6, 0.88, balconyLength, deskWoodMaterial, side * (6.1 - balconyDepth / 2 + 0.3), secondFloorY - 0.46, z);
  addBox(balconyDepth - 0.02, 0.05, balconyLength - 0.24, trimMaterial, side * (6.1 - balconyDepth / 2 + 0.11), secondFloorY + 0.005, z);

  addBox(0.12, 0.1, balconyLength, deskWoodMaterial, frontX, secondFloorY + 1.05, z);
  [-1, 1].forEach(function (end) {
    addBox(balconyDepth, 0.1, 0.12, deskWoodMaterial, centerX, secondFloorY + 1.05, z + end * balconyLength / 2);
  });

  for (let i = 0; i <= 4; i++) {
    addBox(0.07, 0.95, 0.07, deskWoodMaterial, frontX, secondFloorY + 0.55, z - balconyLength / 2 + (balconyLength * i) / 4);
  }
  [-1, 1].forEach(function (end) {
    for (let i = 1; i <= 2; i++) {
      addBox(0.07, 0.95, 0.07, deskWoodMaterial, side * (6.1 - balconyDepth * i / 2.5), secondFloorY + 0.55, z + end * balconyLength / 2);
    }
  });

}

[-1, 1].forEach(function (side) {
  balconyZs.forEach(function (z) {
    addBalcony(side, z);
  });
});


// ---------- Third floor ----------

const bridgeDepth = 3.2;
const bridgeRailZ = depth / 2 - bridgeDepth + 0.1;

[-1, 1].forEach(function (side) {

  addBox(4, 0.3, depth, stoneMaterial, side * 8, thirdFloorY - 0.15, 0);

});

addBox(pierX * 2 + 0.2, 0.3, bridgeDepth, stoneMaterial, 0, thirdFloorY - 0.15, depth / 2 - bridgeDepth / 2);
addBox(pierX * 2 - 0.9, 0.6, 0.35, deskWoodMaterial, 0, thirdFloorY - 0.6, depth / 2 - bridgeDepth + 0.1);

const bridgeRailHalf = 6.1;
addBox(bridgeRailHalf * 2 + 0.14, 0.14, 0.14, railMaterial, 0, thirdFloorY + 1.05, bridgeRailZ);
addBox(bridgeRailHalf * 2 + 0.1, 0.08, 0.1, railMaterial, 0, thirdFloorY + 0.2, bridgeRailZ);

const bridgeBars = Math.round(bridgeRailHalf * 2 / 0.9);
for (let i = 0; i < bridgeBars; i++) {
  addBox(0.06, 0.9, 0.06, railMaterial, -bridgeRailHalf + bridgeRailHalf * 2 * (i + 0.5) / bridgeBars, thirdFloorY + 0.6, bridgeRailZ);
}


// ---------- Big pillars ----------

pierZs.forEach(function (z) {

  [-1, 1].forEach(function (side) {

    const x = side * pierX;

    addBox(0.9, springY, 0.9, stoneMaterial, x, springY / 2, z);
    addBox(1.2, 0.4, 1.2, trimMaterial, x, 0.2, z);
    addBox(1.2, 0.35, 1.2, trimMaterial, x, springY - 0.2, z);
    addBox(1.1, 0.25, 1.1, trimMaterial, x, secondFloorY - 0.45, z);
    addBox(1.1, 0.25, 1.1, trimMaterial, x, thirdFloorY - 0.45, z);

    const lampX = x - side * 0.6;
    const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 6), lampGlowMaterial);
    lamp.rotation.x = Math.PI;
    lamp.position.set(lampX, 3.4, z);
    lamp.userData.noShadow = true;
    scene.add(lamp);

    addBox(0.12, 0.12, 0.12, lampBodyMaterial, x - side * 0.5, 3.7, z, true);

    sconceSpots.push({ x: lampX, y: 3.2, z: z });
  });
});


// ---------- Steel roof arches ----------

function addTrussArch(z) {

  const arch = new THREE.Group();
  arch.position.z = z;

  const steps = 14;
  const outer = [];
  const inner = [];

  for (let i = 0; i <= steps; i++) {
    const angle = -archHalfAngle + (2 * archHalfAngle * i) / steps;
    outer.push(archPoint(angle, archRadius - 0.05));
    inner.push(archPoint(angle, archRadius - 0.85));
  }

  for (let i = 0; i < steps; i++) {
    addBeam(outer[i], outer[i + 1], 0.16, trussMaterial, arch);
    addBeam(inner[i], inner[i + 1], 0.12, trussMaterial, arch);
    addBeam(inner[i], outer[i], 0.07, trussMaterial, arch);
    if (i % 2 === 0) {
      addBeam(inner[i], outer[i + 1], 0.07, trussMaterial, arch);
    } else {
      addBeam(outer[i], inner[i + 1], 0.07, trussMaterial, arch);
    }
  }
  addBeam(inner[steps], outer[steps], 0.07, trussMaterial, arch);

  scene.add(arch);
}

pierZs.forEach(addTrussArch);


// ---------- Front and back walls ----------

function addArchEndWall(z) {
  const shape = new THREE.Shape();
  shape.moveTo(-pierX, springY - 0.2);

  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const angle = -archHalfAngle + (2 * archHalfAngle * i) / steps;
    const p = archPoint(angle, archRadius);
    shape.lineTo(p.x, p.y);
  }
  shape.lineTo(pierX, springY - 0.2);

  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), archWallMaterial);
  mesh.position.z = z;
  mesh.userData.noShadow = true;
  scene.add(mesh);
}

addArchEndWall(depth / 2 + 0.1);
addArchEndWall(-depth / 2 - 0.1);

[-1, 1].forEach(function (side) {
  [-1, 1].forEach(function (end) {
    addBox(width / 2 - pierX, 0.8, wallThickness, wallMaterial,
      side * (pierX + (width / 2 - pierX) / 2), springY + 0.1, end * (depth / 2 + wallThickness / 2));
  });
});


// ---------- Back wall ----------

addBox(width + wallThickness * 2, springY + 0.4, wallThickness,
  [wallMaterial, wallMaterial, wallMaterial, wallMaterial, wallUpperMaterial, outerBrickMaterial],
  0, (springY + 0.4) / 2, -depth / 2 - wallThickness / 2);

const backWindowZ = -depth / 2 + 0.05;

const backWindowXs = [-3.3, 3.3];
const backWindowW = 2.0;
const backWindowBottomY = 5.6;
const backWindowRectH = 8.4;

backWindowXs.forEach(function (x) {

  const rect = new THREE.Mesh(new THREE.PlaneGeometry(backWindowW, backWindowRectH), skyGlassMaterial);
  rect.position.set(x, backWindowBottomY + backWindowRectH / 2, backWindowZ);
  rect.userData.noShadow = true;
  scene.add(rect);

  const archTopY = backWindowBottomY + backWindowRectH;
  const top = new THREE.Mesh(new THREE.CircleGeometry(backWindowW / 2, 24, 0, Math.PI), skyGlassMaterial);
  top.position.set(x, archTopY, backWindowZ);
  top.userData.noShadow = true;
  scene.add(top);

  const ring = new THREE.Mesh(new THREE.RingGeometry(backWindowW / 2 - 0.08, backWindowW / 2, 24, 1, 0, Math.PI), windowBarMaterial);
  ring.position.set(x, archTopY, backWindowZ + 0.01);
  ring.userData.noShadow = true;
  scene.add(ring);

  addBox(0.08, backWindowRectH + backWindowW / 2, 0.06, windowBarMaterial, x, backWindowBottomY + (backWindowRectH + backWindowW / 2) / 2, backWindowZ + 0.02, true);
  for (let y = 1.4; y < backWindowRectH; y += 1.4) {
    addBox(backWindowW, 0.08, 0.06, windowBarMaterial, x, backWindowBottomY + y, backWindowZ + 0.02, true);
  }

  const openH = backWindowRectH + backWindowW / 2;
  const frame = new THREE.Mesh(archFrameGeometry(backWindowW, openH, 0.3, 0.5, 0.2), deskWoodMaterial);
  frame.position.set(x, backWindowBottomY, -depth / 2 + 0.02);
  frame.userData.noShadow = true;
  scene.add(frame);

  addBox(backWindowW + 0.8, 0.15, 0.35, trimMaterial, x, backWindowBottomY - 0.07, -depth / 2 + 0.17, true);
});

const backBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 20), rugMedallionMaterial);
backBadge.rotation.x = Math.PI / 2;
backBadge.position.set(0, 9.3, -depth / 2 + 0.08);
backBadge.userData.noShadow = true;
scene.add(backBadge);


// ---------- Back landing ----------

const landingEdgeZ = -depth / 2 + 2.6;
const landingHalfW = pierX + 0.45;
const pocketHalf = 3.6;
const pocketCornerZ = -depth / 2 + 1.8;
const pocketMidZ = -depth / 2 + 3.15;
const pocketMidHalf = 1.6;

const landingShape = new THREE.Shape();
[
  [-landingHalfW, landingEdgeZ], [-pocketHalf, landingEdgeZ], [-pocketHalf, pocketCornerZ],
  [-pocketMidHalf, pocketMidZ], [pocketMidHalf, pocketMidZ], [pocketHalf, pocketCornerZ],
  [pocketHalf, landingEdgeZ], [landingHalfW, landingEdgeZ], [landingHalfW, -depth / 2], [-landingHalfW, -depth / 2]
].forEach(function (p, i) {
  if (i === 0) landingShape.moveTo(p[0], -p[1]); else landingShape.lineTo(p[0], -p[1]);
});
const landingGeometry = new THREE.ExtrudeGeometry(landingShape, { depth: secondFloorY, bevelEnabled: false });
landingGeometry.rotateX(-Math.PI / 2);
scene.add(new THREE.Mesh(landingGeometry, [corridorLandingMaterial, stoneMaterial]));

const railBack = 0.4;
const railEdge = [
  [-(pocketHalf + 0.11), landingEdgeZ + 0.12, 0.12], [-pocketHalf, pocketCornerZ, 0.12], [-pocketMidHalf, pocketMidZ, railBack],
  [pocketMidHalf, pocketMidZ, railBack], [pocketHalf, pocketCornerZ, 0.12], [pocketHalf + 0.11, landingEdgeZ + 0.12, 0.12]
];
const railZ = function (point) { return point[1] - point[2]; };

for (let i = 0; i < railEdge.length - 1; i++) {
  const a = railEdge[i];
  const b = railEdge[i + 1];
  const length = Math.hypot(b[0] - a[0], railZ(b) - railZ(a));

  addBeam(new THREE.Vector3(a[0], secondFloorY + 1.05, railZ(a)), new THREE.Vector3(b[0], secondFloorY + 1.05, railZ(b)), 0.1, deskWoodMaterial);
  addBeam(new THREE.Vector3(a[0], secondFloorY + 0.2, railZ(a)), new THREE.Vector3(b[0], secondFloorY + 0.2, railZ(b)), 0.08, deskWoodMaterial);

  const bars = Math.max(1, Math.round(length / 0.4));
  for (let j = 1; j < bars; j++) {
    const t = j / bars;
    addBox(0.06, 0.9, 0.06, deskWoodMaterial, a[0] + (b[0] - a[0]) * t, secondFloorY + 0.6, railZ(a) + (railZ(b) - railZ(a)) * t, true);
  }
}

railEdge.forEach(function (p) {
  addBox(0.2, 1.15, 0.2, deskWoodMaterial, p[0], secondFloorY + 0.575, railZ(p));
  addBox(0.3, 0.1, 0.3, deskWoodMaterial, p[0], secondFloorY + 1.2, railZ(p));
});


// ---------- Front wall ----------

const frontZ = depth / 2 + wallThickness / 2;

addWallWithDoorway(width / 2 + wallThickness, 0, springY + 0.4, wallThickness, wallMaterial, frontZ, entranceY);

const doorWallHalfWidth = 4.5;
const doorWallHeight = 4.4;
const doorWallTopY = entranceY + doorWallHeight;
const doorWallZ = depth / 2 - 0.25;
const doorFaceZ = depth / 2 - 0.5;

addWallWithDoorway(doorWallHalfWidth, entranceY, entranceY + doorWallHeight, 0.5, deskWoodMaterial, doorWallZ, entranceY);

[-1, 1].forEach(function (side) {
  addBox(doorWallHalfWidth - doorwayHalfW, 0.25, 0.6, trimMaterial, side * (doorWallHalfWidth + doorwayHalfW) / 2, entranceY + 0.12, doorWallZ - 0.05);
});
addBox(3.4, 0.5, 0.1, trimMaterial, 0, entranceY + 3.3, doorFaceZ - 0.04);
addBox(doorWallHalfWidth * 2 + 0.8, 0.35, 0.8, deskWoodMaterial, 0, doorWallTopY + 0.17, depth / 2 - 0.4);

const doorW = 2.2;
const doorH = 2.9;

[-1, 1].forEach(function (side) {
  addBox(0.125, doorH + 0.15, 0.14, doorFrameMaterial, side * (doorW / 2 + 0.0625), entranceY + (doorH + 0.15) / 2, doorFaceZ - 0.05);
});
addBox(doorW + 0.25, 0.15, 0.14, doorFrameMaterial, 0, entranceY + doorH + 0.075, doorFaceZ - 0.05);

[-1, 1].forEach(function (side) {
  const hingeX = side * doorW / 2;
  const leafX = side * (doorW / 4 + 0.02);
  const leafZ = doorFaceZ - 0.12;

  const leaf = new THREE.Group();
  leaf.position.set(hingeX, entranceY, leafZ);
  scene.add(leaf);

  function part(w, h, d, material, x, y, z, noShadow) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x - hingeX, y - entranceY, z - leafZ);
    if (noShadow) mesh.userData.noShadow = true;
    leaf.add(mesh);
  }

  part(doorW / 2 - 0.04, doorH, 0.08, doorMaterial, leafX, entranceY + doorH / 2, leafZ);

  const paneY = entranceY + doorH * 0.6;
  part(0.65, 1.4, 0.03, doorGlassMaterial, leafX, paneY, leafZ - 0.045, true);
  part(0.04, 1.4, 0.04, windowBarMaterial, leafX, paneY, leafZ - 0.06, true);
  part(0.65, 0.04, 0.04, windowBarMaterial, leafX, paneY, leafZ - 0.06, true);

  part(0.65, 0.8, 0.03, doorFrameMaterial, leafX, entranceY + 0.65, leafZ - 0.045, true);

  part(0.05, 0.22, 0.06, trimMaterial, side * 0.12, entranceY + 1.2, leafZ - 0.07, true);

  animatedDoors.mainDoorLeaves.push({ group: leaf, openAngle: -side * 1.75 });

  addBox(0.7, 1.1, 0.08, darkStoneMaterial, side * 2.2, entranceY + 1.8, doorFaceZ - 0.04, true);
});

const windowZ = depth / 2 - 0.03;
const windowBottomY = doorWallTopY + 0.5;
const windowRectH = 1.0;
const windowR = 2.3;

const frontWindowRect = new THREE.Mesh(new THREE.PlaneGeometry(windowR * 2, windowRectH), doorGlassMaterial);
frontWindowRect.position.set(0, windowBottomY + windowRectH / 2, windowZ);
frontWindowRect.userData.noShadow = true;
scene.add(frontWindowRect);

const frontWindowTop = new THREE.Mesh(new THREE.CircleGeometry(windowR, 32, 0, Math.PI), doorGlassMaterial);
frontWindowTop.position.set(0, windowBottomY + windowRectH, windowZ);
frontWindowTop.userData.noShadow = true;
scene.add(frontWindowTop);

const frontWindowRing = new THREE.Mesh(new THREE.RingGeometry(windowR - 0.1, windowR + 0.1, 32, 1, 0, Math.PI), windowBarMaterial);
frontWindowRing.position.set(0, windowBottomY + windowRectH, windowZ - 0.01);
frontWindowRing.userData.noShadow = true;
scene.add(frontWindowRing);

[-1.15, 0, 1.15].forEach(function (x) {
  addBox(0.1, windowRectH + 2.1, 0.05, windowBarMaterial, x, windowBottomY - 0.2 + (windowRectH + 2.1) / 2, windowZ - 0.02, true);
});

const archR = 1.5;
const archBaseY = doorWallTopY + 0.35;

const archShape = new THREE.Shape();
archShape.moveTo(-archR, 0);
archShape.absarc(0, 0, archR, Math.PI, 0, true);
archShape.closePath();

const archMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(archShape, { depth: 0.3, bevelEnabled: false }), deskWoodMaterial);
archMesh.position.set(0, archBaseY, depth / 2 - 0.35);
scene.add(archMesh);

const clockY = archBaseY + 0.75;
const clockRim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.08, 20), trimMaterial);
clockRim.rotation.x = Math.PI / 2;
clockRim.position.set(0, clockY, depth / 2 - 0.38);
scene.add(clockRim);

const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.09, 20), clockFaceMaterial);
clockFace.rotation.x = Math.PI / 2;
clockFace.position.set(0, clockY, depth / 2 - 0.42);
clockFace.userData.noShadow = true;
scene.add(clockFace);

addBox(0.03, 0.22, 0.02, doorFrameMaterial, 0, clockY + 0.09, depth / 2 - 0.48, true);
addBox(0.15, 0.03, 0.02, doorFrameMaterial, 0.07, clockY, depth / 2 - 0.48, true);

const framePillarSize = 1.2;
const framePillarX = doorWallHalfWidth + 0.4;
const framePillarZ = depth / 2 - framePillarSize / 2;
const framePillarTop = archCenterY + Math.sqrt(Math.pow(archRadius - 0.85, 2) - Math.pow(framePillarX + framePillarSize / 2, 2)) - 0.05;

[-1, 1].forEach(function (side) {
  const x = side * framePillarX;

  addBox(framePillarSize, framePillarTop, framePillarSize, deskWoodMaterial, x, framePillarTop / 2, framePillarZ);
  addBox(framePillarSize + 0.4, 0.5, framePillarSize + 0.4, deskWoodMaterial, x, entranceY + 0.25, framePillarZ - 0.1);
  addBox(framePillarSize + 0.15, 0.2, framePillarSize + 0.15, deskWoodMaterial, x, doorWallTopY + 0.3, framePillarZ);
  addBox(framePillarSize + 0.3, 0.4, framePillarSize + 0.3, deskWoodMaterial, x, framePillarTop - 0.2, framePillarZ);
});


// ---------- Staircases ----------

const stairSteps = 20;
const roundedSteps = 4;
const roundedBulge = 0.45;
const roundedWiden = 0.07;
const stairStartZ = -7.5;
const stairEndZ = -depth / 2 + 2.6;
const straightSteps = stairSteps - roundedSteps;
const stairRun = (stairStartZ - stairEndZ) / straightSteps;
const stairRise = (secondFloorY - hallY) / stairSteps;
const stairWidth = 2;
const stairX = 4.6;
const stairWallH = 0.25;
const stairRailH = 0.72;
const stairWallThickness = 0.22;

function addRoundedStair(x, bulge, halfWidth, topY) {

  const cornerX = Math.min(0.9, halfWidth);
  const frontZ = stairStartZ + bulge;
  const outline = new THREE.Shape();
  outline.moveTo(-halfWidth, -stairStartZ);
  outline.lineTo(halfWidth, -stairStartZ);

  const points = 14;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI / 2;
    outline.lineTo(halfWidth - cornerX + cornerX * Math.cos(angle), -(stairStartZ + bulge * Math.sin(angle)));
  }
  for (let i = 0; i <= points; i++) {
    const angle = Math.PI / 2 + (i / points) * Math.PI / 2;
    outline.lineTo(-halfWidth + cornerX + cornerX * Math.cos(angle), -(stairStartZ + bulge * Math.sin(angle)));
  }
  outline.closePath();

  const geometry = new THREE.ExtrudeGeometry(outline, { depth: topY, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(x, 0, 0);
  scene.add(new THREE.Mesh(geometry, stoneMaterial));
}

function addStairRailing(x, zFront, yFront, zBack, yBack, railH) {

  addBeam(new THREE.Vector3(x, yFront + railH, zFront), new THREE.Vector3(x, yBack + railH, zBack), 0.11, deskWoodMaterial);

  const length = zFront - zBack;
  const bars = Math.max(2, Math.round(length / 0.55));
  for (let i = 1; i <= bars; i++) {
    const t = i / bars;
    const y = yFront + (yBack - yFront) * t;
    addBox(0.07, railH - 0.03, 0.07, deskWoodMaterial, x, y + (railH - 0.07) / 2, zFront - length * t, true);
  }
}

function addStaircase(side) {

  const x = side * stairX;

  for (let i = 0; i < roundedSteps; i++) {
    const n = roundedSteps - i;
    addRoundedStair(x, n * roundedBulge, stairWidth / 2 + n * roundedWiden, hallY + (i + 1) * stairRise);
  }

  for (let j = 0; j < straightSteps; j++) {
    const topY = hallY + (roundedSteps + j + 1) * stairRise;
    addBox(stairWidth, topY, stairRun, stoneMaterial, x, topY / 2, stairStartZ - (j + 0.5) * stairRun);
  }

  const wallStartY = hallY + roundedSteps * stairRise;
  [-1, 1].forEach(function (edge) {
    const wallX = x + edge * (stairWidth / 2 - stairWallThickness / 2);
    addSolidRailWall(wallX, stairWallThickness, stairStartZ, wallStartY, stairEndZ, secondFloorY, stairWallH, 0.3, stoneMaterial, trimMaterial);
    const curbTop = stairWallH + 0.08;
    addStairRailing(wallX, stairStartZ, wallStartY + curbTop, stairEndZ, secondFloorY + curbTop, stairRailH);
    addNewel(wallX, stairStartZ + 0.1, wallStartY + curbTop + stairRailH + 0.05, deskWoodMaterial);
  });
}

addStaircase(-1);
addStaircase(1);


// ---------- Statue platform ----------

const statueFloorMaterial = solid(0x9b7a45, { roughness: 0.85 });
const daisApothem = 3.61;
const daisRadius = daisApothem / Math.cos(Math.PI / 12);

const goldFrontZ = statuePos.z + 1.0;
addBox(3.6 * 2, 0.04, goldFrontZ - pocketCornerZ, statueFloorMaterial,
  0, hallY + 0.02, (goldFrontZ + pocketCornerZ) / 2, true);
addBox(3.6 * 2, 0.07, 0.25, solid(0x4d5b66, { roughness: 0.7 }), 0, hallY + 0.035, goldFrontZ + 0.125, true);

const standR = 2.9;
const standScale = standR / 2.5;
const standSides = 14;
const daisRimMaterial = solid(0x6a7479, { roughness: 0.7 });
const daisGoldMaterial = solid(0xb07a32, { roughness: 0.8 });
const daisGoldLightMaterial = solid(0xc08a3e, { roughness: 0.8 });
const daisRingMaterial = solid(0x37444e, { roughness: 0.7 });
const daisLineMaterial = solid(0x5a3b1c, { roughness: 0.9 });

function addDaisPiece(geometry, material, y, noShadow) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(statuePos.x, y, statuePos.z);
  if (noShadow) mesh.userData.noShadow = true;
  scene.add(mesh);
  return mesh;
}

addDaisPiece(new THREE.CylinderGeometry(standR, standR, 0.3, standSides), daisRimMaterial, hallY + 0.15);
addDaisPiece(new THREE.CylinderGeometry(standR - 0.32, standR - 0.32, 0.04, standSides), daisGoldMaterial, hallY + 0.32, true);

const daisRingGeometry = new THREE.RingGeometry(1.45 * standScale, 1.75 * standScale, standSides);
daisRingGeometry.rotateX(-Math.PI / 2);
addDaisPiece(daisRingGeometry, daisRingMaterial, hallY + 0.345, true);

const lineCount = 28;
for (let k = 0; k < lineCount; k++) {
  const angle = k * 2 * Math.PI / lineCount;
  const from = 1.75 * standScale;
  const to = standR - 0.32;
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, to - from), daisLineMaterial);
  line.position.set(statuePos.x + Math.sin(angle) * (from + to) / 2, hallY + 0.348, statuePos.z + Math.cos(angle) * (from + to) / 2);
  line.rotation.y = angle;
  line.userData.noShadow = true;
  scene.add(line);
}

const drumR = 2.2;
const drumSides = 14;
const drumFace = 2 * Math.PI / drumSides;
const drumApothem = drumR * Math.cos(Math.PI / drumSides);

function drumGeometry(radius, height) {
  const geometry = new THREE.CylinderGeometry(radius, radius, height, drumSides);
  geometry.rotateY(Math.PI / drumSides);
  return geometry;
}

addDaisPiece(drumGeometry(drumR + 0.25, 0.2), daisRimMaterial, hallY + 0.4);
addDaisPiece(drumGeometry(drumR, 1.05), daisGoldMaterial, hallY + 1.025);
addDaisPiece(drumGeometry(drumR + 0.12, 0.2), daisRingMaterial, hallY + 1.65);
addDaisPiece(drumGeometry(1.0, 0.15), daisRimMaterial, hallY + 1.825);

[-drumFace, 0, drumFace].forEach(function (angle) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.6, 0.06), daisLineMaterial);
  panel.position.set(statuePos.x + Math.sin(angle) * (drumApothem + 0.02), hallY + 1.0, statuePos.z + Math.cos(angle) * (drumApothem + 0.02));
  panel.rotation.y = angle;
  panel.userData.noShadow = true;
  scene.add(panel);

  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.05), daisGoldLightMaterial);
  plate.position.set(statuePos.x + Math.sin(angle) * (drumApothem + 0.06), hallY + 1.0, statuePos.z + Math.cos(angle) * (drumApothem + 0.06));
  plate.rotation.y = angle;
  plate.userData.noShadow = true;
  scene.add(plate);
});

[-1, 1].forEach(function (side) {
  addBox(1.4, 0.65, 2.4, daisGoldMaterial, side * 2.9, hallY + 0.325, statuePos.z);
  addBox(1.5, 0.2, 2.5, daisRimMaterial, side * 2.9, hallY + 0.75, statuePos.z);
});


// ---------- the little arch behind the statue ----------
const haloR = 1.5;
const haloThick = 0.2;
const haloZ = pocketMidZ - 0.04 - haloThick;

function halfDiscGeometry(radius, thick) {
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.absarc(0, 0, radius, Math.PI, 0, true);
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 28 });
}

const haloBorder = new THREE.Mesh(halfDiscGeometry(haloR, haloThick), trimMaterial);
haloBorder.position.set(statuePos.x, secondFloorY, haloZ);
scene.add(haloBorder);

const haloInner = new THREE.Mesh(halfDiscGeometry(haloR - 0.25, haloThick + 0.02), wallMaterial);
haloInner.position.set(statuePos.x, secondFloorY, haloZ);
scene.add(haloInner);


// ---------- Statue spot ----------

const statueAnchor = new THREE.Group();
statueAnchor.position.set(statuePos.x, statueBaseY, statuePos.z);
scene.add(statueAnchor);

// ---------- Load the statue model ----------
const statueHeight = 5.0;
const statueTurn = -Math.PI / 2;

const statueTexture = new THREE.TextureLoader().load('model/statue.jpg');
statueTexture.colorSpace = THREE.SRGBColorSpace;
statueTexture.anisotropy = 8;

function loadStatueOBJ(url, onLoad) {
  fetch(url).then(function (response) {
    if (!response.ok) throw new Error('Could not load ' + url + ' (' + response.status + ')');
    return response.text();
  }).then(function (text) {
    const v = [], vt = [], pos = [], uv = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.charCodeAt(0) === 118 && line.charCodeAt(1) === 32) {
        const p = line.trim().split(/\s+/);
        v.push(+p[1], +p[2], +p[3]);
      } else if (line.charCodeAt(0) === 118 && line.charCodeAt(1) === 116) {
        const p = line.trim().split(/\s+/);
        vt.push(+p[1], +p[2]);
      } else if (line.charCodeAt(0) === 102 && line.charCodeAt(1) === 32) {
        const p = line.trim().split(/\s+/);
        for (let k = 2; k < p.length - 1; k++) {
          [p[1], p[k], p[k + 1]].forEach(function (corner) {
            const parts = corner.split('/');
            const a = (parseInt(parts[0], 10) - 1) * 3;
            pos.push(v[a], v[a + 1], v[a + 2]);
            if (parts[1]) {
              const b = (parseInt(parts[1], 10) - 1) * 2;
              uv.push(vt[b], vt[b + 1]);
            }
          });
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (uv.length) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geometry.computeVertexNormals();
    const group = new THREE.Group();
    group.add(new THREE.Mesh(geometry));
    onLoad(group);
  }).catch(function (error) {
    console.error('Statue failed to load:', error);
  });
}

loadStatueOBJ('model/statue.obj', function (model) {

  model.traverse(function (child) {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({ map: statueTexture, roughness: 0.8, metalness: 0 });
    }
  });

  const p = model.children[0].geometry.attributes.position.array;
  let minY = Infinity, maxY = -Infinity;
  for (let k = 1; k < p.length; k += 3) {
    if (p[k] < minY) minY = p[k];
    if (p[k] > maxY) maxY = p[k];
  }
  const baseTop = minY + (maxY - minY) * 0.04;
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let k = 0; k < p.length; k += 3) {
    if (p[k + 1] <= baseTop) {
      if (p[k] < minX) minX = p[k];
      if (p[k] > maxX) maxX = p[k];
      if (p[k + 2] < minZ) minZ = p[k + 2];
      if (p[k + 2] > maxZ) maxZ = p[k + 2];
    }
  }
  const baseX = (minX + maxX) / 2;
  const baseZ = (minZ + maxZ) / 2;

  const scale = statueHeight / (maxY - minY);
  model.scale.setScalar(scale);
  model.position.set(-baseX * scale, -minY * scale, -baseZ * scale);

  const holder = new THREE.Group();
  holder.add(model);
  holder.rotation.y = statueTurn;
  statueAnchor.add(holder);
});



// ---------- Wooden wall in front of the raised hall ----------

const deskWallThickness = 0.5;
const deskWallZ = hallEdgeZ + deskWallThickness / 2;

const deskWallTopY = hallY + 0.9;

addBox(deskHalfWidth * 2, deskWallTopY, deskWallThickness, deskWoodMaterial, 0, deskWallTopY / 2, deskWallZ);
addBox(deskHalfWidth * 2, 0.25, deskWallThickness + 0.1, trimMaterial, 0, 0.12, deskWallZ + 0.05);
addBox(deskHalfWidth * 2, 0.12, deskWallThickness + 0.3, deskWoodMaterial, 0, deskWallTopY + 0.06, deskWallZ);

[-1, 1].forEach(function (side) {
  const x = side * (deskHalfWidth - 0.25);
  addBox(0.45, hallY + 1.0, 0.45, deskWoodMaterial, x, (hallY + 1.0) / 2, deskWallZ);
  addBox(0.6, 0.15, 0.6, deskWoodMaterial, x, hallY + 1.07, deskWallZ);
});


// ---------- Two big pillars ----------

const deskPillarSize = 1.2;
const deskPillarX = deskHalfWidth - 0.85;
const deskPillarZ = deskWallZ;

const deskPillarTop = archCenterY + Math.sqrt(Math.pow(archRadius - 0.85, 2) - Math.pow(deskPillarX + deskPillarSize / 2, 2)) - 0.05;

[-1, 1].forEach(function (side) {

  const x = side * deskPillarX;

  addBox(deskPillarSize, deskPillarTop, deskPillarSize, deskWoodMaterial, x, deskPillarTop / 2, deskPillarZ);

  addBox(deskPillarSize + 0.4, 0.5, deskPillarSize + 0.4, deskWoodMaterial, x, 0.25, deskPillarZ);
  addBox(deskPillarSize + 0.15, 0.2, deskPillarSize + 0.15, deskWoodMaterial, x, hallY + 1.2, deskPillarZ);
  addBox(deskPillarSize + 0.15, 0.2, deskPillarSize + 0.15, deskWoodMaterial, x, secondFloorY - 0.4, deskPillarZ);
  addBox(deskPillarSize + 0.15, 0.2, deskPillarSize + 0.15, deskWoodMaterial, x, thirdFloorY - 0.4, deskPillarZ);
  addBox(deskPillarSize + 0.3, 0.4, deskPillarSize + 0.3, deskWoodMaterial, x, deskPillarTop - 0.2, deskPillarZ);
});


// ---------- Floor emblem ----------

const rugZ = 6.6;

addBox(3.8, 0.02, 1.7, rugBorderMaterial, 0, deskLevelY + 0.01, rugZ, true);
addBox(3.4, 0.03, 1.3, rugMaterial, 0, deskLevelY + 0.02, rugZ, true);

const rugMedallion = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.04, 24), rugMedallionMaterial);
rugMedallion.position.set(0, deskLevelY + 0.03, rugZ);
rugMedallion.userData.noShadow = true;
scene.add(rugMedallion);


// ---------- Reception desk ----------

const deskZ = 5.3;

addBox(4.6, 0.95, 1.0, deskWoodMaterial, 0, deskLevelY + 0.475, deskZ);
addBox(4.8, 0.1, 1.2, deskTopMaterial, 0, deskLevelY + 1.0, deskZ);

[-1, 1].forEach(function (side) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.95, 16), deskWoodMaterial);
  base.position.set(side * 2.3, deskLevelY + 0.475, deskZ);
  scene.add(base);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16), deskTopMaterial);
  top.position.set(side * 2.4, deskLevelY + 1.0, deskZ);
  scene.add(top);
});


// ---------- Tables and crate ----------

function addTable(x, z) {
  addBox(1.8, 0.08, 1.0, tableMaterial, x, deskLevelY + 0.78, z);

  [-1, 1].forEach(function (a) {
    [-1, 1].forEach(function (b) {
      addBox(0.06, 0.76, 0.06, tableMaterial, x + a * 0.8, deskLevelY + 0.38, z + b * 0.42);
    });
  });
}

addTable(-3.0, 3.95);
addTable(3.0, 3.95);

addBox(1.0, 0.6, 0.9, lampBodyMaterial, 0, deskLevelY + 0.3, 3.95);
addBox(0.8, 0.05, 0.7, darkStoneMaterial, 0, deskLevelY + 0.62, 3.95);


// ---------- Cardboard boxes and the cart ----------

const lift = entranceY;
const oz = depth / 2 - 13;

addBox(1.1, 0.7, 0.9, cardboardMaterial, -2.8, lift + 0.35, 11.6 + oz);
addBox(0.9, 0.6, 0.8, cardboardMaterial, -3.5, lift + 0.3, 12.0 + oz);
addBox(0.8, 0.5, 0.7, cardboardMaterial, -2.7, lift + 0.95, 11.6 + oz);
addBox(0.5, 0.5, 0.5, cardboardMaterial, 5.6, hallY + 0.25, 0.5);

const cartX = 2.8;
const cartZ = 11.8 + oz;

addBox(1.2, 0.06, 0.7, cartMaterial, cartX, lift + 0.25, cartZ);

[-1, 1].forEach(function (a) {
  [-1, 1].forEach(function (b) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 8), lampBodyMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(cartX + a * 0.5, lift + 0.08, cartZ + b * 0.28);
    scene.add(wheel);
  });
});

addBeam(new THREE.Vector3(cartX - 0.6, lift + 0.25, cartZ), new THREE.Vector3(cartX - 0.6, lift + 1.2, cartZ), 0.05, cartMaterial);
addBeam(new THREE.Vector3(cartX - 0.6, lift + 1.2, cartZ - 0.3), new THREE.Vector3(cartX - 0.6, lift + 1.2, cartZ + 0.3), 0.05, cartMaterial);

addBox(0.9, 0.6, 0.6, cardboardMaterial, cartX + 0.2, lift + 0.58, cartZ);

// ---------- EXTRA DETAILS ----------

// ---------- Belt courses and cornice along the side walls ----------

[-1, 1].forEach(function (side) {
  const wx = side * (width / 2 - 0.08);

  [5.5, 10.2].forEach(function (y) {
    addBox(0.16, 0.18, depth, trimMaterial, wx, y, 0, true);
    addBox(0.1, 0.06, depth, darkStoneMaterial, wx, y - 0.12, 0, true);
  });

  addBox(0.3, 0.25, depth, trimMaterial, wx, 13.55, 0, true);
  addBox(0.45, 0.1, depth, trimMaterial, wx, 13.74, 0, true);
});


// ---------- Pillar details ----------

pierZs.forEach(function (z) {
  [-1, 1].forEach(function (side) {
    const x = side * pierX;

    addBox(1.0, 0.25, 1.0, trimMaterial, x, 0.52, z, true);

    [-0.2, 0.2].forEach(function (dz) {
      addBox(0.05, springY - 2.4, 0.08, darkStoneMaterial, x - side * 0.46, 0.7 + (springY - 2.4) / 2, z + dz, true);
    });

    addBox(1.0, 0.15, 1.0, trimMaterial, x, springY - 0.55, z, true);
    addBox(1.1, 0.1, 1.1, trimMaterial, x, springY - 0.45, z, true);
  });
});





// ---------- Reception desk ----------

for (let x = -1.8; x <= 1.8; x += 0.6) {
  addBox(0.45, 0.6, 0.04, trimMaterial, x, deskLevelY + 0.5, deskZ + 0.52, true);
}
addBox(4.6, 0.08, 0.06, trimMaterial, deskLevelY + 0, deskLevelY + 0.14, deskZ + 0.52, true);

const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 12), lampBodyMaterial);
lampBase.position.set(-1.4, deskLevelY + 1.08, deskZ);
scene.add(lampBase);

addBeam(new THREE.Vector3(-1.4, deskLevelY + 1.1, deskZ), new THREE.Vector3(-1.25, deskLevelY + 1.6, deskZ), 0.03, lampBodyMaterial);

const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.2, 10), lampGlowMaterial);
lampShade.position.set(-1.25, deskLevelY + 1.55, deskZ);
lampShade.rotation.x = Math.PI;
lampShade.userData.noShadow = true;
scene.add(lampShade);

addBox(0.5, 0.03, 0.35, clockFaceMaterial, 0.6, deskLevelY + 1.07, deskZ - 0.1, true);
addBox(0.45, 0.03, 0.3, clockFaceMaterial, 0.65, deskLevelY + 1.1, deskZ - 0.05, true);
addBox(0.35, 0.05, 0.25, doorFrameMaterial, 1.5, deskLevelY + 1.08, deskZ + 0.05, true);


// ---------- Door wall ----------

[-1, 1].forEach(function (side) {
  const px = side * 3.7;
  const pz = doorFaceZ - 0.05;

  addBox(0.95, 2.2, 0.06, trimMaterial, px, entranceY + 1.9, pz, true);
  addBox(0.75, 2.0, 0.08, deskWoodMaterial, px, entranceY + 1.9, pz - 0.02, true);
});



// ---------- ARCHES BETWEEN THE PILLARS ----------

const archFillMaterial = solid(0xf0eadc);

function archSpandrelGeometry(openW, openH, post, cut, thick, topAt) {
  const o = openW / 2 + post;
  const oc = cut + post * 0.6;
  const oh = openH + post;

  const shape = new THREE.Shape();
  shape.moveTo(-o, oh - oc);
  shape.lineTo(-o + oc, oh);
  shape.lineTo(o - oc, oh);
  shape.lineTo(o, oh - oc);

  const n = 16;
  for (let i = 0; i <= n; i++) {
    const x = o - (2 * o * i) / n;
    shape.lineTo(x, Math.max(oh + 0.05, topAt(x)));
  }
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
}

function addPillarLineArch(side, x, z, baseY, openW, openH, post, cut, thick, fillMaterial, topWorldY) {

  const frame = new THREE.Mesh(archFrameGeometry(openW, openH, post, cut, thick), deskWoodMaterial);
  frame.rotation.y = -side * Math.PI / 2;
  frame.position.set(side * x, baseY, z);
  scene.add(frame);

  if (topWorldY) {
    const above = new THREE.Mesh(archSpandrelGeometry(openW, openH, post, cut, thick, function () { return topWorldY - baseY; }), archFillMaterial);
    above.rotation.y = -side * Math.PI / 2;
    above.position.set(side * x, baseY, z);
    above.userData.noShadow = true;
    scene.add(above);
  }

  if (fillMaterial) {
    const fill = new THREE.Mesh(archOpeningGeometry(openW, openH, cut), fillMaterial);
    fill.rotation.y = -side * Math.PI / 2;
    fill.position.set(side * (x + 0.01), baseY, z);
    fill.userData.noShadow = true;
    scene.add(fill);
  }
}


// ---------- Ground floor wall, pushed forward so it is flush with the pillars ----------

const lowerWallFace = pierX - 0.43;
const lowerWallTop = secondFloorY - 0.15;
const lowerWallThickness = 0.5;
const lowerWallBackZ = -depth / 2 + 2.6;

[-1, 1].forEach(function (side) {

  const wallFrontZ = depth / 2;

  addBox(lowerWallThickness, lowerWallTop, wallFrontZ - lowerWallBackZ, wallLowerMaterial,
    side * (lowerWallFace + lowerWallThickness / 2), lowerWallTop / 2, (wallFrontZ + lowerWallBackZ) / 2);

  const brickX = side * (lowerWallFace - 0.015);

  function addBrickRun(zFrom, zTo, baseY) {
    let start = zFrom;
    pierZs.slice().sort(function (p, q) { return p - q; }).concat([Infinity]).forEach(function (pz) {
      const end = Math.min(zTo, pz - 0.46);
      if (end - start > 0.05) {
        addBox(0.03, 1.1, end - start, brickMaterial, brickX, baseY + 0.55, (start + end) / 2, true);
      }
      start = Math.max(start, pz + 0.46);
    });
  }

  if (showDarkBrickStrips) {
    addBrickRun(lowerWallBackZ, hallEdgeZ, hallY);
    addBrickRun(hallEdgeZ, platformEdgeZ, 0);
    addBrickRun(platformEdgeZ, wallFrontZ, entranceY);
  }

  addBox(0.14, 0.12, wallFrontZ - lowerWallBackZ, trimMaterial, side * (lowerWallFace - 0.05), lowerWallTop - 0.06,
    (wallFrontZ + lowerWallBackZ) / 2, true);
});


// ---------- SIDE WALL DOORS ----------

const sideDoors = [
  { side: -1, upper: [-12.75, -3.75], lower: [-3.75] },
  { side: 1,  upper: [9.75],          lower: [] }
];

const sideDoorLeafMaterial = solid(0x5a3a2a, { roughness: 0.7 });
const sideDoorPanelMaterial = solid(0x472d21, { roughness: 0.8 });
const sideDoorPaneMaterial = solid(0x8e959a, { roughness: 0.25, metalness: 0.1 });

function addSideDoor(side, z, baseY, wallFaceX, leaves, doorW, doorH, kind) {

  const toHall = -side;

  function piece(w, h, t, out, material, y, zOff) {
    return addBox(t, h, w, material, side * wallFaceX + toHall * out, baseY + y, z + zOff, true);
  }

  const jamb = 0.2;
  const frameH = doorH + 0.05;

  piece(doorW, doorH, 0.04, 0.02, doorFrameMaterial, doorH / 2, 0);
  piece(jamb, frameH, 0.18, 0.09, deskWoodMaterial, frameH / 2, -(doorW / 2 + jamb / 2));
  piece(jamb, frameH, 0.18, 0.09, deskWoodMaterial, frameH / 2, doorW / 2 + jamb / 2);
  piece(doorW + 0.9, 0.3, 0.34, 0.17, deskWoodMaterial, frameH + 0.15, 0);
  piece(doorW + 1.1, 0.1, 0.44, 0.22, trimMaterial, frameH + 0.35, 0);
  piece(doorW + 0.5, 0.06, 0.3, 0.15, trimMaterial, 0.03, 0);

  const leafW = doorW / leaves;
  const leafOut = 0.08;

  for (let i = 0; i < leaves; i++) {

    const extend = (leaves === 2 && i === 1) ? -1 : 1;
    const hingeZ = (leaves === 2 && i === 1) ? doorW / 2 : -doorW / 2;
    const centerZ = hingeZ + extend * leafW / 2;

    const leaf = new THREE.Group();
    leaf.position.set(side * wallFaceX + toHall * leafOut, baseY, z + hingeZ);
    scene.add(leaf);

    function leafPart(w, h, t, out, material, y, zRel) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(t, h, w), material);
      mesh.position.set(toHall * (out - leafOut), y, zRel - hingeZ);
      mesh.userData.noShadow = true;
      leaf.add(mesh);
    }

    leafPart(leafW - 0.04, doorH - 0.04, 0.08, leafOut, sideDoorLeafMaterial, doorH / 2, centerZ);
    leafPart(leafW - 0.34, doorH * 0.32, 0.03, 0.125, sideDoorPanelMaterial, doorH * 0.24, centerZ);
    leafPart(Math.min(0.4, leafW - 0.4), 0.6, 0.03, 0.125, sideDoorPaneMaterial, doorH * 0.68, centerZ);
    const handleSide = leaves === 2 ? (i === 0 ? 1 : -1) : 1;
    leafPart(0.05, 0.16, 0.06, 0.14, lampBodyMaterial, doorH * 0.45, centerZ + handleSide * (leafW / 2 - 0.15));

    animatedDoors[kind + 'SideLeaves'].push({ group: leaf, openAngle: toHall * extend * 1.6 });
  }
}

function floorHeightAt(z) {
  return z < hallEdgeZ ? hallY : (z < platformEdgeZ ? deskLevelY : entranceY);
}

sideDoors.forEach(function (set) {
  set.upper.forEach(function (z) {
    addSideDoor(set.side, z, secondFloorY, width / 2 - 0.17, 2, 1.7, 2.6, 'upper');
  });
  set.lower.forEach(function (z) {
    addSideDoor(set.side, z, floorHeightAt(z), lowerWallFace - 0.04, 2, 1.7, 2.4, 'lower');
  });
});


// ---------- Arches ----------

[-1, 1].forEach(function (side) {
  balconyZs.forEach(function (z) {

    addPillarLineArch(side, pierX + 0.25, z, secondFloorY + 0.15, 3.0, 4.15, 0.3, 0.8, 0.5, null, thirdFloorY - 0.3);

    addPillarLineArch(side, pierX + 0.25, z, thirdFloorY, 3.0, 3.6, 0.3, 0.8, 0.5, null, springY + 0.45);
  });
});


// ---------- Three wooden arches on the two big pillars ----------

const bigArchBaseY = thirdFloorY + 1.3;
const bigArchPost = 0.4;
const bigArchDepth = 0.5;
const bigArchInner = deskPillarX - deskPillarSize / 2;
const bigArchPierZ = pierZs.reduce(function (best, z) { return Math.abs(z - deskPillarZ) < Math.abs(best - deskPillarZ) ? z : best; });
const bigArchZ = bigArchPierZ - bigArchDepth / 2;
const bigArchOuter = deskPillarX + deskPillarSize / 2;

const bigArchSpans = [
  [-bigArchInner, bigArchInner, deskPillarTop - 0.3],
  [-(pierX - 0.45), -bigArchOuter, springY - 0.1],
  [bigArchOuter, pierX - 0.45, springY - 0.1]
];

bigArchSpans.forEach(function (span) {
  const spanWidth = span[1] - span[0];
  const openW = spanWidth - bigArchPost * 2;
  const openH = span[2] - bigArchBaseY - bigArchPost;
  const cut = Math.min(1.4, openW * 0.25, openH * 0.6);

  const centerX = (span[0] + span[1]) / 2;

  const arch = new THREE.Mesh(archFrameGeometry(openW, openH, bigArchPost, cut, bigArchDepth), deskWoodMaterial);
  arch.position.set(centerX, bigArchBaseY, bigArchZ);
  scene.add(arch);

  const above = new THREE.Mesh(archSpandrelGeometry(openW, openH, bigArchPost, cut, bigArchDepth, function (localX) {
    const ax = Math.abs(centerX + localX);
    const roofY = ax < pierX ? archCenterY + Math.sqrt(archRadius * archRadius - ax * ax) - 0.1 : springY + 0.3;
    return roofY - bigArchBaseY;
  }), archFillMaterial);
  above.position.set(centerX, bigArchBaseY, bigArchZ);
  above.userData.noShadow = true;
  scene.add(above);
});


// ---------- Arches across the corridors ----------

const corridorFrom = pierX + 0.45;
const corridorSpan = width / 2 - corridorFrom;
const corridorArchPost = 0.3;
const corridorArchDepth = 0.5;
const corridorArchCut = 0.6;

const corridorLevels = [
  [secondFloorY + 0.15, 4.15, thirdFloorY - 0.3],
  [thirdFloorY, 3.6, springY + 0.3]
];

[-1, 1].forEach(function (side) {
  pierZs.forEach(function (z) {
    corridorLevels.forEach(function (level) {

      const baseY = level[0];
      const openH = level[1];
      const topY = level[2];
      const openW = corridorSpan - corridorArchPost * 2;
      const centerX = side * (corridorFrom + corridorSpan / 2);

      const arch = new THREE.Mesh(archFrameGeometry(openW, openH, corridorArchPost, corridorArchCut, corridorArchDepth), deskWoodMaterial);
      arch.position.set(centerX, baseY, z - corridorArchDepth / 2);
      scene.add(arch);

      const above = new THREE.Mesh(archSpandrelGeometry(openW, openH, corridorArchPost, corridorArchCut, corridorArchDepth, function () { return topY - baseY; }), archFillMaterial);
      above.position.set(centerX, baseY, z - corridorArchDepth / 2);
      above.userData.noShadow = true;
      scene.add(above);
    });
  });
});


// ---------- DOOR WALL ----------

const doorPilasterMaterial = solid(0x4e3427, { roughness: 0.75 });
const doorPilasterHeight = 3.45;

[-1, 1].forEach(function (side) {
  [1.55, 2.85].forEach(function (offset) {
    const x = side * offset;
    const z = doorFaceZ - 0.15;

    addBox(0.5, doorPilasterHeight, 0.3, doorPilasterMaterial, x, entranceY + doorPilasterHeight / 2, z);
    addBox(0.72, 0.4, 0.42, deskWoodMaterial, x, entranceY + 0.2, z - 0.05);
    addBox(0.68, 0.18, 0.4, deskWoodMaterial, x, entranceY + doorPilasterHeight - 0.09, z - 0.04);
  });
});

addBox(6.5, 0.45, 0.4, deskWoodMaterial, 0, entranceY + doorPilasterHeight + 0.22, doorFaceZ - 0.2);
addBox(6.7, 0.1, 0.5, doorPilasterMaterial, 0, entranceY + doorPilasterHeight + 0.5, doorFaceZ - 0.22);


// ---------- GARAGE-STYLE DOORS ----------

const garageDoors = [
  { side: 1,  z: (pierZs[pierZs.length - 2] + pierZs[pierZs.length - 1]) / 2, baseY: entranceY },
  { side: -1, z: (pierZs[pierZs.length - 3] + pierZs[pierZs.length - 2]) / 2, baseY: deskLevelY }
];

const garageBayWidth = 4.5 - 0.9;
const garagePost = 0.35;
const garageCut = 0.5;
const garageOpenW = garageBayWidth - garagePost * 2;
const garageFrameDepth = 0.4;
const garageSlabDepth = 0.2;

const garageInteriorMaterial = solid(0x0d0c0b, { roughness: 1 });

function garageSlabGeometry(openW, openH, cut, thick) {
  const s = new THREE.Shape();
  s.moveTo(-openW / 2, 0);
  s.lineTo(openW / 2, 0);
  s.lineTo(openW / 2, openH - cut);
  s.lineTo(openW / 2 - cut, openH);
  s.lineTo(-openW / 2 + cut, openH);
  s.lineTo(-openW / 2, openH - cut);
  s.closePath();
  const geometry = new THREE.ExtrudeGeometry(s, { depth: thick, bevelEnabled: false });
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / openW + 0.5, pos.getY(i) / openH);
  }
  uv.needsUpdate = true;
  return geometry;
}

garageDoors.forEach(function (info) {

  const side = info.side;
  const openH = (secondFloorY - 0.15) - info.baseY - garagePost - 0.1;

  const door = new THREE.Group();
  door.position.set(side * (lowerWallFace - 0.04), info.baseY, info.z);
  door.rotation.y = -side * Math.PI / 2;
  scene.add(door);

  function part(geometry, material, x, y, z, noShadow) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    if (noShadow) mesh.userData.noShadow = true;
    door.add(mesh);
    return mesh;
  }

  const slab = new THREE.Group();
  slab.position.set(0, openH, 0);
  door.add(slab);

  function slabPart(geometry, material, x, y, z, noShadow) {
    const mesh = part(geometry, material, x, y - openH, z, noShadow);
    slab.add(mesh);
    return mesh;
  }

  part(archOpeningGeometry(garageOpenW, openH, garageCut), garageInteriorMaterial, 0, 0, 0.015, true);

  slabPart(garageSlabGeometry(garageOpenW, openH, garageCut, garageSlabDepth), garageDoorMaterial, 0, 0, 0);

  animatedDoors.garageSlabs.push(slab);

  part(archFrameGeometry(garageOpenW, openH, garagePost, garageCut, garageFrameDepth), deskWoodMaterial, 0, 0, 0);

  [-1, 1].forEach(function (leg) {
    const legX = leg * (garageOpenW / 2 + garagePost / 2);
    part(new THREE.BoxGeometry(0.62, 0.4, garageFrameDepth + 0.12), deskWoodMaterial, legX, 0.2, (garageFrameDepth + 0.12) / 2);
    part(new THREE.BoxGeometry(0.5, 0.18, garageFrameDepth + 0.08), deskWoodMaterial, legX, openH - garageCut - 0.05, (garageFrameDepth + 0.08) / 2);
  });
});


// ---------- THE OUTSIDE ----------

(function buildOutside() {

  const F = depth / 2 + wallThickness;
  const topY = Math.max(springY + 0.4, apexY) + 2.0;
  const pedH = 3.6;
  const blockHalf = width / 2 + wallThickness;
  const wingOuterX = 24.6;
  const wingDepth = 9;
  const wingTop = Math.max(8, Math.round(topY * 0.58));
  const mansardH = 3.6;
  const terraceY = 0.5;
  const terraceDepth = 9;
  const gateZ = F + 20;
  const T = true;

  const panelMaterial = solid(0xd8ccb5);


  // ---------- helpers ----------

  function prismAlongX(points, x1, x2, zFront, baseY, material) {
    const shape = new THREE.Shape();
    points.forEach(function (p, i) { if (i === 0) shape.moveTo(p[0], p[1]); else shape.lineTo(p[0], p[1]); });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: x2 - x1, bevelEnabled: false });
    geometry.rotateY(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x1, baseY, zFront);
    scene.add(mesh);
    return mesh;
  }

  function addGable(halfW, h, thick, xCenter, zBack, baseY, material) {
    const shape = new THREE.Shape();
    shape.moveTo(-halfW, 0);
    shape.lineTo(halfW, 0);
    shape.lineTo(0, h);
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false }), material);
    mesh.position.set(xCenter, baseY, zBack);
    scene.add(mesh);
    return mesh;
  }

  function addSpire(x, baseY, z, radius, h) {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(radius, h, 4), outerStoneMaterial);
    mesh.rotation.y = Math.PI / 4;
    mesh.position.set(x, baseY + h / 2, z);
    scene.add(mesh);
  }

  function addColumn(x, z, baseY, h, r) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, h, 14), wallMaterial);
    shaft.position.set(x, baseY + h / 2, z);
    scene.add(shaft);
    addBox(r * 3, 0.45, r * 3, outerStoneMaterial, x, baseY + 0.225, z);
    addBox(r * 2.8, 0.35, r * 2.8, outerStoneMaterial, x, baseY + h - 0.175, z);
  }

  function addWindow(x, baseY, z, w, h) {
    addBox(w + 0.3, h + 0.3, 0.14, outerStoneMaterial, x, baseY + h / 2, z + 0.05, T);
    addBox(w, h, 0.16, doorGlassMaterial, x, baseY + h / 2, z + 0.06, T);
    addBox(0.06, h, 0.18, windowBarMaterial, x, baseY + h / 2, z + 0.07, T);
    addBox(w, 0.06, 0.18, windowBarMaterial, x, baseY + h * 0.65, z + 0.07, T);
    addBox(w + 0.55, 0.14, 0.34, outerStoneMaterial, x, baseY - 0.05, z + 0.13, T);
  }

  function addPanel(x, y1, y2, w, z) {
    addBox(w + 0.5, y2 - y1 + 0.5, 0.12, outerStoneMaterial, x, (y1 + y2) / 2, z + 0.06, T);
    addBox(w, y2 - y1, 0.16, panelMaterial, x, (y1 + y2) / 2, z + 0.07, T);
  }

  function addIronFence(xA, xB, z, h) {
    const x1 = Math.min(xA, xB);
    const len = Math.abs(xB - xA);
    addBox(len, 0.07, 0.07, ironMaterial, x1 + len / 2, terraceY + h, z, T);
    addBox(len, 0.07, 0.07, ironMaterial, x1 + len / 2, terraceY + 0.25, z, T);
    const bars = Math.round(len / 0.32);
    for (let i = 0; i <= bars; i++) {
      addBox(0.035, h, 0.035, ironMaterial, x1 + len * i / bars, terraceY + h / 2, z, T);
    }
    const posts = Math.max(1, Math.round(len / 4));
    for (let i = 0; i <= posts; i++) {
      addBox(0.14, h + 0.25, 0.14, ironMaterial, x1 + len * i / posts, terraceY + (h + 0.25) / 2, z, T);
    }
  }


  // ---------- ground, terrace, steps and path ----------

  const groundMargin = 0.5;
  const streetDepth = 8;

  const groundHalfX = wingOuterX + groundMargin;
  const groundBackZ = F - wingDepth;
  const groundFrontZ = gateZ + 2 + streetDepth + groundMargin;
  addBox(groundHalfX * 2, 1, groundFrontZ - groundBackZ, groundMaterial, 0, -0.52, (groundBackZ + groundFrontZ) / 2, T);
  addBox(wingOuterX * 2 + 2, 0.3, gateZ - F + 2, pavingMaterial, 0, -0.12, (F + gateZ + 2) / 2, T);

  const pathHalf = 6.5;
  const lawnDepth = 4.6;
  addBox(pathHalf * 2, terraceY, terraceDepth, pavingMaterial, 0, terraceY / 2, F + terraceDepth / 2);
  [-1, 1].forEach(function (s) {
    const apronDepth = terraceDepth - lawnDepth;
    const apronW = wingOuterX - pathHalf;
    addBox(apronW, terraceY, apronDepth, pavingMaterial, s * (pathHalf + apronW / 2), terraceY / 2, F + lawnDepth + apronDepth / 2);
    const lawnW = apronW - 0.7;
    addBox(lawnW, 0.28, lawnDepth, groundMaterial, s * (pathHalf + lawnW / 2), 0.03 + 0.14, F + lawnDepth / 2, T);
    addBox(lawnW + 0.1, 0.36, 0.22, outerStoneMaterial, s * (pathHalf + lawnW / 2), 0.03 + 0.18, F + lawnDepth + 0.02, T);
  });

  [[0.33, 0.6, 6.2], [0.17, 1.2, 6.3]].forEach(function (s) {
    addBox(s[2], s[0], s[1], outerStoneMaterial, 0, s[0] / 2, F + terraceDepth + s[1] / 2);
  });

  const slabDepth = 7;
  addBox(14, 0.1, slabDepth, outerBrickMaterial, 0, 0.08, gateZ - slabDepth / 2, T);

  const streetWidth = wingOuterX * 2 + 2;
  const roadRepeat = 8;
  const streetGeometry = new THREE.BoxGeometry(streetWidth, 0.3, streetDepth);
  const streetPos = streetGeometry.attributes.position;
  const streetUV = streetGeometry.attributes.uv;
  for (let i = 8; i < 12; i++) {
    streetUV.setXY(i, (streetPos.getZ(i) + streetDepth / 2) / streetDepth, streetPos.getX(i) / roadRepeat);
  }
  const street = new THREE.Mesh(streetGeometry, roadMaterial);
  street.position.set(0, -0.12, gateZ + 2 + streetDepth / 2);
  street.userData.noShadow = true;
  scene.add(street);


  // ---------- the tall middle block ----------

  const clad = 0.6;
  addWallWithDoorway(blockHalf, 0, topY, clad, outerBrickMaterial, F + clad / 2, entranceY);
  const faceZ = F + clad;

  [4.9, 10.3].forEach(function (y) {
    addBox(blockHalf * 2 + 0.3, 0.35, 0.95, outerStoneMaterial, 0, y, F + 0.47, T);
  });
  addBox(blockHalf * 2 + 0.8, 0.6, 1.7, outerStoneMaterial, 0, topY, F + 0.85);
  addBox(blockHalf * 2 + 0.3, 0.3, 1.0, outerStoneMaterial, 0, topY - 0.55, F + 0.5, T);

  [-1, 1].forEach(function (s) {
    addWindow(s * 5.9, 1.5, faceZ, 2.2, 3.0);
    const upperTop = Math.min(topY - 3.8, 12.5);
    addWindow(s * 5.9, 6.4, faceZ, 2.0, Math.max(2, upperTop - 6.4));
  });
  addPanel(0, 8.0, topY - 2.4, 4.6, faceZ);

  const pedBase = topY + 0.3;
  addGable(9.0, pedH, 1.5, 0, F + 0.2, pedBase, outerStoneMaterial);
  addGable(8.0, pedH - 0.65, 1.6, 0, F + 0.2, pedBase, outerBrickMaterial);
  [-2.2, 0, 2.2].forEach(function (x) {
    addBox(0.14, 1.5, 0.05, darkStoneMaterial, x, pedBase + 0.95, F + 1.83, T);
  });

  [-1, 1].forEach(function (s) {
    const px = s * 9.7;
    addBox(1.5, topY + 1.2, 1.1, outerBrickMaterial, px, (topY + 1.2) / 2, F + 0.55);
    addBox(1.9, 0.4, 1.4, outerStoneMaterial, px, topY + 1.4, F + 0.7);
    addSpire(px, topY + 1.6, F + 0.7, 0.62, 4.4);
  });
  addSpire(0, pedBase + pedH - 0.3, F + 0.85, 0.42, 2.8);

  [-1, 1].forEach(function (s) {
    addColumn(s * 8.1, F + 1.4, terraceY, topY - 0.35 - terraceY, 0.45);
  });


  // ---------- the porch over the entrance ----------

  const deckTop = terraceY + 0.25;
  const porchColH = 4.2;
  const porchBeamY = deckTop + porchColH + 0.25;
  addBox(8.2, 0.25, 5.8, outerStoneMaterial, 0, terraceY + 0.125, F + 2.9);
  addBox(7.4, 0.12, 0.8, outerStoneMaterial, 0, terraceY + 0.06, F + 6.2);

  [-1, 1].forEach(function (s) {
    addBox(0.5, 3.6, 0.14, doorFrameMaterial, s * (doorwayHalfW + 0.25), deckTop + 1.8, F + 0.67);
  });
  addBox(doorwayHalfW * 2, deckTop + 3.6 - (entranceY + doorwayH), 0.14, doorFrameMaterial, 0,
    (entranceY + doorwayH + deckTop + 3.6) / 2, F + 0.67);

  [-1, 1].forEach(function (s) {
    const hingeX = s * 1.375;
    const hingeZ = F + 0.82;
    const leaf = new THREE.Group();
    leaf.position.set(hingeX, deckTop, hingeZ);
    scene.add(leaf);

    function part(w, h, d, material, x, y, z) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x - hingeX, y - deckTop, z - hingeZ);
      mesh.userData.noShadow = true;
      leaf.add(mesh);
    }

    part(1.35, 3.3, 0.12, doorMaterial, s * 0.7, deckTop + 1.65, F + 0.82);
    part(0.8, 1.8, 0.06, doorGlassMaterial, s * 0.7, deckTop + 2.2, F + 0.9);
    part(0.05, 1.8, 0.08, windowBarMaterial, s * 0.7, deckTop + 2.2, F + 0.92);
    part(0.8, 0.05, 0.08, windowBarMaterial, s * 0.7, deckTop + 2.2, F + 0.92);
    part(0.05, 0.22, 0.06, outerStoneMaterial, s * 0.12, deckTop + 1.6, F + 0.92);

    animatedDoors.mainDoorLeaves.push({ group: leaf, openAngle: s * 1.75 });
  });

  [-1, 1].forEach(function (s) {
    addColumn(s * 3.3, F + 5.2, deckTop, porchColH, 0.3);
    addColumn(s * 3.3, F + 1.4, deckTop, porchColH, 0.3);
  });
  addBox(8.4, 0.5, 6.0, outerStoneMaterial, 0, porchBeamY, F + 3.0);
  const porchRoofBase = porchBeamY + 0.25;
  addGable(4.4, 1.5, 6.1, 0, F + 0.1, porchRoofBase, slateMaterial);
  addGable(4.1, 1.4, 0.45, 0, F + 5.7, porchRoofBase, outerStoneMaterial);
  addGable(3.5, 1.0, 0.55, 0, F + 5.7, porchRoofBase, outerBrickMaterial);


  // ---------- the two wings ----------

  const windowRows = [];
  for (let wy = 1.5; wy + 2.6 <= wingTop - 0.6; wy += 3.9) windowRows.push(wy);

  [-1, 1].forEach(function (s) {
    const x1 = blockHalf;
    const len = wingOuterX - x1;
    const cx = s * (x1 + wingOuterX) / 2;

    addBox(len, wingTop, wingDepth, outerBrickMaterial, cx, wingTop / 2, F - wingDepth / 2);
    addBox(len + 0.3, 0.55, wingDepth + 0.7, outerStoneMaterial, cx + s * 0.15, wingTop + 0.1, F - wingDepth / 2 + 0.35);
    const roofBaseY = wingTop + 0.375;

    if (windowRows.length > 1) addBox(len, 0.3, 0.3, outerStoneMaterial, cx, windowRows[0] + 2.6 + 0.65, F + 0.08, T);

    const xa = s > 0 ? x1 : -wingOuterX;
    const xb = s > 0 ? wingOuterX : -x1;
    prismAlongX([[1.0, 0], [wingDepth - 0.1, 0], [wingDepth - 2.0, mansardH], [3.4, mansardH]], xa, xb, F, roofBaseY, slateMaterial);

    [14.4, 18.0, 21.6].forEach(function (px) {
      addBox(0.35, wingTop, 0.2, outerStoneMaterial, s * px, wingTop / 2, F + 0.08, T);
    });

    [12.6, 16.2, 19.8, 23.4].forEach(function (ax) {
      const x = s * ax;

      windowRows.forEach(function (wy) { addWindow(x, wy, F, 1.5, 2.6); });

      addBox(1.8, 1.9, 1.5, outerBrickMaterial, x, roofBaseY + 0.95, F - 0.65);
      addBox(2.0, 0.2, 1.7, outerStoneMaterial, x, roofBaseY + 1.95, F - 0.65, T);
      [-0.65, 0, 0.65].forEach(function (mx) {
        addBox(0.45, 0.4, 0.5, outerBrickMaterial, x + mx, roofBaseY + 2.25, F - 0.05, T);
      });
      addBox(1.3, 1.5, 0.08, outerStoneMaterial, x, roofBaseY + 0.95, F + 0.12, T);
      addBox(1.05, 1.25, 0.1, doorGlassMaterial, x, roofBaseY + 0.95, F + 0.14, T);
      addBox(0.05, 1.25, 0.12, windowBarMaterial, x, roofBaseY + 0.95, F + 0.16, T);
    });
  });


  // ---------- iron fence along the front edge of the terrace ----------

  addIronFence(3.4, wingOuterX - 0.3, F + terraceDepth - 0.4, 1.5);
  addIronFence(-(wingOuterX - 0.3), -3.4, F + terraceDepth - 0.4, 1.5);

  [-1, 1].forEach(function (s) {
    addBox(0.34, 0.1, 0.34, lampBodyMaterial, s * 3.4, terraceY + 1.8, F + terraceDepth - 0.4, T);
    addBox(0.26, 0.38, 0.26, lampGlowMaterial, s * 3.4, terraceY + 2.04, F + terraceDepth - 0.4, T);
    addBox(0.34, 0.08, 0.34, lampBodyMaterial, s * 3.4, terraceY + 2.28, F + terraceDepth - 0.4, T);
  });


  // ---------- the courtyard wall, with curves rising toward the gate ----------

  const wallStartX = 4.6;
  const wallEndX = 23.9;
  const wallHigh = 2.5;
  const wallLow = 1.35;
  const capH = 0.14;

  [-1, 1].forEach(function (s) {

    const body = new THREE.Shape();
    body.moveTo(s * wallStartX, 0);
    body.lineTo(s * wallStartX, wallHigh - capH);
    body.bezierCurveTo(s * (wallStartX + 2.4), wallHigh - capH, s * (wallStartX + 2.0), wallLow - capH, s * (wallStartX + 4.4), wallLow - capH);
    body.lineTo(s * wallEndX, wallLow - capH);
    body.lineTo(s * wallEndX, 0);
    body.closePath();
    const bodyMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(body, { depth: 0.8, bevelEnabled: false }), outerBrickMaterial);
    bodyMesh.position.z = gateZ - 0.4;
    scene.add(bodyMesh);

    const cap = new THREE.Shape();
    cap.moveTo(s * wallStartX, wallHigh - capH);
    cap.lineTo(s * wallStartX, wallHigh);
    cap.bezierCurveTo(s * (wallStartX + 2.4), wallHigh, s * (wallStartX + 2.0), wallLow, s * (wallStartX + 4.4), wallLow);
    cap.lineTo(s * wallEndX, wallLow);
    cap.lineTo(s * wallEndX, wallLow - capH);
    cap.lineTo(s * (wallStartX + 4.4), wallLow - capH);
    cap.bezierCurveTo(s * (wallStartX + 2.0), wallLow - capH, s * (wallStartX + 2.4), wallHigh - capH, s * wallStartX, wallHigh - capH);
    cap.closePath();
    const capMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(cap, { depth: 1.0, bevelEnabled: false }), outerStoneMaterial);
    capMesh.position.z = gateZ - 0.5;
    scene.add(capMesh);

    [14, wallEndX].forEach(function (px) {
      addBox(0.9, 2.1, 0.95, outerBrickMaterial, s * px, 1.05, gateZ);
      addBox(1.15, 0.2, 1.2, outerStoneMaterial, s * px, 2.2, gateZ);
      addBox(0.5, 0.35, 0.5, outerStoneMaterial, s * px, 2.47, gateZ);
    });

    const sideStart = F + terraceDepth;
    const sideLen = gateZ - sideStart;
    addBox(0.7, 1.3, sideLen, outerBrickMaterial, s * (wingOuterX - 0.35), 0.65, sideStart + sideLen / 2);
    addBox(0.95, 0.14, sideLen, outerStoneMaterial, s * (wingOuterX - 0.35), 1.37, sideStart + sideLen / 2);

    const cutSize = 4.5;
    const cornerA = { x: s * (wingOuterX - 0.35), z: gateZ - cutSize };
    const cornerB = { x: s * (wingOuterX - 0.35 - cutSize), z: gateZ };
    const dx = cornerB.x - cornerA.x, dz = cornerB.z - cornerA.z;
    const diagLen = Math.hypot(dx, dz);
    const diagAngle = Math.atan2(-dz, dx);
    const diagWall = addBox(diagLen, 1.3, 0.7, outerBrickMaterial, (cornerA.x + cornerB.x) / 2, 0.65, (cornerA.z + cornerB.z) / 2);
    diagWall.rotation.y = diagAngle;
    const diagCap = addBox(diagLen, 0.14, 0.95, outerStoneMaterial, (cornerA.x + cornerB.x) / 2, 1.37, (cornerA.z + cornerB.z) / 2);
    diagCap.rotation.y = diagAngle;
  });


  // ---------- the gate ----------

  [-1, 1].forEach(function (s) {
    addColumn(s * 2.7, gateZ, 0, 4.4, 0.32);
    addColumn(s * 4.3, gateZ, 0, 4.4, 0.32);
  });

  addBox(10.2, 0.8, 1.5, outerStoneMaterial, 0, 4.8, gateZ);
  addBox(10.6, 0.25, 1.7, outerStoneMaterial, 0, 5.325, gateZ);
  addBox(5.2, 1.05, 1.1, outerBrickMaterial, 0, 5.975, gateZ);

  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1024;
  signCanvas.height = 220;
  const ctx = signCanvas.getContext('2d');
  ctx.fillStyle = '#cfc3b0';
  ctx.fillRect(0, 0, 1024, 220);
  ctx.font = 'bold 190px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f1ead9';
  ctx.fillText('R.P.D.', 518, 118);
  ctx.fillStyle = '#7a6f5b';
  ctx.fillText('R.P.D.', 512, 112);
  const signTexture = new THREE.CanvasTexture(signCanvas);
  signTexture.colorSpace = THREE.SRGBColorSpace;
  signTexture.anisotropy = 8;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 5.0 * 220 / 1024), new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.85 }));
  sign.position.set(0, 5.975, gateZ + 0.56);
  sign.userData.noShadow = true;
  scene.add(sign);

  [-1, 1].forEach(function (s) {
    const leaf = new THREE.Group();
    leaf.position.set(s * 2.38, 0, gateZ);
    animatedDoors.gateLeaves.push({ group: leaf, openAngle: -s * 1.15 });

    const dir = -s;
    const w = 2.25;

    function part(geometry, x, y) {
      const mesh = new THREE.Mesh(geometry, ironMaterial);
      mesh.position.set(dir * x, y, 0);
      mesh.userData.noShadow = true;
      leaf.add(mesh);
    }

    part(new THREE.BoxGeometry(w, 0.09, 0.09), w / 2, 3.9);
    part(new THREE.BoxGeometry(w, 0.09, 0.09), w / 2, 0.45);
    part(new THREE.BoxGeometry(0.1, 3.55, 0.1), 0.05, 2.17);
    part(new THREE.BoxGeometry(0.1, 3.55, 0.1), w - 0.05, 2.17);

    const bars = 9;
    for (let i = 1; i < bars; i++) {
      const x = w * i / bars;
      part(new THREE.BoxGeometry(0.035, 3.45, 0.035), x, 2.17);
      part(new THREE.ConeGeometry(0.06, 0.22, 4), x, 4.0);
    }
    scene.add(leaf);
  });

})();