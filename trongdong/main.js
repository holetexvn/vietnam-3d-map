// Trống đồng Ngọc Lũ — "Vũ trụ trong mặt trống"
// Mô phỏng nghệ thuật 3D phỏng theo hoa văn trống Ngọc Lũ (không phải bản scan).
// Mọi thông tin lịch sử trong thẻ đều lấy từ nguồn nhà nước:
//   · Cục Di sản văn hóa — dsvh.gov.vn/trong-dong-ngoc-lu-3014
//   · Bảo tàng Lịch sử quốc gia (đơn vị lưu giữ)
//   · Báo Dân tộc & Phát triển (Ủy ban Dân tộc)
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';

// ── Chất liệu đồng cổ ────────────────────────────────────────
const BRONZE = '#5c6f63';      // patin xanh ngả xám (theo mô tả BTLSQG)
const BRONZE_DARK = '#42524a';
const MOTIF = '#c9a86a';       // hoa văn nổi bắt sáng
const MOTIF_EMI = '#7a5f2c';

const R_FACE = 10;             // bán kính mặt trống (đơn vị cảnh)
const H_DRUM = 8.2;
const FACE_Y = H_DRUM;

// ── Khung cảnh ───────────────────────────────────────────────
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0e0c');
scene.fog = new THREE.FogExp2('#0b0e0c', 0.012);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 300);
camera.position.set(0, 46, 34);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, FACE_Y, 0);
controls.minDistance = 4.5;
controls.maxDistance = 55;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = 1.35;
controls.enablePan = false;

// Ánh sáng bảo tàng: spot ấm từ trên + viền lạnh + nền mờ
scene.add(new THREE.HemisphereLight('#8fa3a0', '#141a16', 0.85));
const key = new THREE.SpotLight('#ffe2b0', 1500, 120, 0.75, 0.5);
key.position.set(14, 42, 18);
key.target.position.set(0, FACE_Y, 0);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#5f8fb0', 0.7);
rim.position.set(-30, 14, -24);
scene.add(rim);

// sàn mờ phản chiếu nhẹ
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(90, 48),
  new THREE.MeshStandardMaterial({ color: '#101512', roughness: 0.9, metalness: 0.1 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ── Thân trống: LatheGeometry theo dáng Đông Sơn ─────────────
// (tang phình – thân trụ đứng – chân hình nón cụt hơi choãi, theo mô tả
//  của Cục Di sản văn hóa; tỷ lệ mặt 79,3cm / chân 80cm / cao 63cm)
const profile = [
  [0.0, 0],      // tâm đáy (hở)
  [10.1, 0],     // mép chân (chân 80cm ≈ mặt 79,3cm)
  [9.6, 1.7],    // chân nón cụt choãi
  [8.35, 3.1],   // eo — thân trụ đứng
  [8.35, 5.2],
  [9.9, 6.6],    // tang phình
  [10.35, 7.5],
  [10.0, 8.2],   // vai lên mặt
];
const bodyGeo = new THREE.LatheGeometry(
  profile.map(([r, y]) => new THREE.Vector2(r, y)), 96
);
const bronzeMat = new THREE.MeshStandardMaterial({
  color: BRONZE, metalness: 0.55, roughness: 0.52, flatShading: false,
});
const body = new THREE.Mesh(bodyGeo, bronzeMat);
body.castShadow = true;
body.receiveShadow = true;
scene.add(body);

// mặt trống
const face = new THREE.Mesh(
  new THREE.CircleGeometry(R_FACE, 96),
  new THREE.MeshStandardMaterial({ color: BRONZE, metalness: 0.6, roughness: 0.48 })
);
face.rotation.x = -Math.PI / 2;
face.position.y = FACE_Y;
face.receiveShadow = true;
scene.add(face);

// gờ mép mặt
const lip = new THREE.Mesh(
  new THREE.TorusGeometry(R_FACE, 0.16, 10, 96),
  bronzeMat
);
lip.rotation.x = Math.PI / 2;
lip.position.y = FACE_Y;
scene.add(lip);

// ── Vật liệu hoa văn ─────────────────────────────────────────
const motifMat = new THREE.MeshStandardMaterial({
  color: MOTIF, metalness: 0.65, roughness: 0.4,
  emissive: MOTIF_EMI, emissiveIntensity: 0.12,
});
const motifDim = new THREE.MeshStandardMaterial({
  color: '#8a9282', metalness: 0.6, roughness: 0.5,
  emissive: '#3a4034', emissiveIntensity: 0.08,
});

function extrudeFlat(shape, depth = 0.14, mat = motifMat) {
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // nằm phẳng trên mặt, nổi lên trên
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

// ── Ngôi sao 14 cánh + núm đánh trống ────────────────────────
function starShape(n, rOut, rIn) {
  const s = new THREE.Shape();
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? rOut : rIn;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
  }
  return s;
}
const star = extrudeFlat(starShape(14, 2.05, 0.95), 0.2);
star.position.y = FACE_Y + 0.02;
star.name = 'star';
scene.add(star);
const knob = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 14), motifMat);
knob.scale.y = 0.45;
knob.position.y = FACE_Y + 0.16;
scene.add(knob);

