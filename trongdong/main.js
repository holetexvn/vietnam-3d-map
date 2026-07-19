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

// ═══ THƯ VIỆN HÌNH KHẮC (phỏng dáng khảo cổ, tối giản hóa) ═══
// Mỗi motif là hàm vẽ lên "path sink" (THREE.Shape và Path2D dùng chung
// API moveTo/lineTo/quadraticCurveTo) → một bộ nét cho cả texture khắc
// lẫn tượng đồng 3D khi soi cận cảnh.

// Hươu — thân dài, chân mảnh, gạc lớn vắt về sau (dáng trống Ngọc Lũ)
function drawDeerBody(p) {
  p.moveTo(-1.1, 0.08);
  p.lineTo(-0.98, 0.34);
  p.quadraticCurveTo(-0.5, 0.44, 0.2, 0.4);
  p.quadraticCurveTo(0.55, 0.38, 0.78, 0.5);
  p.lineTo(0.92, 0.88);
  p.lineTo(1.02, 0.86);
  p.lineTo(1.3, 0.92);
  p.lineTo(1.28, 0.8);
  p.lineTo(1.02, 0.72);
  p.lineTo(0.92, 0.42);
  p.lineTo(0.7, 0.26);
  p.lineTo(0.66, -0.5);
  p.lineTo(0.56, -0.5);
  p.lineTo(0.54, 0.05);
  p.lineTo(0.44, 0.03);
  p.lineTo(0.42, -0.5);
  p.lineTo(0.32, -0.5);
  p.lineTo(0.3, 0.14);
  p.quadraticCurveTo(-0.1, 0.2, -0.42, 0.14);
  p.lineTo(-0.44, -0.5);
  p.lineTo(-0.54, -0.5);
  p.lineTo(-0.56, 0.1);
  p.lineTo(-0.68, 0.08);
  p.lineTo(-0.7, -0.5);
  p.lineTo(-0.8, -0.5);
  p.lineTo(-0.82, 0.12);
  p.closePath();
}
// gạc hươu — hai nhánh răng cưa vắt về sau
function drawDeerAntler(p) {
  p.moveTo(0.94, 0.9);
  p.lineTo(0.55, 1.35);
  p.lineTo(0.68, 1.36);
  p.lineTo(0.42, 1.62);
  p.lineTo(0.58, 1.63);
  p.lineTo(0.3, 1.9);
  p.lineTo(0.52, 1.88);
  p.lineTo(0.86, 1.5);
  p.lineTo(1.0, 1.52);
  p.lineTo(1.3, 1.86);
  p.lineTo(1.5, 1.88);
  p.lineTo(1.24, 1.6);
  p.lineTo(1.4, 1.6);
  p.lineTo(1.14, 1.34);
  p.lineTo(1.27, 1.32);
  p.lineTo(1.02, 0.92);
  p.closePath();
}
const DEER = { shapes: [drawDeerBody, drawDeerAntler], span: 2.6 };

// Chim mỏ dài bay ("chim Lạc") — mỏ chúc, mào dài, cánh xòe, đuôi dài
function drawBirdFly(p) {
  p.moveTo(1.75, -0.05);
  p.quadraticCurveTo(1.1, 0.12, 0.72, 0.22);
  p.quadraticCurveTo(0.95, 0.5, 1.35, 0.6);
  p.lineTo(1.28, 0.68);
  p.quadraticCurveTo(0.82, 0.62, 0.55, 0.4);
  p.quadraticCurveTo(0.35, 0.55, 0.1, 0.6);
  p.lineTo(0.35, 0.9);
  p.lineTo(0.05, 1.25);
  p.lineTo(-0.12, 1.22);
  p.lineTo(0.08, 0.95);
  p.lineTo(-0.18, 0.68);
  p.quadraticCurveTo(-0.5, 0.7, -0.8, 0.55);
  p.lineTo(-1.55, 0.75);
  p.lineTo(-1.75, 0.65);
  p.lineTo(-1.0, 0.35);
  p.quadraticCurveTo(-0.6, 0.1, -0.15, 0.08);
  p.quadraticCurveTo(0.6, -0.05, 1.7, -0.12);
  p.closePath();
}
const BIRD_FLY = { shapes: [drawBirdFly], span: 3.5 };

