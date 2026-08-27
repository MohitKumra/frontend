import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary';
import { PageTransition } from './components/layout/PageTransition';
import { useAuthStore } from './store/authStore';
import { useOnboarding } from './features/onboarding/hooks/useOnboarding';
import { hasCompletedOnboarding } from './features/onboarding/utils/storage';

// Auth pages (public)
import { AuthPage } from './routes/AuthPage';
import { ForgotPasswordPage } from './routes/ForgotPasswordPage';
import { ResetPasswordPage } from './routes/ResetPasswordPage';
import { GoogleAuthCallbackPage } from './routes/GoogleAuthCallbackPage';
import { AnimationTestPage } from './routes/AnimationTestPage';
import { AchievementsTestPage } from './routes/AchievementsTestPage';
import { PrivacyPolicyPage } from './routes/PrivacyPolicyPage';
import { TermsConditionsPage } from './routes/TermsConditionsPage';

// Protected pages
import { DashboardPage } from './routes/DashboardPage';
import { TasksPage } from './routes/TasksPage';
import { CalendarPage } from './routes/CalendarPage';
import { HabitsPage } from './routes/HabitsPage';
import { NotesPage } from './routes/NotesPage';
import { FocusPage } from './routes/FocusPage';
import { ProjectsPage } from './routes/ProjectsPage';
import { GoalsPage } from './routes/GoalsPage';
import { GoalDetailPage } from './routes/GoalDetailPage';
import { AIControlsPage } from './routes/AIControlsPage';
import { SettingsPage } from './routes/SettingsPage';
import { StoragePage } from './routes/StoragePage';
import { ProfilePage } from './routes/ProfilePage';
import { PlanPage } from './routes/PlanPage';
import { BlockedOverlay } from './components/BlockedOverlay';
import { UpgradeModal } from './components/billing/UpgradeModal';
import { useUpgradeModalStore } from './store/upgradeModalStore';
import { useSystemMaintenance } from './hooks/useSystemMaintenance';
import { TaskDetailPage } from './routes/TaskDetailPage';
import { ProjectDetailPage } from './routes/ProjectDetailPage';
import { NotFoundPage } from './routes/NotFoundPage';

// Admin portal
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminGuard } from './components/admin/AdminGuard';
import { AdminLoginPage } from './routes/admin/AdminLoginPage';
import { AdminVerifyOtpPage } from './routes/admin/AdminVerifyOtpPage';
import { AdminDashboardPage } from './routes/admin/AdminDashboardPage';
import { AdminUsersPage } from './routes/admin/AdminUsersPage';
import { AdminUserDetailPage } from './routes/admin/AdminUserDetailPage';
import { AdminPlansPage } from './routes/admin/AdminPlansPage';
import { AdminCouponsPage } from './routes/admin/AdminCouponsPage';
import { AdminSubscriptionsPage } from './routes/admin/AdminSubscriptionsPage';
import { AdminTransactionsPage } from './routes/admin/AdminTransactionsPage';
import { AdminAnalyticsPage } from './routes/admin/AdminAnalyticsPage';
import { AdminAuditLogPage } from './routes/admin/AdminAuditLogPage';
import { AdminSystemPage } from './routes/admin/AdminSystemPage';
import { AdminSettingsPage } from './routes/admin/AdminSettingsPage';


/** Redirects unauthenticated users to /login. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * Listens for first-time authentication and triggers the onboarding tour.
 * Must be placed inside the OnboardingRoot context (inside App).
 */
function OnboardingTrigger() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isActive, actions } = useOnboarding();
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Trigger onboarding only once: when user is authenticated,
    // hasn't completed onboarding before, and tour isn't already active.
    if (isAuthenticated && !hasCompletedOnboarding() && !hasTriggered.current && !isActive) {
      hasTriggered.current = true;
      // Slight delay so the dashboard renders before the welcome modal
      setTimeout(() => {
        actions.start();
      }, 600);
    }
  }, [isAuthenticated, isActive, actions]);

  return null;
}

function CoachRedirectPage() {
  const location = useLocation();
  return <Navigate to="/coach" replace state={location.state} />;
}

/** Renders the globally-triggered "upgrade required" modal. */
function GlobalUpgradeModal() {
  const isOpen = useUpgradeModalStore((s) => s.isOpen);
  const featureName = useUpgradeModalStore((s) => s.featureName);
  const message = useUpgradeModalStore((s) => s.message);
  const closeUpgrade = useUpgradeModalStore((s) => s.closeUpgrade);
  return (
    <UpgradeModal
      isOpen={isOpen}
      onClose={closeUpgrade}
      highlightFeature={featureName || undefined}
      message={message || undefined}
    />
  );
}

export default function App() {
  // Poll for maintenance mode so the full-app overlay (covering sidebar +
  // modals) appears the moment the team turns maintenance on.
  useSystemMaintenance();

  return (
    <>
      <OnboardingTrigger />
      <BlockedOverlay />
      <GlobalUpgradeModal />

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route
          path="/forgot-password"
          element={
            <PageTransition className="min-h-dvh">
              <ForgotPasswordPage />
            </PageTransition>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PageTransition className="min-h-dvh">
              <ResetPasswordPage />
            </PageTransition>
          }
        />
        <Route
          path="/google/callback"
          element={
            <PageTransition className="min-h-dvh">
              <GoogleAuthCallbackPage />
            </PageTransition>
          }
        />
        <Route
          path="/privacy"
          element={
            <PageTransition className="min-h-dvh">
              <PrivacyPolicyPage />
            </PageTransition>
          }
        />
        <Route
          path="/terms"
          element={
            <PageTransition className="min-h-dvh">
              <TermsConditionsPage />
            </PageTransition>
          }
        />
        <Route
          path="/animation-test"
          element={
            <PageTransition className="min-h-dvh">
              <AnimationTestPage />
            </PageTransition>
          }
        />
        <Route
          path="/achievements-test"
          element={
            <PageTransition className="min-h-dvh">
              <AchievementsTestPage />
            </PageTransition>
          }
        />

        {/* Protected routes — inside AppLayout */}
        <Route
          element={
            <RequireAuth>
              <AppErrorBoundary>
                <AppLayout />
              </AppErrorBoundary>
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/:id" element={<TaskDetailPage />} />
          <Route path="planner" element={<Navigate to="/calendar" replace />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="focus" element={<FocusPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="goals/:id" element={<GoalDetailPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="coach" element={<AIControlsPage />} />
          <Route path="ai" element={<CoachRedirectPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="plans" element={<PlanPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* ──────────────────────────────────────────────────────────
            Admin Portal — completely isolated from the user app.
            Public:    /admin/login, /admin/verify-otp
            Protected: everything under AdminLayout + AdminGuard
        ────────────────────────────────────────────────────────── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/verify-otp" element={<AdminVerifyOtpPage />} />
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="plans" element={<AdminPlansPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="transactions" element={<AdminTransactionsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="audit-log" element={<AdminAuditLogPage />} />
          <Route path="system" element={<AdminSystemPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={
            <PageTransition className="min-h-dvh">
              <NotFoundPage />
            </PageTransition>
          }
        />
      </Routes>
    </>
  );
}

