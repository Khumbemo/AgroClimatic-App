import { Plus, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBatchIndex, useCollection, useData } from '../../data/hooks';
import { Page, PageHeader } from '../../components/ui/Page';
import { EmptyState } from '../../components/ui/Display';
import { FieldGroup, FieldShell, SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import RecordList from '../../components/ui/RecordList';
import FormError from '../../components/data/FormError';
import SeedLotSelect from '../../components/data/SeedLotSelect';
import { numOrNull, req, today, useRecordForm } from '../../components/ui/useRecordForm';

const ASPECTS = ['', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'Flat'];

const ProvenancePage = () => {
  const { repo } = useData();
  const { label } = useBatchIndex();
  const { items: lots } = useCollection('seedLots');
  const lotNumber = new Map(lots.map(l => [l.id, l.lotNumber]));
  const records = [...useCollection('provenanceRecords').items].sort((a, b) => b.collectionDate.localeCompare(a.collectionDate));

  const form = useRecordForm(() => ({
    seedLotId: null as string | null, collectorName: '', collectionDate: today(), lat: '', lng: '', elevation: '', aspect: '',
    climateZone: '', canopyPosition: '', motherTreeCount: '1', genotypeMarkers: '', phenotypeTraits: '', notes: '',
  }));
  const v = form.values;
  const save = () => form.submit(() => repo.add('provenanceRecords', {
    seedLotId: v.seedLotId, batchId: null, collectorName: v.collectorName, collectionDate: v.collectionDate,
    lat: req(v.lat), lng: req(v.lng), elevation: numOrNull(v.elevation), aspect: v.aspect, climateZone: v.climateZone,
    canopyPosition: v.canopyPosition, motherTreeCount: req(v.motherTreeCount), genotypeMarkers: v.genotypeMarkers,
    phenotypeTraits: v.phenotypeTraits, notes: v.notes,
  }));

  return (
    <Page>
      <PageHeader title="Provenance & lineage" subtitle="Where and how seed was collected, linked to seed lots." back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={form.openForm}>New</Button>} />

      {records.length === 0 ? (
        <EmptyState icon={MapPin} title="No provenance records yet" text={<>Record the collection site (decimal degrees, WGS 84), elevation and number of mother trees for each seed lot. <Link className="text-green-700 font-medium" to="/records/seeds">Manage seed lots</Link>.</>} action={<Button onClick={form.openForm}>Add record</Button>} />
      ) : (
        <RecordList label="Provenance records" onDelete={id => repo.remove('provenanceRecords', id)} rows={records.map(r => ({
          id: r.id,
          title: r.seedLotId ? `Seed lot ${lotNumber.get(r.seedLotId) ?? '(deleted)'}` : r.batchId ? label(r.batchId, r.legacyBatchLabel) : 'No seed lot linked',
          meta: `${r.collectionDate}${r.collectorName ? ` · ${r.collectorName}` : ''}`,
          values: [
            { label: 'Lat, long', value: `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}` },
            { label: 'Elevation', value: r.elevation ?? '—', unit: 'm' },
            { label: 'Aspect', value: r.aspect || '—' },
            { label: 'Mother trees', value: r.motherTreeCount },
          ],
          note: [r.climateZone && `Climate: ${r.climateZone}`, r.canopyPosition && `Canopy: ${r.canopyPosition}`, r.phenotypeTraits && `Traits: ${r.phenotypeTraits}`, r.genotypeMarkers && `Markers: ${r.genotypeMarkers}`, r.notes].filter(Boolean).join(' · ') || undefined,
        }))} />
      )}

      <Sheet open={form.open} title="New provenance record" onClose={form.close}>
        <div className="grid grid-cols-2 gap-3">
          <FieldShell id="pv-lot" label="Seed lot"><SeedLotSelect id="pv-lot" value={v.seedLotId} onChange={form.set('seedLotId')} /></FieldShell>
          <TextField id="pv-date" type="date" label="Collection date" value={v.collectionDate} onChange={form.set('collectionDate')} />
        </div>
        <TextField id="pv-collector" label="Collector" value={v.collectorName} onChange={form.set('collectorName')} />
        <FieldGroup title="Site (WGS 84)">
          <div className="grid grid-cols-2 gap-3">
            <TextField id="pv-lat" type="number" step="0.000001" label="Latitude" unit="° N" value={v.lat} onChange={form.set('lat')} placeholder="30.7333" hint="Negative for south" />
            <TextField id="pv-lng" type="number" step="0.000001" label="Longitude" unit="° E" value={v.lng} onChange={form.set('lng')} placeholder="79.0667" hint="Negative for west" />
            <TextField id="pv-elev" type="number" step="1" label="Elevation" unit="m a.s.l." value={v.elevation} onChange={form.set('elevation')} />
            <SelectField id="pv-aspect" label="Aspect" value={v.aspect} onChange={form.set('aspect')} options={ASPECTS.map(a => ({ value: a, label: a || 'Not recorded' }))} />
          </div>
          <TextField id="pv-zone" label="Climate zone" value={v.climateZone} onChange={form.set('climateZone')} placeholder="e.g. Köppen Cwb" />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <TextField id="pv-trees" type="number" step="1" min={1} label="Mother trees" value={v.motherTreeCount} onChange={form.set('motherTreeCount')} />
          <TextField id="pv-canopy" label="Canopy position" value={v.canopyPosition} onChange={form.set('canopyPosition')} placeholder="Upper crown" />
        </div>
        <TextField id="pv-pheno" label="Phenotype traits" value={v.phenotypeTraits} onChange={form.set('phenotypeTraits')} />
        <TextField id="pv-geno" label="Genotype markers" value={v.genotypeMarkers} onChange={form.set('genotypeMarkers')} />
        <TextAreaField id="pv-notes" label="Notes" value={v.notes} onChange={form.set('notes')} />
        <FormError message={form.error} />
        <Button block onClick={save} disabled={form.saving}>Save record</Button>
      </Sheet>
    </Page>
  );
};

export default ProvenancePage;