// Chim mỏ dài đứng
function drawBirdStand(p) {
  p.moveTo(0.85, 1.15);
  p.quadraticCurveTo(0.5, 1.02, 0.3, 0.78);
  p.lineTo(-0.05, 0.95);
  p.lineTo(-0.35, 0.82);
  p.quadraticCurveTo(-0.12, 0.72, 0.08, 0.6);
  p.quadraticCurveTo(-0.3, 0.5, -0.42, 0.28);
  p.quadraticCurveTo(-0.2, 0.05, 0.12, 0.08);
  p.lineTo(0.08, -0.5);
  p.lineTo(0.16, -0.5);
  p.lineTo(0.22, 0.08);
  p.lineTo(0.3, 0.08);
  p.lineTo(0.36, -0.5);
  p.lineTo(0.44, -0.5);
  p.lineTo(0.42, 0.1);
  p.quadraticCurveTo(0.6, 0.3, 0.55, 0.6);
  p.quadraticCurveTo(0.75, 0.9, 0.9, 1.05);
  p.closePath();
}
const BIRD_STAND = { shapes: [drawBirdStand], span: 1.7 };

// Người hóa trang lông chim nhảy múa — mũ lông dài, tay vung, khố dài
function drawDancer(p) {
  p.moveTo(0.05, 1.05);
  p.quadraticCurveTo(0.5, 1.3, 0.95, 1.2);
  p.quadraticCurveTo(0.6, 1.05, 0.42, 0.9);
  p.lineTo(0.62, 0.78);
  p.lineTo(0.85, 0.82);
  p.lineTo(0.6, 0.62);
  p.lineTo(0.3, 0.66);
  p.lineTo(0.22, 0.5);
  p.lineTo(0.42, 0.2);
  p.lineTo(0.32, -0.05);
  p.lineTo(0.42, -0.55);
  p.lineTo(0.28, -0.55);
  p.lineTo(0.18, -0.1);
  p.lineTo(0.02, -0.1);
  p.lineTo(-0.12, -0.55);
  p.lineTo(-0.26, -0.55);
  p.lineTo(-0.16, 0.0);
  p.lineTo(-0.28, 0.2);
  p.lineTo(-0.5, 0.28);
  p.lineTo(-0.75, 0.2);
  p.lineTo(-0.9, 0.35);
  p.lineTo(-0.6, 0.45);
  p.lineTo(-0.35, 0.55);
  p.quadraticCurveTo(-0.5, 0.9, -0.85, 1.02);
  p.quadraticCurveTo(-0.35, 1.12, -0.08, 0.88);
  p.closePath();
}
const DANCER = { shapes: [drawDancer], span: 2.0 };

// Nhà sàn mái cong hai đầu (nhà cầu mùa)
function drawHouseRoof(p) {
  p.moveTo(-1.25, 0.62);
  p.quadraticCurveTo(-1.05, 0.98, -0.72, 1.05);
  p.quadraticCurveTo(0.0, 1.18, 0.72, 1.05);
  p.quadraticCurveTo(1.05, 0.98, 1.25, 0.62);
  p.lineTo(1.05, 0.58);
  p.quadraticCurveTo(0.8, 0.82, 0.4, 0.86);
  p.lineTo(-0.4, 0.86);
  p.quadraticCurveTo(-0.8, 0.82, -1.05, 0.58);
  p.closePath();
}
function drawHouseBody(p) {
  p.moveTo(-0.78, 0.84);
  p.lineTo(0.78, 0.84);
  p.lineTo(0.78, 0.3);
  p.lineTo(0.62, 0.3);
  p.lineTo(0.62, -0.35);
  p.lineTo(0.5, -0.35);
  p.lineTo(0.5, 0.3);
  p.lineTo(0.12, 0.3);
  p.lineTo(0.12, -0.35);
  p.lineTo(0.0, -0.35);
  p.lineTo(0.0, 0.3);
  p.lineTo(-0.5, 0.3);
  p.lineTo(-0.5, -0.35);
  p.lineTo(-0.62, -0.35);
  p.lineTo(-0.62, 0.3);
  p.lineTo(-0.78, 0.3);
  p.closePath();
}
const HOUSE = { shapes: [drawHouseRoof, drawHouseBody], span: 2.6 };

