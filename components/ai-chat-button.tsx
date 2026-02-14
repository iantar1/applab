'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, Loader2, Stethoscope, Heart, Pill, Activity, RotateCcw, Mic, MicOff, MessageSquareText, Volume2, VolumeX, Keyboard } from 'lucide-react';

/* ── types ── */

/* Browser SpeechRecognition type (webkit prefixed) */
interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type Mode = 'pick' | 'text' | 'voice';
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

/* ── constants ── */
const QUICK_PROMPTS = [
  { icon: <Stethoscope className="h-4 w-4" />, label: 'Symptoms check', message: 'I have some symptoms I want to ask about' },
  { icon: <Activity className="h-4 w-4" />, label: 'Blood tests', message: 'What blood tests do you offer and what do they check for?' },
  { icon: <Pill className="h-4 w-4" />, label: 'Medications', message: 'Can you explain medication side effects?' },
  { icon: <Heart className="h-4 w-4" />, label: 'Prevention', message: 'What health checkups should I do regularly?' },
];

const WELCOME_MSG: ChatMessage = {
  role: 'assistant',
  content: "Hello! 👋 I'm your **medical AI assistant**. I can help you with:\n\n• General health questions\n• Understanding medical tests\n• Symptom guidance\n• Booking the right service\n\nHow can I help you today?",
};

/* ── helpers: browser speech APIs ── */
function getSpeechRecognitionClass(): { new(): ISpeechRecognition } | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return SR ? (SR as { new(): ISpeechRecognition }) : null;
}

/* Audio instance for ElevenLabs playback */
let currentAudio: HTMLAudioElement | null = null;

async function speakTextElevenLabs(text: string, onEnd?: () => void) {
  try {
    // Stop any currently playing audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }

    const clean = text.replace(/\*\*/g, '').replace(/[•]/g, ',');
    
    const response = await fetch('/api/ai/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean }),
    });

    if (!response.ok) {
      console.error('ElevenLabs TTS failed');
      onEnd?.();
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onEnd?.();
    };

    audio.onerror = () => {
      URL.revokeObjectURL(audioUrl);
      currentAudio = null;
      onEnd?.();
    };

    await audio.play();
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    onEnd?.();
  }
}

function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

