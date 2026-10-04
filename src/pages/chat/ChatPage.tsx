import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, Terminal, ArrowDown } from 'lucide-react';
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

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const HAS_LIVE_MODEL = Boolean(GEMINI_KEY) && GEMINI_KEY !== 'your_api_key';

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
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : 'Connection error. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const parseMarkdown = (text: string) => {
    const parsed = text
      .replace(/^#{1,6}\s+(.+)$/gm, '<strong class="block text-sm font-semibold text-gray-900 mb-1">$1</strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-green-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-green-700 font-medium">$1</em>')
      .replace(/^\d+\.\s+(.+)$/gm, '<li class="ml-4 list-decimal my-1">$1</li>')
      .replace(/^[-•]\s+(.+)$/gm, '<li class="ml-4 list-disc my-1">$1</li>')
      .split('\n').join('<br/>');
    return <div dangerouslySetInnerHTML={{ __html: parsed }} />;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-150px)]">
      {/* Header Section */}
      <header className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
          AgroBot <Sparkles className="w-4 h-4 text-green-600" />
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {HAS_LIVE_MODEL ? 'Research assistant for forestry, seed physiology and greenhouse climate.' : 'Offline mode: pre-written reference answers.'}
        </p>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 glass-panel rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col relative bg-white/40">
        
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
                  className="w-16 h-16 bg-green-50 rounded-xl flex items-center justify-center mb-4 shadow-inner"
                >
                  <Bot className="w-8 h-8 text-green-600" />
                </motion.div>
                <h3 className="font-semibold text-gray-800 text-sm mb-1">Ask about your nursery</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6 italic">
                  Species, seed lots, batches, VPD and trial design.
                </p>

                <div className="w-full space-y-2">
                  <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Try asking</p>
                  {STARTERS.map((s, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ x: 4, backgroundColor: 'rgba(16, 185, 129, 0.1)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSend(s)}
                      className="w-full text-left p-3 text-[11px] bg-white/80 border border-gray-100 rounded-xl transition-all text-gray-600 font-medium"
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
                  <div className={`max-w-[85%] p-4 rounded-lg text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-green-600 text-white rounded-br-none'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    {m.role === 'assistant' ? parseMarkdown(m.content) : m.content}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {isLoading && (
            <motion.div className="flex justify-start">
              <div className="bg-white border border-gray-100 p-4 rounded-lg rounded-bl-none flex gap-1">
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-green-400 rounded-full"></motion.div>
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-green-400 rounded-full"></motion.div>
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-green-400 rounded-full"></motion.div>
              </div>
            </motion.div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
              <div className="bg-red-100 p-1.5 rounded-lg"><X className="w-4 h-4 text-red-600" /></div>
              <div className="flex-1 text-xs text-red-700 font-medium">{error}</div>
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
            className="absolute bottom-24 right-6 p-2 bg-green-600 text-white rounded-full shadow-sm z-20"
          >
            <ArrowDown className="w-4 h-4" />
          </motion.button>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white/60 border-t border-gray-100">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200 shadow-sm focus-within:border-green-500 transition-all">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask species, batch data, VPD..."
              className="flex-1 bg-transparent border-none text-sm font-medium outline-none px-3 placeholder-gray-400"
              disabled={isLoading}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className={`p-3 rounded-xl transition-all ${
                isLoading || !input.trim()
                  ? 'bg-gray-100 text-gray-300'
                  : 'bg-green-600 text-white shadow-sm '
              }`}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="flex justify-between items-center mt-3 px-1">
            <div className="flex items-center gap-1.5 text-gray-400">
              <Terminal className="w-3 h-3" />
              <span className="text-[10px] font-mono-sci">{HAS_LIVE_MODEL ? 'gemini-1.5-flash' : 'offline'}</span>
            </div>
            <p className="text-[10px] text-gray-500">Check advice against your own trial data.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgroBotPage;
