import { useState } from 'react';
import { Plus, Beaker, Layers, X } from 'lucide-react';
import { useBatchIndex, useCollection, useData, byDateDesc } from '../../data/hooks';
import { leachingFraction } from '../../utils/calculations';
import { Page, PageHeader } from '../../components/ui/Page';
import { ChartFrame, EmptyState, Stat, StatGrid, Tabs } from '../../components/ui/Display';
import { FieldGroup, FieldShell, TextField, controlCls } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import RecordList from '../../components/ui/RecordList';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';
import TimeSeriesChart from '../../components/charts/TimeSeriesChart';
import { numOrNull, req, today, useRecordForm } from '../../components/ui/useRecordForm';

type TabType = 'leachate' | 'mixes';
const MIX_COLOURS = ['bg-amber-400', 'bg-green-500', 'bg-gray-400', 'bg-blue-400', 'bg-amber-200', 'bg-green-300'];

const SubstratePage = () => {
  const { repo } = useData();
  const { label } = useBatchIndex();
  const [tab, setTab] = useState<TabType>('leachate');
  const tests = [...useCollection('leachateTests').items].sort(byDateDesc);
  const mixes = [...useCollection('substrateMixes').items].sort((a, b) => a.name.localeCompare(b.name));
  const series = [...tests].reverse().slice(-40);
  const latest = tests[0];

  const lf = useRecordForm(() => ({ date: today(), batchId: null as string | null, phIn: '', phOut: '', ecIn: '', ecOut: '', volumeMl: '', appliedMl: '' }));
  const mf = useRecordForm(() => ({ name: '', cec: '', components: [{ name: 'Peat', pct: '30' }, { name: 'Coco coir', pct: '50' }, { name: 'Perlite', pct: '20' }] }));
  const totalPct = mf.values.components.reduce((s, c) => s + (Number(c.pct) || 0), 0);

  const saveTest = () => lf.submit(async () => {
    const v = lf.values;
    if (!v.batchId) throw new Error('Select the batch that was tested.');
    await repo.add('leachateTests', {
      date: v.date, batchId: v.batchId, phIn: req(v.phIn), phOut: numOrNull(v.phOut), ecIn: req(v.ecIn), ecOut: numOrNull(v.ecOut),
      volumeMl: numOrNull(v.volumeMl), appliedMl: numOrNull(v.appliedMl),
    });
  }, { keep: ['date', 'batchId'] });

  const saveMix = () => mf.submit(() => repo.add('substrateMixes', {
    name: mf.values.name,
    components: mf.values.components.filter(c => c.name.trim() || c.pct).map(c => ({ name: c.name, pct: Number(c.pct) || 0 })),
    cec: numOrNull(mf.values.cec),
  }));

  const setComp = (i: number, key: 'name' | 'pct', value: string) =>
    mf.set('components')(mf.values.components.map((c, j) => (j === i ? { ...c, [key]: value } : c)));

  return (
    <Page>
      <PageHeader title="Substrate & nutrients" subtitle="Leachate (pour-through) tests and substrate mix recipes." back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={tab === 'leachate' ? lf.openForm : mf.openForm}>New</Button>} />
      <Tabs label="Records" value={tab} onChange={setTab} tabs={[{ value: 'leachate', label: 'Leachate tests', icon: Beaker }, { value: 'mixes', label: 'Substrate mixes', icon: Layers }]} />

      {tab === 'leachate' && (
        <>
          {latest && (
            <StatGrid cols={4}>
              <Stat label="EC out" value={latest.ecOut ?? '—'} unit="mS cm⁻¹" note={latest.date} />
              <Stat label="ΔEC (out − in)" value={latest.ecOut != null ? (latest.ecOut - latest.ecIn).toFixed(2) : '—'} unit="mS cm⁻¹" note="Rising ΔEC suggests salt build-up" />
              <Stat label="pH out" value={latest.phOut ?? '—'} />
              <Stat label="Leaching fraction" value={latest.volumeMl != null && latest.appliedMl ? leachingFraction(latest.volumeMl, latest.appliedMl)!.toFixed(2) : '—'} formula="drainage / applied" />
            </StatGrid>
          )}
          {series.length >= 2 && (
            <ChartFrame title="EC and pH" caption="Irrigation water (in) versus leachate (out).">
              <TimeSeriesChart labels={series.map(t => t.date.slice(5))} yTitle="EC mS cm⁻¹" y1Title="pH" series={[
                { label: 'EC in', data: series.map(t => t.ecIn), color: 'blue-500', dashed: true },
                { label: 'EC out', data: series.map(t => t.ecOut), color: 'blue-700' },
                { label: 'pH in', data: series.map(t => t.phIn), color: 'green-500', axis: 'y1', dashed: true },
                { label: 'pH out', data: series.map(t => t.phOut), color: 'green-700', axis: 'y1' },
              ]} />
            </ChartFrame>
          )}
          {tests.length === 0 ? <EmptyState icon={Beaker} title="No leachate tests yet" text="Record irrigation-water and leachate pH and EC to track salt build-up and root-zone pH." action={<Button onClick={lf.openForm}>Add test</Button>} /> : (
            <RecordList label="Leachate tests" onDelete={id => repo.remove('leachateTests', id)} rows={tests.map(t => ({
              id: t.id, title: label(t.batchId, t.legacyBatchLabel), meta: t.date,
              values: [
                { label: 'pH in / out', value: `${t.phIn} / ${t.phOut ?? '—'}` },
                { label: 'EC in / out', value: `${t.ecIn} / ${t.ecOut ?? '—'}`, unit: 'mS cm⁻¹' },
                { label: 'Leachate', value: t.volumeMl ?? '—', unit: 'mL' },
                { label: 'LF', value: t.volumeMl != null && t.appliedMl ? leachingFraction(t.volumeMl, t.appliedMl)!.toFixed(2) : '—' },
              ],
            }))} />
          )}
        </>
      )}

      {tab === 'mixes' && (mixes.length === 0 ? <EmptyState icon={Layers} title="No substrate mixes yet" text="Save mix recipes by volume share so batches can refer to them." action={<Button onClick={mf.openForm}>Add mix</Button>} /> : (
        <RecordList label="Substrate mixes" onDelete={id => repo.remove('substrateMixes', id)} rows={mixes.map(m => ({
          id: m.id, title: m.name, meta: m.cec != null ? `CEC ${m.cec} cmol(+) kg⁻¹` : undefined,
          note: (
            <>
              <span className="flex h-3 rounded-sm overflow-hidden mb-2" aria-hidden="true">
                {m.components.map((c, i) => <span key={c.name} className={MIX_COLOURS[i % MIX_COLOURS.length]} style={{ width: `${c.pct}%` }} />)}
              </span>
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {m.components.map((c, i) => <span key={c.name} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-sm ${MIX_COLOURS[i % MIX_COLOURS.length]}`} />{c.name} <span className="font-mono-sci">{c.pct} %</span></span>)}
              </span>
            </>
          ),
        }))} />
      ))}

      <Sheet open={lf.open} title="New leachate test" onClose={lf.close}>
        <div className="grid grid-cols-2 gap-3">
          <TextField id="lt-date" type="date" label="Date" value={lf.values.date} onChange={lf.set('date')} />
          <FieldShell id="lt-batch" label="Batch"><BatchSelect id="lt-batch" value={lf.values.batchId} onChange={lf.set('batchId')} /></FieldShell>
        </div>
        <FieldGroup title="Irrigation water (in)">
          <div className="grid grid-cols-2 gap-3">
            <TextField id="lt-phin" type="number" step="0.01" label="pH" value={lf.values.phIn} onChange={lf.set('phIn')} placeholder="6.5" />
            <TextField id="lt-ecin" type="number" step="0.01" label="EC" unit="mS cm⁻¹" value={lf.values.ecIn} onChange={lf.set('ecIn')} placeholder="1.2" />
            <TextField id="lt-applied" type="number" step="1" label="Volume applied" unit="mL" value={lf.values.appliedMl} onChange={lf.set('appliedMl')} />
          </div>
        </FieldGroup>
        <FieldGroup title="Leachate (out)">
          <div className="grid grid-cols-2 gap-3">
            <TextField id="lt-phout" type="number" step="0.01" label="pH" value={lf.values.phOut} onChange={lf.set('phOut')} placeholder="5.8" />
            <TextField id="lt-ecout" type="number" step="0.01" label="EC" unit="mS cm⁻¹" value={lf.values.ecOut} onChange={lf.set('ecOut')} placeholder="2.4" />
            <TextField id="lt-vol" type="number" step="1" label="Volume collected" unit="mL" value={lf.values.volumeMl} onChange={lf.set('volumeMl')} />
          </div>
        </FieldGroup>
        <FormError message={lf.error} />
        <Button block onClick={saveTest} disabled={lf.saving}>Save test</Button>
      </Sheet>

      <Sheet open={mf.open} title="New substrate mix" onClose={mf.close}>
        <TextField id="mix-name" label="Mix name" value={mf.values.name} onChange={mf.set('name')} placeholder="Standard conifer mix" />
        <fieldset className="space-y-2">
          <legend className="sci-label">Components by volume <span className={`ml-1 font-mono-sci normal-case tracking-normal ${Math.abs(totalPct - 100) < 0.5 ? 'text-green-700' : 'text-red-600'}`}>({totalPct} % of 100)</span></legend>
          {mf.values.components.map((c, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input aria-label={`Component ${i + 1} name`} value={c.name} onChange={e => setComp(i, 'name', e.target.value)} className={`${controlCls} mt-0 flex-1`} />
              <input aria-label={`Component ${i + 1} share (%)`} type="number" value={c.pct} onChange={e => setComp(i, 'pct', e.target.value)} className={`${controlCls} mt-0 w-20 font-mono-sci`} />
              <button aria-label={`Remove component ${i + 1}`} onClick={() => mf.set('components')(mf.values.components.filter((_, j) => j !== i))} className="p-2 text-gray-500 hover:text-red-600"><X className="w-4 h-4" /></button>
            </div>
          ))}
          <Button size="sm" variant="secondary" onClick={() => mf.set('components')([...mf.values.components, { name: '', pct: '' }])}>Add component</Button>
        </fieldset>
        <TextField id="mix-cec" type="number" step="0.1" label="Cation exchange capacity" unit="cmol(+) kg⁻¹" value={mf.values.cec} onChange={mf.set('cec')} />
        <FormError message={mf.error} />
        <Button block onClick={saveMix} disabled={mf.saving}>Save mix</Button>
      </Sheet>
    </Page>
  );
};

export default SubstratePage;
