import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ThermometerSun, Droplets, Sun, Wind, Sprout, Ruler, Plus, ChevronRight, CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { useCollection, byDateDesc } from '../../data/hooks';
import { calculateVPD, dailyLightIntegral, daysAfterSowing, germinationPercent, getVpdBand } from '../../utils/calculations';
import VpdScale from '../../components/sci/VpdScale';
import { vpdToneChip } from '../../components/sci/vpdTone';
import MigrationNotice from '../../components/data/MigrationNotice';
import { Page, Section } from '../../components/ui/Page';
import { Chip, Stat, StatGrid } from '../../components/ui/Display';

type Alert = { level: 'critical' | 'warn'; text: string; to: string };
const DAY = 86_400_000;

const HomePage = () => {
  const [now] = useState(() => Date.now());
  const todayIso = new Date(now).toISOString().slice(0, 10);
  const { items: climate } = useCollection('climateReadings');
  const { items: batches } = useCollection('batches');
  const { items: lots } = useCollection('seedLots');
  const { items: counts } = useCollection('germinationCounts');
  const { items: calibrations } = useCollection('calibrations');
  const { items: pests } = useCollection('pestObservations');

  const reading = [...climate].sort(byDateDesc)[0];
  const vpd = reading ? calculateVPD(reading.tempMean, reading.humidity) : null;
  const band = vpd != null ? getVpdBand(vpd) : null;
  const readingAge = reading ? daysAfterSowing(todayIso, reading.date) : null;

  const active = batches.filter(b => b.status !== 'outplanted');
  const inStock = lots.filter(l => (l.stockKg ?? 0) > 0);
  const germByBatch = active
    .map(b => germinationPercent(counts.filter(c => c.batchId === b.id), b.seedsSown ?? 0))
    .filter((x): x is number => x != null && x > 0);
  const meanGerm = germByBatch.length ? germByBatch.reduce((s, x) => s + x, 0) / germByBatch.length : null;

  // Things that need attention, computed from the records
  const alerts: Alert[] = [];
  const review = batches.filter(b => b.needsReview).length;
  if (review) alerts.push({ level: 'warn', text: `${review} batch${review === 1 ? '' : 'es'} created from earlier records need species, sowing date and seeds sown`, to: '/nursery' });
  const latestCal = [...new Map([...calibrations].sort((a, b) => a.calibrationDate.localeCompare(b.calibrationDate)).map(c => [c.instrumentName.trim().toLowerCase(), c])).values()];
  const overdue = latestCal.filter(c => c.nextDueDate && Date.parse(`${c.nextDueDate}T00:00:00Z`) < now);
  const dueSoon = latestCal.filter(c => c.nextDueDate && Date.parse(`${c.nextDueDate}T00:00:00Z`) >= now && Date.parse(`${c.nextDueDate}T00:00:00Z`) - now <= 14 * DAY);
  if (overdue.length) alerts.push({ level: 'critical', text: `Calibration overdue: ${overdue.map(c => c.instrumentName).join(', ')}`, to: '/tools/audit' });
  if (dueSoon.length) alerts.push({ level: 'warn', text: `Calibration due within 14 days: ${dueSoon.map(c => c.instrumentName).join(', ')}`, to: '/tools/audit' });
  if (band && (band.tone === 'critical' || band.tone === 'water')) alerts.push({ level: band.tone === 'critical' ? 'critical' : 'warn', text: `Latest VPD ${vpd!.toFixed(2)} kPa: ${band.label.toLowerCase()}`, to: '/tools/environmental' });
  if (readingAge != null && readingAge > 3) alerts.push({ level: 'warn', text: `No climate reading for ${readingAge} days`, to: '/tools/environmental' });
  const noCounts = active.filter(b => b.sowingDate && (b.status === 'sown' || b.status === 'germinating') && daysAfterSowing(todayIso, b.sowingDate) > 14 && !counts.some(c => c.batchId === b.id));
  if (noCounts.length) alerts.push({ level: 'warn', text: `No germination counts yet for ${noCounts.map(b => b.batchNumber).join(', ')} (sown over 14 days ago)`, to: '/tools/germination' });
  const severe = pests.filter(p => p.severityScale >= 4 && daysAfterSowing(todayIso, p.date) <= 14);
  if (severe.length) alerts.push({ level: 'critical', text: `Severe pest or disease in the last 14 days: ${[...new Set(severe.map(p => p.pestDiseaseName))].join(', ')}`, to: '/tools/treatments?tab=pest' });

  return (
    <Page>
      <MigrationNotice />

      <Section flush>
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Greenhouse climate</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">{reading ? `Latest reading · ${reading.date}` : 'No readings recorded yet'}</p>
          </div>
          {reading?.isExample && <Chip>Example data</Chip>}
        </div>
        {reading && vpd != null && band ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4">
              {[
                { label: 'Air temp', icon: ThermometerSun, value: reading.tempMean.toFixed(1), unit: '°C', note: `${reading.tempMin}–${reading.tempMax} °C` },
                { label: 'Rel. humidity', icon: Droplets, value: String(reading.humidity), unit: '%', note: '' },
                { label: 'PAR', icon: Sun, value: reading.lightIntensity ? String(reading.lightIntensity) : '—', unit: 'µmol m⁻² s⁻¹', note: reading.lightIntensity && reading.photoperiod ? `DLI ${dailyLightIntegral(reading.lightIntensity, reading.photoperiod).toFixed(1)} mol m⁻² d⁻¹` : '' },
                { label: 'VPD', icon: Wind, value: vpd.toFixed(2), unit: 'kPa', note: band.label },
              ].map((r, i) => (
                <div key={r.label} className={`p-4 border-gray-200 min-w-0 ${i % 2 === 0 ? 'border-r' : 'sm:border-r'} ${i < 2 ? 'border-b sm:border-b-0' : ''} ${i === 3 ? 'sm:border-r-0' : ''}`}>
                  <div className="sci-label flex items-center gap-1.5"><r.icon className="w-3.5 h-3.5" strokeWidth={2} />{r.label}</div>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1">
                    <span className="font-mono-sci text-2xl font-medium text-gray-900">{r.value}</span>
                    <span className="font-mono-sci text-xs text-gray-500">{r.unit}</span>
                  </div>
                  {r.note && <div className="text-[11px] text-gray-500 mt-0.5">{r.note}</div>}
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 space-y-3">
              <div className="flex justify-between items-center gap-3">
                <span className="sci-label">Vapour pressure deficit</span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-sm border ${vpdToneChip[band.tone]}`}>{band.label}</span>
              </div>
              <VpdScale value={vpd} />
              <p className="text-[11px] text-gray-500">Tetens equation at the daily mean temperature ({reading.tempMean} °C) and {reading.humidity} % RH.</p>
            </div>
          </>
        ) : (
          <div className="p-4 text-sm text-gray-600">Record a daily reading to see temperature, humidity, light and VPD here. <Link to="/tools/environmental" className="font-medium text-green-700">Open environmental logs</Link></div>
        )}
      </Section>

      <StatGrid cols={3}>
        <Stat label="Active batches" value={active.length} note={`${batches.length - active.length} outplanted`} />
        <Stat label="Seed lots in stock" value={inStock.length} note={`${inStock.reduce((s, l) => s + (l.stockKg ?? 0), 0).toFixed(1)} kg total`} />
        <Stat label="Mean germination" value={meanGerm != null ? meanGerm.toFixed(1) : '—'} unit={meanGerm != null ? '%' : undefined} tone="leaf" note={germByBatch.length ? `across ${germByBatch.length} batch${germByBatch.length === 1 ? '' : 'es'}` : 'no counts yet'} />
      </StatGrid>

      <Section title="Needs attention">
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-600 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-700" /> Nothing flagged from your records.</p>
        ) : (
          <ul className="divide-y divide-gray-100 -my-2">
            {alerts.map(a => (
              <li key={a.text}>
                <Link to={a.to} className="flex items-start gap-2 py-2.5 group">
                  {a.level === 'critical' ? <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                  <span className="text-sm text-gray-800 flex-1">{a.text}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-green-700 mt-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Record">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { to: '/tools/germination', label: 'Germination count', icon: Sprout },
            { to: '/tools/environmental', label: 'Climate reading', icon: ThermometerSun },
            { to: '/tools/morphometrics', label: 'Growth measurement', icon: Ruler },
            { to: '/nursery/new', label: 'New batch', icon: Plus },
          ].map(a => (
            <Link key={a.to} to={a.to} className="flex items-center gap-2 px-3 py-2.5 rounded-md border border-gray-200 hover:border-green-600 hover:bg-green-50 text-sm text-gray-800">
              <a.icon className="w-4 h-4 text-green-700 shrink-0" strokeWidth={1.8} /> {a.label}
            </Link>
          ))}
        </div>
      </Section>
    </Page>
  );
};

export default HomePage;
