import React from 'react';
import { Bot, Send, Sparkles } from 'lucide-react';

const ChatPage = () => {
  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          AI Assistant <Sparkles className="w-5 h-5 text-green-500" />
        </h1>
        <p className="text-sm text-gray-500 mt-1 font-medium">Ask questions about your nursery data or species guides.</p>
      </div>

      <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        {/* Chat history placeholder */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center border-4 border-white shadow-md">
            <Bot className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="font-black text-gray-900">AgroBot</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Ready to assist with your studies.</p>
          </div>
          <div className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mt-4">
            Coming Soon
          </div>
        </div>

        {/* Input placeholder */}
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-sm opacity-50 pointer-events-none">
            <input 
              type="text" 
              placeholder="Ask about VPD, Germination, etc..." 
              className="flex-1 bg-transparent border-none text-sm outline-none px-2"
              disabled
            />
            <button className="bg-green-600 text-white p-2 rounded-xl" disabled>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
