interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

/** Premium enterprise input component with label, error & icons */
export function Input({ label, error, leftIcon, rightIcon, id, className = '', ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-text-primary">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && <span className="absolute left-4 text-text-muted pointer-events-none">{leftIcon}</span>}
        <input
          id={inputId}
          {...props}
          className={[
            'w-full bg-surface border rounded-lg text-text-primary',
            'placeholder:text-text-muted',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-bg focus:border-accent',
            error ? 'border-danger focus:ring-danger/40' : 'border-border hover:border-border-strong',
            'min-h-[48px] px-4 py-3 text-sm',
            leftIcon ? 'pl-11' : '',
            rightIcon ? 'pr-11' : '',
            className,
          ].join(' ')}
        />
        {rightIcon && <span className="absolute right-4 text-text-muted">{rightIcon}</span>}
      </div>
      {error && <p className="text-xs text-danger flex items-center gap-1">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, id, className = '', ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-text-primary">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        {...props}
        className={[
          'w-full bg-surface border rounded-lg text-text-primary',
          'placeholder:text-text-muted resize-none',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-bg focus:border-accent',
          error ? 'border-danger focus:ring-danger/40' : 'border-border hover:border-border-strong',
          'px-4 py-3 text-sm',
          className,
        ].join(' ')}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
