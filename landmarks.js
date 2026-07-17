// 34 địa danh biểu tượng — mỗi tỉnh một diorama low-poly dựng từ khối cơ bản.
// Mọi model đứng trên gốc (0,0,0), cao ~7–11 đơn vị, hướng mặt về +Z.
import * as THREE from 'three';

// ── Vật liệu (cache theo màu + tùy chọn) ─────────────────────
const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + '|' + JSON.stringify(opts);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0,
      flatShading: true,
      ...(opts.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.ei ?? 0.6 } : {}),
      ...(opts.transparent ? { transparent: true, opacity: opts.opacity ?? 0.5 } : {}),
    });
    matCache.set(key, m);
  }
  return m;
}

// ── Khối cơ bản: thêm vào group, trả về mesh ─────────────────
function add(g, geo, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.position.set(x, y, z);
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.rz) m.rotation.z = opts.rz;
  if (opts.sx || opts.sy || opts.sz) m.scale.set(opts.sx ?? 1, opts.sy ?? 1, opts.sz ?? 1);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

const box = (g, w, h, d, c, x, y, z, o) => add(g, new THREE.BoxGeometry(w, h, d), c, x, y, z, o);
const cyl = (g, rt, rb, h, c, x, y, z, o = {}) =>
  add(g, new THREE.CylinderGeometry(rt, rb, h, o.seg ?? 10), c, x, y, z, o);
const cone = (g, r, h, c, x, y, z, o = {}) =>
  add(g, new THREE.ConeGeometry(r, h, o.seg ?? 8), c, x, y, z, o);
const sph = (g, r, c, x, y, z, o = {}) =>
  add(g, new THREE.SphereGeometry(r, o.seg ?? 10, o.seg ?? 8), c, x, y, z, o);

// ── Hệ thống animation bộ phận ───────────────────────────────
// Gắn nhãn chuyển động cho một mesh; animateLandmark() chạy mỗi khung hình
// trên địa danh đang hiển thị. Vật liệu pulse được clone để không lây
// sang mesh khác dùng chung cache.
function anim(o, spec) {
  if (spec.type === 'pulse') {
    o.material = o.material.clone();
    spec.base = o.material.emissiveIntensity;
  }
  spec.basePos = o.position.clone();
  spec.baseRot = o.rotation.clone();
  spec.baseScale = o.scale.clone();
  spec.phase = spec.phase ?? Math.random() * Math.PI * 2;
  o.userData.anim = spec;
  return o;
}

export function animateLandmark(root, t) {
  root.traverse((o) => {
    const a = o.userData.anim;
    if (!a) return;
    const s = Math.sin(t * a.speed + a.phase);
    switch (a.type) {
      case 'bob':      o.position.y = a.basePos.y + s * a.amp; break;
      case 'sway':     o.rotation.z = a.baseRot.z + s * a.amp; break;
      case 'swayX':    o.rotation.x = a.baseRot.x + s * a.amp; break;
      case 'spin':     o.rotation.y += a.speed * 0.016; break;
      case 'drift':    o.position.x = a.basePos.x + s * a.amp;
                       o.position.y = a.basePos.y + Math.sin(t * a.speed * 0.7 + a.phase) * a.amp * 0.4; break;
      case 'breathe':  o.scale.copy(a.baseScale).multiplyScalar(1 + s * a.amp); break;
      case 'pulse':    o.material.emissiveIntensity = a.base + (s * 0.5 + 0.5) * a.amp; break;
      case 'flutter':  o.scale.x = a.baseScale.x * (1 + s * a.amp);
                       o.rotation.y = a.baseRot.y + Math.sin(t * a.speed * 0.6 + a.phase) * a.amp * 1.6; break;
    }
  });
}

// Mái 4 dốc kiểu Á Đông (chóp 4 cạnh, xoay 45°, hơi bè)
function roof(g, w, d, h, c, x, y, z) {
  return add(g, new THREE.ConeGeometry(0.71, 1, 4), c, x, y + h / 2, z, {
    ry: Math.PI / 4, sx: w, sy: h, sz: d,
  });
}

// Cột cờ + lá cờ đỏ (cờ phất trong gió)
function flag(g, h, x, z, s = 1) {
  cyl(g, 0.04 * s, 0.05 * s, h, '#c9c2b2', x, h / 2, z, { seg: 6 });
  anim(
    box(g, 1.1 * s, 0.7 * s, 0.03, '#d01e2a', x + 0.58 * s, h - 0.42 * s, z, {
      emissive: '#a00d18', ei: 0.35,
    }),
    { type: 'flutter', amp: 0.09, speed: 5.5 }
  );
}

// Cây: thông (chóp), tròn (tán cầu), cau/dừa (thân + lá)
function tree(g, kind, x, z, s = 1) {
  const sway = { type: 'sway', amp: 0.05, speed: 1.4 };
  if (kind === 'pine') {
    cyl(g, 0.05 * s, 0.08 * s, 0.5 * s, '#5a4630', x, 0.25 * s, z, { seg: 5 });
    anim(cone(g, 0.42 * s, 1.15 * s, '#1d5038', x, 1.05 * s, z, { seg: 6 }), { ...sway });
  } else if (kind === 'palm') {
    cyl(g, 0.05 * s, 0.09 * s, 1.25 * s, '#6b5638', x, 0.62 * s, z, { seg: 5 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      anim(add(g, new THREE.ConeGeometry(0.1 * s, 0.85 * s, 4), '#2c7a4b',
        x + Math.cos(a) * 0.3 * s, 1.32 * s, z + Math.sin(a) * 0.3 * s,
        { rz: Math.cos(a) * 1.25, rx: -Math.sin(a) * 1.25 }),
        { type: 'sway', amp: 0.07, speed: 1.8, phase: i });
    }
  } else {
    cyl(g, 0.06 * s, 0.09 * s, 0.45 * s, '#5a4630', x, 0.22 * s, z, { seg: 5 });
    anim(sph(g, 0.4 * s, '#2c6e45', x, 0.72 * s, z, { seg: 7 }), { ...sway });
  }
}

// Núi đá vôi (karst) — chóp lệch, đỉnh phủ cây xanh
function karst(g, r, h, x, z, seed = 1) {
  const m = cone(g, r, h, '#5f6e66', x, h / 2, z, { seg: 6 });
  m.rotation.y = seed * 1.7;
  m.scale.x = 1 + Math.sin(seed * 5) * 0.25;
  sph(g, r * 0.55, '#2a5c40', x + Math.sin(seed) * r * 0.2, h * 0.98, z, { seg: 6 });
}

// Thuyền: thân cong (trụ dẹt) + buồm tam giác
function boat(g, x, z, s = 1, hull = '#6b4a2f', sail = '#b8452e') {
  // cả con thuyền bập bềnh cùng pha trên sóng
  const phase = Math.random() * Math.PI * 2;
  const bob = { type: 'bob', amp: 0.07 * s, speed: 1.6, phase };
  anim(add(g, new THREE.CylinderGeometry(0.5, 0.32, 0.28, 8), hull, x, 0.14 * s, z, {
    sx: 1.6 * s, sy: s, sz: 0.5 * s,
  }), { ...bob });
  if (sail) {
    anim(cyl(g, 0.02, 0.02, 1.1 * s, '#54401f', x, 0.75 * s, z, { seg: 4 }), { ...bob });
    anim(add(g, new THREE.ConeGeometry(0.4 * s, 1 * s, 4), sail, x + 0.2 * s, 0.78 * s, z, {
      rz: -Math.PI / 2, sz: 0.12,
    }), { ...bob });
  }
}

// Đĩa nước
function water(g, r, x, z, c = '#1d6f8a') {
  const m = add(g, new THREE.CylinderGeometry(r, r, 0.1, 24), c, x, 0.05, z, {
    emissive: '#0e4a5e', ei: 0.35, rough: 0.35,
  });
  m.castShadow = false;
  return m;
}

// ══════════════════════════════════════════════════════════════
//  CÁC ĐỊA DANH
// ══════════════════════════════════════════════════════════════

function hanoi() { // Khuê Văn Các
  const g = new THREE.Group();
  box(g, 3.4, 0.5, 3.4, '#9b8f7a', 0, 0.25, 0);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(g, 0.42, 2.1, 0.42, '#c8bfa8', dx, 1.55, dz);
  }
  box(g, 3, 0.28, 3, '#7a4a30', 0, 2.7, 0);
  box(g, 2.2, 1.5, 2.2, '#b03a28', 0, 3.6, 0);
  // Cửa sổ tròn — hình ảnh "sao Khuê" tỏa sáng theo nhịp
  anim(add(g, new THREE.TorusGeometry(0.5, 0.09, 8, 20), '#e8c15a', 0, 3.65, 1.12, { emissive: '#c9971f', ei: 0.5 }),
    { type: 'pulse', amp: 0.9, speed: 1.6 });
  roof(g, 3.2, 3.2, 1.1, '#4a3527', 0, 4.35, 0);
  roof(g, 1.9, 1.9, 0.85, '#4a3527', 0, 5.3, 0);
  cone(g, 0.14, 0.5, '#e8c15a', 0, 6, 0, { seg: 6, emissive: '#c9971f' });
  tree(g, 'round', -2.4, 1.6, 1.1);
  tree(g, 'round', 2.5, -1.4, 0.9);
  return g;
}

