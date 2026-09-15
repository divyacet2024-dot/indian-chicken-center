'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface RecognitionEventLike {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionConstructor = new () => RecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  }
}

export const VOICE_LOCALES: Record<string, string> = {
  en: 'en-IN',
  kn: 'kn-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ta: 'ta-IN',
  ml: 'ml-IN',
  ur: 'ur-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
};

export function useVoiceAssistant(language: string, onTranscript: (text: string) => void) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus((current) => current === 'listening' ? 'idle' : current);
  }, []);

  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError('Speech recognition is not available in this browser. You can type instead.');
      setStatus('error');
      return;
    }

    recognitionRef.current?.stop();
    const recognition = new Recognition();
    recognition.lang = VOICE_LOCALES[language] || VOICE_LOCALES.en;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onTranscriptRef.current(transcript);
    };
    recognition.onerror = (event) => {
      const messages: Record<string, string> = {
        'not-allowed': 'Microphone permission was denied. You can type instead.',
        'no-speech': 'I did not hear anything. Please try again.',
        network: 'Speech recognition network error. You can type instead.',
      };
      setError(messages[event.error || ''] || 'Speech recognition failed. You can type instead.');
      setStatus('error');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setStatus((current) => current === 'listening' ? 'idle' : current);
    };
    recognitionRef.current = recognition;
    setError(null);
    setStatus('listening');
    try {
      recognition.start();
    } catch {
      setError('Could not start the microphone. You can type instead.');
      setStatus('error');
      recognitionRef.current = null;
    }
  }, [language]);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = VOICE_LOCALES[language] || VOICE_LOCALES.en;
    utterance.onstart = () => setStatus('speaking');
    utterance.onend = () => setStatus('idle');
    utterance.onerror = () => {
      setError('Voice playback failed. The response is still available as text.');
      setStatus('error');
    };
    window.speechSynthesis.speak(utterance);
    return true;
  }, [language]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  return { status, setStatus, error, setError, isSupported, startListening, stopListening, speak };
}
