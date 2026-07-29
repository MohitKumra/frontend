import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { containerVariants, itemVariants } from '../lib/motionVariants';
import toast from 'react-hot-toast';
import {
  Bell,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Cloud,
  Columns3,
  KeyRound,
  LayoutGrid,
  ListChecks,
  Lock,
  Mail,
  Monitor,
  Moon,
  Palette,
  PlugZap,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SunMedium,
  Unplug,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TabBar } from '../components/ui/TabBar';
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
} from '../features/settings';
import { useChangePassword, useSetPassword } from '../features/auth';
import { usePushNotifications } from '../features/notifications';
import type { LayoutPreference, ThemePreference, TaskViewPreference } from '../types';

type SettingsTab = 'appearance' | 'notifications' | 'integrations' | 'security';
type CalendarView = 'day' | 'week' | 'month' | 'agenda';
type TaskView = 'list' | 'board';

const SETTINGS_TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: ReactNode;
}> = [
    { id: 'appearance', label: 'Appearance', icon: <Palette size={14} /> },
    { id: 'notifications', label: 'Notifications', icon: <BellRing size={14} /> },
    { id: 'integrations', label: 'Integrations', icon: <Cloud size={14} /> },
    { id: 'security', label: 'Security', icon: <ShieldCheck size={14} /> },
  ];

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

const CALENDAR_VIEW_OPTIONS: Array<{
  id: CalendarView;
  label: string;
  description: string;
}> = [
    { id: 'day', label: 'Day', description: 'Focused daily view' },
    { id: 'week', label: 'Week', description: 'Work across the week' },
    { id: 'month', label: 'Month', description: 'Big-picture planning' },
    { id: 'agenda', label: 'Agenda', description: 'Linear task-first view' },
  ];

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="relative inline-flex h-6 w-11 sm:h-7 sm:w-12 items-center rounded-full border transition-colors"
      style={{
        background: checked ? 'var(--gradient-accent)' : 'var(--color-border-subtle)',
        borderColor: checked ? 'transparent' : 'var(--color-border)',
      }}
      aria-pressed={checked}
    >
      <span
        className="inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white shadow-sm transition-transform"
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

function getInitialTab(searchParams: URLSearchParams): SettingsTab {
  if (searchParams.get('integration') === 'google-calendar') return 'integrations';
  const tab = searchParams.get('tab');
  if (tab === 'appearance' || tab === 'notifications' || tab === 'integrations' || tab === 'security') {
    return tab;
  }
  return 'appearance';
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-2.5 sm:gap-3">
      <div
        className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm sm:text-base font-extrabold text-text-primary">{title}</h2>
        <p className="text-xs text-text-muted mt-1 leading-snug">{subtitle}</p>
      </div>
    </div>
  );
}

function ChoiceChip({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl sm:rounded-2xl border p-3 sm:p-4 text-left transition-all hover:-translate-y-0.5 active:scale-[0.98]"
      style={{
        borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
        background: active
          ? 'color-mix(in srgb, var(--color-accent) 8%, var(--color-surface))'
          : 'var(--color-surface)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {icon && (
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--icon-bg-accent)', color: 'var(--icon-text-accent)' }}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold text-text-primary">{title}</div>
            <div className="text-[11px] sm:text-xs text-text-muted mt-0.5 sm:mt-1 leading-snug">{description}</div>
          </div>
        </div>
        {active && <CheckCircle2 size={16} className="text-accent shrink-0" />}
      </div>
    </button>
  );
}

function StatusPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className="text-[10px] font-bold px-2 py-1 rounded-full"
      style={{
        background: active ? 'var(--icon-bg-success)' : 'var(--icon-bg-warning)',
        color: active ? 'var(--icon-text-success)' : 'var(--icon-text-warning)',
      }}
    >
      {label}
    </span>
  );
}

