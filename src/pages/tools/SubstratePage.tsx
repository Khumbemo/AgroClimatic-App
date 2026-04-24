import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Beaker, Layers } from 'lucide-react';

interface LeachateLog { id:string; date:string; batchId:string; phIn:number; phOut:number; ecIn:number; ecOut:number; volumeMl:number; createdAt:string; createdBy:string; }
interface SubstrateProfile { id:string; name:string; components:{name:string;pct:number}[]; cec:number; createdAt:string; }

const SubstratePage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'leachate'|'substrate'>('leachate');
  const [leachLogs, setLeachLogs] = useState<LeachateLog[]>([]);
  const [profiles, setProfiles] = useState<SubstrateProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [lForm, setLForm] = useState({date:new Date().toISOString().split('T')[0], batchId:'', phIn:'', phOut:'', ecIn:'', ecOut:'', volumeMl:''});
  const [sForm, setSForm] = useState({name:'', components:[{name:'Peat',pct:30},{name:'Coco Coir',pct:50},{name:'Perlite',pct:20}] as {name:string;pct:number}[], cec:''});

  useEffect(()=>{ const l=localStorage.getItem('ac_leachate'); if(l) setLeachLogs(JSON.parse(l)); const s=localStorage.getItem('ac_substrates'); if(s) setProfiles(JSON.parse(s)); },[]);

  const saveLeachate = () => {
    if(!lForm.phIn||!lForm.ecIn) return;
    const log:LeachateLog = {id:`LL-${Date.now()}`, date:lForm.date, batchId:lForm.batchId, phIn:parseFloat(lForm.phIn), phOut:parseFloat(lForm.phOut)||0, ecIn:parseFloat(lForm.ecIn), ecOut:parseFloat(lForm.ecOut)||0, volumeMl:parseFloat(lForm.volumeMl)||0, createdAt:new Date().toISOString(), createdBy:'Nursery Manager'};
    const u=[log,...leachLogs]; setLeachLogs(u); localStorage.setItem('ac_leachate',JSON.stringify(u));
    setShowForm(false); setLForm({date:new Date().toISOString().split('T')[0],batchId:'',phIn:'',phOut:'',ecIn:'',ecOut:'',volumeMl:''});
  };

  const saveSubstrate = () => {
    if(!sForm.name) return;
    const p:SubstrateProfile = {id:`SUB-${Date.now()}`, name:sForm.name, components:sForm.components.filter(c=>c.pct>0), cec:parseFloat(sForm.cec)||0, createdAt:new Date().toISOString()};
    const u=[p,...profiles]; setProfiles(u); localStorage.setItem('ac_substrates',JSON.stringify(u));
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
        <div className="flex-1"><h1 className="text-2xl font-black text-gray-900 tracking-tight">Substrate & Nutrients</h1></div>
        <button onClick={()=>setShowForm(true)} className="bg-gradient-to-r from-lime-500 to-green-600 text-white p-2.5 rounded-xl shadow-lg shadow-lime-500/30 hover:scale-105 transition-transform"><Plus className="w-5 h-5"/></button>
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {[{k:'leachate' as const,l:'Leachate',ic:<Beaker className="w-3.5 h-3.5"/>},{k:'substrate' as const,l:'Substrate',ic:<Layers className="w-3.5 h-3.5"/>}].map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab===t.k?'bg-white text-gray-900 shadow-sm':'text-gray-400'}`}>{t.ic} {t.l}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5"><h2 className="font-black text-lg">{tab==='leachate'?'Leachate Entry':'Substrate Profile'}</h2><button onClick={()=>setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button></div>
            {tab==='leachate' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</label><input type="date" value={lForm.date} onChange={e=>setLForm({...lForm,date:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Batch ID</label><input type="text" placeholder="BATCH-001" value={lForm.batchId} onChange={e=>setLForm({...lForm,batchId:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100"><p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3">Irrigation Input</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">pH In</label><input type="number" step="0.01" placeholder="6.50" value={lForm.phIn} onChange={e=>setLForm({...lForm,phIn:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                    <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">EC In (mS/cm)</label><input type="number" step="0.01" placeholder="1.20" value={lForm.ecIn} onChange={e=>setLForm({...lForm,ecIn:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100"><p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-3">Leachate Output</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">pH Out</label><input type="number" step="0.01" placeholder="5.80" value={lForm.phOut} onChange={e=>setLForm({...lForm,phOut:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                    <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">EC Out (mS/cm)</label><input type="number" step="0.01" placeholder="2.40" value={lForm.ecOut} onChange={e=>setLForm({...lForm,ecOut:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                  </div>
                </div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Leachate Volume (mL)</label><input type="number" value={lForm.volumeMl} onChange={e=>setLForm({...lForm,volumeMl:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                <button onClick={saveLeachate} className="w-full bg-gradient-to-r from-lime-500 to-green-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Record Entry</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Profile Name</label><input type="text" placeholder="Standard Nursery Mix" value={sForm.name} onChange={e=>setSForm({...sForm,name:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Components (Total: <span className={totalPct===100?'text-green-600':'text-red-500'}>{totalPct}%</span>)</label>
                  {sForm.components.map((c,i)=>(<div key={i} className="flex gap-2 mb-2"><input type="text" value={c.name} onChange={e=>updateComp(i,'name',e.target.value)} className="flex-1 p-2 rounded-lg border border-gray-200 font-mono-sci text-sm outline-none"/><input type="number" value={c.pct} onChange={e=>updateComp(i,'pct',e.target.value)} className="w-20 p-2 rounded-lg border border-gray-200 font-mono-sci text-sm text-center outline-none"/><span className="text-sm text-gray-400 self-center">%</span></div>))}
                  <button onClick={addComp} className="text-xs text-lime-600 font-bold">+ Add Component</button>
                </div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">CEC (cmol/kg)</label><input type="number" step="0.1" placeholder="25.0" value={sForm.cec} onChange={e=>setSForm({...sForm,cec:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                <button onClick={saveSubstrate} className="w-full bg-gradient-to-r from-lime-500 to-green-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Save Profile</button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab==='leachate' && (leachLogs.length===0 ? <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Beaker className="w-10 h-10 text-gray-300 mx-auto mb-3"/><p className="font-bold text-sm text-gray-500">No leachate data.</p></div>
      : leachLogs.map(l=>(<div key={l.id} className="bento-card p-4 bg-white/90 border border-gray-200">
        <div className="flex justify-between items-center mb-3"><span className="font-mono-sci text-[10px] font-bold text-lime-600">{l.id}</span><span className="font-mono-sci text-[10px] text-gray-400">{l.date}</span></div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-blue-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.phIn}</div><div className="text-[8px] text-gray-400">pH In</div></div>
          <div className="bg-amber-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.phOut}</div><div className="text-[8px] text-gray-400">pH Out</div></div>
          <div className="bg-blue-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.ecIn}</div><div className="text-[8px] text-gray-400">EC In</div></div>
          <div className="bg-amber-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.ecOut}</div><div className="text-[8px] text-gray-400">EC Out</div></div>
        </div>
        <div className="text-[8px] text-gray-400 font-mono-sci mt-2">{l.createdBy} · {l.createdAt}</div>
      </div>)))}

      {tab==='substrate' && (profiles.length===0 ? <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Layers className="w-10 h-10 text-gray-300 mx-auto mb-3"/><p className="font-bold text-sm text-gray-500">No substrate profiles.</p></div>
      : profiles.map(p=>(<div key={p.id} className="bento-card p-4 bg-white/90 border border-gray-200">
        <div className="flex justify-between items-center mb-3"><span className="font-mono-sci text-[10px] font-bold text-lime-600">{p.id}</span><span className="font-mono-sci text-[10px] text-gray-500 font-bold">{p.name}</span></div>
        <div className="flex gap-1 h-6 rounded-full overflow-hidden mb-3">{p.components.map((c,i)=>{const colors=['bg-amber-400','bg-emerald-400','bg-gray-300','bg-blue-300','bg-orange-300','bg-pink-300']; return <div key={i} className={`${colors[i%colors.length]} relative group`} style={{width:`${c.pct}%`}} title={`${c.name}: ${c.pct}%`}/>})}</div>
        <div className="flex flex-wrap gap-2">{p.components.map((c,i)=>(<span key={i} className="text-[9px] font-mono-sci font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{c.name}: {c.pct}%</span>))}</div>
        <div className="text-[9px] font-mono-sci text-gray-500 mt-2">CEC: {p.cec} cmol/kg</div>
      </div>)))}
    </div>
  );
};
export default SubstratePage;
