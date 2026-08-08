import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBorder?: boolean;
  onClick?: () => void;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
  '2xl': 'w-24 h-24 text-3xl',
};

const iconSizeMap = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
  '2xl': 40,
};

/**
 * Avatar component that displays user profile picture or initials fallback.
 * Shows first letter of name or email if no avatar is available.
 */
export function Avatar({ src, name, email, size = 'md', className = '', showBorder = false, onClick }: AvatarProps) {
  const getInitials = (): string => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name[0].toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const baseClasses = [
    'rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden',
    sizeMap[size],
    showBorder ? 'ring-2 ring-white/20 dark:ring-black/20' : '',
    onClick ? 'cursor-pointer transition-transform hover:scale-105 active:scale-95' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (src) {
    return (
      <div className={baseClasses} onClick={onClick}>
        <img
          src={src}
          alt={name || email || 'User'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.currentTarget;
            target.style.display = 'none';
            if (target.nextElementSibling) {
              (target.nextElementSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
        <div
          className="w-full h-full items-center justify-center font-bold text-text-onaccent hidden"
          style={{ background: 'var(--gradient-accent)' }}
        >
          {getInitials()}
        </div>
      </div>
    );
  }

  // No avatar - show initials or icon
  return (
    <div className={baseClasses} style={{ background: 'var(--gradient-accent)' }} onClick={onClick}>
      {name || email ? (
        <span className="text-text-onaccent">{getInitials()}</span>
      ) : (
        <User size={iconSizeMap[size]} className="text-text-onaccent" />
      )}
    </div>
  );
}
