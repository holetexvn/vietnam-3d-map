import { PROVINCES, buildLetterSequence } from './data.js';

// ── Hằng số hình ảnh ─────────────────────────────────────────
const FLAG_RATIO = 2 / 3;          // quốc kỳ: cao = 2/3 rộng
const STAR_RADIUS = 0.42;          // sao phóng to hơn tỷ lệ chuẩn để đọc rõ trên lưới chữ
const THREAD_LENGTH_FACTOR = 2.4;  // chiều dài sợi chỉ theo cỡ ô
const RED_HUE = 358;
const GOLD_HUE = 46;

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const readout = document.getElementById('readout');
const readoutType = document.getElementById('readout-type');
const readoutName = document.getElementById('readout-name');

const seq = buildLetterSequence();

let W = 0, H = 0, DPR = 1;
let letters = [];
let cellSize = 24;
let flag = { x: 0, y: 0, w: 0, h: 0 };
let hoveredProvince = -1;

const pointer = { x: -1e4, y: -1e4, vx: 0, vy: 0, active: false };

// ── Ngôi sao vàng: đa giác 10 đỉnh + kiểm tra điểm-trong-đa-giác ──
function starPolygon(cx, cy, outerR) {
  const innerR = outerR * 0.382;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ── Dựng lưới chữ ────────────────────────────────────────────
function buildGrid() {
  W = innerWidth;
  H = innerHeight;
  DPR = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // Lá cờ chiếm ~72% bề rộng, neo giữa màn hình, hơi thấp xuống nhường chỗ tiêu đề
  let fw = Math.min(W * (W < 900 ? 0.92 : 0.72), 1080);
  let fh = fw * FLAG_RATIO;
  const maxH = H * 0.62;
  if (fh > maxH) { fh = maxH; fw = fh / FLAG_RATIO; }
  flag = { x: (W - fw) / 2, y: (H - fh) / 2 + H * 0.045, w: fw, h: fh };

  const cols = Math.min(56, Math.max(30, Math.round(fw / 17)));
  cellSize = fw / cols;
  const rows = Math.round(fh / cellSize);
  glyphFontSize = cellSize * 0.94;
  spriteCache.clear();
  const star = starPolygon(flag.x + fw / 2, flag.y + fh / 2, fh * STAR_RADIUS);

  // Một ô thuộc ngôi sao khi đa số điểm mẫu của nó nằm trong sao —
  // biên sao mượt hơn hẳn so với chỉ xét tâm ô.
  const starHits = (rx, ry) => {
    const o = cellSize * 0.38;
    let hits = 0;
    for (const [dx, dy] of [[0, 0], [-o, -o], [o, -o], [-o, o], [o, o]]) {
      if (pointInPolygon(rx + dx, ry + dy, star)) hits++;
    }
    return hits; // 0–5: mức độ ô nằm trong sao
  };

  letters = [];
  let k = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const rx = flag.x + (col + 0.5) * cellSize;
      const ry = flag.y + (row + 0.5) * cellSize;
      const item = seq[k % seq.length];
      k++;

      const hits = starHits(rx, ry);
      const inStar = hits >= 2;
      const j = Math.sin(row * 12.9898 + col * 78.233) * 43758.5453;
      const jitter = j - Math.floor(j); // giả ngẫu nhiên ổn định trong [0, 1)
      // Ô nằm trọn trong sao sáng rực; ô biên trầm hơn một chút — biên sao mềm mắt.
      // Độ sáng lượng tử hóa theo bậc 3% để các chữ dùng chung sprite.
      const rawLight = inStar ? (hits === 5 ? 57 : 50) + jitter * 5 : 44 + jitter * 7;
      const light = Math.round(rawLight / 3) * 3;
      const sat = inStar ? 100 : 74;
      const hue = inStar ? GOLD_HUE : RED_HUE;

      const L = cellSize * THREAD_LENGTH_FACTOR;
      // Treo gần thẳng; màn mở đầu là một cơn gió quét ngang (xem cuối file)
      const a0 = reducedMotion ? 0 : (jitter - 0.5) * 0.5;
      letters.push({
        ch: item.ch,
        province: item.province,
        inStar,
        ax: rx,                    // điểm neo sợi chỉ
        ay: ry - L,
        L,
        x: rx + Math.sin(a0) * L,  // vị trí hiện tại (đầu con lắc)
        y: ry - L + Math.cos(a0) * L,
        px: rx + Math.sin(a0) * L, // vị trí khung hình trước (Verlet)
        py: ry - L + Math.cos(a0) * L,
        col, row,
        fill: `hsl(${hue} ${sat}% ${light}%)`,
        fillBright: `hsl(${hue} 100% ${Math.min(light + 22, 78)}%)`,
      });
    }
  }
}

