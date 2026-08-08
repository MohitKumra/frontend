import React from 'react';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'glass';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  id?: string;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'border border-border',
  elevated: 'border border-border shadow-md dark:shadow-xl',
  outlined: 'border-2 border-border-strong',
  glass: 'glass',
};

/**
 * Premium enterprise card component.
 * - Elevated surface shadow
 * - Consistent border & rounded corners
 * - Hover animation support
 */
export function Card({
  children,
  variant = 'default',
  className = '',
  hoverable = false,
  onClick,
  style,
  id,
}: CardProps) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={[
        'rounded-2xl transition-all duration-200 ease-out',
        variantStyles[variant],
        hoverable ? 'hover:shadow-lg dark:hover:shadow-2xl hover:-translate-y-1 hover:border-border-strong' : '',
        className,
      ].join(' ')}
      style={{
        background: variant !== 'glass' ? 'var(--card-bg)' : undefined,
        borderColor: variant !== 'glass' ? 'var(--card-border)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

Card.Header = function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={['px-6 py-5 border-b border-border-subtle', className].join(' ')}>{children}</div>;
};

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

Card.Content = function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={['px-6 py-5', className].join(' ')}>{children}</div>;
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

Card.Footer = function CardFooter({ children, className = '' }: CardFooterProps) {
  return <div className={['px-6 py-5 border-t border-border-subtle', className].join(' ')}>{children}</div>;
};
