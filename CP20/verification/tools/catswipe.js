const L = require('./lib');
(async () => {
  const file = process.argv[2]; const b = await L.launch(); const ctx = await L.mobileContext(b);
  const page = await L.openApp(ctx, file); await page.waitForTimeout(800);
  const cdp = await ctx.newCDPSession(page); page.__cdp = cdp; await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => { window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration)); }).observe({ type: 'longtask' }); } catch (e) {}
    window.__f = []; const loop = t => { const p = document.getElementById('catalog-films'); window.__f.push({ t, x: p.classList.contains('animating') || p.classList.contains('current') ? p.getBoundingClientRect().left : null }); if (window.__f.length < 200) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
  const t0 = await page.evaluate(() => performance.now());
  const ms = 260, dx = -220; await L.touchPath(page, L.swipePath(330, 500, dx, 6, ms)); await page.waitForTimeout(900);
  const r = await page.evaluate(() => ({ f: window.__f, lt: window.__lt, kind: document.documentElement.dataset.kind }));
  const fr = r.f.filter(f => f.x != null); let maxStep = 0, rel = 0; for (let i = 1; i < fr.length; i++) maxStep = Math.max(maxStep, Math.abs(fr[i].x - fr[i - 1].x));
  const after = r.f.filter(f => f.t - t0 > ms + 20 && f.x != null); let rs = 0; for (let i = 1; i < Math.min(4, after.length); i++) rs = Math.max(rs, Math.abs(after[i].x - after[i - 1].x));
  const gaps = r.f.slice(1).map((f, i) => f.t - r.f[i].t);
  console.log(JSON.stringify({ file, switchedTo: r.kind, fingerPxPerFrame: +(Math.abs(dx) / ms * 16.7).toFixed(1), maxStepPx: +maxStep.toFixed(1), firstSettleFramesMaxPx: +rs.toFixed(1), maxFrameGapMs: +Math.max(...gaps).toFixed(1), longTasks: r.lt, errors: page.__errors }));
  await b.close();
})();
