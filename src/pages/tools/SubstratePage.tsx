import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Beaker, Layers } from 'lucide-react';

import { useBatchIndex, useCollection, useData, byDateDesc } from '../../data/hooks';
import { saveErrorMessage } from '../../data/errors';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';

const SubstratePage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'leachate'|'substrate'>('leachate');
  const { repo } = useData();
  const { label } = useBatchIndex();
  const leachLogs = [...useCollection('leachateTests').items].sort(byDateDesc);
  const profiles = [...useCollection('substrateMixes').items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [lForm, setLForm] = useState({date:new Date().toISOString().split('T')[0], batchId:'', phIn:'', phOut:'', ecIn:'', ecOut:'', volumeMl:''});
  const [sForm, setSForm] = useState({name:'', components:[{name:'Peat',pct:30},{name:'Coco Coir',pct:50},{name:'Perlite',pct:20}] as {name:string;pct:number}[], cec:''});


  const nullable = (v: string) => (v === '' ? null : parseFloat(v));

  const saveLeachate = async () => {
    if (!lForm.batchId) { setError('Select the batch that was tested.'); return; }
    if (!lForm.phIn || !lForm.ecIn) { setError('Enter the irrigation pH and EC.'); return; }
    try {
      await repo.add('leachateTests', {
        date: lForm.date, batchId: lForm.batchId, phIn: parseFloat(lForm.phIn), phOut: nullable(lForm.phOut),
        ecIn: parseFloat(lForm.ecIn), ecOut: nullable(lForm.ecOut), volumeMl: nullable(lForm.volumeMl),
      });
    } catch (e) { setError(saveErrorMessage(e)); return; }
    setError(null);
    setShowForm(false); setLForm({date:new Date().toISOString().split('T')[0],batchId:'',phIn:'',phOut:'',ecIn:'',ecOut:'',volumeMl:''});
  };

  const saveSubstrate = async () => {
    if(!sForm.name) { setError('Enter a name for the mix.'); return; }
    try {
      await repo.add('substrateMixes', { name: sForm.name, components: sForm.components.filter(c => c.pct > 0), cec: nullable(sForm.cec) });
    } catch (e) { setError(saveErrorMessage(e)); return; }
    setError(null);
    setShowForm(false); setSForm({name:'',components:[{name:'Peat',pct:30},{name:'Coco Coir',pct:50},{name:'Perlite',pct:20}],cec:''});
  };

  const updateComp = (i:number, field:'name'|'pct', val:string) => {
    const c=[...sForm.components]; if(field==='pct') c[i].pct=parseFloat(val)||0; else c[i].name=val; setSForm({...sForm,components:c});
  };
  const addComp = () => setSForm({...sForm,components:[...sForm.components,{name:'',pct:0}]});
  const totalPct = sForm.components.reduce((s,c)=>s+c.pct,0);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600"/></button>
        <div className="flex-1"><h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Substrate & Nutrients</h1></div>
        <button onClick={()=>setShowForm(true)} className="bg-green-700 hover:bg-green-800 text-white p-2.5 rounded-xl shadow-sm  hover:scale-105 transition-transform"><Plus className="w-5 h-5"/></button>
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {[{k:'leachate' as const,l:'Leachate',ic:<Beaker className="w-3.5 h-3.5"/>},{k:'substrate' as const,l:'Substrate',ic:<Layers className="w-3.5 h-3.5"/>}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all ${tab===t.k?'bg-white text-gray-900 shadow-sm':'text-gray-400'}`}>{t.ic} {t.l}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-sm">
            <div className="flex justify-between items-center mb-5"><h2 className="font-semibold text-lg">{tab==='leachate'?'Leachate Entry':'Substrate Profile'}</h2><button onClick={()=>{setShowForm(false);setError(null);}} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button></div>
            {tab==='leachate' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Date</label><input type="date" value={lForm.date} onChange={e=>setLForm({...lForm,date:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                  <div><label htmlFor="leach-batch" className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Batch</label><BatchSelect id="leach-batch" value={lForm.batchId || null} onChange={id=>setLForm({...lForm,batchId:id ?? ''})}/></div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100"><p className="text-[9px] font-semibold text-blue-500 uppercase tracking-widest mb-3">Irrigation Input</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">pH In</label><input type="number" step="0.01" placeholder="6.50" value={lForm.phIn} onChange={e=>setLForm({...lForm,phIn:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                    <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">EC In (mS/cm)</label><input type="number" step="0.01" placeholder="1.20" value={lForm.ecIn} onChange={e=>setLForm({...lForm,ecIn:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100"><p className="text-[9px] font-semibold text-amber-500 uppercase tracking-widest mb-3">Leachate Output</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">pH Out</label><input type="number" step="0.01" placeholder="5.80" value={lForm.phOut} onChange={e=>setLForm({...lForm,phOut:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                    <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">EC Out (mS/cm)</label><input type="number" step="0.01" placeholder="2.40" value={lForm.ecOut} onChange={e=>setLForm({...lForm,ecOut:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                  </div>
                </div>
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Leachate Volume (mL)</label><input type="number" value={lForm.volumeMl} onChange={e=>setLForm({...lForm,volumeMl:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                <FormError message={error} />
                <button onClick={saveLeachate} className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-sm uppercase tracking-widest shadow-sm">Record Entry</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Profile Name</label><input type="text" placeholder="Standard Nursery Mix" value={sForm.name} onChange={e=>setSForm({...sForm,name:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 block">Components (Total: <span className={totalPct===100?'text-green-600':'text-red-500'}>{totalPct}%</span>)</label>
                  {sForm.components.map((c,i)=>(<div key={i} className="flex gap-2 mb-2"><input type="text" value={c.name} onChange={e=>updateComp(i,'name',e.target.value)} className="flex-1 p-2 rounded-lg border border-gray-200 font-mono-sci text-sm outline-none"/><input type="number" value={c.pct} onChange={e=>updateComp(i,'pct',e.target.value)} className="w-20 p-2 rounded-lg border border-gray-200 font-mono-sci text-sm text-center outline-none"/><span className="text-sm text-gray-400 self-center">%</span></div>))}
                  <button onClick={addComp} className="text-xs text-green-600 font-bold">+ Add Component</button>
                </div>
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">CEC (cmol/kg)</label><input type="number" step="0.1" placeholder="25.0" value={sForm.cec} onChange={e=>setSForm({...sForm,cec:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                <FormError message={error} />
                <button onClick={saveSubstrate} className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-sm uppercase tracking-widest shadow-sm">Save Profile</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='leachate' && (leachLogs.length===0 ? <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Beaker className="w-10 h-10 text-gray-300 mx-auto mb-3"/><p className="font-bold text-sm text-gray-500">No leachate data.</p></div>
      : leachLogs.map(l=>(<div key={l.id} className="bento-card p-4 border border-gray-200">
        <div className="flex justify-between items-center mb-3"><span className="text-xs font-medium text-gray-700">{label(l.batchId, l.legacyBatchLabel)}</span><span className="font-mono-sci text-[10px] text-gray-400">{l.date}</span></div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-blue-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.phIn}</div><div className="text-[8px] text-gray-400">pH In</div></div>
          <div className="bg-amber-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.phOut ?? '—'}</div><div className="text-[8px] text-gray-400">pH Out</div></div>
          <div className="bg-blue-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.ecIn}</div><div className="text-[8px] text-gray-400">EC In</div></div>
          <div className="bg-amber-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.ecOut ?? '—'}</div><div className="text-[8px] text-gray-400">EC Out</div></div>
        </div>
        {l.volumeMl != null && <div className="text-[10px] text-gray-500 font-mono-sci mt-2">Leachate volume {l.volumeMl} mL</div>}
      </div>)))}

      {tab==='substrate' && (profiles.length===0 ? <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Layers className="w-10 h-10 text-gray-300 mx-auto mb-3"/><p className="font-bold text-sm text-gray-500">No substrate profiles.</p></div>
      : profiles.map(p=>(<div key={p.id} className="bento-card p-4 border border-gray-200">
        <div className="flex justify-between items-center mb-3"><span className="text-sm font-medium text-gray-900">{p.name}</span></div>
        <div className="flex gap-1 h-6 rounded-full overflow-hidden mb-3">{p.components.map((c,i)=>{const colors=['bg-amber-400','bg-green-400','bg-gray-300','bg-blue-300','bg-amber-300','bg-red-300']; return <div key={i} className={`${colors[i%colors.length]} relative group`} style={{width:`${c.pct}%`}} title={`${c.name}: ${c.pct}%`}/>})}</div>
        <div className="flex flex-wrap gap-2">{p.components.map((c,i)=>(<span key={i} className="text-[9px] font-mono-sci font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{c.name}: {c.pct}%</span>))}</div>
        <div className="text-[9px] font-mono-sci text-gray-500 mt-2">CEC: {p.cec ?? '—'} cmol/kg</div>
      </div>)))}
    </div>
  );
};
export default SubstratePage;
