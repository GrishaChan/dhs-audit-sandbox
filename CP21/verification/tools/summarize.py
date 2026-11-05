import json,re,statistics as st,collections
R='results/'
def regress(f):
    d=json.load(open(R+f)); return d
a=regress('regress_CP20_on_CP21_suite.json'); b=regress('regress_CP21.json')
print('REGRESS CP21',b['pass'],'/',b['total'],'| CP20 on same suite',a['pass'],'/',a['total'])
norm=lambda n:re.sub(r'^(desktop|mobile)/(light|dark): |^(dark|light): ','',n)
print(' CP21 fails:',[x['name'] for x in b['results'] if not x['ok']])
c=collections.Counter(norm(x['name']) for x in a['results'] if not x['ok'])
for n,k in c.most_common(): print('  CP20 fail x%d %s'%(k,n))
# toggle metrics
print('TOGGLES (CP20 -> CP21), mobile')
for sch in ['light','dark']:
  for k in ['books','films','songs']:
    n=f'mobile/{sch}: stats levels 1-3 clearly highlighted on {k}'
    da=json.loads([x['detail'] for x in a['results'] if x['name']==n][0]); db=json.loads([x['detail'] for x in b['results'] if x['name']==n][0])
    print(' ',sch,k,{lvl:(da[lvl].get('edgePx'),db[lvl]['edgePx'],da[lvl]['bgDistance'],db[lvl]['bgDistance'],db[lvl]['inkDistance'],db[lvl]['contrastActive'],db[lvl]['contrastInactiveMin']) for lvl in ['category','type','period']})
for sch in ['light','dark']:
  n=f'mobile/{sch}: main capsule and all segment toggles share one style system'
  print(' system',sch,'CP20',[x['ok'] for x in a['results'] if x['name']==n],'CP21',[x['detail'] for x in b['results'] if x['name']==n][0][:300])
  n=f'mobile/{sch}: history category highlight and theme radio highlight'
  print(' hist/theme',sch,[x['detail'] for x in b['results'] if x['name']==n][0])
print('GESTURE'); print(open(R+'gesture.txt').read().count('MISS'),'total MISS lines')
for blk in open(R+'gesture.txt').read().split('## ')[1:]:
    head=blk.split('\n')[0]; tot=[l for l in blk.split('\n') if l.startswith('TOTAL')]; miss=[l[:70] for l in blk.split('\n') if l.startswith('MISS')]
    print(' ',head,tot,miss)
print('SWIPEPERF')
for l in open(R+'swipeperf.jsonl'):
    d=json.loads(l); print(' ',d['file'][:16],d['events'],{k:(v['switchedTo'],v['firstMovedFrameMs'],v['maxFrameGapInMotionMs'],v['framesOver34InMotion'],len(v['longTasksInMotion'])) for k,v in d.items() if isinstance(v,dict)},d['errors'])
for f in ['perf_CP20.json','perf_CP21.json']:
    d=json.load(open(R+f)); print('PERF',f,d['loadMs'],d['heapMB'],d['renderMs_throttled'],d['markToggleMs_3000events_throttled'],d['errors'])
    for k in ['statsSwipe','historySwipe','historySwipeImmediate','statsSwipeImmediate']: v=d[k]; print('   ',k,v['dragFramesWithContentMotion'],v['maxIncomingJumpPx'],[(g['atMsFromRelease'],g['gap'],g['incomingXBefore']) for g in v['gapsDetail']])
rows=[json.loads(l) for l in open(R+'catswipe.jsonl')]
for f in ['CP20','app']:
    r=[x for x in rows if f in x['file']]; print('CATSWIPE',f,'switched',set(x['switchedTo'] for x in r),'maxGap med',st.median(x['maxFrameGapMs'] for x in r),'longest med',st.median(max(x['longTasks'] or [0]) for x in r),'errors',sum(len(x['errors']) for x in r))
print(open(R+'catgesture.txt').read()); print(open(R+'recalc.txt').read()); print(open(R+'opaque.txt').read()[:3000]); print(open(R+'cssdiff_CP20_CP21.txt').read()[:2500]); print(open(R+'datacheck.txt').read())
