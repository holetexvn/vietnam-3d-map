// Trống đồng Ngọc Lũ — phiên bản tả thực (v2)
// Mặt trống: hoa văn KHẮC CHÌM từ bản vẽ vector (Ebaychatter0 / Wikimedia
// Commons, CC BY-SA 3.0) — riêng ngôi sao vẽ lại 14 cánh đúng mô tả của
// Cục Di sản văn hóa (bản SVG gốc vẽ sai 12 cánh), thêm các vành hình học
// (vòng tròn chấm tiếp tuyến, văn răng cưa) dựng bằng code.
// Chất liệu: đồng patin xanh ngả xám, PBR + môi trường phản xạ.
// Nguồn thông tin: dsvh.gov.vn · Bảo tàng LSQG · Báo Dân tộc & Phát triển.
import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

const R_FACE = 10;
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
renderer.toneMappingExposure = 1.12;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0e0c');
scene.fog = new THREE.FogExp2('#0b0e0c', 0.011);

// môi trường phản xạ — kim loại mới "thật"
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 300);
camera.position.set(0, 44, 33);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, FACE_Y, 0);
controls.minDistance = 4.5;
controls.maxDistance = 55;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = 1.35;
controls.enablePan = false;

scene.add(new THREE.HemisphereLight('#8fa3a0', '#141a16', 0.5));
const key = new THREE.SpotLight('#ffe2b0', 1400, 120, 0.75, 0.55);
key.position.set(14, 42, 18);
key.target.position.set(0, FACE_Y, 0);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#5f8fb0', 0.55);
rim.position.set(-30, 14, -24);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(90, 48),
  new THREE.MeshStandardMaterial({ color: '#101512', roughness: 0.92, metalness: 0.05 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ── Texture patin đồng (thủ tục — lốm đốm oxi hóa) ───────────
function patinaBase(ctx2d, S) {
  ctx2d.fillStyle = '#59695f';
  ctx2d.fillRect(0, 0, S, S);
  const tones = ['#4e6058', '#63756a', '#556a66', '#6d7a68', '#5d6a52', '#4a5a56', '#71806f'];
  for (let i = 0; i < 4200; i++) {
    ctx2d.fillStyle = tones[(Math.random() * tones.length) | 0];
    ctx2d.globalAlpha = 0.05 + Math.random() * 0.1;
    const r = 2 + Math.random() * (S * 0.02);
    ctx2d.beginPath();
    ctx2d.arc(Math.random() * S, Math.random() * S, r, 0, Math.PI * 2);
    ctx2d.fill();
  }
  // vết đồng lộ ánh kim + gỉ nâu
  for (let i = 0; i < 700; i++) {
    ctx2d.fillStyle = Math.random() < 0.55 ? '#7d8a6e' : '#6a5c48';
    ctx2d.globalAlpha = 0.05 + Math.random() * 0.08;
    const r = 1 + Math.random() * (S * 0.006);
    ctx2d.beginPath();
    ctx2d.arc(Math.random() * S, Math.random() * S, r, 0, Math.PI * 2);
    ctx2d.fill();
  }
  ctx2d.globalAlpha = 1;
}

// ── Dựng texture MẶT TRỐNG: patin + hoa văn khắc chìm ────────
const svgImg = new Image();
svgImg.src = 'assets/ngoclu-face.svg';

function buildFaceTextures() {
  const S = 4096;
  const cx = S / 2;
  const R = S * 0.478; // mép hoa văn cách mép mặt một chút

  // lớp hoa văn (đen trên trong suốt) — dùng chung cho albedo lẫn bump
  const pat = document.createElement('canvas');
  pat.width = pat.height = S;
  const p = pat.getContext('2d');

  // 1) bản vẽ vector (chim bay, chim đứng, người múa) — phần chính xác nhất
  const svgR = R * 0.985;
  p.drawImage(svgImg, cx - svgR, cx - svgR, svgR * 2, svgR * 2);

  // 2) che ngôi sao 12 cánh sai của bản vẽ
  p.globalCompositeOperation = 'destination-out';
  p.beginPath();
  p.arc(cx, cx, R * 0.315, 0, Math.PI * 2);
  p.fill();
  p.globalCompositeOperation = 'source-over';

  // 3) NGÔI SAO 14 CÁNH đúng mô tả Cục Di sản văn hóa — đúc NỔI,
  //    nên chỉ vẽ đường viền vào lớp khắc; phần nổi xử lý riêng bên dưới
  const rOut = R * 0.29, rIn = R * 0.135;
  const starPath = (ctx2d) => {
    ctx2d.beginPath();
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? rOut : rIn;
      const x = cx + Math.cos(a) * r, y = cx + Math.sin(a) * r;
      i === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
    }
    ctx2d.closePath();
  };
  p.strokeStyle = '#000';
  p.fillStyle = '#000';
  p.lineWidth = S * 0.0022;
  starPath(p);
  p.stroke();
  // họa tiết lông công xen giữa các cánh sao (chấm + vạch tỏa)
  for (let i = 0; i < 14; i++) {
    const a = ((i + 0.5) / 14) * Math.PI * 2 - Math.PI / 2;
    const rr = rIn + (rOut - rIn) * 0.62;
    const x = cx + Math.cos(a) * rr, y = cx + Math.sin(a) * rr;
    p.beginPath();
    p.arc(x, y, S * 0.006, 0, Math.PI * 2);
    p.fill();
  }
  // vòng quanh sao
  p.lineWidth = S * 0.0022;
  p.beginPath();
  p.arc(cx, cx, R * 0.315, 0, Math.PI * 2);
  p.stroke();

  // 4) các vành hình học dựng bằng code (đúng loại hoa văn theo dsvh.gov.vn)
  const circle = (r, w) => {
    p.lineWidth = w;
    p.beginPath();
    p.arc(cx, cx, r, 0, Math.PI * 2);
    p.stroke();
  };
  // vòng phân băng
  [0.36, 0.5, 0.545, 0.665, 0.71, 0.875, 0.92].forEach((f) => circle(R * f, S * 0.0018));
  // vòng tròn chấm giữa có tiếp tuyến (hai vành)
  for (const f of [0.525, 0.895]) {
    const rr = R * f, n = Math.round(90 * f);
    p.lineWidth = S * 0.0013;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * rr, y = cx + Math.sin(a) * rr;
      p.beginPath();
      p.arc(x, y, S * 0.0052, 0, Math.PI * 2);
      p.stroke();
      p.beginPath();
      p.arc(x, y, S * 0.0012, 0, Math.PI * 2);
      p.fill();
    }
  }
  // văn răng cưa (vành ngoài cùng, hai lớp răng đối đỉnh)
  {
    const rr = R * 0.955, h = R * 0.028, n = 180;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
      p.beginPath();
      p.moveTo(cx + Math.cos(a0) * rr, cx + Math.sin(a0) * rr);
      p.lineTo(cx + Math.cos(am) * (rr + h), cx + Math.sin(am) * (rr + h));
      p.lineTo(cx + Math.cos(a1) * rr, cx + Math.sin(a1) * rr);
      p.closePath();
      p.fill();
      p.beginPath();
      p.moveTo(cx + Math.cos(a0) * (rr + h * 2), cx + Math.sin(a0) * (rr + h * 2));
      p.lineTo(cx + Math.cos(am) * (rr + h), cx + Math.sin(am) * (rr + h));
      p.lineTo(cx + Math.cos(a1) * (rr + h * 2), cx + Math.sin(a1) * (rr + h * 2));
      p.closePath();
      p.fill();
    }
  }

  // ALBEDO: patin + hoa văn hằn màu đồng sẫm
  const albedo = document.createElement('canvas');
  albedo.width = albedo.height = S;
  const a2 = albedo.getContext('2d');
  patinaBase(a2, S);
  a2.globalAlpha = 0.78;
  a2.drawImage(pat, 0, 0);
  a2.globalAlpha = 1;
  // sao nổi: mặt đồng lộ sáng hơn nền patin (bị chạm tay/đánh bóng qua thời gian)
  a2.fillStyle = '#75846f';
  starPath(a2);
  a2.fill();
  a2.strokeStyle = 'rgba(20,26,22,0.55)';
  a2.lineWidth = S * 0.0022;
  starPath(a2);
  a2.stroke();

  // BUMP: nền xám + rãnh khắc tối (lõm xuống)
  const bump = document.createElement('canvas');
  bump.width = bump.height = S;
  const b2 = bump.getContext('2d');
  b2.fillStyle = '#8a8a8a';
  b2.fillRect(0, 0, S, S);
  // nhám bề mặt nhẹ
  for (let i = 0; i < 2600; i++) {
    b2.fillStyle = Math.random() < 0.5 ? '#7f7f7f' : '#949494';
    b2.globalAlpha = 0.25;
    b2.beginPath();
    b2.arc(Math.random() * S, Math.random() * S, 1 + Math.random() * 20, 0, Math.PI * 2);
    b2.fill();
  }
  b2.globalAlpha = 0.95;
  b2.drawImage(pat, 0, 0);
  b2.globalAlpha = 1;
  // sao ĐÚC NỔI: sáng = cao trong bump map
  b2.fillStyle = '#e6e6e6';
  starPath(b2);
  b2.fill();

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tAlbedo = new THREE.CanvasTexture(albedo);
  tAlbedo.colorSpace = THREE.SRGBColorSpace;
  tAlbedo.anisotropy = maxAniso;
  const tBump = new THREE.CanvasTexture(bump);
  tBump.anisotropy = maxAniso;
  return { tAlbedo, tBump };
}

