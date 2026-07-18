// "55 ngày đêm — Mùa Xuân 1975" (?film=1975)
// Bản đồ chiến sự 90s: xám thép ↔ đỏ giải phóng, cờ đúng lịch sử
// (Bắc: cờ đỏ sao vàng · vùng giải phóng: cờ Giải phóng nửa đỏ – nửa xanh),
// trận Xuân Lộc có xe tăng khai hỏa, Dinh Độc Lập tái hiện cú húc cổng của
// xe 390. Hoàng Sa (bị chiếm đóng từ 1/1974) giữ trung lập — không tô màu.
import * as THREE from 'three';

// ── Bảng màu "THAN HỒNG" (art direction 1c — điện ảnh tối đa) ──
// Đêm không trăng; vùng giải phóng cháy âm ỉ như lò than vừa khơi;
// mũi tiến quân vàng nóng, đầu mũi trắng lửa.
const LAND_GREY = '#262b30';   // than nguội, xám khói
const LAND_SIDE = '#161a1e';
const LAND_RED = '#6e1a12';    // đáy lò — tối nhất, sâu nhất
const LAND_RED_SIDE = '#3d0c08';
const LAND_RED_EMI = '#ff5a24';
const EMI_MAX = 0.14;
const ARROW_C = '#ffc878';     // vàng nóng
const ARROW_HEAD_C = '#fff1d6';// trắng lửa
const FLASH_C = '#fff3d8';
const BOOM_C = '#ff8f3f';
const SMOKE_C = '#4c4038';
const DMZ_C = '#a89478';
const SKY_FOG = '#070d12';
const SEA_C = '#0a161c';
const FLAG_RED = '#d01e2a';    // màu cờ: lịch sử — không đổi
const FLAG_BLUE = '#1e4fa8';
const GOLD = '#ffcd00';

const NORTH = [
  'Điện Biên', 'Lai Châu', 'Lào Cai', 'Cao Bằng', 'Lạng Sơn', 'Tuyên Quang',
  'Thái Nguyên', 'Sơn La', 'Phú Thọ', 'Hà Nội', 'Bắc Ninh', 'Hưng Yên',
  'Hải Phòng', 'Quảng Ninh', 'Ninh Bình', 'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh',
];

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const backOut = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const clamp01 = (v) => THREE.MathUtils.clamp(v, 0, 1);

