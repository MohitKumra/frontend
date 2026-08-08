import { AuthFrame } from '../features/auth/components/AuthFrame';
import { LoginForm } from '../features/auth/components/LoginForm';

export function LoginPage() {
  return (
    <AuthFrame mode="login" title="Welcome back" subtitle="Sign in to continue your productivity workspace.">
      <LoginForm />
    </AuthFrame>
  );
}
