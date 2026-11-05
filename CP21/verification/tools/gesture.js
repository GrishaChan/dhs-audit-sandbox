// CP21 gesture diagnostics: does a deliberate horizontal swipe switch the category? Usage: node gesture.js <app.html> [events]
const L = require('./lib');
const file = process.argv[2], N = +(process.argv[3] || 300);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Thumb-like path: early vertical drift (arc) then horizontal travel, ease-in-out speed.
function arcPath(x0, y0, dx, ms, drift = 12, hz = 60) {
  const pts = [], n = Math.max(3, Math.round(ms / (1000 / hz)));
  for (let i = 0; i <= n; i++) { const t = i / n, e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; const y = y0 - drift * Math.sin(Math.min(1, t * 2.2) * Math.PI / 2) + (t > .6 ? (t - .6) * drift * .8 : 0); pts.push({ x: x0 + dx * e, y, t: i * ms / n }); }
  pts.push({ ...pts[pts.length - 1], t: ms + 16 }); return pts;
}
(async () => {
  const b = await L.launch(); const ctx = await L.mobileContext(b);
  const page = await L.openApp(ctx, file, { history: N ? L.makeHistory(N) : undefined });
  const res = [];
  const kindOf = n => page.evaluate(n => document.getElementById('sheet-' + n).dataset.kind, n);
  const open = async n => { await page.click('#more-toggle'); await sleep(150); await page.click('#more-panel [data-sheet=' + n + ']'); };
  const close = async () => { for (let i = 0; i < 4; i++) { const open = await page.evaluate(() => { const b = document.querySelector('.sheet.open .sheet-back'); b?.click(); return !!b; }); if (!open) break; await sleep(450); } };
  const setK = async (n, k) => { await page.evaluate(([n, k]) => document.querySelector('#' + n + '-seg [data-k=' + k + ']').click(), [n, k]); };
  const rectOf = (sel) => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, r: r.right, t: r.top, b: r.bottom }; }, sel);
  async function scen(name, n, prep, pathFn, expect) { try { await scen0(name, n, prep, pathFn, expect); } catch (e) { res.push({ sheet: n, scenario: name, before: '?', after: 'ERROR ' + e.message.split('\n')[0], ok: false }); await close(); } }
  async function scen0(name, n, prep, pathFn, expect) {
    await open(n); await sleep(500); await setK(n, 'books'); await page.evaluate(() => document.querySelector('.sheet.open .sheet-body').scrollTop = 0); await sleep(prep?.wait ?? 1500);
    const ctxInfo = prep?.fn ? await prep.fn() : null;
    const before = await kindOf(n); const pts = await pathFn(ctxInfo); await L.touchPath(page, pts); await sleep(700);
    const after = await kindOf(n); const rec = await page.evaluate(() => !document.getElementById('history-work').hidden); const ok = after === (expect || 'films') && (!rec || name.startsWith('11 '));
    res.push({ sheet: n, scenario: name, before, after: after + (rec ? ' +record opened' : ''), ok }); await close();
  }
  for (const n of ['stats', 'history']) {
    await scen('1 free area, straight', n, null, () => L.swipePath(330, 640, -200, 3, 250));
    await scen('2 on a tile/row', n, { fn: () => rectOf(n === 'stats' ? '#stats-body .st-tile' : '#history-body .h-row') }, r => L.swipePath(Math.min(340, r.r - 10), r.y, -200, 3, 250));
    await scen('3 seg padding area', n, { fn: () => rectOf('#' + n + '-seg') }, r => L.swipePath(r.r - 6, r.t + 3, -200, 2, 250));
    await scen('4 on category toggle', n, { fn: () => rectOf('#' + n + '-seg [data-k=films]') }, r => L.swipePath(r.x + 30, r.y, -200, 2, 250));
    await scen('5 right after opening (100 ms)', n, { wait: 0, fn: async () => { await close(); await open(n); await sleep(100); } }, () => L.swipePath(330, 640, -200, 3, 250));
    await scen('6 thumb arc, 12px early drift', n, null, () => arcPath(330, 640, -210, 280, 12));
    await scen('6b thumb arc, 18px early drift', n, null, () => arcPath(330, 640, -220, 300, 18));
    await scen('7 diagonal 30°', n, null, () => L.swipePath(330, 700, -200, -110, 260));
    await scen('8 after vertical scroll fling', n, { fn: async () => { await L.touchPath(page, L.swipePath(200, 700, 0, -300, 120)); await sleep(60); } }, () => L.swipePath(330, 500, -200, 3, 250));
    await scen('9 during previous settle (2 swipes, 120 ms apart)', n, { fn: async () => { await L.touchPath(page, L.swipePath(330, 640, -200, 3, 220)); await sleep(120); } }, () => L.swipePath(330, 640, -200, 3, 220), 'songs');
    await scen('10 slow deliberate (150px / 700ms)', n, null, () => L.swipePath(320, 640, -150, 4, 700));
    await scen('11 tap on content must not switch category', n, { fn: () => rectOf(n === 'stats' ? '#stats-body .st-tile' : '#history-body .h-day') }, r => [{ x: r.x, y: r.y, t: 0 }, { x: r.x + 1, y: r.y + 1, t: 70 }], 'books');
    await scen('11b tap on category toggle switches by tap', n, { fn: () => rectOf('#' + n + '-seg [data-k=films]') }, r => [{ x: r.x, y: r.y, t: 0 }, { x: r.x + 1, y: r.y, t: 70 }], 'films');
    await scen('12 vertical scroll must not switch', n, null, () => L.swipePath(200, 700, 6, -260, 250), 'books');
  }
  await b.close();
  const pass = res.filter(r => r.ok).length;
  for (const r of res) console.log((r.ok ? 'OK   ' : 'MISS ') + r.sheet.padEnd(8) + r.scenario.padEnd(50) + r.before + ' → ' + r.after);
  console.log('TOTAL', pass + '/' + res.length);
})();
