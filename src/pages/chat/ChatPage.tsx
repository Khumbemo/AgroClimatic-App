import React from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';

const ChatPage = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] animate-float" style={{ animationDuration: '15s' }}>
      <div className="mb-6 px-2">
        <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
          AI Assistant 
          <div className="bg-gradient-to-r from-emerald-400 to-cyan-500 p-1.5 rounded-xl shadow-lg shadow-emerald-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </h1>
        <p className="text-sm text-gray-500 mt-2 font-medium">Ask questions about your nursery data or species guides.</p>
      </div>

      <div className="flex-1 glass-panel rounded-[2.5rem] border border-white/60 shadow-2xl shadow-green-900/5 overflow-hidden flex flex-col relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
        
        {/* Chat history placeholder */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-600 rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 animate-pulse-glow"></div>
            <div className="relative w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-xl border border-gray-50">
              <Bot className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-br from-green-500 to-emerald-700" strokeWidth={1.5} />
            </div>
          </div>
          
          <div>
            <h3 className="font-black text-xl text-gray-900 tracking-tight">AgroBot <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-500">Intelligence</span></h3>
            <p className="text-sm text-gray-500 font-medium mt-2 max-w-[250px] mx-auto leading-relaxed">
              I'm learning about your precision nursery data.
            </p>
          </div>
          <div className="bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mt-2 shadow-md">
            Integration Coming Soon
          </div>
        </div>

        {/* Input placeholder */}
        <div className="p-5 bg-white/40 backdrop-blur-md border-t border-white/50 relative z-10">
          <div className="flex items-center gap-3 bg-white p-2.5 rounded-full border border-gray-100 shadow-lg shadow-black/5 opacity-60 pointer-events-none">
            <input 
              type="text" 
              placeholder="Ask about VPD, Germination rates..." 
              className="flex-1 bg-transparent border-none text-sm font-medium outline-none px-4 placeholder-gray-400"
              disabled
            />
            <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-3 rounded-full shadow-md" disabled>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
