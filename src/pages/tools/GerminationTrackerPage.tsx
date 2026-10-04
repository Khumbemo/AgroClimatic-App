import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Sprout, X, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { useBatchIndex, useCollection, useData, byDateDesc } from '../../data/hooks';
import { saveErrorMessage } from '../../data/errors';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';
import { aiService } from '../../services/ai';

const daysAfterSowing = (date: string, sowing: string) =>
  Math.max(1, Math.ceil((new Date(date).getTime() - new Date(sowing).getTime()) / 86400000));

const GerminationTrackerPage = () => {
  const navigate = useNavigate();
  const { repo } = useData();
  const { batches, label } = useBatchIndex();
  const { items: allCounts } = useCollection('germinationCounts');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosenBatchId, setChosenBatchId] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    count: '',
  });
  const [seedsInput, setSeedsInput] = useState('');
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Default to the batch with the most recent count, else the newest batch.
  const latestCounted = [...allCounts].sort(byDateDesc)[0]?.batchId ?? null;
  const batchId = chosenBatchId ?? latestCounted ?? batches[0]?.id ?? null;
  const batch = batchId ? batches.find(b => b.id === batchId) : undefined;
  const logs = allCounts.filter(c => c.batchId === batchId).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const totalSeeds = batch?.seedsSown ?? 0;
  const sowingDate = batch?.sowingDate ?? null;

  const generateInsight = async () => {
    if (logs.length === 0) return;
    setIsAiLoading(true);
    const summary = `Germination tracking for ${totalSeeds} seeds. Current GP: ${germinationPercentage}%, GRI: ${gri}, MGT: ${mgt} days. Daily logs: ` + logs.map(l => `${l.date}: +${l.count}`).join(', ');
    const insight = await aiService.analyzeDataInsights(summary);
    setAiInsight(insight);
    setIsAiLoading(false);
  };

  const saveLog = async () => {
    if (!batchId) { setError('Select a batch first.'); return; }
    if (form.count === '') { setError('Enter the number of newly germinated seeds.'); return; }
    try {
      await repo.add('germinationCounts', { batchId, date: form.date, count: Number(form.count) });
    } catch (e) {
      setError(saveErrorMessage(e));
      return;
    }
    setError(null);
    setShowForm(false);
    setForm({ ...form, count: '' });
  };

  const saveSeedsSown = async () => {
    if (!batch) return;
    try {
      await repo.update('batches', batch.id, { seedsSown: Number(seedsInput) });
      setSeedsInput('');
      setError(null);
    } catch (e) {
      setError(saveErrorMessage(e));
    }
  };

  // Scientific Germination Metrics
  const cumulativeCount = logs.reduce((sum, l) => sum + l.count, 0);
  const germinationPercentage = totalSeeds > 0 ? ((cumulativeCount / totalSeeds) * 100).toFixed(1) : '—';

  // Timing metrics count days from the batch's sowing date (tᵢ = days after sowing).
  // GRI = Σ(Gᵢ/tᵢ); MGT = Σ(tᵢ·Gᵢ)/ΣGᵢ
  const gri = sowingDate ? logs.reduce((sum, l) => sum + l.count / daysAfterSowing(l.date, sowingDate), 0).toFixed(2) : '—';
  const mgt = sowingDate && cumulativeCount > 0
    ? (logs.reduce((sum, l) => sum + daysAfterSowing(l.date, sowingDate) * l.count, 0) / cumulativeCount).toFixed(1)
    : '—';

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Germination Tracker</h1>
          
        </div>
        <button onClick={() => setShowForm(true)} className="bg-green-700 hover:bg-green-800 text-white p-2.5 rounded-xl shadow-sm  hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Batch: supplies N₀ (seeds sown) and the sowing date */}
      <div className="bento-card p-4 space-y-3">
        <div>
          <label htmlFor="germ-batch" className="sci-label">Batch</label>
          <BatchSelect id="germ-batch" value={batchId} onChange={id => { setChosenBatchId(id); setAiInsight(null); }} />
        </div>
        {batch && (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="sci-label">Seeds sown (N₀)</dt>
              <dd className="font-mono-sci text-gray-900 mt-0.5">{batch.seedsSown ?? '—'}</dd>
            </div>
            <div>
              <dt className="sci-label">Sowing date</dt>
              <dd className="font-mono-sci text-gray-900 mt-0.5">{batch.sowingDate ?? '—'}</dd>
            </div>
          </dl>
        )}
        {batch && batch.seedsSown == null && (
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label htmlFor="germ-seeds" className="sci-label">Enter seeds sown for this batch</label>
              <input id="germ-seeds" type="number" min="1" value={seedsInput} onChange={e => setSeedsInput(e.target.value)} className="w-full mt-1 p-2.5 rounded-lg border border-gray-200 font-mono-sci text-sm outline-none focus:border-green-600" />
            </div>
            <button onClick={saveSeedsSown} disabled={!seedsInput} className="px-4 py-2.5 rounded-lg bg-green-700 text-white text-sm font-medium disabled:opacity-50">Save</button>
          </div>
        )}
        {batch && !batch.sowingDate && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">This batch has no sowing date, so germination speed and mean germination time can't be calculated. Add it on the batch record.</p>
        )}
        {!showForm && <FormError message={error} />}
      </div>

      {/* Precision Metrics Dashboard */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bento-card p-4">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">GP (%)</span>
          <div className="font-mono-sci text-2xl font-bold text-green-700 mt-1">{germinationPercentage}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">Σn/N₀ × 100</div>
        </div>
        <div className="bento-card p-4">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">GRI</span>
          <div className="font-mono-sci text-2xl font-bold text-green-700 mt-1">{gri}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">Σ(Gᵢ/Tᵢ)</div>
        </div>
        <div className="bento-card p-4">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">MGT (d)</span>
          <div className="font-mono-sci text-2xl font-bold text-green-700 mt-1">{mgt}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">Σ(Tᵢ·Gᵢ)/ΣGᵢ</div>
        </div>
      </div>

      {/* AI Data Insights */}
      {logs.length > 0 && (
        <div className="bento-card p-4 bg-green-50 border border-green-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-green-800 text-[10px] uppercase tracking-[0.15em] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-500" /> AI Growth Insights
            </h3>
            <button onClick={generateInsight} disabled={isAiLoading} className="text-[10px] font-bold bg-green-600 text-white px-3 py-1.5 rounded flex items-center gap-1 hover:bg-green-700 disabled:opacity-50">
              {isAiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <TrendingUp className="w-3 h-3" />}
              {isAiLoading ? 'Analyzing...' : 'Generate Report'}
            </button>
          </div>
          {aiInsight && (
            <div className="bg-white/60 p-3 rounded-lg border border-green-100 text-sm text-green-900 leading-relaxed font-medium shadow-sm">
              {aiInsight}
            </div>
          )}
          {!aiInsight && !isAiLoading && (
            <div className="text-xs text-green-600/70 italic">Click generate for a personalized AI analysis of your current germination curve.</div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-lg text-gray-900">New Germination Count</h2>
              <button onClick={() => { setShowForm(false); setError(null); }} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Observation Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none" />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Batch</span>
                <p className="mt-1 text-sm text-gray-900">{batchId ? label(batchId) : 'No batch selected'}</p>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">New Emerged Seedlings (Gᵢ)</label>
                <input type="number" placeholder="0" value={form.count} onChange={e => setForm({...form, count: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-2xl font-bold text-center focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none" />
              </div>
              <FormError message={error} />
              <button onClick={saveLog} className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold text-sm uppercase tracking-widest shadow-sm  hover:shadow-sm transition-all">
                Record Count
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Germination Log */}
      {logs.length === 0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200">
          <Sprout className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-sm text-gray-500">No germination data recorded.</p>
          
        </div>
      ) : (
        <div className="bento-card p-4 border border-gray-200">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Daily Emergence Log
          </h3>
          <div className="space-y-2">
            {logs.map((log, idx) => {
              const cumulative = logs.slice(0, idx + 1).reduce((s, l) => s + l.count, 0);
              const pct = totalSeeds > 0 ? ((cumulative / totalSeeds) * 100).toFixed(1) : '—';
              return (
                <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="font-mono-sci text-[10px] text-gray-400 w-20">{log.date}</span>
                  <span className="font-mono-sci text-xs font-bold text-green-700 w-12 text-center">+{log.count}</span>
                  <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-600 h-full rounded-full transition-all" style={{ width: `${totalSeeds > 0 ? Math.min(100, (cumulative / totalSeeds) * 100) : 0}%` }}></div>
                  </div>
                  <span className="font-mono-sci text-[10px] font-bold text-gray-600 w-14 text-right">{pct === '—' ? pct : `${pct}%`}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GerminationTrackerPage;