// ── Các hình chạm khắc (phỏng theo, tối giản hóa) ────────────
function shapeFrom(points) {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  return s;
}

// chim mỏ dài đang bay (hình tượng quen gọi "chim Lạc")
const birdFly = () => shapeFrom([
  [1.45, 0.1], [0.72, 0.3], [0.95, 0.62], [0.55, 0.56], [0.28, 0.36],
  [-0.05, 0.82], [-0.42, 0.66], [-0.25, 0.3], [-0.85, 0.42], [-1.35, 0.32],
  [-1.05, 0.08], [-0.45, 0.02], [0.2, -0.1], [1.4, 0.0],
]);

// chim mỏ dài đứng
const birdStand = () => shapeFrom([
  [0.55, 0.75], [0.2, 0.55], [0.12, 0.3], [-0.25, 0.42], [-0.5, 0.28],
  [-0.32, 0.12], [0.05, 0.06], [0.02, -0.25], [0.12, -0.25], [0.16, 0.02],
  [0.3, 0.0], [0.32, -0.25], [0.42, -0.25], [0.4, 0.1], [0.6, 0.62],
]);

// hươu đang đi
const deer = () => shapeFrom([
  [0.75, 0.45], [0.9, 0.75], [0.98, 0.55], [1.1, 0.9], [1.02, 0.5],
  [0.86, 0.32], [0.5, 0.3], [-0.45, 0.34], [-0.72, 0.18], [-0.62, -0.3],
  [-0.52, -0.3], [-0.5, 0.0], [-0.2, 0.1], [0.12, 0.06], [0.16, -0.3],
  [0.28, -0.3], [0.32, 0.1], [0.6, 0.12],
]);

// người hóa trang lông chim nhảy múa (tối giản)
const dancer = () => shapeFrom([
  [0.0, 0.95], [0.3, 0.8], [0.55, 0.9], [0.4, 0.6], [0.2, 0.5],
  [0.35, 0.2], [0.2, -0.05], [0.28, -0.4], [0.14, -0.4], [0.05, -0.05],
  [-0.05, -0.05], [-0.14, -0.4], [-0.28, -0.4], [-0.2, -0.05], [-0.35, 0.2],
  [-0.2, 0.5], [-0.4, 0.6], [-0.55, 0.9], [-0.3, 0.8],
]);

// nhà sàn mái cong hai đầu
const house = () => shapeFrom([
  [-0.95, 0.5], [-0.6, 0.72], [0.6, 0.72], [0.95, 0.5], [0.75, 0.42],
  [0.55, 0.5], [-0.55, 0.5], [-0.75, 0.42],
]);
const housePosts = () => shapeFrom([
  [-0.55, 0.42], [0.55, 0.42], [0.55, 0.3], [0.3, 0.3], [0.3, -0.2],
  [0.2, -0.2], [0.2, 0.3], [-0.2, 0.3], [-0.2, -0.2], [-0.3, -0.2],
  [-0.3, 0.3], [-0.55, 0.3],
]);

