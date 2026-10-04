import { useMemo, useState } from 'react';
import { BarChart3, Pencil, Plus, Trash2, Copy } from 'lucide-react';
import { useCollection, useData } from '../../data/hooks';
import type { Experiment, TrialVariable } from '../../data/schema';
import { AnalysisError, analyse, type AnovaResult, type Observation } from '../../utils/anova';
import Button from '../ui/Button';
import Sheet from '../ui/Sheet';
import { TextField, controlCls } from '../ui/Field';
import FormError from '../data/FormError';
import { saveErrorMessage } from '../../data/errors';
import AnalysisView from './AnalysisView';

type Plot = Experiment['assignments'][number] & { plotNo: number };

/** Plots in field order with a stable plot number (older layouts had none stored). */
const plotsOf = (exp: Experiment): Plot[] => exp.assignments.map((a, i) => ({ ...a, plotNo: a.plot ?? i + 1 }));

const observations = (exp: Experiment, v: TrialVariable): Observation[] =>
  plotsOf(exp)
    .filter(p => v.values[String(p.plotNo)] !== undefined)
    .map(p => ({ block: p.block, row: p.row, col: p.col, treatment: p.treatment, subTreatment: p.subTreatment, value: v.values[String(p.plotNo)] }));

/** Tab-separated plot data and ANOVA, for pasting into a spreadsheet or paper. */
const toTsv = (exp: Experiment, v: TrialVariable, r: AnovaResult | null) => {
  const lines = [`${exp.name} — ${v.name}${v.unit ? ` (${v.unit})` : ''}`, '', ['Plot', 'Block', 'Row', 'Column', 'Treatment', 'Sub-plot', v.name].join('\t')];
  for (const p of plotsOf(exp)) lines.push([p.plotNo, p.block, p.row ?? '', p.col ?? '', p.treatment, p.subTreatment ?? '', v.values[String(p.plotNo)] ?? ''].join('\t'));
  if (r) {
    lines.push('', ['Source', 'df', 'SS', 'MS', 'F', 'p'].join('\t'));
    for (const t of r.table) lines.push([t.source, t.df, t.ss, t.ms ?? '', t.f ?? '', t.p ?? ''].join('\t'));
    for (const c of r.comparisons) {
      lines.push('', `${c.factor}\tMean\tSE\tn\tTukey group`);
      for (const m of c.means) lines.push([m.level, m.mean, m.se, m.n, m.letters].join('\t'));
    }
  }
  return lines.join('\n');
};