// ── Texture THÂN trống ───────────────────────────────────────
function buildBodyTextures() {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  patinaBase(g, W);
  // các băng ngang mờ gợi những vành hoa văn tang/thân
  g.strokeStyle = '#39463f';
  for (const fy of [0.18, 0.24, 0.3, 0.55, 0.6, 0.82, 0.87]) {
    g.globalAlpha = 0.5;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(0, H * fy);
    g.lineTo(W, H * fy);
    g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

// ── Dựng trống ───────────────────────────────────────────────
const profile = [
  [0.0, 0], [10.1, 0], [9.6, 1.7], [8.35, 3.1], [8.35, 5.2],
  [9.9, 6.6], [10.35, 7.5], [10.0, 8.2],
];

let face, body, knob;

function buildDrum() {
  const { tAlbedo, tBump } = buildFaceTextures();
  const tBody = buildBodyTextures();

  const faceMat = new THREE.MeshPhysicalMaterial({
    map: tAlbedo,
    bumpMap: tBump,
    bumpScale: 3.2,            // nét tối = khắc CHÌM, sao sáng = đúc NỔI
    metalness: 0.72,
    roughness: 0.46,
    clearcoat: 0.18,
    clearcoatRoughness: 0.5,
    envMapIntensity: 0.85,
  });
  face = new THREE.Mesh(new THREE.CircleGeometry(R_FACE, 128), faceMat);
  face.rotation.x = -Math.PI / 2;
  face.position.y = FACE_Y;
  face.receiveShadow = true;
  scene.add(face);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: tBody,
    metalness: 0.68,
    roughness: 0.5,
    clearcoat: 0.12,
    clearcoatRoughness: 0.55,
    envMapIntensity: 0.75,
  });
  body = new THREE.Mesh(
    new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 128),
    bodyMat
  );
  body.castShadow = true;
  body.receiveShadow = true;
  scene.add(body);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(R_FACE, 0.16, 12, 128), bodyMat);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = FACE_Y;
  scene.add(lip);

  // núm đánh trống nổi giữa mặt (mặt trời)
  knob = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), bodyMat);
  knob.scale.y = 0.38;
  knob.position.y = FACE_Y + 0.1;
  scene.add(knob);
}

