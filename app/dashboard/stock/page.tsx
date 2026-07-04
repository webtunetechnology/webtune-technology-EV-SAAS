// app/parts/page.tsx - Spare Parts & Stock Management

'use client';

import { apiClient } from '@/lib/supabase/api-client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import React from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  X, 
  Plus,
  Package,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Settings,
  DollarSign,
  Truck,
  Factory,
  BarChart3,
  Link,
  Layers,
  MapPin,
  Hash,
  Ruler,
  Calendar,
  Shield,
  Box,
  ClipboardList,
  Activity,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Warehouse,
  Tag
} from 'lucide-react';

// Types
interface Part {
  id: string;
  part_code: string;
  part_name: string;
  description: string | null;
  category: string;
  sub_category: string | null;
  unit_of_measure: string;
  manufacturer: string | null;
  supplier_name: string | null;
  supplier_part_code: string | null;
  compatible_vehicle_models: string[];
  hsn_code: string | null;
  gst_percentage: number;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  lead_time_days: number | null;
  is_active: boolean;
  is_consumable: boolean;
  warranty_months: number | null;
  image_url: string | null;
  current_stock?: PartStock;
  created_at: string;
  updated_at: string;
}

interface PartStock {
  id: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  quantity_available: number;
  location_in_store: string | null;
  bin_number: string | null;
  rack_number: string | null;
  average_cost: number;
  last_purchase_cost: number | null;
  selling_price: number | null;
  mrp: number | null;
  last_stock_check_date: string | null;
}

interface PartsTransaction {
  id: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number | null;
  total_amount: number | null;
  reference_type: string | null;
  notes: string | null;
  performed_by_user?: { full_name: string };
  transaction_date: string;
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

// Stock Level Badge
const StockBadge = ({ available, minStock, reorderPoint }: { available: number; minStock: number; reorderPoint: number }) => {
  if (available <= 0) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 inline-flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        Out of Stock
      </span>
    );
  }
  if (available <= reorderPoint) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 inline-flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Reorder Now
      </span>
    );
  }
  if (available <= minStock) {
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 inline-flex items-center gap-1">
        <TrendingDown className="w-3 h-3" />
        Low Stock
      </span>
    );
  }
  return (
    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 inline-flex items-center gap-1">
      <CheckCircle className="w-3 h-3" />
      In Stock
    </span>
  );
};

