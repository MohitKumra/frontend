import { useLocation } from 'react-router-dom';
import { AuthFrame } from '../features/auth/components/AuthFrame';
import { LoginForm } from '../features/auth/components/LoginForm';
import { SignupForm } from '../features/auth/components/SignupForm';

export function AuthPage() {
  const location = useLocation();
  const isSignup = location.pathname === '/signup';

  return (
    <AuthFrame
      mode={isSignup ? 'signup' : 'login'}
      title={isSignup ? 'Create your account' : 'Welcome back'}
      subtitle={
        isSignup ? 'It only takes a minute. No credit card, ever.' : 'Sign in to continue your productivity workspace.'
      }
    >
      {isSignup ? <SignupForm /> : <LoginForm />}
    </AuthFrame>
  );
}
