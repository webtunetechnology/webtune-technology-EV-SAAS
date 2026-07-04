// app/dashboard/inventory/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Battery,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Eye,
  RefreshCw,
  Truck,
  Activity,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type VehicleType = 'Electric Scooter' | 'Electric Motorcycle' | 'Electric Car' | 'Electric Rickshaw' | 'Electric Bus';
type StockStatus = 'Available' | 'Booked' | 'Sold' | 'Reserved' | 'In Transit' | 'Damaged' | 'QC Pending';
type SortOrder = 'asc' | 'desc';

interface Brand {
  id: string;
  brand_name: string;
}

interface Vehicle {
  id: string;
  model_name: string;
  variant_name: string | null;
  vehicle_type: VehicleType;
  ex_showroom_price: number;
  insurance_amount?: number;
  rto_charges?: number;
  battery_capacity_kwh?: number;
  range_per_charge_km?: number;
  motor_power_kw?: number;
  brand_id: string;
  brands: Brand;
}

interface CustomerInfo {
  id: string;
  first_name: string;
  last_name: string;
  mobile: string;
}

interface SalesInvoiceInfo {
  id: string;
  invoice_number: string;
}

interface InventoryItem {
  id: string;
  showroom_id: string;
  vehicle_model_id: string;
  sold_to_customer_id: string | null;
  sale_invoice_id: string | null;
  vin_number: string;
  chassis_number: string;
  motor_number: string;
  battery_number: string;
  color: string | null;
  variant_name: string | null;
  received_date: string;
  received_from: string | null;
  manufacturing_date: string | null;
  invoice_date: string | null;
  purchase_cost: number | null;
  ex_showroom_price: number | null;
  on_road_price: number | null;
  current_selling_price: number | null;
  battery_charge_percentage: number;
  battery_health_status: string;
  last_charge_date: string | null;
  software_version: string | null;
  firmware_version: string | null;
  stock_status: StockStatus;
  location_in_showroom: string | null;
  is_test_ride_vehicle: boolean;
  test_ride_count: number;
  is_demo_vehicle: boolean;
  sold_date: string | null;
  created_at: string;
  updated_at: string;
  vehicles: Vehicle;
  customers: CustomerInfo | null;
  sales_invoices: SalesInvoiceInfo | null;
}

interface InventoryFormData {
  id?: string;
  showroom_id: string;
  vehicle_model_id: string;
  vin_number: string;
  chassis_number: string;
  motor_number: string;
  battery_number: string;
  color: string;
  variant_name: string;
  received_date: string;
  received_from: string;
  manufacturing_date: string;
  purchase_cost: number;
  ex_showroom_price: number;
  on_road_price: number;
  current_selling_price: number;
  battery_charge_percentage: number;
  battery_health_status: string;
  software_version: string;
  firmware_version: string;
  stock_status: StockStatus;
  location_in_showroom: string;
  is_test_ride_vehicle: boolean;
  is_demo_vehicle: boolean;
}

interface FilterState {
  search: string;
  stockStatus: string;
  brandId: string;
  vehicleType: string;
  isTestRide: string;
  isDemo: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface InventoryStats {
  total: number;
  available: number;
  booked: number;
  sold: number;
  transit: number;
  testRide: number;
  demo: number;
  lowBattery: number;
}

type ModalMode = 'add' | 'edit' | 'view' | null;

// ============================================================================
// CONSTANTS
// ============================================================================

const STOCK_STATUS_OPTIONS: { value: StockStatus; label: string; color: string }[] = [
  { value: 'Available', label: 'Available', color: 'bg-green-100 text-green-800' },
  { value: 'Booked', label: 'Booked', color: 'bg-blue-100 text-blue-800' },
  { value: 'Sold', label: 'Sold', color: 'bg-muted text-muted-foreground' },
  { value: 'Reserved', label: 'Reserved', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'In Transit', label: 'In Transit', color: 'bg-purple-100 text-purple-800' },
  { value: 'Damaged', label: 'Damaged', color: 'bg-red-100 text-red-800' },
  { value: 'QC Pending', label: 'QC Pending', color: 'bg-orange-100 text-orange-800' }
];

const VEHICLE_TYPE_OPTIONS: VehicleType[] = [
  'Electric Scooter', 'Electric Motorcycle', 'Electric Car', 'Electric Rickshaw', 'Electric Bus'
];

const COLORS = [
  'Red', 'Blue', 'Black', 'White', 'Silver', 'Grey', 'Green', 'Yellow', 'Orange', 'Purple'
];

const SORT_FIELDS = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'received_date', label: 'Received Date' },
  { value: 'vin_number', label: 'VIN Number' },
  { value: 'stock_status', label: 'Stock Status' },
  { value: 'ex_showroom_price', label: 'Price' },
  { value: 'battery_charge_percentage', label: 'Battery Level' }
];

