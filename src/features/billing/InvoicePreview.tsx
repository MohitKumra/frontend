// frontend/src/features/billing/InvoicePreview.tsx
// React preview of the subscription invoice. It reproduces the exact markup,
// layout and CSS produced by the backend buildInvoiceHtml (billingDocuments.service.ts)
// so the on-screen "Invoice preview" matches the downloaded PDF byte-for-byte.
import React from 'react';
import { formatINR } from '../../utils/formatCurrency';

export interface InvoicePreviewCompany {
  name: string;
  gstin: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLines: string[];
  placeOfSupply: string | null;
  sac?: string | null;
  notes?: string;
}

export interface InvoicePreviewData {
  company: InvoicePreviewCompany;
  customerName: string;
  customerLines: string[];
  customerShipLines: string[];
  invoice: {
    invoiceNumber: string;
    status: string;
    currency: string;
    subtotalCents: number;
    discountCents: number;
    taxCents: number;
    cgstCents: number;
    sgstCents: number;
    igstCents: number;
    sac?: string | null;
    totalCents: number;
  } | null;
  issuedAtLabel: string;
  nextInvoiceLabel: string;
  planName: string;
  paymentMode: string;
  subscriptionRef: string;
  paymentRef: string;
}

function moneyText(amountCents: number): string {
  return formatINR(amountCents);
}

function renderLines(lines: string[]): string {
  return lines
    .filter((line) => Boolean(line && line.trim()))
    .map((line) => `<div class="line">${line}</div>`)
    .join('\n');
}

