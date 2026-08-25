// frontend/src/routes/admin/AdminSettingsPage.tsx
import React, { useEffect, useState } from 'react';
import { Settings, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';

export function AdminSettingsPage() {
  const [appName, setAppName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('INR');
  const [defaultTimezone, setDefaultTimezone] = useState('Asia/Kolkata');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/settings');
      const data = res.data.data;
      setAppName(data.appName || 'Finamite PMS');
      setSupportEmail(data.supportEmail || 'support@finamite.com');
      setDefaultCurrency(data.defaultCurrency || 'INR');
      setDefaultTimezone(data.defaultTimezone || 'Asia/Kolkata');
      setMaintenanceMode(data.maintenanceMode || false);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    setError(null);
    try {
      await adminApiClient.put('/settings', {
        appName,
        supportEmail,
        defaultCurrency,
        defaultTimezone,
        maintenanceMode,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-text-muted">
        <Spinner size="lg" />
        <p className="text-sm mt-3 font-medium">Loading platform configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">System & Display Settings</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Configure application-wide business metadata, regional parameters, and emergency maintenance mode
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2.5">
          <CheckCircle className="w-5 h-5" />
          <span>Platform settings updated and persisted successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <Card variant="default">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            <CardTitle>Global Platform Metadata</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Application Name"
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                required
              />

              <Input
                label="Support Contact Email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                required
              />

              <Input
                label="Default Platform Currency"
                type="text"
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                required
              />

              <Input
                label="System Timezone"
                type="text"
                value={defaultTimezone}
                onChange={(e) => setDefaultTimezone(e.target.value)}
                required
              />
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">Maintenance Mode</p>
                <p className="text-xs text-text-muted mt-0.5">
                  When active, non-admin API requests will immediately return 503 Service Unavailable
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-raised peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent border border-border"></div>
              </label>
            </div>

            <div className="flex justify-end pt-3">
              <Button type="submit" variant="primary" loading={saving} leftIcon={<Save className="w-4 h-4" />}>
                Save Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}