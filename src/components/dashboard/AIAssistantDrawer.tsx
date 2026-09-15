'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
 import { ApiClient } from '@/services/apiClient';
 import { AIChatResponse, Truck } from '@/types';
import { useVoiceAssistant } from '@/components/voice/useVoiceAssistant';
 import { Bot, Send, Loader2, AlertCircle, Mic, MicOff, Volume2, Square, CheckCircle2 } from 'lucide-react';

interface AIAssistantDrawerProps {
  ownerName: string;
  trucks: Truck[];
  onShowTruckLocation?: (truckId?: string) => void;
  onPrepareStartTrip?: (data: { truckId: string; startLocation?: string; destination?: string; loadedKg?: number; pricePerKg?: number }) => void;
  summary?: any;
  customers?: any[];
  expenses?: any[];
  losses?: any[];
}

interface TripDraft {
  truckId?: string;
  startLocation?: string;
  destination?: string;
  loadedKg?: number;
  pricePerKg?: number;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  ownerName,
  trucks,
  onShowTruckLocation,
  onPrepareStartTrip,
  summary,
  customers,
  expenses,
  losses,
}) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; error?: boolean }>>([
    {
      sender: 'ai',
      text: "Hello! I'm your Business Assistant. Ask me about sales, profit, expenses, wastage, customers, orders, or active trips.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const [detectedPrompt, setDetectedPrompt] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [tripDraft, setTripDraft] = useState<TripDraft | null>(null);
  const [isTestVoiceLoading, setIsTestVoiceLoading] = useState(false);
  const [testVoiceResult, setTestVoiceResult] = useState<string | null>(null);
  const [testVoiceError, setTestVoiceError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasGreetedRef = useRef(false);

  const languages = [
    ['auto', 'Auto'], ['en', 'English'], ['kn', 'ಕನ್ನಡ'], ['hi', 'हिन्दी'],
    ['te', 'తెలుగు'], ['ta', 'தமிழ்'], ['ml', 'മലയാളം'], ['ur', 'اردو'],
    ['mr', 'मराठी'], ['bn', 'বাংলা'],
  ];

  const greetings: Record<string, string> = {
    en: `Welcome back, ${ownerName}. What can I help you with today?`,
    kn: `ಮತ್ತೆ ಸ್ವಾಗತ, ${ownerName}. ಇಂದು ನಾನು ನಿಮಗೆ ಏನು ಸಹಾಯ ಮಾಡಲಿ?`,
    hi: `वापस स्वागत है, ${ownerName}। आज मैं आपकी किस तरह मदद करूँ?`,
    te: `తిరిగి స్వాగతం, ${ownerName}. ఈరోజు నేను మీకు ఎలా సహాయం చేయగలను?`,
    ta: `மீண்டும் வரவேற்கிறோம், ${ownerName}. இன்று நான் உங்களுக்கு எப்படி உதவலாம்?`,
    ml: `വീണ്ടും സ്വാഗതം, ${ownerName}. ഇന്ന് ഞാൻ നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?`,
    ur: `خوش آمدید، ${ownerName}۔ آج میں آپ کی کیسے مدد کر سکتا ہوں؟`,
    mr: `पुन्हा स्वागत, ${ownerName}. आज मी तुमची कशी मदत करू?`,
    bn: `আবার স্বাগতম, ${ownerName}। আজ আমি কীভাবে আপনাকে সাহায্য করতে পারি?`,
  };

  const voiceLanguage = selectedLanguage === 'auto' ? detectedLanguage : selectedLanguage;
  const voice = useVoiceAssistant(voiceLanguage, (transcript) => handleAskQuestion(transcript));

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!ownerName || hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    const greeting = greetings[selectedLanguage === 'auto' ? 'en' : selectedLanguage];
    setMessages([{ sender: 'ai', text: greeting }]);
    voice.speak(greeting);
  }, [ownerName]);

  useEffect(() => {
    ApiClient.getMe().then((me) => {
      if (me.preferred_language) setSelectedLanguage(me.preferred_language);
    }).catch(() => undefined);
  }, []);

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    ApiClient.updateLanguagePreference(language).catch((err) => {
      setError(err.message || 'Could not save assistant language preference.');
    });
    if (hasGreetedRef.current && ownerName) {
      const greeting = greetings[language === 'auto' ? 'en' : language];
      setMessages((prev) => [...prev, { sender: 'ai', text: greeting }]);
      voice.speak(greeting);
    }
  };

  const suggestedQuestions = [
    "How much profit did I make?",
    "Who owes me money?",
    "What did I spend today?",
    "Show active trucks",
    "What orders are pending?",
    "How much wastage happened?",
    "Find nearby shops",
    "How much chicken is left?",
  ];

  const prepareStartTrip = (questionText: string) => {
    const isStartRequest = /\b(start|begin)\b.*\btrip\b|\btrip\b.*\b(start|begin)\b/i.test(questionText);
    if (!isStartRequest && !tripDraft) return false;

    const truckMatch = questionText.match(/truck\s*(\d+)/i);
    const selectedTruck = truckMatch
      ? trucks[Number(truckMatch[1]) - 1]
      : trucks.find((truck) => questionText.toLowerCase().includes(truck.regNumber.toLowerCase()));
    const destinationMatch = questionText.match(/(?:to|destination)\s+([A-Za-z][A-Za-z ]*?)(?=\s+\d|\s*$)/i);
    const startLocationMatch = questionText.match(/from\s+([A-Za-z][A-Za-z ]*?)(?=\s+to\s+|\s+\d|\s*$)/i);
    const quantityMatch = questionText.match(/(\d+(?:\.\d+)?)\s*kg/i);
    const priceMatch = questionText.match(/(?:at|price(?: per kg)?|rate)\s*(?:₹\s*)?(\d+(?:\.\d+)?)/i);
    const nextDraft: TripDraft = {
      ...(tripDraft || {}),
      ...(selectedTruck ? { truckId: selectedTruck.id } : {}),
      ...(startLocationMatch ? { startLocation: startLocationMatch[1].trim() } : {}),
      ...(destinationMatch ? { destination: destinationMatch[1].trim() } : {}),
      ...(quantityMatch ? { loadedKg: Number(quantityMatch[1]) } : {}),
      ...(priceMatch ? { pricePerKg: Number(priceMatch[1]) } : {}),
    };

    if (tripDraft && !destinationMatch && !quantityMatch && !priceMatch && !startLocationMatch && !selectedTruck) {
      nextDraft.destination = questionText.trim();
    }

    if (!nextDraft.truckId) {
      setTripDraft(nextDraft);
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Which truck should I prepare this trip for?' }]);
      return true;
    }
    if (!nextDraft.startLocation) {
      setTripDraft(nextDraft);
      setMessages((prev) => [...prev, { sender: 'ai', text: 'Where is this trip starting from?' }]);
      return true;
    }
    if (!nextDraft.destination) {
      setTripDraft(nextDraft);
      setMessages((prev) => [...prev, { sender: 'ai', text: 'What is the destination for this trip?' }]);
      return true;
    }
    if (!nextDraft.loadedKg) {
      setTripDraft(nextDraft);
      setMessages((prev) => [...prev, { sender: 'ai', text: 'How many kilograms of chicken are you loading?' }]);
      return true;
    }
    if (!nextDraft.pricePerKg) {
      setTripDraft(nextDraft);
      setMessages((prev) => [...prev, { sender: 'ai', text: "What is today's purchase price per kilogram?" }]);
      return true;
    }

    const preparedTruck = trucks.find((truck) => truck.id === nextDraft.truckId);
    if (!preparedTruck) {
      setTripDraft(null);
      setMessages((prev) => [...prev, { sender: 'ai', text: 'I could not match that truck to your current fleet.' }]);
      return true;
    }
    const loadedKg = nextDraft.loadedKg;
    const pricePerKg = nextDraft.pricePerKg;
    onPrepareStartTrip?.({
      truckId: preparedTruck.id,
      startLocation: nextDraft.startLocation,
      destination: nextDraft.destination,
      loadedKg: nextDraft.loadedKg,
      pricePerKg: nextDraft.pricePerKg,
    });
    setTripDraft(null);
    setMessages((prev) => [...prev, {
      sender: 'ai',
      text: `Trip prepared for confirmation:\nTruck: ${preparedTruck.name} (${preparedTruck.regNumber})\nRoute: ${nextDraft.startLocation} → ${nextDraft.destination}\nStock: ${loadedKg.toLocaleString('en-IN')} kg\nPurchase price: ₹${pricePerKg}/kg\n\nReview the form and confirm when ready.`,
    }]);
    return true;
  };

  const handleTestVoice = async () => {
    setTestVoiceResult(null);
    setTestVoiceError(null);
    setIsTestVoiceLoading(true);
    try {
      const response = await ApiClient.testVoice(
        selectedLanguage === 'auto' ? undefined : selectedLanguage,
      );
      voice.speak(response.text);
      setTestVoiceResult(`Voice working in ${response.voice_locale}`);
      setTimeout(() => {
        setTestVoiceResult(null);
      }, 5000);
    } catch (err: any) {
      setTestVoiceError(err.message || 'Voice test failed. The response is available as text.');
    } finally {
      setIsTestVoiceLoading(false);
    }
  };

  const handleAskQuestion = async (questionText: string) => {
    if (!questionText.trim() || isLoading) return;

    const userMsg = { sender: 'user' as const, text: questionText };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setError(null);
    setIsLoading(true);
    voice.setStatus('thinking');

    const scriptDetected = /[\u0C80-\u0CFF]/.test(questionText) ? 'kn'
      : /[\u0900-\u097F]/.test(questionText) ? 'hi'
      : /[\u0C00-\u0C7F]/.test(questionText) ? 'te'
      : /[\u0B80-\u0BFF]/.test(questionText) ? 'ta'
      : /[\u0D00-\u0D7F]/.test(questionText) ? 'ml'
      : /[\u0600-\u06FF]/.test(questionText) ? 'ur' : null;
    if (scriptDetected && scriptDetected !== selectedLanguage) {
      setDetectedPrompt(scriptDetected);
    }

    if (/\b(truck|vehicle)\b.*\b(where|location|track|gps)\b/i.test(questionText)) {
      const truckMatch = questionText.match(/truck\s*(\d+)/i);
      const requestedTruck = truckMatch ? trucks[Number(truckMatch[1]) - 1] : undefined;
      onShowTruckLocation?.(requestedTruck?.id);
    }

    if (prepareStartTrip(questionText)) {
      setIsLoading(false);
      voice.setStatus('idle');
      setQuery('');
      return;
    }

    try {
      const response: AIChatResponse = await ApiClient.aiChat(
        questionText,
        selectedLanguage === 'auto' ? undefined : selectedLanguage,
      );
      setDetectedLanguage(response.language || selectedLanguage);
      setActiveTool(response.tool_used || null);
      setMessages((prev) => [...prev, { sender: 'ai', text: response.answer }]);
      voice.speak(response.answer);
    } catch (err: any) {
      const msg = err.message || 'Unable to process your question. Please try again.';
      setError(msg);
      setActiveTool(null);
      voice.setStatus('error');
      setMessages((prev) => [...prev, { sender: 'ai', text: `Sorry, I couldn't answer that. ${msg}`, error: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAskQuestion(query);
  };

  const handleClearConversation = () => {
    setMessages([
      {
        sender: 'ai',
        text: "Conversation cleared. How can I help you with your business today?",
      },
    ]);
    setError(null);
    setActiveTool(null);
    voice.setError(null);
    setDetectedPrompt(null);
  };

  return (
    <Card className="border-slate-800 bg-slate-900 text-white shadow-lg flex flex-col overflow-hidden">
      {/* Header — wraps to two rows on very small screens to avoid overflow */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 pb-3 mb-3 border-b border-slate-800 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0 shrink">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500 flex items-center justify-center text-emerald-400 shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>ICC Assistant</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                AI
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">Real business data • {detectedLanguage.toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            aria-label="Assistant language"
            value={selectedLanguage}
            onChange={(event) => handleLanguageChange(event.target.value)}
            className="max-w-[6rem] bg-slate-950 border border-slate-700 text-slate-300 rounded-lg px-1.5 py-2.5 text-[10px] font-semibold outline-none focus:border-emerald-500 min-h-[40px] touch-manipulation"
          >
            {languages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button
            type="button"
            onClick={handleTestVoice}
            disabled={isTestVoiceLoading || !voice.isSupported}
            className="text-[10px] font-bold text-slate-400 hover:text-emerald-300 px-2 py-2 min-h-[40px] rounded-lg border border-slate-700 hover:border-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 touch-manipulation"
            title="Test voice output in selected language"
            aria-label="Test voice output"
          >
            {isTestVoiceLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Volume2 className="w-3 h-3" />
            )}
            <span>Test</span>
          </button>
          <button
            type="button"
            onClick={handleClearConversation}
            className="text-[10px] font-bold text-slate-400 hover:text-white px-2 py-2 min-h-[40px] rounded-lg border border-slate-700 hover:border-slate-500 transition-colors touch-manipulation"
            aria-label="Clear conversation"
          >
            Clear
          </button>
        </div>
      </div>

      {detectedPrompt && detectedPrompt !== selectedLanguage && (
        <div className="mb-3 rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-100">
          <p className="font-semibold">{detectedPrompt === 'kn' ? 'Kannada' : detectedPrompt === 'hi' ? 'Hindi' : 'A different language'} detected. Switch language?</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => { handleLanguageChange(detectedPrompt); setDetectedPrompt(null); }} className="rounded-lg bg-amber-500 px-2.5 py-1.5 font-bold text-slate-950">Switch</button>
            <button type="button" onClick={() => setDetectedPrompt(null)} className="rounded-lg border border-amber-700 px-2.5 py-1.5 font-bold text-amber-100">Keep {selectedLanguage.toUpperCase()}</button>
          </div>
        </div>
      )}

      {testVoiceResult && (
        <div className="mb-2 rounded-xl border border-emerald-800 bg-emerald-950/40 p-2.5 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{testVoiceResult}</span>
        </div>
      )}
      {testVoiceError && (
        <div className="mb-2 rounded-xl border border-red-800 bg-red-950/40 p-2.5 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
          <span>{testVoiceError}</span>
        </div>
      )}

      <div className="mb-3 rounded-2xl border border-emerald-900/70 bg-slate-950/80 p-4 text-center">
        <div className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold text-slate-300">
          {voice.status === 'listening' && <><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Listening...</>}
          {voice.status === 'thinking' && <><Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" /> Thinking...</>}
          {voice.status === 'speaking' && <><Volume2 className="h-3.5 w-3.5 text-emerald-400" /> Speaking...</>}
          {voice.status === 'error' && <><AlertCircle className="h-3.5 w-3.5 text-red-400" /> Text fallback ready</>}
          {voice.status === 'idle' && (voice.isSupported ? 'Tap to speak' : 'Voice unavailable - type instead')}
        </div>
        <button
          type="button"
          aria-label={voice.status === 'listening' ? 'Stop listening' : 'Tap to speak'}
          onClick={voice.status === 'listening' ? voice.stopListening : voice.startListening}
          disabled={isLoading || !voice.isSupported}
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all ${voice.status === 'listening' ? 'border-red-400 bg-red-600 shadow-lg shadow-red-950' : 'border-emerald-400 bg-emerald-600 hover:bg-emerald-500'} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {voice.status === 'listening' ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
        </button>
        {voice.error && <p className="mt-2 text-[11px] font-medium text-red-300">{voice.error}</p>}
        {voice.status === 'speaking' && <button type="button" onClick={() => { window.speechSynthesis?.cancel(); voice.setStatus('idle'); }} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white"><Square className="h-3 w-3" /> Stop voice</button>}
      </div>

      {/* Suggested Questions — horizontally scrollable, contained within card */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none mb-2 -mx-1 px-1">
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleAskQuestion(q)}
            disabled={isLoading}
            className="px-2.5 py-2 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold shrink-0 transition-colors cursor-pointer touch-manipulation border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-2" style={{ maxHeight: '220px' }}>
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-xl ${
              m.error
                ? 'bg-red-950/80 text-red-300 border border-red-800'
                : m.sender === 'user'
                ? 'bg-emerald-600 text-white ml-auto max-w-[85%] font-medium'
                : 'bg-slate-800 text-slate-200 mr-auto max-w-[90%] font-normal border border-slate-700 whitespace-pre-line'
            }`}
          >
            {m.text}
          </div>
        ))}
        {isLoading && (
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-200 mr-auto max-w-[90%] font-normal border border-slate-700 flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            <span>{activeTool ? `Using ${activeTool}...` : 'Analyzing your business data...'}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Banner */}
      {error && !isLoading && (
        <div className="mt-2 p-2 bg-red-950/80 border border-red-800 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Query Input */}
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 mt-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about your business..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 min-h-[44px] text-xs font-semibold text-white outline-none focus:border-emerald-500 transition-all placeholder:text-slate-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          aria-label="Send question"
          className="px-3.5 min-w-[44px] min-h-[44px] bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>
    </Card>
  );
};