// Category Badge
const CategoryBadge = ({ category }: { category: string }) => {
  const colors: Record<string, string> = {
    'Battery': 'bg-green-100 text-green-800',
    'Motor': 'bg-blue-100 text-blue-800',
    'Controller': 'bg-purple-100 text-purple-800',
    'Charger': 'bg-yellow-100 text-yellow-800',
    'Electrical': 'bg-indigo-100 text-indigo-800',
    'Body Parts': 'bg-pink-100 text-pink-800',
    'Brakes': 'bg-red-100 text-red-800',
    'Suspension': 'bg-teal-100 text-teal-800',
    'Tyres': 'bg-muted text-muted-foreground',
    'Lighting': 'bg-yellow-100 text-yellow-800',
    'Accessories': 'bg-violet-100 text-violet-800',
    'Consumables': 'bg-orange-100 text-orange-800',
    'Other': 'bg-muted text-muted-foreground',
  };

  const icons: Record<string, React.ReactNode> = {
    'Battery': <Activity className="w-3 h-3" />,
    'Motor': <Settings className="w-3 h-3" />,
    'Controller': <Activity className="w-3 h-3" />,
    'Charger': <Activity className="w-3 h-3" />,
    'Electrical': <Activity className="w-3 h-3" />,
    'Body Parts': <Layers className="w-3 h-3" />,
    'Brakes': <Activity className="w-3 h-3" />,
    'Suspension': <Activity className="w-3 h-3" />,
    'Tyres': <Activity className="w-3 h-3" />,
    'Lighting': <Activity className="w-3 h-3" />,
    'Accessories': <Tag className="w-3 h-3" />,
    'Consumables': <Package className="w-3 h-3" />,
    'Other': <Package className="w-3 h-3" />,
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${colors[category] || 'bg-muted text-muted-foreground'}`}>
      {icons[category]}
      {category}
    </span>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-6 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-20 bg-muted rounded-lg animate-pulse"></div>
      ))}
    </div>
    <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
  </div>
);

export default function PartsManagementPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [transactions, setTransactions] = useState<PartsTransaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalParts, setTotalParts] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [stats, setStats] = useState({
    totalParts: 0,
    activeParts: 0,
    lowStock: 0,
    outOfStock: 0,
    totalStockValue: 0,
    totalCategories: 0,
    pendingPOs: 0,
    reorderNeeded: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [filters, setFilters] = useState({
    category: '',
    is_active: '',
    stock_status: '',
    supplier_name: '',
  });

  // Stock adjustment form
  const [stockForm, setStockForm] = useState({
    transaction_type: 'Stock_Adjustment_Add',
    quantity: '',
    unit_cost: '',
    notes: '',
  });

  // Tab configuration with mandatory fields
  const tabs = useMemo(() => [
    { key: 'basic', label: 'Basic Info', icon: <Package className="w-4 h-4" />, mandatoryFields: ['part_name', 'category'] },
    { key: 'supplier', label: 'Supplier', icon: <Truck className="w-4 h-4" />, mandatoryFields: [] },
    { key: 'inventory', label: 'Inventory Settings', icon: <Warehouse className="w-4 h-4" />, mandatoryFields: [] },
    { key: 'pricing', label: 'Pricing & Tax', icon: <DollarSign className="w-4 h-4" />, mandatoryFields: [] },
    { key: 'compatibility', label: 'Compatibility', icon: <Link className="w-4 h-4" />, mandatoryFields: [] },
  ], []);

  const [formData, setFormData] = useState({
    part_code: '',
    part_name: '',
    description: '',
    category: 'Electrical',
    sub_category: '',
    unit_of_measure: 'Piece',
    manufacturer: '',
    supplier_name: '',
    supplier_part_code: '',
    compatible_vehicle_models: '',
    hsn_code: '',
    gst_percentage: '18',
    min_stock_level: '5',
    max_stock_level: '100',
    reorder_point: '10',
    lead_time_days: '',
    is_active: true,
    is_consumable: false,
    warranty_months: '',
    selling_price: '',
    mrp: '',
    location_in_store: '',
    bin_number: '',
    rack_number: '',
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
          part_name: 'Part name',
          category: 'Category'
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

  const goToNextTab = () => {
    if (!validateCurrentSection()) return;
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
    if (!validateCurrentSection()) return;
    setActiveTab(tabKey);
    setSectionError('');
  };

  const currentTabIndex = tabs.findIndex(tab => tab.key === activeTab);
  const isFirstTab = currentTabIndex === 0;
  const isLastTab = currentTabIndex === tabs.length - 1;

  useEffect(() => {
    if (showFormModal || showDetailModal || showStockModal || showTransactionModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showFormModal, showDetailModal, showStockModal, showTransactionModal]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) loadParts();
      else setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadParts();
    loadStats();
  }, [currentPage, filters]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const loadParts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      if (searchTerm) params.append('search', searchTerm);
      if (filters.category) params.append('category', filters.category);
      if (filters.is_active) params.append('is_active', filters.is_active);
      if (filters.stock_status) params.append('stock_status', filters.stock_status);
      if (filters.supplier_name) params.append('supplier_name', filters.supplier_name);

      const result = await apiClient.get(`/api/parts?${params}`);
      if (result.success) {
        setParts(result.data);
        setTotalPages(result.totalPages);
        setTotalParts(result.total);
      }
    } catch (error) {
      console.error('Error loading parts:', error);
      showToast('Failed to load parts', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filters]);

  const loadStats = useCallback(async () => {
    try {
      const result = await apiClient.get('/api/parts-stats');
      if (result.success) setStats(result.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  const loadTransactions = async (partId: string) => {
    try {
      const result = await apiClient.get(`/api/parts/${partId}/transactions?limit=50`);
      if (result.success) setTransactions(result.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.part_name?.trim()) errors.part_name = 'Part name is required';
    if (!formData.category) errors.category = 'Category is required';
    if (formData.selling_price && isNaN(Number(formData.selling_price))) errors.selling_price = 'Must be a number';
    if (formData.mrp && isNaN(Number(formData.mrp))) errors.mrp = 'Must be a number';
    if (formData.min_stock_level && isNaN(Number(formData.min_stock_level))) errors.min_stock_level = 'Must be a number';
    if (formData.max_stock_level && isNaN(Number(formData.max_stock_level))) errors.max_stock_level = 'Must be a number';
    if (formData.reorder_point && isNaN(Number(formData.reorder_point))) errors.reorder_point = 'Must be a number';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      part_code: '',
      part_name: '',
      description: '',
      category: 'Electrical',
      sub_category: '',
      unit_of_measure: 'Piece',
      manufacturer: '',
      supplier_name: '',
      supplier_part_code: '',
      compatible_vehicle_models: '',
      hsn_code: '',
      gst_percentage: '18',
      min_stock_level: '5',
      max_stock_level: '100',
      reorder_point: '10',
      lead_time_days: '',
      is_active: true,
      is_consumable: false,
      warranty_months: '',
      selling_price: '',
      mrp: '',
      location_in_store: '',
      bin_number: '',
      rack_number: '',
    });
    setFormErrors({});
    setSectionError('');
    setActiveTab('basic');
  };

  const prepareSubmitData = (data: typeof formData) => {
    return {
      part_code: data.part_code || null,
      part_name: data.part_name,
      description: data.description || null,
      category: data.category,
      sub_category: data.sub_category || null,
      unit_of_measure: data.unit_of_measure,
      manufacturer: data.manufacturer || null,
      supplier_name: data.supplier_name || null,
      supplier_part_code: data.supplier_part_code || null,
      compatible_vehicle_models: data.compatible_vehicle_models 
        ? data.compatible_vehicle_models.split(',').map(v => v.trim()).filter(Boolean)
        : [],
      hsn_code: data.hsn_code || null,
      gst_percentage: parseFloat(data.gst_percentage) || 18,
      min_stock_level: parseInt(data.min_stock_level) || 5,
      max_stock_level: parseInt(data.max_stock_level) || 100,
      reorder_point: parseInt(data.reorder_point) || 10,
      lead_time_days: data.lead_time_days ? parseInt(data.lead_time_days) : null,
      is_active: data.is_active,
      is_consumable: data.is_consumable,
      warranty_months: data.warranty_months ? parseInt(data.warranty_months) : null,
      selling_price: data.selling_price ? parseFloat(data.selling_price) : null,
      mrp: data.mrp ? parseFloat(data.mrp) : null,
      location_in_store: data.location_in_store || null,
      bin_number: data.bin_number || null,
      rack_number: data.rack_number || null,
    };
  };

  const createPart = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const submitData = prepareSubmitData(formData);
      const result = await apiClient.post('/api/parts', submitData);
      if (result.success) {
        await loadParts();
        await loadStats();
        setShowFormModal(false);
        resetForm();
        showToast('Part created successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to create part', 'error');
      }
    } catch (error) {
      console.error('Error creating part:', error);
      showToast('Failed to create part', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePart = async () => {
    if (!editingPart || !validateForm()) return;
    setIsSubmitting(true);
    try {
      const submitData = prepareSubmitData(formData);
      const result = await apiClient.put(`/api/parts/${editingPart.id}`, submitData);
      if (result.success) {
        await loadParts();
        setShowFormModal(false);
        setEditingPart(null);
        resetForm();
        showToast('Part updated successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to update part', 'error');
      }
    } catch (error) {
      console.error('Error updating part:', error);
      showToast('Failed to update part', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePart = async (partId: string) => {
    if (!confirm('Are you sure you want to delete this part? This action cannot be undone.')) return;
    try {
      const result = await apiClient.delete(`/api/parts/${partId}`);
      if (result.success) {
        await loadParts();
        await loadStats();
        showToast('Part deleted successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to delete part', 'error');
      }
    } catch (error) {
      console.error('Error deleting part:', error);
      showToast('Failed to delete part', 'error');
    }
  };

  const viewPart = async (partId: string) => {
    try {
      const result = await apiClient.get(`/api/parts/${partId}`);
      if (result.success) {
        setSelectedPart(result.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error viewing part:', error);
      showToast('Failed to load part details', 'error');
    }
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setFormData({
      part_code: part.part_code || '',
      part_name: part.part_name,
      description: part.description || '',
      category: part.category,
      sub_category: part.sub_category || '',
      unit_of_measure: part.unit_of_measure,
      manufacturer: part.manufacturer || '',
      supplier_name: part.supplier_name || '',
      supplier_part_code: part.supplier_part_code || '',
      compatible_vehicle_models: Array.isArray(part.compatible_vehicle_models) 
        ? part.compatible_vehicle_models.join(', ') 
        : '',
      hsn_code: part.hsn_code || '',
      gst_percentage: part.gst_percentage?.toString() || '18',
      min_stock_level: part.min_stock_level?.toString() || '5',
      max_stock_level: part.max_stock_level?.toString() || '100',
      reorder_point: part.reorder_point?.toString() || '10',
      lead_time_days: part.lead_time_days?.toString() || '',
      is_active: part.is_active,
      is_consumable: part.is_consumable,
      warranty_months: part.warranty_months?.toString() || '',
      selling_price: part.current_stock?.selling_price?.toString() || '',
      mrp: part.current_stock?.mrp?.toString() || '',
      location_in_store: part.current_stock?.location_in_store || '',
      bin_number: part.current_stock?.bin_number || '',
      rack_number: part.current_stock?.rack_number || '',
    });
    setActiveTab('basic');
    setSectionError('');
    setFormErrors({});
    setShowFormModal(true);
  };

  const openStockAdjustment = (part: Part) => {
    setSelectedPart(part);
    setStockForm({
      transaction_type: 'Stock_Adjustment_Add',
      quantity: '',
      unit_cost: part.current_stock?.last_purchase_cost?.toString() || part.current_stock?.average_cost?.toString() || '',
      notes: '',
    });
    setShowStockModal(true);
  };

  const openTransactionHistory = async (part: Part) => {
    setSelectedPart(part);
    await loadTransactions(part.id);
    setShowTransactionModal(true);
  };

  const handleStockAdjustment = async () => {
    if (!selectedPart || !stockForm.quantity || isNaN(Number(stockForm.quantity))) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await apiClient.post(`/api/parts/${selectedPart.id}/transactions`, {
        transaction_type: stockForm.transaction_type,
        quantity: parseInt(stockForm.quantity),
        unit_cost: stockForm.unit_cost ? parseFloat(stockForm.unit_cost) : null,
        notes: stockForm.notes || null,
      });
      
      if (result.success) {
        await loadParts();
        await loadStats();
        setShowStockModal(false);
        showToast('Stock adjusted successfully!', 'success');
      } else {
        showToast(result.error || 'Failed to adjust stock', 'error');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      showToast('Failed to adjust stock', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (validateForm()) {
      if (editingPart) updatePart();
      else createPart();
    }
  };

  if (loading && parts.length === 0) {
    return (
      <div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Spare Parts & Stock</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? 'Loading…' : `${stats.totalParts} part${stats.totalParts !== 1 ? 's' : ''} in catalog`}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingPart(null); setShowFormModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Part
        </button>
      </div>

      {/* Search and Filters */}
      <div>
        <div className="mb-5 flex gap-3">
          <div className="flex-1 max-w-xs relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search parts…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-xl bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 pl-9 transition-colors"
            />
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:text-foreground'}`}>
            <Filter className="w-4 h-4" />
            Filters {Object.values(filters).some(f => f) && <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>}
          </button>
          <button onClick={loadParts} className="px-3 py-2 border border-border rounded-xl bg-card hover:bg-muted text-muted-foreground transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="bg-card border border-border/60 p-4 rounded-2xl mb-5 grid grid-cols-1 md:grid-cols-4 gap-4">
            <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Categories</option>
              <option value="Battery">Battery</option>
              <option value="Motor">Motor</option>
              <option value="Controller">Controller</option>
              <option value="Charger">Charger</option>
              <option value="Electrical">Electrical</option>
              <option value="Body Parts">Body Parts</option>
              <option value="Brakes">Brakes</option>
              <option value="Suspension">Suspension</option>
              <option value="Tyres">Tyres</option>
              <option value="Lighting">Lighting</option>
              <option value="Accessories">Accessories</option>
              <option value="Consumables">Consumables</option>
              <option value="Other">Other</option>
            </select>
            <select value={filters.stock_status} onChange={(e) => setFilters({ ...filters, stock_status: e.target.value })} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Stock Status</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="reorder">Reorder Needed</option>
            </select>
            <select value={filters.is_active} onChange={(e) => setFilters({ ...filters, is_active: e.target.value })} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <input
              type="text"
              placeholder="Filter by supplier..."
              value={filters.supplier_name}
              onChange={(e) => setFilters({ ...filters, supplier_name: e.target.value })}
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        {/* Parts Table */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/40">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Part Details</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Stock</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Location</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Price</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Supplier</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading parts...</p>
                    </td>
                  </tr>
                ) : parts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-8 h-8 text-muted-foreground/30" />
                        <span>No parts found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  parts.map((part) => (
                    <tr key={part.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{part.part_name}</div>
                        <div className="text-xs text-muted-foreground">Code: {part.part_code || 'N/A'}</div>
                        {part.manufacturer && (
                          <div className="text-xs text-muted-foreground/70 flex items-center gap-1">
                            <Factory className="w-3 h-3" />
                            {part.manufacturer}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <CategoryBadge category={part.category} />
                        {part.sub_category && <div className="text-xs text-muted-foreground mt-1">{part.sub_category}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-foreground">{part.current_stock?.quantity_available ?? 0}</span>
                          <span className="text-xs text-muted-foreground">{part.unit_of_measure}</span>
                        </div>
                        <StockBadge 
                          available={part.current_stock?.quantity_available ?? 0} 
                          minStock={part.min_stock_level} 
                          reorderPoint={part.reorder_point} 
                        />
                        {part.current_stock && part.current_stock.quantity_allocated > 0 && (
                          <div className="text-xs text-primary/80 mt-1">
                            {part.current_stock.quantity_allocated} allocated
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm flex items-center gap-1 text-foreground">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {part.current_stock?.location_in_store || 'Not assigned'}
                        </div>
                        {part.current_stock?.bin_number && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            Bin: {part.current_stock.bin_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {part.current_stock?.selling_price 
                            ? `₹${part.current_stock.selling_price.toLocaleString()}`
                            : 'Not set'}
                        </div>
                        {part.current_stock?.mrp && (
                          <div className="text-xs text-muted-foreground">MRP: ₹{part.current_stock.mrp.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm flex items-center gap-1 text-foreground">
                          <Truck className="w-3 h-3 text-muted-foreground" />
                          {part.supplier_name || 'N/A'}
                        </div>
                        {part.supplier_part_code && (
                          <div className="text-xs text-muted-foreground">{part.supplier_part_code}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {part.is_active ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 inline-flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground inline-flex items-center gap-1">
                            <X className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-0.5">
                          <button onClick={() => viewPart(part.id)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEdit(part)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Edit">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button onClick={() => openStockAdjustment(part)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Adjust Stock">
                            <Box className="w-4 h-4" />
                          </button>
                          <button onClick={() => openTransactionHistory(part)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="History">
                            <ClipboardList className="w-4 h-4" />
                          </button>
                          <button onClick={() => deletePart(part.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Delete">
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
          {!loading && parts.length > 0 && (
            <div className="px-6 py-4 border-t border-border/40 flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalParts)} of {totalParts} parts
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-border rounded-xl text-sm bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors flex items-center gap-1 text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="px-3 py-1.5 text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-border rounded-xl text-sm bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors flex items-center gap-1 text-foreground"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Part Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-background/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex-shrink-0 bg-card border-b border-border/60 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Package className="w-5 h-5" />
                  {editingPart ? 'Edit Part' : 'Add New Part'}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Section {currentTabIndex + 1} of {tabs.length}: {tabs[currentTabIndex].label}
                  {tabs[currentTabIndex].mandatoryFields.length > 0 && (
                    <span className="text-red-500 ml-2">* Required fields</span>
                  )}
                </p>
              </div>
              <button onClick={() => { setShowFormModal(false); setEditingPart(null); resetForm(); }} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full bg-muted h-1.5">
              <div className="bg-primary h-1.5 transition-all duration-300 ease-in-out" style={{ width: `${((currentTabIndex + 1) / tabs.length) * 100}%` }}></div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {sectionError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{sectionError}</span>
                </div>
              )}

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
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                      {tab.mandatoryFields.length > 0 && <span className="text-red-400 text-xs">*</span>}
                      {index < currentTabIndex && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                {/* Basic Info Tab */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1">Part Code</label>
                      <input type="text" value={formData.part_code} onChange={(e) => setFormData({...formData, part_code: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" placeholder="Auto-generated if empty" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Part Name *</label>
                      <input type="text" value={formData.part_name} onChange={(e) => setFormData({...formData, part_name: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground ${formErrors.part_name ? 'border-red-500' : 'border-border'}`} />
                      {formErrors.part_name && <p className="text-red-500 text-xs mt-1">{formErrors.part_name}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Category *</label>
                      <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground ${formErrors.category ? 'border-red-500' : 'border-border'}`}>
                        <option value="Battery">Battery</option>
                        <option value="Motor">Motor</option>
                        <option value="Controller">Controller</option>
                        <option value="Charger">Charger</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Body Parts">Body Parts</option>
                        <option value="Brakes">Brakes</option>
                        <option value="Suspension">Suspension</option>
                        <option value="Tyres">Tyres</option>
                        <option value="Lighting">Lighting</option>
                        <option value="Accessories">Accessories</option>
                        <option value="Consumables">Consumables</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Sub Category</label>
                      <input type="text" value={formData.sub_category} onChange={(e) => setFormData({...formData, sub_category: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Unit of Measure</label>
                      <select value={formData.unit_of_measure} onChange={(e) => setFormData({...formData, unit_of_measure: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground">
                        <option value="Piece">Piece</option>
                        <option value="Set">Set</option>
                        <option value="Pair">Pair</option>
                        <option value="Liter">Liter</option>
                        <option value="Kg">Kg</option>
                        <option value="Meter">Meter</option>
                        <option value="Box">Box</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Manufacturer</label>
                      <input type="text" value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={formData.is_consumable} onChange={(e) => setFormData({...formData, is_consumable: e.target.checked})} className="rounded" />
                      <span className="text-sm">Is Consumable</span>
                    </label>
                    <div>
                      <label className="block text-sm font-medium mb-1">Warranty (Months)</label>
                      <input type="number" value={formData.warranty_months} onChange={(e) => setFormData({...formData, warranty_months: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                  </div>
                )}

                {/* Supplier Tab */}
                {activeTab === 'supplier' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Truck className="w-4 h-4" />
                        Supplier Name
                      </label>
                      <input type="text" value={formData.supplier_name} onChange={(e) => setFormData({...formData, supplier_name: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        Supplier Part Code
                      </label>
                      <input type="text" value={formData.supplier_part_code} onChange={(e) => setFormData({...formData, supplier_part_code: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Lead Time (Days)
                      </label>
                      <input type="number" value={formData.lead_time_days} onChange={(e) => setFormData({...formData, lead_time_days: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                  </div>
                )}

                {/* Inventory Settings Tab */}
                {activeTab === 'inventory' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Min Stock Level</label>
                        <input type="number" value={formData.min_stock_level} onChange={(e) => setFormData({...formData, min_stock_level: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Max Stock Level</label>
                        <input type="number" value={formData.max_stock_level} onChange={(e) => setFormData({...formData, max_stock_level: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Reorder Point</label>
                        <input type="number" value={formData.reorder_point} onChange={(e) => setFormData({...formData, reorder_point: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          Location in Store
                        </label>
                        <input type="text" value={formData.location_in_store} onChange={(e) => setFormData({...formData, location_in_store: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" placeholder="e.g., Section A" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Hash className="w-4 h-4" />
                          Bin Number
                        </label>
                        <input type="text" value={formData.bin_number} onChange={(e) => setFormData({...formData, bin_number: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" placeholder="e.g., BIN-001" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          <Ruler className="w-4 h-4" />
                          Rack Number
                        </label>
                        <input type="text" value={formData.rack_number} onChange={(e) => setFormData({...formData, rack_number: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" placeholder="e.g., RACK-A" />
                      </div>
                    </div>
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({...formData, is_active: e.target.checked})} className="rounded" />
                      <span className="text-sm font-medium">Active - Part is currently in use</span>
                    </label>
                  </div>
                )}

                {/* Pricing Tab */}
                {activeTab === 'pricing' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        Selling Price (₹)
                      </label>
                      <input type="number" step="0.01" value={formData.selling_price} onChange={(e) => setFormData({...formData, selling_price: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground ${formErrors.selling_price ? 'border-red-500' : 'border-border'}`} />
                      {formErrors.selling_price && <p className="text-red-500 text-xs mt-1">{formErrors.selling_price}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        MRP (₹)
                      </label>
                      <input type="number" step="0.01" value={formData.mrp} onChange={(e) => setFormData({...formData, mrp: e.target.value})} className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground ${formErrors.mrp ? 'border-red-500' : 'border-border'}`} />
                      {formErrors.mrp && <p className="text-red-500 text-xs mt-1">{formErrors.mrp}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">HSN Code</label>
                      <input type="text" value={formData.hsn_code} onChange={(e) => setFormData({...formData, hsn_code: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">GST Percentage</label>
                      <input type="number" step="0.01" value={formData.gst_percentage} onChange={(e) => setFormData({...formData, gst_percentage: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
                    </div>
                  </div>
                )}

                {/* Compatibility Tab */}
                {activeTab === 'compatibility' && (
                  <div className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                        <Link className="w-4 h-4" />
                        Compatible Vehicle Models
                      </label>
                      <input 
                        type="text" 
                        value={formData.compatible_vehicle_models} 
                        onChange={(e) => setFormData({...formData, compatible_vehicle_models: e.target.value})} 
                        className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" 
                        placeholder="Comma separated vehicle model IDs or names"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Enter vehicle model IDs or names separated by commas</p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="sticky bottom-0 bg-card border-t border-border/60 mt-8 pt-4 flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => { setShowFormModal(false); setEditingPart(null); resetForm(); }}
                      className="px-4 py-2 border border-border rounded-xl text-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    {!isFirstTab && (
                      <button
                        type="button"
                        onClick={goToPreviousTab}
                        className="px-4 py-2 border border-border rounded-xl text-foreground hover:bg-muted transition-colors flex items-center space-x-2"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground">{currentTabIndex + 1} of {tabs.length}</span>
                    {!isLastTab ? (
                      <button
                        type="button"
                        onClick={goToNextTab}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center space-x-2"
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
                        {isSubmitting ? 'Saving...' : (editingPart ? 'Update Part' : 'Create Part')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && selectedPart && (
        <div className="fixed inset-0 backdrop-blur-md bg-background/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-lg animate-fade-in">
            <div className="px-6 py-4 border-b border-border/60 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <Box className="w-5 h-5" />
                  Stock Adjustment
                </h2>
                <p className="text-sm text-muted-foreground">{selectedPart.part_name} ({selectedPart.part_code})</p>
                <p className="text-sm font-medium mt-1 text-foreground">
                  Current Stock: <span className="text-primary">{selectedPart.current_stock?.quantity_available ?? 0} {selectedPart.unit_of_measure}</span>
                </p>
              </div>
              <button onClick={() => setShowStockModal(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Transaction Type</label>
                <select value={stockForm.transaction_type} onChange={(e) => setStockForm({...stockForm, transaction_type: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground">
                  <option value="Stock_Adjustment_Add">Add Stock</option>
                  <option value="Stock_Adjustment_Remove">Remove Stock</option>
                  <option value="Damaged_WriteOff">Damaged - Write Off</option>
                  <option value="Return_to_Supplier">Return to Supplier</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity *</label>
                <input type="number" value={stockForm.quantity} onChange={(e) => setStockForm({...stockForm, quantity: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" placeholder="Enter quantity" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Unit Cost (₹)</label>
                <input type="number" step="0.01" value={stockForm.unit_cost} onChange={(e) => setStockForm({...stockForm, unit_cost: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea rows={3} value={stockForm.notes} onChange={(e) => setStockForm({...stockForm, notes: e.target.value})} className="w-full border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background text-foreground" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setShowStockModal(false)} className="px-4 py-2 border border-border rounded-xl text-foreground hover:bg-muted transition-colors">Cancel</button>
                <button onClick={handleStockAdjustment} disabled={isSubmitting} className="px-6 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Processing...' : 'Confirm Adjustment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Modal */}
      {showTransactionModal && selectedPart && (
        <div className="fixed inset-0 backdrop-blur-md bg-background/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex-shrink-0 bg-card border-b border-border/60 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                  <ClipboardList className="w-5 h-5" />
                  Transaction History
                </h2>
                <p className="text-sm text-muted-foreground">{selectedPart.part_name} ({selectedPart.part_code})</p>
              </div>
              <button onClick={() => setShowTransactionModal(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mb-4 text-muted-foreground/30" />
                  <p>No transactions found</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-border/40">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        <div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        <div className="flex items-center gap-1"><Activity className="w-3 h-3" /> Type</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        <div className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Quantity</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        <div className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> Cost</div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {transactions.map((trans) => (
                      <tr key={trans.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-sm text-foreground">{new Date(trans.transaction_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                            trans.transaction_type.includes('Add') || trans.transaction_type === 'Purchase'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {trans.transaction_type.includes('Add') || trans.transaction_type === 'Purchase' 
                              ? <TrendingUp className="w-3 h-3" /> 
                              : <TrendingDown className="w-3 h-3" />}
                            {trans.transaction_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{trans.quantity}</td>
                        <td className="px-4 py-3 text-sm">{trans.total_amount ? `₹${trans.total_amount.toLocaleString()}` : '-'}</td>
                        <td className="px-4 py-3 text-sm">{trans.performed_by_user?.full_name || 'System'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{trans.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedPart && (
        <div className="fixed inset-0 backdrop-blur-md bg-background/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="flex-shrink-0 bg-card border-b border-border/60 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Eye className="w-5 h-5" />
                Part Details
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-foreground">{selectedPart.part_name}</h3>
                  <p className="text-muted-foreground">Code: {selectedPart.part_code || 'N/A'}</p>
                  {selectedPart.manufacturer && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Factory className="w-4 h-4" />
                      {selectedPart.manufacturer}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <CategoryBadge category={selectedPart.category} />
                  <StockBadge 
                    available={selectedPart.current_stock?.quantity_available ?? 0} 
                    minStock={selectedPart.min_stock_level} 
                    reorderPoint={selectedPart.reorder_point} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <Warehouse className="w-4 h-4" />
                    Inventory
                  </h4>
                  <p><strong>On Hand:</strong> {selectedPart.current_stock?.quantity_on_hand ?? 0} {selectedPart.unit_of_measure}</p>
                  <p><strong>Allocated:</strong> {selectedPart.current_stock?.quantity_allocated ?? 0}</p>
                  <p><strong>Available:</strong> {selectedPart.current_stock?.quantity_available ?? 0}</p>
                  <p><strong>Location:</strong> {selectedPart.current_stock?.location_in_store || 'N/A'}</p>
                  {selectedPart.current_stock?.bin_number && <p><strong>Bin:</strong> {selectedPart.current_stock.bin_number}</p>}
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Pricing
                  </h4>
                  <p><strong>Selling Price:</strong> {selectedPart.current_stock?.selling_price ? `₹${selectedPart.current_stock.selling_price.toLocaleString()}` : 'N/A'}</p>
                  <p><strong>MRP:</strong> {selectedPart.current_stock?.mrp ? `₹${selectedPart.current_stock.mrp.toLocaleString()}` : 'N/A'}</p>
                  <p><strong>Avg Cost:</strong> ₹{selectedPart.current_stock?.average_cost?.toLocaleString() || '0'}</p>
                  <p><strong>GST:</strong> {selectedPart.gst_percentage}%</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Supplier
                  </h4>
                  <p><strong>Name:</strong> {selectedPart.supplier_name || 'N/A'}</p>
                  <p><strong>Part Code:</strong> {selectedPart.supplier_part_code || 'N/A'}</p>
                  <p><strong>Lead Time:</strong> {selectedPart.lead_time_days ? `${selectedPart.lead_time_days} days` : 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 border-b pb-1 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Stock Settings
                  </h4>
                  <p><strong>Min Level:</strong> {selectedPart.min_stock_level}</p>
                  <p><strong>Max Level:</strong> {selectedPart.max_stock_level}</p>
                  <p><strong>Reorder Point:</strong> {selectedPart.reorder_point}</p>
                </div>
              </div>
              {selectedPart.description && (
                <div className="mt-4">
                  <h4 className="font-semibold border-b pb-1">Description</h4>
                  <p className="mt-2 text-muted-foreground">{selectedPart.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
