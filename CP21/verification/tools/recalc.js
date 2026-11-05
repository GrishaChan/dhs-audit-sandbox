// Style-recalc cost of category/theme switches (forced sync style+layout). Usage: node recalc.js a.html b.html ...
const L = require('./lib');
(async () => {
  const b = await L.launch();
  for (let round = 0; round < 2; round++) for (const f of process.argv.slice(2)) {
    const ctx = await L.mobileContext(b); const p = await L.openApp(ctx, f, { history: L.makeHistory(300) }); await p.waitForTimeout(2500);
    const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const r = await p.evaluate(() => { const H = document.documentElement, med = a => a.sort((x, y) => x - y)[a.length >> 1]; const kind = [], mode = []; for (let i = 0; i < 15; i++) { let t = performance.now(); H.dataset.kind = ['films', 'songs', 'books'][i % 3]; H.offsetHeight; getComputedStyle(document.querySelector('.tab-glider')).color; kind.push(performance.now() - t); } for (let i = 0; i < 10; i++) { let t = performance.now(); H.dataset.mode = i % 2 ? 'dark' : 'light'; H.offsetHeight; mode.push(performance.now() - t); } H.dataset.mode = 'dark'; H.dataset.kind = 'books'; return { kindSwitchMs: +med(kind).toFixed(1), themeSwitchMs: +med(mode).toFixed(1) }; });
    console.log(round, f.split('/').pop().padEnd(14), JSON.stringify(r)); await ctx.close();
  }
  await b.close();
})();
