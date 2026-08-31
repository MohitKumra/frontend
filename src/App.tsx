import { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary';
import { PageTransition } from './components/layout/PageTransition';
import { LoadingScreen } from './components/ui/Spinner';
import { useAuthStore } from './store/authStore';
import { useOnboarding } from './features/onboarding/hooks/useOnboarding';
import { hasCompletedOnboarding } from './features/onboarding/utils/storage';

// ─── Route-level code splitting ─────────────────────────────────────────────
// Every page is lazily loaded so the initial bundle only ships the app shell.
// Old / low-end devices no longer parse the whole SPA (admin, charts, notes
// book) up front — each chunk loads on demand when its route is first visited.
const lazyRoute = (loader: () => Promise<{ [key: string]: any }>, name: string) =>
  lazy(() => loader().then((mod) => ({ default: mod[name] })));

// Auth pages (public)
const AuthPage = lazyRoute(() => import('./routes/AuthPage'), 'AuthPage');
const ForgotPasswordPage = lazyRoute(() => import('./routes/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyRoute(() => import('./routes/ResetPasswordPage'), 'ResetPasswordPage');
const GoogleAuthCallbackPage = lazyRoute(() => import('./routes/GoogleAuthCallbackPage'), 'GoogleAuthCallbackPage');
const AnimationTestPage = lazyRoute(() => import('./routes/AnimationTestPage'), 'AnimationTestPage');
const AchievementsTestPage = lazyRoute(() => import('./routes/AchievementsTestPage'), 'AchievementsTestPage');
const PrivacyPolicyPage = lazyRoute(() => import('./routes/PrivacyPolicyPage'), 'PrivacyPolicyPage');
const TermsConditionsPage = lazyRoute(() => import('./routes/TermsConditionsPage'), 'TermsConditionsPage');

// Protected pages
const DashboardPage = lazyRoute(() => import('./routes/DashboardPage'), 'DashboardPage');
const TasksPage = lazyRoute(() => import('./routes/TasksPage'), 'TasksPage');
const CalendarPage = lazyRoute(() => import('./routes/CalendarPage'), 'CalendarPage');
const HabitsPage = lazyRoute(() => import('./routes/HabitsPage'), 'HabitsPage');
const NotesPage = lazyRoute(() => import('./routes/NotesPage'), 'NotesPage');
const FocusPage = lazyRoute(() => import('./routes/FocusPage'), 'FocusPage');
const ProjectsPage = lazyRoute(() => import('./routes/ProjectsPage'), 'ProjectsPage');
const GoalsPage = lazyRoute(() => import('./routes/GoalsPage'), 'GoalsPage');
const GoalDetailPage = lazyRoute(() => import('./routes/GoalDetailPage'), 'GoalDetailPage');
const AIControlsPage = lazyRoute(() => import('./routes/AIControlsPage'), 'AIControlsPage');
const SettingsPage = lazyRoute(() => import('./routes/SettingsPage'), 'SettingsPage');
const StoragePage = lazyRoute(() => import('./routes/StoragePage'), 'StoragePage');
const ProfilePage = lazyRoute(() => import('./routes/ProfilePage'), 'ProfilePage');
const PlanPage = lazyRoute(() => import('./routes/PlanPage'), 'PlanPage');
const BillingPage = lazyRoute(() => import('./routes/BillingPage'), 'BillingPage');
const TaskDetailPage = lazyRoute(() => import('./routes/TaskDetailPage'), 'TaskDetailPage');
const ProjectDetailPage = lazyRoute(() => import('./routes/ProjectDetailPage'), 'ProjectDetailPage');
const CustomPlanPayPage = lazyRoute(() => import('./routes/CustomPlanPayPage'), 'CustomPlanPayPage');
const NotFoundPage = lazyRoute(() => import('./routes/NotFoundPage'), 'NotFoundPage');

// Admin portal
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminGuard } from './components/admin/AdminGuard';
const AdminLoginPage = lazyRoute(() => import('./routes/admin/AdminLoginPage'), 'AdminLoginPage');
const AdminVerifyOtpPage = lazyRoute(() => import('./routes/admin/AdminVerifyOtpPage'), 'AdminVerifyOtpPage');
const AdminDashboardPage = lazyRoute(() => import('./routes/admin/AdminDashboardPage'), 'AdminDashboardPage');
const AdminUsersPage = lazyRoute(() => import('./routes/admin/AdminUsersPage'), 'AdminUsersPage');
const AdminUserDetailPage = lazyRoute(() => import('./routes/admin/AdminUserDetailPage'), 'AdminUserDetailPage');
const AdminPlansPage = lazyRoute(() => import('./routes/admin/AdminPlansPage'), 'AdminPlansPage');
const AdminCouponsPage = lazyRoute(() => import('./routes/admin/AdminCouponsPage'), 'AdminCouponsPage');
const AdminSubscriptionsPage = lazyRoute(() => import('./routes/admin/AdminSubscriptionsPage'), 'AdminSubscriptionsPage');
const AdminTransactionsPage = lazyRoute(() => import('./routes/admin/AdminTransactionsPage'), 'AdminTransactionsPage');
const AdminAnalyticsPage = lazyRoute(() => import('./routes/admin/AdminAnalyticsPage'), 'AdminAnalyticsPage');
const AdminAuditLogPage = lazyRoute(() => import('./routes/admin/AdminAuditLogPage'), 'AdminAuditLogPage');
const AdminSystemPage = lazyRoute(() => import('./routes/admin/AdminSystemPage'), 'AdminSystemPage');
const AdminSettingsPage = lazyRoute(() => import('./routes/admin/AdminSettingsPage'), 'AdminSettingsPage');
const AdminInvoiceSettingsPage = lazyRoute(() => import('./routes/admin/AdminInvoiceSettingsPage'), 'AdminInvoiceSettingsPage');
const AdminCustomPlansPage = lazyRoute(() => import('./routes/admin/AdminCustomPlansPage'), 'AdminCustomPlansPage');

// Shared shell bits (kept eager — they are required for every protected page).
import { BlockedOverlay } from './components/BlockedOverlay';
import { UpgradeModal } from './components/billing/UpgradeModal';
import { useUpgradeModalStore } from './store/upgradeModalStore';
import { CustomPlanModal } from './features/customPlan/CustomPlanModal';
import { useCustomPlanModalStore } from './store/customPlanModalStore';
import { useSystemMaintenance } from './hooks/useSystemMaintenance';


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

/** Renders the globally-triggered Custom Plan guided flow. */
function GlobalCustomPlanModal() {
  const isOpen = useCustomPlanModalStore((s) => s.isOpen);
  if (!isOpen) return null;
  return <CustomPlanModal />;
}

export default function App() {
  const { pathname } = useLocation();
  // Poll for maintenance mode so the full-app overlay (covering sidebar +
  // modals) appears the moment the team turns maintenance on. The admin portal is
  // an isolated console (its overlay is intentionally hidden) and must not trigger
  // user-app API calls that could bounce it to /login — so the poll is disabled there.
  useSystemMaintenance({ enabled: !pathname.startsWith('/admin') });

  return (
    <>
      <OnboardingTrigger />
      <BlockedOverlay />
      <GlobalUpgradeModal />
      <GlobalCustomPlanModal />

      {/* Lazy route chunks are fetched on demand. Suspense shows a lightweight
          loading state while the first visit to each route downloads + parses
          its code — keeping old devices responsive on navigation. */}
      <Suspense fallback={<LoadingScreen />}>
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
          <Route path="billing" element={<BillingPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="custom-plan/:token" element={<CustomPlanPayPage />} />
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
          <Route path="custom-plans" element={<AdminCustomPlansPage />} />
          <Route path="coupons" element={<AdminCouponsPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="transactions" element={<AdminTransactionsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="audit-log" element={<AdminAuditLogPage />} />
          <Route path="system" element={<AdminSystemPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="billing/invoice-settings" element={<AdminInvoiceSettingsPage />} />
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
      </Suspense>
    </>
  );
}
