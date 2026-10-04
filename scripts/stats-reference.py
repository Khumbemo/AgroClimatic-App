# Generates src/utils/__tests__/scipy-reference.json (pip install scipy numpy; python scripts/stats-reference.py > src/utils/__tests__/scipy-reference.json)
import json
from scipy import stats
import numpy as np
out={}
out['pnorm']=[[z, float(stats.norm.cdf(z))] for z in [-3.5,-1.96,-0.5,0,0.7,2.33,6]]
out['qnorm']=[[p, float(stats.norm.ppf(p))] for p in [1e-6,0.001,0.025,0.3,0.5,0.9,0.975,0.999999]]
out['fUpper']=[[f,d1,d2,float(stats.f.sf(f,d1,d2))] for f,d1,d2 in [(4.10,2,10),(1.5,3,12),(10.3,1,8),(0.4,5,20),(25,4,6),(3.0,9,60)]]
out['tTwo']=[[t,df,float(2*stats.t.sf(abs(t),df))] for t,df in [(2.228,10),(1.0,5),(3.5,30),(0.2,2)]]
sr=stats.studentized_range
out['ptukey']=[[q,k,df,float(sr.cdf(q,k,df))] for q,k,df in [(3.877,3,10),(2.0,4,20),(4.5,5,12),(3.0,2,5),(5.0,10,30),(1.0,3,100),(3.5,6,1000),(3.3,3,60)]]
out['qtukey']=[[k,df,float(sr.ppf(0.95,k,df))] for k,df in [(3,10),(4,20),(5,30),(2,5),(8,60)]]
rng=np.random.default_rng(7)
samples={'men':[148,154,158,160,161,162,166,170,182,195,236],'n3':[1.2,3.4,2.2],'n5':[3.1,2.9,3.6,4.0,2.2],'n8':[10.2,9.8,11.5,10.9,9.1,10.4,12.8,10.0],'normal30':[round(float(v),3) for v in rng.normal(10,2,30)],'skew40':[round(float(v),3) for v in rng.exponential(2,40)]}
out['shapiro']={k:[v,[float(x) for x in stats.shapiro(v)]] for k,v in samples.items()}
groups=[[5.1,4.9,6.2,5.5,5.8],[6.9,7.4,8.8,6.1,7.0],[4.0,4.1,4.3,3.9,4.2]]
out['levene']=[groups,[float(x) for x in stats.levene(*groups,center='median')]]
print(json.dumps(out))
