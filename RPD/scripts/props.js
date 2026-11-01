// ---------- TRINKETS & DOODADS ----------

(function addTrinkets() {

  const SWITCHES = {
    screens: true,
    sofas: true,
    plants: true,
    crates: true,
    flags: true,
    wallDecor: true,
    deskStuff: true,
    tableStuff: true,
    chairs: true,
    floorDebris: true
  };
  const BANNER_PICTURE = '';
  const LAMP_LIGHTS = false;


  // ---------- helpers ----------

  function seeded(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function gbox(g, w, h, d, material, x, y, z, shadow) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    if (!shadow) mesh.userData.noShadow = true;
    g.add(mesh);
    return mesh;
  }

  function gcyl(g, radiusTop, radiusBottom, h, material, x, y, z, sides, shadow) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, h, sides || 12), material);
    mesh.position.set(x, y, z);
    if (!shadow) mesh.userData.noShadow = true;
    g.add(mesh);
    return mesh;
  }

  function put(g, x, y, z, turn) {
    g.position.set(x, y, z);
    g.rotation.y = turn || 0;
    scene.add(g);
    return g;
  }

  function makeTexture(w, h, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }


  // ---------- materials ----------

  const leatherMaterial = solid(0x4b2a1d, { roughness: 0.4 });
  const leatherLightMaterial = solid(0x5c3424, { roughness: 0.35 });
  const leatherButtonMaterial = solid(0x23100a, { roughness: 0.6 });
  const darkWoodMaterial = solid(0x2e1d14, { roughness: 0.7 });
  const screenPanelMaterial = solid(0x7f95a6, { roughness: 0.65 });
  const screenPanelWornMaterial = solid(0x73898a, { roughness: 0.75 });
  const screenFrameMaterial = shinyMetal(0x59646d, 0xaaaaaa, 60);
  const potMaterial = solid(0x8a5a3c, { roughness: 0.85 });
  const soilMaterial = solid(0x2a1f16, { roughness: 1 });
  const leafMaterial = solid(0x3d6b3a, { roughness: 0.8, side: THREE.DoubleSide });
  const leafDarkMaterial = solid(0x2d5230, { roughness: 0.8, side: THREE.DoubleSide });
  const trunkMaterial = solid(0x6a5a3e, { roughness: 0.9 });
  const crateGreenMaterial = solid(0x4f6f5a, { roughness: 0.75 });
  const crateGreenDarkMaterial = solid(0x3b5646, { roughness: 0.8 });
  const yellowBoxMaterial = solid(0xc9a24f, { roughness: 0.9 });
  const paperMaterial = solid(0xece6d2, { roughness: 0.95 });
  const paperYellowMaterial = solid(0xe6d58a, { roughness: 0.95 });
  const redMaterial = solid(0xa32a22, { roughness: 0.5 });
  const whiteMaterial = solid(0xe9e6dc, { roughness: 0.5 });
  const blackMaterial = solid(0x16161a, { roughness: 0.5 });
  const brassMaterial = shinyMetal(0xb08a3a, 0xffeeaa, 80);
  const beigeMaterial = solid(0xcfc6ad, { roughness: 0.6 });
  const monitorGlowMaterial = solid(0x16231c, { emissive: 0x1b4a2a, emissiveIntensity: 0.4 });
  const bottleMaterial = solid(0x4d7a4a, { transparent: true, opacity: 0.75, roughness: 0.2 });
  const waterBottleMaterial = solid(0x8ec6e8, { transparent: true, opacity: 0.55, roughness: 0.15 });
  const glassShardMaterial = solid(0xcfe8ee, { transparent: true, opacity: 0.4, roughness: 0.1 });
  const corkMaterial = solid(0x9b7648, { roughness: 1 });
  const boardFrameMaterial = solid(0x4a3426, { roughness: 0.7 });
  const jacketMaterial = solid(0x30402f, { roughness: 0.95 });


  // ---------- folding partitions ----------

  function addScreen(x, y, z, turn, panels, angle) {
    const g = new THREE.Group();
    const w = 0.95;
    let px = 0, pz = 0;
    const bend = angle || 0.5;

    for (let i = 0; i < panels; i++) {
      const a = (i % 2 ? 1 : -1) * bend;
      const panel = new THREE.Group();
      panel.rotation.y = -a;
      panel.position.set(px + Math.cos(a) * w / 2, 0, pz + Math.sin(a) * w / 2);

      gbox(panel, w - 0.04, 1.6, 0.03, i % 3 === 1 ? screenPanelWornMaterial : screenPanelMaterial, 0, 0.9, 0, true);
      gbox(panel, w, 0.05, 0.06, screenFrameMaterial, 0, 1.72, 0);
      gbox(panel, w, 0.05, 0.06, screenFrameMaterial, 0, 0.1, 0);
      [-1, 1].forEach(function (s) {
        gbox(panel, 0.04, 1.64, 0.06, screenFrameMaterial, s * w / 2, 0.92, 0);
        gbox(panel, 0.05, 0.1, 0.38, screenFrameMaterial, s * w / 2 * 0.92, 0.05, 0);
      });
      gbox(panel, 0.05, 0.5 + seeded(i + 1) * 0.5, 0.035, screenPanelWornMaterial, (seeded(i + 9) - 0.5) * 0.5, 1.2, 0);

      g.add(panel);
      px += Math.cos(a) * w;
      pz += Math.sin(a) * w;
    }
    return put(g, x, y, z, turn);
  }


  // ---------- leather sofa ----------

  function addSofa(x, y, z, turn, len) {
    len = len || 2.3;
    const g = new THREE.Group();

    gbox(g, len, 0.36, 0.95, leatherMaterial, 0, 0.38, 0, true);
    gbox(g, len - 0.5, 0.16, 0.78, leatherLightMaterial, 0, 0.64, 0.07, true);
    gbox(g, len, 0.78, 0.24, leatherMaterial, 0, 0.95, -0.36, true);
    gbox(g, len + 0.04, 0.1, 0.28, leatherLightMaterial, 0, 1.36, -0.36);
    [-1, 1].forEach(function (s) {
      gbox(g, 0.24, 0.55, 0.95, leatherMaterial, s * (len / 2 - 0.12), 0.75, 0, true);
      gbox(g, 0.28, 0.08, 0.99, leatherLightMaterial, s * (len / 2 - 0.12), 1.04, 0);
      [-1, 1].forEach(function (b) {
        gbox(g, 0.08, 0.2, 0.08, darkWoodMaterial, s * (len / 2 - 0.1), 0.1, b * 0.4);
      });
    });

    const cols = Math.max(4, Math.round(len * 2.6));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < cols; c++) {
        const bx = -len / 2 + 0.45 + c * (len - 0.9) / (cols - 1);
        gbox(g, 0.05, 0.05, 0.03, leatherButtonMaterial, bx, 0.78 + r * 0.22, -0.235);
      }
    }
    for (let c = 0; c < cols; c++) {
      const bx = -len / 2 + 0.45 + c * (len - 0.9) / (cols - 1);
      gbox(g, 0.012, 0.62, 0.02, leatherButtonMaterial, bx, 0.98, -0.238);
    }
    return put(g, x, y, z, turn);
  }

  function addCoffeeTable(x, y, z, turn) {
    const g = new THREE.Group();
    gbox(g, 1.15, 0.06, 0.62, darkWoodMaterial, 0, 0.46, 0, true);
    gbox(g, 1.0, 0.04, 0.5, trimMaterial, 0, 0.2, 0);
    [-1, 1].forEach(function (a) {
      [-1, 1].forEach(function (b) { gbox(g, 0.06, 0.44, 0.06, darkWoodMaterial, a * 0.52, 0.22, b * 0.26); });
    });
    gbox(g, 0.3, 0.02, 0.22, paperYellowMaterial, -0.3, 0.5, 0.05).rotation.y = 0.3;
    gbox(g, 0.28, 0.02, 0.2, redMaterial, -0.28, 0.52, 0.04).rotation.y = -0.2;
    gcyl(g, 0.045, 0.04, 0.09, whiteMaterial, 0.15, 0.53, -0.12, 12);
    gcyl(g, 0.045, 0.04, 0.09, redMaterial, 0.35, 0.53, 0.1, 12);
    gcyl(g, 0.09, 0.09, 0.025, blackMaterial, 0.05, 0.5, 0.15, 14);
    gcyl(g, 0.03, 0.03, 0.08, whiteMaterial, 0.05, 0.55, 0.15, 10);
    gcyl(g, 0.035, 0.035, 0.05, brassMaterial, 0.05, 0.5, 0.15, 8);
    return put(g, x, y, z, turn);
  }


  // ---------- potted plants ----------

  function addPlant(x, y, z, s, kind, seed) {
    const g = new THREE.Group();
    seed = seed || 0;

    gcyl(g, 0.25, 0.18, 0.42, potMaterial, 0, 0.21, 0, 14, true);
    gcyl(g, 0.27, 0.27, 0.05, potMaterial, 0, 0.42, 0, 14);
    gcyl(g, 0.22, 0.22, 0.03, soilMaterial, 0, 0.43, 0, 12);

    const palm = kind === 'palm';
    const fronds = palm ? 10 : 15;
    const baseY = palm ? 1.35 : 0.45;

    if (palm) gcyl(g, 0.035, 0.06, 0.95, trunkMaterial, 0, 0.9, 0, 8);

    for (let i = 0; i < fronds; i++) {
      const r1 = seeded(i + seed * 13 + 1), r2 = seeded(i + seed * 13 + 5), r3 = seeded(i + seed * 13 + 9);
      const pivot = new THREE.Group();
      pivot.rotation.y = i * Math.PI * 2 / fronds + r1 * 0.5;
      pivot.position.y = baseY;

      const tilt = new THREE.Group();
      tilt.rotation.x = palm ? -(0.15 + r2 * 0.9) : -(0.35 + r2 * 0.8);
      pivot.add(tilt);

      const length = (palm ? 1.0 : 0.75) + r3 * 0.45;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 5), i % 2 ? leafMaterial : leafDarkMaterial);
      leaf.scale.set(palm ? 0.2 : 0.14, 0.03, length);
      leaf.position.z = length / 2;
      leaf.userData.noShadow = true;
      tilt.add(leaf);

      g.add(pivot);
    }
    g.scale.setScalar(s || 1);
    return put(g, x, y, z, seed);
  }


  // ---------- crates and boxes ----------

  function addGreenCrate(x, y, z, turn, w, h, d) {
    const g = new THREE.Group();
    gbox(g, w, h, d, crateGreenMaterial, 0, h / 2, 0, true);
    gbox(g, w + 0.04, 0.06, d + 0.04, crateGreenDarkMaterial, 0, h - 0.03, 0);
    gbox(g, w + 0.04, 0.05, d + 0.04, crateGreenDarkMaterial, 0, 0.025, 0);
    gbox(g, 0.1, h * 0.5, 0.03, blackMaterial, 0, h * 0.55, d / 2 + 0.01);
    gbox(g, 0.18, 0.1, 0.04, brassMaterial, 0, h * 0.5, d / 2 + 0.02);
    return put(g, x, y, z, turn);
  }

  function addYellowBox(x, y, z, turn, w, h, d) {
    const g = new THREE.Group();
    gbox(g, w, h, d, yellowBoxMaterial, 0, h / 2, 0, true);
    gbox(g, w + 0.01, 0.03, d + 0.01, cardboardMaterial, 0, h - 0.015, 0);
    gbox(g, 0.12, h * 0.9, d + 0.012, cardboardMaterial, 0, h / 2, 0);
    return put(g, x, y, z, turn);
  }


  // ---------- chairs, lamp, coat rack, water cooler, bin, extinguisher ----------

  function addChair(x, y, z, turn) {
    const g = new THREE.Group();
    gbox(g, 0.44, 0.04, 0.44, screenFrameMaterial, 0, 0.46, 0, true);
    gbox(g, 0.44, 0.38, 0.03, screenFrameMaterial, 0, 0.72, -0.21);
    [-1, 1].forEach(function (a) {
      [-1, 1].forEach(function (b) { gbox(g, 0.03, 0.46, 0.03, blackMaterial, a * 0.19, 0.23, b * 0.19); });
    });
    return put(g, x, y, z, turn);
  }

  function addFloorLamp(x, y, z) {
    const g = new THREE.Group();
    gcyl(g, 0.2, 0.22, 0.04, lampBodyMaterial, 0, 0.02, 0, 14);
    gcyl(g, 0.02, 0.02, 1.5, lampBodyMaterial, 0, 0.78, 0, 8);
    const shade = gcyl(g, 0.15, 0.3, 0.38, lampGlowMaterial, 0, 1.65, 0, 14);
    put(g, x, y, z, 0);
    if (LAMP_LIGHTS && typeof sconceSpots !== 'undefined') sconceSpots.push({ x: x, y: y + 1.5, z: z });
    return g;
  }

  function addCoatRack(x, y, z, turn) {
    const g = new THREE.Group();
    gcyl(g, 0.24, 0.26, 0.05, darkWoodMaterial, 0, 0.025, 0, 12);
    gcyl(g, 0.03, 0.035, 1.8, darkWoodMaterial, 0, 0.9, 0, 8);
    for (let i = 0; i < 4; i++) {
      const arm = gbox(g, 0.3, 0.03, 0.03, darkWoodMaterial, 0, 1.75, 0);
      arm.rotation.y = i * Math.PI / 2 + 0.4;
      arm.position.set(Math.cos(i * Math.PI / 2 + 0.4) * 0.12, 1.75, -Math.sin(i * Math.PI / 2 + 0.4) * 0.12);
    }
    gbox(g, 0.42, 0.78, 0.14, jacketMaterial, 0.16, 1.32, 0.05).rotation.z = 0.08;
    gbox(g, 0.26, 0.2, 0.1, leatherMaterial, -0.14, 1.62, -0.06);
    return put(g, x, y, z, turn);
  }

  function addWaterCooler(x, y, z, turn) {
    const g = new THREE.Group();
    gbox(g, 0.36, 0.95, 0.36, whiteMaterial, 0, 0.475, 0, true);
    gbox(g, 0.1, 0.05, 0.04, blueTap(), -0.08, 0.7, 0.19);
    gbox(g, 0.1, 0.05, 0.04, redMaterial, 0.08, 0.7, 0.19);
    gcyl(g, 0.15, 0.15, 0.45, waterBottleMaterial, 0, 1.2, 0, 14);
    gcyl(g, 0.06, 0.15, 0.08, waterBottleMaterial, 0, 1.46, 0, 14);
    return put(g, x, y, z, turn);
  }
  function blueTap() { return solid(0x2b5f8c, { roughness: 0.4 }); }

  function addBin(x, y, z) {
    const g = new THREE.Group();
    gcyl(g, 0.22, 0.18, 0.55, screenFrameMaterial, 0, 0.275, 0, 14, true);
    gcyl(g, 0.23, 0.23, 0.03, blackMaterial, 0, 0.55, 0, 14);
    gbox(g, 0.18, 0.02, 0.14, paperMaterial, 0.1, 0.58, 0.05).rotation.set(0.2, 0.4, 0.3);
    return put(g, x, y, z, 0);
  }

  function addExtinguisher(side, z, y) {
    const g = new THREE.Group();
    gcyl(g, 0.09, 0.09, 0.5, redMaterial, 0, 0.25, 0, 14);
    gcyl(g, 0.045, 0.09, 0.08, redMaterial, 0, 0.54, 0, 14);
    gcyl(g, 0.025, 0.025, 0.1, blackMaterial, 0, 0.63, 0, 8);
    gbox(g, 0.16, 0.03, 0.03, blackMaterial, 0.03, 0.66, 0);
    gbox(g, 0.2, 0.04, 0.2, blackMaterial, 0, 0.35, 0.0).scale.set(1, 0.4, 1);
    return put(g, side * (pierX - 0.45 - 0.12), y + 1.0, z, 0);
  }


  // ---------- wall decorations ----------

  function wallGroup(side, z, y) {
    const g = new THREE.Group();
    g.position.set(side * (lowerWallFace - 0.01), y, z);
    g.rotation.y = -side * Math.PI / 2;
    scene.add(g);
    return g;
  }

  function addNoticeBoard(side, z, y) {
    const g = wallGroup(side, z, y);
    gbox(g, 1.75, 1.25, 0.06, boardFrameMaterial, 0, 0, 0.03);
    gbox(g, 1.6, 1.1, 0.04, corkMaterial, 0, 0, 0.065);
    const colours = [paperMaterial, paperYellowMaterial, solid(0xc6dce4), paperMaterial, solid(0xe8b8b0), paperYellowMaterial];
    for (let i = 0; i < 11; i++) {
      const nx = -0.65 + seeded(i + 40) * 1.3;
      const ny = -0.4 + seeded(i + 60) * 0.8;
      const note = gbox(g, 0.2 + seeded(i + 2) * 0.12, 0.26 + seeded(i + 7) * 0.12, 0.01, colours[i % colours.length], nx, ny, 0.09 + i * 0.0008);
      note.rotation.z = (seeded(i + 20) - 0.5) * 0.5;
      gbox(g, 0.03, 0.03, 0.03, redMaterial, nx, ny + 0.08, 0.1 + i * 0.0008);
    }
    const string = gbox(g, 0.9, 0.006, 0.006, redMaterial, 0.1, 0.1, 0.1);
    string.rotation.z = 0.25;
    return g;
  }

  function addWallClock(side, z, y) {
    const g = wallGroup(side, z, y);
    const rim = gcyl(g, 0.36, 0.36, 0.08, brassMaterial, 0, 0, 0.04, 28);
    rim.rotation.x = Math.PI / 2;
    const face = gcyl(g, 0.31, 0.31, 0.09, clockFaceMaterial, 0, 0, 0.05, 28);
    face.rotation.x = Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const tick = gbox(g, 0.025, i % 3 === 0 ? 0.08 : 0.04, 0.01, blackMaterial, Math.sin(a) * 0.26, Math.cos(a) * 0.26, 0.1);
      tick.rotation.z = -a;
    }
    gbox(g, 0.02, 0.2, 0.012, blackMaterial, 0.03, 0.08, 0.108).rotation.z = -0.3;
    gbox(g, 0.016, 0.26, 0.012, blackMaterial, -0.06, -0.02, 0.112).rotation.z = 1.1;
    return g;
  }

  function addPainting(side, z, y, w, h, texture) {
    const g = wallGroup(side, z, y);
    gbox(g, w + 0.2, h + 0.2, 0.08, boardFrameMaterial, 0, 0, 0.04);
    gbox(g, w + 0.08, h + 0.08, 0.02, brassMaterial, 0, 0, 0.085);
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }));
    picture.position.z = 0.1;
    picture.userData.noShadow = true;
    g.add(picture);
    gbox(g, w * 0.5, 0.04, 0.12, brassMaterial, 0, h / 2 + 0.18, 0.12);
    return g;
  }

  function addPlaque(side, z, y) {
    const g = wallGroup(side, z, y);
    gbox(g, 0.7, 0.45, 0.04, boardFrameMaterial, 0, 0, 0.02);
    gbox(g, 0.6, 0.35, 0.02, brassMaterial, 0, 0, 0.045);
    for (let i = 0; i < 4; i++) gbox(g, 0.4 - i * 0.04, 0.025, 0.01, darkWoodMaterial, 0, 0.1 - i * 0.07, 0.06);
    return g;
  }


  // ---------- hanging flag and banner ----------

  function drape(mesh, h, amount) {
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const down = (h / 2 - y) / h;
      pos.setZ(i, Math.sin(y * 3.1 + x * 2.2) * amount * down);
    }
    mesh.geometry.computeVertexNormals();
  }

  function addHangingFlag(side, texture, w, h, cutOut) {
    const faceX = deskPillarX - deskPillarSize / 2 - 0.075;
    const gap = 0.2;
    const hangTop = 10.62;
    const barY = hangTop + 0.06;
    const z = deskPillarZ - 0.2;

    const flagCenterX = faceX - gap - w / 2;
    const barEndX = flagCenterX - w / 2 - 0.15;
    const barCenterX = (faceX + barEndX) / 2;

    addBox(0.12, 0.45, 0.3, ironMaterial, side * faceX, barY - 0.1, z, true);
    addBox(Math.abs(faceX - barEndX), 0.06, 0.06, ironMaterial, side * barCenterX, barY, z, true);
    addBeam(new THREE.Vector3(side * faceX, barY - 0.95, z), new THREE.Vector3(side * (faceX - 0.8), barY - 0.03, z), 0.06, ironMaterial);
    addBox(0.1, 0.1, 0.1, brassMaterial, side * barEndX, barY, z, true);

    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h, 10, 24),
      new THREE.MeshStandardMaterial({
        map: texture, roughness: 0.9, side: THREE.DoubleSide,
        transparent: !!cutOut, alphaTest: cutOut ? 0.5 : 0
      })
    );
    flag.position.set(side * flagCenterX, hangTop - h / 2, z);
    drape(flag, h, 0.1);
    flag.userData.noShadow = true;
    scene.add(flag);
    return flag;
  }

  const flagTexture = makeTexture(280, 520, function (c, w, h) {
    const stripe = h / 13;
    for (let i = 0; i < 13; i++) {
      c.fillStyle = i % 2 === 0 ? '#b22234' : '#f3f1ea';
      c.fillRect(0, i * stripe, w, stripe + 1);
    }
    c.fillStyle = '#3c3b6e';
    c.fillRect(0, 0, w * 0.5, stripe * 7);
    c.fillStyle = '#f3f1ea';
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        c.beginPath();
        c.arc(14 + col * 27, 16 + r * 36, 4.5, 0, Math.PI * 2);
        c.fill();
      }
    }
  });

  const bannerTexture = makeTexture(260, 600, function (c, w, h) {
    const gold = '#c9a24a';
    c.fillStyle = '#101216';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#b8913c';
    c.lineWidth = 8;
    c.strokeRect(10, 10, w - 20, h - 20);
    c.lineWidth = 3;
    c.strokeRect(24, 24, w - 48, h - 48);

    function shieldPath(s) {
      c.beginPath();
      c.moveTo(-90 * s, -112 * s);
      c.lineTo(-45 * s, -134 * s);
      c.lineTo(0, -118 * s);
      c.lineTo(45 * s, -134 * s);
      c.lineTo(90 * s, -112 * s);
      c.lineTo(90 * s, 15 * s);
      c.quadraticCurveTo(90 * s, 105 * s, 0, 150 * s);
      c.quadraticCurveTo(-90 * s, 105 * s, -90 * s, 15 * s);
      c.closePath();
    }

    c.save();
    c.translate(w / 2, 250);

    shieldPath(1);
    c.fillStyle = gold;
    c.fill();
    shieldPath(0.9);
    c.fillStyle = '#181b21';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = gold;
    c.stroke();

    c.strokeStyle = gold;
    c.lineWidth = 5;
    c.beginPath(); c.arc(0, 18, 50, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 2;
    c.beginPath(); c.arc(0, 18, 41, 0, Math.PI * 2); c.stroke();
    c.fillStyle = gold;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 15 : 37;
      const a = i * Math.PI / 5 - Math.PI / 2;
      c.lineTo(Math.cos(a) * r, 18 + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 27px Georgia, serif';
    c.fillText('POLICE', 0, -82);
    c.font = 'bold 14px Georgia, serif';
    c.fillText('DEPARTMENT', 0, 100);

    c.restore();

    c.fillStyle = gold;
    for (let k = 0; k < 3; k++) c.fillRect(70, 440 + k * 30, w - 140, 7);

    c.globalCompositeOperation = 'destination-out';
    c.beginPath();
    c.moveTo(70, h);
    c.lineTo(w / 2, h - 90);
    c.lineTo(w - 70, h);
    c.closePath();
    c.fill();
  });

  const landscapeTexture = makeTexture(320, 220, function (c, w, h) {
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#6f8fb0');
    sky.addColorStop(1, '#e3c79a');
    c.fillStyle = sky;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#f2d98a';
    c.beginPath(); c.arc(240, 70, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#58705a';
    c.beginPath(); c.moveTo(0, 170); c.quadraticCurveTo(80, 100, 170, 160); c.quadraticCurveTo(250, 120, 320, 165); c.lineTo(320, h); c.lineTo(0, h); c.fill();
    c.fillStyle = '#3a4f3c';
    c.beginPath(); c.moveTo(0, 195); c.quadraticCurveTo(120, 150, 320, 200); c.lineTo(320, h); c.lineTo(0, h); c.fill();
  });

  const planTexture = makeTexture(240, 300, function (c, w, h) {
    c.fillStyle = '#1f3a56';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#8fb6d8';
    c.lineWidth = 3;
    c.strokeRect(20, 20, w - 40, h - 40);
    c.lineWidth = 2;
    c.strokeRect(40, 50, 70, 80);
    c.strokeRect(110, 50, 90, 50);
    c.strokeRect(110, 100, 90, 80);
    c.strokeRect(40, 130, 70, 120);
    c.strokeRect(110, 180, 90, 70);
    c.beginPath(); c.moveTo(40, 150); c.lineTo(200, 150); c.stroke();
    c.fillStyle = '#8fb6d8';
    for (let i = 0; i < 6; i++) c.fillRect(40, 270 + i * 0, 20 + i * 24, 3);
  });


  // ---------- hall level ----------

  if (SWITCHES.screens) {
    addScreen(-5.4, hallY, -5.1, 0, 4, 0.5);
    addScreen(2.1, hallY, -3.7, 0.1, 3, 0.5);
    addScreen(-5.9, hallY, 0.9, Math.PI / 2, 3, 0.45);
  }

  if (SWITCHES.sofas) {
    addSofa(-2.2, hallY, -3.4, 0, 2.3);
    addSofa(-2.2, hallY, -1.0, Math.PI, 2.3);
    addCoffeeTable(-2.2, hallY, -2.2, 0);
    addSofa(5.2, hallY, -0.2, -Math.PI / 2, 2.3);
  }

  if (SWITCHES.crates) {
    addGreenCrate(3.6, hallY, -2.0, 0.15, 0.95, 0.5, 0.7);
    addGreenCrate(4.7, hallY, -1.9, -0.25, 0.8, 0.45, 0.6);
    addGreenCrate(4.0, hallY + 0.5, -2.0, 0.4, 0.55, 0.35, 0.45);
    addYellowBox(1.4, hallY, -4.2, 0.3, 0.55, 0.5, 0.5);
    addYellowBox(1.45, hallY + 0.5, -4.2, -0.2, 0.5, 0.4, 0.45);
  }

  if (SWITCHES.plants) {
    addPlant(-3.9, hallY, -0.5, 1.0, 'palm', 1);
    addPlant(-0.9, hallY, -4.4, 0.95, 'fern', 2);
    addPlant(3.7, hallY + 0.85, -2.0, 0.85, 'fern', 3);
    addPlant(1.8, hallY, 1.3, 1.0, 'palm', 4);
    addPlant(-5.4, hallY, -2.8, 0.9, 'fern', 5);
  }

  if (SWITCHES.chairs) {
    addFloorLamp(-0.8, hallY, -0.7);
    addCoatRack(-5.3, hallY, 1.5, 0.5);
    addWaterCooler(5.5, hallY, -3.0, -Math.PI / 2);
    addBin(-5.7, hallY, 0.2);
    addBin(5.7, deskLevelY, 4.2);

    addChair(-4.6, hallY, 1.0, -Math.PI / 2 + 0.3);
    const side = new THREE.Group();
    gbox(side, 0.55, 0.04, 0.45, darkWoodMaterial, 0, 0.55, 0, true);
    [-1, 1].forEach(function (a) { [-1, 1].forEach(function (b) { gbox(side, 0.04, 0.54, 0.04, darkWoodMaterial, a * 0.24, 0.27, b * 0.19); }); });
    gbox(side, 0.34, 0.02, 0.24, blackMaterial, 0, 0.59, 0.05);
    gbox(side, 0.34, 0.24, 0.015, monitorGlowMaterial, 0, 0.72, -0.07).rotation.x = -0.15;
    put(side, -3.7, hallY, 1.1, 0);
  }


  // ---------- desk level ----------

  if (SWITCHES.chairs) {
    addChair(-1.0, deskLevelY, 7.7, Math.PI + 0.25);
    addChair(1.5, deskLevelY, 8.5, Math.PI - 0.5);
    addChair(-2.6, deskLevelY, 8.4, Math.PI + 0.9);
  }

  if (SWITCHES.plants) {
    addPlant(-4.6, deskLevelY, 8.2, 1.0, 'palm', 6);
    addPlant(5.1, deskLevelY, 7.2, 0.9, 'fern', 7);
    addPlant(-5.0, deskLevelY, 3.8, 0.8, 'fern', 8);
    addPlant(-5.2, entranceY, 12.8, 1.0, 'palm', 9);
    addPlant(5.2, entranceY, 12.8, 1.0, 'palm', 10);
  }

  if (SWITCHES.crates) {
    addYellowBox(4.8, deskLevelY, 9.0, 0.2, 0.9, 0.6, 0.7);
    addYellowBox(4.9, deskLevelY + 0.6, 9.0, -0.15, 0.8, 0.5, 0.6);
    addYellowBox(4.6, deskLevelY, 10.0, 0.5, 0.6, 0.45, 0.55);
    addGreenCrate(-4.4, deskLevelY, 5.0, 0.1, 1.0, 0.55, 0.75);
    addGreenCrate(-4.5, deskLevelY + 0.55, 5.0, -0.2, 0.7, 0.4, 0.55);
  }

  if (SWITCHES.deskStuff) {
    const d = new THREE.Group();
    const top = 1.05;

    gbox(d, 0.46, 0.38, 0.42, beigeMaterial, -0.5, top + 0.19, -0.02);
    gbox(d, 0.34, 0.26, 0.02, monitorGlowMaterial, -0.5, top + 0.2, -0.23);
    gbox(d, 0.2, 0.06, 0.2, beigeMaterial, -0.5, top + 0.03, 0.05);
    gbox(d, 0.42, 0.025, 0.14, beigeMaterial, -0.5, top + 0.0125, -0.4);

    gbox(d, 0.2, 0.08, 0.24, blackMaterial, 0.25, top + 0.04, -0.3);
    gbox(d, 0.22, 0.04, 0.06, blackMaterial, 0.25, top + 0.1, -0.3);

    gcyl(d, 0.04, 0.09, 0.07, brassMaterial, 0.1, top + 0.035, 0.38, 14);
    gcyl(d, 0.012, 0.012, 0.03, brassMaterial, 0.1, top + 0.085, 0.38, 8);

    gbox(d, 0.38, 0.08, 0.1, blackMaterial, -1.9, top + 0.04, 0.42);
    gbox(d, 0.3, 0.025, 0.012, brassMaterial, -1.9, top + 0.045, 0.475);

    gcyl(d, 0.045, 0.04, 0.1, whiteMaterial, 1.0, top + 0.05, -0.25, 12);
    gbox(d, 0.04, 0.05, 0.02, whiteMaterial, 1.06, top + 0.05, -0.25);
    gcyl(d, 0.05, 0.045, 0.11, redMaterial, 0.85, top + 0.055, 0.2, 12);
    for (let i = 0; i < 4; i++) gbox(d, 0.01, 0.12, 0.01, i % 2 ? blackMaterial : brassMaterial, 0.83 + i * 0.015, top + 0.15, 0.2 + (i % 2) * 0.01).rotation.z = (i - 1.5) * 0.12;

    for (let i = 0; i < 4; i++) {
      gbox(d, 0.34, 0.02, 0.24, i % 2 ? paperYellowMaterial : cardboardMaterial, -2.0 + (seeded(i) - 0.5) * 0.04, top + 0.01 + i * 0.022, -0.25).rotation.y = (seeded(i + 3) - 0.5) * 0.2;
    }
    gbox(d, 0.14, 0.04, 0.04, redMaterial, -1.6, top + 0.02, 0.3);

    gbox(d, 0.26, 0.15, 0.1, blackMaterial, 1.95, top + 0.075, -0.2);
    gcyl(d, 0.03, 0.03, 0.02, brassMaterial, 2.0, top + 0.08, -0.14, 10).rotation.x = Math.PI / 2;
    gbox(d, 0.01, 0.25, 0.01, screenFrameMaterial, 2.05, top + 0.25, -0.2).rotation.z = -0.25;

    put(d, 0, deskLevelY, deskZ, 0);
  }

  if (SWITCHES.tableStuff) {
    const left = new THREE.Group();
    gbox(left, 0.3, 0.14, 0.1, blackMaterial, -0.4, 0.89, -0.15);
    gbox(left, 0.01, 0.2, 0.01, screenFrameMaterial, -0.32, 1.0, -0.15).rotation.z = -0.2;
    gcyl(left, 0.045, 0.04, 0.1, whiteMaterial, 0.1, 0.87, 0.2, 12);
    gcyl(left, 0.05, 0.05, 0.28, screenFrameMaterial, 0.5, 0.96, -0.1, 12);
    gcyl(left, 0.052, 0.052, 0.04, redMaterial, 0.5, 1.12, -0.1, 12);
    for (let i = 0; i < 3; i++) gbox(left, 0.3, 0.012, 0.22, paperMaterial, -0.1, 0.83 + i * 0.014, 0.15).rotation.y = i * 0.25 - 0.2;
    put(left, -3.0, deskLevelY, 3.95, 0);

    const right = new THREE.Group();
    gbox(right, 0.3, 0.12, 0.2, whiteMaterial, -0.4, 0.88, 0.0);
    gbox(right, 0.18, 0.03, 0.01, redMaterial, -0.4, 0.89, 0.105);
    gbox(right, 0.03, 0.12, 0.01, redMaterial, -0.4, 0.89, 0.105);
    for (let i = 0; i < 4; i++) {
      gbox(right, 0.28 - i * 0.01, 0.045, 0.2, [redMaterial, boardFrameMaterial, solid(0x2c4a63), brassMaterial][i], 0.2, 0.845 + i * 0.047, 0.1).rotation.y = i * 0.2 - 0.3;
    }
    const torch = gcyl(right, 0.03, 0.04, 0.2, blackMaterial, 0.55, 0.86, -0.2, 10);
    torch.rotation.z = Math.PI / 2;
    torch.rotation.y = 0.5;
    gcyl(right, 0.03, 0.03, 0.2, bottleMaterial, 0.05, 0.92, -0.25, 10);
    put(right, 3.0, deskLevelY, 3.95, 0);

    const crate = new THREE.Group();
    gcyl(crate, 0.1, 0.1, 0.03, lampBodyMaterial, 0, 0.66, 0, 12);
    gcyl(crate, 0.08, 0.08, 0.2, lampGlowMaterial, 0, 0.78, 0, 12);
    gcyl(crate, 0.1, 0.06, 0.05, lampBodyMaterial, 0, 0.9, 0, 12);
    put(crate, 0, deskLevelY, 3.95, 0);
  }


  // ---------- the walls ----------

  if (SWITCHES.wallDecor) {
    addNoticeBoard(-1, 0.75, hallY + 1.7);
    addWallClock(1, 0.75, hallY + 2.4);
    addPainting(1, -3.75, hallY + 1.8, 1.1, 0.75, landscapeTexture);
    addPainting(1, 5.25, 2.9, 1.0, 0.75, landscapeTexture);
    addPainting(-1, 5.25, 2.9, 0.75, 0.95, planTexture);
    addPlaque(-1, 14.25, entranceY + 2.2);
    addExtinguisher(-1, -1.5, hallY);
    addExtinguisher(1, 7.5, deskLevelY);
  }

  if (SWITCHES.flags) {
    const banner = addHangingFlag(-1, bannerTexture, 1.3, 3.0, true);
    addHangingFlag(1, flagTexture, 1.4, 2.6, false);

    if (BANNER_PICTURE !== '') {
      new THREE.TextureLoader().load(IMAGE_FOLDER + BANNER_PICTURE, function (texture) {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        banner.material.map = texture;
        banner.material.needsUpdate = true;
      });
    }
  }


  // ---------- things on the floor ----------

  if (SWITCHES.floorDebris) {
    const spots = [
      [-2.9, -2.0], [-1.6, -2.6], [-2.4, -4.0], [-0.4, -1.8], [0.8, -2.6], [-3.6, -3.1], [-1.9, -0.2],
      [0.5, 0.6], [-0.7, 1.2], [2.8, 0.9], [-4.2, -1.4], [1.9, -1.2]
    ];
    spots.forEach(function (p, i) {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.004, 0.2), i % 3 === 0 ? paperYellowMaterial : paperMaterial);
      sheet.position.set(p[0], hallY + 0.006 + i * 0.0004, p[1]);
      sheet.rotation.y = seeded(i + 30) * Math.PI;
      sheet.userData.noShadow = true;
      scene.add(sheet);
    });

    [[-0.9, 7.4], [1.8, 7.0], [2.6, 8.2], [-3.4, 7.2], [0.2, 9.2], [-1.8, 9.6]].forEach(function (p, i) {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.004, 0.2), paperMaterial);
      sheet.position.set(p[0], deskLevelY + 0.045 + i * 0.0004, p[1]);
      sheet.rotation.y = seeded(i + 70) * Math.PI;
      sheet.userData.noShadow = true;
      scene.add(sheet);
    });
    for (let i = 0; i < 16; i++) {
      const shard = new THREE.Mesh(new THREE.BoxGeometry(0.05 + seeded(i) * 0.08, 0.006, 0.04 + seeded(i + 5) * 0.06), glassShardMaterial);
      shard.position.set(-4.3 + seeded(i + 11) * 0.8, hallY + 0.01, -0.2 + seeded(i + 21) * 0.7);
      shard.rotation.y = seeded(i + 31) * Math.PI;
      shard.userData.noShadow = true;
      scene.add(shard);
    }

    [[-1.3, -2.7, 0.7], [2.2, -0.4, 2.1], [-0.2, 8.0, 1.2]].forEach(function (p, i) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26, 10), bottleMaterial);
      bottle.rotation.z = Math.PI / 2;
      bottle.rotation.y = p[2];
      bottle.position.set(p[0], (i === 2 ? deskLevelY : hallY) + (i === 2 ? 0.045 : 0.04), p[1]);
      bottle.userData.noShadow = true;
      scene.add(bottle);
    });
  }

})();