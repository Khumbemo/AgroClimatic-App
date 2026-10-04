import { useState } from 'react';
import { Map, Plus, Grid3x3, Trash2 } from 'lucide-react';
import { useBatchIndex, useCollection, useData } from '../../data/hooks';
import { saveErrorMessage } from '../../data/errors';
import { PLACEMENT_STATUSES, type Greenhouse } from '../../data/schema';
import { Page, PageHeader, Section } from '../../components/ui/Page';
import { EmptyState } from '../../components/ui/Display';
import { FieldShell, SelectField, TextField } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import Sheet from '../../components/ui/Sheet';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';
import { req, useRecordForm } from '../../components/ui/useRecordForm';

type Placement = Greenhouse['placements'][number];
type CellStatus = Placement['status'] | 'empty';

const statusStyle: Record<CellStatus, string> = {
  empty: 'bg-gray-50 border-gray-200 text-gray-500',
  sown: 'bg-amber-50 border-amber-300 text-amber-900',
  germinating: 'bg-green-50 border-green-300 text-green-900',
  growing: 'bg-green-100 border-green-400 text-green-900',
  hardening: 'bg-blue-50 border-blue-300 text-blue-900',
  ready: 'bg-green-200 border-green-600 text-green-950',
};
const statusLabel: Record<CellStatus, string> = { empty: 'Empty', sown: 'Sown', germinating: 'Germinating', growing: 'Growing', hardening: 'Hardening', ready: 'Ready' };

