'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Search, Check, Loader2,
  Package, User, ShoppingCart, FileText,
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

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// ── Main Component ────────────────────────────────────────────────────────────

export default function CreatePartsInvoicePage() {
  const router = useRouter();

  // Customer
  const [customerSearch, setCustomerSearch]   = useState('');
  const [customers, setCustomers]             = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showroomCustomerName, setWalkinName] = useState('');
  const [walkinMobile, setWalkinMobile]       = useState('');
  const [customerDropdown, setCustomerDropdown] = useState(false);

  // Parts search
  const [partSearch, setPartSearch]           = useState('');
  const [parts, setParts]                     = useState<Part[]>([]);
  const [partsDropdown, setPartsDropdown]     = useState(false);
  const [loadingParts, setLoadingParts]       = useState(false);

  // Line items
  const [items, setItems]                     = useState<LineItem[]>([]);

  // Payment
  const [discountAmount, setDiscountAmount]   = useState(0);
  const [paymentMethod, setPaymentMethod]     = useState('Cash');
  const [paymentStatus, setPaymentStatus]     = useState('Paid');
  const [notes, setNotes]                     = useState('');
  const [saleDate, setSaleDate]               = useState(new Date().toISOString().split('T')[0]);

  // Submit
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState('');

  const getShowroomId = useCallback((): string => {
    try {
      const s = localStorage.getItem('showroom') || sessionStorage.getItem('showroom');
      return s ? JSON.parse(s).id : '';
    } catch { return ''; }
  }, []);

  // Fetch customers
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

  // Fetch parts
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
        unit_price     : Number(part.current_stock?.selling_price || part.current_stock?.mrp || 0),
        available_qty  : part.current_stock?.quantity_available || 0,
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
  const taxAmount  = round2(items.reduce((s, it) => {
    return s + (it.unit_price * it.quantity * (it.gst_percentage || 0)) / 100;
  }, 0));
  const grandTotal = round2(subtotal + taxAmount - (discountAmount || 0));

  const handleSubmit = async () => {
    setError('');
    if (items.length === 0) { setError('Add at least one part'); return; }

    const customerName   = selectedCustomer
      ? `${selectedCustomer.first_name} ${selectedCustomer.last_name || ''}`.trim()
      : showroomCustomerName || 'Walk-in Customer';
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
        setTimeout(() => router.push('/dashboard/invoice?tab=parts'), 1500);
      } else {
        setError(json.error || 'Failed to create invoice');
      }
    } catch { setError('Network error. Please try again.'); } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard/invoice?tab=parts" className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">New Spare Parts Invoice</h1>
            <p className="text-sm text-gray-500">Sell spare parts over the counter</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex justify-between">
            {error}
            <button onClick={() => setError('')} className="font-bold text-red-400 hover:text-red-600">×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm flex items-center gap-2">
            <Check className="w-4 h-4" /> {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left — main form */}
          <div className="lg:col-span-2 space-y-5">

            {/* Customer */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Customer</h2>
              </div>

              {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{selectedCustomer.mobile}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Search existing */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search existing customer by name or mobile…"
                      value={customerSearch}
                      onChange={e => { setCustomerSearch(e.target.value); setCustomerDropdown(true); }}
                      onFocus={() => setCustomerDropdown(true)}
                      className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    {customerDropdown && customers.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        {customers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerDropdown(false); }}
                            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                          >
                            <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                            <p className="text-xs text-gray-500">{c.mobile}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Walk-in */}
                  <p className="text-xs text-center text-gray-400">— or enter walk-in customer —</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Customer name"
                      value={showroomCustomerName}
                      onChange={e => setWalkinName(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <input
                      type="tel"
                      placeholder="Mobile number"
                      value={walkinMobile}
                      onChange={e => setWalkinMobile(e.target.value)}
                      className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Parts picker */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <Package className="w-4 h-4 text-green-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Spare Parts</h2>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                {loadingParts && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
                <input
                  type="text"
                  placeholder="Search parts by name or code…"
                  value={partSearch}
                  onChange={e => setPartSearch(e.target.value)}
                  onFocus={() => parts.length > 0 && setPartsDropdown(true)}
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                {partsDropdown && parts.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                    {parts.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addPart(p)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.part_name}</p>
                            <p className="text-xs text-gray-500">{p.part_code} {p.category ? `· ${p.category}` : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-blue-600">
                              {inr(Number(p.current_stock?.selling_price || p.current_stock?.mrp || 0))}
                            </p>
                            <p className="text-xs text-gray-400">
                              Stock: {p.current_stock?.quantity_available ?? '—'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Line items table */}
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
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
                        <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 w-28">Unit Price</th>
                        <th className="py-2 px-2 text-right text-xs font-medium text-gray-500 w-24">GST %</th>
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
                            {it.available_qty < it.quantity && (
                              <p className="text-xs text-amber-600">Low stock: {it.available_qty} available</p>
                            )}
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={e => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))}
                              className="w-full text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                          <td className="py-2.5 px-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={it.unit_price}
                              onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                              className="w-full text-right border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-right text-gray-600 text-sm">
                            {it.gst_percentage}%
                          </td>
                          <td className="py-2.5 px-2 text-right font-medium text-gray-900 text-sm">
                            {inr(it.unit_price * it.quantity)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
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
            </div>

            {/* Notes */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <FileText className="w-4 h-4 text-gray-500" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Notes</h2>
              </div>
              <textarea
                rows={3}
                placeholder="Any notes for this invoice…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Right — summary */}
          <div className="space-y-5">

            {/* Invoice details */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Invoice Details</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Sale Date</label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {['Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque'].map(m => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Payment Status</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {['Paid', 'Pending', 'Partial'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Discount (Rs.)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountAmount || ''}
                    onChange={e => setDiscountAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''})</span>
                  <span>{inr(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>GST / Tax</span>
                    <span>{inr(taxAmount)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>- {inr(discountAmount)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-100 flex justify-between font-bold text-gray-900 text-base">
                  <span>Grand Total</span>
                  <span>{inr(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={saving || items.length === 0}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 text-white rounded-2xl font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating Invoice…</>
              ) : (
                <><Check className="w-4 h-4" /> Generate Invoice</>
              )}
            </button>

            <Link
              href="/dashboard/invoice?tab=parts"
              className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
