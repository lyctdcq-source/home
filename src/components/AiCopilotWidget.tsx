import { useEffect, useRef, useState } from 'react';
import {
  X,
  Mic,
  Square,
  ArrowUp,
  RefreshCw,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { AiIntentActionType, AiIntentResult } from '../types/gis';
import { BrandLogo } from './BrandLogo';

export interface AiChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  action?: AiIntentActionType;
  actionSummary?: string;
}

interface AiCopilotDialogProps {
  open: boolean;
  startVoiceOnOpen?: boolean;
  isProcessing: boolean;
  messages: AiChatMessage[];
  onClose: () => void;
  onResetChat: () => void;
  onSubmitQuery: (query: string) => Promise<AiIntentResult | null>;
}

const VOICE_INTENT_EXAMPLES = [
  '看看山谷蜂场调查',
  '打开滨江绿道继续记录',
  '新建乡村果园调研',
  '切换夜光星空地球',
];

const ACTION_LABELS: Record<AiIntentActionType, string> = {
  FOCUS_PROJECT: '已定位到地点',
  OPEN_PROJECT: '正在进入调查详情',
  CREATE_PROJECT: '已打开新建调查向导',
  FILTER_PROJECTS: '调查筛选已更新',
  SYNC_PROJECT: '现场记录已上传同步',
  PIN_PROJECT: '已设为首页常用调查',
  SET_ATMOSPHERE: '地球与天际光影已切换',
  TOGGLE_ROTATION: '地球旋转状态已更新',
  OPEN_SETTINGS: '已打开系统设置',
  UNKNOWN: '语音指令提示',
};

