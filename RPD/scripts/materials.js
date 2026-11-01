// ---------- MATERIALS ----------

// ---------- PLAIN MATERIALS ----------

function solid(color, extras) {
  return new THREE.MeshStandardMaterial(Object.assign({ color: color }, extras));
}

function shinyMetal(color, shineColor, sharpness) {
  return new THREE.MeshPhongMaterial({ color: color, specular: shineColor, shininess: sharpness });
}

function glossy(color) {
  return new THREE.MeshPhongMaterial({ color: color, specular: 0x777777, shininess: 100 });
}



const IMAGE_FOLDER = 'texture/';

// ---------- The tall inside walls ----------

const UPPER_WALL_BLUE_PICTURE = 'rewall.png';
const UPPER_WALL_WHITE_PICTURE = 'rewall2.png';

const wallBlend = {
  uLoaded:      { value: 0 },
  uLowerMap:    { value: null },
  uUpperMap:    { value: null },
  uBase:        { value: 4.5 },
  uTop:         { value: 13.9 },
  uFirstH:      { value: 4.35 },
  uBlueH:       { value: 1.0 },
  uLowerPeriod: { value: 4.0 },
  uUpperPeriod: { value: 8.0 },
  uUpperF:      { value: 0.0 }
};
const wallBlendState = { lower: null, upper: null, lowerBlue: 0, upperBlue: 0 };

function configureUpperWall(base, top, firstFloorWallHeight) {
  wallBlend.uBase.value = base;
  wallBlend.uTop.value = top;
  wallBlend.uFirstH.value = firstFloorWallHeight;
  updateWallBlend();
}

function updateWallBlend() {
  const lower = wallBlendState.lower, upper = wallBlendState.upper;
  if (!lower || !upper) return;
  const firstH = wallBlend.uFirstH.value;
  wallBlend.uBlueH.value = wallBlendState.lowerBlue * firstH;
  wallBlend.uLowerPeriod.value = firstH * lower.image.width / lower.image.height;
  wallBlend.uUpperF.value = wallBlendState.upperBlue;
  const whiteH = wallBlend.uTop.value - wallBlend.uBase.value - wallBlend.uBlueH.value;
  wallBlend.uUpperPeriod.value = (whiteH / (1 - wallBlendState.upperBlue)) * upper.image.width / upper.image.height;
  wallBlend.uLoaded.value = 1;
}

