import { useState } from 'react';
import { Plus, X, FlaskConical, Shuffle, EyeOff, Sparkles, Loader2, Eye, RefreshCw } from 'lucide-react';
import { useCollection, useData } from '../../data/hooks';
import type { Experiment } from '../../data/schema';
import { aiService, AI_ENABLED } from '../../services/ai';
import { DESIGN_LABELS, designProblem, generateLayout, newSeed, type DesignType } from '../../utils/trialDesign';
import { Page, PageHeader, Section } from '../../components/ui/Page';
import { Chip, EmptyState, Notice } from '../../components/ui/Display';
import { SelectField, TextField, Label, controlCls } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import FormError from '../../components/data/FormError';
import { useRecordForm } from '../../components/ui/useRecordForm';
import { saveErrorMessage } from '../../data/errors';

const DESIGNS = Object.entries(DESIGN_LABELS).map(([value, label]) => ({ value, label }));

const repsLabel = (d: DesignType) => (d === 'CRD' ? 'Replicates per treatment' : d === 'Latin_Square' ? '' : 'Blocks (replicates)');

/** Treatment list editor: type a name, press Add or Enter. */
const LevelEditor = ({ id, label, levels, onChange }: { id: string; label: string; levels: string[]; onChange: (l: string[]) => void }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...levels, v]);
    setDraft('');
  };
  return (
    <div>
      <Label htmlFor={id} label={label} />
      <div className="flex gap-2">
        <input id={id} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="e.g. GA₃ 250 ppm" className={controlCls} />
        <Button variant="secondary" className="mt-1.5" onClick={add}>Add</Button>
      </div>
      {levels.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mt-2">
          {levels.map((t, i) => (
            <li key={`${t}-${i}`} className="flex items-center gap-1 text-xs bg-green-50 text-green-900 border border-green-200 rounded-sm px-2 py-1">
              <span className="font-mono-sci text-green-700">T{i + 1}</span> {t}
              <button onClick={() => onChange(levels.filter((_, j) => j !== i))} aria-label={`Remove ${t}`} className="ml-0.5 text-green-700 hover:text-red-600"><X className="w-3 h-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** Field map: one row per block (or Latin-square row), one cell per plot. */
const FieldMap = ({ exp, reveal }: { exp: Experiment; reveal: boolean }) => {
  const isLatin = exp.designType === 'Latin_Square';
  const rowsOf = (r: number) => exp.assignments.filter(a => (isLatin ? a.row === r : a.block === r)).sort((a, b) => (isLatin ? (a.col ?? 0) - (b.col ?? 0) : a.position - b.position));
  const rowIds = [...new Set(exp.assignments.map(a => (isLatin ? a.row ?? 0 : a.block)))].sort((a, b) => a - b);
  const show = (a: Experiment['assignments'][number]) =>
    exp.blindMode && !reveal ? `${a.code}${a.subCode ? `·${a.subCode}` : ''}` : `${a.treatment}${a.subTreatment ? ` · ${a.subTreatment}` : ''}`;
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="border-separate border-spacing-1 text-[11px]">
        <tbody>
          {rowIds.map(r => (
            <tr key={r}>
              <th scope="row" className="pr-1 text-left font-mono-sci text-gray-500 font-normal whitespace-nowrap">{isLatin ? `Row ${r}` : exp.designType === 'CRD' ? 'Plots' : `Block ${r}`}</th>
              {rowsOf(r).map(a => (
                <td key={`${a.block}-${a.position}-${a.row}-${a.col}`} className="min-w-18 max-w-32 align-top bg-green-50 border border-green-200 rounded-sm px-1.5 py-1 text-green-950">
                  <span className="block font-mono-sci text-[10px] text-green-700">#{a.plot ?? a.position}</span>
                  <span className="block truncate" title={show(a)}>{show(a)}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ExperimentCard = ({ exp }: { exp: Experiment }) => {
  const { repo } = useData();
  const [reveal, setReveal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const legacy = exp.layoutVersion !== 2;
  const plots = exp.assignments.length;

  const rerandomise = async () => {
    const seed = newSeed();
    // Pre-fix records kept the number of blocks in `blocks`; CRD used `replicates`.
    const replicates = exp.designType === 'Latin_Square' ? exp.treatments.length
      : exp.designType === 'CRD' || exp.layoutVersion === 2 ? exp.replicates : exp.blocks;
    const problem = designProblem({ designType: exp.designType, treatments: exp.treatments, replicates, subTreatments: exp.subTreatments });
    if (problem) { setError(problem); return; }
    try {
      await repo.update('experiments', exp.id, {
        seed, layoutVersion: 2, replicates, blocks: exp.designType === 'CRD' ? 1 : replicates,
        assignments: generateLayout({ designType: exp.designType, treatments: exp.treatments, replicates, subTreatments: exp.subTreatments, seed }),
      });
      setError(null);
    } catch (e) { setError(saveErrorMessage(e)); }
  };

  return (
    <Section>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{exp.name}</h3>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <Chip tone="leaf">{DESIGN_LABELS[exp.designType]}</Chip>
            {exp.blindMode && <Chip tone="warn"><EyeOff className="w-3 h-3 mr-1" />Blind codes</Chip>}
            {exp.isExample && <Chip>Example</Chip>}
          </div>
        </div>
        {!confirmDelete && <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete experiment"><X className="w-4 h-4" /></Button>}
      </div>

      <dl className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="bg-gray-50 rounded-sm p-2"><dt className="sci-label">Treatments</dt><dd className="font-mono-sci text-gray-900">{exp.treatments.length}{exp.subTreatments?.length ? ` × ${exp.subTreatments.length}` : ''}</dd></div>
        <div className="bg-gray-50 rounded-sm p-2"><dt className="sci-label">{exp.designType === 'Latin_Square' ? 'Rows × cols' : exp.designType === 'CRD' ? 'Replicates' : 'Blocks'}</dt><dd className="font-mono-sci text-gray-900">{exp.designType === 'Latin_Square' ? `${exp.treatments.length} × ${exp.treatments.length}` : exp.replicates}</dd></div>
        <div className="bg-gray-50 rounded-sm p-2"><dt className="sci-label">Plots</dt><dd className="font-mono-sci text-gray-900">{plots}</dd></div>
      </dl>

      {legacy && (
        <div className="mt-3">
          <Notice>
            This layout was made by an earlier version that randomised every design like an RCBD and ignored replicates. Re-randomise to get a correct {DESIGN_LABELS[exp.designType].toLowerCase()} layout.
            <div className="mt-2"><Button size="sm" variant="secondary" icon={<RefreshCw className="w-3.5 h-3.5" />} onClick={rerandomise}>Re-randomise</Button></div>
          </Notice>
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="sci-label flex items-center gap-1"><Shuffle className="w-3 h-3" /> Field map</h4>
          {exp.blindMode && (
            <Button size="sm" variant="ghost" icon={reveal ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} onClick={() => setReveal(r => !r)}>
              {reveal ? 'Hide key' : 'Reveal key'}
            </Button>
          )}
        </div>
        <FieldMap exp={exp} reveal={reveal} />
        {exp.blindMode && reveal && (
          <ul className="mt-2 text-xs text-gray-700 space-y-0.5">
            {exp.treatments.map((t, i) => <li key={t}><span className="font-mono-sci text-green-700">T{i + 1}</span> = {t}</li>)}
            {exp.subTreatments?.map((t, i) => <li key={t}><span className="font-mono-sci text-green-700">S{i + 1}</span> = {t}</li>)}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-gray-500 font-mono-sci mt-3">
        Created {exp.createdAt.slice(0, 10)}{exp.seed != null ? ` · seed ${exp.seed}` : ''}
      </p>
      <FormError message={error} />
      {confirmDelete && (
        <div className="mt-3 flex items-center justify-end gap-2 bg-red-50 border border-red-200 rounded-md p-2">
          <span className="text-xs text-red-800 mr-auto">Delete this experiment and its layout?</span>
          <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button size="sm" variant="danger" onClick={() => repo.remove('experiments', exp.id)}>Delete</Button>
        </div>
      )}
    </Section>
  );
};

type FormValues = { name: string; designType: DesignType; replicates: string; treatments: string[]; subTreatments: string[]; blindMode: boolean };

const ExperimentalDesignPage = () => {
  const { repo } = useData();
  const experiments = [...useCollection('experiments').items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const form = useRecordForm<FormValues>(() => ({ name: '', designType: 'RCBD', replicates: '4', treatments: [], subTreatments: [], blindMode: false }));
  const v = form.values;
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const suggest = async () => {
    if (!aiPrompt.trim()) return;
    setAiBusy(true);
    try {
      const r = await aiService.generateExperimentalDesign(aiPrompt);
      form.setValues(prev => ({
        ...prev,
        name: r.name ?? prev.name,
        designType: r.designType && r.designType in DESIGN_LABELS ? r.designType : prev.designType,
        replicates: r.replicates ? String(r.replicates) : prev.replicates,
        treatments: Array.isArray(r.treatments) ? r.treatments.map(String) : prev.treatments,
        subTreatments: Array.isArray(r.subTreatments) ? r.subTreatments.map(String) : prev.subTreatments,
      }));
      form.setError(null);
    } catch (e) {
      form.setError(`Suggestion failed: ${(e as Error).message}`);
    } finally {
      setAiBusy(false);
    }
  };

  const save = () =>
    form.submit(async () => {
      const t = v.treatments;
      const isLatin = v.designType === 'Latin_Square';
      const replicates = isLatin ? t.length : Number(v.replicates);
      const subTreatments = v.designType === 'Split_Plot' ? v.subTreatments : undefined;
      if (!v.name.trim()) throw new Error('Enter an experiment name.');
      const problem = designProblem({ designType: v.designType, treatments: t, replicates, subTreatments });
      if (problem) throw new Error(problem);
      const seed = newSeed();
      await repo.add('experiments', {
        name: v.name, designType: v.designType, treatments: t, subTreatments, replicates,
        blocks: v.designType === 'CRD' ? 1 : replicates,
        assignments: generateLayout({ designType: v.designType, treatments: t, replicates, subTreatments, seed }),
        blindMode: v.blindMode, seed, layoutVersion: 2,
      });
    });

  return (
    <Page>
      <PageHeader
        title="Experimental design"
        subtitle="Randomised layouts for CRD, RCBD, Latin square and split-plot trials."
        back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={form.openForm}>New</Button>}
      />

      {experiments.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No experiments yet" text="Create a trial to get a randomised field map with blind treatment codes if needed." action={<Button onClick={form.openForm}>New experiment</Button>} />
      ) : (
        <div className="space-y-4">{experiments.map(e => <ExperimentCard key={e.id} exp={e} />)}</div>
      )}

      <Sheet open={form.open} title="New experiment" onClose={form.close}>
        {AI_ENABLED && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-2">
            <Label htmlFor="exp-ai" label="Describe the trial (AI suggestion)" />
            <div className="flex gap-2">
              <input id="exp-ai" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Compare 3 substrates on Pinus seedling growth" className={controlCls} />
              <Button variant="secondary" className="mt-1.5" onClick={suggest} disabled={aiBusy} icon={aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}>Suggest</Button>
            </div>
            <p className="text-[11px] text-gray-600">Check the suggestion before creating the layout.</p>
          </div>
        )}
        <TextField id="exp-name" label="Experiment name" value={v.name} onChange={form.set('name')} placeholder="Substrate × nitrogen trial 2026" />
        <SelectField id="exp-design" label="Design" value={v.designType} onChange={d => form.set('designType')(d as DesignType)} options={DESIGNS} />
        <LevelEditor id="exp-treatments" label={v.designType === 'Split_Plot' ? 'Main-plot levels' : 'Treatments'} levels={v.treatments} onChange={form.set('treatments')} />
        {v.designType === 'Split_Plot' && <LevelEditor id="exp-sub" label="Sub-plot levels" levels={v.subTreatments} onChange={form.set('subTreatments')} />}
        {v.designType === 'Latin_Square'
          ? <p className="text-xs text-gray-600">A Latin square uses as many rows and columns as treatments ({v.treatments.length || 't'} × {v.treatments.length || 't'}).</p>
          : <TextField id="exp-reps" type="number" step="1" min={2} label={repsLabel(v.designType)} value={v.replicates} onChange={form.set('replicates')} />}
        <label className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-md p-3 cursor-pointer">
          <input type="checkbox" checked={v.blindMode} onChange={e => form.set('blindMode')(e.target.checked)} className="mt-0.5 w-4 h-4 accent-green-700" />
          <span className="text-sm text-gray-800">Blind codes<span className="block text-xs text-gray-500">Show T1, T2 … on the field map so people recording data don't see treatment names.</span></span>
        </label>
        <FormError message={form.error} />
        <Button block onClick={save} disabled={form.saving} icon={<Shuffle className="w-4 h-4" />}>Create and randomise</Button>
      </Sheet>
    </Page>
  );
};

export default ExperimentalDesignPage;
