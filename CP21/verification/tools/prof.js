const L = require('./lib');
(async () => {
  const b = await L.launch(); const ctx = await L.mobileContext(b);
  const page = await L.openApp(ctx, process.argv[2]); await page.waitForTimeout(800);
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const r = await page.evaluate(async () => {
    const out = {}; const next = document.getElementById('catalog-films'), old = document.getElementById('catalog-books'), stage = document.getElementById('catalog-stage');
    let t = performance.now(); old.offsetHeight; out.readOld = performance.now() - t;
    t = performance.now(); stage.classList.add('is-transitioning'); next.classList.add('animating'); next.offsetHeight; out.layoutNext = performance.now() - t;
    t = performance.now(); old.classList.add('animating'); old.classList.remove('current'); old.offsetHeight; out.layoutOld = performance.now() - t;
    await new Promise(r => requestAnimationFrame(() => setTimeout(r)));
    const ents = performance.getEntriesByType('longtask'); out.cards = next.querySelectorAll('.item').length;
    return out;
  });
  // second: trace style/layout/paint with one real swipe
  await cdp.send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReturnAsStream' });
  page.__cdp = cdp;
  await page.evaluate(() => { const n = document.getElementById('catalog-films'), o = document.getElementById('catalog-books'), s = document.getElementById('catalog-stage'); n.classList.remove('animating'); o.classList.remove('animating'); o.classList.add('current'); s.classList.remove('is-transitioning'); });
  await page.waitForTimeout(300);
  await L.touchPath(page, L.swipePath(330, 500, -220, 6, 260)); await page.waitForTimeout(700);
  const chunks = []; await new Promise(res => { cdp.once('Tracing.tracingComplete', async ({ stream }) => { let d; do { d = await cdp.send('IO.read', { handle: stream }); chunks.push(d.data); } while (!d.eof); res(); }); cdp.send('Tracing.end'); });
  const ev = JSON.parse(chunks.join('')).traceEvents || JSON.parse(chunks.join(''));
  const agg = {}; for (const e of (Array.isArray(ev) ? ev : ev.traceEvents)) if (e.ph === 'X' && e.dur > 3000 && ['Layout', 'UpdateLayoutTree', 'Paint', 'FunctionCall', 'EventDispatch', 'PrePaint', 'Layerize', 'Commit', 'RasterTask', 'ImageDecodeTask', 'DecodeImage', 'ParseHTML', 'RunTask', 'TimerFire', 'FireAnimationFrame', 'UpdateLayer', 'CompositeLayers', 'PaintImage'].includes(e.name)) { (agg[e.name] ||= []).push(Math.round(e.dur / 1000)); }
  console.log(JSON.stringify({ manual: r, traceOver3ms: agg }));
  await b.close();
})();
