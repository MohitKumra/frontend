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
    <div className="invoice-preview" style={{ width: '100%' }}>
      <style>{`
        .invoice-preview * { box-sizing: border-box; }
        .invoice-preview {
          font-family: 'Segoe UI', Arial, sans-serif;
          color: #1e293b;
          background: #f6f8fc;
          padding: 24px;
        }
        .invoice-preview .invoice {
          max-width: 900px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .invoice-preview .top-bar { height: 6px; background: linear-gradient(90deg, #6c63ff, #4a43cc); }
        .invoice-preview .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 26px 40px 18px 40px; }
        .invoice-preview .brand h1 { margin: 0; font-size: 28px; color: #6c63ff; letter-spacing: 0.5px; }
        .invoice-preview .brand .sub { margin-top: 5px; font-size: 12px; letter-spacing: 3px; color: #94a3b8; text-transform: uppercase; }
        .invoice-preview .invoice-meta { text-align: right; }
        .invoice-preview .invoice-meta .tag { font-size: 11px; letter-spacing: 2px; color: #94a3b8; text-transform: uppercase; margin-bottom: 5px; }
        .invoice-preview .invoice-meta .inv-no { font-size: 21px; font-weight: 700; color: #111827; }
        .invoice-preview .invoice-meta .status { font-size: 12px; color: #475569; margin-top: 3px; }
        .invoice-preview .invoice-meta .status .dot { color: #6c63ff; font-weight: 700; }
        .invoice-preview .invoice-meta .sub-id { font-size: 12px; color: #94a3b8; }
        .invoice-preview hr.divider { border: none; border-top: 1px solid #e2e8f0; margin: 0 40px; }
        .invoice-preview .parties { display: flex; justify-content: space-between; padding: 20px 40px; gap: 40px; }
        .invoice-preview .party { flex: 1; }
        .invoice-preview .party .heading { font-size: 11px; letter-spacing: 1.5px; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
        .invoice-preview .party.right .heading { text-align: right; }
        .invoice-preview .party .name { font-weight: 700; font-size: 14px; color: #111827; margin-bottom: 5px; }
        .invoice-preview .party.right .name { text-align: right; }
        .invoice-preview .party .line { font-size: 12px; color: #475569; line-height: 1.55; }
        .invoice-preview .party.right .line { text-align: right; }
        .invoice-preview .party .line b { color: #334155; }
        .invoice-preview .ship-to { margin-top: 14px; }
        .invoice-preview .info-strip { display: flex; justify-content: space-between; padding: 14px 40px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
        .invoice-preview .info-strip .item .label { font-size: 10px; letter-spacing: 1.5px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
        .invoice-preview .info-strip .item .value { font-size: 13px; font-weight: 600; color: #111827; }
        .invoice-preview table.items { width: 100%; border-collapse: collapse; margin: 20px 0 0 0; }
        .invoice-preview table.items th { text-align: left; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #94a3b8; padding: 0 40px 8px 40px; border-bottom: 1px solid #e2e8f0; }
        .invoice-preview table.items th.num, .invoice-preview table.items td.num { text-align: right; }
        .invoice-preview table.items td { padding: 10px 40px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9; }
        .invoice-preview table.items td.item-name { font-weight: 600; }
        .invoice-preview table.items td.total-cell { font-weight: 700; }
        .invoice-preview .summary-row { display: flex; gap: 20px; padding: 20px 40px 6px 40px; }
        .invoice-preview .summary-box { flex: 1; background: #f8fafc; border-radius: 10px; padding: 16px 20px; }
        .invoice-preview .summary-box .heading { font-size: 10.5px; letter-spacing: 1.5px; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; }
        .invoice-preview .summary-box .row { display: flex; justify-content: space-between; font-size: 13px; color: #475569; padding: 4px 0; }
        .invoice-preview .summary-box .row.discount .amount { color: #dc2626; }
        .invoice-preview .summary-box .row.total { border-top: 2px solid #111827; margin-top: 6px; padding-top: 9px; font-weight: 700; font-size: 14px; color: #111827; }
        .invoice-preview .summary-box .row.total .amount { color: #6c63ff; }
        .invoice-preview .payment-box + .words-box { margin-top: 14px; }
        .invoice-preview .words-box .heading { font-size: 10.5px; letter-spacing: 1.5px; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; }
        .invoice-preview .words-box .amount-text { font-weight: 700; font-size: 13px; color: #111827; }
        .invoice-preview .footer-notes { padding: 16px 40px 10px 40px; font-size: 12px; color: #475569; line-height: 1.6; }
        .invoice-preview .footer-notes b { color: #334155; }
        .invoice-preview .footer-bar { text-align: center; padding: 13px; font-size: 11px; color: #6c63ff; font-weight: 600; border-top: 1px solid #e2e8f0; background: #f8fafc; }
      `}</style>


      <div className="invoice">
        <div className="top-bar" />
        <div className="header">
          <div className="brand">
            <h1>{company.name}</h1>
            <div className="sub">Subscription Invoice</div>
          </div>
          <div className="invoice-meta">
            <div className="tag">Tax Invoice</div>
            <div className="inv-no">{invoice?.invoiceNumber || 'Pending'}</div>
            <div className="status">
              <span className="dot">●</span> Status: {invoice?.status || 'PENDING'}
            </div>
            <div className="sub-id">Subscription: {subscriptionRef}</div>
          </div>
        </div>

        <hr className="divider" />

        <div className="parties">
          <div className="party">
            <div className="heading">Supplier</div>
            <div className="name">{company.name.toUpperCase()}</div>
            <div className="line"><b>GSTIN:</b> {company.gstin || '-'}</div>
            <div className="line"><b>Address:</b> {company.addressLines.join(', ')}</div>
            <div className="line"><b>Place of Supply:</b> {company.placeOfSupply || '-'}</div>
          </div>
          <div className="party right">
            <div className="heading">Bill To</div>
            <div className="name">{customerName}</div>
            {/* eslint-disable-next-line react/no-danger */}
            <div dangerouslySetInnerHTML={{ __html: renderLines(customerLines) }} />
            <div className="ship-to">
              <div className="heading">Ship To</div>
              <div className="name">{customerName}</div>
              {/* eslint-disable-next-line react/no-danger */}
              <div dangerouslySetInnerHTML={{ __html: renderLines(customerShipLines) }} />
            </div>
          </div>
        </div>

        <div className="info-strip">
          <div className="item"><div className="label">Invoice No.</div><div className="value">{invoice?.invoiceNumber || 'Pending'}</div></div>
          <div className="item"><div className="label">Purchase Date</div><div className="value">{issuedAtLabel}</div></div>
          <div className="item"><div className="label">Next Invoice</div><div className="value">{nextInvoiceLabel}</div></div>
          <div className="item"><div className="label">Status</div><div className="value">{invoice?.status || 'PENDING'}</div></div>
        </div>

        <table className="items">
          <thead>
            <tr>
              <th>Sr.No</th>
              <th>Item</th>
              <th>SAC</th>
              <th className="num">Qty</th>
              <th className="num">Taxable</th>
              <th className="num">CGST</th>
              <th className="num">SGST</th>
              <th className="num">IGST</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td className="item-name">{planName}</td>
              <td>{sac}</td>
              <td className="num">1</td>
              <td className="num">{subtotal}</td>
              <td className="num">{cgst}</td>
              <td className="num">{sgst}</td>
              <td className="num">{igst}</td>
              <td className="num total-cell">{itemAmount}</td>
            </tr>
          </tbody>
        </table>

        <div className="summary-row">
          <div className="summary-box">
            <div className="heading">Charges Summary</div>
            <div className="row"><span>Sub total</span><span className="amount">{subtotal}</span></div>
            {cgstRaw > 0 && <div className="row"><span>CGST</span><span className="amount">{cgst}</span></div>}
            {sgstRaw > 0 && <div className="row"><span>SGST</span><span className="amount">{sgst}</span></div>}
            {igstRaw > 0 && <div className="row"><span>IGST</span><span className="amount">{igst}</span></div>}
            <div className="row discount"><span>Discount</span><span className="amount">-{discount}</span></div>
            <div className="row total"><span>Total</span><span className="amount">{itemAmount}</span></div>
          </div>
          <div className="summary-box">
            <div className="payment-box">
              <div className="heading">Payment</div>
              <div className="row"><span>Payment mode</span><span className="amount">{paymentMode}</span></div>
              <div className="row"><span>Due amount</span><span className="amount">{itemAmount}</span></div>
            </div>
            <div className="words-box">
              <div className="heading">Amount in Words</div>
              <div className="amount-text">{moneyWords(invoice?.totalCents || 0)}</div>
            </div>
          </div>
        </div>

        <div className="footer-notes">
          <div><b>Payment ref:</b> {paymentRef}</div>
          <div style={{ marginTop: 6 }}>
            <b>Notes:</b> {company.notes || 'All monthly and usage payments are non-refundable.'} For any query, contact {company.email || 'billing@finamite.in'}.
          </div>
        </div>

        <div className="footer-bar">Powered by {company.name}</div>
      </div>
    </div>
  );
}