// ── Vành hoa văn: cấu hình + thông tin đã kiểm chứng ─────────
const SRC_DSVH = 'Cục Di sản văn hóa (dsvh.gov.vn) · Bảo tàng Lịch sử quốc gia';
const SRC_BDT = 'Báo Dân tộc & Phát triển (Ủy ban Dân tộc), 2021';

const rings = []; // { group, r, dir, speed, act, name, title, body, src, zoom: [min,max] khoảng cách camera }

function makeRing({ r, count, build, dir = -1, speed = 0.1, tangential = true }) {
  const group = new THREE.Group();
  group.position.y = FACE_Y;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const holder = new THREE.Group();
    const m = build(i);
    holder.add(m);
    holder.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r);
    if (tangential) holder.rotation.y = -a + (dir < 0 ? Math.PI : 0);
    group.add(holder);
  }
  scene.add(group);
  return group;
}

// vành phân cách: vòng tròn nổi mảnh
function separator(r) {
  const t = new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.055, 8, 128),
    motifDim
  );
  t.rotation.x = Math.PI / 2;
  t.position.y = FACE_Y + 0.02;
  scene.add(t);
}
[2.7, 4.0, 5.9, 7.15, 8.85, 9.55].forEach(separator);

// văn răng cưa (vành ngoài cùng)
{
  const g = new THREE.Group();
  g.position.y = FACE_Y;
  const n = 96;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const tri = extrudeFlat(shapeFrom([[-0.14, 0], [0.14, 0], [0, 0.3]]), 0.08, motifDim);
    tri.position.set(Math.cos(a) * 9.2, 0.02, Math.sin(a) * 9.2);
    tri.rotation.y = -a + Math.PI / 2;
    g.add(tri);
  }
  scene.add(g);
}

// vòng tròn chấm giữa có tiếp tuyến (vành hình học trong)
{
  const g = new THREE.Group();
  g.position.y = FACE_Y;
  const n = 36;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 16), motifDim);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(Math.cos(a) * 3.35, 0.03, Math.sin(a) * 3.35);
    g.add(ring);
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 8), motifDim);
    dot.position.copy(ring.position);
    g.add(dot);
  }
  scene.add(g);
}

// ── VÀNH 1 · Sao & tâm trống ─────────────────────────────────
rings.push({
  group: null, act: 0, zoom: [0, 8.5],
  name: 'Tâm mặt trống',
  title: 'Ngôi sao 14 cánh',
  body: 'Chính giữa mặt trống đúc nổi ngôi sao 14 cánh bao quanh núm tròn — nơi nghệ nhân xưa gõ chày khi đánh trống. Xen giữa các cánh sao là họa tiết hình lông công. Nhiều nhà nghiên cứu xem mặt trời ở tâm trống là hình tượng trung tâm của tín ngưỡng cư dân nông nghiệp Đông Sơn.',
  src: SRC_DSVH,
});

// ── VÀNH 2 · Người — cảnh sinh hoạt (2 nửa đối xứng) ─────────
{
  const group = new THREE.Group();
  group.position.y = FACE_Y;
  const R = 5.0;
  const pounders = [];
  for (const half of [0, Math.PI]) {
    const put = (angleOff, mesh, scale = 0.72) => {
      const holder = new THREE.Group();
      mesh.scale.setScalar(scale);
      holder.add(mesh);
      const a = half + angleOff;
      holder.position.set(Math.cos(a) * R, 0.02, Math.sin(a) * R);
      holder.rotation.y = -a + Math.PI;
      group.add(holder);
      return holder;
    };
    put(0.25, extrudeFlat(dancer(), 0.12));
    put(0.62, extrudeFlat(dancer(), 0.12));
    put(0.99, extrudeFlat(dancer(), 0.12));
    // nhà sàn mái cong
    put(1.5, extrudeFlat(house(), 0.12), 0.95);
    put(1.5, extrudeFlat(housePosts(), 0.1), 0.95);
    // giã gạo chày đôi: hai người + chày chuyển động
    const pg = new THREE.Group();
    const f1 = extrudeFlat(dancer(), 0.1, motifDim);
    f1.scale.setScalar(0.5);
    f1.position.x = -0.42;
    const f2 = extrudeFlat(dancer(), 0.1, motifDim);
    f2.scale.setScalar(0.5);
    f2.position.x = 0.42;
    const pestle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), motifMat);
    pestle.position.y = 0.55;
    const mortar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.22, 8), motifMat);
    mortar.position.y = 0.11;
    pg.add(f1, f2, pestle, mortar);
    const holder = put(2.05, pg, 0.9);
    pounders.push(pestle);
    // trống nhỏ
    const dr = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.34, 10), motifMat);
    dr.position.y = 0.17;
    put(2.5, dr, 0.85);
  }
  scene.add(group);
  rings.push({
    group, act: 0, zoom: [8.5, 13.5], pounders,
    name: 'Vành cảnh sinh hoạt',
    title: 'Lễ hội của cư dân Đông Sơn',
    body: 'Vành hoa văn người khắc họa cảnh sinh hoạt — lễ hội: người hóa trang lông chim nhảy múa, người giã gạo chày đôi, người đánh trống, nhà sàn mái cong. Đây là "thước phim" hiếm hoi về đời sống vật chất và tinh thần của tổ tiên hơn hai nghìn năm trước.',
    src: SRC_DSVH,
  });
}

