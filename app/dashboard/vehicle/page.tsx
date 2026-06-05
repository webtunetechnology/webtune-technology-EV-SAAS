// app/vehicles/page.tsx - Vehicle Management with blur effect on modals and validation-based navigation

'use client';

import { apiClient } from '@/lib/supabase/api-client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';
import { 
  Car,
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
  Battery,
  Zap,
  Gauge,
  DollarSign,
  Shield,
  BarChart3,
  Users,
  Clock,
  Calendar,
  Settings,
  Activity,
  Truck,
  Bike,
  Bus,
  TrendingUp
} from 'lucide-react';

// Types
interface Vehicle {
  id: string;
  brand_id: string;
  brand?: { brand_name: string };
  model_name: string;
  variant_name: string | null;
  vehicle_type: 'Electric Scooter' | 'Electric Motorcycle' | 'Electric Car' | 'Electric Rickshaw' | 'Electric Bus';
  battery_capacity_kwh: number | null;
  range_per_charge_km: number | null;
  motor_power_kw: number | null;
  charging_time_standard_hrs: number | null;
  charging_time_fast_hrs: number | null;
  top_speed_kmph: number | null;
  seating_capacity: number;
  ex_showroom_price: number | null;
  insurance_amount: number | null;
  rto_charges: number | null;
  vehicle_warranty_years: number;
  vehicle_warranty_km: number;
  battery_warranty_years: number;
  battery_warranty_km: number;
  is_active: boolean;
  is_discontinued: boolean;
  created_at: string;
  updated_at: string;
}

interface Brand {
  id: string;
  brand_name: string;
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

// Status Badge
const StatusBadge = ({ isActive, isDiscontinued }: { isActive: boolean; isDiscontinued: boolean }) => {
  if (isDiscontinued) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 inline-flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Discontinued
      </span>
    );
  }
  if (!isActive) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 inline-flex items-center gap-1">
        <X className="w-3 h-3" />
        Inactive
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 inline-flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      Active
    </span>
  );
};

const VehicleTypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    'Electric Scooter': 'bg-blue-100 text-blue-800',
    'Electric Motorcycle': 'bg-purple-100 text-purple-800',
    'Electric Car': 'bg-indigo-100 text-indigo-800',
    'Electric Rickshaw': 'bg-yellow-100 text-yellow-800',
    'Electric Bus': 'bg-orange-100 text-orange-800',
  };

  const icons: Record<string, React.ReactNode> = {
    'Electric Scooter': <Bike className="w-3 h-3" />,
    'Electric Motorcycle': <Bike className="w-3 h-3" />,
    'Electric Car': <Car className="w-3 h-3" />,
    'Electric Rickshaw': <Truck className="w-3 h-3" />,
    'Electric Bus': <Bus className="w-3 h-3" />,
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
      {icons[type]}
      {type}
    </span>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
      ))}
    </div>
    <div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>
  </div>
);

