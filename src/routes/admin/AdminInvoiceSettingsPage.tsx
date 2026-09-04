// frontend/src/routes/admin/AdminInvoiceSettingsPage.tsx
// Admin → Billing → Invoice Settings. Admins configure the billing document
// identity used on generated invoices: SAC, support contact, notes, place of
// supply, currency and invoice prefix. Values persist in the DB (SystemSetting)
// and apply to newly-created invoices (historical ones keep their own snapshot).
import React, { useEffect, useState } from 'react';
import { Receipt, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { adminApiClient } from '../../lib/adminApiClient';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { BILLING_EMAIL, DEFAULT_CURRENCY, INVOICE_NOTES, COMPANY_LEGAL_NAME } from '../../config/brand';

export function AdminInvoiceSettingsPage() {
  const [sac, setSac] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [cityState, setCityState] = useState('');
  const [pincode, setPincode] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchSettings() {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/billing/invoice-settings');
      const data = res.data.data || {};
      setSac(data.sac || '');
      setSupportEmail(data.supportEmail || '');
      setNotes(data.notes || '');
      setPlaceOfSupply(data.placeOfSupply || '');
      setCurrency(data.currency || DEFAULT_CURRENCY);
      setInvoicePrefix(data.invoicePrefix || 'INV');
      setCompanyName(data.companyName || '');
      setGstin(data.gstin || '');
      setAddressLine1(data.addressLine1 || '');
      setAddressLine2(data.addressLine2 || '');
      setCityState(data.cityState || '');
      setPincode(data.pincode || '');
      setWebsite(data.website || '');
    } catch (err) {
      console.error('Failed to fetch invoice settings', err);
      setError('Failed to load invoice settings. Make sure you have billing.read permission.');
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
      await adminApiClient.put('/billing/invoice-settings', {
        sac: sac.trim(),
        supportEmail: supportEmail.trim(),
        notes: notes.trim(),
        placeOfSupply: placeOfSupply.trim(),
        currency: currency.trim().toUpperCase(),
        invoicePrefix: invoicePrefix.trim(),
        companyName: companyName.trim(),
        gstin: gstin.trim().toUpperCase(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        cityState: cityState.trim(),
        pincode: pincode.trim(),
        website: website.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update invoice settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-text-muted">
        <Spinner size="lg" />
        <p className="text-sm mt-3 font-medium">Loading invoice settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">Invoice Settings</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Configure the billing identity shown on generated invoice PDFs and email receipts.
            Changes apply to new invoices only — existing receipts keep their saved values.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2.5">
          <CheckCircle className="w-5 h-5" />
          <span>Invoice settings updated and persisted successfully.</span>
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
            <Receipt className="w-5 h-5 text-accent" />
            <CardTitle>Billing Document Identity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Service Accounting Code (SAC)"
                type="text"
                value={sac}
                onChange={(e) => setSac(e.target.value)}
                placeholder="e.g. 998314"
              />
              <Input
                label="Support / Contact Email"
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder={BILLING_EMAIL}
              />
              <Input
                label="Place of Supply"
                type="text"
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                placeholder="Punjab (03)"
              />
              <Input
                label="Invoice Currency"
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder={DEFAULT_CURRENCY}
              />
              <Input
                label="Invoice Number Prefix"
                type="text"
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value)}
                placeholder="INV"
              />
            </div>

            {/* Supplier / Company identity shown on the invoice */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-bold text-text-primary mb-1">Company / Supplier Identity</p>
              <p className="text-xs text-text-muted mb-4">
                Shown in the "Supplier" block and footer of each invoice. Leave blank to fall back to the
                environment defaults.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Company Name"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={COMPANY_LEGAL_NAME}
                />
                <Input
                  label="GSTIN"
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="03AAAAA0000A1Z5"
                />
                <Input
                  label="Address Line 1"
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="3614, Sector 32-A, Chandigarh Road, Urban Estate"
                />
                <Input
                  label="Address Line 2"
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Jamalpur, Ludhiana"
                />
                <Input
                  label="City, State"
                  type="text"
                  value={cityState}
                  onChange={(e) => setCityState(e.target.value)}
                  placeholder="Punjab"
                />
                <Input
                  label="PIN Code"
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="141010"
                />
                <Input
                  label="Website Name / Domain"
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="finamite.in"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Notes / Footer text (shown on each invoice)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={INVOICE_NOTES}
                className="w-full px-3.5 py-2.5 bg-surface-raised border border-border rounded-xl text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-focus"
              />
            </div>

            <div className="flex justify-end pt-3">
              <Button type="submit" variant="primary" loading={saving} leftIcon={<Save className="w-4 h-4" />}>
                Save Invoice Settings
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

