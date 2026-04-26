import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, Terminal, BookOpen, Leaf, Microscope, Database, ArrowDown, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ChatMessage } from '../../types';
import { getNurseryContext } from '../../utils/chatContext';
import { getMockResponse } from '../../utils/mockAi';

const BASE_SYSTEM_PROMPT = `You are AgroBot Intelligence, an elite PhD-level research assistant specialized in Forestry, Taxonomy, and Ecology.

ANTI-HALLUCINATION RULES:
1. ONLY answer queries based on the [STRICT REFERENCE DATA] provided or established scientific principles.
2. If a query is unrelated to Forestry, Taxonomy, or Ecology, politely decline and explain why.
3. If you do not have specific data (e.g., a batch number not listed), say "Data not available in current records."
4. DO NOT invent statistics, batch numbers, or scientific names.

REASONING FRAMEWORK:
- Step 1: Identify "Key Data Points" from the user query.
- Step 2: Cross-reference with the [STRICT REFERENCE DATA] provided below.
- Step 3: Apply PhD-level scientific analysis (e.g., silviculture systems, ISTA standards, psychrometrics).
- Step 4: Provide a professional, concise response using binomial nomenclature in italics.

SCIENTIFIC DOMAINS:
- Silviculture, Seed Physiology, Greenhouse Engineering, Experimental Design (RCBD), Biodiversity Indices.`;

const STARTERS = [
  "Analyze moisture level of SL-001",
  "Report on batch NB-2024-001 status",
  "Optimal VPD for greenhouse GHG-01",
  "Taxonomy of Cedrus deodara",
  "Explain RCBD for nursery trials",
];

const AgroBotPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsNearBottom(isBottom);
    }
  };

  useEffect(() => {
    if (scrollRef.current && isNearBottom) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading, isNearBottom]);

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setError(null);
    setIsNearBottom(true);
    if (!overrideText) setInput('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey || apiKey === 'your_api_key' || apiKey === '') {
        setTimeout(() => {
          const reply = getMockResponse(text);
          setMessages([...newMessages, { role: 'assistant', content: reply }]);
          setIsLoading(false);
        }, 800);
        return;
      }

      const context = getNurseryContext();
      const fullSystemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${context}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: `INSTRUCTIONS: ${fullSystemPrompt}\n\nUSER QUESTION: ${text}` }]
          }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const parseMarkdown = (text: string) => {
    let parsed = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-emerald-900 dark:text-emerald-400">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-emerald-700 dark:text-emerald-300 font-medium">$1</em>')
      .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal my-1">$1</li>')
      .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-4 list-disc my-1">$1</li>')
      .split('\n').join('<br/>');
    return <div dangerouslySetInnerHTML={{ __html: parsed }} />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header Section */}
      <div className="mb-4 px-2 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight dark:text-white">
            AgroBot <span className="text-emerald-600">Intelligence</span>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="bg-emerald-100 dark:bg-emerald-900/40 p-1.5 rounded-lg"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </motion.div>
          </h1>
          <div className="flex items-center gap-2 mt-1">
             <ShieldCheck className="w-3 h-3 text-emerald-500" />
             <p className="text-[10px] text-gray-400 font-mono-sci uppercase tracking-widest">
               Scientific Grounding Active
             </p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <motion.div whileHover={{ y: -2 }} className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800" title="Nursery Aware"><Database className="w-3.5 h-3.5 text-emerald-600" /></motion.div>
          <motion.div whileHover={{ y: -2 }} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-lg" title="PhD Specialized"><Microscope className="w-3.5 h-3.5 text-gray-400" /></motion.div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 glass-panel rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col relative bg-white/40 dark:bg-slate-900/40">
        
        {/* Messages Container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar scroll-smooth"
        >
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center px-6 py-10"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center mb-4 shadow-inner"
                >
                  <Bot className="w-8 h-8 text-emerald-600" />
                </motion.div>
                <h3 className="font-black text-gray-800 dark:text-gray-200 text-sm uppercase tracking-widest mb-2">Research Session Ready</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6 italic">
                  "I provide data-grounded analysis on your specific nursery records."
                </p>

                <div className="w-full space-y-2">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Precision Queries</p>
                  {STARTERS.map((s, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ x: 4, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSend(s)}
                      className="w-full text-left p-3 text-[11px] bg-white/80 dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 rounded-xl transition-all text-gray-600 dark:text-gray-300 font-medium"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                  }`}>
                    {m.role === 'assistant' ? parseMarkdown(m.content) : m.content}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {isLoading && (
            <motion.div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-4 rounded-2xl rounded-bl-none flex gap-1">
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></motion.div>
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></motion.div>
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></motion.div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-4 rounded-xl flex items-start gap-3">
              <div className="bg-red-100 dark:bg-red-900/40 p-1.5 rounded-lg"><X className="w-4 h-4 text-red-600" /></div>
              <div className="flex-1 text-xs text-red-700 dark:text-red-400 font-medium">{error}</div>
            </div>
          )}
        </div>

        {/* Scroll Indicator */}
        {!isNearBottom && messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              setIsNearBottom(true);
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }}
            className="absolute bottom-24 right-6 p-2 bg-emerald-600 text-white rounded-full shadow-lg z-20"
          >
            <ArrowDown className="w-4 h-4" />
          </motion.button>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm focus-within:border-emerald-500 transition-all">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask species, batch data, VPD..."
              className="flex-1 bg-transparent border-none text-sm font-medium outline-none px-3 placeholder-gray-400 dark:text-white"
              disabled={isLoading}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className={`p-3 rounded-xl transition-all ${
                isLoading || !input.trim()
                  ? 'bg-gray-100 dark:bg-slate-700 text-gray-300 dark:text-gray-500'
                  : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none'
              }`}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="flex justify-between items-center mt-3 px-1">
            <div className="flex items-center gap-1.5 text-gray-300 dark:text-slate-600">
              <Terminal className="w-3 h-3" />
              <span className="text-[8px] font-black uppercase tracking-[0.2em]">Data-Grounded Flash 1.5</span>
            </div>
            <p className="text-[8px] text-gray-400 dark:text-slate-500 font-medium italic">Hallucination protection active</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgroBotPage;
