import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, ShieldCheck, Wrench, AlertTriangle, CheckCircle } from 'lucide-react';

interface CalibrationLog {
  id:string; instrumentName:string; instrumentType:string; calibrationDate:string; nextDueDate:string;
  standardUsed:string; calibratedBy:string; notes:string; createdAt:string;
}

const AuditPage = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<CalibrationLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({instrumentName:'',instrumentType:'pH Meter',calibrationDate:new Date().toISOString().split('T')[0],nextDueDate:'',standardUsed:'',calibratedBy:'',notes:''});

  const instrumentTypes = ['pH Meter','EC Meter','SPAD Meter','PAR Sensor','Thermometer','Hygrometer','Balance/Scale','Digital Calipers','Other'];

  useEffect(()=>{const s=localStorage.getItem('ac_calibration');if(s)setLogs(JSON.parse(s));},[]);

  const save = () => {
    if(!form.instrumentName||!form.calibrationDate) return;
    const log:CalibrationLog = {id:`CAL-${Date.now()}`,instrumentName:form.instrumentName,instrumentType:form.instrumentType,calibrationDate:form.calibrationDate,nextDueDate:form.nextDueDate,standardUsed:form.standardUsed,calibratedBy:form.calibratedBy,notes:form.notes,createdAt:new Date().toISOString()};
    const u=[log,...logs];setLogs(u);localStorage.setItem('ac_calibration',JSON.stringify(u));
    setShowForm(false);setForm({instrumentName:'',instrumentType:'pH Meter',calibrationDate:new Date().toISOString().split('T')[0],nextDueDate:'',standardUsed:'',calibratedBy:'',notes:''});
  };

  const getStatus = (nextDue:string):{label:string;color:string;icon:React.ReactNode} => {
    if(!nextDue) return {label:'NO DATE',color:'text-gray-400 bg-gray-50 border-gray-200',icon:<AlertTriangle className="w-3 h-3"/>};
    const diff = Math.ceil((new Date(nextDue).getTime()-Date.now())/86400000);
    if(diff<0) return {label:'OVERDUE',color:'text-red-600 bg-red-50 border-red-200',icon:<AlertTriangle className="w-3 h-3"/>};
    if(diff<=14) return {label:`DUE ${diff}d`,color:'text-amber-600 bg-amber-50 border-amber-200',icon:<AlertTriangle className="w-3 h-3"/>};
    return {label:'VALID',color:'text-green-600 bg-green-50 border-green-200',icon:<CheckCircle className="w-3 h-3"/>};
  };

  // Count statuses
  const overdue = logs.filter(l=>{if(!l.nextDueDate)return false;return new Date(l.nextDueDate)<new Date();}).length;
  const valid = logs.filter(l=>{if(!l.nextDueDate)return false;const d=Math.ceil((new Date(l.nextDueDate).getTime()-Date.now())/86400000);return d>14;}).length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={()=>navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5 text-gray-600"/></button>
        <div className="flex-1"><h1 className="text-2xl font-black text-gray-900 tracking-tight">Data Quality & Audit</h1><p className="text-xs text-gray-500 font-mono-sci mt-0.5">INSTRUMENT CALIBRATION LOG</p></div>
        <button onClick={()=>setShowForm(true)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-2.5 rounded-xl shadow-lg shadow-sky-500/30 hover:scale-105 transition-transform"><Plus className="w-5 h-5"/></button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bento-card p-4 border-l-4 border-l-green-500 bg-white/90"><span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">Valid</span><div className="font-mono-sci text-2xl font-bold text-green-700 mt-1">{valid}</div></div>
        <div className="bento-card p-4 border-l-4 border-l-red-500 bg-white/90"><span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">Overdue</span><div className="font-mono-sci text-2xl font-bold text-red-700 mt-1">{overdue}</div></div>
        <div className="bento-card p-4 border-l-4 border-l-blue-500 bg-white/90"><span className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.15em]">Total</span><div className="font-mono-sci text-2xl font-bold text-blue-700 mt-1">{logs.length}</div></div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-5"><h2 className="font-black text-lg">New Calibration Entry</h2><button onClick={()=>setShowForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500"/></button></div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Instrument Name / Serial</label><input type="text" placeholder="Hanna HI98130 #SN-4521" value={form.instrumentName} onChange={e=>setForm({...form,instrumentName:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Instrument Type</label>
                <select value={form.instrumentType} onChange={e=>setForm({...form,instrumentType:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none">{instrumentTypes.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Calibration Date</label><input type="date" value={form.calibrationDate} onChange={e=>setForm({...form,calibrationDate:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Next Due Date</label><input type="date" value={form.nextDueDate} onChange={e=>setForm({...form,nextDueDate:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Standard Used</label><input type="text" placeholder="pH 4.01, 7.01, 10.01 buffer" value={form.standardUsed} onChange={e=>setForm({...form,standardUsed:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Calibrated By</label><input type="text" placeholder="Dr. J. Smith" value={form.calibratedBy} onChange={e=>setForm({...form,calibratedBy:e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm outline-none"/></div>
              <button onClick={save} className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Record Calibration</button>
            </div>
          </div>
        </div>
      )}

      {logs.length===0 ? (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200"><ShieldCheck className="w-10 h-10 text-gray-300 mx-auto mb-3"/><p className="font-bold text-sm text-gray-500">No calibration records.</p><p className="text-xs text-gray-400 mt-1 font-mono-sci">TAP + TO LOG INSTRUMENT CALIBRATION</p></div>
      ) : (
        <div className="space-y-3">{logs.map(l=>{const st=getStatus(l.nextDueDate);return(
          <div key={l.id} className="bento-card p-4 bg-white/90 border border-gray-200">
            <div className="flex justify-between items-center mb-2"><span className="font-mono-sci text-[10px] font-bold text-sky-600">{l.id}</span><span className={`text-[9px] font-mono-sci font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${st.color}`}>{st.icon}{st.label}</span></div>
            <div className="flex items-center gap-2 mb-2"><Wrench className="w-4 h-4 text-gray-400"/><div><p className="font-bold text-sm text-gray-800">{l.instrumentName}</p><p className="text-[10px] text-gray-500">{l.instrumentType}</p></div></div>
            <div className="grid grid-cols-2 gap-2 text-center mt-2">
              <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.calibrationDate}</div><div className="text-[8px] text-gray-400">Calibrated</div></div>
              <div className="bg-gray-50 rounded-lg p-2"><div className="font-mono-sci text-xs font-bold">{l.nextDueDate||'—'}</div><div className="text-[8px] text-gray-400">Next Due</div></div>
            </div>
            {l.standardUsed&&<p className="text-[9px] text-gray-500 font-mono-sci mt-2">Std: {l.standardUsed}</p>}
            <div className="text-[8px] text-gray-400 font-mono-sci mt-2 border-t border-gray-100 pt-2">{l.calibratedBy} · {l.createdAt}</div>
          </div>
        );})}</div>
      )}
    </div>
  );
};
export default AuditPage;