function haiphong() { // Cảng + hải đăng Long Châu
  const g = new THREE.Group();
  water(g, 3.4, 0, 0.8, '#155e78');
  add(g, new THREE.CylinderGeometry(0.9, 1.1, 0.8, 7), '#5f6e66', -1.7, 0.4, -1.4);
  for (let i = 0; i < 4; i++) {
    cyl(g, 0.5 - i * 0.07, 0.56 - i * 0.07, 1.1, i % 2 ? '#d8d2c2' : '#c23b2a', -1.7, 1.3 + i * 1.05, -1.4, { seg: 10 });
  }
  cyl(g, 0.42, 0.42, 0.55, '#2b2f36', -1.7, 5.6, -1.4, { seg: 8 });
  anim(sph(g, 0.3, '#ffe07a', -1.7, 5.62, -1.4, { emissive: '#ffcd00', ei: 2.2 }),
    { type: 'pulse', amp: 2, speed: 2.4 });
  // luồng sáng hải đăng quét vòng quanh đèn
  const beamPivot = new THREE.Group();
  beamPivot.position.set(-1.7, 0, -1.4);
  g.add(beamPivot);
  const beam = add(beamPivot, new THREE.ConeGeometry(0.45, 3.2, 8, 1, true), '#fff3c0', 1.6, 5.62, 0, {
    transparent: true, opacity: 0.16, emissive: '#ffe89a', ei: 1.2, rz: Math.PI / 2,
  });
  beam.castShadow = false;
  anim(beamPivot, { type: 'spin', speed: 1.1 });
  cone(g, 0.4, 0.5, '#963c2a', -1.7, 6.1, -1.4, { seg: 8 });
  boat(g, 1.3, 1.2, 1.35, '#39506b', null);
  box(g, 0.9, 0.55, 0.62, '#c23b2a', 1.05, 0.62, 1.2);
  box(g, 0.62, 0.5, 0.6, '#d8a13a', 1.95, 0.6, 1.25);
  return g;
}

function hue() { // Ngọ Môn + Kỳ Đài
  const g = new THREE.Group();
  box(g, 4.6, 1.7, 1.7, '#8a7a5f', 0, 0.85, 0.6);
  for (const dx of [-1.5, 0, 1.5]) box(g, 0.75, 1.15, 1.75, '#3d3428', dx, 0.58, 0.6);
  box(g, 3.9, 0.9, 1.3, '#b03a28', 0, 2.6, 0.6);
  roof(g, 4.3, 1.7, 0.8, '#c9971f', 0, 3.05, 0.6);
  box(g, 2.2, 0.65, 1.1, '#b03a28', 0, 3.75, 0.6);
  roof(g, 2.6, 1.4, 0.7, '#c9971f', 0, 4.1, 0.6);
  // Kỳ Đài phía trước
  box(g, 2.3, 0.55, 1.5, '#9b8f7a', 0, 0.28, -1.7);
  box(g, 1.7, 0.5, 1.1, '#9b8f7a', 0, 0.8, -1.7);
  flag(g, 4.6, 0, -1.7, 1.25);
  return g;
}

function danang() { // Cầu Vàng — đôi bàn tay đá nâng dải lụa vàng
  const g = new THREE.Group();
  const deck = add(g, new THREE.TorusGeometry(3, 0.22, 10, 40, Math.PI * 0.78), '#e8b83a',
    0, 3.15, 0, { metal: 0.55, rough: 0.35, emissive: '#8a6a10', ei: 0.25 });
  deck.rotation.set(Math.PI / 2, 0, Math.PI * 0.11);
  deck.scale.z = 0.55;
  for (const s of [-1, 1]) {
    const hx = s * 1.55, hz = s * 0.35;
    cyl(g, 0.5, 0.72, 2.6, '#8d8578', hx, 1.3, hz, { seg: 8 });
    const palm = box(g, 1.15, 0.9, 0.75, '#8d8578', hx, 2.75, hz);
    palm.rotation.z = -s * 0.5;
    for (let f = 0; f < 4; f++) {
      const fin = box(g, 0.24, 0.85, 0.25, '#9a9284',
        hx + s * (0.35 - f * 0.28) * 0.9, 3.35 + Math.sin(f) * 0.08, hz + s * 0.18);
      fin.rotation.z = -s * (0.75 - f * 0.12);
    }
  }
  tree(g, 'pine', -2.9, -1.4, 0.85);
  tree(g, 'pine', 2.8, 1.5, 0.8);
  tree(g, 'pine', 0.2, 2.1, 0.7);
  return g;
}

