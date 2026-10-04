import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCollection, useData } from '../../data/hooks';
import { saveErrorMessage } from '../../data/errors';
import { BATCH_STATUSES, type Batch } from '../../data/schema';
import FormError from '../../components/data/FormError';
import SeedLotSelect from '../../components/data/SeedLotSelect';

const inputCls = 'w-full mt-1.5 px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100';
const labelCls = 'sci-label';

type FormState = {
  batchNumber: string; speciesId: string; seedLotId: string | null; sowingDate: string; bedTrayNumber: string;
  substrateMix: string; seedsSown: string; areaSownM2: string; status: Batch['status']; notes: string;
};

const fromBatch = (b: Batch): FormState => ({
  batchNumber: b.batchNumber, speciesId: b.speciesId ?? '', seedLotId: b.seedLotId, sowingDate: b.sowingDate ?? '',
  bedTrayNumber: b.bedTrayNumber ?? '', substrateMix: b.substrateMix ?? '', seedsSown: b.seedsSown?.toString() ?? '',
  areaSownM2: b.areaSownM2?.toString() ?? '', status: b.status, notes: b.notes ?? '',
});

const emptyForm = (): FormState => ({
  batchNumber: `NB-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
  speciesId: '', seedLotId: null, sowingDate: new Date().toISOString().split('T')[0], bedTrayNumber: '',
  substrateMix: '', seedsSown: '', areaSownM2: '', status: 'sown', notes: '',
});

/** Create a batch, or edit one at /nursery/batch/:id/edit. */
const BatchFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { repo } = useData();
  const { items: species } = useCollection('species');
  const { items: batches, ready } = useCollection('batches');
  const existing = id ? batches.find(b => b.id === id) : undefined;

  if (id && !ready) return <p className="text-sm text-gray-500">Loading…</p>;
  if (id && !existing) return <p className="text-sm text-gray-500">This batch no longer exists.</p>;
  return <BatchForm key={existing?.id ?? 'new'} existing={existing} species={species} onDone={target => navigate(target, { replace: true })} onBack={() => navigate(-1)} repo={repo} />;
};

type BatchFormProps = {
  existing?: Batch;
  species: readonly { id: string; botanicalName: string }[];
  onDone: (path: string) => void;
  onBack: () => void;
  repo: ReturnType<typeof useData>['repo'];
};

const BatchForm = ({ existing, species, onDone, onBack, repo }: BatchFormProps) => {
  const [form, setForm] = useState<FormState>(() => (existing ? fromBatch(existing) : emptyForm()));
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(prev => ({ ...prev, [k]: v }));
  const optionalNumber = (v: string) => (v === '' ? null : Number(v));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      batchNumber: form.batchNumber,
      speciesId: form.speciesId || null,
      seedLotId: form.seedLotId,
      sowingDate: form.sowingDate || null,
      seedsSown: optionalNumber(form.seedsSown),
      bedTrayNumber: form.bedTrayNumber,
      substrateMix: form.substrateMix,
      areaSownM2: optionalNumber(form.areaSownM2),
      status: form.status,
      notes: form.notes,
    };
    try {
      if (existing) {
        // Once species, sowing date and seed count are filled in, the review flag is cleared.
        const complete = data.speciesId && data.sowingDate && data.seedsSown;
        await repo.update('batches', existing.id, { ...data, needsReview: existing.needsReview && !complete ? true : undefined });
        onDone(`/nursery/batch/${existing.id}`);
      } else {
        // Saved to the local store first, then synced; no need to wait for the server.
        const created = await repo.add('batches', data);
        onDone(`/nursery/batch/${created.id}`);
      }
    } catch (err) {
      setError(saveErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5 pb-8 animate-page-in">
      <header className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Back" className="p-2 -ml-2 rounded-md text-gray-500 hover:bg-green-50 hover:text-green-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900">{existing ? `Edit ${existing.batchNumber}` : 'New batch'}</h1>
      </header>

      {existing?.needsReview && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
          Created from records saved before the data upgrade. Fill in the species, sowing date and seeds sown so germination and survival can be calculated.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bento-card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="b-number" className={labelCls}>Batch number</label>
              <input id="b-number" required value={form.batchNumber} onChange={e => set('batchNumber', e.target.value)} className={`${inputCls} font-mono-sci`} />
            </div>
            <div className="col-span-2">
              <label htmlFor="b-species" className={labelCls}>Species</label>
              <select id="b-species" value={form.speciesId} onChange={e => set('speciesId', e.target.value)} className={inputCls}>
                <option value="">Not set</option>
                {species.map(s => <option key={s.id} value={s.id}>{s.botanicalName}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label htmlFor="b-lot" className={labelCls}>Seed lot</label>
              <SeedLotSelect id="b-lot" value={form.seedLotId} onChange={v => set('seedLotId', v)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="b-sown" className={labelCls}>Sowing date</label>
              <input id="b-sown" type="date" value={form.sowingDate} onChange={e => set('sowingDate', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="b-status" className={labelCls}>Stage</label>
              <select id="b-status" value={form.status} onChange={e => set('status', e.target.value as Batch['status'])} className={inputCls}>
                {BATCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="b-seeds" className={labelCls}>Seeds sown</label>
              <input id="b-seeds" type="number" min="1" step="1" placeholder="1000" value={form.seedsSown} onChange={e => set('seedsSown', e.target.value)} className={`${inputCls} font-mono-sci`} />
            </div>
            <div>
              <label htmlFor="b-area" className={labelCls}>Area sown (m²)</label>
              <input id="b-area" type="number" min="0" step="0.1" placeholder="1.5" value={form.areaSownM2} onChange={e => set('areaSownM2', e.target.value)} className={`${inputCls} font-mono-sci`} />
            </div>
            <div>
              <label htmlFor="b-tray" className={labelCls}>Bed / tray</label>
              <input id="b-tray" placeholder="B-01" value={form.bedTrayNumber} onChange={e => set('bedTrayNumber', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label htmlFor="b-substrate" className={labelCls}>Substrate mix</label>
              <input id="b-substrate" placeholder="Coir : soil (70 : 30)" value={form.substrateMix} onChange={e => set('substrateMix', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label htmlFor="b-notes" className={labelCls}>Notes</label>
              <textarea id="b-notes" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        <FormError message={error} />
        <button type="submit" className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 rounded-md flex items-center justify-center gap-2 transition-colors text-sm">
          <CheckCircle2 className="w-4 h-4" />
          {existing ? 'Save changes' : 'Create batch'}
        </button>
      </form>
    </div>
  );
};

export default BatchFormPage;
