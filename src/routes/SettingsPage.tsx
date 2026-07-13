import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Palette,
  LayoutGrid,
  BellRing,
  ShieldCheck,
  Cloud,
  Mail,
  Lock,
  KeyRound,
  CalendarClock,
  RefreshCw,
  PlugZap,
  Unplug,
  CheckCircle2,
  Moon,
  SunMedium,
  Monitor,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import {
  useDisconnectGoogleCalendar,
  useGoogleCalendarStart,
  useSettings,
  useSyncGoogleCalendar,
  useUpdateAppearance,
  useUpdateNotifications,
  useUpdateRecoveryEmail,
} from '../features/settings/hooks/useSettings';
import { useChangePassword, useSetPassword } from '../features/auth/hooks/useAuth';
import type { LayoutPreference, ThemePreference } from '../types';

const APPEARANCE_OPTIONS: Array<{
  id: ThemePreference;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  { id: 'LIGHT', label: 'Light', description: 'Bright, paper-like surfaces', icon: <SunMedium size={16} /> },
  { id: 'DARK', label: 'Dark', description: 'Low-light focus mode', icon: <Moon size={16} /> },
  { id: 'SYSTEM', label: 'System', description: 'Follow the device setting', icon: <Monitor size={16} /> },
];

const LAYOUT_OPTIONS: Array<{
  id: LayoutPreference;
  label: string;
  description: string;
  scale: number;
}> = [
  { id: 'COMPACT', label: 'Compact', description: 'More content, less spacing', scale: 0.8 },
  { id: 'COMFORTABLE', label: 'Comfortable', description: 'Balanced spacing', scale: 1 },
  { id: 'EXPANDED', label: 'Expanded', description: 'Roomier, editorial layout', scale: 1.2 },
];

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-7 w-12 items-center rounded-full border transition-colors"
      style={{
        background: checked ? 'var(--gradient-accent)' : 'var(--color-border-subtle)',
        borderColor: checked ? 'transparent' : 'var(--color-border)',
      }}
      aria-pressed={checked}
    >
      <span
        className="inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(3px)' }}
      />
    </button>
  );
}