function hcm() { // Landmark 81
  const g = new THREE.Group();
  box(g, 2.6, 0.7, 2, '#31465c', 0, 0.35, 0, { rough: 0.4 });
  const glass = { rough: 0.25, metal: 0.35, emissive: '#3c76a8', ei: 0.35 };
  const hts = [3.2, 4.6, 5.8, 7, 6.4, 5.2, 4];
  const xs = [-0.95, -0.62, -0.28, 0.06, 0.4, 0.72, 1.02];
  for (let i = 0; i < hts.length; i++) {
    // các lớp kính nhấp nháy lệch pha như đèn cửa sổ ban đêm
    anim(box(g, 0.34, hts[i], 1.35 - Math.abs(i - 3) * 0.13, '#41627f', xs[i], hts[i] / 2 + 0.65, 0, glass),
      { type: 'pulse', amp: 0.3, speed: 1.3, phase: i * 1.1 });
  }
  cyl(g, 0.03, 0.05, 1.6, '#c9c2b2', 0.06, 8.4, 0, { seg: 5 });
  anim(sph(g, 0.09, '#ffe07a', 0.06, 9.2, 0, { emissive: '#ffcd00', ei: 2 }),
    { type: 'pulse', amp: 2.2, speed: 3 });
  box(g, 1.5, 0.5, 1, '#7a5a38', -2.2, 0.25, 0.9);
  roof(g, 1.7, 1.2, 0.5, '#b03a28', -2.2, 0.5, 0.9);
  return g;
}

function cantho() { // Chợ nổi Cái Răng
  const g = new THREE.Group();
  water(g, 3.6, 0, 0, '#4a7a52');
  const fruits = ['#e8b83a', '#c23b2a', '#7fb04a', '#e07b2e'];
  for (let i = 0; i < 3; i++) {
    const x = -1.6 + i * 1.6, z = (i % 2) * 1.6 - 0.8;
    boat(g, x, z, 1.05, '#6b4a2f', null);
    box(g, 0.8, 0.45, 0.42, '#8a6a45', x, 0.5, z);
    // cây bẹo treo trái — trái cây đung đưa theo gió
    cyl(g, 0.025, 0.025, 1.5, '#54401f', x - 0.45, 1.05, z, { seg: 4 });
    anim(sph(g, 0.14, fruits[i], x - 0.45, 1.85, z, { emissive: fruits[i], ei: 0.25 }),
      { type: 'drift', amp: 0.07, speed: 2.1, phase: i });
    anim(sph(g, 0.11, fruits[(i + 1) % 4], x - 0.45, 1.55, z),
      { type: 'drift', amp: 0.09, speed: 2.4, phase: i + 1.5 });
  }
  sph(g, 0.35, '#7fb04a', 1.9, 0.28, -1.1, { seg: 7 });
  sph(g, 0.28, '#e8b83a', 2.3, 0.24, -0.6, { seg: 7 });
  return g;
}

function tuyenquang() { // Lán Nà Nưa
  const g = new THREE.Group();
  box(g, 3.6, 0.3, 3, '#3f5c35', 0, 0.15, 0);
  for (const [dx, dz] of [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]]) {
    cyl(g, 0.07, 0.07, 1.3, '#6b5638', dx, 0.85, dz, { seg: 5 });
  }
  box(g, 2.6, 0.16, 1.7, '#8a6a45', 0, 1.55, 0);
  box(g, 2.3, 0.85, 1.4, '#a08454', 0, 2.05, 0);
  roof(g, 3, 2.2, 1, '#7a6a3f', 0, 2.6, 0);
  add(g, new THREE.BoxGeometry(0.55, 1.3, 0.08), '#8a6a45', 0.7, 0.85, 0.95, { rx: 0.5 });
  tree(g, 'pine', -1.9, 1.2, 1.3);
  tree(g, 'pine', 1.95, -1.1, 1.5);
  tree(g, 'pine', -1.6, -1.3, 1.1);
  return g;
}

function caobang() { // Thác Bản Giốc
  const g = new THREE.Group();
  water(g, 3.3, 0, 1.4, '#2e8b8b');
  const tiers = [[3.4, 1.1, -1.6], [2.7, 2.1, -2.1], [2, 3, -2.5]];
  for (const [w, y, z] of tiers) {
    box(g, w, 1.05, 1.15, '#5f6e66', 0, y - 0.4, z);
    sph(g, 0.5, '#2a5c40', -w / 2 + 0.2, y + 0.15, z, { seg: 6 });
    sph(g, 0.42, '#2a5c40', w / 2 - 0.2, y + 0.12, z, { seg: 6 });
  }
  // dải nước trắng — rung nhẹ như nước đổ
  for (const [x, w] of [[-0.7, 0.55], [0.15, 0.7], [0.95, 0.45]]) {
    anim(add(g, new THREE.BoxGeometry(w, 2.9, 0.16), '#dff3f0', x, 1.45, -1.05,
      { emissive: '#bfe8e2', ei: 0.55, rough: 0.3, rx: 0.12 }),
      { type: 'pulse', amp: 0.5, speed: 7 });
  }
  for (const [x, z, r] of [[-1.1, 0.6, 0.3], [0.4, 0.8, 0.38], [1.2, 0.4, 0.26]]) {
    const mist = sph(g, r, '#eaf6f3', x, 0.45, z, { transparent: true, opacity: 0.45, seg: 7 });
    mist.castShadow = false;
    anim(mist, { type: 'bob', amp: 0.12, speed: 1.1 });
  }
  sph(g, 0.6, '#2a5c40', 2.4, 3.1, -2.4, { seg: 6 });
  return g;
}

function laichau() { // Đèo Ô Quy Hồ
  const g = new THREE.Group();
  cone(g, 1.7, 4.4, '#4a5e52', -1.4, 2.2, -0.9, { seg: 7 });
  cone(g, 1.35, 3.3, '#55705d', 1.5, 1.65, -1.3, { seg: 6 });
  cone(g, 1, 2.2, '#5f7a66', 0.4, 1.1, 1, { seg: 6 });
  // đường đèo zic-zac
  const seg = [[-2.4, 0.5, 1.3, 0.5], [-1.1, 1.15, 1.5, -0.35], [0.3, 1.8, 1.4, 0.4], [1.6, 2.45, 1.3, -0.3]];
  for (const [x, y, len, rz] of seg) {
    add(g, new THREE.BoxGeometry(len, 0.1, 0.42), '#c9bfa5', x, y, -0.2 + Math.sin(x) * 0.5, { ry: rz, rz: 0.28 });
  }
  const cloud = sph(g, 0.55, '#e8eef2', -1.3, 3.6, 0.1, { transparent: true, opacity: 0.6, seg: 7 });
  cloud.castShadow = false;
  anim(cloud, { type: 'drift', amp: 0.5, speed: 0.5 });
  const cloud2 = sph(g, 0.4, '#e8eef2', 1.7, 2.9, -0.4, { transparent: true, opacity: 0.55, seg: 7 });
  cloud2.castShadow = false;
  anim(cloud2, { type: 'drift', amp: 0.4, speed: 0.65 });
  return g;
}

function laocai() { // Fansipan + ruộng bậc thang
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    cyl(g, 2.4 - i * 0.42, 2.7 - i * 0.42, 0.5, i % 2 ? '#5c8a3c' : '#6f9c48', 0, 0.25 + i * 0.5, 0, { seg: 9 });
  }
  cone(g, 1.5, 4.2, '#4a5e52', 0, 4.05, -0.4, { seg: 7 });
  cone(g, 0.55, 1.5, '#7d8f84', 0, 6.1, -0.4, { seg: 6 });
  add(g, new THREE.ConeGeometry(0.22, 0.5, 3), '#b8b2a4', 0, 6.95, -0.4, { metal: 0.5, rough: 0.35 });
  const cl = sph(g, 0.6, '#e8eef2', 1.5, 4.9, 0.4, { transparent: true, opacity: 0.55, seg: 7 });
  cl.castShadow = false;
  anim(cl, { type: 'drift', amp: 0.55, speed: 0.45 });
  return g;
}