// Giã gạo chày đôi — hai người cầm chày, cối ở giữa
function drawPounderLeft(p) {
  p.moveTo(-0.72, 0.95);
  p.quadraticCurveTo(-0.55, 1.05, -0.42, 0.95);
  p.quadraticCurveTo(-0.32, 0.7, -0.42, 0.5);
  p.lineTo(-0.25, 0.55);
  p.lineTo(-0.15, 0.8);
  p.lineTo(-0.05, 0.76);
  p.lineTo(-0.15, 0.45);
  p.lineTo(-0.45, 0.32);
  p.lineTo(-0.5, 0.05);
  p.lineTo(-0.42, -0.5);
  p.lineTo(-0.55, -0.5);
  p.lineTo(-0.62, -0.05);
  p.lineTo(-0.78, -0.5);
  p.lineTo(-0.9, -0.5);
  p.lineTo(-0.75, 0.1);
  p.lineTo(-0.78, 0.5);
  p.quadraticCurveTo(-0.85, 0.8, -0.72, 0.95);
  p.closePath();
}
function drawPounderRight(p) {
  p.moveTo(0.72, 0.95);
  p.quadraticCurveTo(0.55, 1.05, 0.42, 0.95);
  p.quadraticCurveTo(0.32, 0.7, 0.42, 0.5);
  p.lineTo(0.25, 0.55);
  p.lineTo(0.15, 0.8);
  p.lineTo(0.05, 0.76);
  p.lineTo(0.15, 0.45);
  p.lineTo(0.45, 0.32);
  p.lineTo(0.5, 0.05);
  p.lineTo(0.42, -0.5);
  p.lineTo(0.55, -0.5);
  p.lineTo(0.62, -0.05);
  p.lineTo(0.78, -0.5);
  p.lineTo(0.9, -0.5);
  p.lineTo(0.75, 0.1);
  p.lineTo(0.78, 0.5);
  p.quadraticCurveTo(0.85, 0.8, 0.72, 0.95);
  p.closePath();
}
function drawPestle(p) {
  p.moveTo(-0.035, 0.85);
  p.lineTo(0.035, 0.85);
  p.lineTo(0.035, -0.2);
  p.lineTo(-0.035, -0.2);
  p.closePath();
}
function drawMortar(p) {
  p.moveTo(-0.2, -0.2);
  p.lineTo(0.2, -0.2);
  p.lineTo(0.14, -0.5);
  p.lineTo(-0.14, -0.5);
  p.closePath();
}
const POUNDING = { shapes: [drawPounderLeft, drawPounderRight, drawPestle, drawMortar], span: 2.0 };

// Ngôi sao 14 cánh (dùng lại cho tượng 3D)
function drawStar14(p) {
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 1.45 : 0.68;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  p.closePath();
}
const STAR14 = { shapes: [drawStar14], span: 3.0 };

