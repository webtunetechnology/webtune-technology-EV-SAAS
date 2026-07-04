'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

// ============================================
// TYPES
// ============================================

type PaymentStatus = 'Pending' | 'Partial' | 'Paid' | 'Financed' | 'cancelled';

interface Brand {
  id: string;
  brand_name: string;
}

interface Vehicle {
  id: string;
  brand_id: string;
  model_name: string;
  variant_name: string | null;
  brands?: Brand;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string | null;
  mobile: string;
  email: string | null;
}

interface Inventory {
  id: string;
  vin_number: string;
  color: string | null;
  variant_name: string | null;
}

interface SalesInvoice {
  id: string;
  invoice_number: string;
  showroom_id: string;
  customer_id: string;
  vehicle_id: string;
  inventory_id: string | null;
  sale_date: string;
  delivery_date: string | null;
  ex_showroom_price: number;
  rto_charges: number;
  insurance_amount: number;
  handling_charges: number;
  fast_charger_cost: number;
  extended_warranty_cost: number;
  accessories_amount: number;
  fame_ii_subsidy: number;
  state_ev_subsidy: number;
  additional_subsidy: number;
  corporate_discount: number;
  exchange_bonus: number;
  festival_discount: number;
  loyalty_discount: number;
  additional_discount: number;
  cgst_amount: number;
  sgst_amount: number;
  cgst_percentage: number;
  sgst_percentage: number;
  payment_status: PaymentStatus;
  advance_amount: number;
  financing_required: boolean;
  invoice_pdf_url: string | null;
  gst_customer_type: string;
  billing_address: string | null;
  delivery_person_name?: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  shipping_address?: string;
  subsidy_reference_number?: string;
  finance_company?: string;
  finance_loan_amount?: number | null;
  finance_tenure_months?: number | null;
  finance_roi_percentage?: number | null;
  created_at: string;
  updated_at: string;
  customers?: Customer;
  vehicles?: Vehicle;
  inventory?: Inventory;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// SUPABASE CLIENT
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// BACKDROP OVERLAY (Blur Background)
// ============================================

const Backdrop: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <div 
    className="fixed inset-0 z-40 backdrop-blur-sm bg-white/30" 
    onClick={onClick}
  />
);

// ============================================
// PDF VIEWER MODAL - FIXED
// ============================================