const WAVE_BAR_STYLES = [
  { height: '40%', delay: '0ms' },
  { height: '80%', delay: '120ms' },
  { height: '95%', delay: '240ms' },
  { height: '65%', delay: '100ms' },
  { height: '45%', delay: '180ms' },
];

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal?: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function AiCopilotDialog({
  open,
  startVoiceOnOpen = false,
  isProcessing,
  messages,
  onClose,
  onResetChat,
  onSubmitQuery,
}: AiCopilotDialogProps) {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceNotice, setVoiceNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simIndexRef = useRef(0);

  const stopVoice = () => {
    if (simTimerRef.current) {
      clearTimeout(simTimerRef.current);
      simTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop error
    }
    recognitionRef.current = null;
    setIsListening(false);
    setLiveTranscript('');
  };

  const handleStopAndExecute = () => {
    const pending = liveTranscript.replace(/^[“"]|[”"]$/g, '').trim();
    const isRealSpeech = Boolean(recognitionRef.current);
    stopVoice();
    if (isRealSpeech && pending && pending !== '正在聆听语音指令…') {
      void onSubmitQuery(pending);
    }
  };

  const startVoiceCapture = () => {
    stopVoice();
    setVoiceNotice('');

    const win = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = 'zh-CN';
        rec.interimResults = true;
        rec.maxAlternatives = 1;
        rec.onresult = (event) => {
          const results = event.results;
          let combined = '';
          let isFinal = false;
          for (let i = 0; i < results.length; i += 1) {
            combined += results[i]?.[0]?.transcript || '';
            if (results[i]?.isFinal) isFinal = true;
          }
          const clean = combined.trim();
          setLiveTranscript(clean);
          if (isFinal && clean) {
            stopVoice();
            void onSubmitQuery(clean);
          }
        };
        rec.onerror = () => {
          stopVoice();
          setVoiceNotice('未检测到麦克风权限，可直接键入或轻触下方示例指令。');
        };
        rec.onend = () => {
          setIsListening(false);
        };
        recognitionRef.current = rec;
        setIsListening(true);
        rec.start();
        return;
      } catch {
        // Fallback to interactive simulated voice command
      }
    }

    const sampleCommand =
      VOICE_INTENT_EXAMPLES[simIndexRef.current % VOICE_INTENT_EXAMPLES.length];
    simIndexRef.current += 1;
    setIsListening(true);
    setLiveTranscript('正在聆听语音指令…');
    simTimerRef.current = setTimeout(() => {
      setLiveTranscript(`“${sampleCommand}”`);
      simTimerRef.current = setTimeout(() => {
        setIsListening(false);
        setLiveTranscript('');
        void onSubmitQuery(sampleCommand);
      }, 450);
    }, 800);
  };

  useEffect(() => {
    if (!open) {
      stopVoice();
      setVoiceNotice('');
      return;
    }

    if (startVoiceOnOpen) {
      startVoiceCapture();
    }

    return () => stopVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startVoiceOnOpen]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isProcessing, liveTranscript, open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;
    setInput('');
    await onSubmitQuery(trimmed);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#11181c]/35 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="萃凡 AI 空间助手"
      onClick={onClose}
    >
      <section
        onClick={(e) => e.stopPropagation()}
        className="ai-dialog-pop relative flex max-h-[70dvh] w-full max-w-[412px] flex-col overflow-hidden rounded-t-[24px] border border-black/[0.08] bg-white/96 text-[#11181c] shadow-[0_20px_50px_-12px_rgba(10,24,18,0.28)] backdrop-blur-2xl sm:max-w-[396px] md:max-w-[420px] sm:rounded-[24px]"
      >
        {/* Subtle Drag Handle on Small Screens */}
        <div
          aria-hidden="true"
          className="pointer-events-none mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-slate-200 sm:hidden"
        />

        {/* Clean App-Aligned Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandLogo size={32} className="rounded-[10px] shadow-xs" />
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-bold tracking-tight text-[#11181c] leading-tight">
                萃凡 AI 助手
              </h3>
              <p className="truncate text-[11px] text-[#5a6962]">
                说句话就能查地点、建调查或换天色
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onResetChat}
              aria-label="重置对话"
              title="新会话"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#5a6962] transition-colors hover:bg-slate-100 hover:text-[#11181c]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭 AI 对话"
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#5a6962] transition-colors hover:bg-slate-100 hover:text-[#11181c]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Compact Scrollable Conversation Stream */}
        <div
          ref={scrollRef}
          className="min-h-[110px] flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3"
        >
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[84%] rounded-2xl rounded-br-sm bg-[#167248] px-3 py-2 text-[12.5px] font-medium leading-snug text-white">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div
                key={msg.id}
                className="rounded-2xl rounded-bl-sm border border-black/[0.05] bg-[#f4f7f5] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[#11181c]"
              >
                <p>{msg.text}</p>

                {msg.action && msg.action !== 'UNKNOWN' && (
                  <div className="mt-2 flex items-center gap-1.5 border-t border-black/[0.06] pt-1.5 text-[11px] font-semibold tabular-nums text-[#167248]">
                    <CheckCircle2 className="h-3 w-3 shrink-0" />
                    <span>{msg.actionSummary || ACTION_LABELS[msg.action]}</span>
                  </div>
                )}
              </div>
            )
          )}

          {/* Live Voice Recognition / Processing Feedback */}
          {(isListening || isProcessing) && (
            <div className="rounded-2xl border border-[#167248]/20 bg-[#eaf5ef] px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-[#167248]">
                  {isProcessing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      <span>正在执行空间指令…</span>
                    </>
                  ) : (
                    <span className="truncate">{liveTranscript || '正在聆听…'}</span>
                  )}
                </div>

                <div className="flex h-4 shrink-0 items-center gap-[2.5px]" aria-hidden="true">
                  {WAVE_BAR_STYLES.map((bar, idx) => (
                    <span
                      key={idx}
                      style={{ height: bar.height, animationDelay: bar.delay }}
                      className="ai-wave-bar w-[2px] rounded-full bg-[#167248]"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Compact 2x2 Quick Intent Suggestions */}
          {messages.length <= 2 && !isListening && !isProcessing && (
            <div className="pt-0.5">
              <div className="mb-1.5 text-[11px] font-medium text-[#7c8b84]">
                试试直接说出或点选
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {VOICE_INTENT_EXAMPLES.map((command) => (
                  <button
                    key={command}
                    type="button"
                    onClick={() => void onSubmitQuery(command)}
                    className="truncate rounded-xl border border-black/[0.07] bg-white px-2.5 py-2 text-left text-[11.5px] font-medium text-[#11181c] transition-colors hover:border-[#167248]/35 hover:bg-[#f4fbf7] hover:text-[#167248] active:scale-[0.98]"
                  >
                    “{command}”
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Calm, Proportional Bottom Voice & Text Console */}
        <div className="shrink-0 border-t border-black/[0.06] bg-[#f7f9f8] px-3.5 pt-2.5 pb-[max(14px,env(safe-area-inset-bottom))]">
          <form onSubmit={handleSubmit}>
            <div className="flex h-10 items-center gap-1 rounded-xl border border-black/[0.08] bg-white p-1 focus-within:border-[#167248] focus-within:ring-2 focus-within:ring-[#167248]/12">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入指令，如：看看雨水井巡检…"
                aria-label="向萃凡 AI 发送文字指令"
                className="min-w-0 flex-1 bg-transparent px-2.5 text-[12.5px] text-[#11181c] placeholder:text-[#7c8b84] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                aria-label="发送指令"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#167248] text-white transition-colors hover:bg-[#115a38] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </div>
          </form>

          <button
            type="button"
            onClick={isListening ? handleStopAndExecute : startVoiceCapture}
            disabled={isProcessing}
            className={`mt-2 flex h-11 w-full items-center justify-between rounded-xl px-3.5 text-left text-[12.5px] font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${
              isListening
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-[#167248] text-white shadow-xs hover:bg-[#115a38]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isListening ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              <span>
                {isListening ? '正在聆听 · 轻触结束并执行' : '轻触说话 · 语音直接操控'}
              </span>
            </div>

            {isListening && (
              <div className="flex h-4 items-center gap-[2.5px]" aria-hidden="true">
                {WAVE_BAR_STYLES.map((bar, idx) => (
                  <span
                    key={idx}
                    style={{ height: bar.height, animationDelay: bar.delay }}
                    className="ai-wave-bar w-[2px] rounded-full bg-white/90"
                  />
                ))}
              </div>
            )}
          </button>

          {voiceNotice && (
            <p className="mt-1.5 px-1 text-[11px] text-[#167248]">{voiceNotice}</p>
          )}
        </div>
      </section>
    </div>
  );
}
