import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

const NewBatchPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    batchNumber: `NB-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    speciesId: '',
    sowingDate: new Date().toISOString().split('T')[0],
    bedTrayNumber: '',
    substrateMix: '',
    seedsSown: '',
    areaSownM2: '',
    seedLotId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'nurseryBatches'), {
        ...formData,
        seedsSown: parseInt(formData.seedsSown),
        areaSownM2: parseFloat(formData.areaSownM2),
        status: 'sown',
        createdAt: new Date().toISOString(),
      });
      navigate('/nursery');
    } catch (err) {
      console.error("Error adding batch:", err);
      navigate('/nursery');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-3 bg-white hover:bg-gray-100 rounded-2xl transition-all shadow-sm active:scale-90">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-black text-gray-900">New Batch</h1>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Batch Number</label>
            <input type="text" name="batchNumber" value={formData.batchNumber} readOnly className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-mono text-xs text-gray-400" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Species</label>
              <select name="speciesId" required value={formData.speciesId} onChange={handleChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm appearance-none">
                <option value="">Select Species</option>
                <option value="Pinus roxburghii">Pinus roxburghii</option>
                <option value="Cedrus deodara">Cedrus deodara</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Sowing Date</label>
              <input type="date" name="sowingDate" value={formData.sowingDate} onChange={handleChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Bed/Tray #</label>
              <input type="text" name="bedTrayNumber" required placeholder="B-01" value={formData.bedTrayNumber} onChange={handleChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm placeholder:text-gray-300" />
            </div>

            <div className="col-span-2">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Substrate Mix Ratio</label>
              <input type="text" name="substrateMix" required placeholder="Coir:Soil (70:30)" value={formData.substrateMix} onChange={handleChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Seeds Sown</label>
              <input type="number" name="seedsSown" required placeholder="1000" value={formData.seedsSown} onChange={handleChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm" />
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Area (m²)</label>
              <input type="number" step="0.1" name="areaSownM2" required placeholder="1.5" value={formData.areaSownM2} onChange={handleChange} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold shadow-sm" />
            </div>
          </div>
        </div>

        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 shadow-xl shadow-green-100 transition-all active:scale-95 text-sm uppercase tracking-widest">
          <CheckCircle2 className="w-5 h-5" />
          Create Batch
        </button>
      </form>
    </div>
  );
};
export default NewBatchPage;
