import { useSearchParams } from 'react-router-dom';
import { Plus, Bug, FlaskConical, Shield, Droplets } from 'lucide-react';
import { useBatchIndex, useCollection, useData, byDateDesc } from '../../data/hooks';
import { PRESOWING_TYPES, type PreSowingTreatment } from '../../data/schema';
import { Page, PageHeader } from '../../components/ui/Page';
import { Chip, EmptyState, Tabs, type Tone } from '../../components/ui/Display';
import { FieldShell, SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import RecordList from '../../components/ui/RecordList';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';
import { num, req, today, useRecordForm } from '../../components/ui/useRecordForm';

type TabType = 'fertilizer' | 'pest' | 'presowing';
const TABS = [
  { value: 'fertilizer' as const, label: 'Fertigation', icon: FlaskConical },
  { value: 'pest' as const, label: 'Pests & disease', icon: Bug },
  { value: 'presowing' as const, label: 'Pre-sowing', icon: Shield },
];

const TREATMENT_LABELS: Record<PreSowingTreatment['treatmentType'], string> = {
  stratification_cold: 'Cold stratification', stratification_warm: 'Warm stratification',
  scarification_mechanical: 'Mechanical scarification', scarification_chemical: 'Chemical scarification',
  soaking: 'Soaking / imbibition', hormonal: 'Hormonal (e.g. GA₃)', other: 'Other',
};

const severityTone = (s: number): Tone => (s >= 4 ? 'critical' : s === 3 ? 'warn' : 'neutral');

const TreatmentLogsPage = () => {
  const { repo } = useData();
  const { label } = useBatchIndex();
  const [params, setParams] = useSearchParams();
  const tab: TabType = TABS.some(t => t.value === params.get('tab')) ? (params.get('tab') as TabType) : 'fertilizer';
  const setTab = (t: TabType) => setParams({ tab: t }, { replace: true });

  const fert = [...useCollection('fertigationEvents').items].sort(byDateDesc);
  const pests = [...useCollection('pestObservations').items].sort(byDateDesc);
  const presow = [...useCollection('preSowingTreatments').items].sort(byDateDesc);

  const fertForm = useRecordForm(() => ({ date: today(), batchId: null as string | null, npkRatio: '', dosage: '', ph: '', ec: '' }));
  const pestForm = useRecordForm(() => ({ date: today(), batchId: null as string | null, pestDiseaseName: '', incidencePercentage: '', severityScale: '1', treatmentChemical: '' }));
  const preForm = useRecordForm(() => ({ date: today(), batchId: null as string | null, treatmentType: 'soaking' as PreSowingTreatment['treatmentType'], duration: '', concentration: '', notes: '' }));
  const active = tab === 'fertilizer' ? fertForm : tab === 'pest' ? pestForm : preForm;

  const saveFert = () => fertForm.submit(() => repo.add('fertigationEvents', {
    date: fertForm.values.date, batchId: fertForm.values.batchId, npkRatio: fertForm.values.npkRatio, dosage: req(fertForm.values.dosage),
    ph: num(fertForm.values.ph), ec: num(fertForm.values.ec),
  }), { keep: ['date'] });

  const savePest = () => pestForm.submit(() => repo.add('pestObservations', {
    date: pestForm.values.date, batchId: pestForm.values.batchId, pestDiseaseName: pestForm.values.pestDiseaseName,
    incidencePercentage: req(pestForm.values.incidencePercentage), severityScale: Number(pestForm.values.severityScale),
    treatmentChemical: pestForm.values.treatmentChemical || undefined,
  }), { keep: ['date'] });

  const savePre = () => preForm.submit(async () => {
    if (!preForm.values.batchId) throw new Error('Select the batch whose seed was treated.');
    await repo.add('preSowingTreatments', { ...preForm.values, batchId: preForm.values.batchId });
  }, { keep: ['date'] });

  const empty = { fertilizer: 'No fertigation events yet', pest: 'No pest or disease observations yet', presowing: 'No pre-sowing treatments yet' }[tab];

  return (
    <Page>
      <PageHeader title="Treatment logs" subtitle="Fertigation, pest and disease scouting, and seed pre-treatments." back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={active.openForm}>New</Button>} />
      <Tabs label="Treatment type" tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'fertilizer' && (fert.length === 0 ? <EmptyState icon={Droplets} title={empty} action={<Button onClick={fertForm.openForm}>Add event</Button>} /> : (
        <RecordList label="Fertigation events" onDelete={id => repo.remove('fertigationEvents', id)} rows={fert.map(r => ({
          id: r.id, title: label(r.batchId, r.legacyBatchLabel), meta: r.date,
          values: [{ label: 'N-P-K', value: r.npkRatio }, { label: 'Dose', value: r.dosage, unit: 'mg L⁻¹' }, { label: 'pH', value: r.ph ?? '—' }, { label: 'EC', value: r.ec ?? '—', unit: 'mS cm⁻¹' }],
        }))} />
      ))}

      {tab === 'pest' && (pests.length === 0 ? <EmptyState icon={Bug} title={empty} action={<Button onClick={pestForm.openForm}>Add observation</Button>} /> : (
        <RecordList label="Pest and disease observations" onDelete={id => repo.remove('pestObservations', id)} rows={pests.map(r => ({
          id: r.id, title: r.pestDiseaseName, meta: `${r.date} · ${label(r.batchId, r.legacyBatchLabel)}`,
          badges: <Chip tone={severityTone(r.severityScale)}>Severity {r.severityScale}/5</Chip>,
          values: [{ label: 'Incidence', value: r.incidencePercentage, unit: '%' }, { label: 'Treatment', value: r.treatmentChemical || '—' }],
        }))} />
      ))}

      {tab === 'presowing' && (presow.length === 0 ? <EmptyState icon={Shield} title={empty} action={<Button onClick={preForm.openForm}>Add treatment</Button>} /> : (
        <RecordList label="Pre-sowing treatments" onDelete={id => repo.remove('preSowingTreatments', id)} rows={presow.map(r => ({
          id: r.id, title: TREATMENT_LABELS[r.treatmentType], meta: `${r.date} · ${label(r.batchId, r.legacyBatchLabel)}`,
          values: [{ label: 'Duration', value: r.duration || '—' }, { label: 'Concentration', value: r.concentration || '—' }],
          note: r.notes || undefined,
        }))} />
      ))}

      <Sheet open={fertForm.open} title="New fertigation event" onClose={fertForm.close}>
        <div className="grid grid-cols-2 gap-3">
          <TextField id="f-date" type="date" label="Date" value={fertForm.values.date} onChange={fertForm.set('date')} />
          <TextField id="f-npk" label="N-P-K ratio" value={fertForm.values.npkRatio} onChange={fertForm.set('npkRatio')} placeholder="20-20-20" />
        </div>
        <FieldShell id="f-batch" label="Applied to"><BatchSelect id="f-batch" allowWholeNursery value={fertForm.values.batchId} onChange={fertForm.set('batchId')} /></FieldShell>
        <div className="grid grid-cols-3 gap-3">
          <TextField id="f-dose" type="number" step="0.1" label="Dose" unit="mg L⁻¹" value={fertForm.values.dosage} onChange={fertForm.set('dosage')} />
          <TextField id="f-ph" type="number" step="0.1" label="pH" value={fertForm.values.ph} onChange={fertForm.set('ph')} />
          <TextField id="f-ec" type="number" step="0.01" label="EC" unit="mS cm⁻¹" value={fertForm.values.ec} onChange={fertForm.set('ec')} />
        </div>
        <FormError message={fertForm.error} />
        <Button block onClick={saveFert} disabled={fertForm.saving}>Save event</Button>
      </Sheet>

      <Sheet open={pestForm.open} title="New pest or disease observation" onClose={pestForm.close}>
        <div className="grid grid-cols-2 gap-3">
          <TextField id="p-date" type="date" label="Date" value={pestForm.values.date} onChange={pestForm.set('date')} />
          <FieldShell id="p-batch" label="Batch"><BatchSelect id="p-batch" allowWholeNursery value={pestForm.values.batchId} onChange={pestForm.set('batchId')} /></FieldShell>
        </div>
        <TextField id="p-name" label="Pest or disease" value={pestForm.values.pestDiseaseName} onChange={pestForm.set('pestDiseaseName')} placeholder="Damping-off (Pythium spp.)" />
        <div className="grid grid-cols-2 gap-3">
          <TextField id="p-inc" type="number" step="0.1" label="Incidence" unit="% plants" value={pestForm.values.incidencePercentage} onChange={pestForm.set('incidencePercentage')} />
          <SelectField id="p-sev" label="Severity" value={pestForm.values.severityScale} onChange={pestForm.set('severityScale')}
            options={[1, 2, 3, 4, 5].map(n => ({ value: String(n), label: `${n} – ${['trace', 'slight', 'moderate', 'severe', 'very severe'][n - 1]}` }))} />
        </div>
        <TextField id="p-treat" label="Treatment applied" value={pestForm.values.treatmentChemical} onChange={pestForm.set('treatmentChemical')} placeholder="Product and rate, if any" />
        <FormError message={pestForm.error} />
        <Button block onClick={savePest} disabled={pestForm.saving}>Save observation</Button>
      </Sheet>

      <Sheet open={preForm.open} title="New pre-sowing treatment" onClose={preForm.close}>
        <div className="grid grid-cols-2 gap-3">
          <TextField id="ps-date" type="date" label="Date" value={preForm.values.date} onChange={preForm.set('date')} />
          <FieldShell id="ps-batch" label="Batch"><BatchSelect id="ps-batch" value={preForm.values.batchId} onChange={preForm.set('batchId')} /></FieldShell>
        </div>
        <SelectField id="ps-type" label="Treatment" value={preForm.values.treatmentType} onChange={t => preForm.set('treatmentType')(t as PreSowingTreatment['treatmentType'])}
          options={PRESOWING_TYPES.map(t => ({ value: t, label: TREATMENT_LABELS[t] }))} />
        <div className="grid grid-cols-2 gap-3">
          <TextField id="ps-dur" label="Duration" value={preForm.values.duration} onChange={preForm.set('duration')} placeholder="30 days at 4 °C" />
          <TextField id="ps-conc" label="Concentration" value={preForm.values.concentration} onChange={preForm.set('concentration')} placeholder="250 ppm" />
        </div>
        <TextAreaField id="ps-notes" label="Notes" value={preForm.values.notes} onChange={preForm.set('notes')} />
        <FormError message={preForm.error} />
        <Button block onClick={savePre} disabled={preForm.saving}>Save treatment</Button>
      </Sheet>
    </Page>
  );
};

export default TreatmentLogsPage;
