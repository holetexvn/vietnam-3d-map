import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { PROVINCE_SHAPES } from './province-shapes.js';
import { LANDMARKS, animateLandmark } from './landmarks.js';
import {
  RAIL_WAYPOINTS, STATIONS, SEA_TRIPS,
  createTrain, placeTrain, createRailway, createShip, createSeaTrail, placeShip,
} from './train.js';
import { createFilm } from './film1975.js';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const urlParams = new URLSearchParams(location.search);
const demoMode = urlParams.has('demo');
const trainMode = urlParams.has('train');
const filmMode = urlParams.get('film') === '1975';

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
const hemi = new THREE.HemisphereLight('#9fc8e8', '#1c3044', 1.0);
scene.add(hemi);

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

// Lớp raycast tĩnh: bản sao hình học đứng yên tại y=0 — tỉnh nổi lên
// không làm con trỏ "nhảy" sang tỉnh bên cạnh.
const hitRoot = new THREE.Group();
hitRoot.visible = false;
scene.add(hitRoot);
const proxyMat = new THREE.MeshBasicMaterial();

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
    group.add(mesh);
    meshes.push(mesh);

    const proxy = new THREE.Mesh(geo, proxyMat);
    proxy.userData.provinceIdx = idx;
    hitRoot.add(proxy);
    hitMeshes.push(proxy);

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
  sp.scale.set(w / (dpr * 6.5), hgt / (dpr * 6.5), 1);
  return sp;
}

const hs = textSprite('Quần đảo Hoàng Sa');
hs.position.set(px(112), 8.5, pz(16.4));
scene.add(hs);
const ts = textSprite('Quần đảo Trường Sa');
ts.position.set(px(115.3), 8.5, pz(9.6));
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
// Màn hình cảm ứng: không có hover — chỉ dùng chạm để chọn
const coarsePointer = matchMedia('(pointer: coarse)').matches;
let hovered = -1;  // tỉnh dưới con trỏ (chỉ desktop)
let selected = -1; // tỉnh được ghim khi nhấp/chạm — giữ tới khi chọn nơi khác

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

function activate(pg) {
  pg.targetY = 1.4;
  pg.targetEmissive = 0.38;
  ensureLandmark(pg);
  if (pg.landmark) {
    pg.landmark.visible = true;
    pg.landmarkAnim = { t: 0, show: true };
  }
}

function deactivate(pg) {
  pg.targetY = 0;
  pg.targetEmissive = 0;
  if (pg.landmark) pg.landmarkAnim = { t: 0, show: false };
}

// Trạng thái hiển thị = hợp của {tỉnh đang hover, tỉnh được ghim}.
function setState(nextHovered, nextSelected) {
  if (nextHovered === hovered && nextSelected === selected) return;
  const was = new Set([hovered, selected].filter((i) => i >= 0));
  hovered = nextHovered;
  selected = nextSelected;
  const now = new Set([hovered, selected].filter((i) => i >= 0));
  for (const i of was) if (!now.has(i)) deactivate(provinceGroups[i]);
  for (const i of now) if (!was.has(i)) activate(provinceGroups[i]);

  const cardIdx = hovered >= 0 ? hovered : selected;
  if (cardIdx >= 0) showCard(provinceGroups[cardIdx].data);
  else card.classList.remove('show');
  document.body.style.cursor = hovered >= 0 ? 'pointer' : '';
}

const setHovered = (idx) => setState(idx, selected);

// Raycast tại một điểm màn hình bất kỳ (dùng cho chạm/nhấp)
function pickAt(clientX, clientY) {
  const v = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(v, camera);
  const hits = raycaster.intersectObjects(hitMeshes, false);
  return hits.length ? hits[0].object.userData.provinceIdx : -1;
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
    if (demo || journey) return;
    const idx = pickAt(ue.clientX, ue.clientY);
    if (idx >= 0) {
      // Ghim tỉnh: nổi lên + địa danh hiện và GIỮ NGUYÊN sau khi camera bay tới.
      // Cùng một góc nhìn cố định với chuyến tàu — không đổi hướng nhìn.
      setState(coarsePointer ? -1 : hovered, idx);
      const c = provinceGroups[idx].centroid;
      flyTo(c.clone().add(CAM_OFFSET), new THREE.Vector3(c.x, 2, c.z));
    } else {
      setState(coarsePointer ? -1 : hovered, -1);
      flyTo(HOME_POS.clone(), HOME_TARGET.clone());
    }
  };
  addEventListener('pointerup', onUp);
});

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (journey) { stopJourney(); return; }
    setState(coarsePointer ? -1 : hovered, -1);
    flyTo(HOME_POS.clone(), HOME_TARGET.clone());
  }
});