function thainguyen() { // Đồi chè Tân Cương
  const g = new THREE.Group();
  const hills = [[-1.4, 0.4, 1.5], [0.9, -0.3, 1.9], [-0.2, 1.4, 1.2], [2.2, 0.9, 1.05]];
  for (const [x, z, r] of hills) {
    add(g, new THREE.SphereGeometry(r, 12, 8), '#4f8a3a', x, 0, z, { sy: 0.55 });
    for (let i = 1; i <= 3; i++) {
      const t = add(g, new THREE.TorusGeometry(r * Math.sin((i / 4) * Math.PI * 0.5 + 0.5), 0.045, 6, 24),
        '#2f6828', x, r * 0.55 * Math.cos((i / 4) * Math.PI * 0.5 + 0.5) * 0.9, z, { rx: Math.PI / 2 });
      t.castShadow = false;
    }
  }
  cone(g, 0.3, 0.3, '#d8c690', -0.2, 1.15, 1.2, { seg: 8 });
  return g;
}

function dienbien() { // Tượng đài Chiến thắng Điện Biên Phủ
  const g = new THREE.Group();
  cyl(g, 2.3, 2.7, 0.55, '#7d8f84', 0, 0.28, 0, { seg: 10 });
  cyl(g, 1.55, 1.9, 0.55, '#9b8f7a', 0, 0.83, 0, { seg: 10 });
  box(g, 1.15, 3.4, 1.15, '#8a6f4d', 0, 2.8, 0, { metal: 0.45, rough: 0.5 });
  box(g, 0.8, 1.1, 0.8, '#8a6f4d', 0, 5, 0, { metal: 0.45, rough: 0.5 });
  // em bé trên vai — khối nhỏ
  sph(g, 0.28, '#8a6f4d', 0, 5.75, 0, { metal: 0.45, rough: 0.5, seg: 8 });
  flag(g, 7, 0.55, 0, 1.1);
  tree(g, 'round', -1.9, 1.1, 0.9);
  return g;
}

function langson() { // Núi Tô Thị — nàng vọng phu
  const g = new THREE.Group();
  const m = cone(g, 2.1, 3.6, '#5f6e66', 0, 1.8, 0, { seg: 7 });
  m.scale.x = 1.3;
  sph(g, 1, '#2a5c40', -0.8, 3.1, 0.2, { seg: 7 });
  // vòm cổng động Tam Thanh
  add(g, new THREE.TorusGeometry(0.75, 0.28, 8, 14, Math.PI), '#4d5a53', 1, 0.55, 1.35);
  // tượng nàng Tô Thị bồng con
  add(g, new THREE.CylinderGeometry(0.16, 0.28, 1.15, 7), '#8d8578', 0.35, 4.15, 0);
  sph(g, 0.18, '#8d8578', 0.35, 4.85, 0, { seg: 7 });
  sph(g, 0.11, '#8d8578', 0.55, 4.5, 0.05, { seg: 6 });
  tree(g, 'round', -2.1, 0.9, 0.8);
  return g;
}

function sonla() { // Cao nguyên Mộc Châu — đồi chè, hoa mận
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(2.1, 12, 8), '#5c8a3c', -0.9, 0, 0.4, { sy: 0.45 });
  add(g, new THREE.SphereGeometry(1.5, 12, 8), '#6f9c48', 1.6, 0, -0.7, { sy: 0.5 });
  for (let i = 0; i < 3; i++) {
    const t = add(g, new THREE.TorusGeometry(1.4 - i * 0.4, 0.05, 6, 24), '#3f7030', -0.9, 0.35 + i * 0.24, 0.4, { rx: Math.PI / 2 });
    t.castShadow = false;
  }
  // hoa mận trắng đung đưa
  for (const [x, z] of [[0.6, 1.5], [1.3, 0.9], [2.2, 0.2]]) {
    cyl(g, 0.04, 0.06, 0.5, '#5a4630', x, 0.25, z, { seg: 4 });
    anim(sph(g, 0.32, '#f2ecdd', x, 0.65, z, { seg: 7, emissive: '#d9d2be', ei: 0.2 }),
      { type: 'sway', amp: 0.08, speed: 1.6 });
  }
  return g;
}

function phutho() { // Đền Hùng
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    cyl(g, 2.5 - i * 0.55, 2.8 - i * 0.55, 0.75, '#3f6b35', 0, 0.38 + i * 0.75, 0, { seg: 9 });
  }
  // bậc đá
  for (let i = 0; i < 6; i++) box(g, 0.8, 0.13, 0.3, '#c9bfa5', 0, 0.2 + i * 0.38, 2.35 - i * 0.33);
  box(g, 1.7, 0.9, 1.1, '#8a5a38', 0, 2.75, 0);
  roof(g, 2.2, 1.5, 0.75, '#4a3527', 0, 3.45, 0);
  cone(g, 0.1, 0.35, '#c9971f', 0, 4.05, 0, { seg: 6, emissive: '#c9971f' });
  tree(g, 'pine', -1.7, 0.9, 1.1);
  tree(g, 'pine', 1.75, 0.7, 1);
  return g;
}

function bacninh() { // Đình quan họ + nón quai thao
  const g = new THREE.Group();
  box(g, 3.8, 0.35, 2.3, '#9b8f7a', 0, 0.18, 0);
  for (const dx of [-1.5, -0.5, 0.5, 1.5]) cyl(g, 0.11, 0.11, 1.5, '#7a3b26', dx, 1.1, 0.95, { seg: 6 });
  box(g, 3.5, 1.4, 1.9, '#a08454', 0, 1.15, -0.15);
  roof(g, 4.4, 2.9, 1.25, '#3e332a', 0, 2.15, -0.05);
  // đầu đao cong 4 góc
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    add(g, new THREE.ConeGeometry(0.12, 0.55, 5), '#3e332a', sx * 2, 2.3, -0.05 + sz * 1.3, { rz: -sx * 0.7, rx: sz * 0.4 });
  }
  cyl(g, 1.05, 1.05, 0.06, '#d8c690', -2.6, 0.5, 1.2, { seg: 14 });
  cone(g, 1.02, 0.42, '#e2d3a3', -2.6, 0.72, 1.2, { seg: 14 });
  return g;
}

function quangninh() { // Vịnh Hạ Long
  const g = new THREE.Group();
  water(g, 3.8, 0, 0, '#15616e');
  karst(g, 1.05, 3.2, -1.6, -0.9, 1);
  karst(g, 0.8, 2.4, 0.3, -1.7, 2.4);
  karst(g, 0.9, 2.8, 1.8, -0.5, 3.8);
  karst(g, 0.55, 1.6, 1, 1.2, 5.1);
  boat(g, -0.8, 1.4, 1.15, '#4a3527', '#b8452e');
  return g;
}

