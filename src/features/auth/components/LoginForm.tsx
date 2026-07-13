import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Chrome } from 'lucide-react';
import { useLogin } from '../hooks/useAuth';
import { authApi } from '../api';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const login = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  const handleGoogleSignIn = async () => {
    const { url } = await authApi.googleStart('signin', '/google/callback');
    window.location.href = url;
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {login.error && (
        <div className="p-3 rounded-md bg-danger/10 border border-danger/20 text-sm text-danger">
          {(login.error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? 'Login failed. Please try again.'}
        </div>
      )}

      <Input
        id="login-email"
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
        id="login-password"
        label="Password"
        type={showPass ? 'text' : 'password'}
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        leftIcon={<Lock size={16} />}
        rightIcon={
          <button type="button" onClick={() => setShowPass((v) => !v)} className="tap-target flex items-center" tabIndex={-1}>
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
        required
        autoComplete="current-password"
      />

      <div className="flex justify-end">
        <Link to="/forgot-password" className="text-sm text-accent hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="submit" fullWidth loading={login.isPending}>
        Sign In
      </Button>

      <div className="relative py-1">
        <div className="h-px bg-border" />
        <span className="absolute inset-x-0 -top-2 text-center text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Or continue with
        </span>
      </div>

      <Button
        type="button"
        variant="secondary"
        fullWidth
        leftIcon={<Chrome size={15} />}
        onClick={handleGoogleSignIn}
      >
        Google
      </Button>

      <p className="text-center text-sm text-text-muted">
        Don't have an account?{' '}
        <Link to="/signup" className="text-accent hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </form>
  );
}
