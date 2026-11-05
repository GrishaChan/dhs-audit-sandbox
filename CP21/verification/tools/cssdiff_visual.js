// Computed-style snapshot of every element in many UI states; prints hashes per state (compare two builds).
// Usage: node cssdiff.js <a.html> <b.html>   → lists differing elements/properties.
const L = require('./lib'); const crypto = require('crypto');
async function snap(file) {
  const b = await L.launch(); const out = {};
  for (const scheme of ['dark', 'light']) for (const layout of ['mobile', 'desktop']) {
    const ctx = layout === 'mobile' ? await L.mobileContext(b, { colorScheme: scheme }) : await L.desktopContext(b, { colorScheme: scheme });
    const p = await L.openApp(ctx, file, { history: L.makeHistory(60) });
    await p.evaluate(s => localStorage.setItem('personal-collections-clean-cp08-v1-theme-choice', JSON.stringify(s)), scheme); await p.reload(); await p.waitForFunction(() => window.__collections); await p.waitForTimeout(1500);
    const grab = async label => { out[scheme + '/' + layout + '/' + label] = await p.evaluate(() => { const h = s => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(36); }; const el2 = {}, prop = {}, sample = {}; let i = 0; for (const el of document.querySelectorAll('*')) { if (el.closest('script,style,head') && el.tagName !== 'HTML') continue; const cs = getComputedStyle(el); let all = ''; const key = (el.id || el.className?.baseVal || el.className || el.tagName) + '#' + (i++); for (let j = 0; j < cs.length; j++) { const k = cs[j]; if (k.startsWith('--')) continue; const v = cs.getPropertyValue(k); all += k + ':' + v + ';'; prop[k] = h((prop[k] || '') + key + '=' + v); if (!sample[k + '|' + key]) sample[k + '|' + key] = 0; } el2[key] = h(all); } return { el: el2, prop }; }); };
    await grab('catalog-books');
    await p.click('#tab-films'); await p.waitForTimeout(700); await grab('catalog-films');
    await p.click('#more-toggle'); await p.waitForTimeout(500); await grab('menu');
    await p.click('#more-panel [data-sheet=stats]'); await p.waitForTimeout(700); await grab('stats');
    await p.evaluate(() => document.querySelector('.sheet.open .sheet-back').click()); await p.waitForTimeout(500);
    await p.click('#more-toggle'); await p.waitForTimeout(150); await p.click('#more-panel [data-sheet=history]'); await p.waitForTimeout(700); await grab('history');
    await ctx.close();
  }
  await b.close(); return out;
}
(async () => {
  const [A, B] = [await snap(process.argv[2]), await snap(process.argv[3])];
  let elDiff = 0; const props = new Set(), states = {};
  for (const st of Object.keys(A)) { const a = A[st], bb = B[st]; const ks = new Set([...Object.keys(a.el), ...Object.keys(bb.el)]); let n = 0; for (const k of ks) if (a.el[k] !== bb.el[k]) { n++; if (n <= 12) (states[st] ||= []).push(k); } elDiff += n; for (const k of new Set([...Object.keys(a.prop), ...Object.keys(bb.prop)])) if (a.prop[k] !== bb.prop[k]) props.add(k); if (n) states[st] = [n + ' elements', ...(states[st] || [])]; }
  console.log('states', Object.keys(A).length, 'element-state differences', elDiff);
  console.log('properties that differ:', [...props].join(', ') || 'none');
  for (const [st, v] of Object.entries(states)) console.log(' ', st, v.join(' | '));
})();
