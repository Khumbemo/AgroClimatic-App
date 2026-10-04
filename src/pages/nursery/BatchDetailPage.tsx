import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Info, Beaker, TrendingUp, Pencil, AlertTriangle, Sprout, Ruler, Droplets, Bug, Skull, FlaskConical } from 'lucide-react';
import GrowthChart from '../../components/nursery/GrowthChart';
import GerminationChart from '../../components/nursery/GerminationChart';
import { cn } from '../../utils/cn';
import { calculateRGR, cumulativeGermination, daysAfterSowing, dicksonQualityIndex, germinationEnergy, germinationPercent, meanGerminationTime, sturdinessQuotient } from '../../utils/calculations';
import { useBatchIndex, useCollection } from '../../data/hooks';

const daysBetween = (from: string, to: string) => daysAfterSowing(to, from);

const Stat = ({ label, value, unit, note }: { label: string; value: string; unit?: string; note?: string }) => (
  <div className="bento-card p-4">
    <p className="sci-label">{label}</p>
    <p className="mt-1 flex items-baseline gap-1">
      <span className="font-mono-sci text-xl font-medium text-gray-900">{value}</span>
      {unit && <span className="font-mono-sci text-xs text-gray-500">{unit}</span>}
    </p>
    {note && <p className="text-[11px] text-gray-500 mt-0.5">{note}</p>}
  </div>
);

