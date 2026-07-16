import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { PROVINCE_SHAPES } from './province-shapes.js';
import { LANDMARKS } from './landmarks.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const demoMode = new URLSearchParams(location.search).has('demo');

// ── Chiếu tọa độ: kinh/vĩ độ → mặt phẳng (x đông, z nam) ─────
const LON0 = 106.2, LAT0 = 16.2, SCALE = 9;
const KLON = Math.cos((LAT0 * Math.PI) / 180);
const px = (lon) => (lon - LON0) * KLON * SCALE;
const pz = (lat) => -(lat - LAT0) * SCALE;

// ── Khung cảnh ───────────────────────────────────────────────
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a1420');
scene.fog = new THREE.FogExp2('#0a1420', 0.0015);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 1, 900);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 30;
controls.maxDistance = 320;
controls.minPolarAngle = 0.12;
controls.maxPolarAngle = 1.25;
controls.target.set(4, 0, 8);

const HOME_POS = new THREE.Vector3(30, 108, 106);
const HOME_TARGET = new THREE.Vector3(4, 0, 8);
camera.position.copy(reducedMotion ? HOME_POS : new THREE.Vector3(0, 300, 30));

// ── Ánh sáng ─────────────────────────────────────────────────
scene.add(new THREE.HemisphereLight('#9fc8e8', '#1c3044', 1.0));

const key = new THREE.DirectionalLight('#ffd9a0', 2.4);
key.position.set(90, 130, 60);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -110;
key.shadow.camera.right = 110;
key.shadow.camera.top = 110;
key.shadow.camera.bottom = -110;
key.shadow.camera.far = 420;
key.shadow.bias = -0.0004;
scene.add(key);

const rim = new THREE.DirectionalLight('#4fb3ff', 0.7);
rim.position.set(-80, 60, -90);
scene.add(rim);

// ── Biển đêm ─────────────────────────────────────────────────
const seaGeo = new THREE.PlaneGeometry(900, 900, 80, 80);
const seaMat = new THREE.MeshStandardMaterial({
  color: '#123048',
  roughness: 0.6,
  metalness: 0.2,
});
const sea = new THREE.Mesh(seaGeo, seaMat);
sea.rotation.x = -Math.PI / 2;
sea.position.y = -0.55;
sea.receiveShadow = true;
scene.add(sea);
const seaBase = Float32Array.from(seaGeo.attributes.position.array);

// ── Dựng 34 tỉnh ─────────────────────────────────────────────
const provinceGroups = [];   // { group, meshes, data, centroid, topMat, edge, baseY }
const hitMeshes = [];

function ringCentroid(ring) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    a += f;
    cx += (ring[j][0] + ring[i][0]) * f;
    cy += (ring[j][1] + ring[i][1]) * f;
  }
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a)];
}

const DEPTH = 2.1;
const mapRoot = new THREE.Group();
scene.add(mapRoot);

PROVINCE_SHAPES.forEach((p, idx) => {
  const group = new THREE.Group();
  const isCity = p.type !== 'Tỉnh';

  // Màu đất: dải ngọc lục — mỗi tỉnh lệch nhẹ, thành phố ấm hơn
  const h = 152 - (idx % 7) * 4 + (isCity ? -18 : 0);
  const s = isCity ? 30 : 26 + (idx % 3) * 4;
  const l = 38 + ((idx * 7) % 5) * 1.8;
  const topMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(`hsl(${h}, ${s}%, ${l}%)`),
    roughness: 0.9,
    emissive: new THREE.Color('#d8a13a'),
    emissiveIntensity: 0,
  });
  const sideMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(`hsl(${h}, ${Math.round(s * 0.8)}%, ${Math.round(l * 0.5)}%)`),
    roughness: 0.95,
  });

  const meshes = [];
  let biggest = null, biggestArea = -1;
  for (const ring of p.polys) {
    const shape = new THREE.Shape();
    ring.forEach(([lon, lat], i) => {
      const x = px(lon), y = -pz(lat); // Shape XY; sau rotateX(-90°) y → -z
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
    });
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: DEPTH, bevelEnabled: true, bevelThickness: 0.32, bevelSize: 0.26, bevelSegments: 2,
    });
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, [topMat, sideMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.provinceIdx = idx;
    group.add(mesh);
    meshes.push(mesh);
    hitMeshes.push(mesh);

    let area = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
    }
    area = Math.abs(area);
    if (area > biggestArea) { biggestArea = area; biggest = ring; }
  }

  const [clon, clat] = ringCentroid(biggest);
  const centroid = new THREE.Vector3(px(clon), DEPTH + 0.32, pz(clat));

  mapRoot.add(group);
  provinceGroups.push({ group, meshes, data: p, centroid, topMat, baseY: 0, landmark: null });
});