// vẽ 1 motif lên canvas texture tại (x,y), xoay rot, cao h đơn-vị-motif→px
function stampMotif(ctx2d, motif, x, y, rot, scale) {
  ctx2d.save();
  ctx2d.translate(x, y);
  ctx2d.rotate(rot);
  ctx2d.scale(scale, -scale); // canvas y-down → lật cho khớp hệ y-up của motif
  ctx2d.fillStyle = '#000';
  for (const draw of motif.shapes) {
    const path = new Path2D();
    draw(path);
    ctx2d.fill(path);
  }
  ctx2d.restore();
}

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

  // 2b) vành giữa của bản vẽ thiếu HƯƠU → xóa và dệt lại đầy đủ
  p.beginPath();
  p.arc(cx, cx, R * 0.665, 0, Math.PI * 2);
  p.arc(cx, cx, R * 0.548, 0, Math.PI * 2, true);
  p.fill();

  // 2c) khoét hai cung đối xứng ở vành sinh hoạt để đặt nhà sàn + giã gạo
  //     (bố cục hai nửa đối xứng — đúng cấu trúc băng người của trống thật)
  const wedge = (aMid, half) => {
    p.beginPath();
    p.arc(cx, cx, R * 0.497, aMid - half, aMid + half);
    p.arc(cx, cx, R * 0.362, aMid + half, aMid - half, true);
    p.closePath();
    p.fill();
  };
  wedge(Math.PI / 2, 0.44);
  wedge(-Math.PI / 2, 0.44);
  p.globalCompositeOperation = 'source-over';

  // 2d) dệt vành hươu–chim: nhóm [hươu, hươu, chim đứng] lặp quanh vành
  {
    const rr = R * 0.6, scale = R * 0.052;
    const slots = 24;
    for (let i = 0; i < slots; i++) {
      const th = (i / slots) * Math.PI * 2;
      const x = cx + Math.cos(th) * rr, y = cx + Math.sin(th) * rr;
      const rot = th + Math.PI / 2;
      const motif = i % 3 === 2 ? BIRD_STAND : DEER;
      stampMotif(p, motif, x, y, rot, motif === DEER ? scale : scale * 0.85);
    }
  }

  // 2e) đặt nhà sàn + giã gạo chày đôi vào hai cung đã khoét
  for (const aMid of [Math.PI / 2, -Math.PI / 2]) {
    const rr = R * 0.432, scale = R * 0.055;
    for (const [off, motif, k] of [[-0.21, HOUSE, 1], [0.21, POUNDING, 0.92]]) {
      const th = aMid + off;
      const x = cx + Math.cos(th) * rr, y = cx + Math.sin(th) * rr;
      stampMotif(p, motif, x, y, th + Math.PI / 2, scale * k);
    }
  }

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

