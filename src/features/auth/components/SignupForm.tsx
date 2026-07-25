import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSignup } from '../hooks/useAuth';
import { authApi } from '../api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function SignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const signup = useSignup();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      toast.error('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }
    signup.mutate({ email, password, name: name || undefined });
  };

  const handleGoogleSignUp = async () => {
    try {
      const { url } = await authApi.googleStart('signin', '/google/callback');
      window.location.href = url;
    } catch (err) {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Google sign-up is not available right now.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {signup.error && (
        <div className="p-2.5 rounded-md bg-danger/10 border border-danger/20 text-sm text-danger">
          {(signup.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Signup failed. Please try again.'}
        </div>
      )}

      <Input
        id="signup-name"
        label="Name (optional)"
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        leftIcon={<User size={16} />}
        autoComplete="name"
      />

      <Input
        id="signup-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        leftIcon={<Mail size={16} />}
        required
        autoComplete="email"
      />

      <Input
        id="signup-password"
        label="Password"
        type={showPass ? 'text' : 'password'}
        placeholder="Min. 8 characters"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        leftIcon={<Lock size={16} />}
        rightIcon={
          <button type="button" onClick={() => setShowPass((v) => !v)} className="tap-target flex items-center" tabIndex={-1}>
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        required
        minLength={8}
        autoComplete="new-password"
      />

      {/* Terms agreement checkbox */}
      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded-md border-border text-accent focus:ring-2 focus:ring-accent/40 cursor-pointer accent-[var(--color-accent)]"
        />
        <span className="text-[11px] text-text-muted leading-snug">
          I agree to the{' '}
          <Link to="/terms" className="text-accent hover:underline font-medium">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-accent hover:underline font-medium">
            Privacy Policy
          </Link>
          .
        </span>
      </label>

      <Button type="submit" fullWidth loading={signup.isPending}>
        Create Account
      </Button>

      <div className="relative py-0.5">
        <div className="h-px bg-border" />
        <span className="absolute inset-x-0 -top-2 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Or continue with
        </span>
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        leftIcon={<Globe size={15} />}
        onClick={() => {
          if (!agreeTerms) {
            toast.error('Please accept the Terms and Privacy Policy first.');
            return;
          }
          handleGoogleSignUp();
        }}
      >
        Continue with Google
      </Button>

      <p className="text-center text-xs text-text-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </form>
  );
}