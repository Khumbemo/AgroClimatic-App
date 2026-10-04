import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Map, Plus, X, Grid3x3 } from 'lucide-react';
import { useBatchIndex, useCollection, useData } from '../../data/hooks';
import { saveErrorMessage } from '../../data/errors';
import type { Greenhouse } from '../../data/schema';
import FormError from '../../components/data/FormError';
import BatchSelect from '../../components/data/BatchSelect';

type Placement = Greenhouse['placements'][number];
type CellStatus = Placement['status'] | 'empty';

const statusColors: Record<CellStatus, string> = {
  empty: 'bg-gray-100 border-gray-200 text-gray-400',
  sown: 'bg-amber-50 border-amber-300 text-amber-700',
  germinating: 'bg-green-50 border-green-300 text-green-700',
  growing: 'bg-green-50 border-green-400 text-green-700',
  hardening: 'bg-blue-50 border-blue-300 text-blue-700',
  ready: 'bg-green-100 border-green-500 text-green-800',
};

const statusLabels: Record<CellStatus, string> = {
  empty: 'EMPTY', sown: 'SOWN', germinating: 'GERM', growing: 'GROW', hardening: 'HARD', ready: 'READY',
};

const SpatialMappingPage = () => {
  const navigate = useNavigate();
  const { repo } = useData();
  const { byId, label, speciesName } = useBatchIndex();
  const layouts = [...useCollection('greenhouses').items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [showNewForm, setShowNewForm] = useState(false);
  const [chosenLayout, setChosenLayout] = useState<string | null>(null);
  const selectedLayout = chosenLayout ?? layouts[0]?.id ?? null;
  const setSelectedLayout = setChosenLayout;
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellForm, setCellForm] = useState<{ batchId: string | null; status: CellStatus }>({ batchId: null, status: 'empty' });
  const [newForm, setNewForm] = useState({ name: '', rows: '4', cols: '6' });
  const [error, setError] = useState<string | null>(null);

  const createLayout = async () => {
    if (!newForm.name) { setError('Enter a greenhouse name.'); return; }
    try {
      const layout = await repo.add('greenhouses', {
        name: newForm.name, rows: parseInt(newForm.rows) || 4, cols: parseInt(newForm.cols) || 6, placements: [],
      });
      setSelectedLayout(layout.id);
    } catch (e) { setError(saveErrorMessage(e)); return; }
    setError(null);
    setShowNewForm(false);
    setNewForm({ name: '', rows: '4', cols: '6' });
  };

  const updateCell = async () => {
    if (!current || !editingCell) return;
    const { row, col } = editingCell;
    const others = current.placements.filter(p => !(p.row === row && p.col === col));
    let placements = others;
    if (cellForm.status !== 'empty') {
      if (!cellForm.batchId) { setError('Select the batch on this bench position.'); return; }
      placements = [...others, { row, col, batchId: cellForm.batchId, status: cellForm.status }];
    }
    try {
      await repo.update('greenhouses', current.id, { placements });
    } catch (e) { setError(saveErrorMessage(e)); return; }
    setError(null);
    setEditingCell(null);
    setCellForm({ batchId: null, status: 'empty' });
  };

  const current = layouts.find(l => l.id === selectedLayout);
  const cellAt = (r: number, c: number) => current?.placements.find(p => p.row === r && p.col === c);
  const cellSpecies = (p: Placement) => {
    const b = p.batchId ? byId.get(p.batchId) : undefined;
    return (b?.speciesId && speciesName.get(b.speciesId)) || p.legacySpecies || '—';
  };
  const cellBatch = (p: Placement) => (p.batchId ? byId.get(p.batchId)?.batchNumber : undefined) ?? p.legacyBatchLabel ?? '—';

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Spatial Mapping</h1>
          
        </div>
        <button onClick={() => setShowNewForm(true)} className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-xl shadow-sm  hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Layout Selector */}
      {layouts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {layouts.map(l => (
            <button key={l.id} onClick={() => setSelectedLayout(l.id)} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all border ${selectedLayout === l.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
              {l.name}
            </button>
          ))}
        </div>
      )}

      {/* New Layout Form */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-lg text-gray-900">New Greenhouse Layout</h2>
              <button onClick={() => { setShowNewForm(false); setError(null); }} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Greenhouse Name</label><input type="text" placeholder="Greenhouse Alpha" value={newForm.name} onChange={e => setNewForm({...newForm, name: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-red-400 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Rows (Benches)</label><input type="number" value={newForm.rows} onChange={e => setNewForm({...newForm, rows: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-red-400 outline-none" /></div>
                <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Columns (Positions)</label><input type="number" value={newForm.cols} onChange={e => setNewForm({...newForm, cols: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-red-400 outline-none" /></div>
              </div>
              <FormError message={error} />
              <button onClick={createLayout} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm uppercase tracking-widest shadow-sm">Create Layout</button>
            </div>
          </div>
        </div>
      )}

      {/* Cell Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-end justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-semibold text-lg text-gray-900">Position [{editingCell.row + 1}, {editingCell.col + 1}]</h2>
              <button onClick={() => { setEditingCell(null); setError(null); }} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Status</label>
                <select value={cellForm.status} onChange={e => setCellForm({...cellForm, status: e.target.value as CellStatus})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-red-400 outline-none">
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {cellForm.status !== 'empty' && (
                <div>
                  <label htmlFor="cell-batch" className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Batch</label>
                  <BatchSelect id="cell-batch" value={cellForm.batchId} onChange={id => setCellForm({ ...cellForm, batchId: id })} />
                </div>
              )}
              <FormError message={error} />
              <button onClick={updateCell} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold text-sm uppercase tracking-widest shadow-sm">Update Position</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Visualization */}
      {current ? (
        <div className="bento-card p-4 border border-gray-200 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.15em] flex items-center gap-2">
              <Grid3x3 className="w-3.5 h-3.5" /> {current.name} · {current.rows}×{current.cols}
            </h3>
            <span className="font-mono-sci text-[9px] text-gray-400">{current.placements.length} occupied</span>
          </div>

          {/* Column Headers */}
          <div className="flex gap-1.5 mb-1.5 ml-8">
            {Array.from({ length: current.cols }, (_, c) => (
              <div key={c} className="w-16 text-center font-mono-sci text-[8px] text-gray-400 font-bold">C{c + 1}</div>
            ))}
          </div>

          {/* Grid Rows */}
          <div className="space-y-1.5">
            {Array.from({ length: current.rows }, (_, r) => (
              <div key={r} className="flex gap-1.5 items-center">
                <div className="w-6 font-mono-sci text-[8px] text-gray-400 font-bold text-right">R{r + 1}</div>
                {Array.from({ length: current.cols }, (_, c) => {
                  const cell = cellAt(r, c);
                  return (
                    <button
                      key={c}
                      aria-label={cell ? `Row ${r + 1}, position ${c + 1}: ${label(cell.batchId, cell.legacyBatchLabel)}, ${cell.status}` : `Row ${r + 1}, position ${c + 1}: empty`}
                      onClick={() => {
                        setEditingCell({ row: r, col: c });
                        setCellForm(cell ? { batchId: cell.batchId, status: cell.status } : { batchId: null, status: 'empty' });
                      }}
                      className={`w-16 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-colors ${cell ? statusColors[cell.status] : statusColors.empty}`}
                    >
                      {cell ? (
                        <>
                          <span className="font-mono-sci text-[7px] font-bold leading-none truncate max-w-[56px]">{cellBatch(cell)}</span>
                          <span className="text-[6px] font-bold mt-0.5 opacity-70 truncate max-w-[56px] italic">{cellSpecies(cell)}</span>
                          <span className="text-[6px] font-bold mt-0.5 uppercase">{statusLabels[cell.status]}</span>
                        </>
                      ) : (
                        <span className="text-[8px]">—</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
            {Object.entries(statusLabels).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded border ${statusColors[k as CellStatus]}`}></div>
                <span className="text-[8px] font-bold text-gray-500 uppercase">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200">
          <Map className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-sm text-gray-500">No greenhouse layouts created.</p>
          
        </div>
      )}
    </div>
  );
};

export default SpatialMappingPage;
