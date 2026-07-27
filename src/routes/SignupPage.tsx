import { AuthFrame } from '../features/auth/components/AuthFrame';
import { SignupForm } from '../features/auth/components/SignupForm';

export function SignupPage() {
  return (
    <AuthFrame
      mode="signup"
      title="Create your account"
      subtitle="It only takes a minute. No credit card, ever."
    >
      <SignupForm />
    </AuthFrame>
  );
}
