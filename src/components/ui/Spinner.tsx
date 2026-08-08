interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`${sizes[size]} border-2 border-border border-t-accent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    </div>
  );
}
