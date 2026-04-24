import React from 'react';

const HomePage = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <div className="text-[10px] font-black text-green-700 bg-green-50 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-green-100 shadow-sm">
          Season 2024
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 group hover:border-green-100 transition-all">
          <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Active Batches</span>
          <div className="text-4xl font-black mt-2 text-gray-800">12</div>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-50 group hover:border-green-100 transition-all">
          <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Avg Germination</span>
          <div className="text-4xl font-black mt-2 text-green-600">84%</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50">
        <h3 className="font-black text-gray-900 mb-5 text-sm uppercase tracking-widest">Alert Feed</h3>
        <div className="space-y-5">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-4 items-start border-l-4 border-yellow-400 pl-4 py-1.5 bg-yellow-50/30 rounded-r-2xl">
              <div className="flex-1">
                <p className="font-black text-xs text-gray-800 uppercase tracking-tight">Batch #042: Low Moisture</p>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed font-medium">Substrate moisture dropped below 30%. Irrigation recommended.</p>
                <p className="text-[9px] text-gray-300 font-black mt-2 uppercase tracking-widest">2 hours ago</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green-600 p-7 rounded-3xl shadow-2xl shadow-green-100 text-white flex justify-between items-center overflow-hidden relative group">
        <div className="relative z-10 flex-1">
          <h3 className="font-black text-xl uppercase tracking-tight">Ready for Outplanting</h3>
          <p className="text-green-100 text-xs mt-2 opacity-90 font-medium leading-relaxed">3 batches have met the minimum H/RCD thresholds.</p>
          <button className="bg-white text-green-600 px-5 py-2.5 rounded-2xl text-[10px] font-black mt-5 uppercase tracking-widest shadow-md active:scale-95 transition-all">
            View Readiness
          </button>
        </div>
        <div className="absolute right-[-30px] bottom-[-30px] opacity-10 group-hover:scale-110 transition-transform">
          <svg width="180" height="180" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
