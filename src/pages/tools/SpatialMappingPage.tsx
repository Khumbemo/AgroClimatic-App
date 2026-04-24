import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Map, Plus, X, Grid3x3 } from 'lucide-react';

interface BenchCell {
  batchId: string;
  species: string;
  status: 'empty' | 'sown' | 'germinating' | 'growing' | 'hardening' | 'ready';
}

interface GreenhouseLayout {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cells: (BenchCell | null)[][];
  createdAt: string;
}

const statusColors: Record<BenchCell['status'], string> = {
  empty: 'bg-gray-100 border-gray-200 text-gray-400',
  sown: 'bg-amber-50 border-amber-300 text-amber-700',
  germinating: 'bg-lime-50 border-lime-300 text-lime-700',
  growing: 'bg-green-50 border-green-400 text-green-700',
  hardening: 'bg-blue-50 border-blue-300 text-blue-700',
  ready: 'bg-emerald-100 border-emerald-500 text-emerald-800',
};

const statusLabels: Record<BenchCell['status'], string> = {
  empty: 'EMPTY', sown: 'SOWN', germinating: 'GERM', growing: 'GROW', hardening: 'HARD', ready: 'READY',
};

const SpatialMappingPage = () => {
  const navigate = useNavigate();
  const [layouts, setLayouts] = useState<GreenhouseLayout[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellForm, setCellForm] = useState({ batchId: '', species: '', status: 'empty' as BenchCell['status'] });
  const [newForm, setNewForm] = useState({ name: '', rows: '4', cols: '6' });

  useEffect(() => {
    const saved = localStorage.getItem('ac_spatial_layouts');
    if (saved) {
      const parsed = JSON.parse(saved);
      setLayouts(parsed);
      if (parsed.length > 0) setSelectedLayout(parsed[0].id);
    }
  }, []);

  const saveLayouts = (updated: GreenhouseLayout[]) => {
    setLayouts(updated);
    localStorage.setItem('ac_spatial_layouts', JSON.stringify(updated));
  };

  const createLayout = () => {
    if (!newForm.name) return;
    const rows = parseInt(newForm.rows) || 4;
    const cols = parseInt(newForm.cols) || 6;
    const cells: (BenchCell | null)[][] = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));
    const layout: GreenhouseLayout = {
      id: `GH-${Date.now()}`,
      name: newForm.name,
      rows, cols, cells,
      createdAt: new Date().toISOString(),
    };
    const updated = [layout, ...layouts];
    saveLayouts(updated);
    setSelectedLayout(layout.id);
    setShowNewForm(false);
    setNewForm({ name: '', rows: '4', cols: '6' });
  };

  const updateCell = () => {
    if (!selectedLayout || !editingCell) return;
    const updated = layouts.map(l => {
      if (l.id !== selectedLayout) return l;
      const newCells = l.cells.map(r => [...r]);
      if (cellForm.status === 'empty') {
        newCells[editingCell.row][editingCell.col] = null;
      } else {
        newCells[editingCell.row][editingCell.col] = { batchId: cellForm.batchId, species: cellForm.species, status: cellForm.status };
      }
      return { ...l, cells: newCells };
    });
    saveLayouts(updated);
    setEditingCell(null);
    setCellForm({ batchId: '', species: '', status: 'empty' });
  };

  const current = layouts.find(l => l.id === selectedLayout);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/tools')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Spatial Mapping</h1>
          <p className="text-xs text-gray-500 font-mono-sci mt-0.5">GREENHOUSE BENCH LAYOUT ENGINE</p>
        </div>
        <button onClick={() => setShowNewForm(true)} className="bg-gradient-to-r from-rose-500 to-red-600 text-white p-2.5 rounded-xl shadow-lg shadow-rose-500/30 hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Layout Selector */}
      {layouts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {layouts.map(l => (
            <button key={l.id} onClick={() => setSelectedLayout(l.id)} className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedLayout === l.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
              {l.name}
            </button>
          ))}
        </div>
      )}

      {/* New Layout Form */}
      {showNewForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black text-lg text-gray-900">New Greenhouse Layout</h2>
              <button onClick={() => setShowNewForm(false)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Greenhouse Name</label><input type="text" placeholder="Greenhouse Alpha" value={newForm.name} onChange={e => setNewForm({...newForm, name: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-rose-400 outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rows (Benches)</label><input type="number" value={newForm.rows} onChange={e => setNewForm({...newForm, rows: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-rose-400 outline-none" /></div>
                <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Columns (Positions)</label><input type="number" value={newForm.cols} onChange={e => setNewForm({...newForm, cols: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-rose-400 outline-none" /></div>
              </div>
              <button onClick={createLayout} className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Create Layout</button>
            </div>
          </div>
        </div>
      )}

      {/* Cell Edit Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black text-lg text-gray-900">Position [{editingCell.row + 1}, {editingCell.col + 1}]</h2>
              <button onClick={() => setEditingCell(null)} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</label>
                <select value={cellForm.status} onChange={e => setCellForm({...cellForm, status: e.target.value as BenchCell['status']})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-rose-400 outline-none">
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {cellForm.status !== 'empty' && (
                <>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Batch ID</label><input type="text" placeholder="BATCH-001" value={cellForm.batchId} onChange={e => setCellForm({...cellForm, batchId: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-rose-400 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Species</label><input type="text" placeholder="Pinus patula" value={cellForm.species} onChange={e => setCellForm({...cellForm, species: e.target.value})} className="w-full mt-1 p-3 rounded-xl border border-gray-200 font-mono-sci text-sm focus:ring-2 focus:ring-rose-400 outline-none" /></div>
                </>
              )}
              <button onClick={updateCell} className="w-full bg-gradient-to-r from-rose-500 to-red-600 text-white py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg">Update Position</button>
            </div>
          </div>
        </div>
      )}

      {/* Grid Visualization */}
      {current ? (
        <div className="bento-card p-4 bg-white/90 border border-gray-200 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.15em] flex items-center gap-2">
              <Grid3x3 className="w-3.5 h-3.5" /> {current.name} · {current.rows}×{current.cols}
            </h3>
            <span className="font-mono-sci text-[9px] text-gray-400">{current.id}</span>
          </div>

          {/* Column Headers */}
          <div className="flex gap-1.5 mb-1.5 ml-8">
            {Array.from({ length: current.cols }, (_, c) => (
              <div key={c} className="w-16 text-center font-mono-sci text-[8px] text-gray-400 font-bold">C{c + 1}</div>
            ))}
          </div>

          {/* Grid Rows */}
          <div className="space-y-1.5">
            {current.cells.map((row, r) => (
              <div key={r} className="flex gap-1.5 items-center">
                <div className="w-6 font-mono-sci text-[8px] text-gray-400 font-bold text-right">R{r + 1}</div>
                {row.map((cell, c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setEditingCell({ row: r, col: c });
                      setCellForm(cell ? { batchId: cell.batchId, species: cell.species, status: cell.status } : { batchId: '', species: '', status: 'empty' });
                    }}
                    className={`w-16 h-14 rounded-lg border-2 flex flex-col items-center justify-center transition-all hover:scale-105 active:scale-95 ${cell ? statusColors[cell.status] : statusColors.empty}`}
                  >
                    {cell ? (
                      <>
                        <span className="font-mono-sci text-[7px] font-bold leading-none">{cell.batchId || '—'}</span>
                        <span className="text-[6px] font-bold mt-0.5 opacity-70 truncate max-w-[56px]">{cell.species || '—'}</span>
                        <span className="text-[6px] font-bold mt-0.5 uppercase">{statusLabels[cell.status]}</span>
                      </>
                    ) : (
                      <span className="text-[8px]">—</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
            {Object.entries(statusLabels).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded border ${statusColors[k as BenchCell['status']]}`}></div>
                <span className="text-[8px] font-bold text-gray-500 uppercase">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bento-card p-10 text-center border-2 border-dashed border-gray-200">
          <Map className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-sm text-gray-500">No greenhouse layouts created.</p>
          <p className="text-xs text-gray-400 mt-1 font-mono-sci">TAP + TO CREATE A BENCH MAP</p>
        </div>
      )}
    </div>
  );
};

export default SpatialMappingPage;
