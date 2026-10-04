import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Skull, TrendingDown } from 'lucide-react';

const CAUSE_CODES = ['Damping-off (Pythium)','Desiccation','Chlorosis','Mechanical Damage','Failed to Emerge','Herbivory','Root Rot (Fusarium)','Nutrient Toxicity','Unknown'] as const;

import { useBatchIndex, useCollection, useData, byDateDesc } from '../../data/hooks';
import { saveErrorMessage } from '../../data/errors';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';

const MortalityPage = () => {
  const navigate = useNavigate();
  const { repo } = useData();
  const { batches } = useBatchIndex();
  const { items: allEvents } = useCollection('mortalityEvents');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosenBatchId, setChosenBatchId] = useState<string | null>(null);
  const [seedsInput, setSeedsInput] = useState('');
  const [form, setForm] = useState({date:new Date().toISOString().split('T')[0],sowingDate:'',count:'',causeCode:CAUSE_CODES[0] as string,notes:''});

  const latestEventBatch = [...allEvents].sort(byDateDesc)[0]?.batchId ?? null;
  const batchId = chosenBatchId ?? latestEventBatch ?? batches[0]?.id ?? null;
  const batch = batchId ? batches.find(b => b.id === batchId) : undefined;
  const events = allEvents.filter(e => e.batchId === batchId).sort(byDateDesc);
  const totalSeeds = batch?.seedsSown ?? 0;

  const saveSeedsSown = async () => {
    if (!batch) return;
    try { await repo.update('batches', batch.id, { seedsSown: Number(seedsInput) }); setSeedsInput(''); setError(null); }
    catch (e) { setError(saveErrorMessage(e)); }
  };

  const save = async () => {
    if (!batch) { setError('Select a batch first.'); return; }
    if (!form.count) { setError('Enter the number of dead seedlings.'); return; }
    // The batch's sowing date is the reference; the form field is only asked for when the batch lacks one.
    const sowingDate = batch.sowingDate ?? (form.sowingDate || null);
    if (!sowingDate) { setError('Enter the sowing date so days to death can be calculated.'); return; }
    const dtd = Math.max(1,Math.ceil((new Date(form.date).getTime()-new Date(sowingDate).getTime())/86400000));
    try {
      if (!batch.sowingDate) await repo.update('batches', batch.id, { sowingDate });
      await repo.add('mortalityEvents', { batchId: batch.id, date: form.date, sowingDate, count: parseInt(form.count), causeCode: form.causeCode, daysToDeath: dtd, notes: form.notes });
    } catch (e) { setError(saveErrorMessage(e)); return; }
    setError(null);
    setShowForm(false);setForm({...form,count:'',notes:''});
  };

  const totalDead = events.reduce((s,e)=>s+e.count,0);
  const survivalRate = totalSeeds>0?((1-totalDead/totalSeeds)*100).toFixed(1):'—';
  const causeSummary = events.reduce((acc,e)=>{acc[e.causeCode]=(acc[e.causeCode]||0)+e.count;return acc;},{} as Record<string,number>);
  const topCause = Object.entries(causeSummary).sort((a,b)=>b[1]-a[1])[0];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600"/></button>
        <div className="flex-1"><h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Mortality & Diagnostics</h1></div>
        <button onClick={()=>setShowForm(true)} className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl shadow-sm  hover:scale-105 transition-transform"><Plus className="w-5 h-5"/></button>
      </div>

      <div className="bento-card p-4 space-y-3">
        <div>
          <label htmlFor="mort-batch" className="sci-label">Batch</label>
          <BatchSelect id="mort-batch" value={batchId} onChange={setChosenBatchId} />
        </div>
        {batch && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="sci-label">Initial population (N₀)</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{batch.seedsSown ?? '—'}</dd></div>
            <div><dt className="sci-label">Sowing date</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{batch.sowingDate ?? '—'}</dd></div>
          </dl>
        )}
        {batch && batch.seedsSown == null && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label htmlFor="mort-seeds" className="sci-label">Enter seeds sown for this batch</label>
              <input id="mort-seeds" type="number" min="1" value={seedsInput} onChange={e => setSeedsInput(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg border border-gray-200 font-mono-sci text-sm outline-none focus:border-green-600" />
            </div>
            <button onClick={saveSeedsSown} disabled={!seedsInput} className="px-4 py-2.5 rounded-lg bg-green-700 text-white text-sm font-medium disabled:opacity-50">Save</button>
          </div>
        )}
        {!showForm && <FormError message={error} />}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bento-card p-4">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">Survival</span>
          <div className="font-mono-sci text-2xl font-bold text-green-700 mt-1">{survivalRate === '—' ? survivalRate : `${survivalRate}%`}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">(N₀−ΣD)/N₀</div>
        </div>
        <div className="bento-card p-4">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">Total Dead</span>
          <div className="font-mono-sci text-2xl font-bold text-red-700 mt-1">{totalDead}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">ΣD events</div>
        </div>
        <div className="bento-card p-4">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">Top Cause</span>
          <div className="font-mono-sci text-xs font-bold text-amber-700 mt-1 leading-tight">{topCause?topCause[0].split('(')[0]:'—'}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">{topCause?`n=${topCause[1]}`:''}</div>
        </div>
      </div>

      {/* Cause breakdown */}
      {Object.keys(causeSummary).length>0 && (
        <div className="bento-card p-4 border border-gray-200">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2"><TrendingDown className="w-3.5 h-3.5"/> Cause Distribution</h3>
          <div className="space-y-2">
            {Object.entries(causeSummary).sort((a,b)=>b[1]-a[1]).map(([cause,count])=>{
              const pct = totalDead>0?((count/totalDead)*100).toFixed(0):'0';
              return (<div key={cause} className="flex items-center gap-3">
                <span className="font-mono-sci text-[10px] text-gray-600 w-36 truncate">{cause}</span>
                <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden"><div className="bg-red-500 h-full rounded-full" style={{width:`${pct}%`}}/></div>
                <span className="font-mono-sci text-[10px] font-bold text-gray-600 w-12 text-right">{pct}%</span>
              </div>);
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-sm">
            <div className="flex justify-between items-center mb-5"><h2 className="font-semibold text-lg">Mortality Event</h2><button onClick={()=>{setShowForm(false);setError(null);}} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Event Date</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                {!batch?.sowingDate && <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Sowing Date</label><input type="date" value={form.sowingDate} onChange={e=>setForm({...form,sowingDate:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>}
              </div>
              <div><span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Batch</span><p className="mt-1 text-sm text-gray-900">{batch ? batch.batchNumber : 'No batch selected'}</p></div>
              <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Dead Count</label><input type="number" placeholder="0" value={form.count} onChange={e=>setForm({...form,count:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-2xl font-bold text-center outline-none"/></div>
              <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Diagnostic Cause Code</label>
                <select value={form.causeCode} onChange={e=>setForm({...form,causeCode:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none">{CAUSE_CODES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Observations..." className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none h-16 resize-none"/></div>
              <FormError message={error} />
              <button onClick={save} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm uppercase tracking-widest shadow-sm">Record Event</button>
            </div>
          </div>
        </div>
      )}

      {events.length===0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Skull className="w-10 h-10 text-gray-300 mx-auto mb-3"/><p className="font-bold text-sm text-gray-500">No mortality events recorded.</p></div>
      ) : (
        <div className="space-y-3">{events.map(e=>(
          <div key={e.id} className="bento-card p-4 border border-gray-200">
            <div className="flex justify-between items-center mb-2"><span className="text-xs font-medium text-gray-700">{batch?.batchNumber}</span><span className="font-mono-sci text-[10px] text-gray-400">{e.date}</span></div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono-sci text-2xl font-bold text-red-700">-{e.count}</span>
              <div className="flex-1"><p className="text-xs font-bold text-gray-800">{e.causeCode}</p><p className="text-[9px] text-gray-500 font-mono-sci">DTD: {e.daysToDeath ?? '—'} d from sowing</p></div>
            </div>
            {e.notes&&<p className="text-xs text-gray-500 mt-1">{e.notes}</p>}
          </div>
        ))}</div>
      )}
    </div>
  );
};
export default MortalityPage;
