import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, Brain } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useJournalEntryAnalysis, useJournalWeeklyAnalysis } from '../../features/ai/hooks/useAI';

interface JournalAnalysisProps {
  entryContent: string;
  entryId?: string;
}

export function JournalEntryAnalysis({ entryContent, entryId }: JournalAnalysisProps) {
  const [analyzed, setAnalyzed] = useState(false);
  const prevIdRef = useRef<string | undefined>(undefined);
  const analysisMutation = useJournalEntryAnalysis();

  // Reset when entry changes
  if (entryId && prevIdRef.current !== entryId) {
    setAnalyzed(false);
    prevIdRef.current = entryId;
  }

  const handleAnalyze = async () => {
    try {
      await analysisMutation.mutateAsync(entryContent);
      setAnalyzed(true);
    } catch {
      // Silently fail
    }
  };

  if (analysisMutation.data && analyzed) {
    const result = analysisMutation.data;
    if (result.source === 'fallback') return null;

    return (
      <motion.div
        className="mt-3 p-3 rounded-xl"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 6%, var(--color-surface-raised))',
          border: '1px solid color-mix(in srgb, var(--color-accent) 15%, transparent)',
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Brain size={14} className="text-accent" />
          <span className="text-[10px] font-bold text-accent uppercase tracking-wider">AI Analysis</span>
          <span className="text-[9px] text-text-muted">{result.moodLabel}</span>
        </div>

        {result.themes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {result.themes.map((theme) => (
              <span
                key={theme}
                className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                style={{
                  background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                  color: 'var(--color-accent)',
                }}
              >
                {theme}
              </span>
            ))}
          </div>
        )}

        {result.insight && (
          <p className="text-xs text-text-secondary mb-2 leading-relaxed">{result.insight}</p>
        )}

        {result.reflectionPrompt && (
          <div
            className="p-2.5 rounded-lg text-xs italic text-text-secondary leading-relaxed"
            style={{ background: 'var(--color-surface-raised)' }}
          >
            💭 {result.reflectionPrompt}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs mt-2"
      onClick={handleAnalyze}
      disabled={analysisMutation.isPending}
    >
      {analysisMutation.isPending ? (
        <>
          <Loader2 size={12} className="animate-spin mr-1" />
          Analyzing...
        </>
      ) : (
        <>
          <Sparkles size={12} className="mr-1" />
          Analyze with AI
        </>
      )}
    </Button>
  );
}

// ─── Weekly Journal Analysis ──────────────────────────────────────────────────

export function JournalWeeklyAnalysis() {
  const { data: weekly, isLoading, isError } = useJournalWeeklyAnalysis();

  if (isLoading) {
    return (
      <Card variant="default" className="p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="animate-spin text-accent" />
        </div>
      </Card>
    );
  }

  if (isError || !weekly || weekly.source === 'fallback') {
    return (
      <Card
        variant="default"
        className="p-4 relative overflow-hidden"
        style={{
          borderRadius: '12px',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Brain size={16} className="text-accent" />
          <span className="text-xs font-bold text-text-primary">Weekly Journal Summary</span>
        </div>
        <p className="text-xs text-text-secondary mb-3 leading-relaxed">
          Write more journal entries this week to unlock your AI-powered weekly summary with mood trends, key themes, and personalized insights.
        </p>
        <div className="mt-3 text-center">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider"
            style={{
              background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
              color: 'var(--color-accent)',
            }}
          >
            <Sparkles size={8} />
            AI Summary
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="default"
      className="p-4 relative overflow-hidden"
      style={{
        borderRadius: '12px',
        border: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-accent" />
        <span className="text-xs font-bold text-text-primary">Weekly Journal Summary</span>
      </div>

      <p className="text-xs text-text-secondary mb-3 leading-relaxed">{weekly.summary}</p>

      {weekly.keyThemes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {weekly.keyThemes.map((theme) => (
            <span
              key={theme}
              className="px-2 py-0.5 rounded-full text-[9px] font-bold"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
                color: 'var(--color-accent)',
              }}
            >
              {theme}
            </span>
          ))}
        </div>
      )}

      {weekly.insight && (
        <p className="text-[11px] font-medium text-text-primary mb-2 leading-relaxed">
          💡 {weekly.insight}
        </p>
      )}

      {weekly.suggestion && (
        <div
          className="p-2.5 rounded-lg text-xs text-text-secondary leading-relaxed"
          style={{ background: 'var(--color-surface-raised)' }}
        >
          🎯 {weekly.suggestion}
        </div>
      )}

      <div className="mt-3 text-center">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider"
          style={{
            background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
            color: 'var(--color-accent)',
          }}
        >
          <Sparkles size={8} />
          AI Summary
        </span>
      </div>
    </Card>
  );
}