function toThemePreference(value: string): ThemePreference {
  if (value === 'dark' || value === 'DARK') return 'DARK';
  if (value === 'light' || value === 'LIGHT') return 'LIGHT';
  return 'SYSTEM';
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const uiTheme = useUIStore((s) => s.themePreference);
  const uiLayout = useUIStore((s) => s.layoutPreference);
  const { data, isLoading } = useSettings();
  const appearanceMutation = useUpdateAppearance();
  const notificationsMutation = useUpdateNotifications();
  const recoveryMutation = useUpdateRecoveryEmail();
  const googleStart = useGoogleCalendarStart();
  const syncGoogleCalendar = useSyncGoogleCalendar();
  const disconnectGoogleCalendar = useDisconnectGoogleCalendar();
  const changePassword = useChangePassword();
  const setPassword = useSetPassword();

  const [appearance, setAppearance] = useState({
    themePreference: toThemePreference(uiTheme),
    layoutPreference: uiLayout as LayoutPreference,
    calendarView: 'month' as 'day' | 'week' | 'month' | 'agenda',
  });
  const [notifications, setNotifications] = useState({
    taskDue: true,
    habitReminder: true,
    projectDeadline: true,
    focusSessionComplete: false,
    calendarSync: true,
  });
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!data) return;
    setAppearance(data.appearance);
    setNotifications(data.notifications);
    setRecoveryEmail(data.security.recoveryEmail ?? '');
  }, [data]);

  const googleCalendar = data?.integrations.googleCalendar;
  const security = data?.security;

  const previewScale = useMemo(
    () => LAYOUT_OPTIONS.find((option) => option.id === appearance.layoutPreference)?.scale ?? 1,
    [appearance.layoutPreference],
  );

  const applyAppearance = (next: Partial<typeof appearance>) => {
    const merged = { ...appearance, ...next };
    setAppearance(merged);
    appearanceMutation.mutate(merged);
  };

  const saveNotifications = (next: typeof notifications) => {
    setNotifications(next);
    notificationsMutation.mutate(next);
  };

  const handleConnectGoogle = async () => {
    const result = await googleStart.mutateAsync('/settings?integration=google-calendar');
    window.location.href = result.url;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    if (security?.hasPassword) {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword,
      });
    } else {
      await setPassword.mutateAsync({ newPassword });
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto flex items-center justify-center py-16">
        <div className="text-sm font-semibold text-text-muted">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-5 sm:gap-6">
      <PageHeader
        icon={<ShieldCheck size={20} />}
        title="Settings"
        subtitle="Appearance, recovery, Google Calendar, and notification controls"
      />

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5">
        <Card className="p-5 sm:p-6" variant="default">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}>
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary">Appearance</h2>
              <p className="text-xs text-text-muted">Theme, density, and a quick preview of what the workspace feels like.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            {APPEARANCE_OPTIONS.map((option) => {
              const active = appearance.themePreference === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyAppearance({ themePreference: option.id })}
                  className="text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
                  style={{
                    borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
                    background: active ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))' : 'var(--color-surface)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}>
                      {option.icon}
                    </div>
                    {active && <CheckCircle2 size={16} className="text-accent" />}
                  </div>
                  <div className="mt-4 text-sm font-bold text-text-primary">{option.label}</div>
                  <p className="mt-1 text-xs text-text-muted leading-snug">{option.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid size={16} className="text-accent" />
              <h3 className="text-sm font-bold text-text-primary">Layout density</h3>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {LAYOUT_OPTIONS.map((option) => {
                const active = appearance.layoutPreference === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => applyAppearance({ layoutPreference: option.id })}
                    className="rounded-2xl border p-4 text-left transition-all"
                    style={{
                      borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
                      background: active ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))' : 'var(--color-surface)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-text-primary">{option.label}</div>
                        <div className="text-xs text-text-muted mt-1">{option.description}</div>
                      </div>
                      {active && <CheckCircle2 size={16} className="text-accent" />}
                    </div>
                    <div className="mt-4 rounded-2xl border p-3 overflow-hidden" style={{ borderColor: 'var(--color-border)', transform: `scale(${option.scale})`, transformOrigin: 'top left' }}>
                      <div className="h-2 w-24 rounded-full bg-accent/20" />
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
                        <div className="h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6" variant="default">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--icon-bg-success)', color: 'var(--icon-text-success)' }}>
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary">Integrations</h2>
              <p className="text-xs text-text-muted">Connect Google Calendar and keep planner items in sync.</p>
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-text-primary">Google Calendar</p>
                <p className="text-xs text-text-muted mt-1 leading-snug">
                  {googleCalendar?.connected
                    ? `Connected as ${googleCalendar.googleEmail ?? 'your Google account'}`
                    : 'Connect to push planner due dates into Google Calendar.'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: googleCalendar?.connected ? 'var(--icon-bg-success)' : 'var(--icon-bg-warning)', color: googleCalendar?.connected ? 'var(--icon-text-success)' : 'var(--icon-text-warning)' }}>
                  {googleCalendar?.connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                leftIcon={<PlugZap size={14} />}
                loading={googleStart.isPending}
                onClick={handleConnectGoogle}
              >
                {googleCalendar?.connected ? 'Reconnect' : 'Connect Google'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<RefreshCw size={14} />}
                loading={syncGoogleCalendar.isPending}
                onClick={() => syncGoogleCalendar.mutate()}
                disabled={!googleCalendar?.connected}
              >
                Sync Now
              </Button>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Unplug size={14} />}
                loading={disconnectGoogleCalendar.isPending}
                onClick={() => disconnectGoogleCalendar.mutate()}
                disabled={!googleCalendar?.connected}
              >
                Disconnect
              </Button>
            </div>

            {googleCalendar?.lastSyncedAt && (
              <p className="mt-3 text-[11px] text-text-muted flex items-center gap-1.5">
                <CalendarClock size={12} />
                Last synced {new Date(googleCalendar.lastSyncedAt).toLocaleString()}
              </p>
            )}
          </div>

          <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--icon-bg-info)', color: 'var(--icon-text-info)' }}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">Account recovery</p>
                <p className="text-xs text-text-muted mt-0.5">
                  If you sign in with Google and later lose access to that inbox, keep a recovery email on file.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <Input
                id="recovery-email"
                label="Recovery email"
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                leftIcon={<Mail size={16} />}
                placeholder="backup@example.com"
              />
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Mail size={14} />}
                loading={recoveryMutation.isPending}
                onClick={() => recoveryMutation.mutate(recoveryEmail.trim() ? recoveryEmail : null)}
              >
                Save recovery email
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5">
        <Card className="p-5 sm:p-6" variant="default">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--icon-bg-warning)', color: 'var(--icon-text-warning)' }}>
              <BellRing size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary">Notifications</h2>
              <p className="text-xs text-text-muted">Enable or disable each trigger manually.</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              ['taskDue', 'Task due reminders', 'Notify before a task deadline.'],
              ['habitReminder', 'Habit reminders', 'Ping when a habit is due.'],
              ['projectDeadline', 'Project deadlines', 'Alert before major project dates.'],
              ['focusSessionComplete', 'Focus completions', 'Celebrate finished focus blocks.'],
              ['calendarSync', 'Calendar sync alerts', 'Track sync failures or status updates.'],
            ].map(([key, title, description]) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
                <div>
                  <div className="text-sm font-bold text-text-primary">{title}</div>
                  <div className="text-xs text-text-muted mt-1">{description}</div>
                </div>
                <Toggle
                  checked={notifications[key as keyof typeof notifications]}
                  onToggle={() => {
                    const next = { ...notifications, [key]: !notifications[key as keyof typeof notifications] };
                    saveNotifications(next);
                  }}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6" variant="default">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}>
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-text-primary">Security</h2>
              <p className="text-xs text-text-muted">
                {security?.hasPassword ? 'Change your local password.' : 'Set a password so this account can recover without Google.'}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-5">
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Password status</div>
              <div className="mt-2 text-sm font-bold text-text-primary">
                {security?.hasPassword ? 'Password set' : 'No password yet'}
              </div>
            </div>
            <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Google sign-in</div>
              <div className="mt-2 text-sm font-bold text-text-primary">
                {security?.hasGoogle ? 'Linked' : 'Not linked'}
              </div>
            </div>
          </div>

          <form className="space-y-3" onSubmit={handlePasswordSubmit}>
            {security?.hasPassword && (
              <Input
                id="current-password"
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                leftIcon={<KeyRound size={16} />}
                placeholder="Current password"
                required={security.hasPassword}
              />
            )}
            <Input
              id="new-password"
              label={security?.hasPassword ? 'New password' : 'Create password'}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              leftIcon={<KeyRound size={16} />}
              placeholder="Min. 8 characters"
              minLength={8}
              required
            />
            <Input
              id="confirm-password-settings"
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<KeyRound size={16} />}
              placeholder="Repeat password"
              minLength={8}
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs font-semibold text-danger">Passwords do not match.</p>
            )}

            <Button
              type="submit"
              fullWidth
              loading={changePassword.isPending || setPassword.isPending}
              leftIcon={<Lock size={14} />}
            >
              {security?.hasPassword ? 'Change password' : 'Set password'}
            </Button>
          </form>
        </Card>
      </div>

      <Card className="p-5 sm:p-6" variant="default">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--icon-bg-info)', color: 'var(--icon-text-info)' }}>
            <Cloud size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-text-primary">Workspace preview</h2>
            <p className="text-xs text-text-muted">A quick snapshot of the current layout preference.</p>
          </div>
        </div>

        <div
          className="rounded-[1.5rem] border p-5 sm:p-6"
          style={{
            borderColor: 'var(--color-border)',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 7%, var(--color-surface)), var(--color-surface))',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: 'var(--gradient-accent)' }}>
              <span className="text-lg font-black">P</span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-black text-text-primary">FlowSpace workspace</div>
              <div className="text-xs text-text-muted mt-1">Theme: {appearance.themePreference.toLowerCase()} · Layout: {appearance.layoutPreference.toLowerCase()}</div>
            </div>
          </div>

          <div className="mt-5 grid md:grid-cols-3 gap-3" style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
            <div className="rounded-2xl border p-4 bg-surface" style={{ borderColor: 'var(--color-border)' }}>
              <div className="h-2 w-16 rounded-full bg-accent/25" />
              <div className="mt-4 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
            </div>
            <div className="rounded-2xl border p-4 bg-surface" style={{ borderColor: 'var(--color-border)' }}>
              <div className="h-2 w-20 rounded-full bg-success/25" />
              <div className="mt-4 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
            </div>
            <div className="rounded-2xl border p-4 bg-surface" style={{ borderColor: 'var(--color-border)' }}>
              <div className="h-2 w-14 rounded-full bg-warning/25" />
              <div className="mt-4 h-20 rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
            </div>
          </div>

          <div className="mt-5 text-xs text-text-muted">
            {user?.email ? `Signed in as ${user.email}` : 'Signed in user'}
          </div>
        </div>
      </Card>
    </div>
  );
}
