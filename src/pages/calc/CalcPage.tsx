import { useState, type ReactNode } from 'react';
import { Beaker, Wind, BarChart3, ChevronRight, ArrowLeft, Plus, X } from 'lucide-react';
import { calculateVPD, getVpdBand } from '../../utils/calculations';
import VpdScale from '../../components/sci/VpdScale';
import { vpdToneChip } from '../../components/sci/vpdTone';

type CalcType = 'VPD' | 'GRI' | 'PPM' | null;

const inputCls = 'w-full mt-1.5 px-3 py-2.5 rounded-md border border-gray-300 bg-white font-mono-sci text-base text-gray-900 focus:border-green-600 focus:ring-2 focus:ring-green-100 outline-none transition-colors';

const Field = ({ id, label, unit, value, onChange, step, placeholder }: { id: string; label: string; unit: string; value: string; onChange: (v: string) => void; step: string; placeholder: string }) => (
  <div>
    <label htmlFor={id} className="sci-label">{label} <span className="normal-case tracking-normal font-mono-sci text-gray-400">({unit})</span></label>
    <input id={id} type="number" step={step} value={value} onChange={e => onChange(e.target.value)} className={inputCls} placeholder={placeholder} />
  </div>
);

const CalcHeader = ({ title, method, onBack }: { title: string; method: string; onBack: () => void }) => (
  <div className="flex items-center gap-3">
    <button onClick={onBack} aria-label="Back to calculators" className="p-2 -ml-2 rounded-md text-gray-500 hover:bg-green-50 hover:text-green-700"><ArrowLeft className="w-5 h-5" /></button>
    <div>
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <p className="text-xs text-gray-500 mt-0.5">{method}</p>
    </div>
  </div>
);

const Result = ({ label, value, unit, children }: { label: string; value: string; unit?: string; children?: ReactNode }) => (
  <div className="pt-4 border-t border-gray-200">
    <p className="sci-label">{label}</p>
    <div className="mt-1 flex items-baseline gap-1.5">
      <span className="font-mono-sci text-4xl font-medium text-gray-900">{value}</span>
      {unit && <span className="font-mono-sci text-sm text-gray-500">{unit}</span>}
    </div>
    {children}
  </div>
);

const Formula = ({ children }: { children: ReactNode }) => (
  <p className="font-mono-sci text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2 break-words">{children}</p>
);

