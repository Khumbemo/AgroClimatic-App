import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { AnovaResult, FactorComparison } from '../../utils/anova';

const fmtP = (p: number | undefined) => (p == null ? '' : p < 0.001 ? '< 0.001' : p.toFixed(3));
// Significant figures without trailing zeros; one decimal for large values
const fmt = (v: number | undefined, d = 3) =>
  v == null || !Number.isFinite(v) ? '' : Math.abs(v) >= 1000 ? v.toFixed(1) : String(Number(v.toPrecision(Math.max(d, 3))));
const stars = (p?: number) => (p == null ? '' : p < 0.001 ? '***' : p < 0.01 ? '**' : p < 0.05 ? '*' : 'ns');

/** Means with standard errors drawn to scale from zero, plus Tukey letters. */
const MeansChart = ({ c, unit, label }: { c: FactorComparison; unit: string; label: (level: string) => string }) => {
  const max = Math.max(...c.means.map(m => m.mean + m.se), 0);
  const min = Math.min(...c.means.map(m => m.mean - m.se), 0);
  const span = max - min || 1;
  const pos = (v: number) => ((v - min) / span) * 100;
  return (
    <div className="space-y-1.5" role="img" aria-label={`${c.factor} means with standard errors`}>
      {c.means.map(m => (
        <div key={m.level} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate text-gray-700" title={label(m.level)}>{label(m.level)}</span>
          <span className="relative h-4 bg-gray-100 rounded-xs">
            <span className="absolute inset-y-0 bg-green-600 rounded-xs" style={{ left: `${pos(Math.min(0, m.mean))}%`, width: `${Math.abs(pos(m.mean) - pos(0))}%` }} />
            <span className="absolute top-1/2 h-px bg-gray-900" style={{ left: `${pos(m.mean - m.se)}%`, width: `${pos(m.mean + m.se) - pos(m.mean - m.se)}%` }} />
            <span className="absolute top-0.5 bottom-0.5 w-px bg-gray-900" style={{ left: `${pos(m.mean - m.se)}%` }} />
            <span className="absolute top-0.5 bottom-0.5 w-px bg-gray-900" style={{ left: `${pos(m.mean + m.se)}%` }} />
          </span>
          <span className="font-mono-sci text-gray-900 whitespace-nowrap">{fmt(m.mean)} <span className="text-green-700 font-semibold">{m.letters}</span></span>
        </div>
      ))}
      <p className="text-[10px] text-gray-500 font-mono-sci">Bars from 0; whiskers ± 1 SE{unit ? ` · ${unit}` : ''}</p>
    </div>
  );
};

type Props = { result: AnovaResult; unit: string; label: (level: string) => string };

const AnalysisView = ({ result, unit, label }: Props) => {
  const interaction = result.table.find(r => r.source === 'A × B');
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono-sci">
          <caption className="text-left sci-label mb-1">Analysis of variance</caption>
          <thead>
            <tr className="text-gray-500 border-b border-gray-200">
              <th scope="col" className="text-left font-normal py-1 pr-2">Source</th>
              <th scope="col" className="text-right font-normal px-1.5">df</th>
              <th scope="col" className="text-right font-normal px-1.5">SS</th>
              <th scope="col" className="hidden sm:table-cell text-right font-normal px-2">MS</th>
              <th scope="col" className="text-right font-normal px-1.5">F</th>
              <th scope="col" className="text-right font-normal pl-2">p</th>
            </tr>
          </thead>
          <tbody>
            {result.table.map(r => (
              <tr key={r.source} className={`border-b border-gray-100 ${r.source === 'Total' ? 'text-gray-500' : 'text-gray-900'}`}>
                <th scope="row" className="text-left font-normal py-1 pr-2 font-sans whitespace-nowrap">{r.source}</th>
                <td className="text-right px-1.5">{r.df}</td>
                <td className="text-right px-1.5">{fmt(r.ss, 4)}</td>
                <td className="hidden sm:table-cell text-right px-2">{fmt(r.ms, 4)}</td>
                <td className="text-right px-1.5">{fmt(r.f)}</td>
                <td className="text-right pl-2 whitespace-nowrap">{fmtP(r.p)} {r.p != null && <span className="text-green-700">{stars(r.p)}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[10px] text-gray-500 mt-1">
          <span className="sm:hidden">MS = SS / df. </span>n = {result.n} · grand mean {fmt(result.grandMean)} {unit} · {result.cv.map(c => `${c.label} ${c.value.toFixed(1)} %`).join(' · ')}
          {result.design === 'Split_Plot' && ' · main plots tested against error (a), sub-plots against error (b)'}
        </p>
      </div>

      {interaction?.p != null && interaction.p < 0.05 && (
        <p className="flex gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> The A × B interaction is significant (p {fmtP(interaction.p)}), so the effect of one factor depends on the other. Interpret main-effect means with care.
        </p>
      )}

      {result.comparisons.map(c => (
        <div key={c.factor} className="space-y-2">
          <h4 className="sci-label">{c.factor} means · Tukey HSD</h4>
          <MeansChart c={c} unit={unit} label={label} />
          <p className="text-[11px] text-gray-600">
            Means sharing a letter are not significantly different (α = 0.05; error df {c.errorDf}).
            {c.anovaP >= 0.05 && ` The ANOVA F-test for this factor is not significant (p ${fmtP(c.anovaP)}).`}
          </p>
        </div>
      ))}

      <div className="space-y-1.5">
        <h4 className="sci-label">Assumption checks (residuals)</h4>
        {[
          { name: 'Normality', test: 'Shapiro–Wilk', r: result.normality, ok: 'Residuals are consistent with a normal distribution', bad: 'Residuals depart from normality; consider a transformation (e.g. log for counts, arcsine-square-root for proportions)' },
          { name: 'Equal variance', test: 'Brown–Forsythe', r: result.equalVariance, ok: 'Group variances are similar', bad: 'Group variances differ; consider a transformation' },
        ].map(a => (
          <p key={a.name} className="flex gap-2 items-start text-xs text-gray-700">
            {a.r == null ? <span className="w-4 h-4 shrink-0" /> : a.r.p >= 0.05 ? <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
            <span>
              <span className="font-medium">{a.name}</span>{' '}
              {a.r == null ? '— not enough data to test.' : <>({a.test} {a.name === 'Normality' ? 'W' : 'F'} = {a.r.statistic.toFixed(3)}, p = {fmtP(a.r.p)}): {a.r.p >= 0.05 ? a.ok : a.bad}.</>}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
};

export default AnalysisView;
