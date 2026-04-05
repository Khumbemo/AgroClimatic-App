import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { type NurseryBatch } from '../../types';
import { Sprout, ChevronRight, Activity, Calendar, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const MOCK_BATCHES: NurseryBatch[] = [
  { id: '1', batchNumber: 'NB-2024-001', speciesId: 'Pinus roxburghii', sowingDate: '2024-03-10', status: 'growing', seedsSown: 1000, bedTrayNumber: 'B-01', substrateMix: 'Coir:Soil', areaSownM2: 2, seedLotId: 'SL-001', createdAt: '2024-03-10' },
  { id: '2', batchNumber: 'NB-2024-002', speciesId: 'Cedrus deodara', sowingDate: '2024-03-15', status: 'germinating', seedsSown: 500, bedTrayNumber: 'T-15', substrateMix: 'Sand:Coir', areaSownM2: 1, seedLotId: 'SL-002', createdAt: '2024-03-15' }
];

const BatchListPage: React.FC = () => {
  const [batches, setBatches] = useState<NurseryBatch[]>(MOCK_BATCHES);

  useEffect(() => {
    try {
      const q = query(collection(db, 'nurseryBatches'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const batchData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NurseryBatch));
          setBatches(batchData);
        }
      }, (error) => {
        console.error("Firestore error:", error);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Error setting up snapshot:", e);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-900">Nursery Batches</h1>
        <Link to="/nursery/new" className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-2xl shadow-lg shadow-green-100 transition-all active:scale-95">
          <Plus className="w-5 h-5" />
        </Link>
      </div>

      <div className="grid gap-4">
        {batches.map((batch) => (
          <Link key={batch.id} to={`/nursery/batch/${batch.id}`} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-green-200 transition-all group">
            <div className="bg-green-50 p-4 rounded-2xl group-active:scale-90 transition-transform">
              <Sprout className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">{batch.batchNumber}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${batch.status === 'growing' ? 'bg-blue-50 text-blue-600' : 'bg-yellow-50 text-yellow-600'}`}>
                  {batch.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 italic font-medium">{batch.speciesId}</p>
              <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {batch.sowingDate}</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {batch.seedsSown} seeds</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-200" />
          </Link>
        ))}
      </div>
    </div>
  );
};
export default BatchListPage;
