// frontend/src/routes/admin/AdminPlansPage.tsx
// Admin: Plans & Feature Tiers management.
// Matches the screenshot: clean table with pill-style action buttons,
// modal-based create/edit flow, monospace slug & version columns.

import React, { useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  CheckCircle,
  AlertCircle,
  X,
  Tag,
  Sparkles,
  CircleDot,
} from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatINR } from '../../utils/formatCurrency';

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  currency: string;
  priceCents: number;
  billingInterval: 'MONTH' | 'YEAR' | 'ONE_TIME';
  isActive: boolean;
  features: Record<string, any>;
  version: number;
}

const EMPTY_FORM = {
  slug: '',
  name: '',
  description: '',
  pricePaise: '49900',
  billingInterval: 'MONTH' as 'MONTH' | 'YEAR' | 'ONE_TIME',
  featuresJson: '{\n  "aiRequestsPerMonth": 1000,\n  "projects": 10,\n  "habits": 20,\n  "tasks": 500,\n  "storageMb": 1000\n}',
};

export function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirming, setConfirming] = useState<Plan | null>(null);

  async function fetchPlans() {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/plans?includeInactive=true');
      setPlans(res.data.data || []);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to load plans' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  function handleOpenCreate() {
    setEditingPlan(null);
    setFormData({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function handleOpenEdit(p: Plan) {
    setEditingPlan(p);
    setFormData({
      slug: p.slug,
      name: p.name,
      description: p.description || '',
      pricePaise: p.priceCents.toString(),
      billingInterval: p.billingInterval,
      featuresJson: JSON.stringify(p.features, null, 2),
    });
    setShowModal(true);
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    let parsedFeatures: Record<string, any> = {};
    try {
      parsedFeatures = JSON.parse(formData.featuresJson);
    } catch {
      setMessage({ type: 'error', text: 'Features JSON is malformed.' });
      setSaving(false);
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        priceCents: parseInt(formData.pricePaise, 10),
        currency: 'INR',
        billingInterval: formData.billingInterval,
        features: parsedFeatures,
      };

      if (editingPlan) {
        await adminApiClient.put(`/plans/${editingPlan.id}`, payload);
        setMessage({ type: 'success', text: `Plan "${formData.name}" updated successfully` });
      } else {
        await adminApiClient.post('/plans', {
          ...payload,
          slug: formData.slug.toLowerCase().trim(),
        });
        setMessage({ type: 'success', text: `Plan "${formData.name}" created successfully` });
      }

      setShowModal(false);
      fetchPlans();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to save plan' });
    } finally {
      setSaving(false);
    }
  }

  async function togglePlanActive(plan: Plan) {
    try {
      await adminApiClient.put(`/plans/${plan.id}`, { isActive: !plan.isActive });
      setMessage({
        type: 'success',
        text: `Plan "${plan.name}" ${plan.isActive ? 'deactivated' : 'activated'}`,
      });
      fetchPlans();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error?.message || 'Failed to update plan status' });
    } finally {
      setConfirming(null);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            Plans &amp; Feature Tiers
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Configure subscription tiers, INR pricing, and JSON entitlement feature gates
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleOpenCreate}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Plan
        </Button>
      </div>

      {/* ─── Toast-style message ──────────────────────────────── */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-sm flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-success/10 border border-success/20 text-success'
              : 'bg-danger/10 border border-danger/20 text-danger'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ─── Plans Table Card ───────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/80 text-text-muted text-[10px] font-bold uppercase tracking-[0.08em]">
                <th className="px-5 py-4">Plan Name</th>
                <th className="px-5 py-4">Slug</th>
                <th className="px-5 py-4">Price (INR)</th>
                <th className="px-5 py-4">Interval</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Version</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-muted">
                    <Spinner size="md" className="mx-auto mb-2" />
                    Loading subscription plans...
                  </td>
                </tr>
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center text-text-muted text-sm">
                    No plans found. Create your first plan to get started.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-surface-raised/40 transition-colors"
                  >
                    {/* Plan Name */}
                    <td className="px-5 py-4">
                      <span className="font-bold text-text-primary">{p.name}</span>
                    </td>

                    {/* Slug */}
                    <td className="px-5 py-4">
                      <code className="font-mono text-[11px] text-text-muted bg-surface-raised px-2 py-0.5 rounded-md">
                        {p.slug}
                      </code>
                    </td>

                    {/* Price */}
                    <td className="px-5 py-4 font-bold text-accent">
                      {formatINR(p.priceCents)}
                    </td>

                    {/* Interval */}
                    <td className="px-5 py-4 text-text-secondary">
                      {p.billingInterval === 'ONE_TIME'
                        ? 'One-time'
                        : p.billingInterval === 'YEAR'
                        ? 'Year'
                        : 'Month'}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <Badge
                        variant={p.isActive ? 'success' : 'default'}
                        size="sm"
                        dot
                        className="font-semibold"
                      >
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>

                    {/* Version */}
                    <td className="px-5 py-4">
                      <code className="font-mono text-[11px] text-text-muted">
                        v{p.version}
                      </code>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-full px-3.5"
                          onClick={() => handleOpenEdit(p)}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full px-3.5"
                          onClick={() => setConfirming(p)}
                        >
                          {p.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Create / Edit Modal ──────────────────────────────── */}
      {showModal && (
        <PlanFormModal
          editingPlan={editingPlan}
          formData={formData}
          setFormData={setFormData}
          saving={saving}
          onClose={() => setShowModal(false)}
          onSubmit={handleSavePlan}
        />
      )}

      {/* ─── Confirm Activate/Deactivate ──────────────────────── */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirming.isActive
                    ? 'bg-warning/10 text-warning border border-warning/20'
                    : 'bg-success/10 text-success border border-success/20'
                }`}
              >
                <CircleDot className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary">
                  {confirming.isActive ? 'Deactivate' : 'Activate'} "{confirming.name}"?
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  {confirming.isActive
                    ? 'Existing subscribers will keep their plan, but new users will not see or be able to purchase it.'
                    : 'Re-enabling the plan will make it visible and purchasable again.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="secondary" size="sm" onClick={() => setConfirming(null)}>
                Cancel
              </Button>
              <Button
                variant={confirming.isActive ? 'danger' : 'primary'}
                size="sm"
                onClick={() => togglePlanActive(confirming)}
              >
                {confirming.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

interface PlanFormModalProps {
  editingPlan: Plan | null;
  formData: typeof EMPTY_FORM;
  setFormData: React.Dispatch<React.SetStateAction<typeof EMPTY_FORM>>;
  saving: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function PlanFormModal({
  editingPlan,
  formData,
  setFormData,
  saving,
  onClose,
  onSubmit,
}: PlanFormModalProps) {
  const pricePreview = (() => {
    const cents = parseInt(formData.pricePaise || '0', 10);
    return isNaN(cents) ? '₹0' : formatINR(cents);
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle border border-accent-border flex items-center justify-center text-accent">
              {editingPlan ? <Pencil className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-text-primary">
                {editingPlan ? `Edit Plan: ${editingPlan.name}` : 'Create New Subscription Plan'}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Set the price, billing interval, and JSON entitlement feature gates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-raised"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Slug */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Plan Slug
              </label>
              <input
                type="text"
                placeholder="e.g. pro-monthly"
                value={formData.slug}
                disabled={!!editingPlan}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-xl text-sm text-text-primary font-mono disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-focus"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Unique identifier (lowercase, no spaces).
              </p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                placeholder="e.g. Pro Suite"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Price (Paise)
              </label>
              <input
                type="number"
                placeholder="49900 = ₹499"
                value={formData.pricePaise}
                onChange={(e) => setFormData({ ...formData, pricePaise: e.target.value })}
                required
                min={0}
                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-xl text-sm text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-focus"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Preview: <span className="font-bold text-accent">{pricePreview}</span>
              </p>
            </div>

            {/* Billing Interval */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Billing Interval
              </label>
              <select
                value={formData.billingInterval}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    billingInterval: e.target.value as 'MONTH' | 'YEAR' | 'ONE_TIME',
                  })
                }
                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
              >
                <option value="MONTH">Monthly</option>
                <option value="YEAR">Yearly</option>
                <option value="ONE_TIME">One-time</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Description
            </label>
            <input
              type="text"
              placeholder="Short summary of this plan"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
            />
          </div>

          {/* Features JSON */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary mb-1.5">
              <Tag className="w-3.5 h-3.5" />
              Features JSON
            </label>
            <textarea
              rows={6}
              value={formData.featuresJson}
              onChange={(e) => setFormData({ ...formData, featuresJson: e.target.value })}
              className="w-full font-mono text-xs p-3 bg-surface-raised border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
              spellCheck={false}
            />
            <p className="text-[11px] text-text-muted mt-1">
              These values are exposed to the frontend entitlement system. Common keys:
              <code className="mx-1 font-mono">aiRequestsPerMonth</code>·<code className="mx-1 font-mono">projects</code>·<code className="mx-1 font-mono">habits</code>·<code className="mx-1 font-mono">tasks</code>·<code className="mx-1 font-mono">storageMb</code>
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              leftIcon={!saving && <Plus className="w-4 h-4" />}
            >
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
