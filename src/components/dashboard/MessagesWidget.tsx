import React from 'react';
import { Bell, CheckCircle2, AlertCircle, Info, Award, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { useMarkMessageAsRead } from '../../features/messages/hooks/useMessages';
import type { MessageDTO } from '../../types';

interface MessagesWidgetProps {
  messages: MessageDTO[];
}

const messageIcons = {
  SYSTEM: Info,
  PROJECT: CheckCircle2,
  REMINDER: AlertCircle,
  ACHIEVEMENT: Award,
};

const messageColors = {
  SYSTEM: 'info',
  PROJECT: 'accent',
  REMINDER: 'warning',
  ACHIEVEMENT: 'success',
} as const;

export function MessagesWidget({ messages }: MessagesWidgetProps) {
  const navigate = useNavigate();
  const markAsRead = useMarkMessageAsRead();

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleMessageClick = (message: MessageDTO) => {
    if (message.status === 'SENT') {
      markAsRead.mutate(message.id);
    }
    if (message.actionUrl) {
      navigate(message.actionUrl);
    }
  };

  return (
    <Card variant="default" className="overflow-hidden">
      {/* Header */}
      <div 
        className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'var(--icon-bg-warning)',
              color: 'var(--icon-text-warning)',
            }}
          >
            <Bell size={16} />
          </div>
          <h3 className="text-sm font-bold text-text-primary">Messages & Notifications</h3>
        </div>
        <button 
          className="text-xs font-bold text-accent hover:text-accent-hover transition-colors"
          onClick={() => navigate('/messages')}
        >
          View All
        </button>
      </div>

      {/* Messages List */}
      <div className="max-h-[320px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-xs text-text-muted">No messages yet</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border-subtle)' }}>
            {messages.slice(0, 8).map((message) => {
              const Icon = messageIcons[message.type];
              const color = messageColors[message.type];
              const isUnread = message.status === 'SENT';

              return (
                <div
                  key={message.id}
                  onClick={() => handleMessageClick(message)}
                  className={`px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors ${
                    message.actionUrl ? 'cursor-pointer' : ''
                  } ${isUnread ? 'bg-accent/5' : ''}`}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div 
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: `var(--icon-bg-${color})`,
                        color: `var(--icon-text-${color})`,
                      }}
                    >
                      <Icon size={14} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-xs font-bold ${isUnread ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {message.content}
                        </p>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1" />
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-text-muted">
                          {formatTimeAgo(message.createdAt)}
                        </span>
                        
                        {message.project && (
                          <span 
                            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${message.project.color}20`,
                              color: message.project.color,
                            }}
                          >
                            {message.project.name}
                          </span>
                        )}

                        {message.actionUrl && (
                          <ChevronRight size={12} className="text-text-muted" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