// ── Nhãn hai quần đảo ────────────────────────────────────────
function textSprite(text, size = 15) {
  const pad = 8, dpr = 2;
  const c = document.createElement('canvas');
  const g = c.getContext('2d');
  g.font = `600 ${size * dpr}px 'Be Vietnam Pro', sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + pad * dpr * 2;
  const hgt = size * dpr + pad * dpr * 2;
  c.width = w; c.height = hgt;
  g.font = `600 ${size * dpr}px 'Be Vietnam Pro', sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.7)';
  g.shadowBlur = 8;
  g.fillStyle = '#c8d8e2';
  g.fillText(text, w / 2, hgt / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false }));
  sp.scale.set(w / (dpr * 4.2), hgt / (dpr * 4.2), 1);
  return sp;
}

const hs = textSprite('Quần đảo Hoàng Sa');
hs.position.set(px(112), 3.4, pz(16.4));
scene.add(hs);
const ts = textSprite('Quần đảo Trường Sa');
ts.position.set(px(115.3), 3.4, pz(9.6));
scene.add(ts);

// ── Hạt sáng lơ lửng ─────────────────────────────────────────
let dust = null;
if (!reducedMotion) {
  const N = 260;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 220;
    pos[i * 3 + 1] = 2 + Math.random() * 55;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 260;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dust = new THREE.Points(geo, new THREE.PointsMaterial({
    color: '#ffd98a', size: 0.55, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(dust);
}

// ── Thẻ thông tin ────────────────────────────────────────────
const card = document.getElementById('card');
const cardType = document.getElementById('card-type');
const cardName = document.getElementById('card-name');
const cardLandmark = document.getElementById('card-landmark');
const cardDesc = document.getElementById('card-desc');
const cardMerged = document.getElementById('card-merged');
const cardStats = document.getElementById('card-stats');

function showCard(p) {
  const lm = LANDMARKS[p.name];
  cardType.textContent = p.type === 'Tỉnh' ? 'Tỉnh' : 'Thành phố trực thuộc TƯ';
  cardName.textContent = p.name;
  cardLandmark.textContent = lm ? lm.title : '';
  cardDesc.textContent = lm ? lm.desc : '';
  cardMerged.textContent =
    p.merged && p.merged !== p.name ? `Hợp nhất từ: ${p.merged}` : 'Giữ nguyên, không sáp nhập';
  cardStats.textContent = `${(p.pop / 1e6).toFixed(2).replace('.', ',')} triệu dân · ${p.area.toLocaleString('vi-VN')} km²`;
  card.classList.add('show');
}

// ── Hover & chọn tỉnh ────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-10, -10);
let hovered = -1;

function ensureLandmark(entry) {
  if (entry.landmark) return entry.landmark;
  const lm = LANDMARKS[entry.data.name];
  if (!lm) return null;
  const model = lm.build();
  model.position.copy(entry.centroid);
  model.scale.setScalar(0.001);
  model.visible = false;
  scene.add(model);
  entry.landmark = model;
  entry.landmarkAnim = { t: 1, show: false };
  return model;
}

function setHovered(idx) {
  if (idx === hovered) return;
  if (hovered >= 0) {
    const prev = provinceGroups[hovered];
    prev.targetY = 0;
    prev.targetEmissive = 0;
    if (prev.landmark) prev.landmarkAnim = { t: 0, show: false };
  }
  hovered = idx;
  if (idx >= 0) {
    const cur = provinceGroups[idx];
    cur.targetY = 1.4;
    cur.targetEmissive = 0.38;
    ensureLandmark(cur);
    if (cur.landmark) {
      cur.landmark.visible = true;
      cur.landmarkAnim = { t: 0, show: true };
    }
    showCard(cur.data);
    document.body.style.cursor = 'pointer';
  } else {
    card.classList.remove('show');
    document.body.style.cursor = '';
  }
}

addEventListener('pointermove', (e) => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
});

// ── Bay camera tới tỉnh khi nhấp ─────────────────────────────
let flight = null; // { t, fromPos, toPos, fromTgt, toTgt }

function flyTo(pos, tgt, dur = 1.4) {
  flight = {
    t: 0, dur,
    fromPos: camera.position.clone(), toPos: pos,
    fromTgt: controls.target.clone(), toTgt: tgt,
  };
}

addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  const downAt = [e.clientX, e.clientY];
  const onUp = (ue) => {
    removeEventListener('pointerup', onUp);
    if (Math.hypot(ue.clientX - downAt[0], ue.clientY - downAt[1]) > 6) return; // là drag xoay
    if (hovered >= 0) {
      const c = provinceGroups[hovered].centroid;
      flyTo(new THREE.Vector3(c.x + 6, 34, c.z + 26), new THREE.Vector3(c.x, 2, c.z));
    } else {
      flyTo(HOME_POS.clone(), HOME_TARGET.clone());
    }
  };
  addEventListener('pointerup', onUp);
});

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') flyTo(HOME_POS.clone(), HOME_TARGET.clone());
});