// ── Chuyến tàu Thống Nhất (nút 🚂 hoặc ?train=1) ─────────────
const RAIL_Y = DEPTH + 0.42;
const railCurve = new THREE.CatmullRomCurve3(
  RAIL_WAYPOINTS.map(([lon, lat]) => new THREE.Vector3(px(lon), RAIL_Y, pz(lat))),
  false,
  'catmullrom',
  0.25
);
const railLen = railCurve.getLength();

// u trên đường cong của từng ga (arc-length uniform nên phải dò điểm gần nhất)
const stationU = STATIONS.map((st) => {
  const [lon, lat] = RAIL_WAYPOINTS[st.wp];
  const target = new THREE.Vector3(px(lon), RAIL_Y, pz(lat));
  let best = 0, bestD = Infinity;
  for (let i = 0; i <= 800; i++) {
    const u = i / 800;
    const d = railCurve.getPointAt(u).distanceToSquared(target);
    if (d < bestD) { bestD = d; best = u; }
  }
  return best;
});

// bbox từng tỉnh (kinh/vĩ độ) để dò nhanh "tàu đang ở tỉnh nào"
const provinceBounds = PROVINCE_SHAPES.map((p) => {
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const ring of p.polys) {
    for (const [x, y] of ring) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  return [minX, maxX, minY, maxY];
});

function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function provinceAtLonLat(lon, lat) {
  for (let i = 0; i < PROVINCE_SHAPES.length; i++) {
    const [minX, maxX, minY, maxY] = provinceBounds[i];
    if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue;
    for (const ring of PROVINCE_SHAPES[i].polys) {
      if (pointInRing(lon, lat, ring)) return i;
    }
  }
  return -1;
}

const trainBtn = document.getElementById('train-btn');
let journey = null;
let trainRig = null; // { train, railway, trips } — dựng một lần, tái dùng

// Camera hành trình: MỘT góc nhìn cố định (chếch đông nam, nhìn từ biển vào),
// chỉ trượt mượt theo tàu — không xoay, không orbit để khỏi chóng mặt.
const CAM_OFFSET = new THREE.Vector3(14, 22, 25);
const CAM_STATION_ZOOM = 0.66; // đến ga: đẩy nhẹ vào gần
const SEA_CAM_OFFSET = new THREE.Vector3(10, 16, 18);

// Tỉnh sáng đèn khi tàu đi qua (không nâng khối — tàu vẫn bám ray)
function lightUp(pg) {
  pg.targetEmissive = 0.5;
  ensureLandmark(pg);
  if (pg.landmark) {
    pg.landmark.visible = true;
    pg.landmarkAnim = { t: 0, show: true };
  }
}

function lightOff(pg) {
  pg.targetEmissive = 0;
  if (pg.landmark) pg.landmarkAnim = { t: 0, show: false };
}

