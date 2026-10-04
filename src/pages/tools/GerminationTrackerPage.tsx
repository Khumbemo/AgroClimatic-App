import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sprout, Sparkles, Loader2 } from 'lucide-react';
import { useBatchIndex, useCollection, useData, byDateDesc } from '../../data/hooks';
import { saveErrorMessage } from '../../data/errors';
import { aiService, AI_ENABLED } from '../../services/ai';
import {
  cumulativeGermination, daysAfterSowing, germinationEnergy, germinationPercent, germinationSpeedIndex, meanGerminationTime,
} from '../../utils/calculations';
import { Page, PageHeader, Section } from '../../components/ui/Page';
import { ChartFrame, EmptyState, Notice, Stat, StatGrid } from '../../components/ui/Display';
import { FieldShell, TextField } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import RecordList from '../../components/ui/RecordList';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';
import GerminationChart from '../../components/nursery/GerminationChart';
import { req, today, useRecordForm } from '../../components/ui/useRecordForm';

const f = (v: number | null, d = 1) => (v == null ? '—' : v.toFixed(d));

const GerminationTrackerPage = () => {
  const { repo } = useData();
  const { batches } = useBatchIndex();
  const { items: allCounts } = useCollection('germinationCounts');
  const [chosenBatchId, setChosenBatchId] = useState<string | null>(null);
  const [seedsInput, setSeedsInput] = useState('');
  const [batchError, setBatchError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightBusy, setInsightBusy] = useState(false);

  // Default to the batch with the most recent count, else the first batch.
  const batchId = chosenBatchId ?? [...allCounts].sort(byDateDesc)[0]?.batchId ?? batches[0]?.id ?? null;
  const batch = batchId ? batches.find(b => b.id === batchId) : undefined;
  const counts = allCounts.filter(c => c.batchId === batchId).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  const n0 = batch?.seedsSown ?? 0;
  const sowing = batch?.sowingDate ?? null;
  const total = counts.reduce((s, c) => s + c.count, 0);

  const gp = germinationPercent(counts, n0);
  const ge = sowing ? germinationEnergy(counts, n0, sowing, 7) : null;
  const gsi = sowing && counts.length ? germinationSpeedIndex(counts, sowing) : null;
  const mgt = sowing ? meanGerminationTime(counts, sowing) : null;
  const cum = cumulativeGermination(counts, n0);

  const form = useRecordForm(() => ({ date: today(), count: '' }));
  const save = () =>
    form.submit(async () => {
      if (!batchId) throw new Error('Select a batch first.');
      if (sowing && daysAfterSowing(form.values.date, sowing) < 0) throw new Error('The count date is before the batch was sown.');
      await repo.add('germinationCounts', { batchId, date: form.values.date, count: req(form.values.count) });
    }, { keep: ['date'] });

  const saveSeedsSown = async () => {
    if (!batch) return;
    try {
      await repo.update('batches', batch.id, { seedsSown: Number(seedsInput) });
      setSeedsInput('');
      setBatchError(null);
    } catch (e) { setBatchError(saveErrorMessage(e)); }
  };

  const explain = async () => {
    setInsightBusy(true);
    try {
      setInsight(await aiService.analyzeDataInsights(
        `Batch ${batch?.batchNumber}: ${n0} seeds sown on ${sowing}. Final germination ${f(gp)} %, germination energy (day 7) ${f(ge)} %, speed index ${f(gsi, 2)} seeds/day, mean germination time ${f(mgt)} days. Daily counts: ${counts.map(c => `${c.date} +${c.count}`).join(', ')}.`,
      ));
    } catch (e) { setInsight(`Could not get an interpretation: ${(e as Error).message}`); }
    finally { setInsightBusy(false); }
  };

  return (
    <Page>
      <PageHeader title="Germination tracker" subtitle="Daily emergence counts per batch, with standard germination indices." back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={form.openForm} disabled={!batch}>Count</Button>} />

      {batches.length === 0 ? (
        <EmptyState icon={Sprout} title="No batches yet" text="Germination counts belong to a sowing batch." action={<Link to="/nursery/new" className="text-sm font-medium text-green-700">Create a batch</Link>} />
      ) : (
        <Section>
          <FieldShell id="germ-batch" label="Batch">
            <BatchSelect id="germ-batch" value={batchId} onChange={id => { setChosenBatchId(id); setInsight(null); }} />
          </FieldShell>
          {batch && (
            <dl className="grid grid-cols-2 gap-3 mt-3 text-sm">
              <div><dt className="sci-label">Seeds sown (N)</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{batch.seedsSown ?? '—'}</dd></div>
              <div><dt className="sci-label">Sowing date</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{batch.sowingDate ?? '—'}</dd></div>
            </dl>
          )}
          {batch && batch.seedsSown == null && (
            <div className="flex gap-2 items-end mt-3">
              <TextField className="flex-1" id="germ-seeds" type="number" step="1" min={1} label="Enter seeds sown for this batch" value={seedsInput} onChange={setSeedsInput} />
              <Button onClick={saveSeedsSown} disabled={!seedsInput}>Save</Button>
            </div>
          )}
          {batch && !batch.sowingDate && (
            <div className="mt-3"><Notice>No sowing date on this batch, so timing indices can't be calculated. <Link className="font-medium underline" to={`/nursery/batch/${batch.id}/edit`}>Add it</Link>.</Notice></div>
          )}
          {batchError && <div className="mt-3"><FormError message={batchError} /></div>}
        </Section>
      )}

      {batch && (
        <StatGrid cols={4}>
          <Stat label="Germination" value={f(gp)} unit="%" formula="Σn / N × 100" tone="leaf" note={`${total} seeds`} />
          <Stat label="Energy (day 7)" value={f(ge)} unit="%" formula="% by day 7 after sowing" />
          <Stat label="Speed index" value={f(gsi, 2)} unit="seeds d⁻¹" formula="Σ(nᵢ / tᵢ)" />
          <Stat label="Mean time" value={f(mgt)} unit="days" formula="Σ(tᵢ·nᵢ) / Σnᵢ" />
        </StatGrid>
      )}

      {batch && counts.length > 0 && (
        <ChartFrame title="Emergence" caption={sowing ? 'Bars: new germinants per count. Line: cumulative germination % of seeds sown. Labels: days after sowing.' : 'Labels are dates because the batch has no sowing date.'}>
          <GerminationChart
            labels={counts.map(c => (sowing ? `D${daysAfterSowing(c.date, sowing)}` : c.date.slice(5)))}
            dailyCount={counts.map(c => c.count)}
            cumulativePercent={cum.map(x => +x.toFixed(1))}
          />
        </ChartFrame>
      )}

      {batch && counts.length > 0 && AI_ENABLED && (
        <Section title="Interpretation" actions={<Button size="sm" variant="secondary" onClick={explain} disabled={insightBusy} icon={insightBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}>Explain</Button>}>
          <p className="text-sm text-gray-700">{insight ?? 'Get a short AI interpretation of this batch’s germination curve.'}</p>
        </Section>
      )}

      {batch && (counts.length === 0 ? (
        <EmptyState icon={Sprout} title="No counts for this batch" text="Count newly emerged seedlings at regular intervals (e.g. every 2–3 days) and record each count." action={<Button onClick={form.openForm}>Record first count</Button>} />
      ) : (
        <RecordList
          label="Germination counts"
          onDelete={id => repo.remove('germinationCounts', id)}
          rows={[...counts].reverse().map((c, i, arr) => ({
            id: c.id,
            title: c.date,
            meta: sowing ? `day ${daysAfterSowing(c.date, sowing)} after sowing` : undefined,
            values: [
              { label: 'New germinants', value: `+${c.count}` },
              { label: 'Cumulative', value: n0 ? cum[arr.length - 1 - i].toFixed(1) : '—', unit: '%' },
            ],
          }))}
        />
      ))}

      <Sheet open={form.open} title={`New count · ${batch?.batchNumber ?? ''}`} onClose={form.close}>
        <TextField id="gc-date" type="date" label="Count date" value={form.values.date} onChange={form.set('date')} />
        <TextField id="gc-count" type="number" step="1" min={0} label="Newly germinated seeds since last count" value={form.values.count} onChange={form.set('count')} placeholder="0" />
        <FormError message={form.error} />
        <Button block onClick={save} disabled={form.saving}>Save count</Button>
      </Sheet>
    </Page>
  );
};

export default GerminationTrackerPage;