// ── Chế độ demo: tour tự động Bắc → Nam (?demo=1) ────────────
// Mỗi điểm dừng: bay tới địa danh, dừng ngắm với camera trôi nhẹ quanh mục tiêu.
const DEMO_STOPS = [
  { name: 'Hà Nội',          off: [5, 24, 23], dwell: 2.6 },
  { name: 'Quảng Ninh',      off: [7, 18, 26], dwell: 2.6 },
  { name: 'Đà Nẵng',         off: [3, 19, 25], dwell: 2.8 },
  { name: 'Huế',             off: [4, 22, 23], dwell: 2.4 },
  // Biển Đông: hai quần đảo thiêng liêng của Tổ quốc
  { sea: true, pos: [56, 30, 40],  tgt: [50, 1, -2],  dwell: 2.6 },
  { sea: true, pos: [80, 34, 100], tgt: [72, 1, 55],  dwell: 2.6 },
  { name: 'TP. Hồ Chí Minh', off: [6, 22, 26], dwell: 2.6 },
  { name: 'Đồng Tháp',       off: [3, 19, 23], dwell: 2.4 },
  { name: 'Cà Mau',          off: [4, 19, 24], dwell: 2.6 },
];
let demo = null;
if (demoMode) {
  demo = { i: -1, phase: 'intro', timer: 1.2 };
  controls.enabled = false;
  document.getElementById('hint').style.display = 'none';
}

function demoStep(dt) {
  if (!demo) return;
  demo.timer -= dt;
  if (demo.phase === 'intro') {
    if (introT >= 1 && demo.timer <= 0) nextDemoStop();
    return;
  }
  if (demo.phase === 'fly') {
    if (!flight) { demo.phase = 'dwell'; demo.timer = demo.i < DEMO_STOPS.length ? DEMO_STOPS[demo.i].dwell : 6; }
    return;
  }
  if (demo.phase === 'dwell') {
    // camera trôi chậm quanh mục tiêu — thêm sức sống cho cảnh tĩnh
    const tgt = controls.target;
    const v = camera.position.clone().sub(tgt);
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.14);
    camera.position.copy(tgt).add(v);
    if (demo.timer <= 0) {
      if (demo.i >= DEMO_STOPS.length) { // hết outro — trả lại điều khiển
        demo = null;
        controls.enabled = true;
        document.getElementById('hint').style.display = '';
        return;
      }
      nextDemoStop();
    }
  }
}

