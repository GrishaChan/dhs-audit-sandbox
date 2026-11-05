// Usage: node perf.js <app.html> [label]  → JSON metrics (before/after comparison)
const L = require('./lib');
const file = process.argv[2], label = process.argv[3] || file;
const THROTTLE = 4;
const recorder = () => {
  window.__frames = []; window.__rec = false;
  window.__startRec = (target) => {
    window.__frames = []; window.__rec = true; let last = performance.now();
    const W = innerWidth;
    const loop = (t) => {
      if (!window.__rec) return;
      const sheet = document.querySelector('.sheet.open'); let x = null, kindNow = null, scroll = null;
      if (sheet) {
        kindNow = sheet.dataset.kind; scroll = sheet.querySelector('.sheet-body').scrollTop;
        const ghost = sheet.querySelector('.sheet-ghost[data-kind="' + target + '"]');
        const content = sheet.querySelector('#stats-body:not([hidden]),#history-body:not([hidden])');
        const gx = ghost ? ghost.getBoundingClientRect().left : null;
        if (gx != null && gx > -W && gx < W) x = gx;
        else if (kindNow === target && content) x = content.getBoundingClientRect().left;
        else x = null;
        const cur = content ? content.getBoundingClientRect().left : null;
        window.__frames.push({ t, dt: t - last, x, cur, kind: kindNow, scroll, sel: sheet.querySelector('[aria-selected=true][data-k]')?.dataset.k });
      }
      last = t; requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  };
  window.__stopRec = () => { window.__rec = false; return window.__frames; };
  window.__longtasks = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longtasks.push(e.duration); }).observe({ type: 'longtask', buffered: false }); } catch (e) {}
};
async function timeIt(page, fn, arg) { return page.evaluate(([f, a]) => { const s = performance.now(); (new Function('a', f))(a); return +(performance.now() - s).toFixed(2); }, [fn, arg]); }
async function sheetSwipe(page, name, from, to, opts) {
  await page.evaluate(([n, k]) => { document.querySelector('[data-sheet="' + n + '"]').click(); }, [name, from]);
  await page.waitForTimeout(450);
  // ensure category `from`
  await page.evaluate(([n, k]) => { const seg = document.getElementById(n + '-seg'); seg.querySelector('[data-k="' + k + '"]').click(); }, [name, from]);
  await page.waitForTimeout(opts.settle ?? 1500); // let idle pre-build run (steady state); settle:300 = immediate swipe
  await page.evaluate(() => { window.__longtasks.length = 0; });
  await page.evaluate(t => window.__startRec(t), to);
  const dir = to === 'films' && from === 'books' || to === 'songs' ? -1 : 1;
  const x0 = dir < 0 ? 330 : 60, dx = dir * (opts.dist || 220);
  const pts = L.swipePath(x0, 520, dx, opts.dy || 8, opts.ms || 260);
  const tEnd = pts[pts.length - 2].t;
  const started = await page.evaluate(() => performance.now());
  await L.touchPath(page, pts);
  await page.waitForTimeout(600);
  const frames = await page.evaluate(() => window.__stopRec());
  const longtasks = await page.evaluate(() => window.__longtasks.slice());
  const final = await page.evaluate(n => document.getElementById('sheet-' + n).dataset.kind, name);
  // Analysis
  const W = 390, rel = frames.map(f => ({ ...f, tr: f.t - started }));
  const drag = rel.filter(f => f.tr > 40 && f.tr < tEnd - 10);
  const baseCur = rel.length ? rel[0].cur : 0;
  const moved = drag.filter(f => Math.abs((f.cur ?? baseCur) - baseCur) > 2 || (f.x != null && f.x < W - 2)).length;
  let maxJump = 0; for (let i = 1; i < rel.length; i++) { const a = rel[i - 1].x, b = rel[i].x; if (a != null && b != null) maxJump = Math.max(maxJump, Math.abs(b - a)); else if (a == null && b != null) maxJump = Math.max(maxJump, Math.max(0, W - Math.abs(b - 16))); }
  // finger speed during drag vs first settle frames
  const fingerPxPerFrame = Math.abs(dx) / (opts.ms || 260) * 16.7;
  const after = rel.filter(f => f.tr >= tEnd); let releaseJump = 0; for (let i = 1; i < Math.min(after.length, 4); i++) if (after[i].x != null && after[i - 1].x != null) releaseJump = Math.max(releaseJump, Math.abs(after[i].x - after[i - 1].x));
  const settleFrame = rel.findIndex(f => f.tr > tEnd && f.x != null && Math.abs(f.x - (f.x < W / 2 ? 16 : f.x)) < 1 && f.kind === to);
  const gaps = rel.map(f => f.dt).filter(d => d > 0);
  // visible phase = from touch start until the incoming content has settled (x stable at its final position)
  let settledAt = rel.findIndex((f, i) => f.tr > tEnd && f.kind === to && f.x != null && i > 0 && Math.abs(f.x - rel[i - 1].x ?? 0) < .5);
  if (settledAt < 0) settledAt = rel.length - 1;
  const settleMs = rel[settledAt] ? +(rel[settledAt].tr - tEnd).toFixed(0) : null;
  const gapsMotion = rel.slice(1, settledAt + 1).filter(f => f.tr > 0).map(f => f.dt);
  const gapsAfter = rel.slice(settledAt + 1).map(f => f.dt);
  const scrolls = rel.map(f => f.scroll); let maxScrollJump = 0; for (let i = 1; i < scrolls.length; i++) maxScrollJump = Math.max(maxScrollJump, Math.abs(scrolls[i] - scrolls[i - 1]));
  await page.evaluate(() => { const b = document.querySelector('.sheet.open .sheet-back'); b && b.click(); });
  await page.waitForTimeout(450);
  return { switchedTo: final, dragFrames: drag.length, dragFramesWithContentMotion: moved, maxIncomingJumpPx: +maxJump.toFixed(1), fingerPxPerFrame: +fingerPxPerFrame.toFixed(1), firstSettleFramesMaxPx: +releaseJump.toFixed(1), gapsDetail: rel.map((f, i) => ({ f, p: rel[i - 1] })).filter(o => o.p && o.f.dt > 34).map(o => ({ atMsFromRelease: Math.round(o.f.tr - tEnd), gap: Math.round(o.f.dt), incomingXBefore: o.p.x == null ? null : Math.round(o.p.x), incomingXAfter: o.f.x == null ? null : Math.round(o.f.x), kindAfter: o.f.kind })), maxFrameGapDuringMotionMs: +Math.max(0, ...gapsMotion).toFixed(1), framesOver34msDuringMotion: gapsMotion.filter(d => d > 34).length, settleAfterReleaseMs: settleMs, maxFrameGapAfterSettleMs: +Math.max(0, ...gapsAfter).toFixed(1), maxFrameGapMs: +Math.max(...gaps).toFixed(1), framesOver34ms: gaps.filter(d => d > 34).length, longTasks: longtasks.map(d => +d.toFixed(0)), maxScrollJumpPx: maxScrollJump };
}
(async () => {
  const browser = await L.launch(); const out = { label };
  // 1. Cold load, desktop, empty profile
  { const ctx = await L.desktopContext(browser); const loads = [];
    for (let i = 0; i < 5; i++) { const page = await L.openApp(ctx, file); loads.push(await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return { dcl: +n.domContentLoadedEventEnd.toFixed(0), load: +n.loadEventEnd.toFixed(0) }; })); await page.close(); }
    out.loadMs = { domContentLoadedMedian: loads.map(l => l.dcl).sort((a, b) => a - b)[2], loadMedian: loads.map(l => l.load).sort((a, b) => a - b)[2] };
    const page = await L.openApp(ctx, file);
    out.heapMB = +(await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0)).toFixed(1);
    out.domNodes = await page.evaluate(() => document.getElementsByTagName('*').length);
    await ctx.close(); }
  // 2. Mobile, history with 3000 events, CPU throttled
  const hist = L.makeHistory(3000);
  const ctx = await L.mobileContext(browser); await ctx.addInitScript(recorder);
  const page = await L.openApp(ctx, file, { history: hist });
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  page.__cdp = cdp;
  out.throttle = THROTTLE + 'x CPU';
  const med = a => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const o1 = [], o2 = [], s1 = [], s2 = [], h1 = [];
  for (let i = 0; i < 5; i++) {
    o1.push(await timeIt(page, "document.querySelector('[data-sheet=stats]').click()"));
    await page.waitForTimeout(300);
    s1.push(await timeIt(page, "document.querySelector('#stats-seg [data-k=films]').click()"));
    s2.push(await timeIt(page, "document.querySelector('#stats-mode [data-m=collection]').click()"));
    await timeIt(page, "document.querySelector('#stats-seg [data-k=books]').click()");
    await timeIt(page, "document.querySelector('#stats-mode [data-m=activity]').click()");
    await page.evaluate(() => document.querySelector('.sheet.open .sheet-back').click()); await page.waitForTimeout(450);
    o2.push(await timeIt(page, "document.querySelector('[data-sheet=history]').click()"));
    await page.waitForTimeout(300);
    h1.push(await timeIt(page, "document.querySelector('#history-seg [data-k=films]').click()"));
    await timeIt(page, "document.querySelector('#history-seg [data-k=books]').click()");
    await page.evaluate(() => document.querySelector('.sheet.open .sheet-back').click()); await page.waitForTimeout(450);
  }
  out.renderMs_throttled = { openStats: med(o1), statsCategorySwitch: med(s1), statsCollectionMode: med(s2), openHistory: med(o2), historyCategorySwitch: med(h1) };
  // 3. Status toggle cost with 3000 history events (persist + history merge)
  const marks = [];
  for (let i = 0; i < 6; i++) marks.push(await timeIt(page, "const c=document.querySelector('#catalog-books input[data-field=reading]');c.click()"));
  out.markToggleMs_3000events_throttled = med(marks);
  // 4. Sheet swipes
  out.statsSwipe = await sheetSwipe(page, 'stats', 'books', 'films', {});
  out.historySwipe = await sheetSwipe(page, 'history', 'books', 'films', {});
  out.historySwipeBack = await sheetSwipe(page, 'history', 'films', 'books', {});
  out.historySwipeImmediate = await sheetSwipe(page, 'history', 'books', 'films', { settle: 300 });
  out.statsSwipeImmediate = await sheetSwipe(page, 'stats', 'books', 'films', { settle: 300 });
  out.errors = page.__errors;
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
