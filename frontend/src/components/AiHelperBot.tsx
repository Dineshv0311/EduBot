import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  askAiHelper,
  ChatMessage
} from '../services/aiHelperService';
import {
  Bot,
  Sparkles,
  X,
  Send,
  Trash2,
  Key,
  Check,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export const AiHelperBot: React.FC = () => {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState<string>('');
  const [keySavedToast, setKeySavedToast] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize saved key from localStorage on mount
  useEffect(() => {
    const key = localStorage.getItem('edubot_gemini_api_key') || '';
    setSavedKey(key);
    setApiKeyInput(key);
  }, []);

  // Initial welcome message
  const initialMessages: ChatMessage[] = [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `### 👋 Hi ${user?.name || 'Student'}! I'm EduBot Helper
I'm your AI placement assistant for the EduBot portal. Ask me anything about:

- **🏢 Company Guides:** Interview preparation for *TechCorp Labs*, *FinTech Solutions*, etc.
- **💻 Coding Tracker:** How to log and track your algorithmic problem-solving.
- **📄 Resume Builder:** Optimizing your ATS score and generating clean PDFs.
- **🎯 Practice Hub:** Taking company mock interviews and timed aptitude tests.
- **⚠️ Portal Issues:** Troubleshooting score sync, submissions, or account queries.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'knowledge_base'
    }
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !showKeyConfig) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, showKeyConfig]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await askAiHelper(text, messages, token, user?.name);

      const botMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: response.source
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `### ⚠️ Temporary Communication Error\nI could not reach the server. Please check your internet connection or verify your Gemini API key in settings.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'knowledge_base'
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('edubot_gemini_api_key', trimmed);
      setSavedKey(trimmed);
    } else {
      localStorage.removeItem('edubot_gemini_api_key');
      setSavedKey('');
    }
    setKeySavedToast(true);
    setTimeout(() => {
      setKeySavedToast(false);
      setShowKeyConfig(false);
    }, 1200);
  };

  const handleClearChat = () => {
    setMessages(initialMessages);
  };

  // Helper to format text with markdown bold, headers, and bullet points
  const formatMarkdown = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-slate-900 text-sm mt-2 mb-1.5 flex items-center gap-1.5">
            {line.replace('### ', '')}
          </h4>
        );
      }
      // Heading 2
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-bold text-slate-900 text-base mt-2.5 mb-1.5">
            {line.replace('## ', '')}
          </h3>
        );
      }
      // Bullet list item
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const bulletText = line.substring(2);
        return (
          <li key={idx} className="ml-4 list-disc text-slate-700 text-xs my-0.5 leading-relaxed">
            {renderFormattedInline(bulletText)}
          </li>
        );
      }
      // Numbered list item
      const numMatch = line.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return (
          <li key={idx} className="ml-4 list-decimal text-slate-700 text-xs my-0.5 leading-relaxed">
            {renderFormattedInline(numMatch[2])}
          </li>
        );
      }
      // Empty line
      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }
      // Standard paragraph
      return (
        <p key={idx} className="text-slate-700 text-xs leading-relaxed my-0.5">
          {renderFormattedInline(line)}
        </p>
      );
    });
  };

  // Render bold **text** and italic *text*
  const renderFormattedInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="italic text-slate-800">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1 py-0.5 bg-slate-100 text-indigo-700 rounded text-[11px] font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const quickPrompts = [
    { label: '🏢 TechCorp Labs Guide', prompt: 'Tell me about TechCorp Labs interview preparation and questions.' },
    { label: '💳 FinTech Solutions Guide', prompt: 'What topics and interview questions does FinTech Solutions ask?' },
    { label: '💻 Coding Tracker Guide', prompt: 'How does the Coding Tracker work and how to log problems?' },
    { label: '📄 Resume ATS Tips', prompt: 'How do I optimize my resume ATS score and export to PDF?' },
    { label: '⚠️ Portal Score Issue', prompt: 'My test or interview score is not updating, what should I do?' }
  ];

  return (
    <>
      {/* Floating Side Action Button */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1.5 rounded-full border border-indigo-200/80 shadow-md text-xs font-semibold text-slate-700 hover:text-indigo-600 cursor-pointer transition select-none animate-fade-in"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>Need Help? Ask AI</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle AI Helper Chat"
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center group focus:outline-none focus:ring-4 focus:ring-indigo-300"
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform duration-200 group-hover:rotate-90" />
          ) : (
            <>
              <Bot className="w-7 h-7 transition-transform duration-200 group-hover:scale-110" />
              <span className="absolute top-1 right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Floating Chat Interface */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="EduBot AI Student Assistant"
          className="fixed bottom-24 right-4 sm:right-6 w-[410px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-7.5rem)] rounded-2xl shadow-2xl bg-white border border-slate-200/90 flex flex-col overflow-hidden z-50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white p-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center text-white">
                <Bot className="w-5 h-5 text-indigo-100" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-white leading-tight">
                    EduBot Helper
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/30 text-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online
                  </span>
                </div>
                <span className="text-[11px] text-indigo-100/90 font-medium">
                  Placement & Portal Assistant
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/90">
              <button
                onClick={() => setShowKeyConfig(!showKeyConfig)}
                title="Configure Gemini API Key"
                className={`p-1.5 rounded-lg transition hover:bg-white/20 hover:text-white ${
                  showKeyConfig || savedKey ? 'bg-white/20 text-white' : 'text-indigo-200'
                }`}
              >
                <Key className="w-4 h-4" />
              </button>

              <button
                onClick={handleClearChat}
                title="Clear Chat History"
                className="p-1.5 rounded-lg transition hover:bg-white/20 hover:text-white text-indigo-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                title="Close Helper"
                className="p-1.5 rounded-lg transition hover:bg-white/20 hover:text-white text-indigo-200"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Gemini API Key Slide-down Drawer */}
          {showKeyConfig && (
            <div className="bg-indigo-50/90 border-b border-indigo-100 p-3.5 shrink-0 text-xs animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  Gemini API Key Settings
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 text-[11px]"
                >
                  Get Free Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-slate-600 text-[11px] mb-2 leading-relaxed">
                Connect your Google Gemini API Key for smart dynamic answers. If left empty, EduBot operates using its structured offline knowledge base.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSaveApiKey}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-xs flex items-center gap-1 transition shadow-xs"
                >
                  {keySavedToast ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Saved
                    </>
                  ) : (
                    'Save Key'
                  )}
                </button>
              </div>
              {savedKey && (
                <div className="mt-2 text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" /> Custom Gemini API Key is configured in browser!
                </div>
              )}
            </div>
          )}

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs text-xs ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs'
                      : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div>{formatMarkdown(msg.content)}</div>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}

                  <div
                    className={`mt-1.5 flex items-center gap-1.5 text-[10px] ${
                      msg.role === 'user' ? 'text-indigo-200 justify-end' : 'text-slate-400 justify-between'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <span className="font-medium text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                        {msg.source === 'gemini' ? '✨ Gemini AI' : '📚 Knowledge Base'}
                      </span>
                    )}
                    <span>{msg.timestamp}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 items-center justify-start">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 shadow-xs flex items-center gap-1.5 text-xs text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                  <span>Thinking...</span>
                  <div className="flex gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompts */}
          <div className="bg-white border-t border-slate-100 px-3 py-2 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex gap-1.5 whitespace-nowrap">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(item.prompt)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-full bg-indigo-50/80 hover:bg-indigo-100/90 text-indigo-700 text-[11px] font-medium border border-indigo-200/60 transition shrink-0 active:scale-95 disabled:opacity-50"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask about portal, companies, or prep..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                aria-label="Send message"
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition shadow-xs disabled:shadow-none shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
              <span>Press Enter to send</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                EduBot AI Helper
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