function startJourney() {
  if (journey || demo) return;
  setState(-1, -1);
  controls.enabled = false;
  trainBtn.classList.add('hidden');
  document.getElementById('hint').style.display = 'none';

  if (!trainRig) {
    const trips = {};
    for (const [prov, spec] of Object.entries(SEA_TRIPS)) {
      const curve = new THREE.CatmullRomCurve3(
        spec.waypoints.map(([lon, lat]) => new THREE.Vector3(px(lon), 0.35, pz(lat))),
        false, 'catmullrom', 0.3
      );
      const seaTrail = createSeaTrail(curve);
      const ship = createShip();
      ship.visible = false;
      scene.add(seaTrail.trail, ship);
      trips[prov] = { ...spec, curve, ship, setProgress: seaTrail.setProgress, trail: seaTrail.trail, done: false };
    }
    trainRig = { train: createTrain(), railway: createRailway(railCurve), trips };
    scene.add(trainRig.railway.rail, trainRig.railway.trail, trainRig.train);
  }
  trainRig.railway.setProgress(0);
  for (const trip of Object.values(trainRig.trips)) {
    trip.done = false;
    trip.setProgress(0);
    trip.ship.visible = false;
  }
  trainRig.train.visible = true;
  placeTrain(trainRig.train, railCurve, railLen, 0);

  journey = {
    phase: 'fly',
    segment: 0,       // 0: HN→Đà Nẵng, 1: →Nha Trang, 2: →Sài Gòn
    u: 0,
    t: 0,
    dwell: 0,
    lit: new Set(),
    curProvince: -1,
    trip: null,
  };
  const p0 = railCurve.getPointAt(0);
  flyTo(
    p0.clone().add(CAM_OFFSET.clone().multiplyScalar(CAM_STATION_ZOOM)),
    p0.clone().add(new THREE.Vector3(0, 2.5, 0)),
    2.6
  );
}

function stopJourney(flyHome = true) {
  if (!journey) return;
  for (const i of journey.lit) lightOff(provinceGroups[i]);
  card.classList.remove('show');
  if (trainRig) {
    trainRig.train.visible = false;
    for (const trip of Object.values(trainRig.trips)) trip.ship.visible = false;
  }
  journey = null;
  controls.enabled = true;
  trainBtn.classList.remove('hidden');
  document.getElementById('hint').style.display = '';
  if (flyHome) flyTo(HOME_POS.clone(), HOME_TARGET.clone());
}

const RUN_TOTAL = 40;        // giây lăn bánh cho toàn tuyến — chậm rãi, không dừng ga lẻ
const CHECKPOINTS = [5, 6, 7]; // chỉ dừng hẳn: Đà Nẵng, Nha Trang (xuống thuyền) và ga cuối

// Camera trượt êm tới vị trí cố định so với mục tiêu — không xoay
function glideCamera(dt, focus, offset) {
  camera.position.lerp(focus.clone().add(offset), Math.min(dt * 2.2, 1));
  controls.target.lerp(focus.clone().add(new THREE.Vector3(0, 2, 0)), Math.min(dt * 2.6, 1));
}

// Thẻ thông tin riêng cho quần đảo
function showIslandCard(trip) {
  cardType.textContent = 'Quần đảo · Biển Đông';
  cardName.textContent = trip.label;
  cardLandmark.textContent = trip.owner;
  cardDesc.textContent = 'Phần lãnh thổ thiêng liêng của Tổ quốc giữa Biển Đông';
  cardMerged.textContent = '';
  cardStats.textContent = '';
  card.classList.add('show');
}

// Đến điểm dừng hẳn: xuống thuyền ra đảo, hoặc kết thúc ở ga cuối
function reachCheckpoint() {
  const j = journey;
  const st = STATIONS[CHECKPOINTS[j.segment]];
  const trip = trainRig.trips[st.name];
  if (trip && !trip.done) {
    j.trip = trip;
    j.t = 0;
    j.phase = 'sea-out';
    trip.ship.visible = true;
    placeShip(trip.ship, trip.curve, 0);
    showIslandCard(trip);
  } else {
    j.phase = 'final';
    j.dwell = 3.2;
  }
}