function nextDemoStop() {
  demo.i++;
  demo.phase = 'fly';
  if (demo.i < DEMO_STOPS.length) {
    const stop = DEMO_STOPS[demo.i];
    if (stop.sea) {
      setHovered(-1);
      flyTo(new THREE.Vector3(...stop.pos), new THREE.Vector3(...stop.tgt), 2.1);
      return;
    }
    const idx = PROVINCE_SHAPES.findIndex((p) => p.name === stop.name);
    setHovered(idx);
    const c = provinceGroups[idx].centroid;
    flyTo(
      new THREE.Vector3(c.x + stop.off[0], stop.off[1], c.z + stop.off[2]),
      new THREE.Vector3(c.x, 2.6, c.z),
      1.9
    );
  } else {
    // outro: thả tay, kéo về toàn cảnh đất nước
    setHovered(-1);
    flyTo(new THREE.Vector3(-24, 150, 130), new THREE.Vector3(4, 0, 4), 3.2);
  }
}

// ── Vòng lặp ─────────────────────────────────────────────────
const clock = new THREE.Clock();
let introT = reducedMotion ? 1 : 0;

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  // Màn mở đầu: camera hạ xuống từ trên cao
  if (introT < 1) {
    introT = Math.min(introT + dt / 2.6, 1);
    const k = easeInOut(introT);
    camera.position.lerpVectors(new THREE.Vector3(0, 300, 30), HOME_POS, k);
  }

  // Chuyến bay tới tỉnh
  if (flight) {
    flight.t += dt / flight.dur;
    const k = easeInOut(Math.min(flight.t, 1));
    camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
    controls.target.lerpVectors(flight.fromTgt, flight.toTgt, k);
    if (flight.t >= 1) flight = null;
  }

  // Sóng biển
  if (!reducedMotion) {
    const posAttr = seaGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = seaBase[i * 3], y = seaBase[i * 3 + 1];
      posAttr.array[i * 3 + 2] = Math.sin(x * 0.045 + t * 0.7) * Math.cos(y * 0.05 + t * 0.5) * 0.45;
    }
    posAttr.needsUpdate = true;
  }

  demoStep(dt);

  // Hover raycast
  if (!demo && introT >= 0.98 && !flight) {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    setHovered(hits.length ? hits[0].object.userData.provinceIdx : -1);
  }

  // Nâng tỉnh + phát sáng
  for (const pg of provinceGroups) {
    const ty = pg.targetY ?? 0;
    pg.group.position.y += (ty - pg.group.position.y) * Math.min(dt * 9, 1);
    const te = pg.targetEmissive ?? 0;
    pg.topMat.emissiveIntensity += (te - pg.topMat.emissiveIntensity) * Math.min(dt * 8, 1);

    // Địa danh mọc lên / thu lại
    if (pg.landmark && pg.landmarkAnim) {
      const a = pg.landmarkAnim;
      a.t = Math.min(a.t + dt / 0.6, 1);
      if (a.show) {
        const s = backOut(a.t);
        pg.landmark.scale.setScalar(Math.max(s, 0.001));
        pg.landmark.position.y = pg.centroid.y + pg.group.position.y;
        pg.landmark.rotation.y = Math.sin(t * 0.4) * 0.08;
      } else {
        const s = 1 - easeOutCubic(a.t);
        pg.landmark.scale.setScalar(Math.max(s, 0.001));
        if (a.t >= 1) pg.landmark.visible = false;
      }
    }
  }

  // Hạt sáng trôi
  if (dust) {
    dust.rotation.y = t * 0.008;
    dust.position.y = Math.sin(t * 0.3) * 0.8;
  }

  controls.update();
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

document.getElementById('loader').classList.add('done');
animate();
