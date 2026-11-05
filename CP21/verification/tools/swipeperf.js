// CP21 swipe performance: cold / warm / rapid. Usage: node swipeperf.js <app.html> <events>  (4x CPU throttle)
const L = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const rec = () => {
  window.__fr = []; window.__on = false; window.__lt = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask' }); } catch (e) {}
  window.__start = () => { window.__fr = []; window.__on = true; const gen = window.__g = (window.__g || 0) + 1; const loop = t => { if (!window.__on || gen !== window.__g) return; const s = document.querySelector('.sheet.open'); const c = s && s.querySelector('#stats-body:not([hidden]),#history-body:not([hidden])'); const body = s && s.querySelector('.sheet-body'); window.__fr.push({ t, x: c ? c.getBoundingClientRect().left : null, sw: body ? body.classList.contains('is-swiping') : false, k: s && s.dataset.kind }); requestAnimationFrame(loop); }; requestAnimationFrame(loop); };
  window.__stop = () => { window.__on = false; return { fr: window.__fr, lt: window.__lt.splice(0) }; };
};
(async () => {
  const file = process.argv[2], N = +process.argv[3]; const b = await L.launch(); const out = { file: file.split('/').pop(), events: N };
  const ctx = await L.mobileContext(b); await ctx.addInitScript(rec);
  const page = await L.openApp(ctx, file, { history: N ? L.makeHistory(N) : undefined });
  const cdp = await ctx.newCDPSession(page); page.__cdp = cdp; await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const open = async n => { await page.click('#more-toggle'); await sleep(200); await page.click('#more-panel [data-sheet=' + n + ']'); };
  const close = async () => { for (let i = 0; i < 3; i++) { if (!(await page.evaluate(() => { const b = document.querySelector('.sheet.open .sheet-back'); b?.click(); return !!b; }))) break; await sleep(500); } };
  async function measure(n, label, waitAfterOpen, swipes, gap) {
    await open(n); await sleep(waitAfterOpen);
    const t0 = await page.evaluate(() => { window.__start(); return performance.now(); });
    const locks = []; const tStart = Date.now();
    for (let i = 0; i < swipes; i++) { const pts = L.swipePath(330, 600, -200, 3, 240); const off = Date.now() - tStart; locks.push(off + pts.find(p => Math.abs(p.x - 330) >= 12).t); await L.touchPath(page, pts); if (i < swipes - 1) await sleep(gap); }
    await sleep(1200);
    const { fr, lt } = await page.evaluate(() => window.__stop());
    const kind = await page.evaluate(n => document.getElementById('sheet-' + n).dataset.kind, n);
    const rel = fr.map(f => ({ ...f, r: f.t - t0 }));
    // first moved frame after the first lock (wall clock offsets are approximate; reported relative to touch dispatch)
    const base = rel[0]?.x ?? 16; const firstMove = rel.find(f => f.x != null && Math.abs(f.x - base) > 1);
    const sw = rel.filter(f => f.sw); const win = sw.length ? [sw[0].r, sw[sw.length - 1].r] : [0, 0];
    let maxGap = 0, over34 = 0; for (let i = 1; i < rel.length; i++) { const f = rel[i]; if (f.r >= win[0] && f.r <= win[1] + 17) { const d = f.t - rel[i - 1].t; maxGap = Math.max(maxGap, d); if (d > 34) over34++; } }
    const ltIn = lt.filter(([s, d]) => s + d >= t0 + win[0] && s <= t0 + win[1]).map(([, d]) => Math.round(d));
    out[n + ' ' + label] = { switchedTo: kind, firstMovedFrameMs: firstMove ? Math.round(firstMove.r - locks[0]) : null, maxFrameGapInMotionMs: +maxGap.toFixed(1), framesOver34InMotion: over34, longTasksInMotion: ltIn };
    await close();
  }
  for (const n of ['stats', 'history']) {
    await measure(n, 'cold (100 ms after open)', 100, 1, 0);
    await measure(n, 'warm (2.5 s after open)', 2500, 1, 0);
    await measure(n, 'rapid x2 (150 ms apart)', 2500, 2, 150);
  }
  out.errors = page.__errors; console.log(JSON.stringify(out)); await b.close();
})();