const PDFViewerModal: React.FC<{ invoice: SalesInvoice; onClose: () => void }> = ({ invoice, onClose }) => {
  const pdfUrl = invoice.invoice_pdf_url;
  
  const handleDownload = async () => {
    if (!pdfUrl) return;
    try {
      // Fetch the PDF file
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoice_number.replace(/\//g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Fallback: open in new tab
      window.open(pdfUrl, '_blank');
    }
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = pdfUrl;
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      try {
        // Trigger print
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Remove iframe after print dialog
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      } catch (e) {
        // Fallback
        const printWindow = window.open(pdfUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
        }
      }
    };
    
    // Safety timeout
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60000);
  };

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b bg-gray-50/80 rounded-t-2xl">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Invoice {invoice.invoice_number}</h3>
              <p className="text-xs text-gray-500">{invoice.gst_customer_type} | {invoice.payment_status}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Download
              </button>
              <button 
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                Print
              </button>
              <button 
                onClick={() => pdfUrl ? window.open(pdfUrl, '_blank') : null}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Open in New Tab
              </button>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors ml-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          
          {/* PDF Viewer */}
          <div className="flex-1 overflow-hidden bg-gray-100 rounded-b-2xl">
            {pdfUrl ? (
              <iframe 
                src={`${pdfUrl}#toolbar=0&navpanes=0`} 
                className="w-full h-full min-h-[70vh] border-0" 
                title={`Invoice ${invoice.invoice_number}`} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-lg font-medium">PDF Not Available</p>
                <p className="text-sm mt-1">The invoice PDF has not been generated yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================
// FULL EDIT MODAL WITH ALL FIELDS
// ============================================

const EditModal: React.FC<{
  invoice: SalesInvoice;
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}> = ({ invoice, onSave, onClose, saving }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'subsidies' | 'discounts' | 'payment' | 'addresses'>('basic');
  
  const [form, setForm] = useState({
    sale_date: invoice.sale_date || '',
    delivery_date: invoice.delivery_date || '',
    delivery_person_name: invoice.delivery_person_name || '',
    gst_customer_type: invoice.gst_customer_type || 'B2C',
    ex_showroom_price: invoice.ex_showroom_price ?? '',
    rto_charges: invoice.rto_charges ?? '',
    insurance_amount: invoice.insurance_amount ?? '',
    handling_charges: invoice.handling_charges ?? '',
    fast_charger_cost: invoice.fast_charger_cost ?? '',
    extended_warranty_cost: invoice.extended_warranty_cost ?? '',
    accessories_amount: invoice.accessories_amount ?? '',
    fame_ii_subsidy: invoice.fame_ii_subsidy ?? '',
    state_ev_subsidy: invoice.state_ev_subsidy ?? '',
    additional_subsidy: invoice.additional_subsidy ?? '',
    subsidy_reference_number: invoice.subsidy_reference_number || '',
    corporate_discount: invoice.corporate_discount ?? '',
    exchange_bonus: invoice.exchange_bonus ?? '',
    festival_discount: invoice.festival_discount ?? '',
    loyalty_discount: invoice.loyalty_discount ?? '',
    additional_discount: invoice.additional_discount ?? '',
    payment_status: invoice.payment_status || 'Pending',
    advance_amount: invoice.advance_amount ?? '',
    financing_required: invoice.financing_required || false,
    finance_company: invoice.finance_company || '',
    finance_loan_amount: invoice.finance_loan_amount ?? '',
    finance_tenure_months: invoice.finance_tenure_months ?? '',
    finance_roi_percentage: invoice.finance_roi_percentage ?? '',
    insurance_provider: invoice.insurance_provider || '',
    insurance_policy_number: invoice.insurance_policy_number || '',
    billing_address: invoice.billing_address || '',
    shipping_address: invoice.shipping_address || '',
  });

  const update = (f: string, v: string | boolean) => setForm(p => ({ ...p, [f]: v }));
  const tabs = [
    { id: 'basic' as const, label: 'Basic' }, { id: 'pricing' as const, label: 'Pricing' },
    { id: 'subsidies' as const, label: 'Subsidies' }, { id: 'discounts' as const, label: 'Discounts' },
    { id: 'payment' as const, label: 'Payment' }, { id: 'addresses' as const, label: 'Addresses' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericFields = ['ex_showroom_price','rto_charges','insurance_amount','handling_charges','fast_charger_cost','extended_warranty_cost','accessories_amount','fame_ii_subsidy','state_ev_subsidy','additional_subsidy','corporate_discount','exchange_bonus','festival_discount','loyalty_discount','additional_discount','advance_amount','finance_loan_amount','finance_tenure_months','finance_roi_percentage'];
    const cleaned: any = {};
    for (const [k, v] of Object.entries(form)) {
      if (numericFields.includes(k)) cleaned[k] = v === '' || v === null || v === undefined ? null : parseFloat(String(v));
      else cleaned[k] = v === '' ? null : v;
    }
    onSave(cleaned);
  };

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between p-5 border-b bg-gray-50/80 rounded-t-2xl">
            <div><h3 className="text-lg font-semibold">Edit Invoice</h3><p className="text-sm text-gray-500">{invoice.invoice_number}</p></div>
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="flex border-b bg-white px-5 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} type="button" onClick={() => setActiveTab(t.id)} className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab===t.id?'border-blue-600 text-blue-600':'border-transparent text-gray-500'}`}>{t.label}</button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {activeTab==='basic'&&<div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Sale Date</label><input type="date" value={form.sale_date} onChange={e=>update('sale_date',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">GST Type</label><select value={form.gst_customer_type} onChange={e=>update('gst_customer_type',e.target.value)} className="w-full px-3 py-2 border rounded-lg"><option value="B2C">B2C</option><option value="B2B">B2B</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label><input type="date" value={form.delivery_date} onChange={e=>update('delivery_date',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Delivery Person</label><input type="text" value={form.delivery_person_name} onChange={e=>update('delivery_person_name',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label><input type="text" value={form.insurance_provider} onChange={e=>update('insurance_provider',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label><input type="text" value={form.insurance_policy_number} onChange={e=>update('insurance_policy_number',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>}
            {activeTab==='pricing'&&<div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ex-Showroom Price *</label><input type="number" value={form.ex_showroom_price} onChange={e=>update('ex_showroom_price',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">RTO Charges</label><input type="number" value={form.rto_charges} onChange={e=>update('rto_charges',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Insurance Amount</label><input type="number" value={form.insurance_amount} onChange={e=>update('insurance_amount',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Handling Charges</label><input type="number" value={form.handling_charges} onChange={e=>update('handling_charges',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Fast Charger</label><input type="number" value={form.fast_charger_cost} onChange={e=>update('fast_charger_cost',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Extended Warranty</label><input type="number" value={form.extended_warranty_cost} onChange={e=>update('extended_warranty_cost',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Accessories</label><input type="number" value={form.accessories_amount} onChange={e=>update('accessories_amount',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>}
            {activeTab==='subsidies'&&<div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">FAME II Subsidy</label><input type="number" value={form.fame_ii_subsidy} onChange={e=>update('fame_ii_subsidy',e.target.value)} className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">State EV Subsidy</label><input type="number" value={form.state_ev_subsidy} onChange={e=>update('state_ev_subsidy',e.target.value)} className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Additional Subsidy</label><input type="number" value={form.additional_subsidy} onChange={e=>update('additional_subsidy',e.target.value)} className="w-full px-3 py-2 border border-green-300 bg-green-50 rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label><input type="text" value={form.subsidy_reference_number} onChange={e=>update('subsidy_reference_number',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>}
            {activeTab==='discounts'&&<div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Corporate Discount</label><input type="number" value={form.corporate_discount} onChange={e=>update('corporate_discount',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Exchange Bonus</label><input type="number" value={form.exchange_bonus} onChange={e=>update('exchange_bonus',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Festival Discount</label><input type="number" value={form.festival_discount} onChange={e=>update('festival_discount',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Loyalty Discount</label><input type="number" value={form.loyalty_discount} onChange={e=>update('loyalty_discount',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Additional Discount</label><input type="number" value={form.additional_discount} onChange={e=>update('additional_discount',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
            </div>}
            {activeTab==='payment'&&<>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label><select value={form.payment_status} onChange={e=>update('payment_status',e.target.value)} className="w-full px-3 py-2 border rounded-lg"><option value="Pending">Pending</option><option value="Partial">Partial</option><option value="Paid">Paid</option><option value="Financed">Financed</option></select></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Advance Amount</label><input type="number" value={form.advance_amount} onChange={e=>update('advance_amount',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg"><label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={form.financing_required} onChange={e=>update('financing_required',e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600" /><span className="text-sm font-medium">Financing Required</span></label></div>
              {form.financing_required&&<div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Finance Company</label><input type="text" value={form.finance_company} onChange={e=>update('finance_company',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount</label><input type="number" value={form.finance_loan_amount} onChange={e=>update('finance_loan_amount',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Tenure (Months)</label><input type="number" value={form.finance_tenure_months} onChange={e=>update('finance_tenure_months',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">ROI (%)</label><input type="number" step="0.01" value={form.finance_roi_percentage} onChange={e=>update('finance_roi_percentage',e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>}
            </>}
            {activeTab==='addresses'&&<>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label><textarea rows={3} value={form.billing_address} onChange={e=>update('billing_address',e.target.value)} className="w-full px-3 py-2 border rounded-lg resize-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label><textarea rows={3} value={form.shipping_address} onChange={e=>update('shipping_address',e.target.value)} className="w-full px-3 py-2 border rounded-lg resize-none" /></div>
            </>}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={onClose} className="px-5 py-2.5 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">{saving?'Saving...':'Save All Changes'}</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

// ============================================
// CANCEL MODAL
// ============================================

const CancelModal: React.FC<{
  invoice: SalesInvoice;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}> = ({ invoice, onConfirm, onClose, saving }) => {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== invoice.invoice_number) { alert('Please type the invoice number to confirm cancellation'); return; }
    onConfirm(reason);
  };

  return (
    <>
      <Backdrop onClick={onClose} />
      <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="p-6">
            <div className="flex items-center justify-center w-14 h-14 mx-auto bg-red-100 rounded-full">
              <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <div className="mt-4 text-center"><h3 className="text-lg font-semibold">Cancel Invoice</h3><p className="text-sm text-gray-500 mt-2">Cancel <strong>{invoice.invoice_number}</strong>? Vehicle will be restored to inventory.</p></div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Cancellation Reason</label><textarea rows={3} value={reason} onChange={e=>setReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500" required /></div>
              <div><label className="block text-sm font-medium mb-1">Type <strong>{invoice.invoice_number}</strong> to confirm</label><input type="text" value={confirmText} onChange={e=>setConfirmText(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required /></div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Keep Invoice</button>
                <button type="submit" disabled={saving||confirmText!==invoice.invoice_number} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm">{saving?'Cancelling...':'Cancel Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================
// MAIN INVOICE LIST PAGE
// ============================================

export default function InvoiceListPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [error, setError] = useState('');
  const [viewInvoice, setViewInvoice] = useState<SalesInvoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<SalesInvoice | null>(null);
  const [cancelInvoice, setCancelInvoice] = useState<SalesInvoice | null>(null);

  const getShowroomId = useCallback((): string => {
    try { const s = localStorage.getItem('showroom') || sessionStorage.getItem('showroom'); return s ? JSON.parse(s).id : ''; } catch { return ''; }
  }, []);

  const getUserId = useCallback((): string => {
    try { const u = localStorage.getItem('user') || sessionStorage.getItem('user'); return u ? JSON.parse(u).id : ''; } catch { return ''; }
  }, []);

  const fetchInvoices = useCallback(async () => {
    const showroomId = getShowroomId();
    if (!showroomId) { setError('No showroom ID'); setLoading(false); return; }
    setLoading(true); setError('');
    try {
      let q = supabase.from('sales_invoices').select('*', { count: 'exact' }).eq('showroom_id', showroomId).order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('payment_status', statusFilter);
      const now = new Date();
      if (dateFilter === 'today') q = q.eq('sale_date', now.toISOString().split('T')[0]);
      else if (dateFilter === 'week') { const d = new Date(now.getTime() - 7*86400000); q = q.gte('sale_date', d.toISOString().split('T')[0]); }
      else if (dateFilter === 'month') { const d = new Date(now.getTime() - 30*86400000); q = q.gte('sale_date', d.toISOString().split('T')[0]); }
      
      const { data, error: qe } = await q;
      if (qe) { setError(qe.message); setInvoices([]); setLoading(false); return; }
      if (!data?.length) { setInvoices([]); setLoading(false); return; }

      const enriched = await Promise.all(data.map(async (inv: any) => {
        try {
          const [cr, vr, ir] = await Promise.all([
            supabase.from('customers').select('first_name,last_name,mobile,email').eq('id', inv.customer_id).single(),
            supabase.from('vehicles').select('model_name,variant_name,brands(brand_name)').eq('id', inv.vehicle_id).single(),
            inv.inventory_id ? supabase.from('inventory').select('vin_number,color,variant_name').eq('id', inv.inventory_id).single() : Promise.resolve({ data: null })
          ]);
          return { ...inv, customers: cr.data || undefined, vehicles: vr.data || undefined, inventory: ir.data || undefined };
        } catch { return inv; }
      }));

      let filtered = enriched as SalesInvoice[];
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        filtered = filtered.filter((inv: any) => inv.invoice_number?.toLowerCase().includes(t) || inv.customers?.first_name?.toLowerCase().includes(t) || inv.customers?.last_name?.toLowerCase().includes(t) || inv.customers?.mobile?.includes(t) || inv.vehicles?.model_name?.toLowerCase().includes(t) || inv.vehicles?.brands?.brand_name?.toLowerCase().includes(t) || inv.inventory?.vin_number?.toLowerCase().includes(t));
      }
      setInvoices(filtered);
    } catch (err) { setError(`Error: ${err}`); } finally { setLoading(false); }
  }, [getShowroomId, statusFilter, dateFilter, searchTerm]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const fmt = (a: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(a||0);
  const calcTotal = (inv: SalesInvoice) => {
    const adds = [inv.ex_showroom_price,inv.rto_charges,inv.insurance_amount,inv.handling_charges,inv.fast_charger_cost,inv.extended_warranty_cost,inv.accessories_amount].reduce((a,b)=>Number(a)+Number(b),0);
    const discs = [inv.corporate_discount,inv.exchange_bonus,inv.festival_discount,inv.loyalty_discount,inv.additional_discount].reduce((a,b)=>Number(a)+Number(b),0);
    const subs = [inv.fame_ii_subsidy,inv.state_ev_subsidy,inv.additional_subsidy].reduce((a,b)=>Number(a)+Number(b),0);
    return adds - discs - subs + Number(inv.cgst_amount) + Number(inv.sgst_amount);
  };
  const statusColors: Record<PaymentStatus, string> = { 'Pending': 'bg-yellow-100 text-yellow-800', 'Partial': 'bg-orange-100 text-orange-800', 'Paid': 'bg-green-100 text-green-800', 'Financed': 'bg-blue-100 text-blue-800', 'cancelled': 'bg-red-100 text-red-800' };

  const handleUpdate = async (data: any) => {
    if (!editInvoice) return; setSaving(true);
    try {
      const numericFields = ['ex_showroom_price','rto_charges','insurance_amount','handling_charges','fast_charger_cost','extended_warranty_cost','accessories_amount','fame_ii_subsidy','state_ev_subsidy','additional_subsidy','corporate_discount','exchange_bonus','festival_discount','loyalty_discount','additional_discount','advance_amount','finance_loan_amount','finance_tenure_months','finance_roi_percentage'];
      const cleaned: any = {};
      for (const [k, v] of Object.entries(data)) {
        if (numericFields.includes(k)) cleaned[k] = v === '' || v === null || v === undefined ? null : parseFloat(String(v));
        else cleaned[k] = v === '' ? null : v;
      }
      const r = await fetch('/api/billing/invoices', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editInvoice.id, ...cleaned }) });
      const j: ApiResponse<SalesInvoice> = await r.json();
      if (j.success) { setEditInvoice(null); fetchInvoices(); } else alert('Error: ' + j.error);
    } catch { alert('Error updating invoice'); } finally { setSaving(false); }
  };

  const handleCancel = async (reason: string) => {
    if (!cancelInvoice) return; setSaving(true);
    try {
      const r = await fetch('/api/billing/invoices', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cancelInvoice.id, reason, cancelled_by: getUserId() }) });
      const j = await r.json();
      if (j.success) { setCancelInvoice(null); fetchInvoices(); } else alert('Error: ' + j.error);
    } catch { alert('Error cancelling invoice'); } finally { setSaving(false); }
  };

  const shareWA = (inv: SalesInvoice) => {
    if (!inv.customers?.mobile) { alert('No mobile number'); return; }
    const sn = (() => { try { const s = localStorage.getItem('showroom') || sessionStorage.getItem('showroom'); return s ? JSON.parse(s).showroom_name : 'EV Showroom'; } catch { return 'EV Showroom'; } })();
    window.open(`https://wa.me/91${inv.customers.mobile}?text=${encodeURIComponent(`Dear ${inv.customers.first_name},\n\nInvoice ${inv.invoice_number}\nTotal: ${fmt(calcTotal(inv))}\n\n- ${sn}`)}`, '_blank');
  };

  const stats = {
    total: invoices.length,
    revenue: invoices.reduce((s,i)=>s+calcTotal(i),0),
    pending: invoices.filter(i=>i.payment_status==='Pending'||i.payment_status==='Partial').reduce((s,i)=>s+calcTotal(i)-Number(i.advance_amount),0),
    paid: invoices.filter(i=>i.payment_status==='Paid').length
  };

  return (
    <div>
      {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between"><div className="flex items-center"><svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-red-700 text-sm">{error}</span></div><button onClick={()=>setError('')} className="text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[{l:'Total Invoices',v:stats.total,c:'blue',i:'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2'},{l:'Total Revenue',v:fmt(stats.revenue),c:'green',i:'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'},{l:'Pending',v:fmt(stats.pending),c:'red',i:'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'},{l:'Paid Invoices',v:stats.paid,c:'green',i:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'}].map((s,i)=>(
          <div key={i} className="bg-white rounded-lg shadow p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-500">{s.l}</p><p className="text-2xl font-bold">{s.v}</p></div><div className={`p-3 bg-${s.c}-100 rounded-lg`}><svg className={`w-6 h-6 text-${s.c}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={s.i}/></svg></div></div></div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow mb-6 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input type="text" placeholder="Search..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-md"/></div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-4 py-2 border rounded-md"><option value="all">All Status</option><option value="Pending">Pending</option><option value="Partial">Partial</option><option value="Paid">Paid</option><option value="Financed">Financed</option><option value="cancelled">Cancelled</option></select>
          <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="px-4 py-2 border rounded-md"><option value="all">All Time</option><option value="today">Today</option><option value="week">Week</option><option value="month">Month</option></select>
          <button onClick={fetchInvoices} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">Refresh</button>
          <Link href="/dashboard/invoice/create" className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"><svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>New</Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        : invoices.length===0 ? <div className="text-center py-12"><svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><h3 className="mt-2 text-sm font-medium">No invoices found</h3><div className="mt-6"><Link href="/dashboard/invoice/create" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Create Invoice</Link></div></div>
        : <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th></tr></thead><tbody className="divide-y divide-gray-200">
          {invoices.map(inv=>(
            <tr key={inv.id} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap"><span className="text-sm font-medium text-blue-600">{inv.invoice_number}</span><br/><span className="text-xs text-gray-500">{inv.gst_customer_type}</span></td>
              <td className="px-4 py-4 whitespace-nowrap text-sm">{new Date(inv.sale_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
              <td className="px-4 py-4 whitespace-nowrap"><div className="text-sm font-medium">{inv.customers?.first_name||'N/A'} {inv.customers?.last_name||''}</div><div className="text-xs text-gray-500">{inv.customers?.mobile||''}</div></td>
              <td className="px-4 py-4 whitespace-nowrap"><div className="text-sm">{inv.vehicles?.brands?.brand_name||''} {inv.vehicles?.model_name||''}</div><div className="text-xs text-gray-500">{inv.inventory?.vin_number||'N/A'}</div></td>
              <td className="px-4 py-4 whitespace-nowrap"><div className="text-sm font-semibold">{fmt(calcTotal(inv))}</div>{inv.advance_amount>0&&<div className="text-xs text-blue-600">Adv: {fmt(inv.advance_amount)}</div>}</td>
              <td className="px-4 py-4 whitespace-nowrap"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[inv.payment_status]}`}>{inv.payment_status}</span></td>
              <td className="px-4 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end space-x-1">
                  <button onClick={()=>setViewInvoice(inv)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="View"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
                  <button onClick={()=>shareWA(inv)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="WhatsApp"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg></button>
                  <button onClick={()=>setEditInvoice(inv)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
                  <button onClick={()=>setCancelInvoice(inv)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Cancel"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody></table></div>}
        {invoices.length>0&&<div className="px-4 py-3 border-t bg-gray-50"><p className="text-sm text-gray-500">Showing {invoices.length} invoice{invoices.length!==1?'s':''}</p></div>}
      </div>

      {viewInvoice && <PDFViewerModal invoice={viewInvoice} onClose={()=>setViewInvoice(null)} />}
      {editInvoice && <EditModal invoice={editInvoice} onSave={handleUpdate} onClose={()=>setEditInvoice(null)} saving={saving} />}
      {cancelInvoice && <CancelModal invoice={cancelInvoice} onConfirm={handleCancel} onClose={()=>setCancelInvoice(null)} saving={saving} />}
    </div>
  );
}
