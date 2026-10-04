import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, Terminal, ArrowDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type ChatMessage } from '../../types';
import { AI_ENABLED, AI_MODEL, generateText } from '../../services/ai';
import { buildNurseryContext, offlineAnswer, type NurserySnapshot } from '../../services/nurseryContext';
import { useCollection } from '../../data/hooks';

const BASE_SYSTEM_PROMPT = `You are AgroBot, a research assistant for forest nurseries: seed science, silviculture, greenhouse climate and experimental design.
- Use the NURSERY RECORDS block for anything about this nursery. If a fact is not there, say it is not in the records; never invent batch numbers, counts or measurements.
- For general science, give established knowledge and name the method or source type (e.g. ISTA rules, Tetens equation).
- Decline questions unrelated to forestry, agronomy, ecology or nursery practice.
- Be concise. Write binomial names in italics (*Genus species*) and give units.`;

const HAS_LIVE_MODEL = AI_ENABLED;

const STARTERS = [
  "Report on batch NB-2024-001",
  "Seed lot SL-001",
  "What VPD suits seedlings?",
  "Explain mean germination time",
  "Explain RCBD for nursery trials",
];

// Model and record text are escaped before the small markdown subset is applied,
// so nothing in a reply can inject markup into the page.
const escapeHtml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const AgroBotPage = () => {
  const snapshot: NurserySnapshot = {
    batches: useCollection('batches').items,
    species: useCollection('species').items,
    seedLots: useCollection('seedLots').items,
    germination: useCollection('germinationCounts').items,
    growth: useCollection('growthMeasurements').items,
    climate: useCollection('climateReadings').items,
    mortality: useCollection('mortalityEvents').items,
  };
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
      let reply: string;
      if (!HAS_LIVE_MODEL) {
        await new Promise(r => setTimeout(r, 300));
        reply = offlineAnswer(text, snapshot);
      } else {
        const history = messages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
        reply = await generateText(
          `${buildNurseryContext(snapshot)}\n\n${history ? `CONVERSATION SO FAR\n${history}\n\n` : ''}QUESTION: ${text}`,
          { system: BASE_SYSTEM_PROMPT },
        );
      }
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : 'Connection error. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const parseMarkdown = (text: string) => {
    const parsed = escapeHtml(text)
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
      <div className="flex-1 glass-panel rounded-xl border border-gray-100 shadow-xs overflow-hidden flex flex-col relative bg-white/40">
        
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
                  <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest mb-3">Try asking</p>
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
                  <div className={`max-w-[85%] p-4 rounded-lg text-sm leading-relaxed shadow-xs ${
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
            className="absolute bottom-24 right-6 p-2 bg-green-600 text-white rounded-full shadow-xs z-20"
          >
            <ArrowDown className="w-4 h-4" />
          </motion.button>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white/60 border-t border-gray-100">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-gray-200 shadow-xs focus-within:border-green-500 transition-all">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask species, batch data, VPD..."
              className="flex-1 bg-transparent border-none text-sm font-medium outline-hidden px-3 placeholder-gray-400"
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
                  : 'bg-green-600 text-white shadow-xs '
              }`}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
          <div className="flex justify-between items-center mt-3 px-1">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Terminal className="w-3 h-3" />
              <span className="text-[10px] font-mono-sci">{HAS_LIVE_MODEL ? AI_MODEL : 'offline'}</span>
            </div>
            <p className="text-[10px] text-gray-500">Check advice against your own trial data.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgroBotPage;
