// Opaque-origin stand-in for Android content://: the app runs in a sandboxed iframe (origin "null"),
// where localStorage throws and URL changes via the History API may be refused. Usage: node opaque.js <app.html>
const L = require('./lib'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await L.launch(); const ctx = await L.mobileContext(b); const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(L.fileUrl(path.join(__dirname, 'blank.html')));
  const html = fs.readFileSync(process.argv[2], 'utf8');
  await page.evaluate(h => { document.body.style.margin = 0; const f = document.createElement('iframe'); f.setAttribute('sandbox', 'allow-scripts'); f.style.cssText = 'border:0;width:100vw;height:100vh;display:block'; f.srcdoc = h; document.body.append(f); }, html);
  const frame = await (await page.waitForSelector('iframe')).contentFrame();
  await frame.waitForFunction(() => window.__collections, null, { timeout: 30000 });
  const r = {};
  r.origin = await frame.evaluate(() => origin);
  r.localStorageThrows = await frame.evaluate(() => { try { localStorage.length; return false; } catch (e) { return e.name; } });
  r.replaceStateThrows = await frame.evaluate(() => { try { history.replaceState(history.state, '', '#probe'); return false; } catch (e) { return e.name; } });
  await frame.click('#tab-songs'); await page.waitForTimeout(800); r.catalogAfterTabClick = await frame.evaluate(() => document.documentElement.dataset.kind);
  await frame.evaluate(() => { window.__t = 0; document.addEventListener('touchmove', () => window.__t++, { capture: true, passive: true }); });
  await L.touchPath(page, L.swipePath(60, 500, 220, 4, 250)); await page.waitForTimeout(800); r.catalogAfterSwipe = await frame.evaluate(() => document.documentElement.dataset.kind); r.touchmovesSeenInFrame = await frame.evaluate(() => window.__t);
  await page.mouse.click(5, 5); await page.waitForTimeout(100);
  await L.touchPath(page, L.swipePath(60, 500, 220, 4, 250)); await page.waitForTimeout(800); r.catalogAfterSecondSwipe = await frame.evaluate(() => document.documentElement.dataset.kind); r.touchmovesSeenInFrame2 = await frame.evaluate(() => window.__t);
  await frame.evaluate(() => document.querySelector('#item-films-1 input[data-field=seen]').click()); r.markInMemory = await frame.evaluate(() => window.__collections.state().films.seen['1']);
  await frame.click('#more-toggle'); await page.waitForTimeout(200); await frame.click('#more-panel [data-sheet=stats]'); await page.waitForTimeout(600);
  r.statsKind = await frame.evaluate(() => document.getElementById('sheet-stats').dataset.kind);
  await L.touchPath(page, L.swipePath(60, 600, 200, 3, 250)); await page.waitForTimeout(800); r.statsAfterSwipeRight = await frame.evaluate(() => document.getElementById('sheet-stats').dataset.kind);
  await frame.evaluate(() => document.querySelector('.sheet.open .sheet-back').click()); await page.waitForTimeout(600); r.sheetClosed = await frame.evaluate(() => !document.querySelector('.sheet.open'));
  await frame.click('#more-toggle'); await page.waitForTimeout(200); await frame.click('#more-panel [data-sheet=settings]'); await page.waitForTimeout(500);
  r.settingsWarning = await frame.evaluate(() => document.getElementById('storage-note').textContent.slice(0, 60));
  r.errors = errs; console.log(JSON.stringify(r, null, 1)); await b.close();
})();
