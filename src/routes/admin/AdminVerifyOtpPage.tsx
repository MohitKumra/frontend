// frontend/src/routes/admin/AdminVerifyOtpPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { useAdminStore } from '../../store/adminStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export function AdminVerifyOtpPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { otpEmail, setSession } = useAdminStore();

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!otpEmail) {
      navigate('/admin/login');
      return;
    }
    if (code.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await adminApiClient.post('/auth/verify-otp', {
        email: otpEmail,
        code,
      });

      setSession(data.data.admin, data.data.accessToken);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed. Invalid or expired OTP.');
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
              <img src="/logo.svg" alt="Verification" className="w-full h-full object-cover rounded-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Enter Verification OTP</h1>
            <p className="text-sm text-text-muted mt-1">
              Code was dispatched to{' '}
              <span className="text-accent font-semibold">{otpEmail || 'your email'}</span>
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider text-center mb-2">
                6-Digit Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                required
                className="w-full text-center tracking-[0.5em] text-3xl font-mono px-4 py-3.5 bg-surface border border-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-focus focus:border-accent shadow-sm"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Verify & Enter Dashboard
            </Button>
          </form>

          <div className="text-center mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to admin login</span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}