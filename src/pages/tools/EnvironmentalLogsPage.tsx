import { Plus, ThermometerSun } from 'lucide-react';
import { useCollection, useData, byDateDesc } from '../../data/hooks';
import { calculateVPD, dailyLightIntegral, dewPoint, getVpdBand } from '../../utils/calculations';
import { Page, PageHeader } from '../../components/ui/Page';
import { Chip, ChartFrame, EmptyState, Stat, StatGrid } from '../../components/ui/Display';
import { TextField, FieldGroup } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import RecordList from '../../components/ui/RecordList';
import FormError from '../../components/data/FormError';
import TimeSeriesChart from '../../components/charts/TimeSeriesChart';
import { num, req, today, useRecordForm } from '../../components/ui/useRecordForm';
import { vpdToneChip } from '../../components/sci/vpdTone';

const fmt = (v: number | null | undefined, d = 1) => (v == null || Number.isNaN(v) ? '—' : v.toFixed(d));

const EnvironmentalLogsPage = () => {
  const { repo } = useData();
  const { items, ready } = useCollection('climateReadings');
  const logs = [...items].sort(byDateDesc);
  const chronological = [...logs].reverse().slice(-60);
  const latest = logs[0];
  const latestVpd = latest ? calculateVPD(latest.tempMean, latest.humidity) : null;

  const form = useRecordForm(() => ({ date: today(), tempMin: '', tempMax: '', tempMean: '', humidity: '', lightIntensity: '', photoperiod: '', co2: '' }));
  const v = form.values;
  const save = () =>
    form.submit(() => {
      const tMin = req(v.tempMin), tMax = req(v.tempMax);
      return repo.add('climateReadings', {
        date: v.date, tempMin: tMin, tempMax: tMax,
        // Daily mean defaults to (Tmin + Tmax) / 2 when not measured
        tempMean: v.tempMean.trim() ? Number(v.tempMean) : (tMin + tMax) / 2,
        humidity: req(v.humidity), lightIntensity: num(v.lightIntensity) ?? 0, photoperiod: num(v.photoperiod) ?? 0, co2: num(v.co2),
      });
    }, { keep: ['date'] });

  return (
    <Page>
      <PageHeader title="Environmental logs" subtitle="Daily greenhouse climate: temperature, humidity, light and CO₂." back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={form.openForm}>New</Button>} />

      {latest && (
        <StatGrid cols={4}>
          <Stat label="Mean temp" value={fmt(latest.tempMean)} unit="°C" note={`${latest.tempMin}–${latest.tempMax} °C · ${latest.date}`} />
          <Stat label="Rel. humidity" value={fmt(latest.humidity, 0)} unit="%" />
          <Stat label="VPD" value={fmt(latestVpd, 2)} unit="kPa" note={latestVpd != null ? getVpdBand(latestVpd).label : undefined} formula="Tetens, at mean temp" />
          <Stat label="Dew point" value={fmt(dewPoint(latest.tempMean, latest.humidity))} unit="°C" formula="Magnus" />
        </StatGrid>
      )}

      {chronological.length >= 2 && (
        <ChartFrame title="Temperature and humidity" caption="Last 60 readings. Shaded line: daily mean temperature; dashed: minimum and maximum.">
          <TimeSeriesChart
            labels={chronological.map(r => r.date.slice(5))}
            yTitle="°C" y1Title="RH %"
            series={[
              { label: 'T max', data: chronological.map(r => r.tempMax), color: 'red-500', dashed: true },
              { label: 'T mean', data: chronological.map(r => r.tempMean), color: 'amber-500', fill: true },
              { label: 'T min', data: chronological.map(r => r.tempMin), color: 'blue-500', dashed: true },
              { label: 'RH', data: chronological.map(r => r.humidity), color: 'green-600', axis: 'y1' },
            ]}
          />
        </ChartFrame>
      )}

      {ready && logs.length === 0 ? (
        <EmptyState icon={ThermometerSun} title="No climate readings yet" text="Record daily minimum and maximum temperature and relative humidity. VPD, dew point and light integral are calculated for you." action={<Button onClick={form.openForm}>Add reading</Button>} />
      ) : (
        <RecordList
          label="Climate readings"
          onDelete={id => repo.remove('climateReadings', id)}
          rows={logs.map(r => {
            const vpd = calculateVPD(r.tempMean, r.humidity);
            const band = getVpdBand(vpd);
            return {
              id: r.id,
              title: r.date,
              badges: <>{<span className={`text-[11px] px-1.5 py-0.5 rounded border ${vpdToneChip[band.tone]}`}>{band.label}</span>}{r.isExample && <Chip>Example</Chip>}</>,
              values: [
                { label: 'Temp', value: `${r.tempMin}–${r.tempMax}`, unit: '°C' },
                { label: 'RH', value: r.humidity, unit: '%' },
                { label: 'VPD', value: vpd.toFixed(2), unit: 'kPa' },
                { label: 'DLI', value: r.lightIntensity && r.photoperiod ? dailyLightIntegral(r.lightIntensity, r.photoperiod).toFixed(1) : '—', unit: 'mol m⁻² d⁻¹' },
                ...(r.co2 != null ? [{ label: 'CO₂', value: r.co2, unit: 'ppm' }] : []),
              ],
            };
          })}
        />
      )}

      <Sheet open={form.open} title="New climate reading" onClose={form.close}>
        <TextField id="cl-date" type="date" label="Date" value={v.date} onChange={form.set('date')} />
        <FieldGroup title="Air temperature">
          <div className="grid grid-cols-3 gap-3">
            <TextField id="cl-min" type="number" step="0.1" label="Min" unit="°C" value={v.tempMin} onChange={form.set('tempMin')} placeholder="12.5" />
            <TextField id="cl-max" type="number" step="0.1" label="Max" unit="°C" value={v.tempMax} onChange={form.set('tempMax')} placeholder="28.3" />
            <TextField id="cl-mean" type="number" step="0.1" label="Mean" unit="°C" value={v.tempMean} onChange={form.set('tempMean')} placeholder="auto" />
          </div>
          <p className="text-[11px] text-gray-500">Leave mean blank to use (min + max) / 2.</p>
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <TextField id="cl-rh" type="number" step="0.1" label="Rel. humidity" unit="%" value={v.humidity} onChange={form.set('humidity')} placeholder="65" />
          <TextField id="cl-co2" type="number" step="1" label="CO₂" unit="ppm" value={v.co2} onChange={form.set('co2')} placeholder="420" />
          <TextField id="cl-par" type="number" step="1" label="PAR" unit="µmol m⁻² s⁻¹" value={v.lightIntensity} onChange={form.set('lightIntensity')} placeholder="450" />
          <TextField id="cl-photo" type="number" step="0.5" label="Photoperiod" unit="h" value={v.photoperiod} onChange={form.set('photoperiod')} placeholder="14" />
        </div>
        <FormError message={form.error} />
        <Button block onClick={save} disabled={form.saving}>Save reading</Button>
      </Sheet>
    </Page>
  );
};

export default EnvironmentalLogsPage;
