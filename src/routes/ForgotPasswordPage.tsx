import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ShieldQuestion, HelpCircle } from 'lucide-react';
import { useForgotPassword, useForgotPasswordByRecoveryEmail } from '../features/auth/hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

type Tab = 'forgot-password' | 'forgot-email';

/** Extract the error message from an API error response. */
function getErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } } | undefined;
  return e?.response?.data?.error?.message ?? 'Something went wrong. Please try again.';
}

export function ForgotPasswordPage() {
  const [tab, setTab] = useState<Tab>('forgot-password');
  const [email, setEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const forgotPassword = useForgotPassword();
  const forgotByRecovery = useForgotPasswordByRecoveryEmail();

  const isSuccess = forgotPassword.isSuccess || forgotByRecovery.isSuccess;

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-6"
      style={{
        background: 'radial-gradient(circle at top right, var(--color-accent-subtle), var(--color-bg))',
      }}
    >
      <div className="w-full max-w-sm animate-scale-in">
        <div className="flex flex-col items-center mb-8 select-none">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-accent/15"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <img src="/logo.svg" alt="Account recovery" className="w-full h-full object-cover rounded-2xl" />
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Account recovery</h1>
          <p className="text-sm text-text-muted mt-1.5 font-medium">Choose how to recover</p>
        </div>

        {/* Tab toggle */}
        <div className="flex mb-6 bg-bg-tertiary/60 rounded-xl p-1">
          <button
            type="button"
            onClick={() => {
              setTab('forgot-password');
              setEmail('');
              setRecoveryEmail('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
              tab === 'forgot-password'
                ? 'bg-card-bg shadow-sm text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Mail size={15} />
            Forgot password
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('forgot-email');
              setEmail('');
              setRecoveryEmail('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
              tab === 'forgot-email'
                ? 'bg-card-bg shadow-sm text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <HelpCircle size={15} />
            Forgot email
          </button>
        </div>

        <Card variant="glass" className="p-6 sm:p-8 shadow-xl">
          {isSuccess ? (
            <div className="text-center py-4">
              <Mail size={40} className="mx-auto mb-3 text-accent" />
              <p className="text-text-primary font-bold">Check your inbox</p>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                {tab === 'forgot-password'
                  ? 'A password reset link has been sent to that email address.'
                  : 'A recovery link has been sent with your account details.'}
              </p>
              <Link to="/login" className="mt-6 inline-block">
                <Button variant="secondary" size="sm">
                  Back to login
                </Button>
              </Link>
            </div>
          ) : tab === 'forgot-password' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                forgotPassword.mutate(email);
              }}
              className="flex flex-col gap-4"
            >
              <p className="text-xs text-text-muted font-medium text-center mb-1">
                Enter your email to receive a password reset link
              </p>
              <Input
                id="forgot-email"
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail size={16} />}
                required
              />
              {forgotPassword.error && (
                <p className="text-xs font-semibold text-danger text-center">
                  {(forgotPassword.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data
                    ?.error?.message ?? 'No account found with that email address'}
                </p>
              )}
              <Button type="submit" fullWidth loading={forgotPassword.isPending} className="mt-2">
                Send Reset Link
              </Button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                forgotByRecovery.mutate(recoveryEmail);
              }}
              className="flex flex-col gap-4"
            >
              <p className="text-xs text-text-muted font-medium text-center mb-1">
                Enter your recovery email — we'll remind you which account is linked to it
              </p>
              <Input
                id="recovery-email"
                label="Recovery email"
                type="email"
                placeholder="recovery@example.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                leftIcon={<ShieldQuestion size={16} />}
                required
              />
              {forgotByRecovery.error && (
                <p className="text-xs font-semibold text-danger text-center">
                  {(forgotByRecovery.error as { response?: { data?: { error?: { message?: string } } } })?.response
                    ?.data?.error?.message ?? 'No account found with that recovery email'}
                </p>
              )}
              <Button type="submit" fullWidth loading={forgotByRecovery.isPending} className="mt-2">
                Send Recovery Link
              </Button>
              <p className="text-xs text-text-muted text-center mt-1">
                The recovery email sends a reset link and reminds you of your account email.
              </p>
            </form>
          )}

          <Link
            to="/login"
            className="text-center text-xs font-bold text-text-muted hover:text-text-primary mt-4 block"
          >
            ← Back to login
          </Link>
        </Card>
      </div>
    </div>
  );
}
