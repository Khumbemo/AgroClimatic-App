import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, Terminal, BookOpen, Leaf, Microscope, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ChatMessage } from '../../types';
import { getNurseryContext } from '../../utils/chatContext';

const BASE_SYSTEM_PROMPT = `You are AgroBot Intelligence, an elite AI research assistant with PhD-level expertise in Forestry, Biological Taxonomy, and Ecology, specifically optimized for Greenhouse and Nursery Research.

SCIENTIFIC KNOWLEDGE FRAMEWORK:

1. FORESTRY & SILVICULTURE:
   - Systems: Deep knowledge of Shelterwood, Selection, Clearfelling, and Coppice-with-standards.
   - Management: Working Plans, Increment (MAI/CAI), Carbon Stock assessment (IPCC guidelines).
   - Species focus: Specific silvicultural characters of *Tectona grandis*, *Shorea robusta*, *Pinus*, *Cedrus*, *Eucalyptus*, and *Azadirachta indica*.

2. SEED SCIENCE & NURSERY TECH:
   - Physiology: Quiescence vs. Dormancy (Physical, Physiological, Morphological, Combinational).
   - Treatments: Scarification (mechanical/acid), Stratification (cold/warm), and Osmopriming.
   - Standards: ISTA protocols for sampling, purity, and germination testing.
   - Quality: Morphological (Height, RCD, S/R ratio) and Physiological (DQI, Chlorophyll fluorescence) indicators.

3. GREENHOUSE ENGINEERING & EXPERIMENTS:
   - Climate: Psychrometrics (VPD, absolute humidity, dew point), PAR (Photosynthetically Active Radiation), and DLI (Daily Light Integral).
   - Hydroponics/Substrate: CEC (Cation Exchange Capacity), air-filled porosity, fertigation scheduling, and nutrient deficiency diagnostics (N-P-K, micronutrients).
   - Design: Randomized Complete Block Design (RCBD), Split-plot, and Factorial designs for nursery trials.

CORE RULES:
- BINOMIAL NOMENCLATURE: Always use italics (*Genus species*) and current accepted names (POWO/IPNI).
- SCIENTIFIC PRECISION: Use technical terms (e.g., "hypogeal germination", "aniso-hydric behavior").
- CITATIONS: Reference GBIF, IUCN Red List, FSI, and peer-reviewed standards.
- STEP-BY-STEP ANALYSIS: For experimental queries, analyze variables before recommending designs.`;

const STARTERS = [
  "Dormancy breaking for Cedrus deodara",
  "Design an RCBD substrate experiment",
  "VPD vs RH for transpiration control",
  "Shelterwood vs Selection silviculture",
  "Calculate DQI for nursery quality",
];

const AgroBotPage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleSend = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setError(null);
    if (!overrideText) setInput('');

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey || apiKey === 'your_api_key') {
        throw new Error('Anthropic API key not configured. Please add VITE_ANTHROPIC_API_KEY to your .env file.');
      }

      const context = getNurseryContext();
      const fullSystemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${context}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-mid-way-request-from-browser': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20240620',
          max_tokens: 1024,
          system: fullSystemPrompt,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const reply = data.content?.[0]?.text || 'No response received.';
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
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-emerald-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-emerald-700 font-medium">$1</em>')
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
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
            AgroBot <span className="text-emerald-600">Intelligence</span>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="bg-emerald-100 p-1.5 rounded-lg"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </motion.div>
          </h1>
          <p className="text-[10px] text-gray-400 font-mono-sci uppercase tracking-widest mt-1">Domain-Locked Research AI</p>
        </div>
        <div className="flex gap-1.5">
          <motion.div whileHover={{ y: -2 }} className="p-2 bg-emerald-50 rounded-lg border border-emerald-100" title="Nursery Aware"><Database className="w-3.5 h-3.5 text-emerald-600" /></motion.div>
          <motion.div whileHover={{ y: -2 }} className="p-2 bg-gray-100 rounded-lg" title="Silviculture"><Leaf className="w-3.5 h-3.5 text-gray-400" /></motion.div>
          <motion.div whileHover={{ y: -2 }} className="p-2 bg-gray-100 rounded-lg" title="Taxonomy"><Microscope className="w-3.5 h-3.5 text-gray-400" /></motion.div>
          <motion.div whileHover={{ y: -2 }} className="p-2 bg-gray-100 rounded-lg" title="Ecology"><BookOpen className="w-3.5 h-3.5 text-gray-400" /></motion.div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 glass-panel rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col relative bg-white/40">
        
        {/* Messages Container */}
        <div
          ref={scrollRef}
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
                  className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mb-4 shadow-inner"
                >
                  <Bot className="w-8 h-8 text-emerald-600" />
                </motion.div>
                <h3 className="font-black text-gray-800 text-sm uppercase tracking-widest mb-2">Initialize Research Session</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                  Specialized in Forestry, Taxonomy, and Ecology. <br/>
                  *Binomial nomenclature enforced.*
                </p>

                <div className="w-full space-y-2">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Suggested Queries</p>
                  {STARTERS.map((s, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ x: 4, backgroundColor: 'rgba(236, 253, 245, 1)', borderColor: 'rgba(110, 231, 183, 1)' }}
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
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    {m.role === 'assistant' ? parseMarkdown(m.content) : m.content}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-bl-none flex gap-1">
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></motion.div>
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></motion.div>
                <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></motion.div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3"
            >
              <div className="bg-red-100 p-1.5 rounded-lg"><X className="w-4 h-4 text-red-600" /></div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">System Error</p>
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/60 backdrop-blur-md border-t border-gray-100">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm focus-within:border-emerald-500 transition-all">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about species, succession, VPD..."
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
                  : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
              }`}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="flex justify-between items-center mt-3 px-1">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-gray-300" />
              <span className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">Sonnet 3.5</span>
            </div>
            <p className="text-[8px] text-gray-400 font-medium">Shift + Enter for multi-line</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgroBotPage;
