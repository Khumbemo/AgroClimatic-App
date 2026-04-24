import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Ruler, X, BarChart3 } from 'lucide-react';
import type { GrowthLog } from '../../types';

const MorphometricsPage = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    batchId: 'BATCH-001',
    sampleSize: '30',
    avgHeightCm: '',
    avgRCDmm: '',
    avgLeaves: '',
    leafAreaIndex: '',
    spadValue: '',
    shootFreshWeight: '',
    rootFreshWeight: '',
    shootDryWeight: '',
    rootDryWeight: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('ac_morpho_logs');
    if (saved) setLogs(JSON.parse(saved));
  }, []);

  const saveLog = () => {
    if (!form.avgHeightCm || !form.avgRCDmm) return;
    const newLog: GrowthLog = {
      id: `ML-${Date.now()}`,
      batchId: form.batchId,
      date: form.date,
      sampleSize: parseInt(form.sampleSize) || 30,
      avgHeightCm: parseFloat(form.avgHeightCm),
      avgRCDmm: parseFloat(form.avgRCDmm),
      avgLeaves: parseFloat(form.avgLeaves) || 0,
      leafAreaIndex: form.leafAreaIndex ? parseFloat(form.leafAreaIndex) : undefined,
      shootDryWeight: form.shootDryWeight ? parseFloat(form.shootDryWeight) : undefined,
      rootDryWeight: form.rootDryWeight ? parseFloat(form.rootDryWeight) : undefined,
    };
    const updated = [newLog, ...logs];
    setLogs(updated);
    localStorage.setItem('ac_morpho_logs', JSON.stringify(updated));
    setShowForm(false);
    setForm({ ...form, avgHeightCm: '', avgRCDmm: '', avgLeaves: '', leafAreaIndex: '', spadValue: '', shootFreshWeight: '', rootFreshWeight: '', shootDryWeight: '', rootDryWeight: '' });
  };

  // Derived metrics
  const latest = logs[0];
  const srRatio = latest?.shootDryWeight && latest?.rootDryWeight
    ? (latest.shootDryWeight / latest.rootDryWeight).toFixed(2) : '—';
  const sturdiness = latest
    ? (latest.avgHeightCm / latest.avgRCDmm).toFixed(2) : '—';
  const dqi = latest?.shootDryWeight && latest?.rootDryWeight
    ? ((latest.shootDryWeight + latest.rootDryWeight) / (parseFloat(sturdiness) + (latest.shootDryWeight / latest.rootDryWeight))).toFixed(2) : '—';

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Morphometrics</h1>
          <p className="text-xs text-gray-500 font-mono-sci mt-0.5">SEEDLING QUALITY INDEX PROTOCOL</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Derived Quality Indices */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bento-card p-4 border-l-4 border-l-indigo-500 bg-white/90">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">H/D Ratio</span>
          <div className="font-mono-sci text-2xl font-bold text-indigo-700 mt-1">{sturdiness}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">Sturdiness</div>
        </div>
        <div className="bento-card p-4 border-l-4 border-l-violet-500 bg-white/90">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">S/R Ratio</span>
          <div className="font-mono-sci text-2xl font-bold text-violet-700 mt-1">{srRatio}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">Shoot/Root</div>
        </div>
        <div className="bento-card p-4 border-l-4 border-l-purple-500 bg-white/90">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">DQI</span>
          <div className="font-mono-sci text-2xl font-bold text-purple-700 mt-1">{dqi}</div>
          <div className="text-[8px] text-gray-400 font-mono-sci">Dickson Index</div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black text-lg text-gray-900">New Measurement</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sample (n)</label><input type="number" value={form.sampleSize} onChange={e => setForm({...form, sampleSize: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Non-Destructive Measurements</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Height (cm)</label><input type="number" step="0.1" placeholder="15.2" value={form.avgHeightCm} onChange={e => setForm({...form, avgHeightCm: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">RCD (mm)</label><input type="number" step="0.01" placeholder="4.20" value={form.avgRCDmm} onChange={e => setForm({...form, avgRCDmm: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Leaves (#)</label><input type="number" step="1" placeholder="6" value={form.avgLeaves} onChange={e => setForm({...form, avgLeaves: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">SPAD Value</label><input type="number" step="0.1" placeholder="42.5" value={form.spadValue} onChange={e => setForm({...form, spadValue: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Destructive Sampling (Optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Shoot FW (g)</label><input type="number" step="0.01" placeholder="5.20" value={form.shootFreshWeight} onChange={e => setForm({...form, shootFreshWeight: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Root FW (g)</label><input type="number" step="0.01" placeholder="3.40" value={form.rootFreshWeight} onChange={e => setForm({...form, rootFreshWeight: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Shoot DW (g)</label><input type="number" step="0.01" placeholder="2.45" value={form.shootDryWeight} onChange={e => setForm({...form, shootDryWeight: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Root DW (g)</label><input type="number" step="0.01" placeholder="1.80" value={form.rootDryWeight} onChange={e => setForm({...form, rootDryWeight: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-indigo-400 outline-none" /></div>
                </div>
              </div>
              <button onClick={saveLog} className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Record Measurement</button>
            </div>
          </div>
        </div>
      )}

      {/* Entries */}
      {logs.length === 0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200">
          <Ruler className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-sm text-gray-500">No morphometric data recorded.</p>
          <p className="text-xs text-gray-400 mt-1 font-mono-sci">TAP + TO BEGIN MEASUREMENTS</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="bento-card p-4 bg-white/90 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono-sci text-[10px] font-bold text-indigo-600">{log.id}</span>
                <span className="font-mono-sci text-[10px] text-gray-400">{log.date} · n={log.sampleSize}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="font-mono-sci text-xs font-bold text-gray-800">{log.avgHeightCm}</div>
                  <div className="text-[8px] text-gray-400 uppercase">H (cm)</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="font-mono-sci text-xs font-bold text-gray-800">{log.avgRCDmm}</div>
                  <div className="text-[8px] text-gray-400 uppercase">RCD (mm)</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="font-mono-sci text-xs font-bold text-gray-800">{log.avgLeaves}</div>
                  <div className="text-[8px] text-gray-400 uppercase">Leaves</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="font-mono-sci text-xs font-bold text-gray-800">{log.shootDryWeight ? `${log.shootDryWeight}/${log.rootDryWeight}` : '—'}</div>
                  <div className="text-[8px] text-gray-400 uppercase">S/R (g)</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MorphometricsPage;