const SpatialMappingPage = () => {
  const { repo } = useData();
  const { byId, speciesName } = useBatchIndex();
  const layouts = [...useCollection('greenhouses').items].sort((a, b) => a.name.localeCompare(b.name));
  const [chosen, setChosen] = useState<string | null>(null);
  const current = layouts.find(l => l.id === chosen) ?? layouts[0];
  const [cell, setCell] = useState<{ row: number; col: number } | null>(null);
  const [cellForm, setCellForm] = useState<{ batchId: string | null; status: CellStatus }>({ batchId: null, status: 'empty' });
  const [cellError, setCellError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useRecordForm(() => ({ name: '', rows: '4', cols: '6' }));
  const createLayout = () => form.submit(async () => {
    const g = await repo.add('greenhouses', { name: form.values.name, rows: req(form.values.rows), cols: req(form.values.cols), placements: [] });
    setChosen(g.id);
  });

  const at = (r: number, c: number) => current?.placements.find(p => p.row === r && p.col === c);
  const batchText = (p: Placement) => (p.batchId ? byId.get(p.batchId)?.batchNumber : undefined) ?? p.legacyBatchLabel ?? '—';
  const speciesText = (p: Placement) => {
    const b = p.batchId ? byId.get(p.batchId) : undefined;
    return (b?.speciesId && speciesName.get(b.speciesId)) || p.legacySpecies || '';
  };

  const openCell = (row: number, col: number) => {
    const p = at(row, col);
    setCell({ row, col });
    setCellForm(p ? { batchId: p.batchId, status: p.status } : { batchId: null, status: 'empty' });
    setCellError(null);
  };

  const saveCell = async () => {
    if (!current || !cell) return;
    const others = current.placements.filter(p => !(p.row === cell.row && p.col === cell.col));
    let placements = others;
    if (cellForm.status !== 'empty') {
      if (!cellForm.batchId) { setCellError('Select the batch on this position.'); return; }
      placements = [...others, { row: cell.row, col: cell.col, batchId: cellForm.batchId, status: cellForm.status }];
    }
    try {
      await repo.update('greenhouses', current.id, { placements });
      setCell(null);
    } catch (e) { setCellError(saveErrorMessage(e)); }
  };

  const occupied = current?.placements.length ?? 0;

  return (
    <Page>
      <PageHeader title="Spatial mapping" subtitle="Bench layouts per greenhouse, linked to batches." back="/tools"
        actions={<Button icon={<Plus className="w-4 h-4" />} onClick={form.openForm}>House</Button>} />

      {layouts.length === 0 ? (
        <EmptyState icon={Map} title="No greenhouse layouts yet" text="Create a layout with its bench rows and positions, then place batches on it." action={<Button onClick={form.openForm}>New layout</Button>} />
      ) : current && (
        <>
          {layouts.length > 1 && (
            <SelectField id="gh-pick" label="Greenhouse" value={current.id} onChange={setChosen} options={layouts.map(l => ({ value: l.id, label: l.name }))} />
          )}
          <Section
            title={`${current.name} · ${current.rows} × ${current.cols}`}
            actions={<span className="font-mono-sci text-[11px] text-gray-500">{occupied}/{current.rows * current.cols} occupied</span>}
          >
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="border-separate border-spacing-1" aria-label={`${current.name} bench map`}>
                <thead>
                  <tr>
                    <th />
                    {Array.from({ length: current.cols }, (_, c) => <th key={c} scope="col" className="font-mono-sci text-[10px] text-gray-500 font-normal">P{c + 1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: current.rows }, (_, r) => (
                    <tr key={r}>
                      <th scope="row" className="font-mono-sci text-[10px] text-gray-500 font-normal pr-1">B{r + 1}</th>
                      {Array.from({ length: current.cols }, (_, c) => {
                        const p = at(r, c);
                        const status: CellStatus = p?.status ?? 'empty';
                        return (
                          <td key={c}>
                            <button
                              onClick={() => openCell(r, c)}
                              aria-label={`Bench ${r + 1}, position ${c + 1}: ${p ? `${batchText(p)}, ${statusLabel[status]}` : 'empty'}`}
                              className={`w-18 h-14 rounded-sm border text-left px-1.5 py-1 transition-colors hover:border-green-700 ${statusStyle[status]}`}
                            >
                              {p ? (
                                <>
                                  <span className="block font-mono-sci text-[10px] font-medium truncate">{batchText(p)}</span>
                                  <span className="block text-[9px] italic truncate opacity-80">{speciesText(p)}</span>
                                  <span className="block text-[9px] uppercase tracking-wide">{statusLabel[status]}</span>
                                </>
                              ) : <span className="block text-center text-xs">—</span>}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100">
              {(Object.keys(statusLabel) as CellStatus[]).map(k => (
                <li key={k} className="flex items-center gap-1.5 text-[11px] text-gray-600"><span className={`w-3 h-3 rounded-sm border ${statusStyle[k]}`} />{statusLabel[k]}</li>
              ))}
            </ul>
            <div className="mt-3 flex justify-end">
              {!confirmDelete ? (
                <Button size="sm" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => setConfirmDelete(true)}>Delete layout</Button>
              ) : (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md p-2 w-full">
                  <span className="text-xs text-red-800 mr-auto">Delete {current.name}? Batches are not affected.</span>
                  <Button size="sm" variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  <Button size="sm" variant="danger" onClick={async () => { await repo.remove('greenhouses', current.id); setConfirmDelete(false); setChosen(null); }}>Delete</Button>
                </div>
              )}
            </div>
          </Section>
          <p className="text-xs text-gray-500 flex items-center gap-1"><Grid3x3 className="w-3.5 h-3.5" /> Tap a position to place a batch or change its stage.</p>
        </>
      )}

      <Sheet open={form.open} title="New greenhouse layout" onClose={form.close}>
        <TextField id="gh-name" label="Greenhouse name" value={form.values.name} onChange={form.set('name')} placeholder="GH-01 propagation house" />
        <div className="grid grid-cols-2 gap-3">
          <TextField id="gh-rows" type="number" step="1" min={1} max={50} label="Benches (rows)" value={form.values.rows} onChange={form.set('rows')} />
          <TextField id="gh-cols" type="number" step="1" min={1} max={50} label="Positions per bench" value={form.values.cols} onChange={form.set('cols')} />
        </div>
        <FormError message={form.error} />
        <Button block onClick={createLayout} disabled={form.saving}>Create layout</Button>
      </Sheet>

      <Sheet open={cell !== null} title={cell ? `Bench ${cell.row + 1}, position ${cell.col + 1}` : ''} onClose={() => setCell(null)}>
        <SelectField id="cell-status" label="Stage" value={cellForm.status} onChange={s => setCellForm(f => ({ ...f, status: s as CellStatus }))}
          options={(['empty', ...PLACEMENT_STATUSES] as CellStatus[]).map(s => ({ value: s, label: statusLabel[s] }))} />
        {cellForm.status !== 'empty' && (
          <FieldShell id="cell-batch" label="Batch"><BatchSelect id="cell-batch" value={cellForm.batchId} onChange={id => setCellForm(f => ({ ...f, batchId: id }))} /></FieldShell>
        )}
        <FormError message={cellError} />
        <Button block onClick={saveCell}>{cellForm.status === 'empty' ? 'Clear position' : 'Save position'}</Button>
      </Sheet>
    </Page>
  );
};

export default SpatialMappingPage;
