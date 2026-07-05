'use client';

import { apiClient } from '@/lib/supabase/api-client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';
import {
  User, Search, Filter, Eye, Edit, Trash2, X, Plus, RefreshCw,
  ChevronRight, ChevronLeft, AlertCircle, AlertTriangle, CheckCircle,
  Info, Phone, Mail, MapPin, CreditCard, Users, Building2, Shield,
  Star, Target, Bell, Calendar, Tag, Briefcase, Zap, Battery, Globe,
  Languages, MessageSquare, Smartphone, FileText, Link, PhoneCall,
  Award, TrendingUp, UserPlus, ChevronDown, MoreHorizontal,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  customer_code: string;
  first_name: string;
  last_name: string | null;
  mobile: string;
  alternate_mobile: string | null;
  email: string | null;
  gender: 'Male' | 'Female' | 'Other' | null;
  date_of_birth: string | null;
  customer_type: 'Individual' | 'Corporate' | 'Dealer' | 'Fleet Operator' | 'Government';
  business_name: string | null;
  occupation: string | null;
  annual_income_range: string | null;
  has_home_charging: boolean;
  charging_capacity_available: string | null;
  is_ev_first_time: boolean;
  previous_vehicle_type: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  country: string;
  pincode: string;
  preferred_language: string;
  whatsapp_opt_in: boolean;
  sms_opt_in: boolean;
  email_opt_in: boolean;
  promotional_opt_in: boolean;
  source: string | null;
  referred_by: string | null;
  lead_status: string;
  customer_status: string;
  first_contact_date: string | null;
  last_contact_date: string | null;
  expected_purchase_month: string | null;
  total_vehicles_owned: number;
  total_purchase_amount: number;
  loyalty_points: number;
  referral_code: string | null;
  notes: string | null;
  tags: string[];
  aadhaar_number: string | null;
  pan_number: string | null;
  gst_number: string | null;
  driving_license_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_number: string | null;
  emergency_contact_relation: string | null;
  assigned_sales_executive_id: string | null;
  assigned_sales_executive?: { full_name: string };
  created_at: string;
  updated_at: string;
  latitude?: number;
  longitude?: number;
}

