import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceDictationButtonProps {
  onTranscript: (text: string) => void;
  size?: 'sm' | 'md';
  className?: string;
  title?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export const VoiceDictationButton: React.FC<VoiceDictationButtonProps> = ({
  onTranscript,
  size = 'sm',
  className = '',
  title = 'Ditar texto por voz (Português)',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore cleanup error
      }
    };
  }, []);

  const toggleListening = () => {
    if (!isSupported) {
      setErrorMsg('Seu navegador não suporta ditado por voz. Use Chrome ou Edge atualizado.');
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    setErrorMsg(null);
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition: SpeechRecognitionInstance = new SpeechRec();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalChunk += event.results[i][0].transcript;
        }
      }
      const cleaned = finalChunk.trim();
      if (cleaned) {
        onTranscriptRef.current(cleaned);
      }
    };

    recognition.onerror = (event: any) => {
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        setErrorMsg('Permissão de microfone negada.');
      } else if (event?.error !== 'aborted' && event?.error !== 'no-speech') {
        setErrorMsg('Não foi possível capturar o áudio.');
      }
      setIsListening(false);
      setTimeout(() => setErrorMsg(null), 3500);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      setErrorMsg('Erro ao iniciar o microfone.');
      setTimeout(() => setErrorMsg(null), 3500);
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        title={isListening ? 'Parar ditado por voz' : title}
        className={`inline-flex items-center gap-1 rounded-lg font-extrabold border transition shrink-0 ${
          size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
        } ${
          isListening
            ? 'bg-rose-600 text-white border-rose-600 animate-pulse shadow-sm'
            : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200 hover:border-emerald-300'
        }`}
      >
        {isListening ? (
          <>
            <MicOff className="w-3.5 h-3.5 shrink-0" />
            <span>Ouvindo...</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 shrink-0" />
            <span>Ditar</span>
          </>
        )}
      </button>

      {errorMsg && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 p-2 rounded-xl bg-slate-900 text-white text-[10px] font-medium shadow-lg">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