/* ══════════════════════════════════════════════════════ */
export function AiChatButton() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('pick');

  /* ── text mode state ── */
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── voice mode state ── */
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [voiceHistory, setVoiceHistory] = useState<ChatMessage[]>([]);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceInput, setVoiceInput] = useState('');

  /* focus input in text mode */
  useEffect(() => {
    if (open && mode === 'text') setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, mode]);

  /* scroll chat */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* cleanup on close */
  useEffect(() => {
    if (!open) {
      // Stop audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopSpeaking();
      try { recognitionRef.current?.abort(); } catch {}
      setVoiceState('idle');
    }
  }, [open]);

  /* ── text mode: send ── */
  const doSend = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history: messages.slice(-10) }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply || data.error || "Sorry, I couldn't respond." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(input); }
  };

  /* ── voice mode: listen + respond ── */
  const startListening = useCallback(() => {
    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopSpeaking();
    setTranscript('');
    setAiReply('');
    setVoiceState('listening');

    const SRClass = getSpeechRecognitionClass();
    if (!SRClass) {
      setAiReply('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setVoiceState('idle');
      return;
    }

    const r = new SRClass();
    r.continuous = false;
    r.interimResults = true;
    r.lang = 'en-US';
    recognitionRef.current = r;

    let finalText = '';

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript;
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      setTranscript(finalText || interim);
    };

    r.onend = async () => {
      const text = finalText.trim();
      if (!text) {
        setAiReply('No speech detected. Please try again.');
        setVoiceState('idle');
        setTranscript('');
        return;
      }
      setTranscript(text);
      setVoiceState('processing');

      try {
        // Call chat API to get response
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, history: voiceHistory.slice(-10) }),
        });
        const data = await res.json();
        const reply = data.reply || "Sorry, I couldn't respond.";
        
        setAiReply(reply);
        setVoiceHistory((prev) => [...prev, { role: 'user', content: text }, { role: 'assistant', content: reply }]);
        
        // Speak the response using browser TTS
        if (!isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
          setVoiceState('speaking');
          window.speechSynthesis.cancel();
          const clean = reply.replace(/\*\*/g, '').replace(/[•]/g, ',');
          const utter = new SpeechSynthesisUtterance(clean);
          utter.rate = 1.0;
          utter.pitch = 1.0;
          utter.lang = 'en-US';
          utter.onend = () => setVoiceState('idle');
          utter.onerror = () => setVoiceState('idle');
          window.speechSynthesis.speak(utter);
        } else {
          setVoiceState('idle');
        }
      } catch (err) {
        console.error('Voice API error:', err);
        setAiReply('Sorry, something went wrong.');
        setVoiceState('idle');
      }
    };

    r.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorType = event.error || 'unknown';
      console.error('Speech recognition error:', errorType, event.message);
      
      // no-speech is common — just silently reset so user can try again
      if (errorType === 'no-speech' || errorType === 'aborted') {
        setTranscript('');
        setVoiceState('idle');
        return;
      }
      
      let errorMsg = '';
      if (errorType === 'not-allowed') {
        errorMsg = 'Microphone access denied. Please allow microphone in your browser settings (click the lock icon in the address bar).';
      } else if (errorType === 'network') {
        errorMsg = 'Network error. Speech recognition requires an internet connection.';
      } else if (errorType === 'audio-capture') {
        errorMsg = 'No microphone found. Please connect a microphone and try again.';
      } else if (errorType === 'service-not-allowed') {
        errorMsg = 'Speech recognition service is not available. Please use Chrome or Edge browser.';
      } else {
        errorMsg = 'Voice input error. Try clicking the mic button again, or switch to text mode.';
      }
      
      setAiReply(errorMsg);
      setVoiceState('idle');
    };

    try { 
      r.start(); 
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setAiReply('Could not start microphone. Please check permissions.');
      setVoiceState('idle'); 
    }
  }, [voiceHistory, isMuted]);

  const stopListening = () => {
    try { recognitionRef.current?.stop(); } catch {}
  };

  /* ── voice mode: send typed text (fallback when mic doesn't work) ── */
  const sendVoiceText = useCallback(async (text: string) => {
    if (!text.trim() || voiceState === 'processing' || voiceState === 'speaking') return;
    setVoiceInput('');
    setTranscript(text.trim());
    setVoiceState('processing');
    setAiReply('');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), history: voiceHistory.slice(-10) }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I couldn't respond.";
      
      setAiReply(reply);
      setVoiceHistory((prev) => [...prev, { role: 'user', content: text.trim() }, { role: 'assistant', content: reply }]);
      
      // Speak the response using browser TTS
      if (!isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
        setVoiceState('speaking');
        window.speechSynthesis.cancel();
        const clean = reply.replace(/\*\*/g, '').replace(/[•]/g, ',');
        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 1.0;
        utter.pitch = 1.0;
        utter.lang = 'en-US';
        utter.onend = () => setVoiceState('idle');
        utter.onerror = () => setVoiceState('idle');
        window.speechSynthesis.speak(utter);
      } else {
        setVoiceState('idle');
      }
    } catch {
      setAiReply('Sorry, something went wrong.');
      setVoiceState('idle');
    }
  }, [voiceHistory, voiceState, isMuted]);

  /* ── shared helpers ── */
  const resetChat = () => {
    setMessages([WELCOME_MSG]);
    setInput('');
    setVoiceHistory([]);
    setTranscript('');
    setAiReply('');
    setVoiceState('idle');
    stopSpeaking();
  };

  const switchMode = (m: Mode) => {
    stopSpeaking();
    try { recognitionRef.current?.abort(); } catch {}
    setVoiceState('idle');
    setMode(m);
  };

  /* markdown-lite renderer */
  const renderText = (text: string) =>
    text.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/).map((seg, j) => {
        if (seg.startsWith('**') && seg.endsWith('**')) return <strong key={j}>{seg.slice(2, -2)}</strong>;
        return <span key={j}>{seg}</span>;
      });
      return <span key={i}>{i > 0 && <br />}{parts}</span>;
    });

  const showWelcome = messages.length <= 1 && !loading;

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <>
      {/* ── Floating Button ── */}
      <button
        onClick={() => { setOpen((v) => !v); if (!open) setMode('pick'); }}
        className="fixed bottom-6 right-6 z-50 group"
        aria-label={open ? 'Close AI chat' : 'Open AI medical assistant'}
      >
        <span className={`flex items-center justify-center w-[60px] h-[60px] rounded-full shadow-xl transition-all duration-300 ${
          open ? 'bg-gray-500 scale-95' : 'bg-[hsl(142,62%,38%)] hover:bg-[hsl(142,62%,32%)] hover:scale-105 hover:shadow-2xl'
        }`}>
          {open ? <X className="h-6 w-6 text-white" /> : (
            <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" />
              <path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" />
            </svg>
          )}
        </span>
        {!open && <span className="absolute inset-0 rounded-full bg-[hsl(142,62%,38%)] animate-ping opacity-20 pointer-events-none" />}
      </button>

      {/* ── Chat Window ── */}
      {open && (
        <div
          className="fixed bottom-[100px] right-6 z-50 flex flex-col overflow-hidden
            w-[400px] max-w-[calc(100vw-2rem)] bg-white rounded-3xl shadow-[0_8px_60px_rgba(0,0,0,0.15)] border border-gray-100"
          style={{
            animation: 'chatSlideUp 0.3s ease-out',
            height: mode === 'pick' ? 'auto' : '560px',
            maxHeight: 'calc(100vh - 8rem)',
          }}
        >
          {/* ── Header ── */}
          <div className="relative shrink-0 overflow-hidden">
            <div className="bg-gradient-to-br from-[hsl(142,62%,38%)] via-[hsl(158,60%,40%)] to-[hsl(142,62%,30%)] px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-[15px] tracking-tight">Medical AI</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
                      <span className="text-white/70 text-[11px]">
                        {mode === 'voice' ? 'Voice mode' : mode === 'text' ? 'Chat mode' : 'Choose a mode'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {mode !== 'pick' && (
                    <button onClick={resetChat} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Reset conversation">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  )}
                  {mode !== 'pick' && (
                    <button onClick={() => switchMode('pick')} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors" title="Switch mode">
                      {mode === 'voice' ? <Keyboard className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <svg className="absolute -bottom-px left-0 right-0 w-full" viewBox="0 0 400 12" fill="none">
              <path d="M0 12V0C100 12 300 12 400 0V12H0Z" fill="white" />
            </svg>
          </div>

          {/* ════════════ MODE PICKER ════════════ */}
          {mode === 'pick' && (
            <div className="px-6 pt-4 pb-6">
              <p className="text-center text-gray-500 text-sm mb-5">How would you like to interact?</p>
              <div className="grid grid-cols-2 gap-3">
                {/* Voice */}
                <button
                  onClick={() => switchMode('voice')}
                  className="group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 hover:border-[hsl(142,62%,38%)] hover:bg-[hsl(142,62%,38%)]/5 transition-all duration-200"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(142,62%,38%)] to-[hsl(158,60%,40%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Mic className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-800 text-sm">Voice</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Speak with AI</p>
                  </div>
                </button>
                {/* Text */}
                <button
                  onClick={() => switchMode('text')}
                  className="group flex flex-col items-center gap-3 p-5 rounded-2xl border-2 border-gray-100 hover:border-[hsl(142,62%,38%)] hover:bg-[hsl(142,62%,38%)]/5 transition-all duration-200"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(142,62%,38%)] to-[hsl(158,60%,40%)] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <MessageSquareText className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-800 text-sm">Text</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Type messages</p>
                  </div>
                </button>
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-4">AI assistant · Not a substitute for professional medical advice</p>
            </div>
          )}

          {/* ════════════ VOICE MODE ════════════ */}
          {mode === 'voice' && (
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-3">
              <div className="flex-1 flex flex-col items-center justify-center w-full gap-3">
                {/* Status */}
                <p className="text-xs font-medium uppercase tracking-widest text-gray-400">
                  {voiceState === 'idle' && 'Tap the mic to start'}
                  {voiceState === 'listening' && 'Listening...'}
                  {voiceState === 'processing' && 'Thinking...'}
                  {voiceState === 'speaking' && 'Speaking...'}
                </p>

                {/* Big mic button */}
                <button
                  onClick={voiceState === 'listening' ? stopListening : voiceState === 'idle' ? startListening : undefined}
                  disabled={voiceState === 'processing' || voiceState === 'speaking'}
                  className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                    voiceState === 'listening'
                      ? 'bg-red-500 hover:bg-red-600 scale-110'
                      : voiceState === 'processing'
                      ? 'bg-gray-300 cursor-wait'
                      : voiceState === 'speaking'
                      ? 'bg-[hsl(142,62%,38%)] cursor-default'
                      : 'bg-[hsl(142,62%,38%)] hover:bg-[hsl(142,62%,32%)] hover:scale-105'
                  }`}
                >
                  {voiceState === 'listening' && <MicOff className="h-10 w-10 text-white" />}
                  {voiceState === 'processing' && <Loader2 className="h-10 w-10 text-white animate-spin" />}
                  {voiceState === 'speaking' && <Volume2 className="h-10 w-10 text-white animate-pulse" />}
                  {voiceState === 'idle' && <Mic className="h-10 w-10 text-white" />}

                  {voiceState === 'listening' && (
                    <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30 pointer-events-none" />
                  )}
                  {voiceState === 'speaking' && (
                    <span className="absolute inset-0 rounded-full bg-[hsl(142,62%,38%)] animate-ping opacity-20 pointer-events-none" />
                  )}
                </button>

                {/* Transcript + Reply */}
                <div className="w-full max-h-[180px] overflow-y-auto text-center space-y-2 mt-2">
                  {transcript && (
                    <div className="bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">You said</p>
                      <p className="text-sm text-gray-700">{transcript}</p>
                    </div>
                  )}
                  {aiReply && (
                    <div className="bg-[hsl(142,62%,95%)] rounded-xl px-4 py-2.5 border border-[hsl(142,62%,85%)]">
                      <p className="text-[10px] text-[hsl(142,62%,38%)] font-medium uppercase tracking-wide mb-1">AI response</p>
                      <p className="text-sm text-gray-700 text-left">{renderText(aiReply)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Text input fallback for when mic doesn't work */}
              <div className="w-full px-1">
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-1.5">
                  <input
                    type="text"
                    placeholder="Or type here..."
                    value={voiceInput}
                    onChange={(e) => setVoiceInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') sendVoiceText(voiceInput); }}
                    disabled={voiceState === 'processing' || voiceState === 'speaking'}
                    className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder-gray-400"
                  />
                  <button
                    onClick={() => sendVoiceText(voiceInput)}
                    disabled={!voiceInput.trim() || voiceState === 'processing' || voiceState === 'speaking'}
                    className="p-1.5 rounded-lg bg-[hsl(142,62%,38%)] text-white disabled:opacity-40 hover:bg-[hsl(142,62%,32%)] transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom controls */}
              <div className="flex items-center gap-3 pb-1">
                <button
                  onClick={() => { setIsMuted((v) => !v); if (!isMuted) stopSpeaking(); }}
                  className={`p-2.5 rounded-xl border transition-colors ${isMuted ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white border-gray-200 text-gray-600 hover:border-[hsl(142,62%,38%)]'}`}
                  title={isMuted ? 'Unmute AI voice' : 'Mute AI voice'}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => switchMode('text')}
                  className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:border-[hsl(142,62%,38%)] transition-colors"
                  title="Switch to text mode"
                >
                  <Keyboard className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400">AI assistant · Not a substitute for professional medical advice</p>
            </div>
          )}

          {/* ════════════ TEXT MODE ════════════ */}
          {mode === 'text' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 pt-2 pb-3 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-[hsl(142,62%,38%)]/10 flex items-center justify-center shrink-0 mb-0.5">
                        <Bot className="h-3.5 w-3.5 text-[hsl(142,62%,38%)]" />
                      </div>
                    )}
                    <div className={`max-w-[78%] text-[13.5px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[hsl(142,62%,38%)] text-white px-4 py-2.5 rounded-2xl rounded-br-lg shadow-sm'
                        : 'bg-gray-50 text-gray-800 px-4 py-3 rounded-2xl rounded-bl-lg border border-gray-100'
                    }`}>
                      {renderText(msg.content)}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[hsl(142,62%,38%)]/10 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-[hsl(142,62%,38%)]" />
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-lg px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick prompts (welcome only) */}
              {showWelcome && (
                <div className="px-4 pb-2 shrink-0">
                  <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-2 px-1">Quick start</p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_PROMPTS.map((q, i) => (
                      <button key={i} onClick={() => doSend(q.message)}
                        className="flex items-center gap-2 text-left text-[12.5px] text-gray-600 bg-gray-50 hover:bg-[hsl(142,62%,38%)]/5 hover:text-[hsl(142,62%,38%)] border border-gray-100 hover:border-[hsl(142,62%,38%)]/20 rounded-xl px-3 py-2.5 transition-all duration-200">
                        <span className="shrink-0">{q.icon}</span>
                        <span>{q.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input bar */}
              <div className="shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-[hsl(142,62%,38%)] focus-within:ring-2 focus-within:ring-[hsl(142,62%,38%)]/20 transition-all px-4 py-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your health..."
                    className="flex-1 text-[13.5px] bg-transparent py-2.5 focus:outline-none placeholder:text-gray-400"
                    disabled={loading}
                  />
                  <button onClick={() => switchMode('voice')} className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-[hsl(142,62%,38%)] transition-colors" title="Switch to voice">
                    <Mic className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => doSend(input)}
                    disabled={!input.trim() || loading}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl bg-[hsl(142,62%,38%)] hover:bg-[hsl(142,62%,32%)] disabled:opacity-30 text-white transition-all duration-200"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-2">AI assistant · Not a substitute for professional medical advice</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
