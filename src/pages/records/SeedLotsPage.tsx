import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, Scale, Droplets, ArrowLeft, X, Package } from 'lucide-react';
import { useCollection, useData } from '../../data/hooks';
import { saveErrorMessage } from '../../data/errors';
import FormError from '../../components/data/FormError';

const inputCls = 'w-full mt-1 px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 outline-hidden focus:border-green-600';
const emptyForm = { lotNumber: '', speciesId: '', collectionDate: '', stockKg: '', moistureContentPct: '', thousandSeedWeightG: '', viabilityPct: '' };

const SeedLotsPage: React.FC = () => {
  const navigate = useNavigate();
  const { repo } = useData();
  const { items: lots, ready } = useCollection('seedLots');
  const { items: species } = useCollection('species');
  const { items: provenance } = useCollection('provenanceRecords');
  const speciesName = new Map(species.map(s => [s.id, s.botanicalName]));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const sorted = [...lots].sort((a, b) => b.lotNumber.localeCompare(a.lotNumber));
  const num = (v: string) => (v === '' ? null : Number(v));

  const save = async () => {
    try {
      await repo.add('seedLots', {
        lotNumber: form.lotNumber, speciesId: form.speciesId || null, collectionDate: form.collectionDate || null,
        stockKg: num(form.stockKg), moistureContentPct: num(form.moistureContentPct),
        thousandSeedWeightG: num(form.thousandSeedWeightG), viabilityPct: num(form.viabilityPct),
      });
    } catch (e) { setError(saveErrorMessage(e)); return; }
    setError(null); setShowForm(false); setForm(emptyForm);
  };

  return (
    <div className="space-y-5 pb-8 animate-page-in">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2 rounded-md text-gray-500 hover:bg-green-50 hover:text-green-700"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-2xl font-semibold text-gray-900">Seed lots</h1>
        </div>
        <button onClick={() => setShowForm(true)} aria-label="New seed lot" className="bg-green-700 hover:bg-green-800 text-white p-3 rounded-lg">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-60 flex items-end justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg text-gray-900">New seed lot</h2>
              <button onClick={() => { setShowForm(false); setError(null); }} aria-label="Close" className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="sl-number" className="sci-label">Lot number</label><input id="sl-number" value={form.lotNumber} onChange={e => setForm({ ...form, lotNumber: e.target.value })} placeholder="SL-003" className={`${inputCls} font-mono-sci`} /></div>
                <div><label htmlFor="sl-date" className="sci-label">Collection date</label><input id="sl-date" type="date" value={form.collectionDate} onChange={e => setForm({ ...form, collectionDate: e.target.value })} className={inputCls} /></div>
              </div>
              <div><label htmlFor="sl-species" className="sci-label">Species</label>
                <select id="sl-species" value={form.speciesId} onChange={e => setForm({ ...form, speciesId: e.target.value })} className={inputCls}>
                  <option value="">Not set</option>
                  {species.map(s => <option key={s.id} value={s.id}>{s.botanicalName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label htmlFor="sl-stock" className="sci-label">Stock (kg)</label><input id="sl-stock" type="number" step="0.01" value={form.stockKg} onChange={e => setForm({ ...form, stockKg: e.target.value })} className={`${inputCls} font-mono-sci`} /></div>
                <div><label htmlFor="sl-tsw" className="sci-label">1000-seed weight (g)</label><input id="sl-tsw" type="number" step="0.01" value={form.thousandSeedWeightG} onChange={e => setForm({ ...form, thousandSeedWeightG: e.target.value })} className={`${inputCls} font-mono-sci`} /></div>
                <div><label htmlFor="sl-mc" className="sci-label">Moisture content (%)</label><input id="sl-mc" type="number" step="0.1" value={form.moistureContentPct} onChange={e => setForm({ ...form, moistureContentPct: e.target.value })} className={`${inputCls} font-mono-sci`} /></div>
                <div><label htmlFor="sl-via" className="sci-label">Viability (%)</label><input id="sl-via" type="number" step="0.1" value={form.viabilityPct} onChange={e => setForm({ ...form, viabilityPct: e.target.value })} className={`${inputCls} font-mono-sci`} /></div>
              </div>
              <FormError message={error} />
              <button onClick={save} className="w-full bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-md text-sm font-medium">Save seed lot</button>
            </div>
          </div>
        </div>
      )}

      {ready && sorted.length === 0 ? (
        <div className="bento-card p-10 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No seed lots yet</p>
          <p className="text-xs text-gray-500 mt-1">Add a lot with the + button, then link batches and provenance records to it.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(lot => {
            const origin = provenance.find(p => p.seedLotId === lot.id);
            return (
              <div key={lot.id} className="bento-card p-4 space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-900 font-mono-sci">{lot.lotNumber} {lot.isExample && <span className="ml-1 px-1.5 py-0.5 rounded-sm border text-[10px] font-sans bg-gray-100 text-gray-600 border-gray-200">Example</span>}</h3>
                    <p className="text-xs text-gray-500 italic">{(lot.speciesId && speciesName.get(lot.speciesId)) || 'Species not set'}</p>
                  </div>
                  <span className="font-mono-sci text-sm text-green-800 bg-green-50 border border-green-100 px-2 py-0.5 rounded-sm">{lot.stockKg != null ? `${lot.stockKg} kg` : '— kg'}</span>
                </div>
                <dl className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-center">
                  <div><dt className="sci-label flex items-center justify-center gap-1"><MapPin className="w-3 h-3" />Origin</dt><dd className="font-mono-sci text-xs text-gray-800 mt-1">{origin ? `${origin.lat.toFixed(2)}, ${origin.lng.toFixed(2)}` : '—'}</dd></div>
                  <div><dt className="sci-label flex items-center justify-center gap-1"><Scale className="w-3 h-3" />1000 wt</dt><dd className="font-mono-sci text-xs text-gray-800 mt-1">{lot.thousandSeedWeightG != null ? `${lot.thousandSeedWeightG} g` : '—'}</dd></div>
                  <div><dt className="sci-label flex items-center justify-center gap-1"><Droplets className="w-3 h-3" />Moisture</dt><dd className="font-mono-sci text-xs text-gray-800 mt-1">{lot.moistureContentPct != null ? `${lot.moistureContentPct} %` : '—'}</dd></div>
                </dl>
                <p className="text-[11px] text-gray-500 font-mono-sci">Collected {lot.collectionDate ?? '—'}{lot.viabilityPct != null ? ` · viability ${lot.viabilityPct} %` : ''}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default SeedLotsPage;