// ── Vành thông tin (kiểm chứng nguồn nhà nước) ───────────────
const SRC_DSVH = 'Cục Di sản văn hóa (dsvh.gov.vn) · Bảo tàng Lịch sử quốc gia';
const SRC_BDT = 'Báo Dân tộc & Phát triển (Ủy ban Dân tộc), 2021';

const rings = [
  {
    act: 0, zoom: [0, 8.5], r: 0,
    name: 'Tâm mặt trống',
    title: 'Ngôi sao 14 cánh',
    body: 'Chính giữa mặt trống đúc nổi ngôi sao 14 cánh quanh núm tròn — nơi gõ chày khi đánh trống; xen giữa các cánh sao là họa tiết hình lông công. Bản vẽ tham khảo thể hiện sao 12 cánh đã được hiệu chỉnh lại đúng 14 cánh theo hồ sơ bảo vật.',
    src: SRC_DSVH,
  },
  {
    act: 0, zoom: [8.5, 13.5], r: 4.35,
    name: 'Vành cảnh sinh hoạt',
    title: 'Người hóa trang lông chim',
    body: 'Vành trong khắc cảnh sinh hoạt — lễ hội của cư dân Đông Sơn: người hóa trang lông chim nhảy múa, người giã gạo chày đôi, người đánh trống, nhà sàn mái cong (mô phỏng thể hiện giản lược một số hoạt cảnh).',
    src: SRC_DSVH,
  },
  {
    act: 0, zoom: [13.5, 19], r: 5.8,
    name: 'Vành muông thú',
    title: 'Hươu và đàn chim',
    body: 'Băng hình giữa của trống khắc hươu đang đi cùng chim mỏ ngắn bay và chim mỏ dài đứng — thiên nhiên quen thuộc của cư dân trồng lúa nước châu thổ sông Hồng.',
    src: SRC_DSVH,
  },
  {
    act: 0, zoom: [19, 27], r: 7.5,
    name: 'Vành ngoài',
    title: 'Đàn chim mỏ dài tung cánh',
    body: 'Vành ngoài là đàn chim mỏ dài đang bay ngược chiều kim đồng hồ — hình tượng quen gọi là "chim Lạc", biểu tượng của văn hóa Đông Sơn. Hình chim trong mô phỏng lấy theo bản vẽ khảo cổ, giữ nguyên dáng mỏ dài, mào dài và cánh xòe đặc trưng.',
    src: SRC_DSVH,
  },
  {
    act: 0, zoom: [27, 99], r: -1,
    name: 'Bảo vật quốc gia · đợt 1',
    title: 'Trống đồng Ngọc Lũ',
    body: 'Niên đại 2.500–2.000 năm — đỉnh cao nghệ thuật đúc đồng Đông Sơn. Phát hiện năm 1893 khi đắp đê tại xã Như Trác, huyện Nam Xang (nay thuộc Lý Nhân, Hà Nam). Mặt trống 79,3cm, cao 63cm, nặng 86kg, 16 vành hoa văn. Bảo vật quốc gia đợt 1 — Quyết định 1426/QĐ-TTg, 01/10/2012. Lưu giữ tại Bảo tàng Lịch sử quốc gia.',
    src: SRC_DSVH + ' · ' + SRC_BDT,
  },
];

