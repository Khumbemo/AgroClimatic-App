import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, FlaskConical, Shuffle, EyeOff } from 'lucide-react';

type DesignType = 'CRD' | 'RCBD' | 'Latin_Square' | 'Split_Plot';
interface Experiment {
  id: string; name: string; designType: DesignType; blocks: number; replicates: number;
  treatments: string[]; assignments: { block: number; position: number; treatment: string; code: string }[];
  blindMode: boolean; createdAt: string; createdBy: string;
}
const designLabels: Record<DesignType, string> = { CRD:'Completely Randomized Design', RCBD:'Randomized Complete Block Design', Latin_Square:'Latin Square', Split_Plot:'Split-Plot Design' };

const ExperimentalDesignPage = () => {
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', designType:'RCBD' as DesignType, blocks:'3', replicates:'4', treatmentInput:'', treatments:[] as string[], blindMode:false });

  useEffect(() => { const s = localStorage.getItem('ac_experiments'); if(s) setExperiments(JSON.parse(s)); }, []);

  const addTreatment = () => { if(!form.treatmentInput.trim()) return; setForm({...form, treatments:[...form.treatments, form.treatmentInput.trim()], treatmentInput:''}); };
  const removeTreatment = (i:number) => setForm({...form, treatments:form.treatments.filter((_,j)=>j!==i)});

  const shuffle = <T,>(a:T[]):T[] => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; };

  const saveExperiment = () => {
    if(!form.name || form.treatments.length<2) return;
    const blocks = parseInt(form.blocks)||3;
    const assignments: Experiment['assignments'] = [];
    for(let b=0;b<blocks;b++){
      const sh = shuffle(form.treatments.map((t,i)=>({treatment:t, code:`TRT-${String.fromCharCode(65+i)}`})));
      sh.forEach((s,pos)=> assignments.push({block:b+1, position:pos+1, treatment:s.treatment, code:s.code}));
    }
    const exp:Experiment = { id:`EXP-${Date.now()}`, name:form.name, designType:form.designType, blocks, replicates:parseInt(form.replicates)||4, treatments:form.treatments, assignments, blindMode:form.blindMode, createdAt:new Date().toISOString(), createdBy:'Nursery Manager' };
    const updated = [exp,...experiments]; setExperiments(updated); localStorage.setItem('ac_experiments', JSON.stringify(updated));
    setShowForm(false); setForm({name:'',designType:'RCBD',blocks:'3',replicates:'4',treatmentInput:'',treatments:[],blindMode:false});
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600"/></button>
        <div className="flex-1"><h1 className="text-2xl font-black text-gray-900 tracking-tight">Experimental Design</h1></div>
        <button onClick={()=>setShowForm(true)} className="bg-gradient-to-r from-violet-500 to-purple-600 text-white p-2.5 rounded-xl shadow-lg shadow-violet-500/30 hover:scale-105 transition-transform"><Plus className="w-5 h-5"/></button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5"><h2 className="font-black text-lg">New Experiment</h2><button onClick={()=>setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button></div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Experiment Name</label><input type="text" placeholder="Fertilizer Response Trial" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-violet-400 outline-none"/></div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Statistical Design</label>
                <select value={form.designType} onChange={e=>setForm({...form,designType:e.target.value as DesignType})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-violet-400 outline-none">{Object.entries(designLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Blocks</label><input type="number" value={form.blocks} onChange={e=>setForm({...form,blocks:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-violet-400 outline-none"/></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Reps / Block</label><input type="number" value={form.replicates} onChange={e=>setForm({...form,replicates:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-violet-400 outline-none"/></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Treatments</label>
                <div className="flex gap-2 mt-1"><input type="text" placeholder="e.g. NPK 20-20-20" value={form.treatmentInput} onChange={e=>setForm({...form,treatmentInput:e.target.value})} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addTreatment();}}} className="flex-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-violet-400 outline-none"/><button onClick={addTreatment} className="px-4 bg-violet-100 text-violet-700 rounded-xl font-black text-xs">Add</button></div>
                <div className="flex flex-wrap gap-2 mt-2">{form.treatments.map((t,i)=>(<span key={i} className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-[10px] font-bold border border-violet-200">TRT-{String.fromCharCode(65+i)}: {t}<button onClick={()=>removeTreatment(i)}><X className="w-3 h-3"/></button></span>))}</div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <EyeOff className="w-5 h-5 text-gray-400"/><div className="flex-1"><p className="text-sm font-bold">Blind Testing Mode</p><p className="text-[10px] text-gray-500">Hide treatment names from collectors</p></div>
                <button onClick={()=>setForm({...form,blindMode:!form.blindMode})} className={`w-12 h-6 rounded-full transition-colors ${form.blindMode?'bg-violet-500':'bg-gray-300'} relative`}><div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.blindMode?'translate-x-6':'translate-x-0.5'}`}/></button>
              </div>
              <button onClick={saveExperiment} className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Create & Randomize</button>
            </div>
          </div>
        </div>
      )}

      {experiments.length===0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><FlaskConical className="w-10 h-10 text-gray-300 mx-auto mb-3"/><p className="font-bold text-sm text-gray-500">No experiments configured.</p></div>
      ) : experiments.map(exp=>(
        <div key={exp.id} className="bento-card p-4 bg-white/90 border border-gray-200 space-y-4">
          <div><span className="font-mono-sci text-[10px] font-bold text-violet-600">{exp.id}</span><h3 className="font-black text-lg text-gray-900 mt-1">{exp.name}</h3>
            <div className="flex gap-2 mt-1"><span className="text-[9px] bg-violet-50 text-violet-600 font-mono-sci font-bold px-2 py-0.5 rounded border border-violet-100">{designLabels[exp.designType]}</span>{exp.blindMode && <span className="text-[9px] bg-amber-50 text-amber-600 font-mono-sci font-bold px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1"><EyeOff className="w-3 h-3"/> BLIND</span>}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-lg font-bold">{exp.blocks}</div><div className="text-[8px] text-gray-400 uppercase">Blocks</div></div>
            <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-lg font-bold">{exp.treatments.length}</div><div className="text-[8px] text-gray-400 uppercase">Treatments</div></div>
            <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-lg font-bold">{exp.replicates}</div><div className="text-[8px] text-gray-400 uppercase">Reps</div></div>
          </div>
          <div><h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-1"><Shuffle className="w-3 h-3"/> Randomized Assignment</h4>
            <table className="w-full text-[10px] font-mono-sci"><thead><tr className="border-b border-gray-200"><th className="py-1 px-2 text-left text-gray-400">Block</th><th className="py-1 px-2 text-left text-gray-400">Pos</th><th className="py-1 px-2 text-left text-gray-400">Code</th>{!exp.blindMode&&<th className="py-1 px-2 text-left text-gray-400">Treatment</th>}</tr></thead>
              <tbody>{exp.assignments.map((a,i)=>(<tr key={i} className="border-b border-gray-50 hover:bg-gray-50"><td className="py-1.5 px-2 font-bold">{a.block}</td><td className="py-1.5 px-2">{a.position}</td><td className="py-1.5 px-2 text-violet-600 font-bold">{a.code}</td>{!exp.blindMode&&<td className="py-1.5 px-2 text-gray-600">{a.treatment}</td>}</tr>))}</tbody></table>
          </div>
          <div className="text-[8px] text-gray-400 font-mono-sci border-t border-gray-100 pt-2">{exp.createdBy} · {exp.createdAt}</div>
        </div>
      ))}
    </div>
  );
};
export default ExperimentalDesignPage;
