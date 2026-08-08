import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useResetPassword } from '../features/auth/hooks/useAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') ?? '', [params]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const reset = useResetPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return;
    }
    reset.mutate({ token, password });
  };

  return (
    <div
      className="min-h-dvh flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(circle at top right, var(--color-accent-subtle), var(--color-bg))' }}
    >
      <div className="w-full max-w-sm animate-scale-in">
        <div className="flex flex-col items-center mb-8 select-none">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-accent/15"
            style={{ background: 'var(--gradient-accent)' }}
          >
            <KeyRound size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">Choose a new password</h1>
          <p className="text-sm text-text-muted mt-1.5 font-medium">This reset link is valid for one hour</p>
        </div>

        <Card variant="glass" className="p-6 sm:p-8 shadow-xl">
          {!token ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-text-primary">Missing reset token</p>
              <p className="text-xs text-text-muted mt-2">Please use the link from your email again.</p>
              <Link to="/forgot-password" className="mt-6 inline-flex">
                <Button variant="secondary" size="sm" leftIcon={<ArrowLeft size={14} />}>
                  Back to reset request
                </Button>
              </Link>
            </div>
          ) : reset.isSuccess ? (
            <div className="text-center py-6">
              <KeyRound size={40} className="mx-auto mb-3 text-accent" />
              <p className="text-text-primary font-bold">Password updated</p>
              <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                Your password is ready to use. You can sign in again now.
              </p>
              <Link to="/login" className="mt-6 inline-block">
                <Button variant="secondary" size="sm">
                  Back to login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {reset.error && (
                <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-sm text-danger">
                  {(reset.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error
                    ?.message ?? 'Reset failed. Please try again.'}
                </div>
              )}

              <Input
                id="reset-password"
                label="New password"
                type={showPass ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="tap-target flex items-center"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                minLength={8}
                required
              />

              <Input
                id="confirm-password"
                label="Confirm password"
                type={showPass ? 'text' : 'password'}
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock size={16} />}
                minLength={8}
                required
              />

              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs font-semibold text-danger">Passwords do not match.</p>
              )}

              <Button type="submit" fullWidth loading={reset.isPending} className="mt-2">
                Update Password
              </Button>

              <Link to="/login" className="text-center text-xs font-bold text-text-muted hover:text-text-primary mt-2">
                Back to login
              </Link>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