function hungyen() { // Tam quan Văn miếu Xích Đằng
  const g = new THREE.Group();
  box(g, 3.7, 0.25, 1.6, '#9b8f7a', 0, 0.12, 0);
  box(g, 1.5, 1.9, 1, '#b8493a', 0, 1.2, 0);
  for (const dx of [-1.35, 1.35]) box(g, 0.9, 1.25, 0.85, '#b8493a', dx, 0.87, 0);
  for (const dx of [-1.35, 1.35]) roof(g, 1.3, 1.15, 0.55, '#3e332a', dx, 1.5, 0);
  roof(g, 1.9, 1.3, 0.6, '#3e332a', 0, 2.15, 0);
  box(g, 1.2, 0.6, 0.8, '#b8493a', 0, 2.72, 0);
  roof(g, 1.6, 1.1, 0.55, '#3e332a', 0, 3.05, 0);
  add(g, new THREE.BoxGeometry(0.65, 1.05, 0.1), '#3d3428', 0, 0.65, 0.52);
  tree(g, 'round', 2.4, 0.8, 1);
  return g;
}

function ninhbinh() { // Tràng An
  const g = new THREE.Group();
  water(g, 3.6, 0, 0.4, '#2e8b7a');
  karst(g, 1.1, 3, -1.7, -0.6, 1.3);
  karst(g, 0.85, 2.3, 1.6, -1.2, 2.9);
  karst(g, 0.7, 1.9, 2, 0.9, 4.2);
  box(g, 1, 0.55, 0.7, '#8a5a38', -0.1, 0.55, -1.3);
  roof(g, 1.35, 1, 0.5, '#4a3527', -0.1, 1.08, -1.3);
  boat(g, 0.3, 1.3, 0.85, '#6b4a2f', null);
  sph(g, 0.12, '#d8c690', 0.55, 0.45, 1.3, { seg: 6 });
  return g;
}

function thanhhoa() { // Thành nhà Hồ
  const g = new THREE.Group();
  box(g, 4.4, 2.1, 1.5, '#8f8a76', 0, 1.05, 0);
  box(g, 4.4, 0.35, 1.6, '#7d786a', 0, 2.28, 0);
  for (const dx of [-1.45, 0, 1.45]) {
    add(g, new THREE.CylinderGeometry(0.52, 0.52, 1.6, 12, 1, false, 0, Math.PI), '#2f2b24',
      dx, 0.75, 0.02, { rx: Math.PI / 2, sz: 1.4 });
  }
  box(g, 0.5, 0.3, 0.4, '#6d685c', -1.9, 2.6, 0);
  box(g, 0.5, 0.3, 0.4, '#6d685c', 1.9, 2.6, 0);
  sph(g, 0.3, '#4f8a3a', -2.35, 0.2, 0.7, { seg: 6 });
  sph(g, 0.24, '#4f8a3a', 2.4, 0.18, 0.65, { seg: 6 });
  return g;
}

function nghean() { // Làng Sen quê Bác
  const g = new THREE.Group();
  box(g, 2.7, 1, 1.5, '#c9b98a', 0, 0.5, -0.5);
  roof(g, 3.3, 2, 0.95, '#a8935c', 0, 1.35, -0.5);
  add(g, new THREE.BoxGeometry(0.5, 0.75, 0.08), '#5a4630', -0.6, 0.4, 0.27);
  add(g, new THREE.BoxGeometry(0.5, 0.75, 0.08), '#5a4630', 0.6, 0.4, 0.27);
  water(g, 1.7, 0.6, 1.9, '#2e6e5a');
  for (const [x, z] of [[0.1, 1.6], [1, 2.2], [0.7, 1.3]]) {
    cyl(g, 0.3, 0.3, 0.05, '#3f7a4a', x, 0.14, z, { seg: 9 });
    cone(g, 0.16, 0.3, '#d867a0', x + 0.15, 0.3, z - 0.15, { seg: 7, emissive: '#b0447e', ei: 0.3 });
  }
  // lũy tre
  for (const [x, z] of [[-1.9, 0.8], [-2.2, 0.1], [-1.7, 1.5]]) {
    cyl(g, 0.045, 0.05, 1.9, '#7fa348', x, 0.95, z, { seg: 5, rz: 0.16 });
    sph(g, 0.3, '#8fb055', x + 0.25, 1.95, z, { seg: 6 });
  }
  return g;
}

function hatinh() { // Ngã ba Đồng Lộc
  const g = new THREE.Group();
  cyl(g, 2.2, 2.5, 0.4, '#7d8f84', 0, 0.2, 0, { seg: 10 });
  box(g, 1.15, 0.55, 1.15, '#c9bfa5', 0, 0.68, 0);
  add(g, new THREE.CylinderGeometry(0.32, 0.62, 4.4, 4), '#d8d2c2', 0, 3.15, 0);
  cone(g, 0.4, 0.7, '#d8d2c2', 0, 5.7, 0, { seg: 4 });
  // vòng hoa
  add(g, new THREE.TorusGeometry(0.5, 0.11, 8, 18), '#d8b23a', 0, 1.35, 0.65, { emissive: '#a8841f', ei: 0.3 });
  sph(g, 0.1, '#c23b2a', -0.35, 1.35, 0.7, { seg: 6 });
  sph(g, 0.1, '#c23b2a', 0.35, 1.35, 0.7, { seg: 6 });
  tree(g, 'pine', -1.75, 0.75, 0.95);
  tree(g, 'pine', 1.8, 0.55, 0.85);
  return g;
}

function quangtri() { // Cầu Hiền Lương
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(7, 0.14, 1.7), '#1d6f8a', 0, 0.07, 0.3,
    { emissive: '#0e4a5e', ei: 0.35, rough: 0.35 }).castShadow = false;
  box(g, 3.1, 0.22, 0.95, '#3f6f9c', -1.55, 0.72, 0.3);
  box(g, 3.1, 0.22, 0.95, '#d8c23a', 1.55, 0.72, 0.3);
  for (const x of [-2.6, -1.3, 1.3, 2.6]) cyl(g, 0.09, 0.12, 0.62, '#8f8a76', x, 0.36, 0.3, { seg: 6 });
  // giàn thép
  for (let i = 0; i < 6; i++) {
    const x = -2.6 + i * 1.04;
    add(g, new THREE.BoxGeometry(1.15, 0.08, 0.08), i < 3 ? '#3f6f9c' : '#d8c23a', x + 0.5, 1.25, -0.15, { rz: (i % 2 ? -1 : 1) * 0.55 });
  }
  box(g, 6.2, 0.08, 0.08, '#8f8a76', 0, 1.52, -0.15);
  flag(g, 3.6, -2.9, 0.3, 1.05);
  return g;
}

function quangngai() { // Đảo Lý Sơn
  const g = new THREE.Group();
  water(g, 3.5, 0, 0, '#136078');
  // miệng núi lửa Thới Lới
  cyl(g, 1.5, 2.3, 1.7, '#6d5f4a', 0, 0.85, -0.5, { seg: 10 });
  cyl(g, 1.15, 1.15, 0.3, '#3f6b35', 0, 1.72, -0.5, { seg: 10 });
  cyl(g, 0.85, 0.85, 0.12, '#2e5230', 0, 1.75, -0.5, { seg: 9 });
  // ruộng tỏi ven đảo
  for (let i = 0; i < 4; i++) box(g, 0.6, 0.08, 0.35, i % 2 ? '#cfd8b8' : '#8fb055', -1.1 + i * 0.62, 0.16, 1.35);
  boat(g, 2, 1.5, 0.85, '#3f5c78', '#e8e2d0');
  return g;
}