// ═══ SOI HOA VĂN 3D (kiểu "inspect" trong game) ═══════════════
// Chạm chấm sáng trên mặt trống → tượng đồng 3D của hoa văn đó hiện lên
// xoay trước ống kính, kèm thông tin bên phải. Esc / chạm chỗ trống để đóng.
const SRC_VIEW = 'Cục Di sản văn hóa (dsvh.gov.vn) · Bảo tàng Lịch sử quốc gia';
const MOTIF_INFO = {
  star14: {
    motif: STAR14, h: 3.4,
    name: 'Ngôi sao 14 cánh', sub: 'Tâm mặt trống · đúc nổi',
    info: 'Ngôi sao 14 cánh bao quanh núm tròn — nơi gõ chày khi đánh trống; xen giữa các cánh là họa tiết hình lông công. Nhiều nhà nghiên cứu xem đây là hình tượng mặt trời, trung tâm tín ngưỡng của cư dân nông nghiệp Đông Sơn.',
  },
  birdFly: {
    motif: BIRD_FLY, h: 2.6,
    name: 'Chim mỏ dài bay', sub: 'Vành ngoài · quen gọi "chim Lạc"',
    info: 'Đàn chim mỏ dài, mào dài bay ngược chiều kim đồng hồ quanh mặt trống — hình tượng tiêu biểu nhất của nghệ thuật Đông Sơn, thường được xem là biểu tượng vật tổ của cư dân Việt cổ.',
  },
  birdStand: {
    motif: BIRD_STAND, h: 2.7,
    name: 'Chim mỏ dài đứng', sub: 'Vành muông thú',
    info: 'Chim mỏ dài đứng xen giữa các hình hươu và chim bay — thế giới chim muông ven sông nước gần gũi với cư dân trồng lúa châu thổ sông Hồng.',
  },
  deer: {
    motif: DEER, h: 2.9,
    name: 'Hươu', sub: 'Vành muông thú',
    info: 'Hươu đi thành đàn, gạc lớn vắt về sau — một trong những hình khắc động vật đặc trưng trên mặt trống Ngọc Lũ, phản ánh thiên nhiên và săn bắt thời Đông Sơn.',
  },
  dancer: {
    motif: DANCER, h: 3.1,
    name: 'Người hóa trang lông chim', sub: 'Vành cảnh sinh hoạt',
    info: 'Người đội mũ lông chim dài, hóa trang thành chim, nhảy múa trong lễ hội — gắn với tín ngưỡng vật tổ; đoàn người múa là hoạt cảnh trung tâm của băng hình người trên mặt trống.',
  },
  house: {
    motif: HOUSE, h: 2.6,
    name: 'Nhà sàn mái cong', sub: 'Vành cảnh sinh hoạt',
    info: 'Nhà sàn mái cong vồng hai đầu như hình thuyền, dựng trên cột — hình ảnh sớm nhất về kiến trúc cư trú của người Việt cổ còn lại đến nay.',
  },
  pounding: {
    motif: POUNDING, h: 2.9,
    name: 'Giã gạo chày đôi', sub: 'Vành cảnh sinh hoạt',
    info: 'Đôi người giã gạo chày đôi bên cối — hoạt cảnh gắn liền nền nông nghiệp lúa nước; nhịp chày giã gạo cũng là một nhạc cụ trong ngày hội làng.',
  },
};

// chấm sáng đánh dấu điểm chạm (marker kiểu game)
const markers = [];
function addMarker(type, worldR, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  const g = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.045, 8, 32),
    new THREE.MeshBasicMaterial({
      color: '#ffd9a0', transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  ring.rotation.x = Math.PI / 2;
  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.09, 16),
    new THREE.MeshBasicMaterial({
      color: '#ffefc8', transparent: true, opacity: 0.95, depthWrite: false,
    })
  );
  dot.rotation.x = -Math.PI / 2;
  g.add(ring, dot);
  g.position.set(Math.cos(a) * worldR, FACE_Y + 0.1, Math.sin(a) * worldR);
  scene.add(g);
  markers.push({ type, group: g, ring });
}
// bán kính thế giới = tỉ_lệ_vành × 9.56 (mép hoa văn)
addMarker('star14', 2.1, -90);
addMarker('dancer', 4.16, 20);
addMarker('house', 4.16, 105);
addMarker('pounding', 4.16, 65);
addMarker('deer', 5.74, -35);
addMarker('birdStand', 5.74, -5);
addMarker('birdFly', 7.46, 150);

// tượng đồng 3D nổi trước ống kính
scene.add(camera);
const showRig = new THREE.Group();
camera.add(showRig);
showRig.position.set(-2.3, 0, -8.5);
const dimmer = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 30),
  new THREE.MeshBasicMaterial({ color: '#050806', transparent: true, opacity: 0, depthWrite: false })
);
dimmer.position.set(0, 0, -9.4);
camera.add(dimmer);

let showcase = null; // { obj, opening }
function buildStatue(entry) {
  const g = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#7d8b74', metalness: 0.82, roughness: 0.34,
    clearcoat: 0.25, clearcoatRoughness: 0.4, envMapIntensity: 1.15,
  });
  for (const draw of entry.motif.shapes) {
    const s = new THREE.Shape();
    draw(s);
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 2,
    });
    g.add(new THREE.Mesh(geo, mat));
  }
  // căn giữa + co về chiều cao mong muốn
  const box = new THREE.Box3().setFromObject(g);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const inner = new THREE.Group();
  for (const c of [...g.children]) inner.add(c);
  inner.position.sub(center);
  const wrap = new THREE.Group();
  wrap.add(inner);
  wrap.scale.setScalar(Math.min(
    entry.h / Math.max(size.y, 0.001),
    3.6 / Math.max(size.x, 0.001) // không tràn khung ngang
  ));
  return wrap;
}

