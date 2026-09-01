// frontend/src/routes/admin/AdminCouponsPage.tsx
import React, { useEffect, useState } from 'react';
import { Tag, Plus, CheckCircle, AlertCircle, Check, X } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { APP_NAME } from '../../config/brand';
import { formatINR } from '../../utils/formatCurrency';

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  currency: string;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  isActive: boolean;
  expiresAt: string | null;
}

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [value, setValue] = useState(20);
  const [maxUses, setMaxUses] = useState<string>('100');
  const [perUserLimit, setPerUserLimit] = useState<string>('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchCoupons() {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/coupons');
      setCoupons(res.data.items || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to load coupons' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await adminApiClient.post('/coupons', {
        code: code.toUpperCase().trim(),
        description,
        type,
        value: Number(value),
        currency: 'INR',
        maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
        perUserLimit: perUserLimit ? parseInt(perUserLimit, 10) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        appliesToAllPlans: true,
      });
      setMessage({ type: 'success', text: `Coupon "${code.toUpperCase()}" created successfully` });
      setShowCreate(false);
      setCode('');
      setDescription('');
      fetchCoupons();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to create coupon' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(coupon: Coupon) {
    try {
      await adminApiClient.put(`/coupons/${coupon.id}`, {
        isActive: !coupon.isActive,
      });
      fetchCoupons();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to update coupon status' });
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Coupons & Discounts</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Manage promotional codes, percentage discounts, and redemption limits
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          {showCreate ? 'Close Form' : 'Create Coupon'}
        </Button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-success/10 border border-success/20 text-success'
              : 'bg-danger/10 border border-danger/20 text-danger'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ─── Create Form Card ─────────────────────────────────────── */}
      {showCreate && (
        <Card variant="elevated" className="p-6">
          <h2 className="text-base font-bold text-text-primary mb-4">Create New Promotional Coupon</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Coupon Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={`e.g. ${APP_NAME.toUpperCase()}50`}
                  required
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="50% Launch discount"
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Discount Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED_AMOUNT">Fixed INR Amount (Paise)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">
                  Discount Value {type === 'PERCENTAGE' ? '(%)' : '(Paise: 10000 = ₹100)'}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(parseInt(e.target.value, 10))}
                  min={1}
                  max={type === 'PERCENTAGE' ? 100 : undefined}
                  required
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Total Max Uses</label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Leave empty for unlimited"
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1">Per-User Limit</label>
                <input
                  type="number"
                  value={perUserLimit}
                  onChange={(e) => setPerUserLimit(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving}>
                Create Coupon
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ─── Coupons Table Card ───────────────────────────────────── */}
      <Card variant="default" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised/60 text-text-secondary text-xs font-bold uppercase tracking-wider">
                <th className="px-5 py-3.5">Code</th>
                <th className="px-5 py-3.5">Discount</th>
                <th className="px-5 py-3.5">Usage</th>
                <th className="px-5 py-3.5">Per User</th>
                <th className="px-5 py-3.5">Expires</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-muted">
                    <Spinner size="md" className="mx-auto mb-2" />
                    Loading promotional coupons...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-muted">
                    No active coupons found
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-raised/50 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-accent bg-accent-subtle px-2.5 py-1 rounded-lg border border-accent-border">
                        {c.code}
                      </span>
                      {c.description && <p className="text-xs text-text-muted mt-1">{c.description}</p>}
                    </td>
                    <td className="px-5 py-4 font-bold text-text-primary">
                      {c.type === 'PERCENTAGE' ? `${c.value}% OFF` : `${formatINR(c.value)} OFF`}
                    </td>
                    <td className="px-5 py-4 text-text-secondary">
                      {c.usedCount} / {c.maxUses ?? '∞'}
                    </td>
                    <td className="px-5 py-4 text-text-muted text-xs">{c.perUserLimit ?? 'Unlimited'}</td>
                    <td className="px-5 py-4 text-text-muted text-xs">
                      {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={c.isActive ? 'success' : 'default'} size="sm" dot>
                        {c.isActive ? 'Active' : 'Disabled'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant={c.isActive ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => toggleStatus(c)}
                      >
                        {c.isActive ? 'Disable' : 'Enable'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}