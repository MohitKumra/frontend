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
/**
 * Returns the tail of `transcript` after any leading run of tokens that are
 * already present at the start of `known`. Web Speech results are cumulative,
 * so the same finalized words are repeatedly re-emitted while you speak. We
 * strip that known prefix so confirmed words are never appended twice.
 */
function stripKnownPrefix(known: string, transcript: string): string {
  const k = known.trim();
  const t = transcript.trim();
  if (!k) return t;
  if (!t) return '';

  const kTokens = k.split(/\s+/);
  const tTokens = t.split(/\s+/);

  let overlap = 0;
  const maxOverlap = Math.min(kTokens.length, tTokens.length);
  while (overlap < maxOverlap && kTokens[overlap] === tTokens[overlap]) overlap += 1;

  return tTokens.slice(overlap).join(' ');
}

/**
 * Last line of defense against an engine that re-emits a word verbatim:
 * collapses runs of identical consecutive tokens ("task task" -> "task").
 */
function dedupeConsecutiveTokens(text: string): string {
  const collapsed: string[] = [];
  for (const token of text.trim().split(/\s+/)) {
    if (!token) continue;
    if (collapsed[collapsed.length - 1] !== token) collapsed.push(token);
  }
  return collapsed.join(' ');
}

export function useSpeechTranscription({ onTranscript, language }: UseSpeechTranscriptionOptions) {
  const onTranscriptRef = useRef(onTranscript);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef('');
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
      finalTranscriptRef.current = '';
      draftTranscriptRef.current = '';
      shouldCommitRef.current = true;
      setError(null);
      setIsListening(true);

      recognition.lang = language || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        // Speech recognizers re-emit cumulative results while you speak: the
        // newest final result already contains every word recognized so far,
        // and the newest interim result repeats those finalized words plus the
        // words still being heard. The previous implementation joined every
        // final result, re-stating the same words over and over (the "10x"
        // duplication) and then committed that whole string on stop. We instead
        // diff against what we've already finalized and only append the truly
        // new tail, so the confirmed words always appear exactly once.
        let batchFinal = '';
        let latestInterim = '';

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const primaryAlternative = result[0];
          const transcript = primaryAlternative?.transcript?.trim();
          if (!transcript) continue;

          if (result.isFinal) {
            // Newest final result is the most complete cumulative snapshot.
            batchFinal = transcript;
          } else {
            latestInterim = transcript;
          }
        }

        // Only the newly finalized words are safe to commit.
        const newlyFinalized = stripKnownPrefix(finalTranscriptRef.current, batchFinal);
        if (newlyFinalized) {
          finalTranscriptRef.current = [finalTranscriptRef.current, newlyFinalized]
            .filter(Boolean)
            .join(' ')
            .trim();
        }

        // The interim repeats the finalized words first, so strip that prefix
        // to avoid re-stating them; what remains is the live tail still spoken.
        const pendingTail = stripKnownPrefix(finalTranscriptRef.current, latestInterim);

        draftTranscriptRef.current = dedupeConsecutiveTokens(
          [finalTranscriptRef.current, pendingTail].filter(Boolean).join(' ').trim(),
        );
      };

      recognition.onerror = (event) => {
        shouldCommitRef.current = false;
        finalTranscriptRef.current = '';
        draftTranscriptRef.current = '';
        recognitionRef.current = null;
        setIsListening(false);
        setError(mapSpeechError(event.error));
      };

      recognition.onend = () => {
        const transcript = shouldCommitRef.current ? draftTranscriptRef.current.trim() : '';
        shouldCommitRef.current = false;
        finalTranscriptRef.current = '';
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
      finalTranscriptRef.current = '';
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
