import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAIStore, SUGGESTED_QUESTIONS } from '@/stores/aiStore';
import type { AIMode, AutonomySetting } from '@/lib/ai/types';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Send,
  Sparkles,
  User,
  RotateCcw,
  ArrowRight,
  Zap,
  CheckCircle2,
  Cpu,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChangeSetCard } from './components/ChangeSetCard';

export const AIAssistantPage: React.FC = () => {
  const navigate = useNavigate();
  const mode = useAIStore((s) => s.mode);
  const setMode = useAIStore((s) => s.setMode);
  const autonomySetting = useAIStore((s) => s.autonomySetting);
  const setAutonomySetting = useAIStore((s) => s.setAutonomySetting);
  const messages = useAIStore((s) => s.messages);
  const sendMessage = useAIStore((s) => s.sendMessage);
  const confirmChangeSet = useAIStore((s) => s.confirmChangeSet);
  const cancelChangeSet = useAIStore((s) => s.cancelChangeSet);
  const undoLastAction = useAIStore((s) => s.undoLastAction);
  const isLoading = useAIStore((s) => s.isLoading);
  const isExecutingAction = useAIStore((s) => s.isExecutingAction);
  const clearHistory = useAIStore((s) => s.clearHistory);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isExecutingAction]);

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || isLoading) return;
    setInput('');
    await sendMessage(prompt);
  };

  const handleModeToggle = (newMode: AIMode) => {
    setMode(newMode);
    toast.success(`Switched AI assistant to ${newMode} mode`);
  };

  const handleAutonomyChange = (setting: AutonomySetting) => {
    setAutonomySetting(setting);
    toast.success(`AI Autonomy set to ${setting.replace('_', ' ')}`);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto h-[calc(100vh-130px)] flex flex-col justify-between">
      {/* Top Header, Autonomy Policy & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              WorkTrip AI Actions & Intelligence
              <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Two-Phase Actions
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Deterministic schedule optimization, typed write tools & cross-DB consistency
            </p>
          </div>
        </div>

        {/* Autonomy Level & Mode Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Autonomy Selector */}
          <div className="flex items-center rounded-xl bg-[#0e101a] p-1 border border-slate-800 text-[11px]">
            <SlidersHorizontal className="w-3 h-3 text-slate-400 mx-1.5" />
            {(['SUGGEST_ONLY', 'BALANCED', 'MORE_AUTONOMOUS'] as AutonomySetting[]).map((auto) => {
              const active = autonomySetting === auto;
              return (
                <button
                  key={auto}
                  type="button"
                  onClick={() => handleAutonomyChange(auto)}
                  className={cn(
                    'px-2 py-0.5 rounded-md font-semibold transition-all',
                    active
                      ? 'bg-indigo-600/80 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  )}
                >
                  {auto === 'SUGGEST_ONLY' ? 'Suggest Only' : auto === 'BALANCED' ? 'Balanced' : 'Autonomous'}
                </button>
              );
            })}
          </div>

          {/* AI Modes */}
          <div className="flex items-center rounded-xl bg-[#0e101a] p-1 border border-slate-800">
            {(['ASK', 'ANALYZE', 'PLAN'] as AIMode[]).map((m) => {
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleModeToggle(m)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m === 'ASK' ? '💬 Ask' : m === 'ANALYZE' ? '📊 Analyze' : '🗓️ Plan'}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            className="text-xs text-slate-400 hover:text-slate-200 gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 py-2 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';

          return (
            <div
              key={msg.id}
              className={cn(
                'flex items-start gap-3 text-sm animate-in fade-in-50 duration-200',
                isUser ? 'justify-end' : 'justify-start'
              )}
            >
              {!isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mt-0.5 shadow-sm">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={cn(
                  'max-w-[85%] rounded-2xl p-4 shadow-md leading-relaxed space-y-3',
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-[#101322] text-slate-200 border border-slate-800/90 rounded-tl-none'
                )}
              >
                {/* Message Header for Assistant */}
                {!isUser && msg.modelUsed && (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-indigo-300 font-mono">
                      <Cpu className="w-3 h-3 text-indigo-400" />
                      {msg.modelUsed}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {/* Main Content */}
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>

                {/* ChangeSet Action Card */}
                {msg.changeSet && (
                  <ChangeSetCard
                    changeSet={msg.changeSet}
                    isExecuting={isExecutingAction}
                    onConfirm={confirmChangeSet}
                    onCancel={cancelChangeSet}
                    onUndo={undoLastAction}
                  />
                )}

                {/* Tool Executions Disclosure */}
                {msg.toolCallsExecuted && msg.toolCallsExecuted.length > 0 && (
                  <div className="p-3 rounded-xl bg-[#090b14] border border-slate-800/80 space-y-1.5 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Deterministic Tools Executed
                    </span>
                    <div className="space-y-1">
                      {msg.toolCallsExecuted.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                          <span className="text-slate-400">⚡ {t.tool}()</span>
                          {t.resultSummary && (
                            <span className="text-emerald-400 font-semibold">{t.resultSummary}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendation Cards */}
                {msg.recommendations && msg.recommendations.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {msg.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-indigo-500/40 bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <h5 className="font-bold text-white flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            {rec.title}
                          </h5>
                          <p className="text-[11px] text-slate-300 mt-0.5">{rec.description}</p>
                        </div>
                        {rec.actionLink && (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => navigate(rec.actionLink!)}
                            className="text-xs h-7 gap-1 shrink-0"
                          >
                            <span>{rec.actionLabel || 'View in App'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Metric Badges */}
                {msg.metrics && msg.metrics.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {msg.metrics.map((m, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="font-semibold text-white">{m.label}:</span>
                        <span>{m.value}</span>
                      </span>
                    ))}
                  </div>
                )}

                {isUser && (
                  <span className="block text-[10px] text-indigo-200 text-right mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {isUser && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 text-sm animate-pulse">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-[#101322] border border-slate-800 text-xs text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Analyzing schedule, calculating impact diffs & preparing action plan...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Ribbon */}
      <div className="pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-xl border border-slate-800 bg-[#0e111a] hover:bg-slate-800 hover:border-slate-700 text-xs text-slate-300 transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>“{q}”</span>
            </button>
          ))}
        </div>

        {/* Input Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'ASK'
                ? 'Ask WorkTrip AI: "Make Thursday WFH", "Make all Thursdays WFH for the next 3 months"...'
                : mode === 'ANALYZE'
                ? 'Analyze spending variances, flight vs train costs, fatigue metrics...'
                : 'Plan upcoming office sprints, holiday bridges, lodging batches...'
            }
            className="flex h-12 w-full rounded-2xl border border-slate-800 bg-[#101320] pl-4 pr-14 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-lg transition-all"
          />
          <Button
            type="submit"
            variant="default"
            size="icon-sm"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 h-8 w-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
