// AICopilotPanel.tsx — Premium AI Smart Home Copilot
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, MicOff, Zap, BrainCircuit, ChevronRight, Trash2, AlertTriangle, Settings } from 'lucide-react';
import { useAIStore, type ChatMessage } from '../../store/useAIStore';
import { copilotChat } from '../../services/ai/aiService';
import { cn } from '../../utils/cn';

const SUGGESTIONS = [
  { text: 'Why is my power usage high?',      icon: '⚡' },
  { text: 'Turn off all unused devices',       icon: '💡' },
  { text: 'Create a movie night scene',        icon: '🎬' },
  { text: 'Analyze my energy usage',           icon: '📊' },
  { text: 'Turn off all lights',               icon: '🌙' },
  { text: 'Which room uses the most energy?',  icon: '🏠' },
];

// ── Markdown renderer ────────────────────────────────────────────────────────
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}
            className={line.startsWith('•') || line.startsWith('-') ? 'pl-3 -indent-3' : ''}
            style={{ margin: '2px 0' }}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} style={{ color: 'var(--cyan)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--cyan)' }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AICopilotPanel() {
  const {
    isOpen, closePanel, messages, addMessage, appendToMessage, updateMessage,
    clearMessages, isThinking, setThinking, isConfigured, apiKey, setApiKey,
    setActiveTab, activeTab, anomalies, insight, refreshInsights,
    model, setModel,
  } = useAIStore();

  const [input,       setInput]       = useState('');
  const [listening,   setListening]   = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const [showApiInput, setShowApiInput] = useState(false);

  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);
  const recognitionRef  = useRef<any>(null);
  // Safety net: if AI never calls done, reset after 30s
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clear thinking safety timer on unmount
  useEffect(() => {
    return () => { if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current); };
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage({
        role: 'assistant',
        content: isConfigured
          ? `👋 Hi! I'm **HoloRoom AI**, your smart home copilot.\n\nI can control devices, create scenes, build automations, and analyze your energy usage. What would you like to do?`
          : `👋 Hi! I'm **HoloRoom AI**.\n\nI'm running in **offline mode** — I can show basic home info, but for full AI features add your **Groq API key** using the ⚙️ button above.`,
        isStreaming: false,
      });
    }
  }, [isOpen]);

  // ── Core send ───────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || isThinking) return;
    setInput('');

    addMessage({ role: 'user', content: msg });
    setThinking(true);

    const assistantId = addMessage({ role: 'assistant', content: '', isStreaming: true });

    // Safety net: forcibly reset thinking after 30s in case of silent failure
    if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    thinkingTimerRef.current = setTimeout(() => {
      updateMessage(assistantId, {
        content: '⚠️ Response timed out. Please try again.',
        isStreaming: false,
      });
      setThinking(false);
    }, 30_000);

    let doneCalled = false;
    let accumulatedText = '';
    // Store function results here so finalizeDone always has them
    let latestFunctionResults: { name: string; result: string }[] = [];

    const finalizeDone = () => {
      if (doneCalled) return;
      doneCalled = true;
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
      const updates: Partial<ChatMessage> = { isStreaming: false };
      if (!accumulatedText.trim()) {
        updates.content = '✅ Done.';
      }
      // Set function result badges ONCE here — never anywhere else
      if (latestFunctionResults.length) {
        updates.functionCalls = latestFunctionResults;
      }
      updateMessage(assistantId, updates);
      setThinking(false);
      refreshInsights();
    };

    try {
      const result = await copilotChat(msg, (delta, done) => {
        if (delta) {
          accumulatedText += delta;
          appendToMessage(assistantId, delta);
        }
        if (done) {
          // done arrives — finalizeDone will pick up latestFunctionResults
          // which is set synchronously when copilotChat's promise resolves
          // Use setTimeout(0) so the promise return value is captured first
          setTimeout(finalizeDone, 0);
        }
      });

      // Capture function results before finalizeDone runs
      latestFunctionResults = result?.functionResults ?? [];
      // If done callback already fired and scheduled finalizeDone via setTimeout,
      // it will now have latestFunctionResults. If it hasn't fired yet, finalizeDone
      // below will run after this assignment.
      finalizeDone();

    } catch (err) {
      const errMsg = `⚠️ ${err instanceof Error ? err.message : 'Something went wrong. Please try again.'}`;
      accumulatedText = errMsg;
      updateMessage(assistantId, { content: errMsg, isStreaming: false });
      doneCalled = true;
      if (thinkingTimerRef.current) {
        clearTimeout(thinkingTimerRef.current);
        thinkingTimerRef.current = null;
      }
      setThinking(false);
    }
  }, [input, isThinking, addMessage, appendToMessage, updateMessage, setThinking, refreshInsights]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Voice ───────────────────────────────────────────────────────────────────
  const startVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous     = false;
    rec.interimResults = false;
    rec.lang           = 'en-US';
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setListening(false);
      sendMessage(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [sendMessage]);

  const stopVoice = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const handleSaveKey = () => {
    const trimmed = apiKeyInput.trim();
    setApiKey(trimmed);
    setShowApiInput(false);
    clearMessages();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-stretch justify-end pointer-events-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-auto"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
          onClick={closePanel}
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 38 }}
          className="relative pointer-events-auto flex flex-col h-full"
          style={{
            width: 'min(420px, 100vw)',
            background: 'rgba(8, 12, 20, 0.98)',
            borderLeft: '1px solid rgba(0, 212, 255, 0.12)',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(112,144,255,0.2))', border: '1px solid rgba(0,212,255,0.3)' }}>
                <BrainCircuit size={16} style={{ color: 'var(--cyan)' }} />
              </div>
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>HoloRoom AI</div>
                <div className="text-[10px]" style={{ color: isConfigured ? 'var(--green)' : 'var(--text-muted)' }}>
                  {isConfigured ? '● AI Active' : '○ Offline Mode'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowApiInput(v => !v)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-60 transition-all"
                style={{ color: showApiInput ? 'var(--cyan)' : 'var(--text-muted)' }} title="AI Settings">
                <Settings size={14} />
              </button>
              <button onClick={clearMessages}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-60 transition-all"
                style={{ color: 'var(--text-muted)' }} title="Clear chat">
                <Trash2 size={14} />
              </button>
              <button onClick={closePanel}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-60 transition-all"
                style={{ color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── API Key input ── */}
          <AnimatePresence>
            {showApiInput && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-4 py-3 flex flex-col gap-3">
                  {/* Backend status */}
                  <div>
                    <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Python Backend
                    </div>
                    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)' }}>
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Connected to <code className="text-xs" style={{ color: 'var(--cyan)' }}>holoroom-touchbeat-backend.onrender.com</code>
                      </span>
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      API key is stored in <code>backend/.env</code> — not in the browser
                    </div>
                  </div>
                  {/* Model selector */}
                  <div>
                    <div className="text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                      AI Model
                    </div>
                    <select
                      value={model}
                      onChange={e => setModel(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg text-xs outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (best accuracy)</option>
                      <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (faster, fewer rate limits)</option>
                      <option value="llama3-70b-8192">llama3-70b-8192 (alternative 70b)</option>
                    </select>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      Switch to 8b-instant if you hit rate limits often
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Tabs ── */}
          <div className="flex shrink-0 px-4 pt-2 gap-1"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {(['chat', 'insights', 'automations'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-3 py-1.5 rounded-t-lg text-xs font-medium capitalize transition-all"
                style={{
                  color: activeTab === tab ? 'var(--cyan)' : 'var(--text-muted)',
                  borderBottom: activeTab === tab ? '2px solid var(--cyan)' : '2px solid transparent',
                  background: 'transparent',
                }}>
                {tab === 'chat' ? '💬 Chat' : tab === 'insights' ? '⚡ Insights' : '🤖 AI Actions'}
              </button>
            ))}
          </div>

          {/* ── Chat tab ── */}
          {activeTab === 'chat' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                {messages.map(msg => (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    {msg.role === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-tr-md text-sm"
                          style={{ background: 'rgba(33,150,243,0.2)', border: '1px solid rgba(33,150,243,0.25)', color: 'var(--text-primary)' }}>
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2.5">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
                          <BrainCircuit size={12} style={{ color: 'var(--cyan)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          {msg.isStreaming && !msg.content
                            ? <TypingDots />
                            : <MarkdownText text={msg.content} />
                          }
                          {msg.functionCalls?.length ? (
                            <div className="mt-2 space-y-1">
                              {msg.functionCalls.map((fc, i) => (
                                <div key={i} className="text-[10px] px-2 py-1 rounded-lg"
                                  style={{ background: 'rgba(76,175,80,0.1)', color: 'var(--green)', border: '1px solid rgba(76,175,80,0.15)' }}>
                                  ✓ {fc.result}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 shrink-0">
                  <div className="text-[10px] mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Suggestions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s.text)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                        <span>{s.icon}</span>{s.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="px-4 pb-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-end gap-2 mt-3 rounded-2xl p-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={listening ? '🎙️ Listening...' : isThinking ? 'AI is thinking...' : 'Ask anything about your home...'}
                    rows={1}
                    disabled={isThinking}
                    className="flex-1 bg-transparent outline-none resize-none text-sm py-1 px-1 disabled:opacity-50"
                    style={{ color: 'var(--text-primary)', maxHeight: 120, overflowY: 'auto' }}
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={listening ? stopVoice : startVoice}
                      disabled={isThinking}
                      className={cn('w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30', listening && 'animate-pulse')}
                      style={{ background: listening ? 'rgba(255,59,48,0.2)' : 'transparent', color: listening ? 'var(--red)' : 'var(--text-muted)' }}>
                      {listening ? <MicOff size={15} /> : <Mic size={15} />}
                    </button>
                    <button
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || isThinking}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
                      style={{ background: input.trim() && !isThinking ? 'var(--accent)' : 'transparent', color: input.trim() && !isThinking ? '#fff' : 'var(--text-muted)' }}>
                      <Send size={14} />
                    </button>
                  </div>
                </div>
                {isThinking && (
                  <div className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
                    AI is working… this may take a few seconds
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Insights tab ── */}
          {activeTab === 'insights' && (
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {insight && (
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.15)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} style={{ color: 'var(--amber)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--amber)' }}>Energy Overview</span>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{insight.summary}</div>
                  <div className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                    Top: {insight.topConsumer} · {insight.forecast}
                  </div>
                  {insight.savings !== 'Usage looks efficient' && (
                    <div className="text-xs mt-1.5 px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(76,175,80,0.1)', color: 'var(--green)' }}>
                      💰 {insight.savings}
                    </div>
                  )}
                </div>
              )}

              {anomalies.length > 0 ? (
                <div>
                  <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Anomaly Alerts</div>
                  {anomalies.map((a, i) => (
                    <div key={i} className="rounded-xl p-3 mb-2"
                      style={{
                        background: a.severity === 'high' ? 'rgba(255,59,48,0.08)' : 'rgba(255,184,0,0.08)',
                        border: `1px solid ${a.severity === 'high' ? 'rgba(255,59,48,0.2)' : 'rgba(255,184,0,0.15)'}`,
                      }}>
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={13} style={{ color: a.severity === 'high' ? 'var(--red)' : 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
                        <div className="min-w-0">
                          <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{a.deviceName}</div>
                          <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{a.issue}</div>
                          <div className="text-[11px] mt-1" style={{ color: 'var(--green)' }}>→ {a.suggestion}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(76,175,80,0.08)', border: '1px solid rgba(76,175,80,0.15)' }}>
                  <div className="text-sm" style={{ color: 'var(--green)' }}>✅ No anomalies detected</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>All devices running normally</div>
                </div>
              )}

              <button onClick={() => { setActiveTab('chat'); sendMessage('Analyze my home energy and detect any issues'); }}
                className="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--cyan)' }}>
                <BrainCircuit size={14} className="inline mr-2" />Ask AI for detailed analysis
              </button>
            </div>
          )}

          {/* ── AI Actions tab ── */}
          {activeTab === 'automations' && (
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Describe what you want to automate in plain language. AI will create the rule automatically.
              </div>
              <div className="space-y-2">
                {[
                  { icon: '🌙', text: 'Turn off all lights at 11 PM every night' },
                  { icon: '☀️', text: 'Turn on garden lights at sunrise' },
                  { icon: '⚡', text: 'Alert me when power exceeds 3000W' },
                  { icon: '❄️', text: 'Turn on bedroom AC at 10 PM on weekdays' },
                  { icon: '🚿', text: 'Turn off geyser after 30 minutes' },
                  { icon: '🎬', text: 'Dim living room lights when TV turns on' },
                ].map((s, i) => (
                  <button key={i} onClick={() => { setActiveTab('chat'); sendMessage(s.text); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-lg shrink-0">{s.icon}</span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.text}</span>
                    <ChevronRight size={12} style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }} />
                  </button>
                ))}
              </div>
              <div className="pt-2">
                <button onClick={() => setActiveTab('chat')}
                  className="w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                  style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--cyan)' }}>
                  ✏️ Type a custom automation
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