const CalcPage = () => {
  const [activeCalc, setActiveCalc] = useState<CalcType>(null);

  // VPD State
  const [vpdTemp, setVpdTemp] = useState('');
  const [vpdRH, setVpdRH] = useState('');

  // GRI State
  const [griCounts, setGriCounts] = useState<{ day: string; count: string }[]>([{ day: '1', count: '0' }]);

  // PPM State
  const [ppmTarget, setPpmTarget] = useState('');
  const [ppmVolume, setPpmVolume] = useState('');
  const [ppmElement, setPpmElement] = useState('');

  // VPD (Tetens equation)
  const t = parseFloat(vpdTemp);
  const rh = parseFloat(vpdRH);
  const vpdValue = isNaN(t) || isNaN(rh) ? null : calculateVPD(t, rh);

  // Germination speed: sum of new germinants divided by days since sowing
  const getGri = () => {
    let sum = 0;
    for (const item of griCounts) {
      const d = parseFloat(item.day);
      const c = parseFloat(item.count);
      if (!isNaN(d) && !isNaN(c) && d > 0) sum += c / d;
    }
    return sum.toFixed(2);
  };
  const addGriRow = () => {
    const nextDay = griCounts.length > 0 ? parseInt(griCounts[griCounts.length - 1].day) + 1 : 1;
    setGriCounts([...griCounts, { day: nextDay.toString(), count: '0' }]);
  };

  // Fertilizer dry mass: g = ppm × L / (element % × 10)
  const getPpmMass = () => {
    const ppm = parseFloat(ppmTarget);
    const v = parseFloat(ppmVolume);
    const e = parseFloat(ppmElement);
    if (isNaN(ppm) || isNaN(v) || isNaN(e) || e <= 0) return null;
    return ((ppm * v) / (e * 10)).toFixed(2);
  };
  const ppmResult = getPpmMass();

  const calculators = [
    { id: 'VPD' as const, title: 'Vapour Pressure Deficit', icon: Wind, desc: 'From air temperature and relative humidity', unit: 'kPa' },
    { id: 'GRI' as const, title: 'Germination Speed Index', icon: BarChart3, desc: 'From daily counts of new germinants', unit: 'seeds d⁻¹' },
    { id: 'PPM' as const, title: 'Fertilizer Dosing', icon: Beaker, desc: 'Dry mass for a target ppm in solution', unit: 'g' },
  ];

  if (activeCalc === 'VPD') {
    const band = vpdValue !== null ? getVpdBand(vpdValue) : null;
    return (
      <div className="space-y-5 pb-8 animate-page-in">
        <CalcHeader title="VPD calculator" method="Tetens equation for saturation vapour pressure" onBack={() => setActiveCalc(null)} />
        <div className="bento-card space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field id="vpd-temp" label="Air temp" unit="°C" step="0.1" placeholder="25.0" value={vpdTemp} onChange={setVpdTemp} />
            <Field id="vpd-rh" label="Rel. humidity" unit="%" step="1" placeholder="60" value={vpdRH} onChange={setVpdRH} />
          </div>
          <Result label="Calculated VPD" value={vpdValue !== null ? vpdValue.toFixed(2) : '–'} unit="kPa">
            {band && vpdValue !== null && (
              <div className="mt-3 space-y-3">
                <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${vpdToneChip[band.tone]}`}>{band.label}</span>
                <VpdScale value={vpdValue} />
              </div>
            )}
          </Result>
          <Formula>VPD = 0.61078·e^(17.27T / (T + 237.3)) × (1 − RH/100)</Formula>
        </div>
      </div>
    );
  }

  if (activeCalc === 'GRI') {
    return (
      <div className="space-y-5 pb-8 animate-page-in">
        <CalcHeader title="Germination speed" method="Maguire (1962) speed of germination index" onBack={() => setActiveCalc(null)} />

        <div className="bento-card space-y-3">
          <Result label="Speed index" value={getGri()} unit="seeds d⁻¹" />
          <Formula>GSI = Σ (Gᵢ / tᵢ) · Gᵢ new germinants on day tᵢ</Formula>
        </div>

        <section>
          <div className="flex justify-between items-center mb-2">
            <h2 className="sci-section-title">Daily emergence counts</h2>
            <button onClick={addGriRow} className="text-xs font-medium text-green-700 flex items-center gap-1 hover:text-green-900"><Plus className="w-3.5 h-3.5" /> Add day</button>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[5rem_1fr_2.5rem] px-3 py-2 bg-gray-50 border-b border-gray-200 sci-label">
              <span>Day tᵢ</span><span>New germinants Gᵢ</span><span />
            </div>
            {griCounts.map((item, idx) => (
              <div key={idx} className="grid grid-cols-[5rem_1fr_2.5rem] items-center gap-2 px-3 py-1.5 border-b border-gray-100 last:border-b-0">
                <input aria-label={`Day for row ${idx + 1}`} type="number" value={item.day} onChange={e => { const n = [...griCounts]; n[idx].day = e.target.value; setGriCounts(n); }} className="w-full px-2 py-1.5 rounded border border-gray-200 font-mono-sci text-sm outline-none focus:border-green-500" />
                <input aria-label={`Germinants for row ${idx + 1}`} type="number" value={item.count} onChange={e => { const n = [...griCounts]; n[idx].count = e.target.value; setGriCounts(n); }} className="w-full px-2 py-1.5 rounded border border-gray-200 font-mono-sci text-sm outline-none focus:border-green-500" />
                <button aria-label={`Remove row ${idx + 1}`} onClick={() => setGriCounts(griCounts.filter((_, i) => i !== idx))} className="p-1.5 text-gray-400 hover:text-red-600 justify-self-end"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (activeCalc === 'PPM') {
    return (
      <div className="space-y-5 pb-8 animate-page-in">
        <CalcHeader title="Fertilizer dosing" method="Dry fertilizer mass for a target element concentration" onBack={() => setActiveCalc(null)} />
        <div className="bento-card space-y-4">
          <Field id="ppm-target" label="Target concentration" unit="ppm = mg L⁻¹" step="1" placeholder="150" value={ppmTarget} onChange={setPpmTarget} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="ppm-volume" label="Solution volume" unit="L" step="0.1" placeholder="10" value={ppmVolume} onChange={setPpmVolume} />
            <Field id="ppm-element" label="Element in product" unit="% w/w" step="0.1" placeholder="20" value={ppmElement} onChange={setPpmElement} />
          </div>
          <Result label="Required dry mass" value={ppmResult ?? '–'} unit="g" />
          <Formula>mass (g) = ppm × volume (L) / (element % × 10)</Formula>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-page-in">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Calculators</h1>
        <p className="text-sm text-gray-500 mt-1">Standard greenhouse and seed-testing equations.</p>
      </header>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
        {calculators.map(calc => (
          <button key={calc.id} onClick={() => setActiveCalc(calc.id)} className="w-full text-left flex items-center gap-3 px-4 py-3.5 hover:bg-green-50 transition-colors group">
            <div className="w-10 h-10 rounded-md bg-green-50 border border-green-100 flex items-center justify-center shrink-0 group-hover:bg-white">
              <calc.icon className="w-5 h-5 text-green-700" strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900">{calc.title}</h3>
              <p className="text-xs text-gray-500">{calc.desc}</p>
            </div>
            <span className="font-mono-sci text-[11px] text-gray-400 shrink-0">{calc.unit}</span>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-700" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default CalcPage;
