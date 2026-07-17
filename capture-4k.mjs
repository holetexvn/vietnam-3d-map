// Quay 4K 60fps bằng "thời gian ảo" (CDP virtual time): mỗi bước tiến đúng
// 1/60s thời gian trang rồi chụp 1 khung — video ra mượt tuyệt đối, không
// phụ thuộc tốc độ máy. Ghép bằng ffmpeg sau.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const W = 3840, H = 2160, FPS = 60;
const SECONDS = Number(process.argv[2] ?? 80);
const FRAMES = Math.round(SECONDS * FPS);
const OUT = new URL('./frames-4k/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: [`--window-size=1920,1080`, '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto('http://localhost:4173/?train=1', { waitUntil: 'networkidle' });

// Hâm nóng đủ subset font (latin + vietnamese, mọi weight) TRƯỚC khi đóng
// băng thời gian — tránh fetch font treo giữa chừng dưới virtual time.
await page.evaluate(async () => {
  const corpus =
    'AĂÂBCDĐEÊGHIKLMNOÔƠPQRSTUƯVXY aăâbcdđeêghiklmnoôơpqrstuưvxy ' +
    'àáảãạ ằắẳẵặ ầấẩẫậ èéẻẽẹ ềếểễệ ìíỉĩị òóỏõọ ồốổỗộ ờớởỡợ ùúủũụ ừứửữự ỳýỷỹỵ 0123456789 ·–—²';
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;left:-9999px;top:0;font-family:"Be Vietnam Pro"';
  for (const style of ['400', '600', '800', 'italic 400']) {
    const s = document.createElement('span');
    s.style.font = `${style} 16px "Be Vietnam Pro"`;
    s.textContent = corpus;
    div.appendChild(s);
  }
  document.body.appendChild(div);
  await document.fonts.ready;
  await new Promise((r) => setTimeout(r, 800));
  await document.fonts.ready;
  div.remove();
});

const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });

function advance(ms) {
  return new Promise((resolve) => {
    cdp.once('Emulation.virtualTimeBudgetExpired', resolve);
    cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: ms });
  });
}

const t0 = Date.now();
for (let i = 0; i < FRAMES; i++) {
  await advance(1000 / FPS);
  // Chụp qua CDP: không chờ font, không chờ animation — nhanh và không kẹt
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'jpeg', quality: 88, fromSurface: true,
  });
  writeFileSync(OUT + 'f' + String(i).padStart(5, '0') + '.jpg', Buffer.from(data, 'base64'));
  if (i % 300 === 0) {
    const rate = (i + 1) / ((Date.now() - t0) / 1000);
    console.log(`frame ${i}/${FRAMES} — ${rate.toFixed(1)} fps chụp, còn ~${Math.round((FRAMES - i) / rate / 60)} phút`);
  }
}
console.log('DONE in', Math.round((Date.now() - t0) / 1000), 's');
await browser.close();