const VariableCard = ({ exp, v, onEdit, reveal }: { exp: Experiment; v: TrialVariable; onEdit: () => void; reveal: boolean }) => {
  const { repo } = useData();
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const total = exp.assignments.length;
  const filled = Object.keys(v.values).length;
  const { result, error } = useMemo(() => {
    try { return { result: analyse(exp.designType, observations(exp, v)), error: null }; }
    catch (e) { return { result: null, error: e instanceof AnalysisError ? e.message : `Analysis failed: ${(e as Error).message}` }; }
  }, [exp, v]);
  // Treatment names are shown in results; in blind trials the code is kept alongside.
  const codeOf = new Map([...exp.assignments.map(a => [a.treatment, a.code] as const), ...exp.assignments.filter(a => a.subTreatment).map(a => [a.subTreatment!, a.subCode!] as const)]);
  const label = (level: string) => (exp.blindMode && !reveal ? codeOf.get(level) ?? level : exp.blindMode ? `${level} (${codeOf.get(level)})` : level);

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{v.name}{v.unit && <span className="font-normal text-gray-500"> ({v.unit})</span>}</h4>
          <p className="text-[11px] text-gray-500 font-mono-sci">{filled}/{total} plots recorded</p>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={async () => {
            try { await navigator.clipboard.writeText(toTsv(exp, v, result)); setCopied('Copied as a table.'); } catch { setCopied('Clipboard not available here.'); }
          }} aria-label="Copy data and results"><Copy className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${v.name}`}><Pencil className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirm(true)} aria-label={`Delete ${v.name}`}><Trash2 className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
      {copied && <p className="text-[11px] text-green-800" role="status">{copied}</p>}
      {confirm && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md p-2">
          <span className="text-xs text-red-800 mr-auto">Delete “{v.name}” and its {filled} values?</span>
          <Button size="sm" variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
          <Button size="sm" variant="danger" onClick={() => repo.remove('trialVariables', v.id)}>Delete</Button>
        </div>
      )}
      {exp.blindMode && !reveal && result && <p className="text-[11px] text-gray-500">Blind trial: results use treatment codes. Use “Reveal key” above to show names.</p>}
      {result ? <AnalysisView result={result} unit={v.unit} label={label} /> : <p className="text-xs text-gray-600">{error}</p>}
    </div>
  );
};

/** Data entry and analysis for an experiment's measured variables. */
const TrialResults = ({ exp, reveal }: { exp: Experiment; reveal: boolean }) => {
  const { repo } = useData();
  const variables = useCollection('trialVariables').items.filter(v => v.experimentId === exp.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [editing, setEditing] = useState<TrialVariable | 'new' | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const plots = plotsOf(exp);

  const open = (v: TrialVariable | 'new') => {
    setEditing(v);
    setError(null);
    if (v === 'new') { setName(''); setUnit(''); setValues({}); }
    else { setName(v.name); setUnit(v.unit); setValues(Object.fromEntries(Object.entries(v.values).map(([k, x]) => [k, String(x)]))); }
  };

  const save = async () => {
    const parsed: Record<string, number> = {};
    for (const [k, raw] of Object.entries(values)) {
      if (raw.trim() === '') continue;
      const x = Number(raw);
      if (!Number.isFinite(x)) { setError(`Plot ${k}: “${raw}” is not a number.`); return; }
      parsed[k] = x;
    }
    try {
      if (editing === 'new') await repo.add('trialVariables', { experimentId: exp.id, name, unit, values: parsed });
      else if (editing) await repo.update('trialVariables', editing.id, { name, unit, values: parsed });
      setEditing(null);
    } catch (e) { setError(saveErrorMessage(e)); }
  };

  // In blind trials, data entry shows codes so recorders stay blind.
  const plotLabel = (p: Plot) =>
    exp.blindMode && !reveal ? `${p.code}${p.subCode ? ` · ${p.subCode}` : ''}` : `${p.treatment}${p.subTreatment ? ` · ${p.subTreatment}` : ''}`;
  const where = (p: Plot) => (exp.designType === 'Latin_Square' ? `R${p.row} C${p.col}` : exp.designType === 'CRD' ? '' : `B${p.block}`);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="sci-label flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Results and analysis</h4>
        <Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => open('new')}>Record results</Button>
      </div>
      {variables.length === 0 ? (
        <p className="text-xs text-gray-600">Record a measured variable (e.g. height at 90 days) for each plot to get the analysis of variance, Tukey comparisons and assumption checks.</p>
      ) : variables.map(v => <VariableCard key={v.id} exp={exp} v={v} reveal={reveal} onEdit={() => open(v)} />)}

      <Sheet open={editing !== null} title={editing === 'new' ? `Record results · ${exp.name}` : `Edit ${name}`} onClose={() => setEditing(null)}>
        <div className="grid grid-cols-2 gap-3">
          <TextField id="tv-name" label="Variable" value={name} onChange={setName} placeholder="Height at 90 days" />
          <TextField id="tv-unit" label="Unit" value={unit} onChange={setUnit} placeholder="cm" />
        </div>
        <div>
          <p className="sci-label mb-1">Values per plot <span className="normal-case tracking-normal text-gray-500">(leave blank if missing)</span></p>
          <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-[45vh] overflow-y-auto">
            {plots.map(p => (
              <div key={p.plotNo} className="grid grid-cols-[3rem_3.5rem_1fr_6rem] items-center gap-2 px-2 py-1.5">
                <span className="font-mono-sci text-xs text-gray-500">#{p.plotNo}</span>
                <span className="font-mono-sci text-[11px] text-gray-500">{where(p)}</span>
                <span className="text-xs text-gray-800 truncate">{plotLabel(p)}</span>
                <input
                  aria-label={`Plot ${p.plotNo} value`}
                  inputMode="decimal"
                  value={values[String(p.plotNo)] ?? ''}
                  onChange={e => setValues(vs => ({ ...vs, [String(p.plotNo)]: e.target.value }))}
                  className={`${controlCls} mt-0 py-1.5 font-mono-sci`}
                />
              </div>
            ))}
          </div>
        </div>
        <FormError message={error} />
        <Button block onClick={save}>Save results</Button>
      </Sheet>
    </div>
  );
};

export default TrialResults;