export default function VehicleManagementPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    discontinued: 0,
    scooterCount: 0,
    motorcycleCount: 0,
    carCount: 0,
    averageRange: 0,
    averagePrice: 0
  });
  const [brands, setBrands] = useState<Brand[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [filters, setFilters] = useState({
    vehicle_type: '',
    brand_id: '',
    is_active: '',
    is_discontinued: '',
  });

  // Tab configuration with mandatory fields
  const tabs = useMemo(() => [
    { 
      key: 'basic', 
      label: 'Basic Info', 
      icon: <Car className="w-4 h-4" />,
      mandatoryFields: ['brand_id', 'model_name', 'vehicle_type']
    },
    { 
      key: 'battery', 
      label: 'Battery & Motor', 
      icon: <Battery className="w-4 h-4" />,
      mandatoryFields: [] // All fields optional
    },
    { 
      key: 'performance', 
      label: 'Performance', 
      icon: <Gauge className="w-4 h-4" />,
      mandatoryFields: [] // All fields optional
    },
    { 
      key: 'pricing', 
      label: 'Pricing', 
      icon: <DollarSign className="w-4 h-4" />,
      mandatoryFields: [] // All fields optional
    },
    { 
      key: 'warranty', 
      label: 'Warranty', 
      icon: <Shield className="w-4 h-4" />,
      mandatoryFields: [] // All fields optional
    },
    { 
      key: 'status', 
      label: 'Status', 
      icon: <BarChart3 className="w-4 h-4" />,
      mandatoryFields: [] // All fields optional
    },
  ], []);

  const [formData, setFormData] = useState({
    brand_id: '',
    model_name: '',
    variant_name: '',
    vehicle_type: 'Electric Scooter',
    battery_capacity_kwh: '',
    range_per_charge_km: '',
    motor_power_kw: '',
    charging_time_standard_hrs: '',
    charging_time_fast_hrs: '',
    top_speed_kmph: '',
    seating_capacity: '2',
    ex_showroom_price: '',
    insurance_amount: '',
    rto_charges: '',
    vehicle_warranty_years: '3',
    vehicle_warranty_km: '125000',
    battery_warranty_years: '5',
    battery_warranty_km: '60000',
    is_active: true,
    is_discontinued: false,
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
          brand_id: 'Brand',
          model_name: 'Model name',
          vehicle_type: 'Vehicle type'
        };
        errors[field] = `${fieldLabels[field] || field} is required`;
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
        loadVehicles();
      } else {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadVehicles();
    loadStats();
    loadBrands();
  }, [currentPage, filters]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const loadVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (filters.vehicle_type) params.append('vehicle_type', filters.vehicle_type);
      if (filters.brand_id) params.append('brand_id', filters.brand_id);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (filters.is_discontinued) params.append('is_discontinued', filters.is_discontinued);

      const result = await apiClient.get(`/api/vehicles?${params}`);
      if (result.success) {
        setVehicles(result.data);
        setTotalPages(result.totalPages);
        setTotalVehicles(result.total);
      }
    } catch (error) {
      console.error('Error loading vehicles:', error);
      showToast('Failed to load vehicles', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filters]);

  const loadStats = useCallback(async () => {
    try {
      const result = await apiClient.get('/api/vehicles-stats');
      if (result.success) setStats(result.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const loadBrands = useCallback(async () => {
    try {
      const result = await apiClient.get('/api/brands');
      if (result.success) setBrands(result.data);
    } catch (error) {
      console.error('Error loading brands:', error);
    }
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.brand_id) errors.brand_id = 'Brand is required';
    if (!formData.model_name?.trim()) errors.model_name = 'Model name is required';
    if (!formData.vehicle_type) errors.vehicle_type = 'Vehicle type is required';
    
    // Validate numeric fields if provided
    if (formData.battery_capacity_kwh && isNaN(Number(formData.battery_capacity_kwh))) 
      errors.battery_capacity_kwh = 'Must be a number';
    if (formData.range_per_charge_km && isNaN(Number(formData.range_per_charge_km))) 
      errors.range_per_charge_km = 'Must be a number';
    if (formData.motor_power_kw && isNaN(Number(formData.motor_power_kw))) 
      errors.motor_power_kw = 'Must be a number';
    if (formData.ex_showroom_price && isNaN(Number(formData.ex_showroom_price))) 
      errors.ex_showroom_price = 'Must be a number';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      brand_id: '',
      model_name: '',
      variant_name: '',
      vehicle_type: 'Electric Scooter',
      battery_capacity_kwh: '',
      range_per_charge_km: '',
      motor_power_kw: '',
      charging_time_standard_hrs: '',
      charging_time_fast_hrs: '',
      top_speed_kmph: '',
      seating_capacity: '2',
      ex_showroom_price: '',
      insurance_amount: '',
      rto_charges: '',
      vehicle_warranty_years: '3',
      vehicle_warranty_km: '125000',
      battery_warranty_years: '5',
      battery_warranty_km: '60000',
      is_active: true,
      is_discontinued: false,
    });
    setFormErrors({});
    setSectionError('');
    setActiveTab('basic');
  };

  const prepareSubmitData = (data: typeof formData) => {
    return {
      brand_id: data.brand_id,
      model_name: data.model_name,
      variant_name: data.variant_name || null,
      vehicle_type: data.vehicle_type,
      battery_capacity_kwh: data.battery_capacity_kwh ? parseFloat(data.battery_capacity_kwh) : null,
      range_per_charge_km: data.range_per_charge_km ? parseInt(data.range_per_charge_km) : null,
      motor_power_kw: data.motor_power_kw ? parseFloat(data.motor_power_kw) : null,
      charging_time_standard_hrs: data.charging_time_standard_hrs ? parseFloat(data.charging_time_standard_hrs) : null,
      charging_time_fast_hrs: data.charging_time_fast_hrs ? parseFloat(data.charging_time_fast_hrs) : null,
      top_speed_kmph: data.top_speed_kmph ? parseInt(data.top_speed_kmph) : null,
      seating_capacity: parseInt(data.seating_capacity) || 2,
      ex_showroom_price: data.ex_showroom_price ? parseFloat(data.ex_showroom_price) : null,
      insurance_amount: data.insurance_amount ? parseFloat(data.insurance_amount) : null,
      rto_charges: data.rto_charges ? parseFloat(data.rto_charges) : null,
      vehicle_warranty_years: parseInt(data.vehicle_warranty_years) || 3,
      vehicle_warranty_km: parseInt(data.vehicle_warranty_km) || 125000,
      battery_warranty_years: parseInt(data.battery_warranty_years) || 5,
      battery_warranty_km: parseInt(data.battery_warranty_km) || 60000,
      is_active: data.is_active,
      is_discontinued: data.is_discontinued,
    };
  };

  const createVehicle = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const submitData = prepareSubmitData(formData);
      const result = await apiClient.post('/api/vehicles', submitData);
      if (result.success) {
        await loadVehicles();
        await loadStats();
        setShowModal(false);
        resetForm();
        showToast('Vehicle created successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to create vehicle', 'error');
      }
    } catch (error) {
      console.error('Error creating vehicle:', error);
      showToast('Failed to create vehicle', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateVehicle = async () => {
    if (!editingVehicle || !validateForm()) return;
    setIsSubmitting(true);
    try {
      const submitData = prepareSubmitData(formData);
      const result = await apiClient.put(`/api/vehicles/${editingVehicle.id}`, submitData);
      if (result.success) {
        await loadVehicles();
        setShowModal(false);
        setEditingVehicle(null);
        resetForm();
        showToast('Vehicle updated successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to update vehicle', 'error');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      showToast('Failed to update vehicle', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle? This may affect existing inventory and sales records.')) return;
    try {
      const result = await apiClient.delete(`/api/vehicles/${vehicleId}`);
      if (result.success) {
        await loadVehicles();
        await loadStats();
        showToast('Vehicle deleted successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to delete vehicle', 'error');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      showToast('Failed to delete vehicle', 'error');
    }
  };

  const viewVehicle = async (vehicleId: string) => {
    try {
      const result = await apiClient.get(`/api/vehicles/${vehicleId}`);
      if (result.success) {
        setSelectedVehicle(result.data);
        setShowDetailModal(true);
      } else {
        showToast(result.error || 'Failed to load vehicle details', 'error');
      }
    } catch (error) {
      console.error('Error viewing vehicle:', error);
      showToast('Failed to load vehicle details', 'error');
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      brand_id: vehicle.brand_id,
      model_name: vehicle.model_name,
      variant_name: vehicle.variant_name || '',
      vehicle_type: vehicle.vehicle_type,
      battery_capacity_kwh: vehicle.battery_capacity_kwh?.toString() || '',
      range_per_charge_km: vehicle.range_per_charge_km?.toString() || '',
      motor_power_kw: vehicle.motor_power_kw?.toString() || '',
      charging_time_standard_hrs: vehicle.charging_time_standard_hrs?.toString() || '',
      charging_time_fast_hrs: vehicle.charging_time_fast_hrs?.toString() || '',
      top_speed_kmph: vehicle.top_speed_kmph?.toString() || '',
      seating_capacity: vehicle.seating_capacity?.toString() || '2',
      ex_showroom_price: vehicle.ex_showroom_price?.toString() || '',
      insurance_amount: vehicle.insurance_amount?.toString() || '',
      rto_charges: vehicle.rto_charges?.toString() || '',
      vehicle_warranty_years: vehicle.vehicle_warranty_years?.toString() || '3',
      vehicle_warranty_km: vehicle.vehicle_warranty_km?.toString() || '125000',
      battery_warranty_years: vehicle.battery_warranty_years?.toString() || '5',
      battery_warranty_km: vehicle.battery_warranty_km?.toString() || '60000',
      is_active: vehicle.is_active,
      is_discontinued: vehicle.is_discontinued,
    });
    setActiveTab('basic');
    setSectionError('');
    setFormErrors({});
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (validateForm()) {
      if (editingVehicle) {
        updateVehicle();
      } else {
        createVehicle();
      }
    }
  };

  if (loading && vehicles.length === 0) {
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

      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Car className="w-6 h-6" />
                Vehicle Management
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage vehicle models, specifications, and pricing</p>
            </div>
            <button
              onClick={() => { resetForm(); setEditingVehicle(null); setShowModal(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Vehicle
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Total Models</p>
              <Car className="w-4 h-4 text-gray-400" />
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
              <p className="text-sm text-gray-500">Discontinued</p>
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.discontinued}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Scooters</p>
              <Bike className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.scooterCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Avg Range</p>
              <Gauge className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.averageRange} km</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500">Avg Price</p>
              <TrendingUp className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-indigo-600">₹{(stats.averagePrice / 100000).toFixed(1)}L</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by model name, variant, or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters {Object.values(filters).some(f => f) && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
          </button>
          <button 
            onClick={loadVehicles} 
            className="px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-lg border mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
            <select value={filters.vehicle_type} onChange={(e) => setFilters({ ...filters, vehicle_type: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Types</option>
              <option value="Electric Scooter">Electric Scooter</option>
              <option value="Electric Motorcycle">Electric Motorcycle</option>
              <option value="Electric Car">Electric Car</option>
              <option value="Electric Rickshaw">Electric Rickshaw</option>
              <option value="Electric Bus">Electric Bus</option>
            </select>
            <select value={filters.brand_id} onChange={(e) => setFilters({ ...filters, brand_id: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Brands</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.brand_name}</option>
              ))}
            </select>
            <select value={filters.is_active} onChange={(e) => setFilters({ ...filters, is_active: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <select value={filters.is_discontinued} onChange={(e) => setFilters({ ...filters, is_discontinued: e.target.value })} className="border rounded px-3 py-2">
              <option value="">All Availability</option>
              <option value="true">Discontinued</option>
              <option value="false">Available</option>
            </select>
          </div>
        )}

        {/* Vehicles Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1"><Car className="w-3 h-3" /> Vehicle</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1"><Settings className="w-3 h-3" /> Type</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1"><Battery className="w-3 h-3" /> Battery</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1"><Gauge className="w-3 h-3" /> Performance</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Price</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1"><Activity className="w-3 h-3" /> Status</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> Warranty</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">Loading vehicles...</p>
                    </td>
                  </tr>
                ) : vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Car className="w-8 h-8 text-gray-300" />
                        <span>No vehicles found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  vehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{vehicle.model_name}</div>
                        <div className="text-sm text-gray-500">{vehicle.brand?.brand_name || 'Unknown Brand'}</div>
                        {vehicle.variant_name && (
                          <div className="text-xs text-gray-400">{vehicle.variant_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <VehicleTypeBadge type={vehicle.vehicle_type} />
                        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {vehicle.seating_capacity} seater
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{vehicle.battery_capacity_kwh ? `${vehicle.battery_capacity_kwh} kWh` : 'N/A'}</div>
                        <div className="text-xs text-gray-500">Range: {vehicle.range_per_charge_km ? `${vehicle.range_per_charge_km} km` : 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{vehicle.top_speed_kmph ? `${vehicle.top_speed_kmph} km/h` : 'N/A'}</div>
                        <div className="text-xs text-gray-500">Motor: {vehicle.motor_power_kw ? `${vehicle.motor_power_kw} kW` : 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{vehicle.ex_showroom_price ? `₹${vehicle.ex_showroom_price.toLocaleString()}` : 'N/A'}</div>
                        <div className="text-xs text-gray-500">
                          {vehicle.insurance_amount && `Ins: ₹${vehicle.insurance_amount.toLocaleString()}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge isActive={vehicle.is_active} isDiscontinued={vehicle.is_discontinued} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs">
                          <span className="text-gray-500">Vehicle:</span> {vehicle.vehicle_warranty_years}y/{vehicle.vehicle_warranty_km}km
                        </div>
                        <div className="text-xs">
                          <span className="text-gray-500">Battery:</span> {vehicle.battery_warranty_years}y/{vehicle.battery_warranty_km}km
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button onClick={() => viewVehicle(vehicle.id)} className="text-blue-600 hover:text-blue-800 transition-colors p-1" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(vehicle)} className="text-green-600 hover:text-green-800 transition-colors p-1" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteVehicle(vehicle.id)} className="text-red-600 hover:text-red-800 transition-colors p-1" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && vehicles.length > 0 && (
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalVehicles)} of {totalVehicles} vehicles
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

      {/* Vehicle Form Modal - WITH BLUR EFFECT AND VALIDATION */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade-in">
            {/* Modal Header */}
            <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Car className="w-5 h-5" />
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Section {currentTabIndex + 1} of {tabs.length}: {tabs[currentTabIndex].label}
                  {tabs[currentTabIndex].mandatoryFields.length > 0 && (
                    <span className="text-red-500 ml-2">* Required fields</span>
                  )}
                </p>
              </div>
              <button 
                onClick={() => { setShowModal(false); setEditingVehicle(null); resetForm(); }} 
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
                      <label className="block text-sm font-medium mb-1">Brand *</label>
                      <select 
                        value={formData.brand_id} 
                        onChange={(e) => setFormData({...formData, brand_id: e.target.value})} 
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.brand_id ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option value="">Select Brand</option>
                        {brands.map(brand => (
                          <option key={brand.id} value={brand.id}>{brand.brand_name}</option>
                        ))}
                      </select>
                      {formErrors.brand_id && <p className="text-red-500 text-xs mt-1">{formErrors.brand_id}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Model Name *</label>
                      <input 
                        type="text" 
                        value={formData.model_name} 
                        onChange={(e) => setFormData({...formData, model_name: e.target.value})} 
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.model_name ? 'border-red-500' : 'border-gray-300'}`} 
                        placeholder="e.g., iQube, Nexon EV"
                      />
                      {formErrors.model_name && <p className="text-red-500 text-xs mt-1">{formErrors.model_name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Variant Name</label>
                      <input 
                        type="text" 
                        value={formData.variant_name} 
                        onChange={(e) => setFormData({...formData, variant_name: e.target.value})} 
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g., Standard, Premium, Pro"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Vehicle Type *</label>
                      <select 
                        value={formData.vehicle_type} 
                        onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})} 
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.vehicle_type ? 'border-red-500' : 'border-gray-300'}`}
                      >
                        <option value="Electric Scooter">Electric Scooter</option>
                        <option value="Electric Motorcycle">Electric Motorcycle</option>
                        <option value="Electric Car">Electric Car</option>
                        <option value="Electric Rickshaw">Electric Rickshaw</option>
                        <option value="Electric Bus">Electric Bus</option>
                      </select>
                      {formErrors.vehicle_type && <p className="text-red-500 text-xs mt-1">{formErrors.vehicle_type}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Seating Capacity
                      </label>
                      <input 
                        type="number" 
                        value={formData.seating_capacity} 
                        onChange={(e) => setFormData({...formData, seating_capacity: e.target.value})} 
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        min="1" 
                        max="50"
                      />
                    </div>
                  </div>
                )}

                {/* Battery & Motor Tab */}
                {activeTab === 'battery' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Battery className="w-4 h-4" />
                        Battery Capacity (kWh)
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formData.battery_capacity_kwh} 
                        onChange={(e) => setFormData({...formData, battery_capacity_kwh: e.target.value})} 
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.battery_capacity_kwh ? 'border-red-500' : 'border-gray-300'}`} 
                        placeholder="e.g., 3.24"
                      />
                      {formErrors.battery_capacity_kwh && <p className="text-red-500 text-xs mt-1">{formErrors.battery_capacity_kwh}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        Motor Power (kW)
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formData.motor_power_kw} 
                        onChange={(e) => setFormData({...formData, motor_power_kw: e.target.value})} 
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.motor_power_kw ? 'border-red-500' : 'border-gray-300'}`} 
                        placeholder="e.g., 4.4"
                      />
                      {formErrors.motor_power_kw && <p className="text-red-500 text-xs mt-1">{formErrors.motor_power_kw}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Gauge className="w-4 h-4" />
                        Range Per Charge (km)
                      </label>
                      <input 
                        type="number" 
                        value={formData.range_per_charge_km} 
                        onChange={(e) => setFormData({...formData, range_per_charge_km: e.target.value})} 
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.range_per_charge_km ? 'border-red-500' : 'border-gray-300'}`} 
                        placeholder="e.g., 145"
                      />
                      {formErrors.range_per_charge_km && <p className="text-red-500 text-xs mt-1">{formErrors.range_per_charge_km}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Charging Time Standard (hrs)
                      </label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={formData.charging_time_standard_hrs} 
                        onChange={(e) => setFormData({...formData, charging_time_standard_hrs: e.target.value})} 
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g., 5.5"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Zap className="w-4 h-4" />
                        Charging Time Fast (hrs)
                      </label>
                      <input 
                        type="number" 
                        step="0.1" 
                        value={formData.charging_time_fast_hrs} 
                        onChange={(e) => setFormData({...formData, charging_time_fast_hrs: e.target.value})} 
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g., 1.5"
                      />
                    </div>
                  </div>
                )}

                {/* Performance Tab */}
                {activeTab === 'performance' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Gauge className="w-4 h-4" />
                        Top Speed (km/h)
                      </label>
                      <input 
                        type="number" 
                        value={formData.top_speed_kmph} 
                        onChange={(e) => setFormData({...formData, top_speed_kmph: e.target.value})} 
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g., 78"
                      />
                    </div>
                  </div>
                )}

                {/* Pricing Tab */}
                {activeTab === 'pricing' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        Ex-Showroom Price (₹)
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formData.ex_showroom_price} 
                        onChange={(e) => setFormData({...formData, ex_showroom_price: e.target.value})} 
                        className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.ex_showroom_price ? 'border-red-500' : 'border-gray-300'}`} 
                        placeholder="e.g., 124999"
                      />
                      {formErrors.ex_showroom_price && <p className="text-red-500 text-xs mt-1">{formErrors.ex_showroom_price}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        Insurance Amount (₹)
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formData.insurance_amount} 
                        onChange={(e) => setFormData({...formData, insurance_amount: e.target.value})} 
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g., 8500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Settings className="w-4 h-4" />
                        RTO Charges (₹)
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formData.rto_charges} 
                        onChange={(e) => setFormData({...formData, rto_charges: e.target.value})} 
                        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        placeholder="e.g., 6500"
                      />
                    </div>
                  </div>
                )}

                {/* Warranty Tab */}
                {activeTab === 'warranty' && (
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="font-semibold text-gray-700 border-b pb-2 flex items-center gap-2">
                      <Car className="w-4 h-4" />
                      Vehicle Warranty
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Vehicle Warranty (Years)
                        </label>
                        <input 
                          type="number" 
                          value={formData.vehicle_warranty_years} 
                          onChange={(e) => setFormData({...formData, vehicle_warranty_years: e.target.value})} 
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Gauge className="w-4 h-4" />
                          Vehicle Warranty (KM)
                        </label>
                        <input 
                          type="number" 
                          value={formData.vehicle_warranty_km} 
                          onChange={(e) => setFormData({...formData, vehicle_warranty_km: e.target.value})} 
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-700 border-b pb-2 mt-4 flex items-center gap-2">
                      <Battery className="w-4 h-4" />
                      Battery Warranty
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Battery Warranty (Years)
                        </label>
                        <input 
                          type="number" 
                          value={formData.battery_warranty_years} 
                          onChange={(e) => setFormData({...formData, battery_warranty_years: e.target.value})} 
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Gauge className="w-4 h-4" />
                          Battery Warranty (KM)
                        </label>
                        <input 
                          type="number" 
                          value={formData.battery_warranty_km} 
                          onChange={(e) => setFormData({...formData, battery_warranty_km: e.target.value})} 
                          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Status Tab */}
                {activeTab === 'status' && (
                  <div className="space-y-4 animate-fade-in">
                    <label className="flex items-center space-x-3">
                      <input 
                        type="checkbox" 
                        checked={formData.is_active} 
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})} 
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Active - Vehicle is currently available for sale
                      </span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input 
                        type="checkbox" 
                        checked={formData.is_discontinued} 
                        onChange={(e) => setFormData({...formData, is_discontinued: e.target.checked})} 
                        className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        Discontinued - Vehicle model has been discontinued
                      </span>
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4 mt-4">
                      <p className="text-sm text-gray-600">
                        <strong>Note:</strong> Discontinued vehicles will not appear in new sales but will remain in existing customer records and service history.
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="sticky bottom-0 bg-white border-t mt-8 pt-4 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); setEditingVehicle(null); resetForm(); }}
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
                        {isSubmitting ? 'Saving...' : (editingVehicle ? 'Update Vehicle' : 'Create Vehicle')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Detail Modal - WITH BLUR EFFECT */}
      {showDetailModal && selectedVehicle && (
        <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex-shrink-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Vehicle Details
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold">{selectedVehicle.model_name}</h3>
                  <p className="text-gray-500">{selectedVehicle.brand?.brand_name || 'Unknown Brand'}</p>
                  {selectedVehicle.variant_name && (
                    <p className="text-sm text-gray-500">Variant: {selectedVehicle.variant_name}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <VehicleTypeBadge type={selectedVehicle.vehicle_type} />
                  <StatusBadge isActive={selectedVehicle.is_active} isDiscontinued={selectedVehicle.is_discontinued} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <Battery className="w-4 h-4" />
                    Battery & Motor
                  </h4>
                  {selectedVehicle.battery_capacity_kwh && (
                    <p><strong>Battery Capacity:</strong> {selectedVehicle.battery_capacity_kwh} kWh</p>
                  )}
                  {selectedVehicle.motor_power_kw && (
                    <p><strong>Motor Power:</strong> {selectedVehicle.motor_power_kw} kW</p>
                  )}
                  {selectedVehicle.range_per_charge_km && (
                    <p><strong>Range:</strong> {selectedVehicle.range_per_charge_km} km/charge</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    Performance
                  </h4>
                  {selectedVehicle.top_speed_kmph && (
                    <p><strong>Top Speed:</strong> {selectedVehicle.top_speed_kmph} km/h</p>
                  )}
                  <p><strong>Seating:</strong> {selectedVehicle.seating_capacity} persons</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Charging
                  </h4>
                  {selectedVehicle.charging_time_standard_hrs && (
                    <p><strong>Standard Charge:</strong> {selectedVehicle.charging_time_standard_hrs} hrs</p>
                  )}
                  {selectedVehicle.charging_time_fast_hrs && (
                    <p><strong>Fast Charge:</strong> {selectedVehicle.charging_time_fast_hrs} hrs</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Pricing
                  </h4>
                  {selectedVehicle.ex_showroom_price ? (
                    <>
                      <p><strong>Ex-Showroom:</strong> ₹{selectedVehicle.ex_showroom_price.toLocaleString()}</p>
                      {selectedVehicle.insurance_amount && (
                        <p><strong>Insurance:</strong> ₹{selectedVehicle.insurance_amount.toLocaleString()}</p>
                      )}
                      {selectedVehicle.rto_charges && (
                        <p><strong>RTO Charges:</strong> ₹{selectedVehicle.rto_charges.toLocaleString()}</p>
                      )}
                      <p className="font-semibold mt-2">
                        <strong>On-Road Price:</strong> ₹{(
                          selectedVehicle.ex_showroom_price + 
                          (selectedVehicle.insurance_amount || 0) + 
                          (selectedVehicle.rto_charges || 0)
                        ).toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <p>Pricing not set</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Warranty
                  </h4>
                  <p><strong>Vehicle:</strong> {selectedVehicle.vehicle_warranty_years} years / {selectedVehicle.vehicle_warranty_km.toLocaleString()} km</p>
                  <p><strong>Battery:</strong> {selectedVehicle.battery_warranty_years} years / {selectedVehicle.battery_warranty_km.toLocaleString()} km</p>
                </div>
              </div>
              <div className="text-sm text-gray-500 border-t mt-4 pt-4">
                <p>Created: {new Date(selectedVehicle.created_at).toLocaleString()}</p>
                <p>Last Updated: {new Date(selectedVehicle.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}