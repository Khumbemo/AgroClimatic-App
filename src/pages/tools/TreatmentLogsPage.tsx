import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Beaker, Bug, X, FlaskConical, Shield } from 'lucide-react';
import { useBatchIndex, useCollection, useData, byDateDesc } from '../../data/hooks';
import { saveErrorMessage } from '../../data/errors';
import type { NewEntity, PreSowingTreatment } from '../../data/schema';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';

type TabType = 'fertilizer' | 'pest' | 'presowing';

type PreSowingLog = PreSowingTreatment;

const TreatmentLogsPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('fertilizer');
  const { repo } = useData();
  const { label } = useBatchIndex();
  const fertLogs = [...useCollection('fertigationEvents').items].sort(byDateDesc);
  const pestLogs = [...useCollection('pestObservations').items].sort(byDateDesc);
  const preSowLogs = [...useCollection('preSowingTreatments').items].sort(byDateDesc);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [fertForm, setFertForm] = useState({ date: new Date().toISOString().split('T')[0], batchId: '', npkRatio: '', dosage: '', ph: '', ec: '' });
  const [pestForm, setPestForm] = useState({ date: new Date().toISOString().split('T')[0], batchId: '', pestDiseaseName: '', incidencePercentage: '', severityScale: '1', treatmentChemical: '' });
  const [preSowForm, setPreSowForm] = useState({ date: new Date().toISOString().split('T')[0], batchId: '', treatmentType: 'soaking' as PreSowingLog['treatmentType'], duration: '', concentration: '', notes: '' });


  const today = () => new Date().toISOString().split('T')[0];
  const optional = (v: string) => (v === '' ? undefined : parseFloat(v));

  const save = async <C extends 'fertigationEvents' | 'pestObservations' | 'preSowingTreatments'>(col: C, data: NewEntity<C>, reset: () => void) => {
    try {
      await repo.add(col, data);
    } catch (e) {
      setError(saveErrorMessage(e));
      return;
    }
    setError(null);
    setShowForm(false);
    reset();
  };

  const saveFert = () => {
    if (!fertForm.npkRatio || !fertForm.dosage) { setError('Enter the N-P-K ratio and dose.'); return; }
    save('fertigationEvents', {
      date: fertForm.date, batchId: fertForm.batchId || null, npkRatio: fertForm.npkRatio, dosage: parseFloat(fertForm.dosage),
      ph: optional(fertForm.ph), ec: optional(fertForm.ec),
    }, () => setFertForm({ date: today(), batchId: '', npkRatio: '', dosage: '', ph: '', ec: '' }));
  };

  const savePest = () => {
    if (!pestForm.pestDiseaseName) { setError('Enter the pest or disease name.'); return; }
    save('pestObservations', {
      date: pestForm.date, batchId: pestForm.batchId || null, pestDiseaseName: pestForm.pestDiseaseName,
      incidencePercentage: parseFloat(pestForm.incidencePercentage) || 0, severityScale: parseInt(pestForm.severityScale),
      treatmentChemical: pestForm.treatmentChemical || undefined,
    }, () => setPestForm({ date: today(), batchId: '', pestDiseaseName: '', incidencePercentage: '', severityScale: '1', treatmentChemical: '' }));
  };

  const savePreSow = () => {
    if (!preSowForm.batchId) { setError('Select the batch whose seed was treated.'); return; }
    save('preSowingTreatments', { ...preSowForm, batchId: preSowForm.batchId },
      () => setPreSowForm({ date: today(), batchId: '', treatmentType: 'soaking', duration: '', concentration: '', notes: '' }));
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
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Treatment Logs</h1>
          
        </div>
        <button onClick={() => setShowForm(true)} className="bg-green-700 hover:bg-green-800 text-white p-2.5 rounded-xl shadow-sm  hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-all ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Form Modals */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-lg text-gray-900">{tab === 'fertilizer' ? 'Fertigation Entry' : tab === 'pest' ? 'Pathology Report' : 'Pre-Sowing Treatment'}</h2>
              <button onClick={() => { setShowForm(false); setError(null); }} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>

            {tab === 'fertilizer' && (
              <div className="space-y-4">
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Date</label><input type="date" value={fertForm.date} onChange={e => setFertForm({...fertForm, date: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                <div><label htmlFor="fert-batch" className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Applied to</label><BatchSelect id="fert-batch" allowWholeNursery value={fertForm.batchId || null} onChange={id => setFertForm({ ...fertForm, batchId: id ?? '' })} /></div>
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">NPK Ratio</label><input type="text" placeholder="20-20-20" value={fertForm.npkRatio} onChange={e => setFertForm({...fertForm, npkRatio: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Dose (mg/L)</label><input type="number" step="0.1" value={fertForm.dosage} onChange={e => setFertForm({...fertForm, dosage: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                  <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">pH</label><input type="number" step="0.1" value={fertForm.ph} onChange={e => setFertForm({...fertForm, ph: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                  <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">EC (mS/cm)</label><input type="number" step="0.01" value={fertForm.ec} onChange={e => setFertForm({...fertForm, ec: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                </div>
                <FormError message={error} />
                <button onClick={saveFert} className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-sm uppercase tracking-widest shadow-sm">Record Entry</button>
              </div>
            )}

            {tab === 'pest' && (
              <div className="space-y-4">
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Date</label><input type="date" value={pestForm.date} onChange={e => setPestForm({...pestForm, date: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                <div><label htmlFor="pest-batch" className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Batch</label><BatchSelect id="pest-batch" allowWholeNursery value={pestForm.batchId || null} onChange={id => setPestForm({ ...pestForm, batchId: id ?? '' })} /></div>
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Pest / Disease Name</label><input type="text" placeholder="Pythium spp. (Damping-off)" value={pestForm.pestDiseaseName} onChange={e => setPestForm({...pestForm, pestDiseaseName: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Incidence (%)</label><input type="number" step="0.1" value={pestForm.incidencePercentage} onChange={e => setPestForm({...pestForm, incidencePercentage: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                  <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Severity (1–5)</label>
                    <select value={pestForm.severityScale} onChange={e => setPestForm({...pestForm, severityScale: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Trace','Minor','Moderate','Severe','Critical'][n-1]}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Treatment Applied</label><input type="text" placeholder="Metalaxyl 35% WP @ 2g/L" value={pestForm.treatmentChemical} onChange={e => setPestForm({...pestForm, treatmentChemical: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                <FormError message={error} />
                <button onClick={savePest} className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-sm uppercase tracking-widest shadow-sm">Record Report</button>
              </div>
            )}

            {tab === 'presowing' && (
              <div className="space-y-4">
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Date</label><input type="date" value={preSowForm.date} onChange={e => setPreSowForm({...preSowForm, date: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                <div><label htmlFor="presow-batch" className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Batch</label><BatchSelect id="presow-batch" value={preSowForm.batchId || null} onChange={id => setPreSowForm({ ...preSowForm, batchId: id ?? '' })} /></div>
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Treatment Type</label>
                  <select value={preSowForm.treatmentType} onChange={e => setPreSowForm({...preSowForm, treatmentType: e.target.value as PreSowingLog['treatmentType']})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none">
                    {Object.entries(treatmentTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Duration</label><input type="text" placeholder="48h / 6 weeks" value={preSowForm.duration} onChange={e => setPreSowForm({...preSowForm, duration: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                  <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Concentration</label><input type="text" placeholder="250 ppm GA₃" value={preSowForm.concentration} onChange={e => setPreSowForm({...preSowForm, concentration: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none" /></div>
                </div>
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Notes</label><textarea placeholder="Observations..." value={preSowForm.notes} onChange={e => setPreSowForm({...preSowForm, notes: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-blue-400 outline-none h-20 resize-none" /></div>
                <FormError message={error} />
                <button onClick={savePreSow} className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-sm uppercase tracking-widest shadow-sm">Record Treatment</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entries List */}
      {tab === 'fertilizer' && (fertLogs.length === 0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Beaker className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="font-bold text-sm text-gray-500">No fertigation records.</p></div>
      ) : fertLogs.map(l => (
        <div key={l.id} className="bento-card p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-2"><span className="text-xs font-medium text-gray-700">{label(l.batchId, l.legacyBatchLabel)}</span><span className="font-mono-sci text-[10px] text-gray-400">{l.date}</span></div>
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
        <div key={l.id} className="bento-card p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-2"><span className="text-xs font-medium text-gray-700">{label(l.batchId, l.legacyBatchLabel)}</span><span className="font-mono-sci text-[10px] text-gray-400">{l.date}</span></div>
          <p className="font-bold text-sm text-gray-800 italic">{l.pestDiseaseName}</p>
          <div className="flex gap-3 mt-2">
            <span className="text-[10px] bg-red-50 text-red-600 font-mono-sci font-bold px-2 py-0.5 rounded">INC: {l.incidencePercentage}%</span>
            <span className="text-[10px] bg-amber-50 text-amber-600 font-mono-sci font-bold px-2 py-0.5 rounded">SEV: {l.severityScale}/5</span>
          </div>
          {l.treatmentChemical && <p className="text-[10px] text-gray-500 mt-2 font-mono-sci">Rx: {l.treatmentChemical}</p>}
        </div>
      )))}

      {tab === 'presowing' && (preSowLogs.length === 0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><Shield className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="font-bold text-sm text-gray-500">No pre-sowing treatments.</p></div>
      ) : preSowLogs.map(l => (
        <div key={l.id} className="bento-card p-4 border border-gray-200">
          <div className="flex justify-between items-center mb-2"><span className="text-xs font-medium text-gray-700">{label(l.batchId, l.legacyBatchLabel)}</span><span className="font-mono-sci text-[10px] text-gray-400">{l.date}</span></div>
          <p className="font-bold text-sm text-gray-800">{treatmentTypeLabels[l.treatmentType]}</p>
          <div className="flex gap-3 mt-2">
            {l.duration && <span className="text-[10px] bg-green-50 text-green-600 font-mono-sci font-bold px-2 py-0.5 rounded">{l.duration}</span>}
            {l.concentration && <span className="text-[10px] bg-green-50 text-green-600 font-mono-sci font-bold px-2 py-0.5 rounded">{l.concentration}</span>}
          </div>
          {l.notes && <p className="text-xs text-gray-500 mt-2">{l.notes}</p>}
        </div>
      )))}
    </div>
  );
};

export default TreatmentLogsPage;