function openShowcase(type) {
  const entry = MOTIF_INFO[type];
  if (!entry) return;
  closeShowcase(true);
  const obj = buildStatue(entry);
  obj.scale.multiplyScalar(0.001);
  showRig.add(obj);
  showcase = { obj, t: 0, targetScale: obj.userData.s ?? entry.h, entry, type };
  // thẻ thông tin bên phải
  card.classList.remove('show');
  setTimeout(() => {
    cardRing.textContent = entry.sub;
    cardTitle.textContent = entry.name;
    cardBody.textContent = entry.info;
    cardSrc.textContent = 'Nguồn: ' + SRC_VIEW + ' · Chạm chỗ trống hoặc Esc để đóng';
    card.classList.add('show');
  }, 240);
  activeRing = -2; // khóa thẻ vành trong lúc soi
  if (type === 'star14') { drumHit(); soundWave(); }
}

function closeShowcase(silent = false) {
  if (!showcase) return;
  showRig.remove(showcase.obj);
  showcase = null;
  if (!silent) {
    activeRing = -1; // mở lại thẻ vành theo khoảng cách
  }
}

window.__openShowcase = openShowcase;
window.__showState = () => ({ open: !!showcase, type: showcase?.type ?? null });

const raycaster = new THREE.Raycaster();
addEventListener('pointerdown', (e) => {
  if (!face) return;
  const v = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(v, camera);
  const hit = raycaster.intersectObject(face, false)[0];
  if (!hit) {
    if (showcase) closeShowcase();
    return;
  }
  const pt = hit.point;
  const r = Math.hypot(pt.x, pt.z);
  // núm giữa: đánh trống
  if (r < 1.1) {
    drumHit();
    soundWave();
    return;
  }
  // chấm sáng gần nhất trong tầm chạm
  let best = null, bestD = 1.7;
  for (const m of markers) {
    const d = Math.hypot(m.group.position.x - pt.x, m.group.position.z - pt.z);
    if (d < bestD) { bestD = d; best = m; }
  }
  if (best) openShowcase(best.type);
  else if (showcase) closeShowcase();
});

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeShowcase();
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
  if (!showcase) showRing(best);

  // chấm sáng thở nhẹ; ẩn khi đang soi
  for (const m of markers) {
    m.ring.scale.setScalar(1 + Math.sin(t * 2.4 + m.group.position.x) * 0.12);
    const vis = showcase ? 0 : 0.85;
    m.ring.material.opacity += (vis - m.ring.material.opacity) * Math.min(dt * 5, 1);
  }

  // tượng đồng: mọc lên + xoay chậm + bồng bềnh
  if (showcase) {
    showcase.t = Math.min(showcase.t + dt / 0.55, 1);
    const k = 1 + 2.70158 * Math.pow(showcase.t - 1, 3) + 1.70158 * Math.pow(showcase.t - 1, 2);
    const base = showcase.obj.userData.baseScale ??
      (showcase.obj.userData.baseScale = showcase.obj.scale.x * 1000);
    showcase.obj.scale.setScalar(Math.max(base * k, 0.001));
    // lắc lư quanh trục — luôn hướng mặt khắc về người xem
    showcase.obj.rotation.y = Math.sin(t * 0.9) * 0.5;
    showcase.obj.rotation.x = Math.sin(t * 0.55) * 0.1;
    showcase.obj.position.y = Math.sin(t * 1.1) * 0.12;
  }
  dimmer.material.opacity += ((showcase ? 0.6 : 0) - dimmer.material.opacity) * Math.min(dt * 4, 1);

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
