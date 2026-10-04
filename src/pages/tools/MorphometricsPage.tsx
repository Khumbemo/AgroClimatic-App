import { useState } from 'react';
import { Plus, Ruler } from 'lucide-react';
import { useBatchIndex, useCollection, useData, byDateDesc } from '../../data/hooks';
import { calculateRGR, daysAfterSowing, dicksonQualityIndex, sturdinessQuotient } from '../../utils/calculations';
import { Page, PageHeader, Section } from '../../components/ui/Page';
import { Chip, ChartFrame, EmptyState, Stat, StatGrid } from '../../components/ui/Display';
import { FieldGroup, FieldShell, TextField } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import RecordList from '../../components/ui/RecordList';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';
import GrowthChart from '../../components/nursery/GrowthChart';
import { num, req, today, useRecordForm } from '../../components/ui/useRecordForm';

const f = (v: number | null | undefined, d = 2) => (v == null ? '—' : v.toFixed(d));

const MorphometricsPage = () => {
  const { repo } = useData();
  const { label, batches } = useBatchIndex();
  const { items, ready } = useCollection('growthMeasurements');
  const [filter, setFilter] = useState<string | null>(null);
  const batchId = filter ?? [...items].sort(byDateDesc)[0]?.batchId ?? null;
  const rows = items.filter(g => !batchId || g.batchId === batchId).sort(byDateDesc);
  const series = [...rows].reverse();
  const latest = rows[0];
  const first = series[0];
  const span = first && latest ? daysAfterSowing(latest.date, first.date) : 0;
  const rgr = first && latest && span > 0 ? calculateRGR(first.avgHeightCm, latest.avgHeightCm, span) : null;
  const withMass = rows.find(g => g.shootDryWeight && g.rootDryWeight);

  const form = useRecordForm(() => ({
    batchId: null as string | null, date: today(), sampleSize: '30', avgHeightCm: '', avgRCDmm: '', avgLeaves: '', leafAreaIndex: '',
    spadValue: '', shootFreshWeight: '', rootFreshWeight: '', shootDryWeight: '', rootDryWeight: '',
  }));
  const v = form.values;
  const save = () =>
    form.submit(async () => {
      if (!v.batchId) throw new Error('Select the batch you measured.');
      await repo.add('growthMeasurements', {
        batchId: v.batchId, date: v.date, sampleSize: req(v.sampleSize), avgHeightCm: req(v.avgHeightCm), avgRCDmm: req(v.avgRCDmm),
        avgLeaves: num(v.avgLeaves), leafAreaIndex: num(v.leafAreaIndex), spadValue: num(v.spadValue),
        shootFreshWeight: num(v.shootFreshWeight), rootFreshWeight: num(v.rootFreshWeight),
        shootDryWeight: num(v.shootDryWeight), rootDryWeight: num(v.rootDryWeight),
      });
      setFilter(v.batchId);
    }, { keep: ['batchId', 'date', 'sampleSize'] });

  return (
    <Page>
      <PageHeader title="Morphometrics" subtitle="Seedling height, root-collar diameter and biomass, with quality indices." back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={() => { form.set('batchId')(batchId); form.openForm(); }} disabled={!batches.length}>Measure</Button>} />

      {items.length > 0 && (
        <Section>
          <FieldShell id="morph-filter" label="Batch">
            <BatchSelect id="morph-filter" value={batchId} onChange={setFilter} />
          </FieldShell>
        </Section>
      )}

      {latest && (
        <StatGrid cols={4}>
          <Stat label="Height" value={f(latest.avgHeightCm, 1)} unit="cm" note={`n = ${latest.sampleSize} · ${latest.date}`} />
          <Stat label="Root-collar Ø" value={f(latest.avgRCDmm)} unit="mm" />
          <Stat label="Sturdiness" value={f(sturdinessQuotient(latest.avgHeightCm, latest.avgRCDmm), 1)} unit="cm mm⁻¹" formula="H / D" />
          <Stat label="RGR height" value={rgr != null ? rgr.toFixed(3) : '—'} unit="d⁻¹" formula="(ln H₂ − ln H₁) / Δt" note={span > 0 ? `over ${span} days` : 'needs 2 dates'} />
          <Stat label="Shoot : root" value={withMass ? f(withMass.shootDryWeight! / withMass.rootDryWeight!) : '—'} formula="dry mass ratio" />
          <Stat label="Dickson index" value={withMass ? f(dicksonQualityIndex(withMass.avgHeightCm, withMass.avgRCDmm, withMass.shootDryWeight!, withMass.rootDryWeight!)) : '—'} formula="TDM / (H/D + S/R)" note={withMass ? withMass.date : 'needs dry masses'} />
        </StatGrid>
      )}

      {series.length >= 2 && (
        <ChartFrame title="Growth" caption="Mean height (left axis) and root-collar diameter (right axis) per measurement date.">
          <GrowthChart labels={series.map(g => g.date.slice(5))} heightData={series.map(g => g.avgHeightCm)} rcdData={series.map(g => g.avgRCDmm)} />
        </ChartFrame>
      )}

      {ready && items.length === 0 ? (
        <EmptyState icon={Ruler} title="No measurements yet" text="Measure a sample of seedlings (e.g. n = 30) and record the means. Add dry masses after destructive sampling to get the Dickson index." action={batches.length ? <Button onClick={form.openForm}>Add measurement</Button> : undefined} />
      ) : (
        <RecordList
          label="Growth measurements"
          onDelete={id => repo.remove('growthMeasurements', id)}
          rows={rows.map(g => ({
            id: g.id,
            title: label(g.batchId, g.legacyBatchLabel),
            meta: `${g.date} · n = ${g.sampleSize}`,
            badges: g.isExample ? <Chip>Example</Chip> : undefined,
            values: [
              { label: 'Height', value: g.avgHeightCm, unit: 'cm' },
              { label: 'RCD', value: g.avgRCDmm, unit: 'mm' },
              { label: 'H/D', value: f(sturdinessQuotient(g.avgHeightCm, g.avgRCDmm), 1) },
              ...(g.shootDryWeight && g.rootDryWeight
                ? [{ label: 'DQI', value: f(dicksonQualityIndex(g.avgHeightCm, g.avgRCDmm, g.shootDryWeight, g.rootDryWeight)) }]
                : []),
              ...(g.spadValue != null ? [{ label: 'SPAD', value: g.spadValue }] : []),
              ...(g.leafAreaIndex != null ? [{ label: 'LAI', value: g.leafAreaIndex }] : []),
            ],
          }))}
        />
      )}

      <Sheet open={form.open} title="New measurement" onClose={form.close}>
        <FieldShell id="morph-batch" label="Batch"><BatchSelect id="morph-batch" value={v.batchId} onChange={form.set('batchId')} /></FieldShell>
        <div className="grid grid-cols-2 gap-3">
          <TextField id="m-date" type="date" label="Date" value={v.date} onChange={form.set('date')} />
          <TextField id="m-n" type="number" step="1" min={1} label="Sample size" unit="n" value={v.sampleSize} onChange={form.set('sampleSize')} />
        </div>
        <FieldGroup title="Non-destructive (means)">
          <div className="grid grid-cols-2 gap-3">
            <TextField id="m-h" type="number" step="0.1" label="Height" unit="cm" value={v.avgHeightCm} onChange={form.set('avgHeightCm')} placeholder="15.2" />
            <TextField id="m-d" type="number" step="0.01" label="Root-collar Ø" unit="mm" value={v.avgRCDmm} onChange={form.set('avgRCDmm')} placeholder="4.20" />
            <TextField id="m-leaves" type="number" step="1" label="Leaves" unit="count" value={v.avgLeaves} onChange={form.set('avgLeaves')} />
            <TextField id="m-spad" type="number" step="0.1" label="SPAD" value={v.spadValue} onChange={form.set('spadValue')} />
            <TextField id="m-lai" type="number" step="0.01" label="Leaf area index" value={v.leafAreaIndex} onChange={form.set('leafAreaIndex')} />
          </div>
        </FieldGroup>
        <FieldGroup title="Destructive sample (optional)">
          <div className="grid grid-cols-2 gap-3">
            <TextField id="m-sfw" type="number" step="0.001" label="Shoot fresh" unit="g" value={v.shootFreshWeight} onChange={form.set('shootFreshWeight')} />
            <TextField id="m-rfw" type="number" step="0.001" label="Root fresh" unit="g" value={v.rootFreshWeight} onChange={form.set('rootFreshWeight')} />
            <TextField id="m-sdw" type="number" step="0.001" label="Shoot dry" unit="g" value={v.shootDryWeight} onChange={form.set('shootDryWeight')} />
            <TextField id="m-rdw" type="number" step="0.001" label="Root dry" unit="g" value={v.rootDryWeight} onChange={form.set('rootDryWeight')} />
          </div>
          <p className="text-[11px] text-gray-500">Mean dry mass per seedling, oven-dried to constant weight.</p>
        </FieldGroup>
        <FormError message={form.error} />
        <Button block onClick={save} disabled={form.saving}>Save measurement</Button>
      </Sheet>
    </Page>
  );
};

export default MorphometricsPage;
