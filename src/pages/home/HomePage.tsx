import React, { useState } from 'react';
import { Droplets, ThermometerSun, Sun, Microscope, Target, Fingerprint, Sparkles, Loader2, UploadCloud, CheckCircle2, FlaskConical } from 'lucide-react';
import { motion } from 'framer-motion';
import { aiService } from '../../services/ai';
import { calculateVPD, getVpdBand } from '../../utils/calculations';
import VpdScale from '../../components/sci/VpdScale';
import { vpdToneChip } from '../../components/sci/vpdTone';
import MigrationNotice from '../../components/data/MigrationNotice';

// Demo sensor snapshot; VPD is derived from it so the readings stay consistent.
const CLIMATE = { temp: 24.6, rh: 68, par: 412, ec: 1.8, vpd: calculateVPD(24.6, 68) };

const READINGS = [
  { label: 'Air temp', icon: ThermometerSun, value: CLIMATE.temp.toFixed(1), unit: '°C', note: 'Setpoint 24.0 °C' },
  { label: 'Rel. humidity', icon: Droplets, value: String(CLIMATE.rh), unit: '%', note: 'Misting off' },
  { label: 'PAR', icon: Sun, value: String(CLIMATE.par), unit: 'µmol m⁻² s⁻¹', note: 'Shade screen 30 %' },
  { label: 'Substrate EC', icon: FlaskConical, value: CLIMATE.ec.toFixed(2), unit: 'mS cm⁻¹', note: 'Target 1.0–2.0' },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06
    }
  }
};

