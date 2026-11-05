// Shared helpers for CP20 browser tests (Playwright + Chromium via CDP).
const { chromium } = require('playwright');
const path = require('path');
const STORE = 'personal-collections-clean-cp08-v1';
const REV = 'CP08-2026-11-04';

// Deterministic history fixture: realistic status sequences, valid for tidyHistory().
function makeHistory(n, { now = Date.now(), seed = 7 } = {}) {
  let s = seed; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  const events = []; const span = 400 * 864e5; let i = 0;
  const flows = {
    books: [['unread', 'reading'], ['reading', 'read']],
    films: [['unseen', 'watching'], ['watching', 'seen']],
  };
  while (events.length < n) {
    const sec = ['books', 'films', 'songs'][i % 3]; const work = String(1 + Math.floor(rnd() * 490));
    const base = now - span + Math.floor(rnd() * span);
    if (sec === 'songs') {
      events.push({ section: 'songs', work, action: 'status', from: 'not-listened', to: 'listened', ms: base });
      if (rnd() < .4) events.push({ section: 'songs', work, action: 'favorite', from: 'not-favorite', to: 'favorite', ms: base + 60000 });
    } else {
      const f = flows[sec];
      events.push({ section: sec, work, action: 'status', from: f[0][0], to: f[0][1], ms: base });
      events.push({ section: sec, work, action: 'status', from: f[1][0], to: f[1][1], ms: base + Math.floor(rnd() * 20 * 864e5) + 3600e3 });
    }
    i++;
  }
  events.length = n;
  events.forEach((e, j) => { e.id = 'fx-' + j; e.title = 'Fixture ' + e.work; e.at = new Date(e.ms).toISOString(); e.tz = 'Europe/Moscow'; });
  events.sort((a, b) => a.ms - b.ms);
  return { revision: REV, epoch: 'fixture-epoch', clearedAt: 0, events };
}
function storageInit(historyObj, stateObj) {
  // Runs in page before app scripts: seeds an isolated profile.
  return ({ STORE, REV, historyObj, stateObj, token }) => {
    // marker in localStorage: sessionStorage of file:// pages is not reliably kept across reload in Chromium
    if (localStorage.getItem('__fixture_' + token)) return; localStorage.setItem('__fixture_' + token, '1');
    if (stateObj) localStorage.setItem(STORE, JSON.stringify({ version: 1, schema: 4, resetRevision: REV, state: stateObj, flags: { dlSync: true }, mode: 'dark', themeChoice: 'dark', updatedAt: new Date().toISOString() }));
    if (historyObj) localStorage.setItem(STORE + '-history', JSON.stringify(historyObj));
  };
}
async function seed(page, fn, arg) { await page.goto(fileUrl(path.join(__dirname, 'blank.html'))); await page.evaluate(fn, arg); }
async function launch() { return chromium.launch(); }
async function mobileContext(browser, opts = {}) {
  return browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, colorScheme: opts.colorScheme || 'dark', reducedMotion: opts.reducedMotion || 'no-preference' });
}
async function desktopContext(browser, opts = {}) {
  return browser.newContext({ viewport: { width: opts.width || 1280, height: 900 }, colorScheme: opts.colorScheme || 'dark', reducedMotion: opts.reducedMotion || 'no-preference' });
}
function fileUrl(p) { return 'file://' + path.resolve(p); }
async function openApp(ctx, file, { history, state, hash = '' } = {}) {
  const page = await ctx.newPage();
  page.__errors = [];
  page.on('pageerror', e => page.__errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') page.__errors.push('console.error: ' + m.text()); });
  // A seeded history is only valid together with an existing CP08 store (otherwise the app correctly starts a first run).
  // Seeding goes through a blank page of the same file:// origin: Playwright init scripts that touch localStorage
  // make reload persistence flaky in Chromium (verified: 0/24 failures without init script, up to 8/12 with one).
  if (history || state) await seed(page, ({ STORE, REV, historyObj, stateObj }) => {
    localStorage.setItem(STORE, JSON.stringify({ version: 1, schema: 4, resetRevision: REV, state: stateObj, flags: { dlSync: true }, mode: 'dark', themeChoice: 'dark', updatedAt: new Date().toISOString() }));
    if (historyObj) localStorage.setItem(STORE + '-history', JSON.stringify(historyObj));
  }, { STORE, REV, historyObj: history || null, stateObj: state || {} });
  await page.goto(fileUrl(file) + hash);
  await page.waitForFunction(() => window.__collections);
  return page;
}
// Real touch input through CDP (isTrusted=true). points: [{x,y,t}] t in ms from start.
async function touchPath(page, pts) {
  const cdp = page.__cdp || (page.__cdp = await page.context().newCDPSession(page));
  const t0 = Date.now();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]; const wait = p.t - (Date.now() - t0); if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const type = i === 0 ? 'touchStart' : i === pts.length - 1 ? 'touchEnd' : 'touchMove';
    await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: p.x, y: p.y, id: 1 }] });
  }
}
// Linear swipe path at ~60 Hz.
function swipePath(x0, y0, dx, dy, ms, { hold = 0, back = 0 } = {}) {
  const pts = []; const steps = Math.max(2, Math.round(ms / 16));
  for (let i = 0; i <= steps; i++) pts.push({ x: x0 + dx * i / steps, y: y0 + dy * i / steps, t: i * ms / steps });
  if (back) { const s2 = Math.round(back / 16); for (let i = 1; i <= s2; i++) pts.push({ x: x0 + dx * (1 - i / s2), y: y0 + dy, t: ms + i * back / s2 }); }
  const last = pts[pts.length - 1]; pts.push({ x: last.x, y: last.y, t: last.t + 16 + hold });
  return pts;
}
module.exports = { seed, STORE, REV, makeHistory, storageInit, launch, mobileContext, desktopContext, openApp, touchPath, swipePath, fileUrl };