function journeyStep(dt, t) {
  const j = journey;
  if (!j) return;

  // Tỉnh tàu đang đi qua: sáng đèn + địa danh mọc dần + thẻ tỉnh cập nhật
  // ngay khi tàu lăn bánh qua — không cần dừng
  const head = railCurve.getPointAt(j.u);
  const lon = head.x / (KLON * SCALE) + LON0;
  const lat = -head.z / SCALE + LAT0;
  const cur = provinceAtLonLat(lon, lat);
  if (cur !== j.curProvince) {
    if (j.curProvince >= 0 && j.lit.has(j.curProvince)) {
      lightOff(provinceGroups[j.curProvince]);
      j.lit.delete(j.curProvince);
    }
    if (cur >= 0 && !j.lit.has(cur)) {
      lightUp(provinceGroups[cur]);
      j.lit.add(cur);
      if (j.phase === 'fly' || j.phase === 'hold' || j.phase === 'run' || j.phase === 'final') {
        showCard(provinceGroups[cur].data);
      }
    }
    j.curProvince = cur;
  }

  placeTrain(trainRig.train, railCurve, railLen, j.u);
  trainRig.railway.setProgress(j.u);

  const trainPos = railCurve.getPointAt(j.u);

  switch (j.phase) {
    case 'fly':
      if (!flight) {
        j.phase = 'hold';
        j.dwell = 1.2;
        showCard(provinceGroups[PROVINCE_SHAPES.findIndex((p) => p.name === 'Hà Nội')].data);
      }
      return;

    case 'hold': // nhịp lấy đà ở ga Hà Nội
      j.dwell -= dt;
      glideCamera(dt, trainPos, CAM_OFFSET.clone().multiplyScalar(CAM_STATION_ZOOM));
      if (j.dwell <= 0) { j.phase = 'run'; j.t = 0; }
      return;

    case 'run': {
      const u0 = j.segment === 0 ? 0 : stationU[CHECKPOINTS[j.segment - 1]];
      const u1 = stationU[CHECKPOINTS[j.segment]];
      const dur = Math.max((u1 - u0) * RUN_TOTAL, 2);
      j.t += dt / dur;
      const k = easeInOut(Math.min(j.t, 1));
      j.u = u0 + (u1 - u0) * k;
      glideCamera(dt, railCurve.getPointAt(j.u), CAM_OFFSET);
      if (j.t >= 1) { j.u = u1; reachCheckpoint(); }
      return;
    }

    case 'sea-out': {
      j.t += dt / 5;
      const k = easeInOut(Math.min(j.t, 1));
      placeShip(j.trip.ship, j.trip.curve, k);
      j.trip.setProgress(k);
      glideCamera(dt, j.trip.ship.position, SEA_CAM_OFFSET);
      if (j.t >= 1) { j.phase = 'sea-dwell'; j.dwell = 2.2; }
      return;
    }

    case 'sea-dwell':
      j.dwell -= dt;
      glideCamera(dt, j.trip.ship.position, SEA_CAM_OFFSET.clone().multiplyScalar(0.75));
      if (j.dwell <= 0) {
        // quay đầu thuyền: xoay 180° quanh trục đứng rồi mới chạy về
        j.phase = 'sea-turn';
        j.t = 0;
        j.qStart = j.trip.ship.quaternion.clone();
        j.qEnd = new THREE.Quaternion()
          .setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI)
          .multiply(j.qStart);
        card.classList.remove('show');
      }
      return;

    case 'sea-turn':
      j.t += dt / 1.1;
      j.trip.ship.quaternion.slerpQuaternions(j.qStart, j.qEnd, easeInOut(Math.min(j.t, 1)));
      glideCamera(dt, j.trip.ship.position, SEA_CAM_OFFSET);
      if (j.t >= 1) { j.phase = 'sea-back'; j.t = 0; }
      return;

    case 'sea-back': {
      j.t += dt / 3.6;
      const k = 1 - easeInOut(Math.min(j.t, 1));
      placeShip(j.trip.ship, j.trip.curve, k, -1); // mũi hướng về đất liền
      glideCamera(dt, j.trip.ship.position, SEA_CAM_OFFSET);
      if (j.t >= 1) {
        j.trip.done = true;
        j.trip.ship.visible = false;
        j.trip = null;
        j.segment++;
        j.phase = 'run';
        j.t = 0;
      }
      return;
    }

    case 'final': // dừng hẳn ở ga Sài Gòn
      j.dwell -= dt;
      glideCamera(dt, trainPos, CAM_OFFSET.clone().multiplyScalar(CAM_STATION_ZOOM));
      if (j.dwell <= 0) {
        card.classList.remove('show');
        j.phase = 'outro';
        j.dwell = 4.2;
        flyTo(new THREE.Vector3(-24, 150, 130), new THREE.Vector3(4, 0, 4), 3.6);
      }
      return;

    case 'outro':
      if (!flight) {
        j.dwell -= dt;
        if (j.dwell <= 0) stopJourney(false);
      }
  }
}

