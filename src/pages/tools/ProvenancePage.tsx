import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, MapPin, Dna, TreePine } from 'lucide-react';

interface ProvenanceRecord {
  id:string; batchId:string; collectorName:string; collectionDate:string;
  lat:string; lng:string; elevation:string; aspect:string; climateZone:string; canopyPosition:string;
  motherTreeCount:number; genotypeMarkers:string; phenotypeTraits:string; notes:string;
  createdAt:string; createdBy:string;
}

const ProvenancePage = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<ProvenanceRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({batchId:'',collectorName:'',collectionDate:new Date().toISOString().split('T')[0],lat:'',lng:'',elevation:'',aspect:'',climateZone:'',canopyPosition:'',motherTreeCount:'1',genotypeMarkers:'',phenotypeTraits:'',notes:''});

  useEffect(()=>{const s=localStorage.getItem('ac_provenance');if(s)setRecords(JSON.parse(s));},[]);

  const save = () => {
    if(!form.lat||!form.lng) return;
    const r:ProvenanceRecord = {id:`PRV-${Date.now()}`,batchId:form.batchId,collectorName:form.collectorName,collectionDate:form.collectionDate,lat:form.lat,lng:form.lng,elevation:form.elevation,aspect:form.aspect,climateZone:form.climateZone,canopyPosition:form.canopyPosition,motherTreeCount:parseInt(form.motherTreeCount)||1,genotypeMarkers:form.genotypeMarkers,phenotypeTraits:form.phenotypeTraits,notes:form.notes,createdAt:new Date().toISOString(),createdBy:'Nursery Manager'};
    const u=[r,...records];setRecords(u);localStorage.setItem('ac_provenance',JSON.stringify(u));
    setShowForm(false);setForm({batchId:'',collectorName:'',collectionDate:new Date().toISOString().split('T')[0],lat:'',lng:'',elevation:'',aspect:'',climateZone:'',canopyPosition:'',motherTreeCount:'1',genotypeMarkers:'',phenotypeTraits:'',notes:''});
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600"/></button>
        <div className="flex-1"><h1 className="text-2xl font-black text-gray-900 tracking-tight">Provenance & Lineage</h1><p className="text-xs text-gray-500 font-mono-sci mt-0.5">SEED SOURCE & GENETIC TRACKING</p></div>
        <button onClick={()=>setShowForm(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-2.5 rounded-xl shadow-lg shadow-amber-500/30 hover:scale-105 transition-transform"><Plus className="w-5 h-5"/></button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5"><h2 className="font-black text-lg">New Provenance Record</h2><button onClick={()=>setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Batch ID</label><input type="text" placeholder="BATCH-001" value={form.batchId} onChange={e=>setForm({...form,batchId:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Collection Date</label><input type="date" value={form.collectionDate} onChange={e=>setForm({...form,collectionDate:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Collector Name</label><input type="text" placeholder="Dr. J. Smith" value={form.collectorName} onChange={e=>setForm({...form,collectorName:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
              <div className="p-3 bg-green-50 rounded-xl border border-green-100"><p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-3">GPS & Site Data</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Latitude</label><input type="text" placeholder="-25.7461" value={form.lat} onChange={e=>setForm({...form,lat:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Longitude</label><input type="text" placeholder="28.1881" value={form.lng} onChange={e=>setForm({...form,lng:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Elevation (m)</label><input type="text" placeholder="1450" value={form.elevation} onChange={e=>setForm({...form,elevation:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Aspect</label><input type="text" placeholder="NW-facing" value={form.aspect} onChange={e=>setForm({...form,aspect:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Climate Zone</label><input type="text" placeholder="Cfb (Köppen)" value={form.climateZone} onChange={e=>setForm({...form,climateZone:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Canopy Position</label><input type="text" placeholder="Co-dominant" value={form.canopyPosition} onChange={e=>setForm({...form,canopyPosition:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                </div>
              </div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Mother Trees Sampled (#)</label><input type="number" value={form.motherTreeCount} onChange={e=>setForm({...form,motherTreeCount:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100"><p className="text-[9px] font-black text-purple-600 uppercase tracking-widest mb-3">Genetic & Phenotypic Tags</p>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Genotype Markers</label><input type="text" placeholder="SSR-12, cpDNA haplotype B" value={form.genotypeMarkers} onChange={e=>setForm({...form,genotypeMarkers:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                <div className="mt-3"><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Phenotype Traits</label><input type="text" placeholder="Drought-tolerant, red bark" value={form.phenotypeTraits} onChange={e=>setForm({...form,phenotypeTraits:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Notes</label><textarea placeholder="Additional observations..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none h-16 resize-none"/></div>
              <button onClick={save} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Record Provenance</button>
            </div>
          </div>
        </div>
      )}

      {records.length===0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3"/><p className="font-bold text-sm text-gray-500">No provenance records.</p><p className="text-xs text-gray-400 mt-1 font-mono-sci">TAP + TO LOG SEED SOURCE</p></div>
      ) : records.map(r=>(
        <div key={r.id} className="bento-card p-4 bg-white/90 border border-gray-200 space-y-3">
          <div className="flex justify-between items-center"><span className="font-mono-sci text-[10px] font-bold text-amber-600">{r.id}</span><span className="font-mono-sci text-[10px] text-gray-400">{r.collectionDate}</span></div>
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-green-600"/><span className="font-mono-sci text-sm font-bold text-gray-800">{r.lat}, {r.lng}</span><span className="text-[9px] bg-green-50 text-green-600 px-2 py-0.5 rounded font-bold">{r.elevation}m</span></div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{r.climateZone||'—'}</div><div className="text-[8px] text-gray-400">Climate</div></div>
            <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{r.aspect||'—'}</div><div className="text-[8px] text-gray-400">Aspect</div></div>
            <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{r.motherTreeCount}</div><div className="text-[8px] text-gray-400">Trees</div></div>
          </div>
          {(r.genotypeMarkers||r.phenotypeTraits) && <div className="flex flex-wrap gap-2">
            {r.genotypeMarkers && <span className="text-[9px] bg-purple-50 text-purple-600 font-mono-sci font-bold px-2 py-0.5 rounded border border-purple-100 flex items-center gap-1"><Dna className="w-3 h-3"/>{r.genotypeMarkers}</span>}
            {r.phenotypeTraits && <span className="text-[9px] bg-emerald-50 text-emerald-600 font-mono-sci font-bold px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1"><TreePine className="w-3 h-3"/>{r.phenotypeTraits}</span>}
          </div>}
          <div className="text-[8px] text-gray-400 font-mono-sci border-t border-gray-100 pt-2">{r.collectorName} · {r.createdAt}</div>
        </div>
      ))}
    </div>
  );
};
export default ProvenancePage;
