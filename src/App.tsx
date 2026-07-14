import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AppErrorBoundary } from './components/layout/AppErrorBoundary';
import { useAuthStore } from './store/authStore';

// Auth pages (public)
import { LoginPage }          from './routes/LoginPage';
import { SignupPage }         from './routes/SignupPage';
import { ForgotPasswordPage } from './routes/ForgotPasswordPage';
import { ResetPasswordPage }  from './routes/ResetPasswordPage';
import { GoogleAuthCallbackPage } from './routes/GoogleAuthCallbackPage';

// Protected pages
import { DashboardPage }  from './routes/DashboardPage';
import { TasksPage }      from './routes/TasksPage';
import { PlannerPage }    from './routes/PlannerPage';
import { CalendarPage }   from './routes/CalendarPage';
import { HabitsPage }     from './routes/HabitsPage';
import { NotesPage }      from './routes/NotesPage';
import { FocusPage }      from './routes/FocusPage';
import { AnalyticsPage }  from './routes/AnalyticsPage';
import { ProjectsPage }   from './routes/ProjectsPage';
import { SettingsPage }   from './routes/SettingsPage';
import { TaskDetailPage } from './routes/TaskDetailPage';
import { ProjectDetailPage } from './routes/ProjectDetailPage';
import { NotFoundPage } from './routes/NotFoundPage';

/** Redirects unauthenticated users to /login. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/signup"          element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />
      <Route path="/google/callback" element={<GoogleAuthCallbackPage />} />

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
        <Route index               element={<DashboardPage />} />
        <Route path="tasks"        element={<TasksPage />} />
        <Route path="tasks/:id"    element={<TaskDetailPage />} />
        <Route path="planner"      element={<PlannerPage />} />
        <Route path="calendar"     element={<CalendarPage />} />
        <Route path="habits"       element={<HabitsPage />} />
        <Route path="notes"        element={<NotesPage />} />
        <Route path="focus"        element={<FocusPage />} />
        <Route path="analytics"    element={<AnalyticsPage />} />
        <Route path="projects"     element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectDetailPage />} />
        <Route path="settings"     element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