// ── VÀNH 3 · Hươu & chim xen kẽ ──────────────────────────────
{
  const group = makeRing({
    r: 6.55, count: 20, dir: 1, speed: 0.06,
    build: (i) => {
      const m = i % 2 === 0
        ? extrudeFlat(deer(), 0.12)
        : extrudeFlat(birdStand(), 0.12, motifDim);
      m.scale.setScalar(i % 2 === 0 ? 0.62 : 0.55);
      return m;
    },
  });
  rings.push({
    group, act: 0, dir: 1, speed: 0.045, zoom: [13.5, 19],
    name: 'Vành muông thú',
    title: 'Hươu đi cùng đàn chim',
    body: 'Vành hoa văn khắc hình hươu đang đi, xen giữa là chim mỏ ngắn bay và chim mỏ dài đứng — thế giới tự nhiên gần gũi của cư dân trồng lúa nước ven sông Hồng thời Đông Sơn.',
    src: SRC_DSVH,
  });
}

// ── VÀNH 4 · Chim mỏ dài bay (vành ngoài) ────────────────────
{
  const group = makeRing({
    r: 8.0, count: 18, dir: -1, speed: 0.08,
    build: () => {
      const m = extrudeFlat(birdFly(), 0.14);
      m.scale.setScalar(0.78);
      return m;
    },
  });
  rings.push({
    group, act: 0, dir: -1, speed: 0.06, zoom: [19, 27],
    name: 'Vành ngoài',
    title: 'Đàn chim mỏ dài tung cánh',
    body: 'Vành ngoài cùng của các băng hình là đàn chim mỏ dài đang bay — hình tượng quen thuộc thường được gọi là "chim Lạc", đã trở thành biểu tượng của văn hóa Đông Sơn và của chính trống đồng Ngọc Lũ.',
    src: SRC_DSVH,
  });
}

// ── VÀNH 5 · Toàn cảnh — thông tin bảo vật ───────────────────
rings.push({
  group: null, act: 0, zoom: [27, 99],
  name: 'Bảo vật quốc gia · đợt 1',
  title: 'Trống đồng Ngọc Lũ',
  body: 'Niên đại 2.500–2.000 năm, đỉnh cao của nghệ thuật đúc đồng Đông Sơn. Phát hiện năm 1893 khi đắp đê tại xã Như Trác, huyện Nam Xang (nay thuộc Lý Nhân, Hà Nam), từng được thờ tại đình làng Ngọc Lũ. Mặt trống đường kính 79,3cm, cao 63cm, nặng 86kg; 16 vành hoa văn. Công nhận Bảo vật quốc gia đợt 1 theo Quyết định 1426/QĐ-TTg ngày 01/10/2012. Hiện lưu giữ tại Bảo tàng Lịch sử quốc gia.',
  src: SRC_DSVH + ' · ' + SRC_BDT,
});

