import { Lightbulb, TrendingUp, Clock, Calendar, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';

interface Insight {
  id: string;
  type: 'positive' | 'neutral' | 'warning';
  icon: 'trend' | 'clock' | 'calendar' | 'alert';
  text: string;
}

interface ProductivityInsightsProps {
  insights?: Insight[];
}

function getIconComponent(icon: Insight['icon']) {
  const icons = {
    trend: TrendingUp,
    clock: Clock,
    calendar: Calendar,
    alert: AlertCircle,
  };
  return icons[icon];
}

function getInsightStyle(type: Insight['type']) {
  const styles = {
    positive: {
      bg: 'color-mix(in srgb, var(--color-success) 8%, var(--color-surface-raised))',
      border: 'var(--color-success)',
      icon: 'var(--icon-bg-success)',
      iconText: 'var(--icon-text-success)',
    },
    neutral: {
      bg: 'color-mix(in srgb, var(--color-info) 8%, var(--color-surface-raised))',
      border: 'var(--color-info)',
      icon: 'var(--icon-bg-info)',
      iconText: 'var(--icon-text-info)',
    },
    warning: {
      bg: 'color-mix(in srgb, var(--color-warning) 8%, var(--color-surface-raised))',
      border: 'var(--color-warning)',
      icon: 'var(--icon-bg-warning)',
      iconText: 'var(--icon-text-warning)',
    },
  };
  return styles[type];
}

// Default insights if none provided
const defaultInsights: Insight[] = [
  {
    id: '1',
    type: 'positive',
    icon: 'trend',
    text: 'You finish 38% more work before noon.',
  },
  {
    id: '2',
    type: 'warning',
    icon: 'clock',
    text: 'Your focus drops after 4 PM.',
  },
  {
    id: '3',
    type: 'neutral',
    icon: 'calendar',
    text: 'Thursday is your most productive day.',
  },
  {
    id: '4',
    type: 'neutral',
    icon: 'trend',
    text: 'Average task completion: 1.8 hours.',
  },
];

export function ProductivityInsights({ insights = defaultInsights }: ProductivityInsightsProps) {
  return (
    <Card variant="default" className="overflow-hidden">
      <div className="p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <Lightbulb size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">Productivity Insights</h3>
            <p className="text-xs text-text-secondary">AI-powered patterns</p>
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-3.5">
          {insights.map((insight) => {
            const style = getInsightStyle(insight.type);
            const Icon = getIconComponent(insight.icon);

            return (
              <div
                key={insight.id}
                className="rounded-xl p-3.5 transition-all hover:shadow-sm hover:-translate-y-0.5"
                style={{ 
                  background: style.bg, 
                  border: `1px solid ${style.border}` 
                }}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: style.icon, color: style.iconText }}
                  >
                    <Icon size={14} />
                  </div>
                  <p className="text-sm font-medium text-text-primary leading-relaxed flex-1">
                    {insight.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Powered by AI Badge */}
        <div className="mt-5 text-center">
          <span 
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ 
              background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)', 
              color: 'var(--color-accent)' 
            }}
          >
            <Lightbulb size={10} />
            Powered by AI
          </span>
        </div>
      </div>
    </Card>
  );
}
