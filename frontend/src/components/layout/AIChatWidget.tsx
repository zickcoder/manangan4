import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, MessageSquare, X, Send, Bot, User, Loader2, Minimize2, HelpCircle } from 'lucide-react';
import { sendAIChat } from '../../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChatWidget({ defaultRole = 'citizen' }: { defaultRole?: 'citizen' | 'staff' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: defaultRole === 'staff'
        ? '👨‍💼 Hello Officer! I am your PAFMS Smart AI Assistant. I can help you verify venue capacities, resolve double-booking schedule conflicts, review burial applications & Death Certificates, or inspect heavy municipal asset readiness. How may I assist you today?'
        : '👋 Hello! I am your PAFMS Smart AI Assistant for Quezon City Municipal Services. Ask me about reserving Parks & Civic Centers, schedule conflicts, Columbarium Wall Alpha permits, or reporting water leaks and drainage blockages!'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen for custom trigger event to open chat with optional prompt
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      setIsOpen(true);
      if (e.detail?.prompt) {
        setInput(e.detail.prompt);
      }
    };
    window.addEventListener('govserve_open_ai_chat', handleOpenEvent);
    return () => window.removeEventListener('govserve_open_ai_chat', handleOpenEvent);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText !== undefined ? customText : input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: textToSend.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendAIChat(
        updatedMessages.map(m => ({ role: m.role, content: m.content })),
        defaultRole
      );
      setMessages([...updatedMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: 'Apologies, I encountered a temporary connection issue. Please try again or check our Public Services Portal for standard checklists.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = defaultRole === 'staff'
    ? [
        'How to verify park & facility schedule conflicts',
        'Columbarium Wall Alpha niche status & registry billing',
        'Heavy equipment asset readiness & deployment rules'
      ]
    : [
        'How do I schedule Camarin Green Recreation Park?',
        'What are the requirements for Columbarium Niche Burial?',
        'Report a water pipe leak or clogged storm canal',
        'Check my ticket status (e.g. RES-2026-..., BUR-..., UTL-...)'
      ];

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-blue-600 animate-ping"></span>
          </div>
          <span className="text-xs font-extrabold font-display tracking-wide">Smart AI Assistant</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[410px] h-[540px] bg-white rounded-3xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold font-display">PAFMS Smart AI Assistant</h4>
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 font-semibold rounded border border-emerald-400/30">Online</span>
                </div>
                <p className="text-[10px] text-slate-300">Quezon City Municipal PAFMS Intelligence</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Close Assistant"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] whitespace-pre-line shadow-xs ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none font-sans'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 items-center text-xs text-slate-600 bg-white p-3 rounded-2xl w-fit border border-slate-200 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Checking municipal schedule & guidelines...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="p-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    handleSend(undefined, prompt);
                  }}
                  className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200 truncate max-w-full text-left font-medium"
                >
                  💡 {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about park bookings, civic centers, permits, or tickets..."
              className="flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white text-slate-800 transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-all shrink-0 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