// ── Thẻ thông tin ────────────────────────────────────────────
const card = document.getElementById('card');
const cardRing = document.getElementById('card-ring');
const cardTitle = document.getElementById('card-title');
const cardBody = document.getElementById('card-body');
const cardSrc = document.getElementById('card-src');
let activeRing = -1;

function showRing(i) {
  if (i === activeRing) return;
  activeRing = i;
  const r = rings[i];
  card.classList.remove('show');
  setTimeout(() => {
    cardRing.textContent = r.name;
    cardTitle.textContent = r.title;
    cardBody.textContent = r.body;
    cardSrc.textContent = 'Nguồn: ' + r.src;
    card.classList.add('show');
  }, 260);
}

// ── Tiếng trống (WebAudio tổng hợp — không dùng bản thu) ─────
let audioCtx = null;
function drumHit() {
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
  const t0 = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, t0);
  osc.frequency.exponentialRampToValueAtTime(48, t0 + 0.5);
  gain.gain.setValueAtTime(0.9, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + 1.7);
  // tiếng "đồng" ngân
  const osc2 = audioCtx.createOscillator();
  const g2 = audioCtx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.value = 219;
  g2.gain.setValueAtTime(0.18, t0);
  g2.gain.exponentialRampToValueAtTime(0.001, t0 + 2.4);
  osc2.connect(g2).connect(audioCtx.destination);
  osc2.start(t0);
  osc2.stop(t0 + 2.5);
}

// sóng âm lan trên mặt trống khi đánh
const waves = [];
function soundWave() {
  const w = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.08, 8, 64),
    new THREE.MeshBasicMaterial({ color: MOTIF, transparent: true, opacity: 0.8 })
  );
  w.rotation.x = Math.PI / 2;
  w.position.y = FACE_Y + 0.1;
  scene.add(w);
  waves.push({ m: w, born: clock.elapsedTime });
}

let pulse = 0; // hoa văn rung theo tiếng trống

const raycaster = new THREE.Raycaster();
addEventListener('pointerdown', (e) => {
  const v = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(v, camera);
  if (raycaster.intersectObjects([star, knob], false).length) {
    drumHit();
    soundWave();
    pulse = 1;
  }
});

// ── Vòng lặp ─────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  const dist = camera.position.distanceTo(new THREE.Vector3(0, FACE_Y, 0));

  // vành nào "trong tầm" thì sống dậy
  let bestRing = rings.length - 1;
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    const inRange = dist >= r.zoom[0] && dist < r.zoom[1];
    if (inRange) bestRing = i;
    const target = inRange ? 1 : 0;
    r.act += (target - r.act) * Math.min(dt * 3, 1);
    if (r.group) {
      // xoay chậm quanh tâm + nhấc nhẹ khỏi mặt đồng
      if (r.dir) r.group.rotation.y += r.dir * (r.speed ?? 0.05) * r.act * dt * 2;
      r.group.position.y = FACE_Y + r.act * 0.22;
    }
    // chày giã gạo nhịp nhàng khi vành người thức dậy
    if (r.pounders) {
      for (const p of r.pounders) {
        p.position.y = 0.55 + Math.max(Math.sin(t * 5.2), 0) * 0.28 * r.act;
      }
    }
  }
  showRing(bestRing);

  // hoa văn rung khi đánh trống
  if (pulse > 0.001) {
    pulse *= Math.exp(-dt * 3.2);
    const s = 1 + pulse * 0.05 * Math.sin(t * 30);
    star.scale.setScalar(s);
  }

  // sóng âm lan
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    const a = (t - w.born) / 1.4;
    if (a >= 1) {
      scene.remove(w.m);
      waves.splice(i, 1);
      continue;
    }
    w.m.scale.setScalar(1 + a * 8.5);
    w.m.material.opacity = 0.8 * (1 - a);
  }

  // ánh emissive hoa văn thở rất nhẹ
  motifMat.emissiveIntensity = 0.12 + Math.sin(t * 0.8) * 0.04 + pulse * 0.5;

  controls.update();
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

window.__dbg = () => ({
  dist: camera.position.distanceTo(new THREE.Vector3(0, FACE_Y, 0)),
  activeRing,
  frame: renderer.info.render.frame,
});

animate();