function gialai() { // Nhà rông Tây Nguyên
  const g = new THREE.Group();
  for (const [dx, dz] of [[-0.85, -0.55], [0.85, -0.55], [-0.85, 0.55], [0.85, 0.55], [0, -0.55], [0, 0.55]]) {
    cyl(g, 0.08, 0.08, 1.4, '#6b5638', dx, 0.7, dz, { seg: 5 });
  }
  box(g, 2.3, 0.18, 1.5, '#8a6a45', 0, 1.5, 0);
  box(g, 2, 0.95, 1.2, '#a08454', 0, 2.05, 0);
  // mái cao vút đặc trưng
  add(g, new THREE.ConeGeometry(0.71, 1, 4), '#7a6a3f', 0, 4.15, 0, { ry: Math.PI / 4, sx: 2.5, sy: 3.3, sz: 1.6 });
  box(g, 0.08, 0.5, 0.08, '#54401f', -0.7, 6, 0, { rz: 0.4 });
  box(g, 0.08, 0.5, 0.08, '#54401f', 0.7, 6, 0, { rz: -0.4 });
  add(g, new THREE.BoxGeometry(0.5, 1.1, 0.08), '#54401f', 0, 0.8, 0.82, { rx: 0.45 });
  return g;
}

function khanhhoa() { // Tháp Bà Ponagar
  const g = new THREE.Group();
  box(g, 3.6, 0.4, 2.2, '#9b8570', 0, 0.2, 0);
  const towers = [[0, 1.35, 0, 0], [-1.35, 0.95, 0.45, 0.7], [1.3, 0.85, 0.5, 0.55]];
  for (const [x, s, z] of towers) {
    box(g, 1.15 * s, 1.5 * s, 1.15 * s, '#a5502e', x, 0.4 + 0.75 * s, z);
    for (let i = 0; i < 3; i++) {
      box(g, (1 - i * 0.22) * s, 0.55 * s, (1 - i * 0.22) * s, '#8f3f24', x, 0.4 + (1.75 + i * 0.5) * s, z);
    }
    cone(g, 0.28 * s, 0.5 * s, '#7a3520', x, 0.4 + 3.5 * s, z, { seg: 7 });
    add(g, new THREE.BoxGeometry(0.4 * s, 0.6 * s, 0.1), '#3d2418', x, 0.4 + 0.6 * s, z + 0.6 * s);
  }
  tree(g, 'palm', 2.5, 1.2, 0.95);
  tree(g, 'palm', -2.5, 1, 0.85);
  return g;
}

function daklak() { // Voi Bản Đôn
  const g = new THREE.Group();
  add(g, new THREE.SphereGeometry(1.05, 12, 9), '#7d786e', 0, 1.45, 0, { sx: 1.45, sy: 1, sz: 0.95 });
  sph(g, 0.62, '#7d786e', 1.55, 1.75, 0, { seg: 10 });
  for (const s of [-1, 1]) {
    // tai voi phe phẩy
    anim(add(g, new THREE.CylinderGeometry(0.42, 0.42, 0.1, 10), '#6d685e', 1.45, 1.85, s * 0.55, { rx: Math.PI / 2, sy: 1.3 }),
      { type: 'swayX', amp: 0.18, speed: 2.2, phase: s });
  }
  // vòi cong đung đưa
  anim(add(g, new THREE.CylinderGeometry(0.16, 0.13, 0.75, 7), '#7d786e', 2.1, 1.4, 0, { rz: 0.5 }),
    { type: 'sway', amp: 0.08, speed: 1.3, phase: 0 });
  anim(add(g, new THREE.CylinderGeometry(0.13, 0.1, 0.7, 7), '#7d786e', 2.42, 0.85, 0, { rz: 0.15 }),
    { type: 'sway', amp: 0.12, speed: 1.3, phase: 0.4 });
  anim(add(g, new THREE.CylinderGeometry(0.1, 0.07, 0.5, 7), '#7d786e', 2.4, 0.38, 0, { rz: -0.5 }),
    { type: 'sway', amp: 0.16, speed: 1.3, phase: 0.8 });
  for (const s of [-1, 1]) {
    cone(g, 0.09, 0.55, '#e8e2d0', 1.98, 1.4, s * 0.3, { rx: s * 0.35, rz: -0.9 });
    cyl(g, 0.2, 0.24, 1.1, '#6d685e', 0.6, 0.55, s * 0.5, { seg: 8 });
    cyl(g, 0.2, 0.24, 1.1, '#6d685e', -0.75, 0.55, s * 0.5, { seg: 8 });
  }
  box(g, 1.1, 0.14, 1.15, '#b8452e', 0, 2.5, 0);
  box(g, 0.75, 0.4, 0.8, '#8a5a38', 0, 2.75, 0);
  cyl(g, 0.06, 0.08, 0.5, '#5a4630', -1.5, 0.25, 0, { seg: 5 });
  return g;
}

function lamdong() { // Đà Lạt — Nhà thờ Con Gà
  const g = new THREE.Group();
  box(g, 1.6, 1.7, 2.9, '#d8a8a0', 0, 0.85, 0.4);
  add(g, new THREE.ConeGeometry(0.71, 1, 4), '#8f4a3c', 0, 2.2, 0.4, { ry: Math.PI / 4, sx: 1.9, sy: 1.2, sz: 3.2 });
  box(g, 1, 2.9, 1, '#d8a8a0', 0, 1.45, -1.35);
  cone(g, 0.75, 1.9, '#8f4a3c', 0, 3.85, -1.35, { seg: 4 });
  // con gà trên đỉnh
  sph(g, 0.12, '#e8b83a', 0, 5, -1.35, { seg: 6, emissive: '#c9971f', ei: 0.5 });
  cone(g, 0.07, 0.2, '#c23b2a', 0.12, 5.05, -1.35, { seg: 4, rz: -1.2 });
  add(g, new THREE.CylinderGeometry(0.2, 0.2, 0.06, 12), '#e8e2d0', 0, 1.9, 1.88, { rx: Math.PI / 2 });
  tree(g, 'pine', -1.5, 1.3, 1.25);
  tree(g, 'pine', 1.5, 0.9, 1.4);
  tree(g, 'pine', -1.3, -1.2, 1);
  return g;
}

function dongnai() { // Rừng Nam Cát Tiên — cây tung cổ thụ
  const g = new THREE.Group();
  cyl(g, 0.4, 0.7, 3, '#6b5638', 0, 1.5, 0, { seg: 9 });
  // rễ bạnh vè
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(g, new THREE.BoxGeometry(0.18, 1.1, 0.75), '#5f4c30',
      Math.cos(a) * 0.75, 0.4, Math.sin(a) * 0.75, { ry: -a, rz: 0.25 });
  }
  sph(g, 1.5, '#2c6e45', 0, 3.9, 0, { seg: 9 });
  sph(g, 1.05, '#37804f', -1.25, 3.3, 0.5, { seg: 8 });
  sph(g, 0.95, '#2a5c40', 1.2, 3.45, -0.4, { seg: 8 });
  tree(g, 'round', -2.2, 1, 0.85);
  tree(g, 'round', 2.3, 0.6, 0.75);
  sph(g, 0.16, '#d8c690', 1.6, 0.16, 1.6, { seg: 6 });
  return g;
}

