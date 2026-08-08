import React from 'react';

interface TabOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

interface TabBarProps<T extends string = string> {
  tabs: TabOption<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

/**
 * Reusable premium TabBar component.
 * Supports pill design (dashboard filters) and underline design.
 * Handles transitions smoothly using CSS variables and scaling animations.
 */
export function TabBar<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  variant = 'pill',
  className = '',
}: TabBarProps<T>) {
  return (
    <div
      className={[
        'flex items-center gap-1.5 p-1 rounded-2xl w-fit max-w-full overflow-x-auto select-none no-scrollbar border',
        variant === 'pill' ? 'bg-surface' : 'bg-transparent border-transparent border-b-border rounded-none pb-0 px-0',
        className,
      ].join(' ')}
      style={{
        borderColor: variant === 'pill' ? 'var(--color-border)' : undefined,
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        if (variant === 'underline') {
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={[
                'relative px-3 sm:px-5 py-3 text-xs sm:text-sm font-bold transition-all duration-200 flex items-center gap-1.5 sm:gap-2 tap-target whitespace-nowrap',
                isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent animate-scale-in"
                  style={{
                    transformOrigin: 'center',
                    background: 'var(--color-accent)',
                  }}
                />
              )}
            </button>
          );
        }

        // Pill variant
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={[
              'px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2 tap-target',
              isActive
                ? 'text-text-onaccent shadow-md shadow-accent/15'
                : 'text-text-secondary hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-text-primary',
            ].join(' ')}
            style={{
              background: isActive ? 'var(--gradient-accent)' : undefined,
            }}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
