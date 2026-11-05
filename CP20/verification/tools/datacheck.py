#!/usr/bin/env python3
"""Extract protected JSON blocks from an app HTML; print hashes/counts, or compare two files."""
import sys, re, json, hashlib
IDS=['data-books','data-films','data-songs','boot']
def blocks(path):
    s=open(path,'rb').read()
    out={}
    for i in IDS:
        m=re.search(rb'<script id="'+i.encode()+rb'" type="application/json">(.*?)</script>',s,re.S)
        assert m, i
        out[i]=m.group(1)
    return out
def summary(path):
    b=blocks(path); r={}
    for i,raw in b.items():
        r[i]={'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
    d={k:json.loads(b['data-'+k]) for k in ['books','films','songs']}
    boot=json.loads(b['boot'])
    r['counts']={k:len(v) for k,v in d.items()}
    r['ids_in_order']={k:[str(x.get('n',x.get('id'))) for x in v][:3]+['…'] for k,v in d.items()}
    r['downloaded_embedded_true']={k:sum(1 for x in v if x.get('downloaded') is True) for k,v in d.items()}
    r['boot_downloaded_true']={k:sum(1 for x in boot['state'][k].get('downloaded',{}).values() if x) for k in d}
    r['boot_other_marks']={k:{f:len(m) for f,m in boot['state'][k].items() if f!='downloaded'} for k in d}
    r['boot_history_events']=len(boot['history']['events'])
    r['boot_savedAt']=boot['savedAt']
    return r,b,d
if __name__=='__main__':
    if len(sys.argv)==2:
        print(json.dumps(summary(sys.argv[1])[0],ensure_ascii=False,indent=1))
    else:
        (sa,ba,da),(sb,bb,db)=summary(sys.argv[1]),summary(sys.argv[2])
        ok=True
        for i in IDS:
            same=ba[i]==bb[i]; ok&=same
            print(f'{i}: byte-identical={same} sha={sa[i]["sha256"][:16]}')
        for k in da:
            ids_a=[str(x.get('n',x.get('id'))) for x in da[k]]; ids_b=[str(x.get('n',x.get('id'))) for x in db[k]]
            eq=da[k]==db[k]; ok&=eq and ids_a==ids_b
            print(f'{k}: records {len(da[k])}/{len(db[k])} ids+order equal={ids_a==ids_b} all-fields equal={eq}')
        import hashlib as H
        def icons(p):
            t=open(p,encoding='utf-8').read()
            return re.search(r"const ART_IMG=.*?\n",t).group(0), re.search(r"const MINI=\{.*?\n\};",t,re.S).group(0)
        ia,ib=icons(sys.argv[1]),icons(sys.argv[2]); same=ia==ib; ok&=same
        print('approved icons ART_IMG+MINI byte-identical:',same)
        print('downloaded books (embedded field / boot map):',sb['downloaded_embedded_true']['books'],'/',sb['boot_downloaded_true']['books'])
        print('RESULT:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
