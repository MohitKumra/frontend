// frontend/src/routes/admin/AdminLoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle, Shield } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { useAdminStore } from '../../store/adminStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ADMIN_EMAIL } from '../../config/brand';

export function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const setOtpEmail = useAdminStore((s) => s.setOtpEmail);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide your admin email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminApiClient.post('/auth/send-otp', { email, password });
      setOtpEmail(email);
      navigate('/admin/verify-otp');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="max-w-md w-full">
        <Card variant="elevated" className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-subtle text-accent mb-4 border border-accent-border shadow-md shadow-accent/10">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Admin Portal</h1>
            <p className="text-sm text-text-muted mt-1">Sign in to the administrative control panel</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Admin Email"
              type="email"
              placeholder={ADMIN_EMAIL}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Admin Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Verification OTP
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}