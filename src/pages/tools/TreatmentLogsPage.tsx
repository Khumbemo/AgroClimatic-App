import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Beaker, Bug, X, FlaskConical, Shield } from 'lucide-react';
import type { FertLog, PestLog } from '../../types';

type TabType = 'fertilizer' | 'pest' | 'presowing';

interface PreSowingLog {
  id: string;
  date: string;
  batchId: string;
  treatmentType: 'stratification_cold' | 'stratification_warm' | 'scarification_mechanical' | 'scarification_chemical' | 'soaking' | 'hormonal' | 'other';
  duration: string;
  concentration: string;
  notes: string;
}

const TreatmentLogsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('fertilizer');
  const [fertLogs, setFertLogs] = useState<FertLog[]>([]);
  const [pestLogs, setPestLogs] = useState<PestLog[]>([]);
  const [preSowLogs, setPreSowLogs] = useState<PreSowingLog[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [fertForm, setFertForm] = useState({ date: new Date().toISOString().split('T')[0], batchId: '', npkRatio: '', dosage: '', ph: '', ec: '' });
  const [pestForm, setPestForm] = useState({ date: new Date().toISOString().split('T')[0], batchId: '', pestDiseaseName: '', incidencePercentage: '', severityScale: '1', treatmentChemical: '' });
  const [preSowForm, setPreSowForm] = useState({ date: new Date().toISOString().split('T')[0], batchId: '', treatmentType: 'soaking' as PreSowingLog['treatmentType'], duration: '', concentration: '', notes: '' });

  useEffect(() => {
    const f = localStorage.getItem('ac_fert_logs'); if (f) setFertLogs(JSON.parse(f));
    const p = localStorage.getItem('ac_pest_logs'); if (p) setPestLogs(JSON.parse(p));
    const s = localStorage.getItem('ac_presow_logs'); if (s) setPreSowLogs(JSON.parse(s));
  }, []);

  const saveFert = () => {
    if (!fertForm.npkRatio || !fertForm.dosage) return;
    const newLog: FertLog = { id: `FL-${Date.now()}`, date: fertForm.date, batchId: fertForm.batchId || undefined, npkRatio: fertForm.npkRatio, dosage: parseFloat(fertForm.dosage), ph: fertForm.ph ? parseFloat(fertForm.ph) : undefined, ec: fertForm.ec ? parseFloat(fertForm.ec) : undefined };
    const updated = [newLog, ...fertLogs];
    setFertLogs(updated); localStorage.setItem('ac_fert_logs', JSON.stringify(updated));
    setShowForm(false); setFertForm({ date: new Date().toISOString().split('T')[0], batchId: '', npkRatio: '', dosage: '', ph: '', ec: '' });
  };

  const savePest = () => {
    if (!pestForm.pestDiseaseName) return;
    const newLog: PestLog = { id: `PL-${Date.now()}`, date: pestForm.date, batchId: pestForm.batchId, pestDiseaseName: pestForm.pestDiseaseName, incidencePercentage: parseFloat(pestForm.incidencePercentage) || 0, severityScale: parseInt(pestForm.severityScale) as PestLog['severityScale'], treatmentChemical: pestForm.treatmentChemical || undefined };
    const updated = [newLog, ...pestLogs];
    setPestLogs(updated); localStorage.setItem('ac_pest_logs', JSON.stringify(updated));
    setShowForm(false); setPestForm({ date: new Date().toISOString().split('T')[0], batchId: '', pestDiseaseName: '', incidencePercentage: '', severityScale: '1', treatmentChemical: '' });
  };

  const savePreSow = () => {
    if (!preSowForm.treatmentType) return;
    const newLog: PreSowingLog = { id: `PS-${Date.now()}`, ...preSowForm };
    const updated = [newLog, ...preSowLogs];
    setPreSowLogs(updated); localStorage.setItem('ac_presow_logs', JSON.stringify(updated));
    setShowForm(false); setPreSowForm({ date: new Date().toISOString().split('T')[0], batchId: '', treatmentType: 'soaking', duration: '', concentration: '', notes: '' });
  };

  const treatmentTypeLabels: Record<PreSowingLog['treatmentType'], string> = {
    stratification_cold: 'Cold Stratification', stratification_warm: 'Warm Stratification',
    scarification_mechanical: 'Mechanical Scarification', scarification_chemical: 'Chemical Scarification',
    soaking: 'Soaking / Imbibition', hormonal: 'Hormonal (GA₃)', other: 'Other',
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'fertilizer', label: 'Fertigation', icon: <FlaskConical className="w-3.5 h-3.5" /> },
    { key: 'pest', label: 'Pathology', icon: <Bug className="w-3.5 h-3.5" /> },
    { key: 'presowing', label: 'Pre-Sowing', icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Treatment Logs</h1>
          
        </div>
        <button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-cyan-500/30 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Form Modals */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black text-lg text-gray-900">{tab === 'fertilizer' ? 'Fertigation Entry' : tab === 'pest' ? 'Pathology Report' : 'Pre-Sowing Treatment'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {tab === 'fertilizer' && (
              <div className="space-y-4">
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</label><input type="date" value={fertForm.date} onChange={e => setFertForm({...fertForm, date: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">NPK Ratio</label><input type="text" placeholder="20-20-20" value={fertForm.npkRatio} onChange={e => setFertForm({...fertForm, npkRatio: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dose (mg/L)</label><input type="number" step="0.1" value={fertForm.dosage} onChange={e => setFertForm({...fertForm, dosage: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">pH</label><input type="number" step="0.1" value={fertForm.ph} onChange={e => setFertForm({...fertForm, ph: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">EC (mS/cm)</label><input type="number" step="0.01" value={fertForm.ec} onChange={e => setFertForm({...fertForm, ec: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                </div>
                <button onClick={saveFert} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Record Entry</button>
              </div>
            )}

            {tab === 'pest' && (
              <div className="space-y-4">
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</label><input type="date" value={pestForm.date} onChange={e => setPestForm({...pestForm, date: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Batch ID</label><input type="text" placeholder="BATCH-001" value={pestForm.batchId} onChange={e => setPestForm({...pestForm, batchId: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pest / Disease Name</label><input type="text" placeholder="Pythium spp. (Damping-off)" value={pestForm.pestDiseaseName} onChange={e => setPestForm({...pestForm, pestDiseaseName: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Incidence (%)</label><input type="number" step="0.1" value={pestForm.incidencePercentage} onChange={e => setPestForm({...pestForm, incidencePercentage: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Severity (1–5)</label>
                    <select value={pestForm.severityScale} onChange={e => setPestForm({...pestForm, severityScale: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none">
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Trace','Minor','Moderate','Severe','Critical'][n-1]}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Treatment Applied</label><input type="text" placeholder="Metalaxyl 35% WP @ 2g/L" value={pestForm.treatmentChemical} onChange={e => setPestForm({...pestForm, treatmentChemical: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                <button onClick={savePest} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Record Report</button>
              </div>
            )}

            {tab === 'presowing' && (
              <div className="space-y-4">
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</label><input type="date" value={preSowForm.date} onChange={e => setPreSowForm({...preSowForm, date: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Batch ID</label><input type="text" placeholder="BATCH-001" value={preSowForm.batchId} onChange={e => setPreSowForm({...preSowForm, batchId: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Treatment Type</label>
                  <select value={preSowForm.treatmentType} onChange={e => setPreSowForm({...preSowForm, treatmentType: e.target.value as PreSowingLog['treatmentType']})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none">
                    {Object.entries(treatmentTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Duration</label><input type="text" placeholder="48h / 6 weeks" value={preSowForm.duration} onChange={e => setPreSowForm({...preSowForm, duration: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Concentration</label><input type="text" placeholder="250 ppm GA₃" value={preSowForm.concentration} onChange={e => setPreSowForm({...preSowForm, concentration: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none" /></div>
                </div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Notes</label><textarea placeholder="Observations..." value={preSowForm.notes} onChange={e => setPreSowForm({...preSowForm, notes: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-cyan-400 outline-none h-20 resize-none" /></div>
                <button onClick={savePreSow} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Record Treatment</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entries List */}
      {tab === 'fertilizer' && (fertLogs.length === 0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Beaker className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="font-bold text-sm text-gray-500">No fertigation records.</p></div>
      ) : fertLogs.map(l => (
        <div key={l.id} className="bento-card p-4 bg-white/90 border border-gray-200">
          <div className="flex justify-between items-center mb-2"><span className="font-mono-sci text-[10px] font-bold text-cyan-600">{l.id}</span><span className="font-mono-sci text-[10px] text-gray-400">{l.date}</span></div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.npkRatio}</div><div className="text-[8px] text-gray-400">NPK</div></div>
            <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.dosage}</div><div className="text-[8px] text-gray-400">mg/L</div></div>
            <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.ec || '—'}</div><div className="text-[8px] text-gray-400">EC mS/cm</div></div>
          </div>
        </div>
      )))}

      {tab === 'pest' && (pestLogs.length === 0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Bug className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="font-bold text-sm text-gray-500">No pathology reports.</p></div>
      ) : pestLogs.map(l => (
        <div key={l.id} className="bento-card p-4 bg-white/90 border border-gray-200">
          <div className="flex justify-between items-center mb-2"><span className="font-mono-sci text-[10px] font-bold text-red-600">{l.id}</span><span className="font-mono-sci text-[10px] text-gray-400">{l.date}</span></div>
          <p className="font-bold text-sm text-gray-800 italic">{l.pestDiseaseName}</p>
          <div className="flex gap-3 mt-2">
            <span className="text-[10px] bg-red-50 text-red-600 font-mono-sci font-bold px-2 py-0.5 rounded">INC: {l.incidencePercentage}%</span>
            <span className="text-[10px] bg-orange-50 text-orange-600 font-mono-sci font-bold px-2 py-0.5 rounded">SEV: {l.severityScale}/5</span>
          </div>
          {l.treatmentChemical && <p className="text-[10px] text-gray-500 mt-2 font-mono-sci">Rx: {l.treatmentChemical}</p>}
        </div>
      )))}

      {tab === 'presowing' && (preSowLogs.length === 0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="font-bold text-sm text-gray-500">No pre-sowing treatments.</p></div>
      ) : preSowLogs.map(l => (
        <div key={l.id} className="bento-card p-4 bg-white/90 border border-gray-200">
          <div className="flex justify-between items-center mb-2"><span className="font-mono-sci text-[10px] font-bold text-indigo-600">{l.id}</span><span className="font-mono-sci text-[10px] text-gray-400">{l.date}</span></div>
          <p className="font-bold text-sm text-gray-800">{treatmentTypeLabels[l.treatmentType]}</p>
          <div className="flex gap-3 mt-2">
            {l.duration && <span className="text-[10px] bg-indigo-50 text-indigo-600 font-mono-sci font-bold px-2 py-0.5 rounded">{l.duration}</span>}
            {l.concentration && <span className="text-[10px] bg-purple-50 text-purple-600 font-mono-sci font-bold px-2 py-0.5 rounded">{l.concentration}</span>}
          </div>
          {l.notes && <p className="text-xs text-gray-500 mt-2">{l.notes}</p>}
        </div>
      )))}
    </div>
  );
};

export default TreatmentLogsPage;