function moneyWords(amountCents: number): string {
  const rupees = Math.max(0, Math.floor(amountCents / 100));
  if (rupees === 0) return 'Rupees Zero Only';
  const words: string[] = [];
  const scales = [
    { value: 10000000, label: 'Crore' },
    { value: 100000, label: 'Lakh' },
    { value: 1000, label: 'Thousand' },
    { value: 100, label: 'Hundred' },
  ];
  const ones = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const belowHundred = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return `${tens[t]}${o ? ` ${ones[o]}` : ''}`;
  };
  const belowThousand = (n: number): string => {
    if (n < 100) return belowHundred(n);
    const h = Math.floor(n / 100);
    const r = n % 100;
    return `${ones[h]} Hundred${r ? ` ${belowHundred(r)}` : ''}`;
  };
  let remaining = rupees;
  for (const scale of scales) {
    if (remaining >= scale.value) {
      const q = Math.floor(remaining / scale.value);
      words.push(`${belowThousand(q)} ${scale.label}`);
      remaining %= scale.value;
    }
  }
  if (remaining > 0) words.push(belowThousand(remaining));
  return `Rupees ${words.join(' ')} Only`;
}
export function InvoicePreview({ data }: { data: InvoicePreviewData }) {
  const {
    company,
    customerName,
    customerLines,
    customerShipLines,
    invoice,
    issuedAtLabel,
    nextInvoiceLabel,
    planName,
    paymentMode,
    subscriptionRef,
    paymentRef,
  } = data;

  const containerRef = React.useRef<HTMLDivElement>(null);
  const paperRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [scaledHeight, setScaledHeight] = React.useState<number | undefined>(undefined);

  React.useEffect(() => {
    const el = containerRef.current;
    const paper = paperRef.current;
    if (!el || !paper) return;

    const updateScale = () => {
      const cw = el.clientWidth || (typeof window !== 'undefined' ? window.innerWidth - 32 : 360);
      if (!cw || cw <= 0) return;
      const baseW = 800;
      const s = Math.min(1, Math.max(0.2, cw / baseW));
      setScale(s);
      const rawH = paper.scrollHeight || paper.offsetHeight || 650;
      if (rawH > 50) {
        setScaledHeight(Math.ceil(rawH * s));
      }
    };

    updateScale();
    const raf = requestAnimationFrame(updateScale);
    const timer = setTimeout(updateScale, 60);
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    ro.observe(paper);
    window.addEventListener('resize', updateScale);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  const itemAmount = moneyText(invoice?.totalCents || 0);
  const subtotal = moneyText(invoice?.subtotalCents || 0);
  const taxCents = invoice?.taxCents || 0;
  // Use the persisted breakdown; fall back to legacy 50/50 for pre-migration invoices.
  const hasTaxBreakdown =
    (invoice?.cgstCents || 0) > 0 || (invoice?.sgstCents || 0) > 0 || (invoice?.igstCents || 0) > 0;
  const legacyCgst = Math.floor(taxCents / 2);
  const cgstRaw = hasTaxBreakdown ? invoice?.cgstCents || 0 : legacyCgst;
  const sgstRaw = hasTaxBreakdown ? invoice?.sgstCents || 0 : taxCents - legacyCgst;
  const igstRaw = hasTaxBreakdown ? invoice?.igstCents || 0 : 0;
  const cgst = moneyText(cgstRaw);
  const sgst = moneyText(sgstRaw);
  const igst = moneyText(igstRaw);
  const discount = moneyText(invoice?.discountCents || 0);
  const sac = invoice?.sac?.trim() || company.sac?.trim() || '—';

  return (
    <div className="w-full flex flex-col items-center justify-center p-1.5 sm:p-4 bg-slate-100 dark:bg-[#161c28] rounded-2xl overflow-hidden border border-border/80">
      <div
        ref={containerRef}
        className="w-full flex justify-center items-start overflow-hidden transition-all"
        style={{
          height: scaledHeight ? `${scaledHeight + 12}px` : 'auto',
          minHeight: scaledHeight ? `${scaledHeight + 12}px` : '240px',
        }}
      >
        <div
          ref={paperRef}
          style={{
            width: '800px',
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
            fontFamily: "'Segoe UI', Arial, sans-serif",
            color: '#1e293b',
            background: '#ffffff',
          }}
          className="rounded-xl border border-slate-200 shrink-0 text-slate-800 select-none"
        >
          {/* Top colored accent line */}
          <div style={{ height: '6px', background: 'linear-gradient(90deg, #6c63ff, #4a43cc)' }} />

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '26px 40px 18px 40px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', color: '#6c63ff', letterSpacing: '0.5px', fontWeight: 800 }}>{company.name}</h1>
              <div style={{ marginTop: '5px', fontSize: '12px', letterSpacing: '3px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Subscription Invoice</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', letterSpacing: '2px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '5px', fontWeight: 700 }}>Tax Invoice</div>
              <div style={{ fontSize: '21px', fontWeight: 800, color: '#111827' }}>{invoice?.invoiceNumber || 'Pending'}</div>
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
                <span style={{ color: '#6c63ff', fontWeight: 700 }}>●</span> Status: {invoice?.status || 'PENDING'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Subscription: {subscriptionRef}</div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 40px' }} />

          {/* Parties */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 40px', gap: '40px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>Supplier</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '5px' }}>{company.name.toUpperCase()}</div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.55 }}><b>GSTIN:</b> {company.gstin || '-'}</div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.55 }}><b>Address:</b> {company.addressLines.join(', ')}</div>
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.55 }}><b>Place of Supply:</b> {company.placeOfSupply || '-'}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>Bill To</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '5px' }}>{customerName}</div>
              {/* eslint-disable-next-line react/no-danger */}
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: renderLines(customerLines) }} />
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '11px', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>Ship To</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#111827', marginBottom: '5px' }}>{customerName}</div>
                {/* eslint-disable-next-line react/no-danger */}
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: renderLines(customerShipLines) }} />
              </div>
            </div>
          </div>

          {/* Info Strip */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 40px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>Invoice No.</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{invoice?.invoiceNumber || 'Pending'}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>Purchase Date</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{issuedAtLabel}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>Next Invoice</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{nextInvoiceLabel}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 700 }}>Status</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>{invoice?.status || 'PENDING'}</div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', padding: '8px 10px 8px 40px', width: '70px', fontWeight: 700 }}>Sr.No</th>
                <th style={{ textAlign: 'left', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', padding: '8px 10px', width: '24%', fontWeight: 700 }}>Item</th>
                <th style={{ textAlign: 'left', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', padding: '8px 10px', fontWeight: 700 }}>SAC</th>
                <th style={{ textAlign: 'right', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', padding: '8px 10px', fontWeight: 700 }}>Qty</th>
                <th style={{ textAlign: 'right', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', padding: '8px 10px', fontWeight: 700 }}>Taxable</th>
                <th style={{ textAlign: 'right', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', padding: '8px 10px', fontWeight: 700 }}>CGST</th>
                <th style={{ textAlign: 'right', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', padding: '8px 10px', fontWeight: 700 }}>SGST</th>
                <th style={{ textAlign: 'right', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', padding: '8px 10px', fontWeight: 700 }}>IGST</th>
                <th style={{ textAlign: 'right', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: '#94a3b8', padding: '8px 40px 8px 10px', fontWeight: 700 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px 10px 12px 40px', fontSize: '12px', color: '#1e293b' }}>1</td>
                <td style={{ padding: '12px 10px', fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{planName}</td>
                <td style={{ padding: '12px 10px', fontSize: '12px', color: '#475569' }}>{sac}</td>
                <td style={{ padding: '12px 10px', fontSize: '12px', textAlign: 'right', color: '#475569' }}>1</td>
                <td style={{ padding: '12px 10px', fontSize: '12px', textAlign: 'right', color: '#1e293b' }}>{subtotal}</td>
                <td style={{ padding: '12px 10px', fontSize: '12px', textAlign: 'right', color: '#1e293b' }}>{cgst}</td>
                <td style={{ padding: '12px 10px', fontSize: '12px', textAlign: 'right', color: '#1e293b' }}>{sgst}</td>
                <td style={{ padding: '12px 10px', fontSize: '12px', textAlign: 'right', color: '#1e293b' }}>{igst}</td>
                <td style={{ padding: '12px 40px 12px 10px', fontSize: '12px', textAlign: 'right', fontWeight: 800, color: '#111827' }}>{itemAmount}</td>
              </tr>
            </tbody>
          </table>

          {/* Summary Row */}
          <div style={{ display: 'flex', gap: '20px', padding: '20px 40px 6px 40px' }}>
            <div style={{ flex: 1, background: '#f8fafc', borderRadius: '10px', padding: '16px 20px', border: '1px solid #edf2f7' }}>
              <div style={{ fontSize: '10.5px', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 700 }}>Charges Summary</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', padding: '4px 0' }}>
                <span>Sub total</span>
                <span style={{ fontWeight: 600 }}>{subtotal}</span>
              </div>
              {cgstRaw > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', padding: '4px 0' }}>
                  <span>CGST</span>
                  <span>{cgst}</span>
                </div>
              )}
              {sgstRaw > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', padding: '4px 0' }}>
                  <span>SGST</span>
                  <span>{sgst}</span>
                </div>
              )}
              {igstRaw > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', padding: '4px 0' }}>
                  <span>IGST</span>
                  <span>{igst}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#dc2626', padding: '4px 0' }}>
                <span>Discount</span>
                <span style={{ fontWeight: 600 }}>-{discount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #111827', marginTop: '6px', paddingTop: '9px', fontWeight: 800, fontSize: '14px', color: '#111827' }}>
                <span>Total</span>
                <span style={{ color: '#6c63ff' }}>{itemAmount}</span>
              </div>
            </div>

            <div style={{ flex: 1, background: '#f8fafc', borderRadius: '10px', padding: '16px 20px', border: '1px solid #edf2f7', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '10.5px', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 700 }}>Payment</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', padding: '3px 0' }}>
                  <span>Payment mode</span>
                  <span style={{ fontWeight: 600 }}>{paymentMode}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#475569', padding: '3px 0' }}>
                  <span>Due amount</span>
                  <span style={{ fontWeight: 700, color: '#111827' }}>{itemAmount}</span>
                </div>
              </div>
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '10.5px', letterSpacing: '1.5px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>Amount in Words</div>
                <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#111827', lineHeight: 1.4 }}>{moneyWords(invoice?.totalCents || 0)}</div>
              </div>
            </div>
          </div>

          {/* Footer Notes */}
          <div style={{ padding: '16px 40px 10px 40px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
            <div><b>Payment ref:</b> {paymentRef}</div>
            <div style={{ marginTop: '4px' }}>
              <b>Notes:</b> {company.notes || 'All monthly and usage payments are non-refundable.'} For any query, contact {company.email || 'billing@finamite.in'}.
            </div>
          </div>

          {/* Bottom brand bar */}
          <div style={{ textAlign: 'center', padding: '12px', fontSize: '11px', color: '#6c63ff', fontWeight: 700, borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            Powered by {company.name}
          </div>
        </div>
      </div>
    </div>
  );
}