export function createFilm(ctx) {
  const { scene, camera, controls, provinceGroups, PROVINCE_SHAPES, px, pz, DEPTH, lights } = ctx;

  const $ = (id) => document.getElementById(id);
  const dateEl = $('film-date-text');
  const dateBox = document.querySelector('.film-date');
  const capEl = $('film-caption');

  const byName = new Map(PROVINCE_SHAPES.map((p, i) => [p.name, i]));
  const V = (lon, lat, y) => new THREE.Vector3(px(lon), y, pz(lat));

  // ── Tô đỏ vùng giải phóng: đổi thẳng màu vật liệu tỉnh ─────
  const GREY_C = new THREE.Color(LAND_GREY);
  const RED_C = new THREE.Color(LAND_RED);
  const GREY_SIDE_C = new THREE.Color(LAND_SIDE);
  const RED_SIDE_C = new THREE.Color(LAND_RED_SIDE);
  const tints = new Map(); // idx → { k, target, mat, side }
  function liberate(name, instant = false) {
    const idx = byName.get(name);
    if (idx === undefined) return;
    let t = tints.get(idx);
    if (!t) {
      t = {
        k: 0, target: 1,
        mat: provinceGroups[idx].topMat,
        side: provinceGroups[idx].meshes[0]?.material[1] ?? null,
      };
      tints.set(idx, t);
    }
    t.target = 1;
    if (instant) t.k = 1;
  }

  // ── Đảo xa: tách vật liệu riêng — Hoàng Sa trung lập vĩnh viễn,
  //    Trường Sa chỉ đỏ đúng ngày 14→29/4 ─────────────────────
  const spratlyMats = [];
  function detachOffshore(name, collect) {
    const idx = byName.get(name);
    const pg = provinceGroups[idx];
    const p = PROVINCE_SHAPES[idx];
    p.polys.forEach((ring, i) => {
      if (ring.some(([lon]) => lon > 110.3)) {
        const m = pg.meshes[i];
        const top = new THREE.MeshStandardMaterial({ color: LAND_GREY, roughness: 0.9 });
        const side = new THREE.MeshStandardMaterial({ color: LAND_SIDE, roughness: 0.95 });
        m.material = [top, side];
        if (collect) spratlyMats.push(top);
      }
    });
  }

  function spratlyRed(k) { // 0..1 — Trường Sa đỏ dần
    for (const m of spratlyMats) m.color.lerpColors(GREY_C, RED_C, k);
  }
  let spratlyTarget = 0, spratlyK = 0;

  // ── Quảng Trị tách tại Bến Hải: nửa bắc phủ tấm đỏ từ đầu ──
  function clipRing(ring, lat0, keepNorth) {
    const inside = ([, la]) => (keepNorth ? la >= lat0 : la <= lat0);
    const cross = (a, b) => {
      const t = (lat0 - a[1]) / (b[1] - a[1]);
      return [a[0] + (b[0] - a[0]) * t, lat0];
    };
    const out = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      if (inside(a)) { out.push(a); if (!inside(b)) out.push(cross(a, b)); }
      else if (inside(b)) out.push(cross(a, b));
    }
    return out.length >= 3 ? out : null;
  }

  function overlayFromRing(ring, color) {
    const s = new THREE.Shape();
    ring.forEach(([lon, lat], i) => {
      const x = px(lon), y = -pz(lat);
      i === 0 ? s.moveTo(x, y) : s.lineTo(x, y);
    });
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color, roughness: 0.9, emissive: LAND_RED_EMI, emissiveIntensity: EMI_MAX,
    }));
    m.position.y = DEPTH + 0.4;
    scene.add(m);
    return m;
  }

  {
    const qt = PROVINCE_SHAPES[byName.get('Quảng Trị')];
    const north = clipRing(qt.polys[0], 17.0, true);
    if (north) overlayFromRing(north, LAND_RED);
  }

  // ── Giới tuyến Bến Hải ─────────────────────────────────────
  const dmz = new THREE.Mesh(
    new THREE.BoxGeometry(px(107.25) - px(106.52), 0.06, 0.2),
    new THREE.MeshBasicMaterial({ color: DMZ_C, transparent: true, opacity: 0.85 })
  );
  dmz.position.set((px(106.52) + px(107.25)) / 2, DEPTH + 0.56, pz(17.0));
  scene.add(dmz);

  // ── Ngôi sao vàng (Shape 5 cánh) ───────────────────────────
  function star(size, x, y, z) {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? size : size * 0.382;
      i === 0 ? s.moveTo(Math.cos(a) * r, -Math.sin(a) * r) : s.lineTo(Math.cos(a) * r, -Math.sin(a) * r);
    }
    const m = new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }),
      new THREE.MeshBasicMaterial({ color: GOLD })
    );
    m.position.set(x, y, z);
    return m;
  }

  // ── Cờ ─────────────────────────────────────────────────────
  const flags = [];
  function plantFlag(lon, lat, kind = 'gp', s = 1) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05 * s, 0.07 * s, 2.6 * s, 6),
      new THREE.MeshStandardMaterial({ color: '#d8d2c2', roughness: 0.6 })
    );
    pole.position.y = 1.3 * s;
    g.add(pole);
    const cloth = new THREE.Group();
    const w = 1.7 * s, h = 1.05 * s;
    if (kind === 'gp') {
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, h / 2, 0.05), new THREE.MeshBasicMaterial({ color: FLAG_RED }));
      const bot = new THREE.Mesh(new THREE.BoxGeometry(w, h / 2, 0.05), new THREE.MeshBasicMaterial({ color: FLAG_BLUE }));
      top.position.y = h / 4;
      bot.position.y = -h / 4;
      cloth.add(top, bot);
    } else {
      cloth.add(new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), new THREE.MeshBasicMaterial({ color: FLAG_RED })));
    }
    cloth.add(star(0.3 * s, 0, 0, 0.035));
    cloth.position.set(w / 2 + 0.05, 2.05 * s, 0);
    g.add(cloth);
    g.userData.cloth = cloth;
    g.position.set(px(lon), DEPTH + 0.45, pz(lat));
    g.scale.setScalar(0.001);
    scene.add(g);
    flags.push({ group: g, born: T });
    return g;
  }

  // ── Hiệu ứng nổ / khói / đạn ───────────────────────────────
  const fx = [];
  function boom(pos, size = 1) {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.3 * size, 10, 8),
      new THREE.MeshBasicMaterial({ color: BOOM_C, transparent: true, opacity: 1 })
    );
    core.position.copy(pos);
    scene.add(core);
    fx.push({ kind: 'boom', m: core, born: T, size });
    for (let i = 0; i < 3; i++) {
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry((0.22 + Math.random() * 0.14) * size, 8, 6),
        new THREE.MeshBasicMaterial({ color: SMOKE_C, transparent: true, opacity: 0.55 })
      );
      smoke.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.15, (Math.random() - 0.5) * 0.5));
      scene.add(smoke);
      fx.push({ kind: 'smoke', m: smoke, born: T + i * 0.08, size });
    }
  }

  function tracer(from, to, dur = 0.3, size = 1) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.07 * size, 6, 5),
      new THREE.MeshBasicMaterial({ color: ARROW_HEAD_C })
    );
    m.position.copy(from);
    scene.add(m);
    fx.push({ kind: 'tracer', m, born: T, from: from.clone(), to: to.clone(), dur, size });
  }

  function muzzle(pos) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 7, 6),
      new THREE.MeshBasicMaterial({ color: FLASH_C, transparent: true, opacity: 1 })
    );
    m.position.copy(pos);
    scene.add(m);
    fx.push({ kind: 'muzzle', m, born: T });
  }

  const flashes = [];
  function flash(lon, lat, size = 6) {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 1, 40),
      new THREE.MeshBasicMaterial({ color: FLASH_C, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(px(lon), DEPTH + 0.6, pz(lat));
    scene.add(m);
    flashes.push({ m, born: T, size });
  }

  // ── Mũi tiến quân ──────────────────────────────────────────
  const SEG = 200, RAD = 6;
  const arrows = [];
  let arrowsFading = false;
  function arrow(waypoints, t0, dur, width = 0.22) {
    const curve = new THREE.CatmullRomCurve3(
      waypoints.map(([lon, lat]) => V(lon, lat, DEPTH + 0.5)), false, 'catmullrom', 0.2
    );
    const mat = new THREE.MeshBasicMaterial({ color: ARROW_C, transparent: true, opacity: 0.95 });
    const headMat = new THREE.MeshBasicMaterial({ color: ARROW_HEAD_C, transparent: true, opacity: 1 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, width, RAD, false), mat);
    tube.geometry.setDrawRange(0, 0);
    const head = new THREE.Mesh(new THREE.ConeGeometry(width * 2.8, width * 6, 8), headMat);
    head.visible = false;
    scene.add(tube, head);
    arrows.push({ curve, tube, head, mat, headMat, t0, dur });
  }

  // ── Xe tăng T-54 low-poly (mặt trước +Z) ───────────────────
  function tank(s = 1) {
    const g = new THREE.Group();
    const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true });
    const add = (geo, c, x, y, z, rot) => {
      const m = new THREE.Mesh(geo, M(c));
      m.position.set(x * s, y * s, z * s);
      if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    // xích + bánh chịu lực
    for (const sd of [-1, 1]) {
      add(new THREE.BoxGeometry(0.3 * s, 0.34 * s, 2.15 * s), '#23291f', sd * 0.56, 0.3, 0);
      for (let i = 0; i < 5; i++) {
        add(new THREE.CylinderGeometry(0.15 * s, 0.15 * s, 0.1 * s, 10), '#3a4232',
          sd * 0.62, 0.18, -0.8 + i * 0.4, [0, 0, Math.PI / 2]);
      }
    }
    add(new THREE.BoxGeometry(1.05 * s, 0.34 * s, 2.1 * s), '#49573b', 0, 0.52, 0);
    add(new THREE.BoxGeometry(1.0 * s, 0.3 * s, 0.5 * s), '#49573b', 0, 0.56, 1.12, [-0.42, 0, 0]); // giáp trước vát
    const tur = add(new THREE.SphereGeometry(0.44 * s, 12, 8), '#54644a', 0, 0.86, -0.08);
    tur.scale.y = 0.58;
    const gun = add(new THREE.CylinderGeometry(0.05 * s, 0.06 * s, 1.9 * s, 7), '#39422e', 0, 0.9, 1.05, [Math.PI / 2 - 0.03, 0, 0]);
    add(new THREE.BoxGeometry(0.12 * s, 0.12 * s, 0.22 * s), '#2c3424', 0, 0.92, 2.0); // loa hãm nòng
    add(new THREE.CylinderGeometry(0.012 * s, 0.012 * s, 0.7 * s, 4), '#8a9078', -0.3, 1.35, -0.5);
    g.userData.muzzleLocal = new THREE.Vector3(0, 0.92 * s, 2.1 * s);
    return g;
  }

  function tankFire(t, targetPos, size = 1) {
    const mz = t.localToWorld(t.userData.muzzleLocal.clone());
    muzzle(mz);
    tracer(mz, targetPos, 0.28, size);
    fx.push({ kind: 'delayboom', born: T + 0.28, pos: targetPos.clone(), size: size * 0.9 });
  }

  // ── Trận Xuân Lộc: cụm tăng khai hỏa vào tuyến phòng thủ ───
  let xlScene = null;
  function buildXuanLoc() {
    const g = new THREE.Group();
    const t1 = tank(0.7), t2 = tank(0.7), t3 = tank(0.7);
    t1.position.set(-1.6, 0, -0.4);
    t2.position.set(-2.3, 0, 0.9);
    t3.position.set(-1.2, 0, 1.9);
    for (const t of [t1, t2, t3]) t.rotation.y = Math.PI / 2 - 0.25; // hướng đông → tuyến địch
    g.add(t1, t2, t3);
    // tuyến phòng thủ: ụ đất + chướng ngại
    const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
    const bunkers = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.9), M('#5c5648'));
      b.position.set(1.7 + (i % 2) * 0.5, 0.2, -1 + i * 1.15);
      g.add(b);
      bunkers.push(b);
    }
    g.position.set(px(107.38), DEPTH + 0.42, pz(10.94));
    g.visible = false;
    scene.add(g);
    return { g, tanks: [t1, t2, t3], bunkers };
  }
  xlScene = buildXuanLoc();

  // ── Tàu hải quân ra Trường Sa ──────────────────────────────
  function navy() {
    const g = new THREE.Group();
    const M = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.32, 2.4), M('#77848f'));
    hull.position.y = 0.34;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.9), M('#93a0ab'));
    cab.position.set(0, 0.68, -0.2);
    g.add(hull, cab);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.02), new THREE.MeshBasicMaterial({ color: FLAG_RED }));
    const fb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.02), new THREE.MeshBasicMaterial({ color: FLAG_BLUE }));
    fr.position.set(0.21, 1.28, -1);
    fb.position.set(0.21, 1.14, -1);
    const fp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 5), M('#d8d2c2'));
    fp.position.set(0, 1.05, -1);
    g.add(fp, fr, fb);
    g.visible = false;
    scene.add(g);
    return g;
  }
  const navyShip = navy();
  let shipRun = null;
  const shipCurve = new THREE.CatmullRomCurve3(
    [[108.25, 16.1], [110.2, 14.6], [112.6, 12.6], [114.28, 11.42], [114.35, 10.15], [113.2, 9.2], [111.95, 8.68]]
      .map(([lon, lat]) => V(lon, lat, 0.4)),
    false, 'catmullrom', 0.25
  );
  const shipTrail = new THREE.Mesh(
    new THREE.TubeGeometry(shipCurve, SEG, 0.09, RAD, false),
    new THREE.MeshBasicMaterial({ color: ARROW_C, transparent: true, opacity: 0.8 })
  );
  shipTrail.geometry.setDrawRange(0, 0);
  scene.add(shipTrail);

  // ── Dinh Độc Lập: cú húc cổng lịch sử của xe 390 ───────────
  const SG = [106.695, 10.777];
  function buildDinh() {
    const g = new THREE.Group();
    const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true, ...o });
    const add = (geo, c, x, y, z, o) => {
      const m = new THREE.Mesh(geo, M(c, o));
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    add(new THREE.BoxGeometry(6.6, 0.35, 2.8), '#cfc9b8', 0, 0.18, -2.4);
    add(new THREE.BoxGeometry(6.2, 1.6, 2.3), '#e8e3d5', 0, 1.15, -2.4);
    for (let i = 0; i < 8; i++) add(new THREE.BoxGeometry(0.14, 1.6, 0.14), '#f4f0e4', -2.6 + i * 0.75, 1.15, -1.2);
    add(new THREE.BoxGeometry(6.4, 0.22, 2.5), '#bfb9a8', 0, 2.05, -2.4);
    add(new THREE.CylinderGeometry(0.05, 0.06, 2.0, 6), '#d8d2c2', 0, 3.1, -2.4);
    const roofFlag = new THREE.Group();
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 0.04), new THREE.MeshBasicMaterial({ color: FLAG_RED }));
    const fb = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.42, 0.04), new THREE.MeshBasicMaterial({ color: FLAG_BLUE }));
    fr.position.y = 0.21;
    fb.position.y = -0.21;
    roofFlag.add(fr, fb, star(0.2, 0, 0, 0.035));
    roofFlag.position.set(0.72, 3.65, -2.4);
    roofFlag.scale.setScalar(0.001);
    g.add(roofFlag);
    // sân + thảm cỏ
    add(new THREE.BoxGeometry(7, 0.06, 5.6), '#3f4a38', 0, 0.03, 0.6);
    // hàng rào + cổng sắt
    const gatePivot = new THREE.Group();
    gatePivot.position.set(0, 0.04, 2.6);
    const gate = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 0.07), M('#37424d', { metalness: 0.55, roughness: 0.35 }));
    gate.position.y = 0.6;
    gatePivot.add(gate);
    g.add(gatePivot);
    add(new THREE.BoxGeometry(0.4, 1.55, 0.4), '#cfc9b8', -1.55, 0.78, 2.6);
    add(new THREE.BoxGeometry(0.4, 1.55, 0.4), '#cfc9b8', 1.55, 0.78, 2.6);
    add(new THREE.BoxGeometry(2.2, 0.9, 0.08), '#4a5560', -2.7, 0.45, 2.6);
    add(new THREE.BoxGeometry(2.2, 0.9, 0.08), '#4a5560', 2.7, 0.45, 2.6);
    const t390 = tank(0.85), t843 = tank(0.85);
    t390.position.set(-0.3, 0, 7.6);
    t843.position.set(1.0, 0, 9.4);
    t390.rotation.y = Math.PI;
    t843.rotation.y = Math.PI;
    g.add(t390, t843);
    g.position.set(px(SG[0]), DEPTH + 0.42, pz(SG[1]));
    g.scale.setScalar(1.5);
    g.visible = false;
    scene.add(g);
    return { g, gatePivot, roofFlag, t390, t843 };
  }
  const dinh = buildDinh();

  // ── 9 cú máy — tĩnh hoặc trượt MỘT hướng ───────────────────
  const SHOTS = [
    { t0: 0, t1: 8, fromPos: new THREE.Vector3(4, 190, 165), toPos: new THREE.Vector3(6, 122, 102), fromTgt: new THREE.Vector3(4, 0, 0), toTgt: new THREE.Vector3(5, 0, 4) },
    { t0: 8, t1: 17, fromPos: V(108.6, 11.15, 26), toPos: V(108.7, 11.45, 24), fromTgt: V(108.0, 13.2, 1), toTgt: V(108.0, 13.4, 1) },
    { t0: 17, t1: 30, fromPos: V(107.9, 15.6, 22), toPos: V(108.9, 14.5, 22), fromTgt: V(107.3, 17.0, 2), toTgt: V(108.35, 15.8, 2) },
    { t0: 30, t1: 38, fromPos: V(109.6, 11.2, 26), toPos: V(109.5, 11.15, 24), fromTgt: V(108.9, 12.9, 1.5), toTgt: V(108.9, 12.95, 1.5) },
    { t0: 38, t1: 49, fromPos: V(110.6, 9.4, 34), toPos: V(111.4, 9.2, 30), fromTgt: V(112.4, 11.6, 0), toTgt: V(112.9, 11.4, 0) },
    { t0: 49, t1: 56.5, fromPos: V(107.32, 10.62, 7), toPos: V(107.33, 10.64, 6.4), fromTgt: V(107.4, 10.95, 2.6), toTgt: V(107.4, 10.95, 2.6) },
    { t0: 56.5, t1: 65, fromPos: V(106.7, 9.0, 62), toPos: V(106.7, 9.2, 56), fromTgt: V(106.68, 10.85, 0), toTgt: V(106.68, 10.85, 0) },
    { t0: 65, t1: 76, fromPos: V(106.75, 10.5, 7.2), toPos: V(106.74, 10.53, 6.4), fromTgt: V(106.7, 10.79, 3.6), toTgt: V(106.7, 10.79, 3.8) },
    { t0: 76, t1: 91, fromPos: V(106.4, 8.6, 55), toPos: new THREE.Vector3(0, 175, 155), fromTgt: V(106.5, 11.5, 2), toTgt: new THREE.Vector3(8, 0, 0) },
  ];

  // Dinh quay mặt về phía máy quay của cú máy 8
  {
    const camP = SHOTS[7].fromPos, base = dinh.g.position;
    dinh.g.rotation.y = Math.atan2(camP.x - base.x, camP.z - base.z);
  }
  // Cụm Xuân Lộc quay theo cú máy 6
  {
    const camP = SHOTS[5].fromPos, base = xlScene.g.position;
    xlScene.g.rotation.y = Math.atan2(camP.x - base.x, camP.z - base.z) - Math.PI / 2;
  }

  const setDate = (d) => { dateEl.textContent = d; dateBox.classList.add('show'); };
  const caption = (c) => {
    capEl.classList.remove('show');
    if (!c) return;
    setTimeout(() => { capEl.textContent = c; capEl.classList.add('show'); }, 350);
  };

  // ── Kịch bản sự kiện ───────────────────────────────────────
  const CUES = [
    { t: 0.1, fn: () => { $('film-fade').classList.add('clear'); $('film-title').classList.add('show'); } },
    { t: 0.3, fn: () => {
        detachOffshore('Đà Nẵng', false);   // Hoàng Sa: trung lập — bị chiếm đóng từ 1/1974
        detachOffshore('Khánh Hòa', true);  // Trường Sa: đỏ đúng ngày 14→29/4
        for (const n of NORTH) liberate(n, true);
        plantFlag(105.84, 21.03, 'vn', 1.3); // Cột cờ Hà Nội
        setDate('Tháng 3 · 1975');
      } },
    { t: 6, fn: () => $('film-title').classList.remove('show') },
    { t: 8.3, fn: () => { setDate('10 · 03 · 1975'); caption('Đòn điểm huyệt Buôn Ma Thuột'); flash(108.05, 12.68); boom(V(108.05, 12.68, DEPTH + 0.8), 2.2); liberate('Đắk Lắk'); plantFlag(108.05, 12.68); } },
    { t: 8.6, fn: () => arrow([[107.4, 15.2], [107.55, 14.2], [107.9, 13.3], [108.05, 12.72]], 8.6, 2.2) },
    { t: 13, fn: () => { setDate('18 · 03 · 1975'); caption('Tây Nguyên hoàn toàn giải phóng'); liberate('Gia Lai'); plantFlag(108.0, 13.98); flash(108.0, 13.98, 4); } },
    { t: 17.5, fn: () => { setDate('19 · 03 · 1975'); caption('Giải phóng Quảng Trị'); liberate('Quảng Trị'); plantFlag(107.19, 16.75); flash(107.19, 16.75, 4); } },
    { t: 18.2, fn: () => arrow([[107.05, 16.95], [107.35, 16.6], [107.58, 16.46], [107.95, 16.2], [108.2, 16.05], [108.55, 15.6], [108.79, 15.12]], 18.2, 10) },
    { t: 21.5, fn: () => { setDate('26 · 03 · 1975'); caption('Giải phóng Huế'); liberate('Huế'); plantFlag(107.58, 16.46); flash(107.58, 16.46, 4.5); } },
    { t: 24.5, fn: () => liberate('Quảng Ngãi') },
    { t: 25.8, fn: () => { setDate('29 · 03 · 1975'); caption('Giải phóng Đà Nẵng'); liberate('Đà Nẵng'); plantFlag(108.2, 16.06); flash(108.2, 16.06, 5); } },
    { t: 30.4, fn: () => { setDate('01 · 04 · 1975'); caption('Quy Nhơn · Tuy Hòa'); plantFlag(109.22, 13.77); plantFlag(109.32, 13.08); flash(109.22, 13.77, 3.5); } },
    { t: 33, fn: () => { setDate('02 · 04 · 1975'); caption('Giải phóng Nha Trang'); liberate('Khánh Hòa'); plantFlag(109.19, 12.25); flash(109.19, 12.25, 4); } },
    { t: 35.5, fn: () => { setDate('03 · 04 · 1975'); caption('Giải phóng Đà Lạt — duyên hải sạch bóng địch'); liberate('Lâm Đồng'); plantFlag(108.44, 11.94); } },
    { t: 38.4, fn: () => { setDate('11 · 04 · 1975'); caption('Đoàn tàu Đoàn 125 rời Đà Nẵng hướng Trường Sa'); navyShip.visible = true; shipRun = { t0: 38.4, dur: 7.2 }; } },
    { t: 43.4, fn: () => { setDate('14 · 04 · 1975'); caption('Giải phóng đảo Song Tử Tây'); plantFlag(114.28, 11.42, 'gp', 0.9); flash(114.28, 11.42, 3); spratlyTarget = 0.45; } },
    { t: 45.4, fn: () => { setDate('25 – 28 · 04'); caption('Sơn Ca · Nam Yết · Sinh Tồn'); plantFlag(114.35, 10.15, 'gp', 0.8); spratlyTarget = 0.75; } },
    { t: 47, fn: () => { setDate('9h00 · 29 · 04 · 1975'); caption('Cờ Giải phóng tung bay trên đảo Trường Sa'); plantFlag(111.95, 8.68, 'gp', 1.15); flash(111.95, 8.68, 4); spratlyTarget = 1; } },
    { t: 49.3, fn: () => { setDate('09 – 20 · 04 · 1975'); caption('Xuân Lộc — "cánh cửa thép" phía Đông Sài Gòn'); xlScene.g.visible = true; } },
    { t: 50.2, fn: () => xlFire(0) },
    { t: 51.3, fn: () => xlFire(1) },
    { t: 52.2, fn: () => xlFire(2) },
    { t: 53.1, fn: () => xlFire(0) },
    { t: 54.2, fn: () => { setDate('21 · 04 · 1975'); caption('Xuân Lộc thất thủ'); liberate('Đồng Nai'); plantFlag(107.32, 10.85); flash(107.4, 10.93, 4.5); } },
    { t: 57, fn: () => { setDate('17h00 · 26 · 04 · 1975'); caption('Chiến dịch Hồ Chí Minh — 5 cánh quân tiến về Sài Gòn'); xlScene.g.visible = false; } },
    { t: 57.4, fn: () => {
        arrow([[106.62, 11.55], [106.66, 11.15], [106.68, 10.85]], 57.4, 4.5);
        arrow([[107.35, 10.48], [107.0, 10.62], [106.73, 10.74]], 58.0, 4.5);
        arrow([[106.15, 11.3], [106.4, 11.05], [106.63, 10.83]], 58.6, 4.5);
        arrow([[107.42, 10.95], [107.05, 10.95], [106.73, 10.8]], 59.2, 4.5);
        arrow([[106.05, 10.55], [106.35, 10.66], [106.63, 10.75]], 59.8, 4.5);
      } },
    { t: 64, fn: () => { arrowsFading = true; caption(''); } },
    { t: 64.8, fn: () => { dinh.g.visible = true; } },
    { t: 66, fn: () => { setDate('30 · 04 · 1975'); caption('Xe tăng 390 húc đổ cổng Dinh Độc Lập'); } },
    { t: 71.2, fn: () => { caption('11h30 — Cờ Giải phóng trên nóc Dinh Độc Lập'); flash(SG[0], SG[1], 6); liberate('TP. Hồ Chí Minh'); } },
    { t: 73.5, fn: () => {
        caption('Miền Nam hoàn toàn giải phóng');
        ['Tây Ninh', 'Đồng Tháp', 'Vĩnh Long', 'Cần Thơ', 'An Giang', 'Cà Mau'].forEach((n, i) => {
          setTimeout(() => liberate(n), i * 300);
        });
      } },
    { t: 78.5, fn: () => { caption(''); dateBox.classList.remove('show'); $('film-end').classList.add('show'); } },
    { t: 89, fn: () => $('film-fade').classList.remove('clear') },
  ];

  function xlFire(i) {
    const t = xlScene.tanks[i];
    const b = xlScene.bunkers[i % xlScene.bunkers.length];
    tankFire(t, b.getWorldPosition(new THREE.Vector3()), 1);
  }

  // ── Máy trạng thái ─────────────────────────────────────────
  let T = 0;
  let started = false;
  let cueIdx = 0;

  function start() {
    document.body.classList.add('film');
    $('film-ui').hidden = false;
    controls.enabled = false;
    // Grade "Than Hồng": đêm không trăng, key nhường sáng cho emissive
    if (ctx.renderer) ctx.renderer.toneMappingExposure = 1.0;
    scene.background = new THREE.Color(SKY_FOG);
    if (scene.fog) { scene.fog.color.set(SKY_FOG); scene.fog.density = 0.003; }
    if (ctx.sea) ctx.sea.color.set(SEA_C);
    if (lights) {
      lights.key.color.set('#ffc98a');
      lights.key.intensity = 0.9;
      lights.hemi.color.set('#6f7f8c');
      lights.hemi.groundColor.set('#1a130e');
      lights.hemi.intensity = 0.3;
      if (lights.rim) {
        lights.rim.color.set('#3f7fb0');
        lights.rim.intensity = 0.38;
      }
    }
    for (const pg of provinceGroups) {
      pg.topMat.color.set(LAND_GREY);
      pg.topMat.emissive.set(LAND_RED_EMI);
      pg.topMat.emissiveIntensity = 0;
      const side = pg.meshes[0]?.material[1];
      if (side) side.color.set(LAND_SIDE);
    }
    started = true;
  }

  function step(dt) {
    if (!started) return;
    T += dt;

    while (cueIdx < CUES.length && T >= CUES[cueIdx].t) {
      CUES[cueIdx].fn();
      cueIdx++;
    }

    for (const s of SHOTS) {
      if (T >= s.t0 && T < s.t1) {
        const k = easeInOut(Math.min((T - s.t0) / (s.t1 - s.t0), 1));
        camera.position.lerpVectors(s.fromPos, s.toPos, k);
        controls.target.lerpVectors(s.fromTgt, s.toTgt, k);
        break;
      }
    }

    // đất chuyển màu "than hồng" mềm mại — cả mặt trên lẫn vách
    for (const [, tn] of tints) {
      tn.k += (tn.target - tn.k) * Math.min(dt * 2.6, 1);
      tn.mat.color.lerpColors(GREY_C, RED_C, tn.k);
      tn.mat.emissiveIntensity = EMI_MAX * tn.k;
      if (tn.side) tn.side.color.lerpColors(GREY_SIDE_C, RED_SIDE_C, tn.k);
    }

    // Xuân Lộc giằng co trước khi thất thủ
    if (T >= 49.3 && T < 54.2) {
      const idx = byName.get('Đồng Nai');
      let tn = tints.get(idx);
      if (!tn) { tn = { k: 0, target: 0, mat: provinceGroups[idx].topMat }; tints.set(idx, tn); }
      tn.target = 0.3 + 0.25 * Math.sin(T * 8) * Math.sin(T * 3.3);
    }

    spratlyK += (spratlyTarget - spratlyK) * Math.min(dt * 2.6, 1);
    spratlyRed(spratlyK);

    for (const f of flags) {
      const a = Math.min((T - f.born) / 0.7, 1);
      f.group.scale.setScalar(Math.max(backOut(a), 0.001));
      f.group.userData.cloth.scale.x = 1 + Math.sin(T * 6 + f.born) * 0.06;
      f.group.userData.cloth.rotation.y = Math.sin(T * 2.1 + f.born) * 0.14;
    }

    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      const a = (T - f.born) / 1.5;
      if (a >= 1) { scene.remove(f.m); flashes.splice(i, 1); continue; }
      f.m.scale.setScalar(1 + a * f.size);
      f.m.material.opacity = 0.9 * (1 - a);
    }

    // hiệu ứng nổ / khói / đạn / chớp nòng
    for (let i = fx.length - 1; i >= 0; i--) {
      const e = fx[i];
      const a = T - e.born;
      if (a < 0) continue;
      if (e.kind === 'delayboom') { boom(e.pos, e.size); fx.splice(i, 1); continue; }
      if (e.kind === 'boom') {
        const k = a / 0.65;
        if (k >= 1) { scene.remove(e.m); fx.splice(i, 1); continue; }
        e.m.scale.setScalar(1 + k * 3.2 * e.size);
        e.m.material.opacity = 1 - k;
      } else if (e.kind === 'smoke') {
        const k = a / 1.7;
        if (k >= 1) { scene.remove(e.m); fx.splice(i, 1); continue; }
        e.m.position.y += dt * 0.55;
        e.m.scale.setScalar(1 + k * 1.6);
        e.m.material.opacity = 0.55 * (1 - k);
      } else if (e.kind === 'tracer') {
        const k = a / e.dur;
        if (k >= 1) { scene.remove(e.m); fx.splice(i, 1); continue; }
        e.m.position.lerpVectors(e.from, e.to, k);
      } else if (e.kind === 'muzzle') {
        const k = a / 0.16;
        if (k >= 1) { scene.remove(e.m); fx.splice(i, 1); continue; }
        e.m.scale.setScalar(1 + k * 2);
        e.m.material.opacity = 1 - k;
      }
    }

    for (const a of arrows) {
      const k = easeInOut(clamp01((T - a.t0) / a.dur));
      a.tube.geometry.setDrawRange(0, Math.floor(k * SEG) * RAD * 6);
      if (!arrowsFading && k > 0.02 && k < 1) {
        a.head.visible = true;
        const p = a.curve.getPointAt(k);
        a.head.position.copy(p);
        a.head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.curve.getTangentAt(k));
      } else if (k >= 1) {
        a.head.visible = false;
      }
      if (arrowsFading) {
        a.mat.opacity = Math.max(0, a.mat.opacity - dt * 0.7);
        a.headMat.opacity = a.mat.opacity;
        a.head.visible = false;
      }
    }

    if (shipRun) {
      const k = easeInOut(clamp01((T - shipRun.t0) / shipRun.dur));
      const p = shipCurve.getPointAt(k);
      navyShip.position.copy(p);
      navyShip.lookAt(p.clone().add(shipCurve.getTangentAt(k)));
      shipTrail.geometry.setDrawRange(0, Math.floor(k * SEG) * RAD * 6);
    }

    if (T > 17.5 && dmz.material.opacity > 0) {
      dmz.material.opacity = Math.max(0, dmz.material.opacity - dt * 0.35);
    }

    // Dinh Độc Lập: 390 tiến — húc — cổng đổ — 843 theo — cờ lên nóc
    if (dinh.g.visible) {
      const local = T - 65;
      if (local > 0.5) {
        const k1 = clamp01((local - 0.5) / 2.6);
        dinh.t390.position.z = 7.6 - easeInOut(k1) * 4.7;
        const k2 = clamp01((local - 1.3) / 2.9);
        dinh.t843.position.z = 9.4 - easeInOut(k2) * 5.2;
      }
      const hit = clamp01((local - 2.95) / 0.7);
      dinh.gatePivot.rotation.x = -easeInOut(hit) * 1.4;
      if (hit > 0 && hit < 0.15 && !dinh.hitBoom) {
        dinh.hitBoom = true;
        boom(dinh.gatePivot.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.6, 0)), 1.1);
      }
      if (hit >= 1) {
        const k3 = clamp01((local - 3.8) / 2.4);
        dinh.t390.position.z = 2.9 - easeInOut(k3) * 2.1;
        dinh.t843.position.z = Math.max(dinh.t843.position.z - dt * 0.7, 3.8);
      }
      const fk = clamp01((local - 5.2) / 1.6);
      if (fk > 0) dinh.roofFlag.scale.setScalar(Math.max(backOut(fk), 0.001));
    }
  }

  return { start, step, get time() { return T; } };
}
