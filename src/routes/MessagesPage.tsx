import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Award, CheckCircle2, AlertCircle, Info, Trash2, ArrowLeft } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { LoadingScreen } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useMessages, useMarkAllMessagesAsRead, useMarkMessageAsRead, useDeleteMessage } from '../features/messages/hooks/useMessages';
import type { MessageDTO } from '../types';

const messageIcons = {
  SYSTEM: Info,
  PROJECT: CheckCircle2,
  REMINDER: AlertCircle,
  ACHIEVEMENT: Award,
};

export function MessagesPage() {
  const navigate = useNavigate();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const { data, isLoading } = useMessages({ limit: 100 });
  const markAll = useMarkAllMessagesAsRead();
  const markOne = useMarkMessageAsRead();
  const deleteMessage = useDeleteMessage();

  const messages = useMemo(
    () => (data?.data ?? []).filter((message) => !showUnreadOnly || message.status === 'SENT'),
    [data, showUnreadOnly],
  );

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-5 sm:gap-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowUnreadOnly((v) => !v)}>
            {showUnreadOnly ? 'Show all' : 'Unread only'}
          </Button>
          <Button size="sm" onClick={() => markAll.mutate()}>
            Mark all read
          </Button>
        </div>
      </div>

      <PageHeader icon={<Bell size={24} />} title="Messages" subtitle="Project updates, reminders, and achievements" />

      {messages.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-text-muted">No messages yet</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {messages.map((message: MessageDTO) => {
            const Icon = messageIcons[message.type];
            return (
              <Card key={message.id} className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-text-primary">{message.content}</p>
                        <p className="text-xs text-text-muted mt-1">{new Date(message.createdAt).toLocaleString()}</p>
                      </div>
                      {!message.readAt && <Badge variant="accent" size="sm">New</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {message.project && (
                        <button
                          type="button"
                          onClick={() => navigate(`/projects/${message.project!.id}`)}
                          className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={{ background: `${message.project.color}20`, color: message.project.color }}
                        >
                          {message.project.name}
                        </button>
                      )}
                      {message.actionUrl && (
                        <Button variant="secondary" size="sm" onClick={() => navigate(message.actionUrl!)}>
                          Open
                        </Button>
                      )}
                      {!message.readAt && (
                        <Button variant="secondary" size="sm" onClick={() => markOne.mutate(message.id)}>
                          Mark read
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteMessage.mutate(message.id)}
                        className="text-xs font-bold text-danger inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
