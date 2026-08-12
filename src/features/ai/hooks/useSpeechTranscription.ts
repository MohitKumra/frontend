import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UseSpeechTranscriptionOptions = {
  onTranscript: (transcript: string) => void;
  language?: string;
};

function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function mapSpeechError(error: string): string {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was denied.';
    case 'audio-capture':
      return 'No microphone was found.';
    case 'network':
      return 'Speech transcription could not connect.';
    case 'no-speech':
      return 'No speech was detected.';
    default:
      return error ? `Could not transcribe speech: ${error}.` : 'Could not transcribe speech.';
  }
}

export function appendTranscriptText(current: string, transcript: string): string {
  const next = transcript.trim();
  if (!next) return current;

  const base = current.trimEnd();
  return base ? `${base} ${next}` : next;
}

export function useSpeechTranscription({ onTranscript, language }: UseSpeechTranscriptionOptions) {
  const onTranscriptRef = useRef(onTranscript);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const draftTranscriptRef = useRef('');
  const shouldCommitRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSupported = useMemo(() => Boolean(getSpeechRecognitionConstructor()), []);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    return () => {
      shouldCommitRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    shouldCommitRef.current = true;
    recognition.stop();
  }, []);

  const start = useCallback(() => {
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setError('Speech transcription is not supported in this browser.');
      return;
    }

    if (recognitionRef.current || isListening) return;

    try {
      const recognition = new Recognition();
      recognitionRef.current = recognition;
      draftTranscriptRef.current = '';
      shouldCommitRef.current = true;
      setError(null);
      setIsListening(true);

      recognition.lang = language || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let transcript = '';
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          const primaryAlternative = result[0];
          if (primaryAlternative?.transcript) {
            transcript += `${primaryAlternative.transcript} `;
          }
        }
        draftTranscriptRef.current = transcript.trim();
      };

      recognition.onerror = (event) => {
        shouldCommitRef.current = false;
        draftTranscriptRef.current = '';
        recognitionRef.current = null;
        setIsListening(false);
        setError(mapSpeechError(event.error));
      };

      recognition.onend = () => {
        const transcript = shouldCommitRef.current ? draftTranscriptRef.current.trim() : '';
        shouldCommitRef.current = false;
        draftTranscriptRef.current = '';
        recognitionRef.current = null;
        setIsListening(false);

        if (transcript) {
          onTranscriptRef.current(transcript);
        }
      };

      recognition.start();
    } catch {
      shouldCommitRef.current = false;
      draftTranscriptRef.current = '';
      recognitionRef.current = null;
      setIsListening(false);
      setError('Could not start speech transcription.');
    }
  }, [isListening, language]);

  return {
    error,
    isListening,
    isSupported,
    start,
    stop,
  } as const;
}
