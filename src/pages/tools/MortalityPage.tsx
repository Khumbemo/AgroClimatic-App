import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Skull } from 'lucide-react';
import { useBatchIndex, useCollection, useData, byDateDesc } from '../../data/hooks';
import { daysAfterSowing } from '../../utils/calculations';
import { Page, PageHeader, Section } from '../../components/ui/Page';
import { EmptyState, Notice, Stat, StatGrid } from '../../components/ui/Display';
import { FieldShell, SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import RecordList from '../../components/ui/RecordList';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';
import { req, today, useRecordForm } from '../../components/ui/useRecordForm';

const CAUSES = ['Damping-off (Pythium/Rhizoctonia)', 'Root rot (Fusarium)', 'Desiccation', 'Chlorosis / nutrient disorder', 'Nutrient or salt toxicity', 'Herbivory / insects', 'Mechanical damage', 'Frost or heat injury', 'Unknown'] as const;

const MortalityPage = () => {
  const { repo } = useData();
  const { batches } = useBatchIndex();
  const { items: allEvents } = useCollection('mortalityEvents');
  const { items: allCounts } = useCollection('germinationCounts');
  const [chosen, setChosen] = useState<string | null>(null);

  const batchId = chosen ?? [...allEvents].sort(byDateDesc)[0]?.batchId ?? batches[0]?.id ?? null;
  const batch = batchId ? batches.find(b => b.id === batchId) : undefined;
  const events = allEvents.filter(e => e.batchId === batchId).sort(byDateDesc);
  const germinated = allCounts.filter(c => c.batchId === batchId).reduce((s, c) => s + c.count, 0);
  const dead = events.reduce((s, e) => s + e.count, 0);
  // Survival refers to emerged seedlings; seeds that never germinated are not deaths.
  const base = germinated > 0 ? germinated : batch?.seedsSown ?? 0;
  const baseLabel = germinated > 0 ? 'of emerged seedlings' : 'of seeds sown (no germination counts yet)';
  const survival = base > 0 ? ((base - dead) / base) * 100 : null;
  const byCause = Object.entries(events.reduce<Record<string, number>>((m, e) => ({ ...m, [e.causeCode]: (m[e.causeCode] ?? 0) + e.count }), {})).sort((a, b) => b[1] - a[1]);

  const form = useRecordForm(() => ({ date: today(), sowingDate: '', count: '', causeCode: CAUSES[0] as string, notes: '' }));
  const v = form.values;
  const save = () => form.submit(async () => {
    if (!batch) throw new Error('Select a batch first.');
    const sowingDate = batch.sowingDate ?? (v.sowingDate || null);
    if (!sowingDate) throw new Error('Enter the sowing date so days to death can be calculated.');
    const dtd = daysAfterSowing(v.date, sowingDate);
    if (dtd < 0) throw new Error('The event date is before the sowing date.');
    if (!batch.sowingDate) await repo.update('batches', batch.id, { sowingDate });
    await repo.add('mortalityEvents', { batchId: batch.id, date: v.date, sowingDate, count: req(v.count), causeCode: v.causeCode, daysToDeath: dtd, notes: v.notes });
  }, { keep: ['date', 'causeCode'] });

  return (
    <Page>
      <PageHeader title="Mortality diagnostics" subtitle="Seedling losses by cause and survival per batch." back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={form.openForm} disabled={!batch}>Record</Button>} />

      {batches.length === 0 ? (
        <EmptyState icon={Skull} title="No batches yet" text="Mortality is recorded against a sowing batch." action={<Link to="/nursery/new" className="text-sm font-medium text-green-700">Create a batch</Link>} />
      ) : (
        <Section>
          <FieldShell id="mort-batch" label="Batch"><BatchSelect id="mort-batch" value={batchId} onChange={setChosen} /></FieldShell>
          {batch && (
            <dl className="grid grid-cols-3 gap-3 mt-3 text-sm">
              <div><dt className="sci-label">Seeds sown</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{batch.seedsSown ?? '—'}</dd></div>
              <div><dt className="sci-label">Emerged</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{germinated}</dd></div>
              <div><dt className="sci-label">Sowing date</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{batch.sowingDate ?? '—'}</dd></div>
            </dl>
          )}
        </Section>
      )}

      {batch && (
        <StatGrid cols={3}>
          <Stat label="Survival" value={survival != null ? survival.toFixed(1) : '—'} unit="%" tone={survival != null && survival < 80 ? 'warn' : 'leaf'} note={base ? baseLabel : 'Add seeds sown or germination counts'} formula="(N − deaths) / N" />
          <Stat label="Deaths" value={dead} unit="seedlings" tone={dead ? 'critical' : 'neutral'} />
          <Stat label="Main cause" value={byCause[0] ? byCause[0][0].split(' (')[0] : '—'} note={byCause[0] ? `${byCause[0][1]} of ${dead}` : undefined} />
        </StatGrid>
      )}

      {byCause.length > 0 && (
        <Section title="Losses by cause">
          <ul className="space-y-2">
            {byCause.map(([cause, n]) => (
              <li key={cause} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 text-xs">
                <span className="truncate text-gray-700" title={cause}>{cause}</span>
                <span className="h-2 bg-gray-100 rounded-sm overflow-hidden"><span className="block h-full bg-red-500" style={{ width: `${(n / dead) * 100}%` }} /></span>
                <span className="font-mono-sci text-right text-gray-700">{((n / dead) * 100).toFixed(0)} %</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {batch && (events.length === 0 ? (
        <EmptyState icon={Skull} title="No losses recorded for this batch" text="Record dead seedlings at each inspection with the most likely cause." />
      ) : (
        <RecordList label="Mortality events" onDelete={id => repo.remove('mortalityEvents', id)} rows={events.map(e => ({
          id: e.id, title: e.causeCode, meta: e.date,
          values: [{ label: 'Dead', value: e.count }, { label: 'Days after sowing', value: e.daysToDeath ?? '—' }],
          note: e.notes || undefined,
        }))} />
      ))}

      <Sheet open={form.open} title={`Record losses · ${batch?.batchNumber ?? ''}`} onClose={form.close}>
        <div className="grid grid-cols-2 gap-3">
          <TextField id="mo-date" type="date" label="Inspection date" value={v.date} onChange={form.set('date')} />
          <TextField id="mo-count" type="number" step="1" min={1} label="Dead seedlings" value={v.count} onChange={form.set('count')} />
        </div>
        {!batch?.sowingDate && (
          <>
            <Notice>This batch has no sowing date. Enter it here and it will be saved to the batch.</Notice>
            <TextField id="mo-sown" type="date" label="Sowing date" value={v.sowingDate} onChange={form.set('sowingDate')} />
          </>
        )}
        <SelectField id="mo-cause" label="Most likely cause" value={v.causeCode} onChange={form.set('causeCode')} options={CAUSES.map(c => ({ value: c, label: c }))} />
        <TextAreaField id="mo-notes" label="Symptoms / notes" value={v.notes} onChange={form.set('notes')} placeholder="e.g. collapse at soil line, white mycelium" />
        <FormError message={form.error} />
        <Button block onClick={save} disabled={form.saving}>Save</Button>
      </Sheet>
    </Page>
  );
};

export default MortalityPage;