function findBlueFraction(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  function rowColour(fraction) {
    const y = Math.min(image.height - 1, Math.max(0, Math.floor(image.height * fraction)));
    let r = 0, g = 0, b = 0;
    [0.25, 0.5, 0.75].forEach(function (cx) {
      const d = ctx.getImageData(Math.floor(image.width * cx), y, 1, 1).data;
      r += d[0] / 3; g += d[1] / 3; b += d[2] / 3;
    });
    return [r, g, b];
  }
  function distance(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
  const top = rowColour(0.1), bottom = rowColour(0.96);
  if (distance(top, bottom) < 40) return 0;
  for (let row = image.height - 1; row >= 0; row--) {
    const c = rowColour(row / image.height);
    if (distance(c, top) < distance(c, bottom)) return Math.min(0.9, (image.height - 1 - row) / image.height);
  }
  return 0;
}

function loadWallBlendPicture(fileName, key, blueKey, findBlue) {
  new THREE.TextureLoader().load(IMAGE_FOLDER + fileName, function (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    wallBlendState[key] = texture;
    wallBlendState[blueKey] = findBlue ? findBlueFraction(texture.image) : 0;
    wallBlend[key === 'lower' ? 'uLowerMap' : 'uUpperMap'].value = texture;
    updateWallBlend();
  });
}

function makeBlendedWallMaterial(side) {
  const material = solid(0xcfc3b0, { side: side });
  material.onBeforeCompile = function (shader) {
    Object.assign(shader.uniforms, wallBlend);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;\nuniform float uLoaded, uBase, uTop, uFirstH, uBlueH, uLowerPeriod, uUpperPeriod, uUpperF;\nuniform sampler2D uLowerMap, uUpperMap;')
      .replace('#include <map_fragment>', `
        if (uLoaded > 0.5) {
          float across = abs(vWNrm.x) > 0.5 ? vWPos.z : vWPos.x;
          float y = max(vWPos.y - uBase, 0.0);
          float t = clamp((y - uBlueH) / max(uTop - uBase - uBlueH, 0.01), 0.0, 1.0);
          vec4 blue = texture2D(uLowerMap, vec2(across / uLowerPeriod, y / uFirstH));
          vec4 white = texture2D(uUpperMap, vec2(across / uUpperPeriod, uUpperF + (1.0 - uUpperF) * t));
          diffuseColor *= (y < uBlueH) ? blue : white;
        }`);
  };
  return material;
}

loadWallBlendPicture(UPPER_WALL_BLUE_PICTURE, 'lower', 'lowerBlue', true);
loadWallBlendPicture(UPPER_WALL_WHITE_PICTURE, 'upper', 'upperBlue', true);

// ---------- Floor, walls, ceiling ----------

const floorMaterial = solid(0x5d7384, { roughness: 0.45 });
const wallMaterial = solid(0xcfc3b0);
const archWallMaterial = makeBlendedWallMaterial(THREE.DoubleSide);
const stoneMaterial = solid(0xa89b86);
const trimMaterial = solid(0xb5a78f);
const darkStoneMaterial = solid(0x6b6153);
const vaultMaterial = solid(0x4a443d, { side: THREE.BackSide });
const roofMaterial = solid(0x4a443d);


// ---------- Doors and windows ----------

const doorMaterial = solid(0x2f2822);
const doorFrameMaterial = solid(0x1a1612);
const glassMaterial = solid(0xbfe3ff, { transparent: true, opacity: 0.35, side: THREE.DoubleSide });

const skyGlassMaterial = new THREE.MeshBasicMaterial({ color: 0xfff3dc, side: THREE.DoubleSide });
const windowBarMaterial = solid(0x2a2622);
const doorGlassMaterial = solid(0x1d2a33, { roughness: 0.2, metalness: 0.1, side: THREE.DoubleSide });
const clockFaceMaterial = solid(0xe8e2d0);


// ---------- Outside of the building ----------

const slateMaterial = solid(0x3a4350, { roughness: 0.75 });
const ironMaterial = shinyMetal(0x23262b, 0xaaaaaa, 90);
const groundMaterial = solid(0x9aa3a6, { roughness: 0.95 });
const pavingMaterial = solid(0xb9b3a4, { roughness: 0.9 });
const roadMaterial = solid(0x4a4d52, { roughness: 0.95 });


// ---------- Steel roof arches ----------

const trussMaterial = shinyMetal(0x3a3d42, 0xdddddd, 120);


// ---------- Railings and lamps ----------

const railMaterial = shinyMetal(0x6f8aa6, 0xcfe3f5, 100);
const lampBodyMaterial = shinyMetal(0x3a342c, 0xbbaa88, 80);
const lampGlowMaterial = solid(0xfff1d0, { emissive: 0xffd9a0, emissiveIntensity: 0.2 });


// ---------- Statue ----------

const statueMaterial = solid(0xb9b2a4, { metalness: 0.7, roughness: 0.35, flatShading: true });


// ---------- Reception, tables, boxes ----------

const deskMaterial = solid(0x7a6a58);
const deskWoodMaterial = solid(0x6a4a3a, { roughness: 0.7 });
const deskTopMaterial = solid(0xd8cdb8, { roughness: 0.3 });
const tableMaterial = solid(0xcfd8e0, { roughness: 0.4 });
const cardboardMaterial = solid(0xa08460, { roughness: 1 });
const stepTreadMaterial = solid(0xc4baa3, { roughness: 0.7 });
const stepRiserMaterial = solid(0x6f6654, { roughness: 0.8 });
const rugBorderMaterial = solid(0x8a7a5a);
const rugMaterial = solid(0x2a3552);
const rugMedallionMaterial = solid(0xc9a64a, { metalness: 0.4, roughness: 0.5 });
const brickMaterial = solid(0x2f343f, { roughness: 0.8 });
const cartMaterial = shinyMetal(0xb9bec6, 0xffffff, 130);


// ---------- Pictures-on-materials ----------

const wallLowerMaterial = solid(0xcfc3b0);
const wallUpperMaterial = makeBlendedWallMaterial(THREE.FrontSide);
const outerStoneMaterial = solid(0xb5a78f);
const corridorFloorMaterial = solid(0xa89b86);
const corridorLandingMaterial = solid(0xa89b86);
const outerBrickMaterial = solid(0xb9a58f);
const garageDoorMaterial = solid(0x7f8286, { roughness: 0.85 });


// ---------- PICTURES ----------


const PICTURES = [
  [floorMaterial,         'refloor.png',         2.0, 'tileTurn'],
  [corridorFloorMaterial, 'recorridorfloor.png', 2.0, 'fitWidth'],
  [corridorLandingMaterial, 'recorridorfloor.png', 2.0, 'tileTurn'],
  [wallLowerMaterial,     'rewall.png',          3.0, 'fitHeight'],
  [outerBrickMaterial,    'rebrick.jpg',         2.0, 'tile'],
  [groundMaterial,        'regrass.jpg',         4.0, 'tile'],
  [roadMaterial,          'reroad',              2.0, 'asIs'],
  [pavingMaterial,        'restone2.png',        2.0, 'tile'],
  [outerStoneMaterial,    'restone.png',         2.0, 'tile'],
  [deskWoodMaterial,      'rewood.jpg',          2.0, 'tile'],
  [garageDoorMaterial,    'redoor.png',          2.0, 'fitOnce']
];


function loadWithAnyExtension(fileName, onLoad) {
  const names = /\.[a-z]+$/i.test(fileName) ? [fileName] : [fileName + '.png', fileName + '.jpg', fileName + '.jpeg'];
  (function tryNext(i) {
    new THREE.TextureLoader().load(IMAGE_FOLDER + names[i], onLoad, undefined, function () {
      if (i + 1 < names.length) tryNext(i + 1);
    });
  })(0);
}

function putImageOn(material, fileName, tileSize, mode) {

  if (fileName === '') return;

  if (mode === 'fitWidth') material.userData.fitWidth = true;
  else if (mode === 'fitHeight') material.userData.fitHeight = true;
  else if (mode === 'fitOnce' || mode === 'asIs') {  }
  else material.userData.tile = tileSize;

  loadWithAnyExtension(fileName, function (texture) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      if (mode === 'fitWidth') {
        texture.repeat.set(texture.image.height / texture.image.width, 1);
      } else if (mode === 'fitHeight') {
        texture.repeat.set(texture.image.height / texture.image.width, 1);
      } else if (mode === 'fitOnce') {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
      } else if (mode === 'asIs') {
      } else {
        texture.repeat.set(1 / tileSize, 1 / tileSize);
        if (mode === 'tileTurn') {
          texture.center.set(0.5, 0.5);
          texture.rotation = Math.PI / 2;
        }
      }
      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
  });
}

PICTURES.forEach(function (p) { putImageOn(p[0], p[1], p[2], p[3]); });