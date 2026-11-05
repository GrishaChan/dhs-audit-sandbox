const L = require('./lib');
(async () => {
  const b = await L.launch(); const ctx = await L.mobileContext(b);
  const page = await L.openApp(ctx, process.argv[2]); await page.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(page); page.__cdp = cdp; await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline', transferMode: 'ReturnAsStream' });
  await L.touchPath(page, L.swipePath(330, 500, -220, 6, 260)); await page.waitForTimeout(700);
  const chunks = []; await new Promise(res => { cdp.once('Tracing.tracingComplete', async ({ stream }) => { let d; do { d = await cdp.send('IO.read', { handle: stream }); chunks.push(d.data); } while (!d.eof); res(); }); cdp.send('Tracing.end'); });
  let ev = JSON.parse(chunks.join('')); ev = ev.traceEvents || ev;
  const main = ev.filter(e => e.name === 'RunTask' && e.dur > 30000);
  for (const t of main) {
    const kids = ev.filter(e => e.ph === 'X' && e.tid === t.tid && e.ts >= t.ts && e.ts + (e.dur||0) <= t.ts + t.dur && e.dur > 2000 && e !== t);
    console.log('TASK', Math.round(t.dur / 1000) + 'ms', kids.map(k => k.name + ':' + Math.round(k.dur / 1000) + (k.args?.data?.type ? '(' + k.args.data.type + ')' : '') + (k.args?.beginData?.stackTrace?.[0]?.functionName ? '[' + k.args.beginData.stackTrace[0].functionName + ']' : '') + (k.args?.data?.functionName ? '{' + k.args.data.functionName + '}' : '')).join(' | '));
  }
  await b.close();
})();