function tayninh() { // Tòa thánh Cao Đài + núi Bà Đen
  const g = new THREE.Group();
  cone(g, 1.9, 3.4, '#4a6e52', -2, 1.7, -1.6, { seg: 8 });
  box(g, 3.1, 1.1, 1.6, '#e2d8b8', 0.8, 0.55, 0.7);
  for (const dx of [-0.85, 0.85]) {
    box(g, 0.75, 2.4, 0.75, '#e2d8b8', 0.8 + dx, 1.75, 1.05);
    roof(g, 0.95, 0.95, 0.55, '#3e6e9c', 0.8 + dx, 3, 1.05);
  }
  cyl(g, 0.55, 0.55, 0.9, '#e2d8b8', 0.8, 1.55, 0.35, { seg: 12 });
  sph(g, 0.55, '#3e6e9c', 0.8, 2.2, 0.35, { seg: 10 });
  // Thiên nhãn tỏa sáng theo nhịp
  anim(add(g, new THREE.CylinderGeometry(0.3, 0.3, 0.05, 12), '#e8b83a', 0.8, 1.35, 1.52,
    { rx: Math.PI / 2, emissive: '#c9971f', ei: 0.8 }),
    { type: 'pulse', amp: 1.4, speed: 1.8 });
  return g;
}

function vinhlong() { // Cầu Mỹ Thuận
  const g = new THREE.Group();
  add(g, new THREE.BoxGeometry(7.4, 0.12, 2, 1, 1, 1), '#4a7a52', 0, 0.06, 0.2,
    { emissive: '#2e5238', ei: 0.3, rough: 0.4 }).castShadow = false;
  box(g, 6.6, 0.2, 0.9, '#c9c2b2', 0, 1.15, 0.2);
  for (const s of [-1, 1]) {
    // trụ chữ H
    for (const dz of [-0.32, 0.72]) cyl(g, 0.11, 0.15, 3.6, '#b85a3a', s * 1.7, 1.8, 0.2 + dz * 0.8, { seg: 6, rz: -s * 0.1 });
    box(g, 0.55, 0.16, 1.3, '#b85a3a', s * 1.7, 3.2, 0.2);
    for (let i = 1; i <= 4; i++) {
      const x0 = s * 1.7, x1 = s * (1.7 - i * 0.62), len = Math.hypot(x1 - x0, 3.3 - 1.2 - i * 0.12);
      add(g, new THREE.CylinderGeometry(0.022, 0.022, len, 4), '#e8e2d0',
        (x0 + x1) / 2, (3.3 + 1.25) / 2 - i * 0.06, 0.2, { rz: Math.atan2(x1 - x0, -(2.05 - i * 0.12)) });
      const x2 = s * (1.7 + i * 0.55);
      add(g, new THREE.CylinderGeometry(0.022, 0.022, len, 4), '#e8e2d0',
        (x0 + x2) / 2, (3.3 + 1.25) / 2 - i * 0.06, 0.2, { rz: Math.atan2(x2 - x0, 2.05 - i * 0.12) });
    }
  }
  boat(g, 0.4, 1.9, 0.7, '#6b4a2f', null);
  return g;
}

function dongthap() { // Sen Tháp Mười
  const g = new THREE.Group();
  water(g, 3.4, 0, 0, '#2e6e5a');
  for (const [x, z, r] of [[-1.6, 0.9, 0.62], [1.4, 1.2, 0.5], [-0.6, -1.5, 0.55], [1.8, -0.8, 0.45]]) {
    cyl(g, r, r, 0.06, '#3f7a4a', x, 0.14, z, { seg: 12 });
  }
  anim(cyl(g, 0.09, 0.11, 1.9, '#3f7a4a', 0, 1.05, 0, { seg: 6 }), { type: 'sway', amp: 0.03, speed: 1.1 });
  // đài sen phát sáng + hai lớp cánh "thở"
  anim(cyl(g, 0.4, 0.25, 0.35, '#d8c23a', 0, 2.25, 0, { seg: 9, emissive: '#a8841f', ei: 0.4 }),
    { type: 'pulse', amp: 0.8, speed: 1.2 });
  for (let ring = 0; ring < 2; ring++) {
    const n = 7 + ring * 3, rr = 0.55 + ring * 0.4, ry = 2.15 - ring * 0.22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.3;
      anim(add(g, new THREE.SphereGeometry(0.3, 8, 6), ring ? '#e089b0' : '#d867a0',
        Math.cos(a) * rr, ry, Math.sin(a) * rr,
        { sx: 0.55, sy: 1.35, sz: 0.32, ry: -a, rz: (ring ? 0.85 : 0.5), emissive: '#b0447e', ei: 0.25 }),
        { type: 'breathe', amp: 0.05, speed: 1.2, phase: ring * 1.6 });
    }
  }
  cone(g, 0.2, 0.5, '#d867a0', -1.6, 0.42, 0.9, { seg: 7, emissive: '#b0447e', ei: 0.3 });
  return g;
}

function angiang() { // Miếu Bà Chúa Xứ + núi Sam
  const g = new THREE.Group();
  cone(g, 2, 3, '#4a6e52', -1.9, 1.5, -1.4, { seg: 8 });
  box(g, 2.4, 1.15, 1.9, '#d8d2c2', 0.9, 0.58, 0.6);
  // mái ngói xanh 3 tầng đặc trưng
  roof(g, 2.9, 2.3, 0.75, '#2e7a6e', 0.9, 1.35, 0.6);
  box(g, 1.6, 0.5, 1.25, '#d8d2c2', 0.9, 1.95, 0.6);
  roof(g, 2.1, 1.7, 0.65, '#2e7a6e', 0.9, 2.42, 0.6);
  box(g, 0.95, 0.4, 0.8, '#d8d2c2', 0.9, 2.95, 0.6);
  roof(g, 1.4, 1.2, 0.6, '#2e7a6e', 0.9, 3.3, 0.6);
  cone(g, 0.1, 0.35, '#e8b83a', 0.9, 4.05, 0.6, { seg: 6, emissive: '#c9971f', ei: 0.5 });
  add(g, new THREE.BoxGeometry(0.55, 0.8, 0.1), '#5a3d28', 0.9, 0.45, 1.57);
  tree(g, 'palm', 2.6, 0.9, 0.9);
  return g;
}

