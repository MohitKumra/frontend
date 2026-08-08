import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { SettingsPage } from './routes/SettingsPage';
import { ProfilePage } from './routes/ProfilePage';
import { TaskDetailPage } from './routes/TaskDetailPage';
import { ProjectDetailPage } from './routes/ProjectDetailPage';
import { NotFoundPage } from './routes/NotFoundPage';

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

export default function App() {
  return (
    <>
      <OnboardingTrigger />

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
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
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