const BatchDetailPage: React.FC = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'info' | 'germination' | 'growth'>('info');
  const { byId, speciesName } = useBatchIndex();
  const { ready } = useCollection('batches');
  const { items: seedLots } = useCollection('seedLots');
  const counts = useCollection('germinationCounts').items.filter(c => c.batchId === id);
  const growth = useCollection('growthMeasurements').items.filter(g => g.batchId === id);
  const fert = useCollection('fertigationEvents').items.filter(r => r.batchId === id);
  const pests = useCollection('pestObservations').items.filter(r => r.batchId === id);
  const deaths = useCollection('mortalityEvents').items.filter(r => r.batchId === id);
  const presow = useCollection('preSowingTreatments').items.filter(r => r.batchId === id);
  const irrigation = useCollection('irrigationEvents').items.filter(r => r.batchId === id);
  const leachate = useCollection('leachateTests').items.filter(r => r.batchId === id);

  const batch = id ? byId.get(id) : undefined;
  if (!ready) return <p className="text-sm text-gray-500">Loading…</p>;
  if (!batch) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">This batch doesn't exist or was deleted.</p>
        <Link to="/nursery" className="text-sm font-medium text-green-700">Back to batches</Link>
      </div>
    );
  }

  const species = batch.speciesId ? speciesName.get(batch.speciesId) : undefined;
  const lot = batch.seedLotId ? seedLots.find(l => l.id === batch.seedLotId) : undefined;

  // --- germination: days after sowing, daily and cumulative ---
  const germ = [...counts].sort((a, b) => a.date.localeCompare(b.date));
  const totalGerm = germ.reduce((s, c) => s + c.count, 0);
  const germPct = germinationPercent(germ, batch.seedsSown ?? 0);
  const sowing = batch.sowingDate;
  const germLabels = germ.map(c => (sowing ? `D${daysBetween(sowing, c.date)}` : c.date.slice(5)));
  const cumPct = cumulativeGermination(germ, batch.seedsSown ?? 0).map(x => +x.toFixed(1));
  const mgt = sowing ? meanGerminationTime(germ, sowing) : null;
  const energy = sowing ? germinationEnergy(germ, batch.seedsSown ?? 0, sowing, 7) : null;

  // --- growth ---
  const grow = [...growth].sort((a, b) => a.date.localeCompare(b.date));
  const first = grow[0];
  const last = grow[grow.length - 1];
  const spanDays = first && last ? daysBetween(first.date, last.date) : 0;
  // Relative growth rate on mean height: (ln H₂ − ln H₁)/Δt
  const rgrHeight = first && last && spanDays > 0 ? calculateRGR(first.avgHeightCm, last.avgHeightCm, spanDays) : null;
  // Dickson quality index from the latest measurement with dry masses
  const withMass = [...grow].reverse().find(g => g.shootDryWeight && g.rootDryWeight);
  const dqi = withMass ? dicksonQualityIndex(withMass.avgHeightCm, withMass.avgRCDmm, withMass.shootDryWeight!, withMass.rootDryWeight!) : null;
  const dead = deaths.reduce((s, d) => s + d.count, 0);

  const records = [
    { label: 'Germination counts', n: counts.length, to: '/tools/germination', icon: Sprout },
    { label: 'Growth measurements', n: growth.length, to: '/tools/morphometrics', icon: Ruler },
    { label: 'Fertigation events', n: fert.length, to: '/tools/treatments?tab=fertilizer', icon: Droplets },
    { label: 'Pest observations', n: pests.length, to: '/tools/treatments?tab=pest', icon: Bug },
    { label: 'Pre-sowing treatments', n: presow.length, to: '/tools/treatments?tab=presowing', icon: FlaskConical },
    { label: 'Mortality events', n: deaths.length, to: '/tools/mortality', icon: Skull },
    { label: 'Irrigation events', n: irrigation.length, to: '/tools/irrigation', icon: Droplets },
    { label: 'Leachate tests', n: leachate.length, to: '/tools/substrate', icon: FlaskConical },
  ];

  return (
    <div className="space-y-5 pb-8 animate-page-in">
      <header className="flex items-center gap-3">
        <Link to="/nursery" aria-label="Back to batches" className="p-2 -ml-2 rounded-md text-gray-500 hover:bg-green-50 hover:text-green-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 font-mono-sci">{batch.batchNumber}</h1>
          <p className="text-xs text-gray-500 italic">{species ?? 'Species not set'}</p>
        </div>
        <Link to={`/nursery/batch/${batch.id}/edit`} className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:border-green-600 hover:text-green-800">
          <Pencil className="w-4 h-4" /> Edit
        </Link>
      </header>

      {batch.needsReview && (
        <p className="flex gap-2 items-start text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-md p-3">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          Created from your earlier records. Use Edit to add the species, sowing date and seeds sown.
        </p>
      )}
      {batch.isExample && <p className="text-xs text-gray-500">Example batch included with the demo.</p>}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Sown" value={batch.seedsSown?.toLocaleString() ?? '—'} unit={batch.seedsSown ? 'seeds' : undefined} />
        <Stat label="Germination" value={germPct != null ? germPct.toFixed(1) : '—'} unit={germPct != null ? '%' : undefined} />
        <Stat label="RGR height" value={rgrHeight != null ? rgrHeight.toFixed(3) : '—'} unit={rgrHeight != null ? 'd⁻¹' : undefined} />
      </div>

      <div className="flex bg-gray-100 p-1 rounded-lg" role="tablist">
        {(['info', 'germination', 'growth'] as const).map(tab => (
          <button key={tab} role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={cn('flex-1 py-2 text-xs font-medium capitalize rounded-md flex items-center justify-center gap-1.5 transition-colors', activeTab === tab ? 'bg-white text-green-800 border border-gray-200' : 'text-gray-500')}>
            {tab === 'info' && <Info className="w-3.5 h-3.5" />}
            {tab === 'germination' && <Beaker className="w-3.5 h-3.5" />}
            {tab === 'growth' && <TrendingUp className="w-3.5 h-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div className="space-y-4">
          <div className="bento-card">
            <h3 className="sci-section-title mb-3">Sowing record</h3>
            <dl className="grid grid-cols-2 gap-y-4 gap-x-3 text-sm">
              <div><dt className="sci-label">Sowing date</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{batch.sowingDate ?? '—'}</dd></div>
              <div><dt className="sci-label">Stage</dt><dd className="text-gray-900 mt-0.5 capitalize">{batch.status}</dd></div>
              <div><dt className="sci-label">Bed / tray</dt><dd className="text-gray-900 mt-0.5">{batch.bedTrayNumber || '—'}</dd></div>
              <div><dt className="sci-label">Area sown</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{batch.areaSownM2 != null ? `${batch.areaSownM2} m²` : '—'}</dd></div>
              <div><dt className="sci-label">Substrate</dt><dd className="text-gray-900 mt-0.5">{batch.substrateMix || '—'}</dd></div>
              <div><dt className="sci-label">Seed lot</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{lot?.lotNumber ?? '—'}</dd></div>
              <div><dt className="sci-label">Recorded deaths</dt><dd className="font-mono-sci text-gray-900 mt-0.5">{dead}</dd></div>
            </dl>
            {batch.notes && <p className="text-sm text-gray-600 mt-4 border-t border-gray-100 pt-3">{batch.notes}</p>}
          </div>

          <div>
            <h3 className="sci-section-title mb-2">Linked records</h3>
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
              {records.map(r => (
                <Link key={r.label} to={r.to} className="flex items-center gap-3 px-4 py-2.5 hover:bg-green-50">
                  <r.icon className="w-4 h-4 text-green-700" strokeWidth={1.8} />
                  <span className="flex-1 text-sm text-gray-800">{r.label}</span>
                  <span className="font-mono-sci text-sm text-gray-500">{r.n}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'germination' && (
        <div className="space-y-4">
          {germ.length === 0 ? (
            <div className="bento-card text-center text-sm text-gray-500">No germination counts for this batch yet. Record them in the <Link className="text-green-700 font-medium" to="/tools/germination">Germination Tracker</Link>.</div>
          ) : (
            <div className="bento-card h-72"><GerminationChart labels={germLabels} dailyCount={germ.map(c => c.count)} cumulativePercent={cumPct} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Mean germination time" value={mgt != null ? mgt.toFixed(1) : '—'} unit={mgt != null ? 'days' : undefined} note={sowing ? 'From sowing date' : 'Needs a sowing date'} />
            <Stat label="Energy (day 7)" value={energy != null ? energy.toFixed(1) : '—'} unit={energy != null ? '%' : undefined} note={`${totalGerm.toLocaleString()} germinated in total`} />
          </div>
        </div>
      )}

      {activeTab === 'growth' && (
        <div className="space-y-4">
          {grow.length === 0 ? (
            <div className="bento-card text-center text-sm text-gray-500">No growth measurements for this batch yet. Add them in <Link className="text-green-700 font-medium" to="/tools/morphometrics">Morphometrics</Link>.</div>
          ) : (
            <div className="bento-card h-72"><GrowthChart labels={grow.map(g => g.date.slice(5))} heightData={grow.map(g => g.avgHeightCm)} rcdData={grow.map(g => g.avgRCDmm)} /></div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Dickson quality index" value={dqi != null ? dqi.toFixed(2) : '—'} note={dqi != null ? `From ${withMass!.date}` : 'Needs shoot and root dry mass'} />
            <Stat label="Sturdiness H/D" value={last ? (sturdinessQuotient(last.avgHeightCm, last.avgRCDmm)?.toFixed(1) ?? '—') : '—'} unit={last ? 'cm mm⁻¹' : undefined} />
          </div>
        </div>
      )}
    </div>
  );
};
export default BatchDetailPage;
