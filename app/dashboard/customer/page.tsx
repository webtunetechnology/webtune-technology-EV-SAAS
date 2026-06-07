// app/customers/page.tsx - With blur effect on modals and validation-based navigation

'use client';

import { apiClient } from '@/lib/supabase/api-client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';
import { 
  User,
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  X, 
  Plus,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Users,
  Building2,
  Shield,
  Star,
  Target,
  Bell,
  Calendar,
  Tag,
  Briefcase,
  Zap,
  Battery,
  Globe,
  Languages,
  MessageSquare,
  Smartphone,
  FileText,
  Link,
  PhoneCall,
  Award,
  TrendingUp,
  UserPlus
} from 'lucide-react';

// Types
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

// Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <div className={`${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2`}>
        {icons[type]}
        <span>{message}</span>
      </div>
    </div>
  );
};

// StatusBadge Component
const StatusBadge = ({ status, type }: { status: string; type: 'lead' | 'customer' }) => {
  const leadColors: Record<string, string> = {
    New: 'bg-blue-100 text-blue-800',
    Contacted: 'bg-purple-100 text-purple-800',
    Interested: 'bg-indigo-100 text-indigo-800',
    'Test Ride Done': 'bg-cyan-100 text-cyan-800',
    Negotiation: 'bg-orange-100 text-orange-800',
    Converted: 'bg-green-100 text-green-800',
    Lost: 'bg-red-100 text-red-800',
    'Follow-up': 'bg-pink-100 text-pink-800',
  };
  
  const customerColors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-800',
    Blocked: 'bg-red-100 text-red-800',
    VIP: 'bg-yellow-100 text-yellow-800',
  };

  const leadIcons: Record<string, React.ReactNode> = {
    New: <Star className="w-3 h-3" />,
    Contacted: <Phone className="w-3 h-3" />,
    Interested: <Target className="w-3 h-3" />,
    'Test Ride Done': <CheckCircle className="w-3 h-3" />,
    Negotiation: <TrendingUp className="w-3 h-3" />,
    Converted: <CheckCircle className="w-3 h-3" />,
    Lost: <X className="w-3 h-3" />,
    'Follow-up': <Bell className="w-3 h-3" />,
  };

  const customerIcons: Record<string, React.ReactNode> = {
    Active: <CheckCircle className="w-3 h-3" />,
    Inactive: <AlertCircle className="w-3 h-3" />,
    Blocked: <Shield className="w-3 h-3" />,
    VIP: <Star className="w-3 h-3" />,
  };

  const colors = type === 'lead' ? leadColors : customerColors;
  const icons = type === 'lead' ? leadIcons : customerIcons;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 whitespace-nowrap ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {icons[status]}
      {status}
    </span>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
      ))}
    </div>
    <div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>
  </div>
);

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    vip: 0,
    converted: 0,
    totalLoyaltyPoints: 0,
    totalVehicles: 0
  });
  const [salesExecutives, setSalesExecutives] = useState<SalesExecutive[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [filters, setFilters] = useState({
    lead_status: '',
    customer_status: '',
    customer_type: '',
    source: '',
  });

  // Tab configuration with mandatory fields
  const tabs = useMemo(() => [
    { 
      key: 'basic', 
      label: 'Basic Info', 
      icon: <User className="w-4 h-4" />,
      mandatoryFields: ['first_name', 'mobile']
    },
    { 
      key: 'government', 
      label: 'Government IDs', 
      icon: <CreditCard className="w-4 h-4" />,
      mandatoryFields: [] // All fields optional
    },
    { 
      key: 'ev', 
      label: 'EV Preferences', 
      icon: <Battery className="w-4 h-4" />,
      mandatoryFields: [] // All fields optional
    },
    { 
      key: 'address', 
      label: 'Address', 
      icon: <MapPin className="w-4 h-4" />,
      mandatoryFields: ['address_line1', 'city', 'state', 'pincode']
    },
    { 
      key: 'communication', 
      label: 'Communication', 
      icon: <MessageSquare className="w-4 h-4" />,
      mandatoryFields: [] // All fields optional
    },
    { 
      key: 'lead', 
      label: 'Lead Management', 
      icon: <Target className="w-4 h-4" />,
      mandatoryFields: [] // All fields optional
    },
    { 
      key: 'emergency', 
      label: 'Emergency Contact', 
      icon: <PhoneCall className="w-4 h-4" />,
      mandatoryFields: [] // All fields optional
    },
  ], []);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    mobile: '',
    alternate_mobile: '',
    email: '',
    gender: '',
    date_of_birth: '',
    aadhaar_number: '',
    pan_number: '',
    gst_number: '',
    driving_license_number: '',
    customer_type: 'Individual',
    business_name: '',
    occupation: '',
    annual_income_range: '',
    has_home_charging: false,
    charging_capacity_available: '',
    is_ev_first_time: true,
    previous_vehicle_type: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    latitude: '',
    longitude: '',
    preferred_language: 'English',
    whatsapp_opt_in: true,
    sms_opt_in: true,
    email_opt_in: true,
    promotional_opt_in: false,
    source: 'Walk-in',
    referred_by: '',
    lead_status: 'New',
    customer_status: 'Active',
    first_contact_date: new Date().toISOString().split('T')[0],
    last_contact_date: '',
    expected_purchase_month: '',
    notes: '',
    tags: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
    emergency_contact_relation: '',
    assigned_sales_executive_id: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sectionError, setSectionError] = useState('');

  // Validate mandatory fields for current section
  const validateCurrentSection = (): boolean => {
    const currentTab = tabs[currentTabIndex];
    const errors: Record<string, string> = {};
    
    currentTab.mandatoryFields.forEach(field => {
      const value = formData[field as keyof typeof formData];
      if (!value || (typeof value === 'string' && !value.trim())) {
        const fieldLabels: Record<string, string> = {
          first_name: 'First name',
          mobile: 'Mobile number',
          address_line1: 'Address line 1',
          city: 'City',
          state: 'State',
          pincode: 'Pincode'
        };
        errors[field] = `${fieldLabels[field] || field} is required`;
      } else if (field === 'mobile' && typeof value === 'string' && !/^[0-9]{10}$/.test(value)) {
        errors[field] = 'Mobile must be 10 digits';
      } else if (field === 'pincode' && typeof value === 'string' && !/^[0-9]{6}$/.test(value)) {
        errors[field] = 'Pincode must be 6 digits';
      } else if (field === 'email' && value && typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors[field] = 'Invalid email format';
      }
    });
    
    setFormErrors(prev => ({ ...prev, ...errors }));
    
    if (Object.keys(errors).length > 0) {
      setSectionError(`Please fill in all required fields in the ${currentTab.label} section`);
      return false;
    }
    
    setSectionError('');
    return true;
  };

  // Navigate to next/previous tab with validation
  const goToNextTab = () => {
    if (!validateCurrentSection()) {
      return;
    }
    
    const currentIndex = tabs.findIndex(tab => tab.key === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].key);
      setSectionError('');
    }
  };

  const goToPreviousTab = () => {
    const currentIndex = tabs.findIndex(tab => tab.key === activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1].key);
      setSectionError('');
    }
  };

  const switchTab = (tabKey: string) => {
    // Validate current section before switching
    if (!validateCurrentSection()) {
      return;
    }
    setActiveTab(tabKey);
    setSectionError('');
  };

  const currentTabIndex = tabs.findIndex(tab => tab.key === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabs.length - 1;

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal || showDetailModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showDetailModal]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        loadCustomers();
      } else {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadCustomers();
    loadStats();
    loadSalesExecutives();
  }, [currentPage, filters]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (filters.lead_status) params.append('lead_status', filters.lead_status);
      if (filters.customer_status) params.append('customer_status', filters.customer_status);
      if (filters.customer_type) params.append('customer_type', filters.customer_type);
      if (filters.source) params.append('source', filters.source);

      const result = await apiClient.get(`/api/customers?${params}`);
      if (result.success) {
        setCustomers(result.data);
        setTotalPages(result.totalPages);
        setTotalCustomers(result.total);
      }
    } catch (error) {
      showToast('Failed to load customers', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filters]);

  const loadStats = useCallback(async () => {
    try {
      const result = await apiClient.get('/api/customers-stats');
      if (result.success) setStats(result.stats);
    } catch (error) {
      // Silent fail for stats
    }
  }, []);

  const loadSalesExecutives = useCallback(async () => {
    try {
      const result = await apiClient.get('/api/sales-executives');
      if (result.success) setSalesExecutives(result.data);
    } catch (error) {
      // Silent fail for sales executives
    }
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.first_name?.trim()) errors.first_name = 'First name is required';
    if (!formData.mobile?.trim()) errors.mobile = 'Mobile number is required';
    else if (!/^[0-9]{10}$/.test(formData.mobile)) errors.mobile = 'Mobile must be 10 digits';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email';
    if (!formData.address_line1?.trim()) errors.address_line1 = 'Address is required';
    if (!formData.city?.trim()) errors.city = 'City is required';
    if (!formData.state?.trim()) errors.state = 'State is required';
    if (!formData.pincode?.trim()) errors.pincode = 'Pincode is required';
    else if (!/^[0-9]{6}$/.test(formData.pincode)) errors.pincode = 'Pincode must be 6 digits';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      mobile: '',
      alternate_mobile: '',
      email: '',
      gender: '',
      date_of_birth: '',
      aadhaar_number: '',
      pan_number: '',
      gst_number: '',
      driving_license_number: '',
      customer_type: 'Individual',
      business_name: '',
      occupation: '',
      annual_income_range: '',
      has_home_charging: false,
      charging_capacity_available: '',
      is_ev_first_time: true,
      previous_vehicle_type: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      latitude: '',
      longitude: '',
      preferred_language: 'English',
      whatsapp_opt_in: true,
      sms_opt_in: true,
      email_opt_in: true,
      promotional_opt_in: false,
      source: 'Walk-in',
      referred_by: '',
      lead_status: 'New',
      customer_status: 'Active',
      first_contact_date: new Date().toISOString().split('T')[0],
      last_contact_date: '',
      expected_purchase_month: '',
      notes: '',
      tags: '',
      emergency_contact_name: '',
      emergency_contact_number: '',
      emergency_contact_relation: '',
      assigned_sales_executive_id: '',
    });
    setFormErrors({});
    setSectionError('');
    setActiveTab('basic');
  };

  const prepareSubmitData = (data: typeof formData) => {
    return {
      ...data,
      assigned_sales_executive_id: data.assigned_sales_executive_id === '' ? null : data.assigned_sales_executive_id,
      alternate_mobile: data.alternate_mobile === '' ? null : data.alternate_mobile,
      email: data.email === '' ? null : data.email,
      gender: data.gender === '' ? null : data.gender,
      date_of_birth: data.date_of_birth === '' ? null : data.date_of_birth,
      business_name: data.business_name === '' ? null : data.business_name,
      occupation: data.occupation === '' ? null : data.occupation,
      annual_income_range: data.annual_income_range === '' ? null : data.annual_income_range,
      aadhaar_number: data.aadhaar_number === '' ? null : data.aadhaar_number,
      pan_number: data.pan_number === '' ? null : data.pan_number,
      gst_number: data.gst_number === '' ? null : data.gst_number,
      driving_license_number: data.driving_license_number === '' ? null : data.driving_license_number,
      charging_capacity_available: data.charging_capacity_available === '' ? null : data.charging_capacity_available,
      previous_vehicle_type: data.previous_vehicle_type === '' ? null : data.previous_vehicle_type,
      referred_by: data.referred_by === '' ? null : data.referred_by,
      notes: data.notes === '' ? null : data.notes,
      emergency_contact_name: data.emergency_contact_name === '' ? null : data.emergency_contact_name,
      emergency_contact_number: data.emergency_contact_number === '' ? null : data.emergency_contact_number,
      emergency_contact_relation: data.emergency_contact_relation === '' ? null : data.emergency_contact_relation,
      latitude: data.latitude === '' ? null : parseFloat(data.latitude),
      longitude: data.longitude === '' ? null : parseFloat(data.longitude),
      tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
    };
  };

  const createCustomer = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const submitData = prepareSubmitData(formData);
      const result = await apiClient.post('/api/customers', submitData);
      if (result.success) {
        await loadCustomers();
        await loadStats();
        setShowModal(false);
        resetForm();
        showToast('Customer created successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to create customer', 'error');
      }
    } catch (error) {
      showToast('Failed to create customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCustomer = async () => {
    if (!editingCustomer || !validateForm()) return;
    setIsSubmitting(true);
    try {
      const submitData = prepareSubmitData(formData);
      const result = await apiClient.put(`/api/customers/${editingCustomer.id}`, submitData);
      if (result.success) {
        await loadCustomers();
        setShowModal(false);
        setEditingCustomer(null);
        resetForm();
        showToast('Customer updated successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to update customer', 'error');
      }
    } catch (error) {
      showToast('Failed to update customer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      const result = await apiClient.delete(`/api/customers/${customerId}`);
      if (result.success) {
        await loadCustomers();
        await loadStats();
        showToast('Customer deleted successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to delete customer', 'error');
      }
    } catch (error) {
      showToast('Failed to delete customer', 'error');
    }
  };

  const viewCustomer = async (customerId: string) => {
    try {
      const result = await apiClient.get(`/api/customers/${customerId}`);
      if (result.success) {
        setSelectedCustomer(result.data);
        setShowDetailModal(true);
      } else {
        showToast(result.error || 'Failed to load customer details', 'error');
      }
    } catch (error) {
      showToast('Failed to load customer details', 'error');
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name || '',
      mobile: customer.mobile,
      alternate_mobile: customer.alternate_mobile || '',
      email: customer.email || '',
      gender: customer.gender || '',
      date_of_birth: customer.date_of_birth?.split('T')[0] || '',
      aadhaar_number: customer.aadhaar_number || '',
      pan_number: customer.pan_number || '',
      gst_number: customer.gst_number || '',
      driving_license_number: customer.driving_license_number || '',
      customer_type: customer.customer_type,
      business_name: customer.business_name || '',
      occupation: customer.occupation || '',
      annual_income_range: customer.annual_income_range || '',
      has_home_charging: customer.has_home_charging,
      charging_capacity_available: customer.charging_capacity_available || '',
      is_ev_first_time: customer.is_ev_first_time,
      previous_vehicle_type: customer.previous_vehicle_type || '',
      address_line1: customer.address_line1,
      address_line2: customer.address_line2 || '',
      city: customer.city,
      state: customer.state,
      country: customer.country,
      pincode: customer.pincode,
      latitude: customer.latitude?.toString() || '',
      longitude: customer.longitude?.toString() || '',
      preferred_language: customer.preferred_language,
      whatsapp_opt_in: customer.whatsapp_opt_in,
      sms_opt_in: customer.sms_opt_in,
      email_opt_in: customer.email_opt_in,
      promotional_opt_in: customer.promotional_opt_in,
      source: customer.source || 'Walk-in',
      referred_by: customer.referred_by || '',
      lead_status: customer.lead_status,
      customer_status: customer.customer_status,
      first_contact_date: customer.first_contact_date || '',
      last_contact_date: customer.last_contact_date || '',
      expected_purchase_month: customer.expected_purchase_month || '',
      notes: customer.notes || '',
      tags: Array.isArray(customer.tags) ? customer.tags.join(', ') : '',
      emergency_contact_name: customer.emergency_contact_name || '',
      emergency_contact_number: customer.emergency_contact_number || '',
      emergency_contact_relation: customer.emergency_contact_relation || '',
      assigned_sales_executive_id: customer.assigned_sales_executive_id || '',
    });
    setActiveTab('basic');
    setSectionError('');
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (validateForm()) {
      if (editingCustomer) {
        updateCustomer();
      } else {
        createCustomer();
      }
    }
  };

  if (loading && customers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header - Normal scrolling */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Customer Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage customers, track leads, and view purchase history</p>
            </div>
            <button
              onClick={() => { resetForm(); setEditingCustomer(null); setShowModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <UserPlus className="w-4 h-4" />
              Add Customer
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Total</p>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Active</p>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">VIP</p>
              <Star className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.vip}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Converted</p>
              <TrendingUp className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.converted}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Loyalty Points</p>
              <Award className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{stats.totalLoyaltyPoints.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Vehicles</p>
              <FileText className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-indigo-600">{stats.totalVehicles}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, mobile, email, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters {Object.values(filters).some(f => f) && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
            </button>
            <button 
              onClick={loadCustomers} 
              className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-lg border mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
            <select value={filters.lead_status} onChange={(e) => setFilters({ ...filters, lead_status: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Lead Status</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="Test Ride Done">Test Ride Done</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Converted">Converted</option>
              <option value="Lost">Lost</option>
              <option value="Follow-up">Follow-up</option>
            </select>
            <select value={filters.customer_status} onChange={(e) => setFilters({ ...filters, customer_status: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Blocked">Blocked</option>
              <option value="VIP">VIP</option>
            </select>
            <select value={filters.customer_type} onChange={(e) => setFilters({ ...filters, customer_type: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Types</option>
              <option value="Individual">Individual</option>
              <option value="Corporate">Corporate</option>
              <option value="Dealer">Dealer</option>
              <option value="Fleet Operator">Fleet Operator</option>
              <option value="Government">Government</option>
            </select>
            <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Sources</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Website">Website</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="Google">Google</option>
              <option value="Referral">Referral</option>
              <option value="Test Ride">Test Ride</option>
              <option value="EV Expo">EV Expo</option>
            </select>
          </div>
        )}

        {/* Customers Table - No horizontal scroll */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[18%]">
                  <div className="flex items-center gap-1"><User className="w-3 h-3" /> Customer</div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[18%]">
                  <div className="flex items-center gap-1"><Phone className="w-3 h-3" /> Contact</div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[14%]">
                  <div className="flex items-center gap-1"><Tag className="w-3 h-3" /> Type/Status</div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[12%]">
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[10%]">
                  <div className="flex items-center gap-1"><Target className="w-3 h-3" /> Lead</div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[12%]">
                  <div className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> Executive</div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[10%]">
                  <div className="flex items-center gap-1"><FileText className="w-3 h-3" /> Vehicles</div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[6%]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Loading customers...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-gray-300" />
                      <span>No customers found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{customer.first_name} {customer.last_name || ''}</div>
                      <div className="text-xs text-gray-500">Code: {customer.customer_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{customer.mobile}</span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{customer.email || 'No email'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm mb-1 flex items-center gap-1 whitespace-nowrap">
                        {customer.customer_type === 'Corporate' && <Building2 className="w-3 h-3 flex-shrink-0" />}
                        <span className="truncate">{customer.customer_type}</span>
                      </div>
                      <StatusBadge status={customer.customer_status} type="customer" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{customer.city}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">{customer.state}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={customer.lead_status} type="lead" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{customer.assigned_sales_executive?.full_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm whitespace-nowrap">{customer.total_vehicles_owned || 0} vehicles</div>
                      <div className="text-xs text-gray-500">₹{(customer.total_purchase_amount || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-1">
                        <button onClick={() => viewCustomer(customer.id)} className="text-blue-600 hover:text-blue-800 transition-colors p-1" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(customer)} className="text-green-600 hover:text-green-800 transition-colors p-1" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteCustomer(customer.id)} className="text-red-600 hover:text-red-800 transition-colors p-1" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {!loading && customers.length > 0 && (
            <div className="px-4 py-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalCustomers)} of {totalCustomers} customers
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer Form Modal - WITH BLUR EFFECT AND VALIDATION */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade-in">
            {/* Modal Header */}
            <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Section {currentTabIndex + 1} of {tabs.length}: {tabs[currentTabIndex].label}
                  {tabs[currentTabIndex].mandatoryFields.length > 0 && (
                    <span className="text-red-500 ml-2">* Required fields</span>
                  )}
                </p>
              </div>
              <button 
                onClick={() => { setShowModal(false); setEditingCustomer(null); resetForm(); }} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 h-1.5">
              <div 
                className="bg-blue-600 h-1.5 transition-all duration-300 ease-in-out"
                style={{ width: `${((currentTabIndex + 1) / tabs.length) * 100}%` }}
              ></div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Section Error Message */}
              {sectionError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{sectionError}</span>
                </div>
              )}

              {/* Tabs - Horizontal Scroll */}
              <div className="border-b mb-6">
                <div className="flex space-x-1 overflow-x-auto pb-2">
                  {tabs.map((tab, index) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => switchTab(tab.key)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${
                        activeTab === tab.key
                          ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                          : index < currentTabIndex
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      } ${tab.mandatoryFields.length > 0 && index > currentTabIndex ? 'font-semibold' : ''}`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      {tab.mandatoryFields.length > 0 && <span className="text-red-400 text-xs">*</span>}
                      {index < currentTabIndex && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div>
                {/* Basic Information Tab */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1">First Name *</label>
                      <input type="text" value={formData.first_name} onChange={(e) => setFormData({...formData, first_name: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.first_name ? 'border-red-500' : 'border-gray-300'}`} />
                      {formErrors.first_name && <p className="text-red-500 text-xs mt-1">{formErrors.first_name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Last Name</label>
                      <input type="text" value={formData.last_name} onChange={(e) => setFormData({...formData, last_name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Smartphone className="w-4 h-4" />
                        Mobile *
                      </label>
                      <input type="tel" value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.mobile ? 'border-red-500' : 'border-gray-300'}`} />
                      {formErrors.mobile && <p className="text-red-500 text-xs mt-1">{formErrors.mobile}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Alternate Mobile</label>
                      <input type="tel" value={formData.alternate_mobile} onChange={(e) => setFormData({...formData, alternate_mobile: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        Email
                      </label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`} />
                      {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Gender</label>
                      <select value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Date of Birth
                      </label>
                      <input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Customer Type</label>
                      <select value={formData.customer_type} onChange={(e) => setFormData({...formData, customer_type: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="Individual">Individual</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Dealer">Dealer</option>
                        <option value="Fleet Operator">Fleet Operator</option>
                        <option value="Government">Government</option>
                      </select>
                    </div>
                    {formData.customer_type !== 'Individual' && (
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          Business Name
                        </label>
                        <input type="text" value={formData.business_name} onChange={(e) => setFormData({...formData, business_name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        Occupation
                      </label>
                      <input type="text" value={formData.occupation} onChange={(e) => setFormData({...formData, occupation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Annual Income Range</label>
                      <select value={formData.annual_income_range} onChange={(e) => setFormData({...formData, annual_income_range: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Select</option>
                        <option value="< 3 Lakhs">&lt; 3 Lakhs</option>
                        <option value="3-5 Lakhs">3-5 Lakhs</option>
                        <option value="5-10 Lakhs">5-10 Lakhs</option>
                        <option value="10-20 Lakhs">10-20 Lakhs</option>
                        <option value="> 20 Lakhs">&gt; 20 Lakhs</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Government IDs Tab */}
                {activeTab === 'government' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        Aadhaar Number
                      </label>
                      <input type="text" value={formData.aadhaar_number} onChange={(e) => setFormData({...formData, aadhaar_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="12 digit number" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <CreditCard className="w-4 h-4" />
                        PAN Number
                      </label>
                      <input type="text" value={formData.pan_number} onChange={(e) => setFormData({...formData, pan_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ABCDE1234F" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        GST Number
                      </label>
                      <input type="text" value={formData.gst_number} onChange={(e) => setFormData({...formData, gst_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="22AAAAA0000A1Z" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        Driving License Number
                      </label>
                      <input type="text" value={formData.driving_license_number} onChange={(e) => setFormData({...formData, driving_license_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                )}

                {/* EV Preferences Tab */}
                {activeTab === 'ev' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center">
                        <input type="checkbox" checked={formData.has_home_charging} onChange={(e) => setFormData({...formData, has_home_charging: e.target.checked})} className="mr-2 rounded" />
                        <Zap className="w-4 h-4 mr-1" />
                        Has Home Charging Setup
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" checked={formData.is_ev_first_time} onChange={(e) => setFormData({...formData, is_ev_first_time: e.target.checked})} className="mr-2 rounded" />
                        <Battery className="w-4 h-4 mr-1" />
                        First Time EV Buyer
                      </label>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        Charging Capacity Available
                      </label>
                      <input type="text" value={formData.charging_capacity_available} onChange={(e) => setFormData({...formData, charging_capacity_available: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., 3.3kW, 7.4kW" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Previous Vehicle Type
                      </label>
                      <input type="text" value={formData.previous_vehicle_type} onChange={(e) => setFormData({...formData, previous_vehicle_type: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Petrol, Diesel, CNG, etc." />
                    </div>
                  </div>
                )}

                {/* Address Tab */}
                {activeTab === 'address' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        Address Line 1 *
                      </label>
                      <input type="text" value={formData.address_line1} onChange={(e) => setFormData({...formData, address_line1: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.address_line1 ? 'border-red-500' : 'border-gray-300'}`} />
                      {formErrors.address_line1 && <p className="text-red-500 text-xs mt-1">{formErrors.address_line1}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Address Line 2</label>
                      <input type="text" value={formData.address_line2} onChange={(e) => setFormData({...formData, address_line2: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">City *</label>
                        <input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.city ? 'border-red-500' : 'border-gray-300'}`} />
                        {formErrors.city && <p className="text-red-500 text-xs mt-1">{formErrors.city}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">State *</label>
                        <input type="text" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.state ? 'border-red-500' : 'border-gray-300'}`} />
                        {formErrors.state && <p className="text-red-500 text-xs mt-1">{formErrors.state}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Pincode *</label>
                        <input type="text" value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.pincode ? 'border-red-500' : 'border-gray-300'}`} />
                        {formErrors.pincode && <p className="text-red-500 text-xs mt-1">{formErrors.pincode}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Globe className="w-4 h-4" />
                        Country
                      </label>
                      <input type="text" value={formData.country} onChange={(e) => setFormData({...formData, country: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Latitude</label>
                        <input type="text" value={formData.latitude} onChange={(e) => setFormData({...formData, latitude: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Longitude</label>
                        <input type="text" value={formData.longitude} onChange={(e) => setFormData({...formData, longitude: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Communication Tab */}
                {activeTab === 'communication' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Languages className="w-4 h-4" />
                        Preferred Language
                      </label>
                      <select value={formData.preferred_language} onChange={(e) => setFormData({...formData, preferred_language: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="English">English</option>
                        <option value="Hindi">Hindi</option>
                        <option value="Tamil">Tamil</option>
                        <option value="Telugu">Telugu</option>
                        <option value="Kannada">Kannada</option>
                        <option value="Malayalam">Malayalam</option>
                        <option value="Marathi">Marathi</option>
                        <option value="Gujarati">Gujarati</option>
                        <option value="Bengali">Bengali</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input type="checkbox" checked={formData.whatsapp_opt_in} onChange={(e) => setFormData({...formData, whatsapp_opt_in: e.target.checked})} className="mr-2 rounded" />
                        <MessageSquare className="w-4 h-4 mr-1" />
                        WhatsApp Opt-in
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" checked={formData.sms_opt_in} onChange={(e) => setFormData({...formData, sms_opt_in: e.target.checked})} className="mr-2 rounded" />
                        <Smartphone className="w-4 h-4 mr-1" />
                        SMS Opt-in
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" checked={formData.email_opt_in} onChange={(e) => setFormData({...formData, email_opt_in: e.target.checked})} className="mr-2 rounded" />
                        <Mail className="w-4 h-4 mr-1" />
                        Email Opt-in
                      </label>
                      <label className="flex items-center">
                        <input type="checkbox" checked={formData.promotional_opt_in} onChange={(e) => setFormData({...formData, promotional_opt_in: e.target.checked})} className="mr-2 rounded" />
                        <Bell className="w-4 h-4 mr-1" />
                        Promotional Opt-in
                      </label>
                    </div>
                  </div>
                )}

                {/* Lead Management Tab */}
                {activeTab === 'lead' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Link className="w-4 h-4" />
                          Lead Source
                        </label>
                        <select value={formData.source} onChange={(e) => setFormData({...formData, source: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="Walk-in">Walk-in</option>
                          <option value="Website">Website</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Instagram">Instagram</option>
                          <option value="Google">Google</option>
                          <option value="Referral">Referral</option>
                          <option value="Test Ride">Test Ride</option>
                          <option value="EV Expo">EV Expo</option>
                          <option value="Cold Call">Cold Call</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          Lead Status
                        </label>
                        <select value={formData.lead_status} onChange={(e) => setFormData({...formData, lead_status: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="New">New</option>
                          <option value="Contacted">Contacted</option>
                          <option value="Interested">Interested</option>
                          <option value="Test Ride Done">Test Ride Done</option>
                          <option value="Negotiation">Negotiation</option>
                          <option value="Converted">Converted</option>
                          <option value="Lost">Lost</option>
                          <option value="Follow-up">Follow-up</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          Customer Status
                        </label>
                        <select value={formData.customer_status} onChange={(e) => setFormData({...formData, customer_status: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                          <option value="Blocked">Blocked</option>
                          <option value="VIP">VIP</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <User className="w-4 h-4" />
                          Assigned Sales Executive
                        </label>
                        <select value={formData.assigned_sales_executive_id} onChange={(e) => setFormData({...formData, assigned_sales_executive_id: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="">Unassigned</option>
                          {salesExecutives.map(exec => (<option key={exec.id} value={exec.id}>{exec.full_name}</option>))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Link className="w-4 h-4" />
                          Referred By
                        </label>
                        <input type="text" value={formData.referred_by} onChange={(e) => setFormData({...formData, referred_by: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Customer code or name" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Expected Purchase Month
                        </label>
                        <input type="month" value={formData.expected_purchase_month} onChange={(e) => setFormData({...formData, expected_purchase_month: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Notes
                      </label>
                      <textarea rows={3} value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Additional notes..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        Tags
                      </label>
                      <input type="text" value={formData.tags} onChange={(e) => setFormData({...formData, tags: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Comma separated tags" />
                    </div>
                  </div>
                )}

                {/* Emergency Contact Tab */}
                {activeTab === 'emergency' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Emergency Contact Name
                      </label>
                      <input type="text" value={formData.emergency_contact_name} onChange={(e) => setFormData({...formData, emergency_contact_name: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <PhoneCall className="w-4 h-4" />
                        Emergency Contact Number
                      </label>
                      <input type="tel" value={formData.emergency_contact_number} onChange={(e) => setFormData({...formData, emergency_contact_number: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Link className="w-4 h-4" />
                        Emergency Contact Relation
                      </label>
                      <input type="text" value={formData.emergency_contact_relation} onChange={(e) => setFormData({...formData, emergency_contact_relation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Spouse, Father, Mother, etc." />
                    </div>
                  </div>
                )}

                {/* Navigation Buttons - Bottom Only */}
                <div className="sticky bottom-0 bg-white border-t mt-8 pt-4 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); setEditingCustomer(null); resetForm(); }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    {!isFirstTab && (
                      <button
                        type="button"
                        onClick={goToPreviousTab}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">
                      {currentTabIndex + 1} of {tabs.length}
                    </span>
                    {!isLastTab ? (
                      <button
                        type="button"
                        onClick={goToNextTab}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                      >
                        <span>Next: {tabs[currentTabIndex + 1].label}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                      >
                        {isSubmitting ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Create Customer')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Detail Modal - WITH BLUR EFFECT */}
      {showDetailModal && selectedCustomer && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Customer Details
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">{selectedCustomer.first_name} {selectedCustomer.last_name || ''}</h3>
                  <p className="text-gray-500">Code: {selectedCustomer.customer_code}</p>
                  <p className="text-gray-500">Referral: {selectedCustomer.referral_code}</p>
                </div>
                <div className="flex space-x-2">
                  <StatusBadge status={selectedCustomer.customer_status} type="customer" />
                  <StatusBadge status={selectedCustomer.lead_status} type="lead" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Personal Info
                  </h4>
                  <p><strong>Mobile:</strong> {selectedCustomer.mobile}</p>
                  {selectedCustomer.alternate_mobile && <p><strong>Alternate:</strong> {selectedCustomer.alternate_mobile}</p>}
                  {selectedCustomer.email && <p><strong>Email:</strong> {selectedCustomer.email}</p>}
                  {selectedCustomer.gender && <p><strong>Gender:</strong> {selectedCustomer.gender}</p>}
                  {selectedCustomer.date_of_birth && <p><strong>DOB:</strong> {new Date(selectedCustomer.date_of_birth).toLocaleDateString()}</p>}
                  <p><strong>Occupation:</strong> {selectedCustomer.occupation || 'N/A'}</p>
                  <p><strong>Income:</strong> {selectedCustomer.annual_income_range || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Business Info
                  </h4>
                  <p><strong>Type:</strong> {selectedCustomer.customer_type}</p>
                  {selectedCustomer.business_name && <p><strong>Business:</strong> {selectedCustomer.business_name}</p>}
                  {selectedCustomer.gst_number && <p><strong>GST:</strong> {selectedCustomer.gst_number}</p>}
                  {selectedCustomer.pan_number && <p><strong>PAN:</strong> {selectedCustomer.pan_number}</p>}
                  {selectedCustomer.aadhaar_number && <p><strong>Aadhaar:</strong> {selectedCustomer.aadhaar_number}</p>}
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Address
                  </h4>
                  <p>{selectedCustomer.address_line1}</p>
                  {selectedCustomer.address_line2 && <p>{selectedCustomer.address_line2}</p>}
                  <p>{selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pincode}</p>
                  <p>{selectedCustomer.country}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <Battery className="w-4 h-4" />
                    EV Preferences
                  </h4>
                  <p><strong>First Time EV:</strong> {selectedCustomer.is_ev_first_time ? 'Yes' : 'No'}</p>
                  <p><strong>Home Charging:</strong> {selectedCustomer.has_home_charging ? 'Yes' : 'No'}</p>
                  {selectedCustomer.charging_capacity_available && <p><strong>Charging Capacity:</strong> {selectedCustomer.charging_capacity_available}</p>}
                  {selectedCustomer.previous_vehicle_type && <p><strong>Previous Vehicle:</strong> {selectedCustomer.previous_vehicle_type}</p>}
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Statistics
                  </h4>
                  <p><strong>Vehicles Owned:</strong> {selectedCustomer.total_vehicles_owned || 0}</p>
                  <p><strong>Total Purchase:</strong> ₹{(selectedCustomer.total_purchase_amount || 0).toLocaleString()}</p>
                  <p><strong>Loyalty Points:</strong> {selectedCustomer.loyalty_points || 0}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <PhoneCall className="w-4 h-4" />
                    Emergency Contact
                  </h4>
                  {selectedCustomer.emergency_contact_name ? (
                    <>
                      <p><strong>Name:</strong> {selectedCustomer.emergency_contact_name}</p>
                      <p><strong>Number:</strong> {selectedCustomer.emergency_contact_number}</p>
                      <p><strong>Relation:</strong> {selectedCustomer.emergency_contact_relation}</p>
                    </>
                  ) : <p>No emergency contact saved</p>}
                </div>
              </div>
              {selectedCustomer.notes && (
                <div className="mt-4">
                  <h4 className="font-semibold border-b pb-1">Notes</h4>
                  <p className="mt-2">{selectedCustomer.notes}</p>
                </div>
              )}
              <div className="text-sm text-gray-500 border-t mt-4 pt-4">
                <p>Created: {new Date(selectedCustomer.created_at).toLocaleString()}</p>
                <p>Last Updated: {new Date(selectedCustomer.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}