function TabPanel({
  panelKey,
  className = '',
  children,
}: {
  panelKey: string;
  className?: string;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      key={panelKey}
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const uiTheme = useUIStore((s) => s.themePreference);
  const uiLayout = useUIStore((s) => s.layoutPreference);
  const setTheme = useUIStore((s) => s.setTheme);
  const [searchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [activeTab, setActiveTab] = useState<SettingsTab>(() => getInitialTab(searchParams));

  const handleTabChange = (newTab: SettingsTab) => {
    setActiveTab(newTab);
  };
  const { data, isLoading } = useSettings();
  const appearanceMutation = useUpdateAppearance();
  const notificationsMutation = useUpdateNotifications();
  const recoveryMutation = useUpdateRecoveryEmail();
  const googleStart = useGoogleCalendarStart();
  const syncGoogleCalendar = useSyncGoogleCalendar();
  const disconnectGoogleCalendar = useDisconnectGoogleCalendar();
  const changePassword = useChangePassword();
  const setPassword = useSetPassword();
  const {
    isSubscribed,
    permission,
    loading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTest: sendTestPush,
  } = usePushNotifications();

  const [appearance, setAppearance] = useState({
    themePreference: toThemePreference(uiTheme),
    layoutPreference: uiLayout as LayoutPreference,
    calendarView: 'month' as CalendarView,
    taskView: 'board' as TaskView,
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
    setActiveTab(getInitialTab(searchParams));
  }, [searchParamsString]);

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
    const isThemeChanging = next.themePreference && next.themePreference !== appearance.themePreference;
    // Update local previews immediately so the selected card and preview
    // match the sweep as it starts rather than after the network request.
    setAppearance(merged);

    if (isThemeChanging) {
      void setTheme(
        next.themePreference === 'SYSTEM'
          ? 'system'
          : next.themePreference === 'DARK'
            ? 'dark'
            : 'light',
        {
          animate: true,
          onMutate: () => {
            if (next.layoutPreference) {
              useUIStore.getState().setLayoutPreference(next.layoutPreference);
            }
            if (next.calendarView) {
              useUIStore.getState().setCalendarViewPreference(next.calendarView);
            }
            if (next.taskView) {
              useUIStore.getState().setTaskViewPreference(next.taskView as TaskViewPreference);
            }
          },
        },
      );
    } else {
      if (next.layoutPreference) {
        useUIStore.getState().setLayoutPreference(next.layoutPreference);
      }
      if (next.calendarView) {
        useUIStore.getState().setCalendarViewPreference(next.calendarView);
      }
      if (next.taskView) {
        useUIStore.getState().setTaskViewPreference(next.taskView as TaskViewPreference);
      }
    }

    appearanceMutation.mutate(merged);
  };

  const saveNotifications = (next: typeof notifications) => {
    setNotifications(next);
    notificationsMutation.mutate(next);
  };

  const handleConnectGoogle = async () => {
    try {
      const result = await googleStart.mutateAsync('/settings?integration=google-calendar');
      window.location.href = result.url;
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Google Calendar could not be started.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      if (security?.hasPassword) {
        await changePassword.mutateAsync({
          currentPassword,
          newPassword,
        });
        toast.success('Password changed successfully!');
      } else {
        await setPassword.mutateAsync({ newPassword });
        toast.success('Password set successfully!');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error((error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Failed to update password');
    }
  };

  const handleTogglePushSubscription = async () => {
    if (isSubscribed) {
      await unsubscribePush();
    } else {
      await subscribePush();
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto flex items-center justify-center py-16">
        <div className="text-sm font-semibold text-text-muted">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4 sm:gap-5 lg:gap-6 px-4 sm:px-0">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 sm:gap-5 lg:gap-6"
      >
        <motion.div variants={itemVariants}>
          <PageHeader
            icon={<ShieldCheck size={20} />}
            title="Settings"
            subtitle="Appearance, notifications, integrations, and account security"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <div
            className="overflow-x-auto -mx-4 sm:mx-0"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
            <div className="px-4 sm:px-0 hide-scrollbar">
              <TabBar
                tabs={SETTINGS_TABS}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                variant="underline"
                className="min-w-max"
              />
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === 'appearance' && (
              <TabPanel key="appearance" panelKey="appearance" className="grid xl:grid-cols-[1.1fr_0.9fr] gap-4 sm:gap-5">
                <div id="settings-appearance-panel" data-onboarding="settings-appearance">
                  <Card className="p-4 sm:p-5 lg:p-6" variant="default">
                    <SectionHeader
                      icon={<Palette size={20} />}
                      title="Appearance"
                      subtitle="Theme, density, and calendar view all save as soon as you choose them."
                    />

                    <div className="mt-4 sm:mt-5 space-y-5 sm:space-y-6">
                      <div id="settings-theme-options" data-onboarding="settings-theme">
                        <div className="flex items-center gap-2 mb-3">
                          <SunMedium size={16} className="text-accent" />
                          <h3 className="text-sm font-bold text-text-primary">Theme</h3>
                        </div>
                        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-3">
                          {APPEARANCE_OPTIONS.map((option) => {
                            const active = appearance.themePreference === option.id;
                            return (
                              <ChoiceChip
                                key={option.id}
                                active={active}
                                title={option.label}
                                description={option.description}
                                icon={option.icon}
                                onClick={() => applyAppearance({ themePreference: option.id })}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div id="settings-layout-options" data-onboarding="settings-layout">
                        <div className="flex items-center gap-2 mb-3">
                          <LayoutGrid size={16} className="text-accent" />
                          <h3 className="text-sm font-bold text-text-primary">Layout density</h3>
                        </div>
                        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-3">
                          {LAYOUT_OPTIONS.map((option) => {
                            const active = appearance.layoutPreference === option.id;
                            return (
                              <ChoiceChip
                                key={option.id}
                                active={active}
                                title={option.label}
                                description={option.description}
                                onClick={() => applyAppearance({ layoutPreference: option.id })}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CalendarClock size={16} className="text-accent" />
                          <h3 className="text-sm font-bold text-text-primary">Calendar view</h3>
                        </div>
                        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {CALENDAR_VIEW_OPTIONS.map((option) => {
                            const active = appearance.calendarView === option.id;
                            return (
                              <ChoiceChip
                                key={option.id}
                                active={active}
                                title={option.label}
                                description={option.description}
                                onClick={() => applyAppearance({ calendarView: option.id })}
                              />
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Columns3 size={16} className="text-accent" />
                          <h3 className="text-sm font-bold text-text-primary">Task view</h3>
                        </div>
                        <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2">
                          {(['board', 'list'] as TaskView[]).map((id) => {
                            const active = appearance.taskView === id;
                            return (
                              <ChoiceChip
                                key={id}
                                active={active}
                                title={id === 'board' ? 'Board' : 'List'}
                                description={id === 'board' ? 'Kanban-style columns' : 'Vertical task list'}
                                icon={id === 'board' ? <Columns3 size={16} /> : <ListChecks size={16} />}
                                onClick={() => applyAppearance({ taskView: id })}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-4 sm:p-5 lg:p-6" variant="default" style={{ overflow: 'hidden' }}>
                  <SectionHeader
                    icon={<Cloud size={20} />}
                    title="Workspace preview"
                    subtitle="See how your theme and density choices come to life."
                  />

                  <div
                    className="mt-4 sm:mt-5 rounded-xl sm:rounded-2xl overflow-hidden border relative"
                    style={{
                      borderColor: 'var(--color-border)',
                      background: 'linear-gradient(145deg, color-mix(in srgb, var(--color-surface) 92%, var(--color-accent) 8%) 0%, color-mix(in srgb, var(--color-surface) 86%, var(--color-info) 14%) 50%, color-mix(in srgb, var(--color-surface) 80%, var(--color-accent) 20%) 100%)',
                      minHeight: appearance.layoutPreference === 'COMPACT' ? '280px' : appearance.layoutPreference === 'EXPANDED' ? '340px' : '310px',
                    }}
                  >
                    {/* Animated gradient orbs */}
                    <motion.div
                      animate={{ x: [0, 15, 0], y: [0, -10, 0], scale: [1, 1.1, 1] }}
                      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute',
                          top: '-20%',
                          right: '-10%',
                          width: '180px',
                          height: '180px',
                          borderRadius: '50%',
                          background: 'color-mix(in srgb, var(--color-accent) 60%, var(--color-info) 40%)',
                          opacity: 0.18,
                          filter: 'blur(50px)',
                          pointerEvents: 'none',
                        }}
                      />
                    <motion.div
                      animate={{ x: [0, -12, 0], y: [0, 15, 0], scale: [1, 1.15, 1] }}
                      transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                        style={{
                          position: 'absolute',
                          bottom: '-15%',
                          left: '-5%',
                          width: '150px',
                          height: '150px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 72%, white 28%), color-mix(in srgb, var(--color-info) 68%, white 32%))',
                          opacity: 0.18,
                          filter: 'blur(45px)',
                          pointerEvents: 'none',
                        }}
                      />
                    <motion.div
                      animate={{ x: [0, 8, 0], y: [0, -8, 0] }}
                      transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                        style={{
                          position: 'absolute',
                          top: '40%',
                          left: '50%',
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-info) 78%, white 22%), color-mix(in srgb, var(--color-accent) 72%, white 28%))',
                          opacity: 0.14,
                          filter: 'blur(40px)',
                          pointerEvents: 'none',
                        }}
                      />

                    {/* Content layer */}
                    <div className="relative z-10 flex flex-col items-center justify-center h-full p-4 sm:p-6" style={{ minHeight: 'inherit' }}>

                      {/* Central workspace illustration */}
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="relative"
                      >
                        {/* Main floating window */}
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                          width: appearance.layoutPreference === 'COMPACT' ? '220px' : appearance.layoutPreference === 'EXPANDED' ? '280px' : '250px',
                          borderRadius: '16px',
                          background: 'color-mix(in srgb, var(--color-surface-raised) 86%, transparent)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          border: '1px solid color-mix(in srgb, var(--color-border) 75%, transparent)',
                          boxShadow: '0 20px 60px color-mix(in srgb, var(--color-accent) 10%, transparent), 0 4px 16px color-mix(in srgb, var(--color-info) 8%, transparent)',
                          padding: appearance.layoutPreference === 'COMPACT' ? '12px' : appearance.layoutPreference === 'EXPANDED' ? '18px' : '15px',
                        }}
                      >
                          {/* Window titlebar */}
                          <div className="flex items-center gap-1.5 mb-3">
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
                            <div
                              className="ml-2 rounded-full"
                              style={{
                                flex: 1,
                                height: 6,
                                background: 'color-mix(in srgb, var(--color-border) 45%, transparent)',
                                maxWidth: '80px',
                              }}
                            />
                          </div>

                          {/* Simulated content lines */}
                          <div className="flex flex-col" style={{ gap: appearance.layoutPreference === 'COMPACT' ? '6px' : appearance.layoutPreference === 'EXPANDED' ? '10px' : '8px' }}>
                            <div className="flex items-center gap-2">
                              <div
                                style={{
                                  width: 18,
                                  height: 18,
                                  borderRadius: '6px',
                                  background: 'var(--gradient-accent)',
                                  flexShrink: 0,
                                }}
                              />
                              <div
                                className="rounded-full"
                                style={{
                                  height: 6,
                                  width: '70%',
                                  background: 'color-mix(in srgb, var(--color-border) 65%, transparent)',
                                }}
                              />
                            </div>
                            <div className="flex gap-2">
                              <div
                              className="rounded-lg flex-1"
                              style={{
                                  height: appearance.layoutPreference === 'COMPACT' ? '28px' : appearance.layoutPreference === 'EXPANDED' ? '40px' : '34px',
                                  background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 18%, transparent), color-mix(in srgb, var(--color-info) 12%, transparent))',
                                  border: '1px solid color-mix(in srgb, var(--color-accent) 24%, transparent)',
                                }}
                              />
                              <div
                                className="rounded-lg flex-1"
                                style={{
                                  height: appearance.layoutPreference === 'COMPACT' ? '28px' : appearance.layoutPreference === 'EXPANDED' ? '40px' : '34px',
                                  background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-info) 18%, transparent), color-mix(in srgb, var(--color-accent) 12%, transparent))',
                                  border: '1px solid color-mix(in srgb, var(--color-info) 24%, transparent)',
                                }}
                              />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <div
                                className="rounded-full"
                                style={{
                                  height: 5,
                                  width: '90%',
                                  background: 'color-mix(in srgb, var(--color-border) 42%, transparent)',
                                }}
                              />
                              <div
                                className="rounded-full"
                                style={{
                                  height: 5,
                                  width: '65%',
                                  background: 'color-mix(in srgb, var(--color-border) 32%, transparent)',
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>

                        {/* Floating accent card - top right */}
                        <motion.div
                          animate={{ y: [0, -6, 0], x: [0, 3, 0] }}
                          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                            style={{
                              position: 'absolute',
                              top: '-12px',
                              right: '-28px',
                              width: appearance.layoutPreference === 'COMPACT' ? '64px' : '76px',
                              padding: '8px',
                              borderRadius: '12px',
                              background: 'color-mix(in srgb, var(--color-accent) 16%, transparent)',
                              backdropFilter: 'blur(16px)',
                              WebkitBackdropFilter: 'blur(16px)',
                              border: '1px solid color-mix(in srgb, var(--color-accent) 26%, transparent)',
                              boxShadow: '0 8px 24px color-mix(in srgb, var(--color-accent) 14%, transparent)',
                            }}
                        >
                          <svg width="100%" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="20" cy="14" r="8" fill="var(--color-accent)" opacity="0.3" />
                            <path d="M12 28c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
                            <circle cx="20" cy="14" r="4" fill="var(--color-accent)" opacity="0.7" />
                          </svg>
                        </motion.div>

                        {/* Floating status pill - bottom left */}
                        <motion.div
                          animate={{ y: [0, 5, 0], x: [0, -4, 0] }}
                          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
                            style={{
                              position: 'absolute',
                              bottom: '-8px',
                              left: '-24px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              background: 'color-mix(in srgb, var(--color-success) 14%, transparent)',
                              backdropFilter: 'blur(16px)',
                              WebkitBackdropFilter: 'blur(16px)',
                              border: '1px solid color-mix(in srgb, var(--color-success) 24%, transparent)',
                              boxShadow: '0 6px 20px color-mix(in srgb, var(--color-success) 12%, transparent)',
                            }}
                          >
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                          <div
                            className="rounded-full"
                            style={{
                              width: '32px',
                              height: 4,
                              background: 'color-mix(in srgb, var(--color-success) 55%, transparent)',
                            }}
                          />
                        </motion.div>

                        {/* Floating chart card - middle right */}
                        <motion.div
                          animate={{ y: [0, 4, 0], x: [0, -2, 0] }}
                          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
                            style={{
                              position: 'absolute',
                              top: '50%',
                              right: '-36px',
                              transform: 'translateY(-50%)',
                              padding: '8px 10px',
                              borderRadius: '10px',
                              background: 'color-mix(in srgb, var(--color-surface-raised) 76%, transparent)',
                              backdropFilter: 'blur(16px)',
                              WebkitBackdropFilter: 'blur(16px)',
                              border: '1px solid color-mix(in srgb, var(--color-border) 80%, transparent)',
                              boxShadow: '0 6px 20px color-mix(in srgb, var(--color-text-primary) 8%, transparent)',
                            }}
                        >
                          <svg width="48" height="28" viewBox="0 0 48 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                              d="M2 22 L10 16 L18 20 L26 8 L34 12 L42 4 L46 6"
                              stroke="var(--color-accent)"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              fill="none"
                            />
                            <path
                              d="M2 22 L10 16 L18 20 L26 8 L34 12 L42 4 L46 6 L46 28 L2 28Z"
                              fill="var(--color-accent)"
                              opacity="0.1"
                            />
                          </svg>
                        </motion.div>
                      </motion.div>

                      {/* Decorative dots pattern */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4, 1fr)',
                          gap: '8px',
                          opacity: 0.12,
                          pointerEvents: 'none',
                        }}
                      >
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div
                            key={i}
                            style={{
                              width: 3,
                              height: 3,
                              borderRadius: '50%',
                              background: i % 2 === 0 ? 'var(--color-accent)' : 'var(--color-info)',
                            }}
                          />
                        ))}
                      </div>

                      {/* Decorative ring - bottom right */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          border: '2px solid color-mix(in srgb, var(--color-border) 70%, transparent)',
                          pointerEvents: 'none',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            right: '6px',
                            bottom: '6px',
                            borderRadius: '50%',
                            border: '1.5px solid color-mix(in srgb, var(--color-border) 55%, transparent)',
                          }}
                        />
                      </div>
                    </div>

                    {/* Preview info footer */}
                    <div
                      className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-t text-[10px] sm:text-[11px] font-semibold relative z-10"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--color-border) 75%, transparent)',
                        background: 'color-mix(in srgb, var(--color-surface-raised) 78%, transparent)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <span className="flex items-center gap-1.5">
                        <span style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: 'var(--color-accent)',
                          boxShadow: '0 0 6px var(--color-accent)',
                        }} />
                        Live Preview
                        {' · '}
                        {appearance.layoutPreference === 'COMPACT' ? 'Compact' : appearance.layoutPreference === 'EXPANDED' ? 'Expanded' : 'Comfortable'}
                      </span>
                      <span style={{ opacity: 0.7 }}>Live Preview</span>
                    </div>
                  </div>
                </Card>
              </TabPanel>
            )}

            {activeTab === 'notifications' && (
              <TabPanel key="notifications" panelKey="notifications" className="w-full">
                <div data-onboarding="settings-notifications">
                  <Card className="p-4 sm:p-5 lg:p-6" variant="default">
                    <SectionHeader
                      icon={<BellRing size={20} />}
                      title="Notifications"
                      subtitle="Each toggle saves immediately, so you can keep moving without a separate apply button."
                    />

                    <div className="mt-4 sm:mt-5 space-y-2.5 sm:space-y-3">
                      {[
                        ['taskDue', 'Task due reminders', 'Notify before a task deadline.'],
                        ['habitReminder', 'Habit reminders', 'Ping when a habit is due.'],
                        ['projectDeadline', 'Project deadlines', 'Alert before major project dates.'],
                        ['focusSessionComplete', 'Focus completions', 'Celebrate finished focus blocks.'],
                        ['calendarSync', 'Calendar sync alerts', 'Track sync failures or status updates.'],
                      ].map(([key, title, description]) => (
                        <div
                          key={key}
                          className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 rounded-xl sm:rounded-2xl border p-3 sm:p-4"
                          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-text-primary">{title}</div>
                            <div className="text-xs text-text-muted mt-1 leading-snug">{description}</div>
                          </div>
                          <div className="shrink-0">
                            <Toggle
                              checked={notifications[key as keyof typeof notifications]}
                              onToggle={() => {
                                const next = { ...notifications, [key]: !notifications[key as keyof typeof notifications] };
                                saveNotifications(next);
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </TabPanel>
            )}

            {activeTab === 'integrations' && (
              <TabPanel key="integrations" panelKey="integrations" className="grid lg:grid-cols-[1.05fr_0.95fr] gap-4 sm:gap-5">
                <div id="settings-integrations-panel" data-onboarding="settings-integrations">
                  <Card className="p-4 sm:p-5 lg:p-6" variant="default">
                    <SectionHeader
                      icon={<Cloud size={20} />}
                      title="Integrations"
                      subtitle="Google Calendar is linked separately from Google sign-in, so the account connection stays clean."
                    />

                    <div className="mt-4 sm:mt-5 space-y-4 sm:space-y-5">
                      <div className="rounded-xl sm:rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-text-primary">Google Calendar</p>
                            <p className="text-xs text-text-muted mt-1 leading-snug break-words">
                              {googleCalendar?.connected
                                ? `Connected as ${googleCalendar.googleEmail ?? 'your Google account'}`
                                : 'Connect to push planner due dates into Google Calendar.'}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <StatusPill label={googleCalendar?.connected ? 'Connected' : 'Not connected'} active={Boolean(googleCalendar?.connected)} />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
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

                      {/* Push Notifications Section */}
                      <div className="rounded-xl sm:rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-raised)' }}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-text-primary">Browser Push Notifications</p>
                            <p className="text-xs text-text-muted mt-1 leading-snug">
                              {isSubscribed
                                ? 'Subscribed to browser alerts for tasks, habits, and reminders.'
                                : 'Get reminded of tasks and habits in real time through browser notifications.'}
                            </p>
                            {permission === 'denied' && (
                              <p className="text-xs font-semibold text-warning mt-2 leading-snug">
                                Browser notifications are blocked. Please enable them in your browser settings.
                              </p>
                            )}
                          </div>
                          <div className="shrink-0">
                            <StatusPill label={isSubscribed ? 'Subscribed' : 'Not subscribed'} active={isSubscribed} />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={isSubscribed ? 'danger' : 'primary'}
                            leftIcon={isSubscribed ? <ShieldAlert size={14} /> : <Shield size={14} />}
                            loading={pushLoading}
                            onClick={handleTogglePushSubscription}
                            disabled={permission === 'denied'}
                          >
                            {isSubscribed ? 'Disable Push Alerts' : 'Enable Push Alerts'}
                          </Button>
                          {isSubscribed && (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={<Bell size={14} />}
                                onClick={() => sendTestPush(['BROWSER_PUSH'])}
                                disabled={!isSubscribed}
                              >
                                Test Push
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                leftIcon={<Mail size={14} />}
                                onClick={() => sendTestPush(['EMAIL'])}
                              >
                                Test Email
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-4 sm:p-5 lg:p-6" variant="default">
                  <SectionHeader
                    icon={<ShieldCheck size={20} />}
                    title="Google sign-in"
                    subtitle="Signing in with Google automatically links the account; you only need the calendar connector if you want sync."
                  />

                  <div className="mt-4 sm:mt-5 grid gap-2.5 sm:gap-3">
                    <div className="rounded-xl sm:rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Account link</div>
                      <div className="mt-2 text-sm font-bold text-text-primary">
                        {security?.hasGoogle ? 'Linked to Google' : 'Not linked to Google'}
                      </div>
                      <p className="mt-1 text-xs text-text-muted leading-snug">
                        Use Google sign-in to create or access the account. Calendar sync still needs the separate integration step.
                      </p>
                    </div>

                    <div className="rounded-xl sm:rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Recovery email</div>
                      <div className="mt-2 text-sm font-bold text-text-primary break-words">
                        {recoveryEmail.trim() ? recoveryEmail : 'No recovery email saved'}
                      </div>
                      <p className="mt-1 text-xs text-text-muted leading-snug">
                        Helpful if you sign in with Google and want a backup inbox for password resets.
                      </p>
                    </div>
                  </div>
                </Card>
              </TabPanel>
            )}

            {activeTab === 'security' && (
              <TabPanel key="security" panelKey="security" className="grid lg:grid-cols-[0.95fr_1.05fr] gap-4 sm:gap-5">
                <div id="settings-security-panel" data-onboarding="settings-security">
                  <Card className="p-4 sm:p-5 lg:p-6" variant="default">
                    <SectionHeader
                      icon={<Lock size={20} />}
                      title="Security"
                      subtitle="Manage your password and recovery path from one place."
                    />

                    <div className="mt-4 sm:mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 mb-4 sm:mb-5">
                      <div className="rounded-xl sm:rounded-2xl border p-3 sm:p-4" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Password status</div>
                        <div className="mt-2 text-sm font-bold text-text-primary">
                          {security?.hasPassword ? 'Password set' : 'No password yet'}
                        </div>
                      </div>
                      <div className="rounded-xl sm:rounded-2xl border p-3 sm:p-4" style={{ borderColor: 'var(--color-border)' }}>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Google sign-in</div>
                        <div className="mt-2 text-sm font-bold text-text-primary">
                          {security?.hasGoogle ? 'Linked' : 'Not linked'}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl sm:rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'var(--icon-bg-info)', color: 'var(--icon-text-info)' }}
                        >
                          <Mail size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-text-primary">Recovery email</p>
                          <p className="text-xs text-text-muted mt-0.5 leading-snug">
                            Keep a backup email on file so resets still work if Google access changes.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2.5 sm:gap-3">
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
                          fullWidth
                        >
                          Save recovery email
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>

                <Card className="p-4 sm:p-5 lg:p-6" variant="default">
                  <SectionHeader
                    icon={<KeyRound size={20} />}
                    title={security?.hasPassword ? 'Change password' : 'Create password'}
                    subtitle={
                      security?.hasPassword
                        ? 'Update the local password for this account.'
                        : 'Set a password so the account can recover without Google.'
                    }
                  />

                  <form className="space-y-2.5 sm:space-y-3 mt-4 sm:mt-5" onSubmit={handlePasswordSubmit}>
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
                      <p className="text-xs font-semibold text-danger flex items-center gap-1.5 px-1">
                        Passwords do not match.
                      </p>
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
              </TabPanel>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
