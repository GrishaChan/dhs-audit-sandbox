const L = require('./lib');
(async () => {
  const b = await L.launch(); const out = process.argv[3], file = process.argv[2];
  for (const scheme of ['dark', 'light']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: scheme });
    const p = await L.openApp(ctx, file, { history: L.makeHistory(200) });
    await p.evaluate(s => localStorage.setItem('personal-collections-clean-cp08-v1-theme-choice', JSON.stringify(s)), scheme); await p.reload(); await p.waitForFunction(() => window.__collections);
    await p.click('#tab-films'); await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}_${scheme}_main.png`, clip: { x: 0, y: 0, width: 390, height: 110 } });
    await p.click('#more-toggle'); await p.waitForTimeout(150); await p.click('#more-panel [data-sheet=stats]'); await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}_${scheme}_stats.png`, clip: { x: 0, y: 0, width: 390, height: 300 } });
    await p.evaluate(() => document.querySelector('.sheet.open .sheet-back').click()); await p.waitForTimeout(500);
    await p.click('#more-toggle'); await p.waitForTimeout(150); await p.click('#more-panel [data-sheet=history]'); await p.waitForTimeout(700);
    await p.screenshot({ path: `${out}_${scheme}_history.png`, clip: { x: 0, y: 0, width: 390, height: 140 } });
    await ctx.close();
  }
  await b.close();
})();