interface SalesExecutive {
  id: string;
  full_name: string;
  email: string;
  mobile_number: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(first: string, last?: string | null) {
  return `${first[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function avatarColor(name: string) {
  const palette = [
    'bg-blue-100 text-blue-700',
    'bg-teal-100 text-teal-700',
    'bg-indigo-100 text-indigo-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-emerald-100 text-emerald-700',
  ];
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return palette[n % palette.length];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const cfg = {
    success: { bar: 'bg-emerald-500', icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
    error:   { bar: 'bg-red-500',     icon: <AlertCircle  className="w-4 h-4 text-red-500"     /> },
    info:    { bar: 'bg-primary',     icon: <Info          className="w-4 h-4 text-primary"     /> },
  }[type];
  return (
    <div className="fixed bottom-6 right-6 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="bg-card border border-border rounded-xl shadow-xl flex items-center gap-3 px-4 py-3 min-w-72">
        <div className={`w-1 self-stretch rounded-full ${cfg.bar}`} />
        {cfg.icon}
        <span className="text-sm font-medium text-foreground">{message}</span>
        <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const leadChip: Record<string, { bg: string; dot: string }> = {
  New:            { bg: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500'   },
  Contacted:      { bg: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  Interested:     { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  'Test Ride Done': { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',    dot: 'bg-cyan-500'   },
  Negotiation:    { bg: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500'  },
  Converted:      { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Lost:           { bg: 'bg-red-50 text-red-700 border-red-200',         dot: 'bg-red-500'    },
  'Follow-up':    { bg: 'bg-pink-50 text-pink-700 border-pink-200',      dot: 'bg-pink-500'   },
};

const statusChip: Record<string, { bg: string; dot: string }> = {
  Active:   { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Inactive: { bg: 'bg-gray-100 text-gray-600 border-gray-200',          dot: 'bg-gray-400'   },
  Blocked:  { bg: 'bg-red-50 text-red-700 border-red-200',              dot: 'bg-red-500'    },
  VIP:      { bg: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-400'  },
};

const Chip = ({ label, map }: { label: string; map: Record<string, { bg: string; dot: string }> }) => {
  const c = map[label] ?? { bg: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
};

const FieldRow = ({ label, value }: { label: string; value?: string | number | null }) =>
  value ? (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  ) : null;

const FormField = ({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-sm font-medium text-foreground">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
  </div>
);

const inputCls = (err?: string) =>
  `w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${err ? 'border-red-400 focus:ring-red-200' : 'border-border'}`;

const selectCls = inputCls();

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomerManagementPage() {
  const [customers, setCustomers]       = useState<Customer[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [showDetail, setShowDetail]     = useState(false);
  const [selectedCustomer, setSelected] = useState<Customer | null>(null);
  const [editingCustomer, setEditing]   = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [currentPage, setCurrentPage]   = useState(1);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCustomers, setTotal]      = useState(0);
  const [toast, setToast]               = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [stats, setStats]               = useState({ total: 0, active: 0, vip: 0, converted: 0, totalLoyaltyPoints: 0, totalVehicles: 0 });
  const [executives, setExecutives]     = useState<SalesExecutive[]>([]);
  const [showFilters, setShowFilters]   = useState(false);
  const [activeTab, setActiveTab]       = useState('basic');
  const [openActions, setOpenActions]   = useState<string | null>(null);
  const [filters, setFilters]           = useState({ lead_status: '', customer_status: '', customer_type: '', source: '' });

  const tabs = useMemo(() => [
    { key: 'basic',        label: 'Basic Info',        icon: <User className="w-4 h-4" />,        mandatory: ['first_name', 'mobile'] },
    { key: 'government',   label: 'Gov. IDs',          icon: <CreditCard className="w-4 h-4" />,  mandatory: [] },
    { key: 'ev',           label: 'EV Preferences',    icon: <Battery className="w-4 h-4" />,     mandatory: [] },
    { key: 'address',      label: 'Address',           icon: <MapPin className="w-4 h-4" />,      mandatory: ['address_line1', 'city', 'state', 'pincode'] },
    { key: 'communication',label: 'Communication',     icon: <MessageSquare className="w-4 h-4" />,mandatory: [] },
    { key: 'lead',         label: 'Lead',              icon: <Target className="w-4 h-4" />,      mandatory: [] },
    { key: 'emergency',    label: 'Emergency',         icon: <PhoneCall className="w-4 h-4" />,   mandatory: [] },
  ], []);

  const emptyForm = {
    first_name: '', last_name: '', mobile: '', alternate_mobile: '', email: '',
    gender: '', date_of_birth: '', aadhaar_number: '', pan_number: '', gst_number: '',
    driving_license_number: '', customer_type: 'Individual', business_name: '',
    occupation: '', annual_income_range: '', has_home_charging: false,
    charging_capacity_available: '', is_ev_first_time: true, previous_vehicle_type: '',
    address_line1: '', address_line2: '', city: '', state: '', country: 'India',
    pincode: '', latitude: '', longitude: '', preferred_language: 'English',
    whatsapp_opt_in: true, sms_opt_in: true, email_opt_in: true, promotional_opt_in: false,
    source: 'Walk-in', referred_by: '', lead_status: 'New', customer_status: 'Active',
    first_contact_date: new Date().toISOString().split('T')[0], last_contact_date: '',
    expected_purchase_month: '', notes: '', tags: '', emergency_contact_name: '',
    emergency_contact_number: '', emergency_contact_relation: '', assigned_sales_executive_id: '',
  };

  const [formData, setFormData]     = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [sectionErr, setSectionErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const curIdx   = tabs.findIndex(t => t.key === activeTab);
  const isFirst  = curIdx === 0;
  const isLast   = curIdx === tabs.length - 1;

  // lock body scroll
  useEffect(() => {
    document.body.style.overflow = showModal || showDetail ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal, showDetail]);

  // debounced search
  useEffect(() => {
    const t = setTimeout(() => { currentPage === 1 ? loadCustomers() : setCurrentPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => { loadCustomers(); loadStats(); loadExecutives(); }, [currentPage, filters]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => setToast({ message, type });

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(currentPage), limit: '20' });
      if (searchTerm) p.append('search', searchTerm);
      Object.entries(filters).forEach(([k, v]) => v && p.append(k, v));
      const r = await apiClient.get(`/api/customers?${p}`);
      if (r.success) { setCustomers(r.data); setTotalPages(r.totalPages); setTotal(r.total); }
    } catch { showToast('Failed to load customers', 'error'); }
    finally { setLoading(false); }
  }, [currentPage, searchTerm, filters]);

  const loadStats     = useCallback(async () => { try { const r = await apiClient.get('/api/customers-stats'); if (r.success) setStats(r.stats); } catch {} }, []);
  const loadExecutives = useCallback(async () => { try { const r = await apiClient.get('/api/sales-executives'); if (r.success) setExecutives(r.data); } catch {} }, []);

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!formData.first_name?.trim())  e.first_name    = 'First name is required';
    if (!formData.mobile?.trim())      e.mobile        = 'Mobile number is required';
    else if (!/^[0-9]{10}$/.test(formData.mobile)) e.mobile = 'Must be 10 digits';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Invalid email';
    if (!formData.address_line1?.trim()) e.address_line1 = 'Address is required';
    if (!formData.city?.trim())        e.city          = 'City is required';
    if (!formData.state?.trim())       e.state         = 'State is required';
    if (!formData.pincode?.trim())     e.pincode       = 'Pincode is required';
    else if (!/^[0-9]{6}$/.test(formData.pincode)) e.pincode = 'Must be 6 digits';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateSection = () => {
    const tab = tabs[curIdx];
    const e: Record<string, string> = {};
    const labels: Record<string, string> = { first_name: 'First name', mobile: 'Mobile', address_line1: 'Address', city: 'City', state: 'State', pincode: 'Pincode' };
    tab.mandatory.forEach(f => {
      const v = formData[f as keyof typeof formData];
      if (!v || (typeof v === 'string' && !v.trim())) e[f] = `${labels[f] ?? f} is required`;
      else if (f === 'mobile' && typeof v === 'string' && !/^[0-9]{10}$/.test(v)) e[f] = 'Must be 10 digits';
      else if (f === 'pincode' && typeof v === 'string' && !/^[0-9]{6}$/.test(v)) e[f] = 'Must be 6 digits';
    });
    setFormErrors(prev => ({ ...prev, ...e }));
    if (Object.keys(e).length) { setSectionErr(`Fill required fields in ${tab.label}`); return false; }
    setSectionErr('');
    return true;
  };

  const goNext = () => { if (validateSection() && !isLast) { setActiveTab(tabs[curIdx + 1].key); setSectionErr(''); } };
  const goPrev = () => { if (!isFirst) { setActiveTab(tabs[curIdx - 1].key); setSectionErr(''); } };
  const switchTab = (key: string) => { if (validateSection()) { setActiveTab(key); setSectionErr(''); } };

  const resetForm = () => { setFormData(emptyForm); setFormErrors({}); setSectionErr(''); setActiveTab('basic'); };

  const prepareSubmit = (d: typeof formData) => ({
    ...d,
    assigned_sales_executive_id:  d.assigned_sales_executive_id  || null,
    alternate_mobile:             d.alternate_mobile             || null,
    email:                        d.email                        || null,
    gender:                       d.gender                       || null,
    date_of_birth:                d.date_of_birth                || null,
    business_name:                d.business_name                || null,
    occupation:                   d.occupation                   || null,
    annual_income_range:          d.annual_income_range          || null,
    aadhaar_number:               d.aadhaar_number               || null,
    pan_number:                   d.pan_number                   || null,
    gst_number:                   d.gst_number                   || null,
    driving_license_number:       d.driving_license_number       || null,
    charging_capacity_available:  d.charging_capacity_available  || null,
    previous_vehicle_type:        d.previous_vehicle_type        || null,
    referred_by:                  d.referred_by                  || null,
    notes:                        d.notes                        || null,
    emergency_contact_name:       d.emergency_contact_name       || null,
    emergency_contact_number:     d.emergency_contact_number     || null,
    emergency_contact_relation:   d.emergency_contact_relation   || null,
    latitude:  d.latitude  ? parseFloat(d.latitude)  : null,
    longitude: d.longitude ? parseFloat(d.longitude) : null,
    tags: d.tags ? d.tags.split(',').map(t => t.trim()) : [],
  });

  const createCustomer = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const r = await apiClient.post('/api/customers', prepareSubmit(formData));
      if (r.success) { await loadCustomers(); await loadStats(); setShowModal(false); resetForm(); showToast('Customer created!', 'success'); }
      else showToast(r.error || 'Failed to create customer', 'error');
    } catch { showToast('Failed to create customer', 'error'); }
    finally { setSubmitting(false); }
  };

  const updateCustomer = async () => {
    if (!editingCustomer || !validateForm()) return;
    setSubmitting(true);
    try {
      const r = await apiClient.put(`/api/customers/${editingCustomer.id}`, prepareSubmit(formData));
      if (r.success) { await loadCustomers(); setShowModal(false); setEditing(null); resetForm(); showToast('Customer updated!', 'success'); }
      else showToast(r.error || 'Failed to update', 'error');
    } catch { showToast('Failed to update', 'error'); }
    finally { setSubmitting(false); }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    try {
      const r = await apiClient.delete(`/api/customers/${id}`);
      if (r.success) { await loadCustomers(); await loadStats(); showToast('Customer deleted', 'success'); }
      else showToast(r.error || 'Failed to delete', 'error');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const viewCustomer = async (id: string) => {
    try {
      const r = await apiClient.get(`/api/customers/${id}`);
      if (r.success) { setSelected(r.data); setShowDetail(true); }
      else showToast(r.error || 'Failed to load details', 'error');
    } catch { showToast('Failed to load details', 'error'); }
  };

  const handleEdit = (c: Customer) => {
    setEditing(c);
    setFormData({
      first_name: c.first_name, last_name: c.last_name || '', mobile: c.mobile,
      alternate_mobile: c.alternate_mobile || '', email: c.email || '',
      gender: c.gender || '', date_of_birth: c.date_of_birth?.split('T')[0] || '',
      aadhaar_number: c.aadhaar_number || '', pan_number: c.pan_number || '',
      gst_number: c.gst_number || '', driving_license_number: c.driving_license_number || '',
      customer_type: c.customer_type, business_name: c.business_name || '',
      occupation: c.occupation || '', annual_income_range: c.annual_income_range || '',
      has_home_charging: c.has_home_charging, charging_capacity_available: c.charging_capacity_available || '',
      is_ev_first_time: c.is_ev_first_time, previous_vehicle_type: c.previous_vehicle_type || '',
      address_line1: c.address_line1, address_line2: c.address_line2 || '',
      city: c.city, state: c.state, country: c.country, pincode: c.pincode,
      latitude: c.latitude?.toString() || '', longitude: c.longitude?.toString() || '',
      preferred_language: c.preferred_language, whatsapp_opt_in: c.whatsapp_opt_in,
      sms_opt_in: c.sms_opt_in, email_opt_in: c.email_opt_in, promotional_opt_in: c.promotional_opt_in,
      source: c.source || 'Walk-in', referred_by: c.referred_by || '',
      lead_status: c.lead_status, customer_status: c.customer_status,
      first_contact_date: c.first_contact_date || '', last_contact_date: c.last_contact_date || '',
      expected_purchase_month: c.expected_purchase_month || '', notes: c.notes || '',
      tags: Array.isArray(c.tags) ? c.tags.join(', ') : '',
      emergency_contact_name: c.emergency_contact_name || '',
      emergency_contact_number: c.emergency_contact_number || '',
      emergency_contact_relation: c.emergency_contact_relation || '',
      assigned_sales_executive_id: c.assigned_sales_executive_id || '',
    });
    setActiveTab('basic'); setSectionErr(''); setFormErrors({}); setShowModal(true);
  };

  const handleSubmit = () => { if (validateForm()) { editingCustomer ? updateCustomer() : createCustomer(); } };

  const set = (patch: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...patch }));

  // ─── Stat cards config ────────────────────────────────────────────────────

  const statCards = [
    { label: 'Total Customers', value: stats.total,                             icon: <Users className="w-5 h-5" />,    accent: 'border-l-primary',    text: 'text-foreground'  },
    { label: 'Active',          value: stats.active,                            icon: <CheckCircle className="w-5 h-5" />, accent: 'border-l-emerald-500', text: 'text-emerald-600' },
    { label: 'VIP',             value: stats.vip,                               icon: <Star className="w-5 h-5" />,     accent: 'border-l-amber-500',  text: 'text-amber-600'   },
    { label: 'Converted',       value: stats.converted,                         icon: <TrendingUp className="w-5 h-5" />, accent: 'border-l-violet-500', text: 'text-violet-600'  },
    { label: 'Loyalty Points',  value: stats.totalLoyaltyPoints.toLocaleString(), icon: <Award className="w-5 h-5" />,  accent: 'border-l-orange-500', text: 'text-orange-600'  },
    { label: 'Vehicles',        value: stats.totalVehicles,                     icon: <Zap className="w-5 h-5" />,      accent: 'border-l-sky-500',    text: 'text-sky-600'     },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Loading…' : `${totalCustomers} customer${totalCustomers !== 1 ? 's' : ''} in database`}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setEditing(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* ── Toolbar ─────────────────────────────────────��───────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customers…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/60'}`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {Object.values(filters).some(Boolean) && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
        </button>
        <button
          onClick={loadCustomers}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

        {/* ── Filter bar ──────────────────────────────────────────────────── */}
        {showFilters && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'lead_status', label: 'Lead Status', opts: ['New','Contacted','Interested','Test Ride Done','Negotiation','Converted','Lost','Follow-up'] },
              { key: 'customer_status', label: 'Status', opts: ['Active','Inactive','Blocked','VIP'] },
              { key: 'customer_type', label: 'Type', opts: ['Individual','Corporate','Dealer','Fleet Operator','Government'] },
              { key: 'source', label: 'Source', opts: ['Walk-in','Website','Facebook','Instagram','Google','Referral','Test Ride','EV Expo'] },
            ].map(f => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                <select
                  value={filters[f.key as keyof typeof filters]}
                  onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
                  className={selectCls}
                >
                  <option value="">All</option>
                  {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* ── Table ───────────────────────────────────────────────────────── */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Customer</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Contact</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Type / Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Location</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Lead</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Executive</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium text-muted-foreground">Vehicles</th>
                  <th className="px-5 py-3.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + j * 8}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-7 h-7" />
                        </div>
                        <p className="font-medium">No customers found</p>
                        <p className="text-xs">Try adjusting your search or filters</p>
                      </div>
                    </td>
                  </tr>
                ) : customers.map(c => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${avatarColor(c.first_name)}`}>
                          {getInitials(c.first_name, c.last_name)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{c.first_name} {c.last_name || ''}</p>
                          <p className="text-xs text-muted-foreground">{c.customer_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-foreground">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        {c.mobile}
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          {c.email}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-muted-foreground mb-1">{c.customer_type}</p>
                      <Chip label={c.customer_status} map={statusChip} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 text-foreground">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        {c.city}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.state}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <Chip label={c.lead_status} map={leadChip} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-foreground truncate max-w-[120px]">
                          {c.assigned_sales_executive?.full_name || <span className="text-muted-foreground italic">Unassigned</span>}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-foreground">{c.total_vehicles_owned || 0}</p>
                      <p className="text-xs text-muted-foreground">₹{(c.total_purchase_amount || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => viewCustomer(c.id)}
                          className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCustomer(c.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && customers.length > 0 && (
            <div className="px-5 py-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3 bg-muted/20">
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{((currentPage - 1) * 20) + 1}–{Math.min(currentPage * 20, totalCustomers)}</span> of <span className="font-medium text-foreground">{totalCustomers}</span> customers
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <span className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-medium text-foreground bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      {/* ── Add/Edit Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Step {curIdx + 1} of {tabs.length} — <span className="text-foreground font-medium">{tabs[curIdx].label}</span>
                  {tabs[curIdx].mandatory.length > 0 && <span className="text-red-500 ml-1 text-xs">* required fields</span>}
                </p>
              </div>
              <button
                onClick={() => { setShowModal(false); setEditing(null); resetForm(); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress */}
            <div className="h-1 bg-muted flex-shrink-0">
              <div
                className="h-1 bg-primary transition-all duration-300"
                style={{ width: `${((curIdx + 1) / tabs.length) * 100}%` }}
              />
            </div>

            <div className="flex flex-1 min-h-0">
              {/* Sidebar tab nav */}
              <aside className="w-48 flex-shrink-0 border-r border-border bg-muted/30 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
                {tabs.map((tab, i) => (
                  <button
                    key={tab.key}
                    onClick={() => switchTab(tab.key)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                      activeTab === tab.key
                        ? 'bg-primary text-primary-foreground'
                        : i < curIdx
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {i < curIdx ? <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-500" /> : tab.icon}
                    <span className="truncate">{tab.label}</span>
                    {tab.mandatory.length > 0 && <span className="ml-auto text-red-400 text-xs">*</span>}
                  </button>
                ))}
              </aside>

              {/* Form content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {sectionErr && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {sectionErr}
                  </div>
                )}

                {/* Basic Info */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="First Name" required error={formErrors.first_name}>
                      <input type="text" value={formData.first_name} onChange={e => set({ first_name: e.target.value })} className={inputCls(formErrors.first_name)} />
                    </FormField>
                    <FormField label="Last Name">
                      <input type="text" value={formData.last_name} onChange={e => set({ last_name: e.target.value })} className={inputCls()} />
                    </FormField>
                    <FormField label="Mobile" required error={formErrors.mobile}>
                      <input type="tel" value={formData.mobile} onChange={e => set({ mobile: e.target.value })} className={inputCls(formErrors.mobile)} placeholder="10 digit number" />
                    </FormField>
                    <FormField label="Alternate Mobile">
                      <input type="tel" value={formData.alternate_mobile} onChange={e => set({ alternate_mobile: e.target.value })} className={inputCls()} />
                    </FormField>
                    <FormField label="Email" error={formErrors.email}>
                      <input type="email" value={formData.email} onChange={e => set({ email: e.target.value })} className={inputCls(formErrors.email)} />
                    </FormField>
                    <FormField label="Gender">
                      <select value={formData.gender} onChange={e => set({ gender: e.target.value })} className={selectCls}>
                        <option value="">Select</option>
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </FormField>
                    <FormField label="Date of Birth">
                      <input type="date" value={formData.date_of_birth} onChange={e => set({ date_of_birth: e.target.value })} className={inputCls()} />
                    </FormField>
                    <FormField label="Customer Type">
                      <select value={formData.customer_type} onChange={e => set({ customer_type: e.target.value })} className={selectCls}>
                        <option>Individual</option><option>Corporate</option><option>Dealer</option>
                        <option>Fleet Operator</option><option>Government</option>
                      </select>
                    </FormField>
                    {formData.customer_type !== 'Individual' && (
                      <FormField label="Business Name">
                        <input type="text" value={formData.business_name} onChange={e => set({ business_name: e.target.value })} className={inputCls()} />
                      </FormField>
                    )}
                    <FormField label="Occupation">
                      <input type="text" value={formData.occupation} onChange={e => set({ occupation: e.target.value })} className={inputCls()} />
                    </FormField>
                    <FormField label="Annual Income Range">
                      <select value={formData.annual_income_range} onChange={e => set({ annual_income_range: e.target.value })} className={selectCls}>
                        <option value="">Select</option>
                        <option>{'< 3 Lakhs'}</option><option>3-5 Lakhs</option><option>5-10 Lakhs</option>
                        <option>10-20 Lakhs</option><option>{'> 20 Lakhs'}</option>
                      </select>
                    </FormField>
                  </div>
                )}

                {/* Government IDs */}
                {activeTab === 'government' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Aadhaar Number">
                      <input type="text" value={formData.aadhaar_number} onChange={e => set({ aadhaar_number: e.target.value })} className={inputCls()} placeholder="12 digit number" />
                    </FormField>
                    <FormField label="PAN Number">
                      <input type="text" value={formData.pan_number} onChange={e => set({ pan_number: e.target.value })} className={inputCls()} placeholder="ABCDE1234F" />
                    </FormField>
                    <FormField label="GST Number">
                      <input type="text" value={formData.gst_number} onChange={e => set({ gst_number: e.target.value })} className={inputCls()} placeholder="22AAAAA0000A1Z5" />
                    </FormField>
                    <FormField label="Driving License Number">
                      <input type="text" value={formData.driving_license_number} onChange={e => set({ driving_license_number: e.target.value })} className={inputCls()} />
                    </FormField>
                  </div>
                )}

                {/* EV Preferences */}
                {activeTab === 'ev' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                        <input type="checkbox" checked={formData.has_home_charging} onChange={e => set({ has_home_charging: e.target.checked })} className="rounded accent-primary" />
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-medium text-foreground">Has Home Charging Setup</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                        <input type="checkbox" checked={formData.is_ev_first_time} onChange={e => set({ is_ev_first_time: e.target.checked })} className="rounded accent-primary" />
                        <div className="flex items-center gap-2">
                          <Battery className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-medium text-foreground">First Time EV Buyer</span>
                        </div>
                      </label>
                    </div>
                    <FormField label="Charging Capacity Available">
                      <input type="text" value={formData.charging_capacity_available} onChange={e => set({ charging_capacity_available: e.target.value })} className={inputCls()} placeholder="e.g. 3.3 kW, 7.4 kW" />
                    </FormField>
                    <FormField label="Previous Vehicle Type">
                      <input type="text" value={formData.previous_vehicle_type} onChange={e => set({ previous_vehicle_type: e.target.value })} className={inputCls()} placeholder="Petrol, Diesel, CNG…" />
                    </FormField>
                  </div>
                )}

                {/* Address */}
                {activeTab === 'address' && (
                  <div className="space-y-4">
                    <FormField label="Address Line 1" required error={formErrors.address_line1}>
                      <input type="text" value={formData.address_line1} onChange={e => set({ address_line1: e.target.value })} className={inputCls(formErrors.address_line1)} />
                    </FormField>
                    <FormField label="Address Line 2">
                      <input type="text" value={formData.address_line2} onChange={e => set({ address_line2: e.target.value })} className={inputCls()} />
                    </FormField>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField label="City" required error={formErrors.city}>
                        <input type="text" value={formData.city} onChange={e => set({ city: e.target.value })} className={inputCls(formErrors.city)} />
                      </FormField>
                      <FormField label="State" required error={formErrors.state}>
                        <input type="text" value={formData.state} onChange={e => set({ state: e.target.value })} className={inputCls(formErrors.state)} />
                      </FormField>
                      <FormField label="Pincode" required error={formErrors.pincode}>
                        <input type="text" value={formData.pincode} onChange={e => set({ pincode: e.target.value })} className={inputCls(formErrors.pincode)} maxLength={6} />
                      </FormField>
                    </div>
                    <FormField label="Country">
                      <input type="text" value={formData.country} onChange={e => set({ country: e.target.value })} className={inputCls()} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField label="Latitude">
                        <input type="text" value={formData.latitude} onChange={e => set({ latitude: e.target.value })} className={inputCls()} />
                      </FormField>
                      <FormField label="Longitude">
                        <input type="text" value={formData.longitude} onChange={e => set({ longitude: e.target.value })} className={inputCls()} />
                      </FormField>
                    </div>
                  </div>
                )}

                {/* Communication */}
                {activeTab === 'communication' && (
                  <div className="space-y-5">
                    <FormField label="Preferred Language">
                      <select value={formData.preferred_language} onChange={e => set({ preferred_language: e.target.value })} className={selectCls}>
                        {['English','Hindi','Tamil','Telugu','Kannada','Malayalam','Marathi','Gujarati','Bengali'].map(l => <option key={l}>{l}</option>)}
                      </select>
                    </FormField>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-3">Communication Preferences</p>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'whatsapp_opt_in', label: 'WhatsApp', icon: <MessageSquare className="w-4 h-4 text-emerald-500" /> },
                          { key: 'sms_opt_in',      label: 'SMS',      icon: <Smartphone className="w-4 h-4 text-blue-500" /> },
                          { key: 'email_opt_in',    label: 'Email',    icon: <Mail className="w-4 h-4 text-violet-500" /> },
                          { key: 'promotional_opt_in', label: 'Promotional', icon: <Bell className="w-4 h-4 text-amber-500" /> },
                        ].map(opt => (
                          <label key={opt.key} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                            <input
                              type="checkbox"
                              checked={formData[opt.key as keyof typeof formData] as boolean}
                              onChange={e => set({ [opt.key]: e.target.checked })}
                              className="rounded accent-primary"
                            />
                            {opt.icon}
                            <span className="text-sm font-medium text-foreground">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Lead */}
                {activeTab === 'lead' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Lead Source">
                        <select value={formData.source} onChange={e => set({ source: e.target.value })} className={selectCls}>
                          {['Walk-in','Website','Facebook','Instagram','Google','Referral','Test Ride','EV Expo','Cold Call','Other'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Lead Status">
                        <select value={formData.lead_status} onChange={e => set({ lead_status: e.target.value })} className={selectCls}>
                          {['New','Contacted','Interested','Test Ride Done','Negotiation','Converted','Lost','Follow-up'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Customer Status">
                        <select value={formData.customer_status} onChange={e => set({ customer_status: e.target.value })} className={selectCls}>
                          {['Active','Inactive','Blocked','VIP'].map(o => <option key={o}>{o}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Assigned Sales Executive">
                        <select value={formData.assigned_sales_executive_id} onChange={e => set({ assigned_sales_executive_id: e.target.value })} className={selectCls}>
                          <option value="">Unassigned</option>
                          {executives.map(ex => <option key={ex.id} value={ex.id}>{ex.full_name}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Referred By">
                        <input type="text" value={formData.referred_by} onChange={e => set({ referred_by: e.target.value })} className={inputCls()} placeholder="Customer code or name" />
                      </FormField>
                      <FormField label="Expected Purchase Month">
                        <input type="month" value={formData.expected_purchase_month} onChange={e => set({ expected_purchase_month: e.target.value })} className={inputCls()} />
                      </FormField>
                    </div>
                    <FormField label="Notes">
                      <textarea rows={3} value={formData.notes} onChange={e => set({ notes: e.target.value })} className={inputCls()} placeholder="Additional notes…" />
                    </FormField>
                    <FormField label="Tags">
                      <input type="text" value={formData.tags} onChange={e => set({ tags: e.target.value })} className={inputCls()} placeholder="Comma separated tags" />
                    </FormField>
                  </div>
                )}

                {/* Emergency */}
                {activeTab === 'emergency' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Contact Name">
                      <input type="text" value={formData.emergency_contact_name} onChange={e => set({ emergency_contact_name: e.target.value })} className={inputCls()} />
                    </FormField>
                    <FormField label="Contact Number">
                      <input type="tel" value={formData.emergency_contact_number} onChange={e => set({ emergency_contact_number: e.target.value })} className={inputCls()} />
                    </FormField>
                    <FormField label="Relation">
                      <input type="text" value={formData.emergency_contact_relation} onChange={e => set({ emergency_contact_relation: e.target.value })} className={inputCls()} placeholder="Spouse, Parent, Sibling…" />
                    </FormField>
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20 flex-shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowModal(false); setEditing(null); resetForm(); }}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                {!isFirst && (
                  <button onClick={goPrev} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{curIdx + 1} / {tabs.length}</span>
                {!isLast ? (
                  <button onClick={goNext} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Saving…' : editingCustomer ? 'Update Customer' : 'Create Customer'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ──────────────────────────────────────────────────── */}
      {showDetail && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">

            {/* Detail header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${avatarColor(selectedCustomer.first_name)}`}>
                    {getInitials(selectedCustomer.first_name, selectedCustomer.last_name)}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {selectedCustomer.first_name} {selectedCustomer.last_name || ''}
                    </h2>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.customer_code} · Referral: {selectedCustomer.referral_code || 'N/A'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Chip label={selectedCustomer.customer_status} map={statusChip} />
                      <Chip label={selectedCustomer.lead_status} map={leadChip} />
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowDetail(false)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Vehicles Owned',   value: selectedCustomer.total_vehicles_owned || 0,                             icon: <Zap className="w-4 h-4" />,     color: 'text-primary'    },
                  { label: 'Total Purchase',    value: `₹${(selectedCustomer.total_purchase_amount || 0).toLocaleString()}`,  icon: <TrendingUp className="w-4 h-4" />, color: 'text-emerald-600' },
                  { label: 'Loyalty Points',   value: selectedCustomer.loyalty_points || 0,                                   icon: <Award className="w-4 h-4" />,    color: 'text-amber-600'  },
                ].map(s => (
                  <div key={s.label} className="bg-muted/40 rounded-xl p-4 border border-border">
                    <div className={`${s.color} mb-1`}>{s.icon}</div>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal */}
                <section className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                    <User className="w-4 h-4 text-primary" /> Personal Info
                  </h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <FieldRow label="Mobile"     value={selectedCustomer.mobile} />
                    <FieldRow label="Alt Mobile" value={selectedCustomer.alternate_mobile} />
                    {selectedCustomer.email && (
                      <div className="col-span-2 flex flex-col gap-0.5">
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
                        <dd className="text-sm text-foreground break-all">{selectedCustomer.email}</dd>
                      </div>
                    )}
                    <FieldRow label="Gender"     value={selectedCustomer.gender} />
                    <FieldRow label="DOB"        value={selectedCustomer.date_of_birth ? new Date(selectedCustomer.date_of_birth).toLocaleDateString() : null} />
                    <FieldRow label="Occupation" value={selectedCustomer.occupation} />
                    <FieldRow label="Income"     value={selectedCustomer.annual_income_range} />
                    <FieldRow label="Language"   value={selectedCustomer.preferred_language} />
                  </dl>
                </section>

                {/* Business */}
                <section className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                    <Building2 className="w-4 h-4 text-primary" /> Business & IDs
                  </h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <FieldRow label="Type"     value={selectedCustomer.customer_type} />
                    <FieldRow label="Business" value={selectedCustomer.business_name} />
                    <FieldRow label="PAN"      value={selectedCustomer.pan_number} />
                    <FieldRow label="GST"      value={selectedCustomer.gst_number} />
                    <FieldRow label="Aadhaar"  value={selectedCustomer.aadhaar_number} />
                    <FieldRow label="DL"       value={selectedCustomer.driving_license_number} />
                  </dl>
                </section>

                {/* Address */}
                <section className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                    <MapPin className="w-4 h-4 text-primary" /> Address
                  </h3>
                  <p className="text-sm text-foreground">{selectedCustomer.address_line1}</p>
                  {selectedCustomer.address_line2 && <p className="text-sm text-foreground">{selectedCustomer.address_line2}</p>}
                  <p className="text-sm text-foreground">{selectedCustomer.city}, {selectedCustomer.state} – {selectedCustomer.pincode}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.country}</p>
                </section>

                {/* EV Prefs */}
                <section className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                    <Battery className="w-4 h-4 text-primary" /> EV Preferences
                  </h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <FieldRow label="First Time EV"   value={selectedCustomer.is_ev_first_time ? 'Yes' : 'No'} />
                    <FieldRow label="Home Charging"   value={selectedCustomer.has_home_charging ? 'Yes' : 'No'} />
                    <FieldRow label="Capacity"        value={selectedCustomer.charging_capacity_available} />
                    <FieldRow label="Previous Vehicle" value={selectedCustomer.previous_vehicle_type} />
                  </dl>
                </section>

                {/* Lead */}
                <section className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                    <Target className="w-4 h-4 text-primary" /> Lead Info
                  </h3>
                  <dl className="grid grid-cols-2 gap-3">
                    <FieldRow label="Source"    value={selectedCustomer.source} />
                    <FieldRow label="Referred"  value={selectedCustomer.referred_by} />
                    <FieldRow label="Executive" value={selectedCustomer.assigned_sales_executive?.full_name} />
                    <FieldRow label="Expected"  value={selectedCustomer.expected_purchase_month} />
                  </dl>
                  {selectedCustomer.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {selectedCustomer.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{t}</span>
                      ))}
                    </div>
                  )}
                </section>

                {/* Emergency */}
                <section className="bg-muted/30 rounded-xl border border-border p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 pb-2 border-b border-border">
                    <PhoneCall className="w-4 h-4 text-primary" /> Emergency Contact
                  </h3>
                  {selectedCustomer.emergency_contact_name ? (
                    <dl className="grid grid-cols-2 gap-3">
                      <FieldRow label="Name"     value={selectedCustomer.emergency_contact_name} />
                      <FieldRow label="Number"   value={selectedCustomer.emergency_contact_number} />
                      <FieldRow label="Relation" value={selectedCustomer.emergency_contact_relation} />
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No emergency contact saved</p>
                  )}
                </section>
              </div>

              {selectedCustomer.notes && (
                <section className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Notes
                  </h3>
                  <p className="text-sm text-amber-900 leading-relaxed">{selectedCustomer.notes}</p>
                </section>
              )}

              <p className="text-xs text-muted-foreground mt-6 border-t border-border pt-4">
                Added {new Date(selectedCustomer.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })} · Last updated {new Date(selectedCustomer.updated_at).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              </p>
            </div>

            <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
              <button
                onClick={() => { setShowDetail(false); handleEdit(selectedCustomer); }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Edit className="w-4 h-4" /> Edit Customer
              </button>
              <button onClick={() => setShowDetail(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
