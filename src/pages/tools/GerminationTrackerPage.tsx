import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Sprout, X, TrendingUp } from 'lucide-react';
import type { GerminationLog } from '../../types';

const GerminationTrackerPage = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<GerminationLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [totalSeeds, setTotalSeeds] = useState<number>(() => {
    const saved = localStorage.getItem('ac_germ_total_seeds');
    return saved ? parseInt(saved) : 100;
  });
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    count: '',
    batchId: 'BATCH-001',
  });

  useEffect(() => {
    const saved = localStorage.getItem('ac_germination_logs');
    if (saved) setLogs(JSON.parse(saved));
  }, []);

  const saveLog = () => {
    if (!form.count) return;
    const newLog: GerminationLog = {
      id: `GL-${Date.now()}`,
      batchId: form.batchId,
      date: form.date,
      count: parseInt(form.count),
    };
    const updated = [...logs, newLog].sort((a, b) => a.date.localeCompare(b.date));
    setLogs(updated);
    localStorage.setItem('ac_germination_logs', JSON.stringify(updated));
    setShowForm(false);
    setForm({ ...form, count: '' });
  };

  const updateTotalSeeds = (val: number) => {
    setTotalSeeds(val);
    localStorage.setItem('ac_germ_total_seeds', val.toString());
  };

  // Scientific Germination Metrics
  const cumulativeCount = logs.reduce((sum, l) => sum + l.count, 0);
  const germinationPercentage = totalSeeds > 0 ? ((cumulativeCount / totalSeeds) * 100).toFixed(1) : '0.0';

  // GRI = Germination Rate Index = Σ(Gi/Ti) where Gi = seeds on day i, Ti = day number
  const sowingDate = logs.length > 0 ? logs[0].date : null;
  const gri = logs.reduce((sum, l) => {
    if (!sowingDate) return 0;
    const dayNum = Math.max(1, Math.ceil((new Date(l.date).getTime() - new Date(sowingDate).getTime()) / 86400000));
    return sum + l.count / dayNum;
  }, 0).toFixed(2);

  // MGT = Mean Germination Time = Σ(Ti * Gi) / Σ(Gi)
  const mgt = cumulativeCount > 0 ? (logs.reduce((sum, l) => {
    if (!sowingDate) return 0;
    const dayNum = Math.max(1, Math.ceil((new Date(l.date).getTime() - new Date(sowingDate).getTime()) / 86400000));
    return sum + dayNum * l.count;
  }, 0) / cumulativeCount).toFixed(1) : '—';

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Germination Tracker</h1>
          <p className="text-xs text-gray-500 font-mono-sci mt-0.5">ISTA PROTOCOL COMPLIANT</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white p-2.5 rounded-xl shadow-lg shadow-teal-500/30 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Seed Count Configuration */}
      <div className="bento-card p-4 bg-white/90 border border-gray-200">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Seeds Sown (N₀)</label>
        <input type="number" value={totalSeeds} onChange={e => updateTotalSeeds(parseInt(e.target.value) || 0)} className="w-full mt-1 p-2.5 rounded-lg border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none" />
      </div>

      {/* Precision Metrics Dashboard */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bento-card p-4 border-l-4 border-l-teal-500 bg-white/90">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">GP (%)</span>
          <div className="font-mono-sci text-2xl font-bold text-teal-700 mt-1">{germinationPercentage}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">Σn/N₀ × 100</div>
        </div>
        <div className="bento-card p-4 border-l-4 border-l-emerald-500 bg-white/90">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">GRI</span>
          <div className="font-mono-sci text-2xl font-bold text-emerald-700 mt-1">{gri}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">Σ(Gᵢ/Tᵢ)</div>
        </div>
        <div className="bento-card p-4 border-l-4 border-l-green-500 bg-white/90">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">MGT (d)</span>
          <div className="font-mono-sci text-2xl font-bold text-green-700 mt-1">{mgt}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">Σ(Tᵢ·Gᵢ)/ΣGᵢ</div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black text-lg text-gray-900">New Germination Count</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Observation Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Batch ID</label>
                <input type="text" value={form.batchId} onChange={e => setForm({...form, batchId: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">New Emerged Seedlings (Gᵢ)</label>
                <input type="number" placeholder="0" value={form.count} onChange={e => setForm({...form, count: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-2xl font-bold text-center focus:ring-2 focus:ring-teal-400 focus:border-transparent outline-none" />
              </div>
              <button onClick={saveLog} className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-teal-500/20 hover:shadow-xl transition-all">
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
          <p className="text-xs text-gray-400 mt-1 font-mono-sci">TAP + TO BEGIN COUNTING</p>
        </div>
      ) : (
        <div className="bento-card p-4 bg-white/90 border border-gray-200">
          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5" /> Daily Emergence Log
          </h3>
          <div className="space-y-2">
            {logs.map((log, idx) => {
              const cumulative = logs.slice(0, idx + 1).reduce((s, l) => s + l.count, 0);
              const pct = totalSeeds > 0 ? ((cumulative / totalSeeds) * 100).toFixed(1) : '0.0';
              return (
                <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="font-mono-sci text-[10px] text-gray-400 w-20">{log.date}</span>
                  <span className="font-mono-sci text-xs font-bold text-teal-700 w-12 text-center">+{log.count}</span>
                  <div className="flex-1 bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-400 to-emerald-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, parseFloat(pct))}%` }}></div>
                  </div>
                  <span className="font-mono-sci text-[10px] font-bold text-gray-600 w-14 text-right">{pct}%</span>
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