// ── Sprite ký tự: vẽ sẵn từng (chữ, màu) một lần, mỗi khung hình
//    chỉ drawImage — nhanh hơn fillText xoay từng chữ rất nhiều ──
const spriteCache = new Map();
let glyphFontSize = 16;

function getSprite(ch, fill) {
  const key = ch + '|' + fill;
  let s = spriteCache.get(key);
  if (!s) {
    // Đệm rộng để không cắt dấu tiếng Việt (Ẵ, Ậ, …)
    const size = Math.ceil(glyphFontSize * 2.4);
    const c = document.createElement('canvas');
    c.width = c.height = size * DPR;
    const g = c.getContext('2d');
    g.scale(DPR, DPR);
    g.font = `700 ${glyphFontSize}px 'Be Vietnam Pro', sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = fill;
    g.fillText(ch, size / 2, size / 2);
    s = { c, size };
    spriteCache.set(key, s);
  }
  return s;
}

// ── Vật lý con lắc Verlet ────────────────────────────────────
const GRAVITY = 0.55;
const DAMPING = 0.965;
let windTime = 0;
let gustPulse = 0; // cơn gió toàn cục khi nhấn phím cách

function step() {
  windTime += 0.016;
  gustPulse *= 0.94;

  const baseWind = reducedMotion ? 0 : 0.055;
  // Gió thoảng: mạnh nhẹ theo chu kỳ dài, có nhịp thở
  const breeze =
    baseWind * (1 + 0.7 * Math.sin(windTime * 0.4) * Math.sin(windTime * 0.13));

  for (const l of letters) {
    let vx = (l.x - l.px) * DAMPING;
    let vy = (l.y - l.py) * DAMPING;
    l.px = l.x;
    l.py = l.y;

    // Gió thoảng lan theo cột — lá cờ gợn sóng như vải
    const wave =
      Math.sin(windTime * 1.7 + l.col * 0.32 + l.row * 0.11) +
      0.5 * Math.sin(windTime * 0.9 + l.col * 0.13);
    let fx = breeze * wave + gustPulse * (0.9 + 0.2 * Math.sin(l.row * 0.7));
    let fy = GRAVITY;

    // Lực từ con trỏ: quét qua là chữ bay theo
    if (pointer.active) {
      const dx = l.x - pointer.x;
      const dy = l.y - pointer.y;
      const d2 = dx * dx + dy * dy;
      const R = cellSize * 4.2;
      if (d2 < R * R) {
        const falloff = 1 - Math.sqrt(d2) / R;
        fx += pointer.vx * 0.075 * falloff;
        fy += pointer.vy * 0.075 * falloff;
      }
    }

    l.x += vx + fx;
    l.y += vy + fy;

    // Ràng buộc cứng: giữ đúng chiều dài sợi chỉ
    let ddx = l.x - l.ax;
    let ddy = l.y - l.ay;
    const dist = Math.hypot(ddx, ddy) || 1;
    l.x = l.ax + (ddx / dist) * l.L;
    l.y = l.ay + (ddy / dist) * l.L;
  }

  pointer.vx *= 0.6;
  pointer.vy *= 0.6;
}

// ── Vẽ ───────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, W, H);

  // Quầng sáng đỏ mờ phía sau lá cờ, như đèn hắt lên vải
  const cx = flag.x + flag.w / 2;
  const cy = flag.y + flag.h / 2;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, flag.w * 0.62);
  glow.addColorStop(0, 'rgba(218, 37, 29, 0.10)');
  glow.addColorStop(1, 'rgba(218, 37, 29, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Sợi chỉ — rất mảnh, chỉ đủ gợi cảm giác treo
  ctx.strokeStyle = 'rgba(240, 226, 200, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const l of letters) {
    ctx.moveTo(l.ax, l.ay);
    ctx.lineTo(l.x, l.y);
  }
  ctx.stroke();

  // Chữ cái — sprite xoay theo góc sợi chỉ
  for (const l of letters) {
    const rot = Math.atan2(l.x - l.ax, l.y - l.ay);
    const hot = hoveredProvince === l.province;
    const s = getSprite(l.ch, hot ? l.fillBright : l.fill);
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    ctx.setTransform(DPR * cos, DPR * sin, -DPR * sin, DPR * cos, l.x * DPR, l.y * DPR);
    if (hot) {
      ctx.shadowColor = l.inStar ? 'rgba(255, 205, 0, 0.8)' : 'rgba(255, 120, 90, 0.7)';
      ctx.shadowBlur = 14;
    }
    ctx.drawImage(s.c, -s.size / 2, -s.size / 2, s.size, s.size);
    if (hot) ctx.shadowBlur = 0;
  }
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// Bước vật lý cố định 60Hz — màn hình 120Hz không làm cờ bay nhanh gấp đôi
const PHYSICS_STEP = 1000 / 60;
let lastTime = 0;
let accumulator = 0;

function frame(t) {
  if (!lastTime) lastTime = t;
  accumulator += Math.min(t - lastTime, 100);
  lastTime = t;
  while (accumulator >= PHYSICS_STEP) {
    step();
    accumulator -= PHYSICS_STEP;
  }
  render();
  requestAnimationFrame(frame);
}

// ── Tương tác ────────────────────────────────────────────────
function findProvinceAt(x, y) {
  let best = -1;
  let bestD2 = (cellSize * 1.2) ** 2;
  for (const l of letters) {
    const dx = l.x - x;
    const dy = l.y - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD2) { bestD2 = d2; best = l.province; }
  }
  return best;
}

function updateReadout(p) {
  if (p === hoveredProvince) return;
  hoveredProvince = p;
  if (p === -1) {
    readout.classList.remove('show');
    return;
  }
  readoutType.textContent = PROVINCES[p].type === 'city' ? 'Thành phố' : 'Tỉnh';
  readoutName.textContent = PROVINCES[p].name;
  readout.classList.add('show');
}

function onMove(x, y) {
  if (pointer.active) {
    pointer.vx = x - pointer.x;
    pointer.vy = y - pointer.y;
  }
  pointer.x = x;
  pointer.y = y;
  pointer.active = true;
  updateReadout(findProvinceAt(x, y));
}

addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY));
addEventListener('pointerleave', () => {
  pointer.active = false;
  updateReadout(-1);
});

// Nhấp: cơn gió tỏa tròn từ điểm nhấp
addEventListener('pointerdown', (e) => {
  const strength = 30;
  for (const l of letters) {
    const dx = l.x - e.clientX;
    const dy = l.y - e.clientY;
    const d = Math.hypot(dx, dy) || 1;
    const f = strength * Math.exp(-d / 260);
    l.px -= (dx / d) * f;
    l.py -= (dy / d) * f;
  }
});

// Phím cách: gió lùa ngang qua cả lá cờ
addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    gustPulse = 2.6;
  }
});

let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildGrid, 120);
});

// ── Khởi động: đợi font rồi thả lá cờ vào chỗ ────────────────
document.fonts.load("700 20px 'Be Vietnam Pro'").then(() => {
  buildGrid();
  if (!reducedMotion) gustPulse = 1.6; // cơn gió chào — lá cờ gợn lên rồi lắng lại
  requestAnimationFrame(frame);
});