const BATTERY_HEALTH_OPTIONS = [
  'Excellent', 'Good', 'Fair', 'Poor', 'Needs Replacement'
];

// ============================================================================
// INITIAL FORM DATA
// ============================================================================

const INITIAL_FORM_DATA: InventoryFormData = {
  showroom_id: '',
  vehicle_model_id: '',
  vin_number: '',
  chassis_number: '',
  motor_number: '',
  battery_number: '',
  color: '',
  variant_name: '',
  received_date: new Date().toISOString().split('T')[0],
  received_from: '',
  manufacturing_date: '',
  purchase_cost: 0,
  ex_showroom_price: 0,
  on_road_price: 0,
  current_selling_price: 0,
  battery_charge_percentage: 50,
  battery_health_status: 'Good',
  software_version: '',
  firmware_version: '',
  stock_status: 'Available',
  location_in_showroom: '',
  is_test_ride_vehicle: false,
  is_demo_vehicle: false
};

// ============================================================================
// HELPERS
// ============================================================================

const getShowroomIdFromCookie = (): string => {
  if (typeof document === 'undefined') return '';
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'showroom_id') return decodeURIComponent(value);
  }
  return '';
};

const calculateOnRoadPrice = (exShowroom: number, insurance: number, rto: number): number => {
  return exShowroom + insurance + rto;
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function InventoryManagementPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [vehicleModels, setVehicleModels] = useState<Vehicle[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stats, setStats] = useState<InventoryStats>({
    total: 0, available: 0, booked: 0, sold: 0, transit: 0, testRide: 0, demo: 0, lowBattery: 0
  });

  const [filters, setFilters] = useState<FilterState>({
    search: '', stockStatus: '', brandId: '', vehicleType: '', isTestRide: '', isDemo: ''
  });
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1, limit: 20, total: 0, totalPages: 0
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState<InventoryFormData>(INITIAL_FORM_DATA);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof InventoryFormData, string>>>({});

  const [bulkStatus, setBulkStatus] = useState<StockStatus>('Available');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
      });
      if (filters.search) params.append('search', filters.search);
      if (filters.stockStatus) params.append('stock_status', filters.stockStatus);
      if (filters.brandId) params.append('brand_id', filters.brandId);
      if (filters.vehicleType) params.append('vehicle_type', filters.vehicleType);
      if (filters.isTestRide) params.append('is_test_ride_vehicle', filters.isTestRide);
      if (filters.isDemo) params.append('is_demo_vehicle', filters.isDemo);

      const response = await fetch(`/api/inventory?${params}`);
      if (response.status === 401) {
        setError('Please login and select a showroom first');
        setLoading(false);
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch inventory');

      const inventoryData = Array.isArray(result.data) ? result.data : [];
      setInventory(inventoryData);
      setPagination({
        page: result.pagination?.page || 1,
        limit: result.pagination?.limit || 20,
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 0
      });

      const newStats: InventoryStats = {
        total: result.pagination?.total || 0,
        available: inventoryData.filter((i: InventoryItem) => i.stock_status === 'Available').length,
        booked: inventoryData.filter((i: InventoryItem) => i.stock_status === 'Booked').length,
        sold: inventoryData.filter((i: InventoryItem) => i.stock_status === 'Sold').length,
        transit: inventoryData.filter((i: InventoryItem) => i.stock_status === 'In Transit').length,
        testRide: inventoryData.filter((i: InventoryItem) => i.is_test_ride_vehicle).length,
        demo: inventoryData.filter((i: InventoryItem) => i.is_demo_vehicle).length,
        lowBattery: inventoryData.filter((i: InventoryItem) => i.battery_charge_percentage < 20).length
      };
      setStats(newStats);
    } catch (error: any) {
      console.error('Fetch error:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, sortBy, sortOrder]);

  const fetchBrandsAndModels = async () => {
    try {
      const brandsResponse = await fetch('/api/brands');
      if (brandsResponse.ok) {
        const brandsResult = await brandsResponse.json();
        setBrands(brandsResult.data || []);
      }
      const vehiclesResponse = await fetch('/api/vehicles');
      if (vehiclesResponse.ok) {
        const vehiclesResult = await vehiclesResponse.json();
        setVehicleModels(vehiclesResult.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch brands/models:', error);
    }
  };

  useEffect(() => { fetchBrandsAndModels(); }, []);
  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  // ============================================================================
  // AUTO-POPULATE ON VEHICLE MODEL SELECTION
  // ============================================================================

  useEffect(() => {
    if (formData.vehicle_model_id && modalMode === 'add') {
      const selectedVehicle = vehicleModels.find(v => v.id === formData.vehicle_model_id);
      if (selectedVehicle) {
        const insuranceAmount = selectedVehicle.insurance_amount || 0;
        const rtoCharges = selectedVehicle.rto_charges || 0;
        const exShowroomPrice = selectedVehicle.ex_showroom_price || 0;
        const onRoadPrice = calculateOnRoadPrice(exShowroomPrice, insuranceAmount, rtoCharges);

        setFormData(prev => ({
          ...prev,
          variant_name: selectedVehicle.variant_name || '',
          ex_showroom_price: exShowroomPrice,
          on_road_price: onRoadPrice,
          purchase_cost: prev.purchase_cost || exShowroomPrice,
          current_selling_price: prev.current_selling_price || onRoadPrice,
        }));
      }
    }
  }, [formData.vehicle_model_id, vehicleModels, modalMode]);

  // ============================================================================
  // FORM HELPERS
  // ============================================================================

  const mapInventoryToFormData = (item: InventoryItem): InventoryFormData => ({
    id: item.id,
    showroom_id: item.showroom_id,
    vehicle_model_id: item.vehicle_model_id,
    vin_number: item.vin_number,
    chassis_number: item.chassis_number,
    motor_number: item.motor_number,
    battery_number: item.battery_number,
    color: item.color || '',
    variant_name: item.variant_name || '',
    received_date: item.received_date,
    received_from: item.received_from || '',
    manufacturing_date: item.manufacturing_date || '',
    purchase_cost: item.purchase_cost || 0,
    ex_showroom_price: item.ex_showroom_price || 0,
    on_road_price: item.on_road_price || 0,
    current_selling_price: item.current_selling_price || 0,
    battery_charge_percentage: item.battery_charge_percentage,
    battery_health_status: item.battery_health_status,
    software_version: item.software_version || '',
    firmware_version: item.firmware_version || '',
    stock_status: item.stock_status,
    location_in_showroom: item.location_in_showroom || '',
    is_test_ride_vehicle: item.is_test_ride_vehicle,
    is_demo_vehicle: item.is_demo_vehicle
  });

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setFormErrors({});
  };

  const openAddModal = () => {
    setFormData({ ...INITIAL_FORM_DATA, showroom_id: getShowroomIdFromCookie() });
    setModalMode('add');
  };

  const openEditModal = (item: InventoryItem) => {
    setFormData(mapInventoryToFormData(item));
    setModalMode('edit');
  };

  const openViewModal = (item: InventoryItem) => {
    setFormData(mapInventoryToFormData(item));
    setModalMode('view');
  };

  const getSelectedVehicleDetails = () => {
    if (!formData.vehicle_model_id) return null;
    return vehicleModels.find(v => v.id === formData.vehicle_model_id);
  };

  // ============================================================================
  // FORM VALIDATION & HANDLING
  // ============================================================================

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof InventoryFormData, string>> = {};
    if (!formData.vehicle_model_id) errors.vehicle_model_id = 'Vehicle model is required';
    if (!formData.vin_number.trim()) errors.vin_number = 'VIN number is required';
    if (!formData.chassis_number.trim()) errors.chassis_number = 'Chassis number is required';
    if (!formData.motor_number.trim()) errors.motor_number = 'Motor number is required';
    if (!formData.battery_number.trim()) errors.battery_number = 'Battery number is required';
    if (!formData.received_date) errors.received_date = 'Received date is required';
    if (formData.purchase_cost < 0) errors.purchase_cost = 'Cost cannot be negative';
    if (formData.battery_charge_percentage < 0 || formData.battery_charge_percentage > 100) {
      errors.battery_charge_percentage = 'Battery % must be between 0 and 100';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (name === 'vehicle_model_id' && value && modalMode === 'add') {
      const selectedVehicle = vehicleModels.find(v => v.id === value);
      if (selectedVehicle) {
        const insuranceAmount = selectedVehicle.insurance_amount || 0;
        const rtoCharges = selectedVehicle.rto_charges || 0;
        const exShowroomPrice = selectedVehicle.ex_showroom_price || 0;
        const onRoadPrice = calculateOnRoadPrice(exShowroomPrice, insuranceAmount, rtoCharges);

        setFormData(prev => ({
          ...prev,
          vehicle_model_id: value,
          variant_name: selectedVehicle.variant_name || '',
          ex_showroom_price: exShowroomPrice,
          on_road_price: onRoadPrice,
          purchase_cost: exShowroomPrice,
          current_selling_price: onRoadPrice,
        }));
        if (formErrors.vehicle_model_id) {
          setFormErrors(prev => { const n = { ...prev }; delete n.vehicle_model_id; return n; });
        }
        return;
      }
    }

    if (name === 'ex_showroom_price' && modalMode === 'add') {
      const selectedVehicle = vehicleModels.find(v => v.id === formData.vehicle_model_id);
      const newExShowroom = parseFloat(value) || 0;
      const insuranceAmount = selectedVehicle?.insurance_amount || 0;
      const rtoCharges = selectedVehicle?.rto_charges || 0;
      const newOnRoad = calculateOnRoadPrice(newExShowroom, insuranceAmount, rtoCharges);

      setFormData(prev => ({
        ...prev,
        ex_showroom_price: newExShowroom,
        on_road_price: newOnRoad,
        current_selling_price: newOnRoad,
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));

    if (formErrors[name as keyof InventoryFormData]) {
      setFormErrors(prev => { const n = { ...prev }; delete n[name as keyof InventoryFormData]; return n; });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    try {
      const url = '/api/inventory';
      const method = modalMode === 'edit' ? 'PUT' : 'POST';

      const fieldsToSend: (keyof InventoryFormData)[] = [
        'vehicle_model_id', 'vin_number', 'chassis_number', 'motor_number', 'battery_number',
        'color', 'variant_name', 'received_date', 'received_from', 'manufacturing_date',
        'purchase_cost', 'ex_showroom_price', 'on_road_price', 'current_selling_price',
        'battery_charge_percentage', 'battery_health_status', 'software_version', 'firmware_version',
        'stock_status', 'location_in_showroom', 'is_test_ride_vehicle', 'is_demo_vehicle'
      ];

      const body: any = {};
      fieldsToSend.forEach(field => {
        if (formData[field] !== undefined) {
          body[field] = formData[field];
        }
      });
      if (modalMode === 'edit' && formData.id) body.id = formData.id;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Failed to ${modalMode === 'edit' ? 'update' : 'add'} inventory`);

      setSuccess(modalMode === 'edit' ? 'Inventory updated successfully' : 'Inventory added successfully');
      setModalMode(null);
      resetForm();
      fetchInventory();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Submit error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSuccess(result.message || 'Inventory item deleted successfully');
      fetchInventory();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedItems.size === 0) { setError('Please select items to update'); return; }
    if (!confirm(`Update ${selectedItems.size} items to "${bulkStatus}" status?`)) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedItems), stock_status: bulkStatus })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSuccess(result.message);
      setSelectedItems(new Set());
      fetchInventory();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (inventory.length === 0) { setError('No data to export'); return; }
    const csvData = inventory.map(item => ({
      VIN: item.vin_number,
      Brand: item.vehicles?.brands?.brand_name || '',
      Model: item.vehicles?.model_name || '',
      Variant: item.variant_name || item.vehicles?.variant_name || '',
      Color: item.color || '',
      Status: item.stock_status,
      'Ex-Showroom': item.ex_showroom_price || 0,
      'On-Road': item.on_road_price || 0,
      'Selling Price': item.current_selling_price || 0,
      Battery: `${item.battery_charge_percentage}%`,
      Health: item.battery_health_status,
      Location: item.location_in_showroom || '',
      Received: item.received_date,
      'Test Ride': item.is_test_ride_vehicle ? 'Yes' : 'No',
      Demo: item.is_demo_vehicle ? 'Yes' : 'No'
    }));
    const csv = convertToCSV(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    setSuccess('Inventory exported successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const convertToCSV = (data: Record<string, any>[]): string => {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(h => `"${(obj[h]?.toString() || '').replace(/"/g, '""')}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  // ============================================================================
  // SELECTION HANDLING
  // ============================================================================

  const toggleSelectAll = () => {
    if (selectedItems.size === inventory.length && inventory.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(inventory.map(item => item.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedItems(newSelected);
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getStatusColor = (status: StockStatus): string =>
    STOCK_STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-muted text-muted-foreground';

  const getVehicleIcon = (type: VehicleType): string => {
    switch (type) {
      case 'Electric Scooter': return '🛵';
      case 'Electric Motorcycle': return '🏍️';
      case 'Electric Car': return '🚗';
      case 'Electric Rickshaw': return '🛺';
      case 'Electric Bus': return '🚌';
      default: return '🚗';
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Loading…' : `${inventory.length} vehicle${inventory.length !== 1 ? 's' : ''} in stock`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={inventory.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            <Download className="h-4 w-4" />Export
          </button>
          <button onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />Add Vehicle
          </button>
        </div>
      </div>

      <div>
        {/* Notifications */}
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
              <p className="text-sm text-green-700 flex-1">{success}</p>
              <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600"><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 max-w-xs relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search by VIN, Chassis…"
                value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)}
                className="block w-full pl-9 pr-3 py-2 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:text-foreground'}`}>
              <Filter className="h-4 w-4" />Filters
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-border rounded-xl text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
              {SORT_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 border border-border rounded-xl text-sm bg-card hover:bg-muted text-muted-foreground transition-colors">
              {sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
          {showFilters && (
            <div className="mt-3 bg-card border border-border/60 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Stock Status</label>
                <select value={filters.stockStatus} onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
                  className="block w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">All Statuses</option>
                  {STOCK_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Brand</label>
                <select value={filters.brandId} onChange={(e) => handleFilterChange('brandId', e.target.value)}
                  className="block w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">All Brands</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.brand_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Vehicle Type</label>
                <select value={filters.vehicleType} onChange={(e) => handleFilterChange('vehicleType', e.target.value)}
                  className="block w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">All Types</option>
                  {VEHICLE_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Test Ride</label>
                <select value={filters.isTestRide} onChange={(e) => handleFilterChange('isTestRide', e.target.value)}
                  className="block w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Demo Vehicle</label>
                <select value={filters.isDemo} onChange={(e) => handleFilterChange('isDemo', e.target.value)}
                  className="block w-full px-3 py-2 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20">
                  <option value="">All</option>
                  <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <span className="text-sm text-primary font-medium">{selectedItems.size} {selectedItems.size === 1 ? 'vehicle' : 'vehicles'} selected</span>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as StockStatus)}
                className="px-3 py-2 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 flex-1 sm:flex-none">
                {STOCK_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={handleBulkAction} disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap">
                {loading ? 'Updating...' : 'Update Status'}
              </button>
              <button onClick={() => setSelectedItems(new Set())}
                className="px-4 py-2 border border-border text-muted-foreground rounded-xl text-sm font-medium hover:text-foreground whitespace-nowrap">Clear</button>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/60">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="w-10 px-4 py-3.5"><input type="checkbox" checked={selectedItems.size === inventory.length && inventory.length > 0} onChange={toggleSelectAll} className="rounded border-border text-primary focus:ring-primary/20" /></th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Vehicle</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">VIN / Chassis</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Color</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Price</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Battery</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3.5 text-left text-xs font-medium text-muted-foreground">Received</th>
                  <th className="px-4 py-3.5 text-right text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading && inventory.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center"><RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground/40" /><p className="mt-2 text-sm text-muted-foreground">Loading inventory...</p></td></tr>
                ) : inventory.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center"><Package className="h-12 w-12 mx-auto text-muted-foreground/30" /><p className="mt-2 text-sm text-muted-foreground">No vehicles found</p><button onClick={openAddModal} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"><Plus className="h-4 w-4" />Add First Vehicle</button></td></tr>
                ) : (
                  inventory.map((item) => (
                    <tr key={item.id} className={`hover:bg-muted/20 transition-colors ${selectedItems.has(item.id) ? 'bg-primary/5' : ''}`}>
                      <td className="w-10 px-4 py-3"><input type="checkbox" checked={selectedItems.has(item.id)} onChange={() => toggleSelectItem(item.id)} className="rounded border-border text-primary focus:ring-primary/20" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center min-w-0">
                          <span className="text-xl mr-2 flex-shrink-0">{getVehicleIcon(item.vehicles?.vehicle_type)}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{item.vehicles?.brands?.brand_name || 'Unknown'} {item.vehicles?.model_name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-1">
                              <span>{item.variant_name || item.vehicles?.variant_name || ''}</span>
                              {item.is_test_ride_vehicle && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Test Ride</span>}
                              {item.is_demo_vehicle && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">Demo</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><div className="text-xs font-mono text-foreground">{item.vin_number}</div><div className="text-xs text-muted-foreground font-mono">{item.chassis_number}</div></td>
                      <td className="px-4 py-3">
                        {item.color ? <div className="flex items-center"><div className="h-3 w-3 rounded-full border border-border mr-2 flex-shrink-0" style={{ backgroundColor: item.color.toLowerCase() }} /><span className="text-sm text-foreground">{item.color}</span></div> : <span className="text-sm text-muted-foreground">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-foreground">{formatCurrency(item.current_selling_price || item.on_road_price)}</div>
                        <div className="text-xs text-muted-foreground">On-road: {formatCurrency(item.on_road_price)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.stock_status)}`}>{item.stock_status}</span>
                        {item.sold_date && <div className="text-xs text-muted-foreground mt-1">Sold: {formatDate(item.sold_date)}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <Battery className={`h-4 w-4 mr-1 ${item.battery_charge_percentage < 20 ? 'text-red-500' : item.battery_charge_percentage < 50 ? 'text-yellow-500' : 'text-green-500'}`} />
                          <span className={`text-sm font-medium ${item.battery_charge_percentage < 20 ? 'text-red-600' : 'text-foreground'}`}>{item.battery_charge_percentage}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{item.battery_health_status}</div>
                      </td>
                      <td className="px-4 py-3"><div className="flex items-center text-sm text-muted-foreground"><MapPin className="h-3 w-3 mr-1 flex-shrink-0" /><span className="truncate max-w-[120px]">{item.location_in_showroom || 'Not assigned'}</span></div></td>
                      <td className="px-4 py-3"><div className="flex items-center text-sm text-muted-foreground"><Calendar className="h-3 w-3 mr-1 flex-shrink-0" />{formatDate(item.received_date)}</div></td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-1">
                          <button onClick={() => openViewModal(item)} className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-colors" title="View"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => openEditModal(item)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors" title="Edit"><Edit className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(item.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="bg-card px-4 py-3 border-t border-border/40 sm:px-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Showing <span className="font-medium text-foreground">{((pagination.page - 1) * pagination.limit) + 1}</span> - <span className="font-medium text-foreground">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium text-foreground">{pagination.total}</span> results</div>
                <div className="flex items-center space-x-1">
                  <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1} className="px-3 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="h-4 w-4" /></button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) pageNum = i + 1;
                    else if (pagination.page <= 3) pageNum = i + 1;
                    else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                    else pageNum = pagination.page - 2 + i;
                    return <button key={pageNum} onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))} className={`min-w-[40px] px-3 py-2 rounded-xl text-sm font-medium ${pagination.page === pageNum ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted border border-border'}`}>{pageNum}</button>;
                  })}
                  <button onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === pagination.totalPages} className="px-3 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
            <div className="fixed inset-0 bg-background/70 backdrop-blur-sm transition-opacity" onClick={() => setModalMode(null)} />
            <div className="relative bg-card rounded-2xl shadow-xl border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card px-6 py-4 border-b border-border/60 flex items-center justify-between z-10 rounded-t-2xl">
                <h2 className="text-lg font-semibold text-foreground">
                  {modalMode === 'add' ? 'Add New Vehicle' : modalMode === 'edit' ? 'Edit Vehicle' : 'Vehicle Details'}
                </h2>
                <button onClick={() => setModalMode(null)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="h-5 w-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Vehicle Selection */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-foreground">Vehicle Model <span className="text-red-500">*</span></label>
                    <select name="vehicle_model_id" value={formData.vehicle_model_id} onChange={handleInputChange} disabled={modalMode === 'view'}
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 ${formErrors.vehicle_model_id ? 'border-red-500' : 'border-border'} disabled:bg-muted disabled:cursor-not-allowed`}>
                      <option value="">Select Model</option>
                      {vehicleModels.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.brands?.brand_name} - {vehicle.model_name} ({vehicle.vehicle_type})
                          {vehicle.variant_name ? ` - ${vehicle.variant_name}` : ''}
                          {vehicle.ex_showroom_price ? ` - ₹${vehicle.ex_showroom_price.toLocaleString('en-IN')}` : ''}
                        </option>
                      ))}
                    </select>
                    {formErrors.vehicle_model_id && <p className="mt-1 text-xs text-red-500">{formErrors.vehicle_model_id}</p>}
                  </div>

                  {/* Color */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">Color</label>
                    <select name="color" value={formData.color} onChange={handleInputChange} disabled={modalMode === 'view'}
                      className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed">
                      <option value="">Select Color</option>
                      {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* VIN */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">VIN Number <span className="text-red-500">*</span></label>
                    <input type="text" name="vin_number" value={formData.vin_number} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="Enter VIN"
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg text-sm font-mono bg-background text-foreground focus:ring-2 focus:ring-primary/30 ${formErrors.vin_number ? 'border-red-500' : 'border-border'} disabled:bg-muted disabled:cursor-not-allowed`} />
                    {formErrors.vin_number && <p className="mt-1 text-xs text-red-500">{formErrors.vin_number}</p>}
                  </div>

                  {/* Chassis */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">Chassis Number <span className="text-red-500">*</span></label>
                    <input type="text" name="chassis_number" value={formData.chassis_number} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="Enter chassis number"
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg text-sm font-mono bg-background text-foreground focus:ring-2 focus:ring-primary/30 ${formErrors.chassis_number ? 'border-red-500' : 'border-border'} disabled:bg-muted disabled:cursor-not-allowed`} />
                    {formErrors.chassis_number && <p className="mt-1 text-xs text-red-500">{formErrors.chassis_number}</p>}
                  </div>

                  {/* Motor */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">Motor Number <span className="text-red-500">*</span></label>
                    <input type="text" name="motor_number" value={formData.motor_number} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="Enter motor number"
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg text-sm font-mono bg-background text-foreground focus:ring-2 focus:ring-primary/30 ${formErrors.motor_number ? 'border-red-500' : 'border-border'} disabled:bg-muted disabled:cursor-not-allowed`} />
                    {formErrors.motor_number && <p className="mt-1 text-xs text-red-500">{formErrors.motor_number}</p>}
                  </div>

                  {/* Battery */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">Battery Number <span className="text-red-500">*</span></label>
                    <input type="text" name="battery_number" value={formData.battery_number} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="Enter battery number"
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg text-sm font-mono bg-background text-foreground focus:ring-2 focus:ring-primary/30 ${formErrors.battery_number ? 'border-red-500' : 'border-border'} disabled:bg-muted disabled:cursor-not-allowed`} />
                    {formErrors.battery_number && <p className="mt-1 text-xs text-red-500">{formErrors.battery_number}</p>}
                  </div>

                  {/* Variant */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">Variant Name</label>
                    <input type="text" name="variant_name" value={formData.variant_name} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="Variant"
                      className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed" />
                  </div>

                  {/* Received Date */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">Received Date <span className="text-red-500">*</span></label>
                    <input type="date" name="received_date" value={formData.received_date} onChange={handleInputChange} disabled={modalMode === 'view'}
                      className={`mt-1 block w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 ${formErrors.received_date ? 'border-red-500' : 'border-border'} disabled:bg-muted disabled:cursor-not-allowed`} />
                    {formErrors.received_date && <p className="mt-1 text-xs text-red-500">{formErrors.received_date}</p>}
                  </div>

                  {/* Received From */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">Received From</label>
                    <input type="text" name="received_from" value={formData.received_from} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="Source / Supplier"
                      className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed" />
                  </div>

                  {/* Manufacturing Date */}
                  <div>
                    <label className="block text-sm font-medium text-foreground">Manufacturing Date</label>
                    <input type="date" name="manufacturing_date" value={formData.manufacturing_date} onChange={handleInputChange} disabled={modalMode === 'view'}
                      className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed" />
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="border-t border-border/40 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Pricing Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">Purchase Cost (₹)</label>
                      <input type="number" name="purchase_cost" value={formData.purchase_cost || ''} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="0" min="0"
                        className={`mt-1 block w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 ${formErrors.purchase_cost ? 'border-red-500' : 'border-border'} disabled:bg-muted disabled:cursor-not-allowed`} />
                      {formErrors.purchase_cost && <p className="mt-1 text-xs text-red-500">{formErrors.purchase_cost}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Ex-Showroom Price (₹)</label>
                      <input type="number" name="ex_showroom_price" value={formData.ex_showroom_price || ''} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="0" min="0"
                        className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">On Road Price (₹)</label>
                      <input type="number" name="on_road_price" value={formData.on_road_price || ''} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="0" min="0"
                        className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Selling Price (₹)</label>
                      <input type="number" name="current_selling_price" value={formData.current_selling_price || ''} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="0" min="0"
                        className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed" />
                    </div>
                  </div>
                </div>

                {/* Battery & Software */}
                <div className="border-t border-border/40 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Battery & Software</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">Battery Charge %</label>
                      <input type="number" name="battery_charge_percentage" value={formData.battery_charge_percentage} onChange={handleInputChange} disabled={modalMode === 'view'} min="0" max="100"
                        className={`mt-1 block w-full px-3 py-2 border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 ${formErrors.battery_charge_percentage ? 'border-red-500' : 'border-border'} disabled:bg-muted disabled:cursor-not-allowed`} />
                      {formErrors.battery_charge_percentage && <p className="mt-1 text-xs text-red-500">{formErrors.battery_charge_percentage}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Battery Health</label>
                      <select name="battery_health_status" value={formData.battery_health_status} onChange={handleInputChange} disabled={modalMode === 'view'}
                        className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed">
                        {BATTERY_HEALTH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Software Version</label>
                      <input type="text" name="software_version" value={formData.software_version} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="e.g., v2.1.0"
                        className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm font-mono bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Firmware Version</label>
                      <input type="text" name="firmware_version" value={formData.firmware_version} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="e.g., f1.2.3"
                        className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm font-mono bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed" />
                    </div>
                  </div>
                </div>

                {/* Status & Location */}
                <div className="border-t border-border/40 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Status & Location</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground">Stock Status</label>
                      <select name="stock_status" value={formData.stock_status} onChange={handleInputChange} disabled={modalMode === 'view'}
                        className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed">
                        {STOCK_STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground">Location in Showroom</label>
                      <input type="text" name="location_in_showroom" value={formData.location_in_showroom} onChange={handleInputChange} disabled={modalMode === 'view'} placeholder="e.g., Section A, Spot 3"
                        className="mt-1 block w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/30 disabled:bg-muted disabled:cursor-not-allowed" />
                    </div>
                  </div>
                </div>

                {/* Vehicle Flags */}
                <div className="border-t border-border/40 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Vehicle Flags</h3>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" name="is_test_ride_vehicle" checked={formData.is_test_ride_vehicle} onChange={handleCheckboxChange} disabled={modalMode === 'view'}
                        className="h-4 w-4 text-primary focus:ring-primary/30 border-border rounded disabled:cursor-not-allowed" />
                      <span className="ml-2 text-sm text-foreground">Test Ride Vehicle</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input type="checkbox" name="is_demo_vehicle" checked={formData.is_demo_vehicle} onChange={handleCheckboxChange} disabled={modalMode === 'view'}
                        className="h-4 w-4 text-primary focus:ring-primary/30 border-border rounded disabled:cursor-not-allowed" />
                      <span className="ml-2 text-sm text-foreground">Demo Vehicle</span>
                    </label>
                  </div>
                </div>

                {/* Form Actions */}
                {modalMode !== 'view' && (
                  <div className="mt-6 border-t border-border/40 pt-4 flex justify-end space-x-3">
                    <button type="button" onClick={() => setModalMode(null)}
                      className="px-4 py-2 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors">Cancel</button>
                    <button type="submit" disabled={loading}
                      className="px-6 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center transition-colors">
                      {loading ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" />Saving...</> : modalMode === 'add' ? 'Add Vehicle' : 'Update Vehicle'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
