import { Plus, Droplets } from 'lucide-react';
import { useBatchIndex, useCollection, useData, byDateDesc } from '../../data/hooks';
import { IRRIGATION_METHODS, type IrrigationEvent } from '../../data/schema';
import { Page, PageHeader } from '../../components/ui/Page';
import { EmptyState, Stat, StatGrid } from '../../components/ui/Display';
import { FieldShell, SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import RecordList from '../../components/ui/RecordList';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';
import { numOrNull, req, today, useRecordForm } from '../../components/ui/useRecordForm';

const METHOD_LABELS: Record<IrrigationEvent['method'], string> = {
  overhead: 'Overhead sprinkler', drip: 'Drip', 'sub-irrigation': 'Sub-irrigation (ebb & flow)', mist: 'Mist', hand: 'Hand watering',
};

const IrrigationPage = () => {
  const { repo } = useData();
  const { label } = useBatchIndex();
  const events = [...useCollection('irrigationEvents').items].sort(byDateDesc);
  const lastWeek = (() => {
    const latest = events[0]?.date;
    if (!latest) return [];
    const from = new Date(Date.parse(`${latest}T00:00:00Z`) - 6 * 86_400_000).toISOString().slice(0, 10);
    return events.filter(e => e.date >= from);
  })();

  const form = useRecordForm(() => ({ date: today(), batchId: null as string | null, method: 'overhead' as IrrigationEvent['method'], volumeL: '', durationMin: '', notes: '' }));
  const v = form.values;
  const save = () => form.submit(() => repo.add('irrigationEvents', {
    date: v.date, batchId: v.batchId, method: v.method, volumeL: req(v.volumeL), durationMin: numOrNull(v.durationMin), notes: v.notes,
  }), { keep: ['date', 'batchId', 'method'] });

  return (
    <Page>
      <PageHeader title="Irrigation log" subtitle="Water applied per batch or for the whole nursery." back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={form.openForm}>New</Button>} />

      {events.length > 0 && (
        <StatGrid cols={3}>
          <Stat label="Last irrigation" value={events[0].date} note={METHOD_LABELS[events[0].method]} />
          <Stat label="Water, last 7 days" value={lastWeek.reduce((s, e) => s + e.volumeL, 0).toFixed(1)} unit="L" note={`${lastWeek.length} events up to ${events[0].date}`} />
          <Stat label="Events recorded" value={events.length} />
        </StatGrid>
      )}

      {events.length === 0 ? (
        <EmptyState icon={Droplets} title="No irrigation recorded" text="Log each irrigation with the volume applied. Use pour-through leachate tests in Substrate & nutrients to check the leaching fraction." action={<Button onClick={form.openForm}>Add irrigation</Button>} />
      ) : (
        <RecordList label="Irrigation events" onDelete={id => repo.remove('irrigationEvents', id)} rows={events.map(e => ({
          id: e.id, title: label(e.batchId, e.legacyBatchLabel), meta: e.date,
          values: [{ label: 'Method', value: METHOD_LABELS[e.method] }, { label: 'Volume', value: e.volumeL, unit: 'L' }, { label: 'Duration', value: e.durationMin ?? '—', unit: 'min' }],
          note: e.notes || undefined,
        }))} />
      )}

      <Sheet open={form.open} title="New irrigation" onClose={form.close}>
        <div className="grid grid-cols-2 gap-3">
          <TextField id="ir-date" type="date" label="Date" value={v.date} onChange={form.set('date')} />
          <FieldShell id="ir-batch" label="Applied to"><BatchSelect id="ir-batch" allowWholeNursery value={v.batchId} onChange={form.set('batchId')} /></FieldShell>
        </div>
        <SelectField id="ir-method" label="Method" value={v.method} onChange={m => form.set('method')(m as IrrigationEvent['method'])} options={IRRIGATION_METHODS.map(m => ({ value: m, label: METHOD_LABELS[m] }))} />
        <div className="grid grid-cols-2 gap-3">
          <TextField id="ir-vol" type="number" step="0.1" label="Volume" unit="L" value={v.volumeL} onChange={form.set('volumeL')} />
          <TextField id="ir-dur" type="number" step="1" label="Duration" unit="min" value={v.durationMin} onChange={form.set('durationMin')} />
        </div>
        <TextAreaField id="ir-notes" label="Notes" value={v.notes} onChange={form.set('notes')} />
        <FormError message={form.error} />
        <Button block onClick={save} disabled={form.saving}>Save</Button>
      </Sheet>
    </Page>
  );
};

export default IrrigationPage;
