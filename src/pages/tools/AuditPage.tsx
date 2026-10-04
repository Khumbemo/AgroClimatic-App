import { useState } from 'react';
import { Plus, ShieldCheck } from 'lucide-react';
import { useCollection, useData } from '../../data/hooks';
import { Page, PageHeader } from '../../components/ui/Page';
import { Chip, EmptyState, Stat, StatGrid, type Tone } from '../../components/ui/Display';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import RecordList from '../../components/ui/RecordList';
import FormError from '../../components/data/FormError';
import { today, useRecordForm } from '../../components/ui/useRecordForm';

const INSTRUMENTS = ['pH meter', 'EC meter', 'SPAD meter', 'PAR / quantum sensor', 'Thermometer', 'Hygrometer', 'Balance', 'Digital calipers', 'Moisture meter', 'Other'];
const DAY = 86_400_000;

const AuditPage = () => {
  const { repo } = useData();
  const logs = [...useCollection('calibrations').items].sort((a, b) => b.calibrationDate.localeCompare(a.calibrationDate));
  // Reference time for due-date status, fixed when the page opens
  const [now] = useState(() => Date.now());

  const status = (nextDue: string | null): { label: string; tone: Tone; rank: number } => {
    if (!nextDue) return { label: 'No due date', tone: 'neutral', rank: 2 };
    const days = Math.ceil((Date.parse(`${nextDue}T00:00:00Z`) - now) / DAY);
    if (days < 0) return { label: `Overdue ${-days} d`, tone: 'critical', rank: 0 };
    if (days <= 14) return { label: `Due in ${days} d`, tone: 'warn', rank: 1 };
    return { label: 'Valid', tone: 'leaf', rank: 3 };
  };
  // Only the latest calibration per instrument counts towards status
  const latestPerInstrument = [...new Map(logs.map(l => [l.instrumentName.trim().toLowerCase(), l])).values()];
  const counts = latestPerInstrument.reduce((m, l) => { const r = status(l.nextDueDate).rank; m[r] = (m[r] ?? 0) + 1; return m; }, {} as Record<number, number>);

  const form = useRecordForm(() => ({ instrumentName: '', instrumentType: INSTRUMENTS[0], calibrationDate: today(), nextDueDate: '', standardUsed: '', calibratedBy: '', notes: '' }));
  const v = form.values;
  const save = () => form.submit(async () => {
    if (v.nextDueDate && v.nextDueDate < v.calibrationDate) throw new Error('The next due date is before the calibration date.');
    await repo.add('calibrations', { ...v, nextDueDate: v.nextDueDate || null });
  });

  return (
    <Page>
      <PageHeader title="Data quality & audit" subtitle="Instrument calibration log and due dates." back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={form.openForm}>New</Button>} />

      {latestPerInstrument.length > 0 && (
        <StatGrid cols={3}>
          <Stat label="Overdue" value={counts[0] ?? 0} tone={counts[0] ? 'critical' : 'neutral'} note="instruments" />
          <Stat label="Due within 14 d" value={counts[1] ?? 0} tone={counts[1] ? 'warn' : 'neutral'} note="instruments" />
          <Stat label="Valid" value={counts[3] ?? 0} tone="leaf" note={`of ${latestPerInstrument.length} instruments`} />
        </StatGrid>
      )}

      {logs.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No calibrations recorded" text="Log each calibration with the reference standard (e.g. pH 4.01 / 7.00 buffers, 1.413 mS cm⁻¹ EC solution) and the next due date." action={<Button onClick={form.openForm}>Add calibration</Button>} />
      ) : (
        <RecordList label="Calibrations" onDelete={id => repo.remove('calibrations', id)} rows={logs.map(l => {
          const s = status(l.nextDueDate);
          return {
            id: l.id, title: l.instrumentName, meta: `${l.instrumentType} · calibrated ${l.calibrationDate}`,
            badges: <Chip tone={s.tone}>{s.label}</Chip>,
            values: [{ label: 'Next due', value: l.nextDueDate ?? '—' }, { label: 'Standard', value: l.standardUsed || '—' }, { label: 'By', value: l.calibratedBy || '—' }],
            note: l.notes || undefined,
          };
        })} />
      )}

      <Sheet open={form.open} title="New calibration" onClose={form.close}>
        <TextField id="ca-name" label="Instrument (name or serial)" value={v.instrumentName} onChange={form.set('instrumentName')} placeholder="EC-01 / SN 12345" />
        <SelectField id="ca-type" label="Type" value={v.instrumentType} onChange={form.set('instrumentType')} options={INSTRUMENTS.map(i => ({ value: i, label: i }))} />
        <div className="grid grid-cols-2 gap-3">
          <TextField id="ca-date" type="date" label="Calibrated on" value={v.calibrationDate} onChange={form.set('calibrationDate')} />
          <TextField id="ca-due" type="date" label="Next due" value={v.nextDueDate} onChange={form.set('nextDueDate')} />
        </div>
        <TextField id="ca-std" label="Reference standard" value={v.standardUsed} onChange={form.set('standardUsed')} placeholder="pH 4.01 / 7.00 buffers" />
        <TextField id="ca-by" label="Calibrated by" value={v.calibratedBy} onChange={form.set('calibratedBy')} />
        <TextAreaField id="ca-notes" label="Notes" value={v.notes} onChange={form.set('notes')} placeholder="Slope / offset, drift found, adjustments" />
        <FormError message={form.error} />
        <Button block onClick={save} disabled={form.saving}>Save calibration</Button>
      </Sheet>
    </Page>
  );
};

export default AuditPage;