function camau() { // Đất Mũi — biểu tượng con tàu
  const g = new THREE.Group();
  water(g, 3.7, 0, 1.2, '#136850');
  add(g, new THREE.CylinderGeometry(2.6, 2.9, 0.5, 3), '#3f6b45', -0.4, 0.25, -1, { ry: 0.5 });
  // rừng đước — rễ chùm
  for (const [x, z] of [[-2, -1.6], [-1.2, -2.2], [0.6, -2.4], [-2.4, -0.4]]) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      add(g, new THREE.CylinderGeometry(0.02, 0.03, 0.5, 4), '#4f3a24', x + Math.cos(a) * 0.14, 0.55, z + Math.sin(a) * 0.14, { rz: Math.cos(a) * 0.35, rx: Math.sin(a) * 0.35 });
    }
    cyl(g, 0.05, 0.05, 0.5, '#5f4c30', x, 1, z, { seg: 5 });
    sph(g, 0.34, '#2c6e45', x, 1.4, z, { seg: 7 });
  }
  // mốc tọa độ — con tàu với cánh buồm căng gió
  box(g, 2.2, 0.5, 0.9, '#d8d2c2', 0.7, 0.75, 0.6);
  anim(add(g, new THREE.ConeGeometry(0.9, 2.6, 4), '#e8e2d0', 0.7, 2.3, 0.6, { sz: 0.14, emissive: '#c9beA8', ei: 0.15 }),
    { type: 'flutter', amp: 0.04, speed: 3.2 });
  box(g, 1.15, 0.3, 0.12, '#b8452e', 0.7, 1.25, 1.02);
  return g;
}

// ══════════════════════════════════════════════════════════════

export const LANDMARKS = {
  'Hà Nội':          { title: 'Khuê Văn Các', desc: 'Biểu tượng Văn Miếu – Quốc Tử Giám nghìn năm văn hiến', build: hanoi },
  'Hải Phòng':       { title: 'Thành phố Cảng', desc: 'Hải đăng Long Châu và bến cảng lớn nhất miền Bắc', build: haiphong },
  'Huế':             { title: 'Ngọ Môn – Kỳ Đài', desc: 'Cổng chính Hoàng thành, kinh đô triều Nguyễn', build: hue },
  'Đà Nẵng':         { title: 'Cầu Vàng', desc: 'Dải lụa vàng trên đôi bàn tay đá giữa mây Bà Nà', build: danang },
  'TP. Hồ Chí Minh': { title: 'Landmark 81', desc: 'Tòa nhà cao nhất Việt Nam bên sông Sài Gòn', build: hcm },
  'Cần Thơ':         { title: 'Chợ nổi Cái Răng', desc: 'Phiên chợ trên sông của miền Tây gạo trắng nước trong', build: cantho },
  'Tuyên Quang':     { title: 'Lán Nà Nưa', desc: 'Căn lán tre nứa nơi Bác Hồ chỉ đạo Tổng khởi nghĩa', build: tuyenquang },
  'Cao Bằng':        { title: 'Thác Bản Giốc', desc: 'Thác nước hùng vĩ nhất Việt Nam trên dòng Quây Sơn', build: caobang },
  'Lai Châu':        { title: 'Đèo Ô Quy Hồ', desc: 'Một trong tứ đại đỉnh đèo, mây phủ quanh năm', build: laichau },
  'Lào Cai':         { title: 'Fansipan', desc: 'Nóc nhà Đông Dương 3.143 m giữa ruộng bậc thang Sa Pa', build: laocai },
  'Thái Nguyên':     { title: 'Đồi chè Tân Cương', desc: 'Đệ nhất danh trà với những nương chè xanh ngát', build: thainguyen },
  'Điện Biên':       { title: 'Tượng đài Chiến thắng', desc: 'Điện Biên Phủ — lừng lẫy năm châu, chấn động địa cầu', build: dienbien },
  'Lạng Sơn':        { title: 'Núi Tô Thị', desc: 'Nàng vọng phu bồng con hóa đá chờ chồng', build: langson },
  'Sơn La':          { title: 'Cao nguyên Mộc Châu', desc: 'Đồi chè trải dài và mùa hoa mận trắng muốt', build: sonla },
  'Phú Thọ':         { title: 'Đền Hùng', desc: 'Đất Tổ — nơi thờ các Vua Hùng dựng nước', build: phutho },
  'Bắc Ninh':        { title: 'Đình làng Quan họ', desc: 'Mái đình cong và câu hát giao duyên di sản UNESCO', build: bacninh },
  'Quảng Ninh':      { title: 'Vịnh Hạ Long', desc: 'Kỳ quan đá vôi giữa biển xanh, di sản thế giới', build: quangninh },
  'Hưng Yên':        { title: 'Văn miếu Xích Đằng', desc: 'Dấu tích Phố Hiến — thứ nhất Kinh Kỳ, thứ nhì Phố Hiến', build: hungyen },
  'Ninh Bình':       { title: 'Tràng An', desc: 'Vịnh Hạ Long trên cạn, di sản kép đầu tiên của Việt Nam', build: ninhbinh },
  'Thanh Hóa':       { title: 'Thành nhà Hồ', desc: 'Tòa thành đá độc nhất Đông Nam Á, xây trong 3 tháng', build: thanhhoa },
  'Nghệ An':         { title: 'Làng Sen', desc: 'Mái nhà tranh quê hương Chủ tịch Hồ Chí Minh', build: nghean },
  'Hà Tĩnh':         { title: 'Ngã ba Đồng Lộc', desc: 'Huyền thoại 10 cô gái thanh niên xung phong', build: hatinh },
  'Quảng Trị':       { title: 'Cầu Hiền Lương', desc: 'Cây cầu đôi bờ Bến Hải — khát vọng thống nhất', build: quangtri },
  'Quảng Ngãi':      { title: 'Đảo Lý Sơn', desc: 'Vương quốc tỏi trên miệng núi lửa giữa biển', build: quangngai },
  'Gia Lai':         { title: 'Nhà rông Tây Nguyên', desc: 'Mái nhà cao vút — trái tim của buôn làng', build: gialai },
  'Khánh Hòa':       { title: 'Tháp Bà Ponagar', desc: 'Quần thể đền tháp Chăm nghìn năm bên vịnh Nha Trang', build: khanhhoa },
  'Đắk Lắk':         { title: 'Voi Bản Đôn', desc: 'Thủ phủ cà phê và truyền thống thuần dưỡng voi rừng', build: daklak },
  'Lâm Đồng':        { title: 'Nhà thờ Con Gà', desc: 'Dấu ấn Đà Lạt — thành phố ngàn hoa trong sương', build: lamdong },
  'Đồng Nai':        { title: 'Rừng Nam Cát Tiên', desc: 'Khu dự trữ sinh quyển với những cây tung cổ thụ', build: dongnai },
  'Tây Ninh':        { title: 'Tòa thánh Cao Đài', desc: 'Thánh địa đạo Cao Đài dưới chân núi Bà Đen', build: tayninh },
  'Vĩnh Long':       { title: 'Cầu Mỹ Thuận', desc: 'Cầu dây văng đầu tiên bắc qua sông Tiền', build: vinhlong },
  'Đồng Tháp':       { title: 'Sen Tháp Mười', desc: 'Tháp Mười đẹp nhất bông sen', build: dongthap },
  'An Giang':        { title: 'Miếu Bà Chúa Xứ', desc: 'Điểm hành hương linh thiêng dưới chân núi Sam', build: angiang },
  'Cà Mau':          { title: 'Đất Mũi', desc: 'Nơi con tàu Tổ quốc hướng ra biển — cực Nam đất nước', build: camau },
};