// ── Chế độ demo: tour tự động Bắc → Nam (?demo=1) ────────────
// Mỗi điểm dừng: bay tới địa danh, dừng ngắm với camera trôi nhẹ quanh mục tiêu.
// MỘT góc nhìn cố định cho mọi điểm dừng (đồng bộ với chuyến tàu) — không xoay
const DEMO_OFF = [11.5, 18, 20.5];
const DEMO_STOPS = [
  { name: 'Hà Nội',          off: DEMO_OFF, dwell: 2.6 },
  { name: 'Quảng Ninh',      off: DEMO_OFF, dwell: 2.6 },
  { name: 'Đà Nẵng',         off: DEMO_OFF, dwell: 2.8 },
  { name: 'Huế',             off: DEMO_OFF, dwell: 2.4 },
  // Biển Đông: hai quần đảo thiêng liêng của Tổ quốc
  { sea: true, pos: [61, 19, 19],  tgt: [50, 1, -2],  dwell: 2.6 },
  { sea: true, pos: [83, 19, 76],  tgt: [72, 1, 55],  dwell: 2.6 },
  { name: 'TP. Hồ Chí Minh', off: DEMO_OFF, dwell: 2.6 },
  { name: 'Đồng Tháp',       off: DEMO_OFF, dwell: 2.4 },
  { name: 'Cà Mau',          off: DEMO_OFF, dwell: 2.6 },
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
    // đứng yên hoàn toàn — không orbit, không trôi
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

  if (film) film.step(dt);
  journeyStep(dt, t);
  demoStep(dt);

  // Hover raycast — chỉ trên thiết bị có con trỏ thật; cảm ứng dùng chạm
  if (!coarsePointer && !demo && !journey && !film && introT >= 0.98 && !flight) {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    let idx = hits.length ? hits[0].object.userData.provinceIdx : -1;
    // Hysteresis: ở biên hai tỉnh (bevel chồng nhau) giữ nguyên tỉnh đang
    // hover nếu nó vẫn trúng ray gần như cùng khoảng cách — tránh nhấp nháy.
    if (
      hovered >= 0 &&
      hits.some((h) => h.object.userData.provinceIdx === hovered && h.distance - hits[0].distance < 1.2)
    ) {
      idx = hovered;
    }
    setState(idx, selected);
  }

  // Nâng tỉnh + phát sáng
  for (const pg of provinceGroups) {
    const ty = pg.targetY ?? 0;
    pg.group.position.y += (ty - pg.group.position.y) * Math.min(dt * 9, 1);
    const te = pg.targetEmissive ?? 0;
    pg.topMat.emissiveIntensity += (te - pg.topMat.emissiveIntensity) * Math.min(dt * 8, 1);

    // Sinh khí cho địa danh đang hiển thị: cờ phất, thuyền bập bềnh, đèn quét…
    if (pg.landmark && pg.landmark.visible) animateLandmark(pg.landmark, t);

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

trainBtn.addEventListener('click', startJourney);
if (demoMode) trainBtn.classList.add('hidden');

// Phim 55 ngày đêm
let film = null;
if (filmMode) {
  introT = 1;
  film = createFilm({
    scene, camera, controls, provinceGroups, PROVINCE_SHAPES, px, pz, DEPTH,
    renderer, sea: seaMat,
    lights: { key, hemi, rim },
  });
  film.start();
}
if (trainMode) {
  // quay video: bỏ màn hạ camera, tàu tự lăn bánh sau 1 nhịp
  introT = 1;
  camera.position.copy(HOME_POS);
  setTimeout(startJourney, 900);
}

document.getElementById('loader').classList.add('done');
window.__dbg = () => ({ introT, hovered, selected, demoActive: !!demo, frame: renderer.info.render.frame });
window.__shipCheck = () => {
  if (!journey || !journey.trip) return null;
  const ship = journey.trip.ship;
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(ship.quaternion);
  return { phase: journey.phase, fwd: [fwd.x, fwd.z], pos: [ship.position.x, ship.position.z] };
};
window.__buildAll = () =>
  provinceGroups
    .map((pg) => {
      try { ensureLandmark(pg); return null; }
      catch (e) { return pg.data.name + ': ' + e.message; }
    })
    .filter(Boolean);
animate();