// vầng sáng ấm ôm lấy vành đang xem
const halos = rings.map((rg) => {
  if (rg.r <= 0) return null;
  const h = new THREE.Mesh(
    new THREE.TorusGeometry(rg.r, 0.3, 8, 128),
    new THREE.MeshBasicMaterial({
      color: '#ffd9a0', transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  h.rotation.x = Math.PI / 2;
  h.position.y = FACE_Y + 0.06;
  h.scale.setScalar(1);
  scene.add(h);
  return h;
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

// ── Tiếng trống (WebAudio tổng hợp) ──────────────────────────
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

const waves = [];
function soundWave() {
  const w = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.06, 8, 64),
    new THREE.MeshBasicMaterial({
      color: '#ffd9a0', transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  w.rotation.x = Math.PI / 2;
  w.position.y = FACE_Y + 0.08;
  scene.add(w);
  waves.push({ m: w, born: clock.elapsedTime });
}

const raycaster = new THREE.Raycaster();
addEventListener('pointerdown', (e) => {
  if (!face) return;
  const v = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(v, camera);
  const hit = raycaster.intersectObject(face, false)[0];
  if (hit && hit.point.distanceTo(new THREE.Vector3(0, FACE_Y, 0)) < 3.2) {
    drumHit();
    soundWave();
  }
});

// ── Vòng lặp ─────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  const dist = camera.position.distanceTo(new THREE.Vector3(0, FACE_Y, 0));
  let best = rings.length - 1;
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    const inRange = dist >= r.zoom[0] && dist < r.zoom[1];
    if (inRange) best = i;
    r.act += ((inRange ? 1 : 0) - r.act) * Math.min(dt * 3, 1);
    const halo = halos[i];
    if (halo) {
      halo.material.opacity = r.act * (0.16 + Math.sin(t * 1.6) * 0.05);
    }
  }
  showRing(best);

  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    const a = (t - w.born) / 1.4;
    if (a >= 1) {
      scene.remove(w.m);
      waves.splice(i, 1);
      continue;
    }
    w.m.scale.setScalar(1 + a * 8.5);
    w.m.material.opacity = 0.7 * (1 - a);
  }

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

svgImg.onload = () => {
  buildDrum();
  animate();
};
svgImg.onerror = () => {
  console.error('Không tải được bản vẽ hoa văn');
  buildDrum();
  animate();
};
