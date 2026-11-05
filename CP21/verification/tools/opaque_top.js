// Top-level emulation of the opaque-origin restrictions seen in the sandboxed-iframe probe (Android content:// risk):
// localStorage access throws SecurityError; History API calls with a URL argument throw SecurityError. Usage: node opaque_top.js <app.html>
const L = require('./lib'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await L.launch(); const ctx = await L.mobileContext(b); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('The document is sandboxed and lacks the allow-same-origin flag.', 'SecurityError'); } });
    for (const fn of ['pushState', 'replaceState']) { const orig = History.prototype[fn]; History.prototype[fn] = function (st, t, url) { if (url !== undefined) throw new DOMException("A history state object with URL cannot be created in a document with origin 'null'", 'SecurityError'); return orig.call(this, st, t); }; }
  });
  await page.goto(L.fileUrl(process.argv[2])); await page.waitForFunction(() => window.__collections); await sleep(800);
  const r = {}; const kind = () => page.evaluate(() => document.documentElement.dataset.kind);
  await page.click('#tab-films'); await sleep(700); r.tabClick = await kind();
  await L.touchPath(page, L.swipePath(340, 500, -220, 4, 250)); await sleep(800); r.swipeLeft = await kind();
  await L.touchPath(page, L.swipePath(50, 500, 220, 4, 250)); await sleep(800); r.swipeRight = await kind();
  await page.evaluate(() => document.querySelector('#item-films-1 input[data-field=seen]').click()); r.markInMemory = await page.evaluate(() => window.__collections.state().films.seen['1']);
  await page.click('#more-toggle'); await sleep(200); await page.click('#more-panel [data-sheet=history]'); await sleep(600);
  r.historyKind = await page.evaluate(() => document.getElementById('sheet-history').dataset.kind);
  r.historyRows = await page.evaluate(() => document.querySelectorAll('#history-body .h-row').length);
  await page.click('#history-body button.h-row'); await sleep(300); r.recordOpened = await page.evaluate(() => !document.getElementById('history-work').hidden);
  await page.click('#sheet-history .sheet-back'); await sleep(300); r.backToList = await page.evaluate(() => document.getElementById('history-work').hidden && !!document.querySelector('.sheet.open'));
  await L.touchPath(page, L.swipePath(340, 600, -200, 3, 250)); await sleep(800); r.historySwipe = await page.evaluate(() => document.getElementById('sheet-history').dataset.kind);
  await page.click('#sheet-history .sheet-back'); await sleep(500); r.sheetClosed = await page.evaluate(() => !document.querySelector('.sheet.open'));
  await page.click('#more-toggle'); await sleep(200); await page.click('#more-panel [data-sheet=stats]'); await sleep(600);
  await L.touchPath(page, L.swipePath(340, 600, -200, 3, 250)); await sleep(800); r.statsSwipe = await page.evaluate(() => document.getElementById('sheet-stats').dataset.kind);
  await page.keyboard.press('Escape'); await sleep(500); r.escapeClosed = await page.evaluate(() => !document.querySelector('.sheet.open'));
  r.errors = errs; console.log(JSON.stringify(r)); await b.close();
})();
