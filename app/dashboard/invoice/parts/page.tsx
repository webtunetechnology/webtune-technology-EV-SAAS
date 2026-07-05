'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Check, CheckCircle, Trash2, Loader2, ArrowLeft,
  Search, ShoppingCart, ExternalLink,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Part {
  id: string;
  part_name: string;
  part_code: string;
  hsn_code: string | null;
  gst_percentage: number;
  category: string | null;
  unit_of_measure: string | null;
  current_stock?: { selling_price: number | null; mrp: number | null; quantity_available: number } | null;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string | null;
  mobile: string;
  city?: string;
  customer_type?: string;
}

interface LineItem {
  part_id: string;
  part_name: string;
  part_code: string;
  hsn_code: string;
  gst_percentage: number;
  quantity: number;
  unit_price: number;
  available_qty: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const parseNum = (val: string | number): number => parseFloat(String(val)) || 0;

const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── Shared UI primitives (mirrors vehicle invoice exactly) ────────────────────

const SectionCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-300 hover:shadow-md ${className}`}>
    {children}
  </div>
);

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    {children}
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const Input = ({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400 ${props.className || ''}`}
  />
);

const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
  <select
    {...props}
    className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400 disabled:bg-gray-100 disabled:cursor-not-allowed ${props.className || ''}`}
  >
    {children}
  </select>
);

const SummaryRow = ({ label, value, bold, textColor }: { label: string; value: string; bold?: boolean; textColor?: string }) => (
  <div className="flex justify-between items-center">
    <span className={`${bold ? 'font-semibold text-gray-900' : 'text-gray-600'} text-sm`}>{label}</span>
    <span className={`${bold ? 'font-semibold text-gray-900' : 'text-gray-700'} text-sm ${textColor || ''}`}>{value}</span>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export default function CreatePartsInvoicePage() {
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [animating, setAnimating]     = useState(false);

  // Customer
  const [customerSearch, setCustomerSearch]         = useState('');
  const [customers, setCustomers]                   = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer]     = useState<Customer | null>(null);
  const [customerDropdown, setCustomerDropdown]     = useState(false);
  const [walkinName, setWalkinName]                 = useState('');
  const [walkinMobile, setWalkinMobile]             = useState('');

  // Parts search
  const [partSearch, setPartSearch]     = useState('');
  const [parts, setParts]               = useState<Part[]>([]);
  const [partsDropdown, setPartsDropdown] = useState(false);
  const [loadingParts, setLoadingParts] = useState(false);

  // Line items
  const [items, setItems] = useState<LineItem[]>([]);

  // Payment
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod]   = useState('Cash');
  const [paymentStatus, setPaymentStatus]   = useState('Paid');
  const [notes, setNotes]                   = useState('');
  const [saleDate, setSaleDate]             = useState(new Date().toISOString().split('T')[0]);

  // Submit
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  const getShowroomId = useCallback((): string => {
    try {
      const s = localStorage.getItem('showroom') || sessionStorage.getItem('showroom');
      return s ? JSON.parse(s).id : '';
    } catch { return ''; }
  }, []);

  // Fetch customers on search
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return; }
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/customers?search=${encodeURIComponent(customerSearch)}&limit=10`);
        const json = await res.json();
        if (json.success) setCustomers(json.data || []);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  // Fetch parts on search
  useEffect(() => {
    if (partSearch.length < 1) { setParts([]); setPartsDropdown(false); return; }
    const t = setTimeout(async () => {
      setLoadingParts(true);
      try {
        const res  = await fetch(`/api/parts?search=${encodeURIComponent(partSearch)}&limit=20&with_stock=true`);
        const json = await res.json();
        if (json.success) { setParts(json.data || []); setPartsDropdown(true); }
      } catch { /* ignore */ } finally { setLoadingParts(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [partSearch]);

  const addPart = (part: Part) => {
    const stock = Array.isArray((part as any).current_stock)
      ? (part as any).current_stock[0] ?? null
      : part.current_stock ?? null;

    const exists = items.find(it => it.part_id === part.id);
    if (exists) {
      setItems(prev => prev.map(it => it.part_id === part.id ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setItems(prev => [...prev, {
        part_id        : part.id,
        part_name      : part.part_name,
        part_code      : part.part_code,
        hsn_code       : part.hsn_code || '',
        gst_percentage : part.gst_percentage || 0,
        quantity       : 1,
        unit_price     : Number(stock?.selling_price || stock?.mrp || 0),
        available_qty  : stock?.quantity_available || 0,
      }]);
    }
    setPartSearch('');
    setParts([]);
    setPartsDropdown(false);
  };

  const updateItem = (idx: number, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  // Totals
  const subtotal   = round2(items.reduce((s, it) => s + it.unit_price * it.quantity, 0));
  const taxAmount  = round2(items.reduce((s, it) => s + (it.unit_price * it.quantity * (it.gst_percentage || 0)) / 100, 0));
  const grandTotal = round2(subtotal + taxAmount - (discountAmount || 0));

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (items.length === 0) { alert('Add at least one spare part'); return false; }
      if (!selectedCustomer && !walkinName) { alert('Please select or enter a customer name'); return false; }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setAnimating(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 150);
    }
  };

  const handlePrevStep = () => {
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setAnimating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (items.length === 0) { setError('Add at least one part'); return; }

    const customerName   = selectedCustomer
      ? `${selectedCustomer.first_name} ${selectedCustomer.last_name || ''}`.trim()
      : walkinName || 'Walk-in Customer';
    const customerMobile = selectedCustomer?.mobile || walkinMobile || '';

    setSaving(true);
    try {
      const res  = await fetch('/api/parts-invoices', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          customer_id     : selectedCustomer?.id || null,
          customer_name   : customerName,
          customer_mobile : customerMobile,
          sale_date       : saleDate,
          items           : items.map(it => ({
            part_id        : it.part_id,
            part_name      : it.part_name,
            hsn_code       : it.hsn_code,
            gst_percentage : it.gst_percentage,
            quantity       : it.quantity,
            unit_price     : it.unit_price,
          })),
          discount_amount : discountAmount || 0,
          payment_method  : paymentMethod,
          payment_status  : paymentStatus,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(`Invoice ${json.data.sale_number} created successfully!`);
        setTimeout(() => router.push('/dashboard/invoice?tab=parts'), 1800);
      } else {
        setError(json.error || 'Failed to create invoice');
      }
    } catch { setError('Network error. Please try again.'); } finally { setSaving(false); }
  };

  // ── Sticky Invoice Summary sidebar (mirrors vehicle invoice) ─────────────────

  const InvoiceSummary = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Invoice Summary</h2>
      </div>

      <div className="space-y-2.5">
        <SummaryRow label={`Parts (${items.length} item${items.length !== 1 ? 's' : ''})`} value={formatCurrency(subtotal)} />

        {taxAmount > 0 && (
          <SummaryRow label="GST / Tax" value={formatCurrency(taxAmount)} textColor="text-gray-500" />
        )}

        {discountAmount > 0 && (
          <>
            <div className="border-t border-gray-200 my-2" />
            <SummaryRow label="Discount" value={`- ${formatCurrency(discountAmount)}`} textColor="text-red-600" />
          </>
        )}

        <div className="border-t-2 border-blue-200 my-2" />
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
          <span className="text-base font-bold text-gray-900">Grand Total</span>
          <span className="text-xl font-bold text-blue-700">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Per-item GST breakdown */}
      {items.length > 0 && (
        <div className="mt-5 space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Items</p>
          {items.map(it => (
            <div key={it.part_id} className="flex justify-between text-xs text-gray-600">
              <span className="truncate max-w-[60%]">{it.part_name}</span>
              <span>{formatCurrency(it.unit_price * it.quantity)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Steps Indicator */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-center">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center">
                <button
                  type="button"
                  onClick={() => { if (step < currentStep) setCurrentStep(step); }}
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    currentStep >= step
                      ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-200 scale-105'
                      : 'bg-gray-100 text-gray-500'
                  } ${step < currentStep ? 'cursor-pointer hover:scale-110' : ''}`}
                >
                  {currentStep > step ? <Check className="w-5 h-5" /> : step}
                </button>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${currentStep >= step ? 'text-blue-700' : 'text-gray-500'}`}>
                    {step === 1 ? 'Customer & Parts' : 'Payment & Confirm'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {step === 1 ? 'Add parts & customer' : 'Finalise invoice'}
                  </p>
                </div>
                {step < 2 && (
                  <div className="mx-4 hidden sm:block">
                    <div className={`w-12 lg:w-20 h-0.5 rounded-full transition-all duration-300 ${
                      currentStep > step ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-200'
                    }`} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex justify-between items-start">
          {error}
          <button onClick={() => setError('')} className="ml-3 font-bold text-red-400 hover:text-red-600 shrink-0">×</button>
        </div>
      )}
      {success && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* STEP 1 — Customer & Parts */}
      {currentStep === 1 && (
        <div className={`transition-all duration-300 ${animating ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* Invoice date */}
              <SectionCard>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Invoice Details</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Spare parts counter sale</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel required>Sale Date</FieldLabel>
                    <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                  </div>
                </div>
              </SectionCard>

              {/* Customer */}
              <SectionCard>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Customer</h2>
                <p className="text-xs text-gray-500 mb-4">Choose an existing customer or enter walk-in details</p>

                {selectedCustomer ? (
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <h3 className="font-semibold text-sm text-blue-900 mb-3">Customer Details</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white/50 p-2 rounded"><span className="text-gray-500 text-xs">Name</span><p className="font-medium text-gray-900">{selectedCustomer.first_name} {selectedCustomer.last_name}</p></div>
                      <div className="bg-white/50 p-2 rounded"><span className="text-gray-500 text-xs">Mobile</span><p className="font-medium text-gray-900">{selectedCustomer.mobile}</p></div>
                      {selectedCustomer.city && <div className="bg-white/50 p-2 rounded"><span className="text-gray-500 text-xs">City</span><p className="font-medium text-gray-900">{selectedCustomer.city}</p></div>}
                      {selectedCustomer.customer_type && <div className="bg-white/50 p-2 rounded"><span className="text-gray-500 text-xs">Type</span><p className="font-medium text-gray-900">{selectedCustomer.customer_type}</p></div>}
                    </div>
                    <button
                      onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                      className="mt-3 text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Remove customer
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Search existing */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search existing customer by name or mobile…"
                        value={customerSearch}
                        onChange={e => { setCustomerSearch(e.target.value); setCustomerDropdown(true); }}
                        onFocus={() => setCustomerDropdown(true)}
                        className="pl-9"
                      />
                      {customerDropdown && customers.length > 0 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                          {customers.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerDropdown(false); }}
                              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                            >
                              <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                              <p className="text-xs text-gray-500">{c.mobile}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-center text-gray-400">— or enter walk-in customer —</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <FieldLabel>Customer Name</FieldLabel>
                        <Input
                          type="text"
                          placeholder="Walk-in customer name"
                          value={walkinName}
                          onChange={e => setWalkinName(e.target.value)}
                        />
                      </div>
                      <div>
                        <FieldLabel>Mobile Number</FieldLabel>
                        <Input
                          type="tel"
                          placeholder="Mobile number"
                          value={walkinMobile}
                          onChange={e => setWalkinMobile(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Parts picker */}
              <SectionCard>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Spare Parts</h2>
                <p className="text-xs text-gray-500 mb-4">Search and add parts to the invoice</p>

                {/* Search bar */}
                <div className="relative mb-5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  {loadingParts && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                  <Input
                    type="text"
                    placeholder="Search parts by name or code…"
                    value={partSearch}
                    onChange={e => setPartSearch(e.target.value)}
                    onFocus={() => parts.length > 0 && setPartsDropdown(true)}
                    className="pl-9"
                  />
                  {partsDropdown && parts.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                      {parts.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addPart(p)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{p.part_name}</p>
                              <p className="text-xs text-gray-500">{p.part_code}{p.category ? ` · ${p.category}` : ''}</p>
                            </div>
                            <div className="text-right">
                              {(() => {
                                const s = Array.isArray((p as any).current_stock) ? (p as any).current_stock[0] : p.current_stock;
                                return (
                                  <>
                                    <p className="text-sm font-semibold text-blue-600">{formatCurrency(Number(s?.selling_price || s?.mrp || 0))}</p>
                                    <p className="text-xs text-gray-400">Stock: {s?.quantity_available ?? '—'}</p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Line items table */}
                {items.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No parts added yet. Search above to add parts.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="py-2 px-2 text-left text-xs font-medium text-gray-500">Part</th>
                          <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 w-24">Qty</th>
                          <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 w-32">Unit Price (₹)</th>
                          <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 w-20">GST %</th>
                          <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 w-28">Amount</th>
                          <th className="py-2 px-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map((it, idx) => (
                          <tr key={it.part_id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 px-2">
                              <p className="font-medium text-gray-900">{it.part_name}</p>
                              <p className="text-xs text-gray-400">{it.part_code} · HSN {it.hsn_code || '—'}</p>
                              {it.available_qty > 0 && it.available_qty < it.quantity && (
                                <p className="text-xs text-amber-600">Low stock: {it.available_qty} available</p>
                              )}
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={e => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                                className="w-full text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2.5 px-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={it.unit_price}
                                onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                                className="w-full text-right border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-right text-gray-600 text-sm">
                              {it.gst_percentage}%
                            </td>
                            <td className="py-2.5 px-2 text-right font-medium text-gray-900 text-sm">
                              {formatCurrency(it.unit_price * it.quantity)}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>

              {/* Navigation */}
              <div className="flex justify-between pb-6">
                <div />
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="group flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200 hover:shadow-xl transition-all duration-200 font-medium"
                >
                  Next Step
                  <ExternalLink className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <InvoiceSummary />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 — Payment & Confirm */}
      {currentStep === 2 && (
        <div className={`transition-all duration-300 ${animating ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">

                {/* Payment details */}
                <SectionCard>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <FieldLabel required>Sale Date</FieldLabel>
                      <Input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} />
                    </div>
                    <div>
                      <FieldLabel>Payment Method</FieldLabel>
                      <Select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                        {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'].map(m => (
                          <option key={m}>{m}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Payment Status</FieldLabel>
                      <Select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)}>
                        {['Paid', 'Pending', 'Partial'].map(s => <option key={s}>{s}</option>)}
                      </Select>
                    </div>
                    <div>
                      <FieldLabel>Discount (₹)</FieldLabel>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountAmount || ''}
                        onChange={e => setDiscountAmount(Number(e.target.value))}
                        placeholder="0"
                        className="border-red-200 bg-red-50 focus:ring-red-400"
                      />
                    </div>
                  </div>
                </SectionCard>

                {/* Notes */}
                <SectionCard>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Additional notes or remarks for this invoice…"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400 resize-none"
                  />
                </SectionCard>

                {/* Navigation */}
                <div className="flex justify-between pb-6">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="group flex items-center px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
                    Previous
                  </button>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="group flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200 hover:shadow-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                          Creating Invoice...
                        </>
                      ) : (
                        <>
                          Generate Invoice
                          <Check className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                    <Link
                      href="/dashboard/invoice?tab=parts"
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Cancel
                    </Link>
                  </div>
                </div>

              </div>

              <div className="space-y-6">
                <InvoiceSummary />
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
