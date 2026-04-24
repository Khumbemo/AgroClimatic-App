import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ThermometerSun, Droplets, Sun, Wind, X } from 'lucide-react';
import type { ClimateLog } from '../../types';

const EnvironmentalLogsPage = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<ClimateLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    tempMin: '',
    tempMax: '',
    tempMean: '',
    humidity: '',
    lightIntensity: '',
    photoperiod: '',
    co2: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('ac_climate_logs');
    if (saved) setLogs(JSON.parse(saved));
  }, []);

  const saveLog = () => {
    if (!form.tempMin || !form.tempMax || !form.humidity) return;
    const newLog: ClimateLog = {
      id: `CL-${Date.now()}`,
      date: form.date,
      tempMin: parseFloat(form.tempMin),
      tempMax: parseFloat(form.tempMax),
      tempMean: form.tempMean ? parseFloat(form.tempMean) : (parseFloat(form.tempMin) + parseFloat(form.tempMax)) / 2,
      humidity: parseFloat(form.humidity),
      lightIntensity: parseFloat(form.lightIntensity) || 0,
      photoperiod: parseFloat(form.photoperiod) || 0,
      co2: form.co2 ? parseFloat(form.co2) : undefined,
    };
    const updated = [newLog, ...logs];
    setLogs(updated);
    localStorage.setItem('ac_climate_logs', JSON.stringify(updated));
    setShowForm(false);
    setForm({ date: new Date().toISOString().split('T')[0], tempMin: '', tempMax: '', tempMean: '', humidity: '', lightIntensity: '', photoperiod: '', co2: '' });
  };

  // Calculate VPD from latest log
  const calcVPD = (temp: number, rh: number) => {
    const svp = 0.6108 * Math.exp((17.27 * temp) / (temp + 237.3));
    return ((1 - rh / 100) * svp).toFixed(2);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Environmental Logs</h1>
          <p className="text-xs text-gray-500 font-mono-sci mt-0.5">MICROCLIMATE SENSOR PROTOCOL</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-2.5 rounded-xl shadow-lg shadow-orange-500/30 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black text-lg text-gray-900">New Climate Entry</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date (ISO 8601)</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">T Min (°C)</label>
                  <input type="number" step="0.1" placeholder="12.5" value={form.tempMin} onChange={e => setForm({...form, tempMin: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">T Max (°C)</label>
                  <input type="number" step="0.1" placeholder="28.3" value={form.tempMax} onChange={e => setForm({...form, tempMax: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">T Mean (°C)</label>
                  <input type="number" step="0.1" placeholder="Auto" value={form.tempMean} onChange={e => setForm({...form, tempMean: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">RH (%)</label>
                  <input type="number" step="0.1" placeholder="65.0" value={form.humidity} onChange={e => setForm({...form, humidity: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">PAR (µmol/m²/s)</label>
                  <input type="number" step="1" placeholder="450" value={form.lightIntensity} onChange={e => setForm({...form, lightIntensity: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Photoperiod (hrs)</label>
                  <input type="number" step="0.5" placeholder="14" value={form.photoperiod} onChange={e => setForm({...form, photoperiod: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">CO₂ (ppm)</label>
                  <input type="number" step="1" placeholder="420" value={form.co2} onChange={e => setForm({...form, co2: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none" />
                </div>
              </div>
              <button onClick={saveLog} className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:shadow-xl transition-all">
                Record Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Entries */}
      {logs.length === 0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200">
          <ThermometerSun className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-sm text-gray-500">No climate entries recorded yet.</p>
          <p className="text-xs text-gray-400 mt-1 font-mono-sci">TAP + TO BEGIN LOGGING</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="bento-card p-4 bg-white/90 border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono-sci text-[10px] font-bold text-orange-600">{log.id}</span>
                <span className="font-mono-sci text-[10px] text-gray-400">{log.date}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <ThermometerSun className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
                  <div className="font-mono-sci text-xs font-bold text-gray-800">{log.tempMin}–{log.tempMax}°C</div>
                  <div className="text-[8px] text-gray-400 uppercase">Temp Range</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <Droplets className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                  <div className="font-mono-sci text-xs font-bold text-gray-800">{log.humidity}%</div>
                  <div className="text-[8px] text-gray-400 uppercase">RH</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <Sun className="w-3.5 h-3.5 text-yellow-400 mx-auto mb-1" />
                  <div className="font-mono-sci text-xs font-bold text-gray-800">{log.lightIntensity || '—'}</div>
                  <div className="text-[8px] text-gray-400 uppercase">PAR</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <Wind className="w-3.5 h-3.5 text-green-400 mx-auto mb-1" />
                  <div className="font-mono-sci text-xs font-bold text-gray-800">{calcVPD(log.tempMean, log.humidity)}</div>
                  <div className="text-[8px] text-gray-400 uppercase">VPD kPa</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnvironmentalLogsPage;
