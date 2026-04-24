import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Skull, TrendingDown } from 'lucide-react';

const CAUSE_CODES = ['Damping-off (Pythium)','Desiccation','Chlorosis','Mechanical Damage','Failed to Emerge','Herbivory','Root Rot (Fusarium)','Nutrient Toxicity','Unknown'] as const;

interface MortalityEvent {
  id:string; date:string; batchId:string; sowingDate:string; count:number;
  causeCode:string; daysToDeath:number; notes:string;
  createdAt:string; createdBy:string;
}

const MortalityPage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<MortalityEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [totalSeeds, setTotalSeeds] = useState<number>(()=>{const s=localStorage.getItem('ac_mort_total');return s?parseInt(s):100;});
  const [form, setForm] = useState({date:new Date().toISOString().split('T')[0],batchId:'BATCH-001',sowingDate:'',count:'',causeCode:CAUSE_CODES[0] as string,notes:''});

  useEffect(()=>{const s=localStorage.getItem('ac_mortality');if(s)setEvents(JSON.parse(s));},[]);

  const updateTotal=(v:number)=>{setTotalSeeds(v);localStorage.setItem('ac_mort_total',v.toString());};

  const save = () => {
    if(!form.count||!form.sowingDate) return;
    const dtd = Math.max(1,Math.ceil((new Date(form.date).getTime()-new Date(form.sowingDate).getTime())/86400000));
    const ev:MortalityEvent = {id:`MRT-${Date.now()}`,date:form.date,batchId:form.batchId,sowingDate:form.sowingDate,count:parseInt(form.count),causeCode:form.causeCode,daysToDeath:dtd,notes:form.notes,createdAt:new Date().toISOString(),createdBy:'Nursery Manager'};
    const u=[ev,...events];setEvents(u);localStorage.setItem('ac_mortality',JSON.stringify(u));
    setShowForm(false);setForm({...form,count:'',notes:''});
  };

  const totalDead = events.reduce((s,e)=>s+e.count,0);
  const survivalRate = totalSeeds>0?((1-totalDead/totalSeeds)*100).toFixed(1):'100.0';
  const causeSummary = events.reduce((acc,e)=>{acc[e.causeCode]=(acc[e.causeCode]||0)+e.count;return acc;},{} as Record<string,number>);
  const topCause = Object.entries(causeSummary).sort((a,b)=>b[1]-a[1])[0];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600"/></button>
        <div className="flex-1"><h1 className="text-2xl font-black text-gray-900 tracking-tight">Mortality & Diagnostics</h1><p className="text-xs text-gray-500 font-mono-sci mt-0.5">KAPLAN-MEIER SURVIVAL PROTOCOL</p></div>
        <button onClick={()=>setShowForm(true)} className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-2.5 rounded-xl shadow-lg shadow-red-500/30 hover:scale-105 transition-transform"><Plus className="w-5 h-5"/></button>
      </div>

      <div className="bento-card p-4 bg-white/90 border border-gray-200">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Initial Population (N₀)</label>
        <input type="number" value={totalSeeds} onChange={e=>updateTotal(parseInt(e.target.value)||0)} className="w-full mt-1 p-2.5 rounded-lg border border-gray-200 font-mono-sci text-sm outline-none"/>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bento-card p-4 border-l-4 border-l-green-500 bg-white/90">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">Survival</span>
          <div className="font-mono-sci text-2xl font-bold text-green-700 mt-1">{survivalRate}%</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">(N₀−ΣD)/N₀</div>
        </div>
        <div className="bento-card p-4 border-l-4 border-l-red-500 bg-white/90">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">Total Dead</span>
          <div className="font-mono-sci text-2xl font-bold text-red-700 mt-1">{totalDead}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">ΣD events</div>
        </div>
        <div className="bento-card p-4 border-l-4 border-l-amber-500 bg-white/90">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">Top Cause</span>
          <div className="font-mono-sci text-xs font-bold text-amber-700 mt-1 leading-tight">{topCause?topCause[0].split('(')[0]:'—'}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">{topCause?`n=${topCause[1]}`:''}</div>
        </div>
      </div>

      {/* Cause breakdown */}
      {Object.keys(causeSummary).length>0 && (
        <div className="bento-card p-4 bg-white/90 border border-gray-200">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2"><TrendingDown className="w-3.5 h-3.5"/> Cause Distribution</h3>
          <div className="space-y-2">
            {Object.entries(causeSummary).sort((a,b)=>b[1]-a[1]).map(([cause,count])=>{
              const pct = totalDead>0?((count/totalDead)*100).toFixed(0):'0';
              return (<div key={cause} className="flex items-center gap-3">
                <span className="font-mono-sci text-[10px] text-gray-600 w-36 truncate">{cause}</span>
                <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden"><div className="bg-gradient-to-r from-red-400 to-rose-500 h-full rounded-full" style={{width:`${pct}%`}}/></div>
                <span className="font-mono-sci text-[10px] font-bold text-gray-600 w-12 text-right">{pct}%</span>
              </div>);
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5"><h2 className="font-black text-lg">Mortality Event</h2><button onClick={()=>setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Event Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sowing Date</label><input type="date" value={form.sowingDate} onChange={e=>setForm({...form,sowingDate:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Batch ID</label><input type="text" value={form.batchId} onChange={e=>setForm({...form,batchId:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dead Count</label><input type="number" placeholder="0" value={form.count} onChange={e=>setForm({...form,count:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-2xl font-bold text-center outline-none"/></div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Diagnostic Cause Code</label>
                <select value={form.causeCode} onChange={e=>setForm({...form,causeCode:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none">{CAUSE_CODES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Observations..." className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none h-16 resize-none"/></div>
              <button onClick={save} className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Record Event</button>
            </div>
          </div>
        </div>
      )}

      {events.length===0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Skull className="w-10 h-10 text-gray-300 mx-auto mb-3"/><p className="font-bold text-sm text-gray-500">No mortality events recorded.</p></div>
      ) : (
        <div className="space-y-3">{events.map(e=>(
          <div key={e.id} className="bento-card p-4 bg-white/90 border border-gray-200">
            <div className="flex justify-between items-center mb-2"><span className="font-mono-sci text-[10px] font-bold text-red-600">{e.id}</span><span className="font-mono-sci text-[10px] text-gray-400">{e.date}</span></div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono-sci text-2xl font-bold text-red-700">-{e.count}</span>
              <div className="flex-1"><p className="text-xs font-bold text-gray-800">{e.causeCode}</p><p className="text-[9px] text-gray-500 font-mono-sci">DTD: {e.daysToDeath}d from sowing</p></div>
            </div>
            {e.notes&&<p className="text-xs text-gray-500 mt-1">{e.notes}</p>}
            <div className="text-[8px] text-gray-400 font-mono-sci mt-2 border-t border-gray-100 pt-2">{e.createdBy} · {e.createdAt}</div>
          </div>
        ))}</div>
      )}
    </div>
  );
};
export default MortalityPage;