const item = {
  hidden: { y: 8, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const HomePage = () => {
  const [logs, setLogs] = useState([
    { id: "LOG-A71", level: 'warn', msg: "Batch #042 substrate moisture below threshold (30 %).", time: "T-02:14:00", aiNote: null as string | null, loading: false },
    { id: "LOG-A70", level: 'info', msg: "PAR sensor calibration sequence completed.", time: "T-11:00:23", aiNote: null as string | null, loading: false }
  ]);
  
  const [morphStatus, setMorphStatus] = useState<'idle' | 'analyzing' | 'complete'>('idle');
  const [morphResult, setMorphResult] = useState<{ caliper: number; srRatio: number; passed: boolean; message: string } | null>(null);

  const handleDiagnose = async (index: number) => {
    const updated = [...logs];
    updated[index].loading = true;
    setLogs(updated);

    const suggestion = await aiService.analyzeDiagnostics(logs[index].msg);
    
    const finalLogs = [...logs];
    finalLogs[index].loading = false;
    finalLogs[index].aiNote = suggestion;
    setLogs(finalLogs);
  };

  const handleMorphUpload = async () => {
    setMorphStatus('analyzing');
    // Simulate image upload by creating a dummy file
    const dummyFile = new File([''], 'seedling.jpg', { type: 'image/jpeg' });
    const result = await aiService.analyzeMorphometrics(dummyFile);
    setMorphResult(result);
    setMorphStatus('complete');
  };

  const band = getVpdBand(CLIMATE.vpd);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5 pb-8">
      <MigrationNotice />

      {/* Greenhouse climate */}
      <motion.section variants={item} className="bento-card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">GH-01 · Propagation house</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Sample sensor readings</p>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-800 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-green-600" /> Online
          </span>
        </div>

        <div className="grid grid-cols-2 border-b border-gray-200">
          {READINGS.map((r, i) => (
            <div key={r.label} className={`p-4 border-gray-200 min-w-0 ${i % 2 === 0 ? 'border-r' : ''} ${i < 2 ? 'border-b' : ''}`}>
              <div className="sci-label flex items-center gap-1.5"><r.icon className="w-3.5 h-3.5" strokeWidth={2} />{r.label}</div>
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1">
                <span className="font-mono-sci text-2xl font-medium text-gray-900">{r.value}</span>
                <span className="font-mono-sci text-xs text-gray-500">{r.unit}</span>
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">{r.note}</div>
            </div>
          ))}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex justify-between items-baseline gap-3">
            <div>
              <div className="sci-label">Vapour pressure deficit</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono-sci text-2xl font-medium text-gray-900">{CLIMATE.vpd.toFixed(2)}</span>
                <span className="font-mono-sci text-xs text-gray-500">kPa</span>
              </div>
            </div>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${vpdToneChip[band.tone]}`}>{band.label}</span>
          </div>
          <VpdScale value={CLIMATE.vpd} />
          <p className="text-[11px] text-gray-500">Tetens equation from {CLIMATE.temp} °C and {CLIMATE.rh} % RH.</p>
        </div>
      </motion.section>

      {/* Nursery summary */}
      <motion.section variants={item} className="grid grid-cols-2 gap-3">
        <div className="bento-card p-4">
          <div className="sci-label">Active seed lots</div>
          <div className="font-mono-sci text-3xl font-medium text-gray-900 mt-2">12</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Across 4 benches</div>
        </div>
        <div className="bento-card p-4">
          <div className="sci-label">Mean germination</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-mono-sci text-3xl font-medium text-green-700">84.2</span>
            <span className="font-mono-sci text-sm text-gray-500">%</span>
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-sm overflow-hidden"><div className="h-full bg-green-600" style={{ width: '84.2%' }} /></div>
        </div>
      </motion.section>

      {/* Diagnostics log */}
      <motion.section variants={item} className="bento-card">
        <h3 className="sci-section-title flex items-center gap-2 mb-3">
          <Fingerprint className="w-4 h-4 text-gray-400" strokeWidth={2} /> Diagnostics log
        </h3>
        <div className="divide-y divide-gray-100">
          {logs.map((log, i) => (
            <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex gap-3">
              <span className={`w-1 shrink-0 rounded-full ${log.level === 'warn' ? 'bg-amber-400' : 'bg-green-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <p className={`font-mono-sci text-[11px] font-semibold ${log.level === 'warn' ? 'text-amber-700' : 'text-green-700'}`}>
                    {log.id} · {log.level === 'warn' ? 'Warning' : 'Info'}
                  </p>
                  <p className="font-mono-sci text-[10px] text-gray-400">{log.time}</p>
                </div>
                <p className="text-[13px] text-gray-700 mt-1 leading-relaxed">{log.msg}</p>

                {log.aiNote && (
                  <div className="mt-2 bg-green-50 p-2.5 rounded border border-green-100 flex gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-green-900 leading-snug">{log.aiNote}</p>
                  </div>
                )}
                {!log.aiNote && !log.loading && (
                  <button onClick={() => handleDiagnose(i)} className="mt-2 text-xs font-medium text-green-700 flex items-center gap-1 hover:text-green-900">
                    <Sparkles className="w-3.5 h-3.5" /> AI diagnose
                  </button>
                )}
                {log.loading && (
                  <div className="mt-2 text-xs font-medium text-green-700 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing…
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Morphometric review */}
      <motion.section variants={item} className="bento-card">
        <div className="flex items-center gap-2 mb-3">
          <Microscope className="w-4 h-4 text-green-700" strokeWidth={2} />
          <h3 className="sci-section-title">Morphometric review</h3>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-gray-200 border border-gray-200 rounded overflow-hidden mb-4">
          <div className="bg-gray-50 p-3">
            <dt className="sci-label flex items-center gap-1"><Target className="w-3 h-3" />Target caliper</dt>
            <dd className="font-mono-sci text-sm text-gray-900 mt-1">&gt; 4.0 mm</dd>
          </div>
          <div className="bg-gray-50 p-3">
            <dt className="sci-label flex items-center gap-1"><Target className="w-3 h-3" />Shoot : root</dt>
            <dd className="font-mono-sci text-sm text-gray-900 mt-1">&lt; 1.5</dd>
          </div>
        </dl>

        {morphStatus === 'idle' && (
          <>
            <p className="text-[13px] text-gray-600 mb-3">AI vision measurement of seedling caliper and shoot : root. Image analysis is simulated in this build.</p>
            <button onClick={handleMorphUpload} className="w-full border border-green-700 text-green-800 px-4 py-2.5 rounded-md text-sm font-medium hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
              <UploadCloud className="w-4 h-4" /> Run sample analysis
            </button>
          </>
        )}

        {morphStatus === 'analyzing' && (
          <div className="flex items-center justify-center gap-2 text-green-800 bg-green-50 border border-green-200 py-2.5 rounded-md">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Processing image…</span>
          </div>
        )}

        {morphStatus === 'complete' && morphResult && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-md">
            <div className="flex items-center gap-2 mb-2 text-green-800">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Measurement complete</span>
            </div>
            <p className="text-xs text-green-900 leading-relaxed mb-3">{morphResult.message}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border border-green-100 p-2 rounded text-center"><div className="font-mono-sci text-base text-gray-900">{morphResult.caliper} mm</div><div className="sci-label mt-0.5">Caliper</div></div>
              <div className="bg-white border border-green-100 p-2 rounded text-center"><div className="font-mono-sci text-base text-gray-900">{morphResult.srRatio}</div><div className="sci-label mt-0.5">Shoot : root</div></div>
            </div>
          </div>
        )}
      </motion.section>

    </motion.div>
  );
};

export default HomePage;
