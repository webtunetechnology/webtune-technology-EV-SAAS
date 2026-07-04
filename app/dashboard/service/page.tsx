// app/services/page.tsx - Service Management System (WITH EDIT SERVICE RECORD)

'use client';

import { apiClient } from '@/lib/supabase/api-client';
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { 
  Calendar, 
  Wrench, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  CheckCircle, 
  X, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Battery,
  Star,
  AlertCircle,
  AlertTriangle,
  Info,
  DollarSign,
  Clock,
  User,
  Car,
  Settings,
  FileText,
  Trash2,
  ArrowRight,
  Phone,
  Gauge,
  CalendarDays,
  CreditCard,
  Building2,
  Shield,
  Layers
} from 'lucide-react';

// Types
interface ServiceAppointment {
  id: string;
  showroom_id: string;
  assigned_technician_id: string | null;
  customer_id: string;
  vehicle_id: string;
  appointment_date: string;
  appointment_time: string;
  service_type: string | null;
  customer_notes: string | null;
  status: 'Scheduled' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
  customer?: { id: string; first_name: string; last_name: string | null; mobile: string; };
  vehicle?: { id: string; chassis_number: string; registration_number: string | null; vehicle_model?: { model_name: string; brand?: { brand_name: string }; }; };
  technician?: { id: string; full_name: string; };
  created_at: string;
  updated_at: string;
}

interface ServiceRecord {
  id: string;
  showroom_id: string;
  completed_by: string | null;
  customer_id: string;
  vehicle_id: string;
  service_date: string;
  service_type: string;
  service_center: string | null;
  odometer_reading: number;
  customer_complaint: string | null;
  customer_rating: number | null;
  issues_found: string | null;
  work_done: string | null;
  technician_notes: string | null;
  parts_replaced: any;
  battery_health_before: number | null;
  battery_health_after: number | null;
  software_version_before: string | null;
  software_version_after: string | null;
  battery_cells_balanced: boolean;
  motor_efficiency_check: string | null;
  charging_port_status: string | null;
  thermal_management_check: string | null;
  labor_cost: number;
  parts_cost: number;
  tax_amount: number;
  discount_amount: number;
  payment_status: 'Pending' | 'Paid' | 'Warranty' | 'Insurance';
  payment_method: string | null;
  next_service_due_km: number | null;
  next_service_due_date: string | null;
  reminder_sent: boolean;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'Delayed';
  completed_at: string | null;
  customer?: { id: string; first_name: string; last_name: string | null; mobile: string; };
  vehicle?: { id: string; chassis_number: string; registration_number: string | null; current_odometer_km: number; vehicle_model?: { model_name: string; brand?: { brand_name: string }; }; };
  technician?: { id: string; full_name: string; };
  created_at: string;
  updated_at: string;
}

interface Part {
  id: string;
  part_code: string;
  part_name: string;
  category: string;
  selling_price: number | null;
  gst_percentage: number;
  current_stock?: { quantity_available: number; selling_price: number | null; } | any;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string | null;
  mobile: string;
  customer_code: string;
}

interface CustomerVehicle {
  id: string;
  chassis_number: string;
  registration_number: string | null;
  current_odometer_km: number;
  vehicle_status: string;
  vehicle_model?: { id: string; model_name: string; brand?: { brand_name: string }; };
}

interface Technician {
  id: string;
  full_name: string;
  email: string | null;
  mobile_number: string;
}

interface PartsUsed {
  part_id: string;
  part_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Toast Component
const Toast = ({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors: Record<string, string> = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500'
  };

  const icons: Record<string, React.ReactNode> = {
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
const StatusBadge = ({ status, type }: { status: string; type: 'appointment' | 'service' | 'payment' }) => {
  const colors: Record<string, string> = {
    'Scheduled': 'bg-blue-100 text-blue-800',
    'Confirmed': 'bg-purple-100 text-purple-800',
    'In Progress': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-green-100 text-green-800',
    'Cancelled': 'bg-red-100 text-red-800',
    'No Show': 'bg-muted text-muted-foreground',
    'Delayed': 'bg-orange-100 text-orange-800',
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Paid': 'bg-green-100 text-green-800',
    'Warranty': 'bg-blue-100 text-blue-800',
    'Insurance': 'bg-purple-100 text-purple-800',
  };

  const icons: Record<string, React.ReactNode> = {
    'Scheduled': <Calendar className="w-3 h-3 inline mr-1" />,
    'Confirmed': <CheckCircle className="w-3 h-3 inline mr-1" />,
    'In Progress': <Clock className="w-3 h-3 inline mr-1" />,
    'Completed': <CheckCircle className="w-3 h-3 inline mr-1" />,
    'Cancelled': <X className="w-3 h-3 inline mr-1" />,
    'No Show': <AlertCircle className="w-3 h-3 inline mr-1" />,
    'Delayed': <AlertTriangle className="w-3 h-3 inline mr-1" />,
    'Pending': <Clock className="w-3 h-3 inline mr-1" />,
    'Paid': <CheckCircle className="w-3 h-3 inline mr-1" />,
    'Warranty': <Shield className="w-3 h-3 inline mr-1" />,
    'Insurance': <Building2 className="w-3 h-3 inline mr-1" />,
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center ${colors[status] || 'bg-muted text-muted-foreground'}`}>
      {icons[status]}
      {status}
    </span>
  );
};

// Service Type Badge
const ServiceTypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    'Free Service': 'bg-green-100 text-green-800',
    'Paid Service': 'bg-blue-100 text-blue-800',
    'Warranty Repair': 'bg-purple-100 text-purple-800',
    'Accidental Repair': 'bg-red-100 text-red-800',
    'Recall': 'bg-orange-100 text-orange-800',
    'Battery Replacement': 'bg-yellow-100 text-yellow-800',
    'Software Update': 'bg-cyan-100 text-cyan-800',
  };

  const icons: Record<string, React.ReactNode> = {
    'Free Service': <CheckCircle className="w-3 h-3 inline mr-1" />,
    'Paid Service': <DollarSign className="w-3 h-3 inline mr-1" />,
    'Warranty Repair': <Shield className="w-3 h-3 inline mr-1" />,
    'Accidental Repair': <AlertTriangle className="w-3 h-3 inline mr-1" />,
    'Recall': <AlertCircle className="w-3 h-3 inline mr-1" />,
    'Battery Replacement': <Battery className="w-3 h-3 inline mr-1" />,
    'Software Update': <Settings className="w-3 h-3 inline mr-1" />,
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center ${colors[type] || 'bg-muted text-muted-foreground'}`}>
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
        <div key={i} className="h-20 bg-muted rounded-lg animate-pulse"></div>
      ))}
    </div>
    <div className="h-96 bg-muted rounded-lg animate-pulse"></div>
  </div>
);

export default function ServiceManagementPage() {
  // State
  const [activeView, setActiveView] = useState<'appointments' | 'records'>('appointments');
  const [appointments, setAppointments] = useState<ServiceAppointment[]>([]);
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<ServiceAppointment | null>(null);
  const [editingServiceRecord, setEditingServiceRecord] = useState<ServiceRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    inProgress: 0,
    completedToday: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    avgRating: 0,
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    service_type: '',
    payment_status: '',
    date_from: '',
    date_to: '',
  });

  const [partsUsed, setPartsUsed] = useState<PartsUsed[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Appointment Form
  const [appointmentForm, setAppointmentForm] = useState({
    customer_id: '',
    vehicle_id: '',
    appointment_date: new Date().toISOString().split('T')[0],
    appointment_time: '10:00',
    service_type: '',
    assigned_technician_id: '',
    customer_notes: '',
    status: 'Scheduled' as ServiceAppointment['status'],
  });

  // Service Record Form
  const [serviceForm, setServiceForm] = useState({
    customer_id: '',
    vehicle_id: '',
    service_date: new Date().toISOString().split('T')[0],
    service_type: 'Free Service',
    odometer_reading: '',
    customer_complaint: '',
    issues_found: '',
    work_done: '',
    technician_notes: '',
    battery_health_before: '',
    battery_health_after: '',
    software_version_before: '',
    software_version_after: '',
    battery_cells_balanced: true,
    motor_efficiency_check: '',
    charging_port_status: '',
    thermal_management_check: '',
    labor_cost: '',
    parts_cost: '0',
    tax_amount: '',
    discount_amount: '0',
    payment_status: 'Pending' as ServiceRecord['payment_status'],
    payment_method: '',
    next_service_due_km: '',
    next_service_due_date: '',
    status: 'In Progress' as ServiceRecord['status'],
    completed_by: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAppointmentModal || showServiceModal || showEditServiceModal || showDetailModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [showAppointmentModal, showServiceModal, showEditServiceModal, showDetailModal]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        activeView === 'appointments' ? loadAppointments() : loadRecords();
      } else {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (activeView === 'appointments') loadAppointments();
    else loadRecords();
    loadStats();
    loadCustomers();
    loadTechnicians();
    loadParts();
  }, [currentPage, filters, activeView]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '20' });
      if (searchTerm) params.append('search', searchTerm);
      if (filters.status) params.append('status', filters.status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      const result = await apiClient.get(`/api/service-appointments?${params}`);
      if (result.success) { setAppointments(result.data); setTotalPages(result.totalPages); }
    } catch (error) { showToast('Failed to load appointments', 'error'); }
    finally { setLoading(false); }
  }, [currentPage, searchTerm, filters]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '20' });
      if (searchTerm) params.append('search', searchTerm);
      if (filters.status) params.append('status', filters.status);
      if (filters.service_type) params.append('service_type', filters.service_type);
      if (filters.payment_status) params.append('payment_status', filters.payment_status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      const result = await apiClient.get(`/api/service-records?${params}`);
      if (result.success) { setRecords(result.data); setTotalPages(result.totalPages); }
    } catch (error) { showToast('Failed to load service records', 'error'); }
    finally { setLoading(false); }
  }, [currentPage, searchTerm, filters]);

  const loadStats = useCallback(async () => {
    try {
      const result = await apiClient.get('/api/service-stats');
      if (result.success) setStats(result.stats);
    } catch (error) { console.error('Error loading stats:', error); }
  }, []);

  const loadCustomers = async () => {
    try {
      const result = await apiClient.get('/api/customers?limit=100&customer_status=Active');
      if (result.success) setCustomers(result.data);
    } catch (error) { console.error('Error loading customers:', error); }
  };

  const loadVehicles = async (customerId: string) => {
    try {
      const result = await apiClient.get(`/api/customer-vehicles?customer_id=${customerId}&vehicle_status=Active`);
      if (result.success) setVehicles(result.data);
    } catch (error) { console.error('Error loading vehicles:', error); }
  };

  const loadTechnicians = async () => {
    try {
      const result = await apiClient.get('/api/technicians');
      if (result.success) setTechnicians(result.data);
    } catch (error) { console.error('Error loading technicians:', error); }
  };

  const loadParts = async () => {
    try {
      const result = await apiClient.get('/api/parts?is_active=true&limit=200');
      if (result.success) setParts(result.data);
    } catch (error) { console.error('Error loading parts:', error); }
  };

  const handleCustomerChange = (customerId: string) => {
    setAppointmentForm(prev => ({ ...prev, customer_id: customerId, vehicle_id: '' }));
    setServiceForm(prev => ({ ...prev, customer_id: customerId, vehicle_id: '' }));
    if (customerId) loadVehicles(customerId);
  };

  const resetAppointmentForm = () => {
    setAppointmentForm({
      customer_id: '', vehicle_id: '',
      appointment_date: new Date().toISOString().split('T')[0], appointment_time: '10:00',
      service_type: '', assigned_technician_id: '', customer_notes: '', status: 'Scheduled',
    });
    setFormErrors({});
  };

  const setAppointmentFormFromData = (appt: ServiceAppointment) => {
    setAppointmentForm({
      customer_id: appt.customer_id, vehicle_id: appt.vehicle_id,
      appointment_date: appt.appointment_date, appointment_time: appt.appointment_time,
      service_type: appt.service_type || '', assigned_technician_id: appt.assigned_technician_id || '',
      customer_notes: appt.customer_notes || '', status: appt.status,
    });
    if (appt.customer_id) loadVehicles(appt.customer_id);
  };

  const resetServiceForm = () => {
    setServiceForm({
      customer_id: '', vehicle_id: '', service_date: new Date().toISOString().split('T')[0],
      service_type: 'Free Service', odometer_reading: '', customer_complaint: '', issues_found: '',
      work_done: '', technician_notes: '', battery_health_before: '', battery_health_after: '',
      software_version_before: '', software_version_after: '', battery_cells_balanced: true,
      motor_efficiency_check: '', charging_port_status: '', thermal_management_check: '',
      labor_cost: '', parts_cost: '0', tax_amount: '', discount_amount: '0',
      payment_status: 'Pending', payment_method: '', next_service_due_km: '', next_service_due_date: '',
      status: 'In Progress', completed_by: '',
    });
    setPartsUsed([]);
    setFormErrors({});
  };

  const setServiceFormFromAppointment = (appt: ServiceAppointment) => {
    setServiceForm({
      customer_id: appt.customer_id, vehicle_id: appt.vehicle_id,
      service_date: new Date().toISOString().split('T')[0],
      service_type: (appt.service_type as any) || 'Free Service', odometer_reading: '',
      customer_complaint: appt.customer_notes || '', issues_found: '', work_done: '', technician_notes: '',
      battery_health_before: '', battery_health_after: '', software_version_before: '', software_version_after: '',
      battery_cells_balanced: true, motor_efficiency_check: '', charging_port_status: '', thermal_management_check: '',
      labor_cost: '', parts_cost: '0', tax_amount: '', discount_amount: '0',
      payment_status: 'Pending', payment_method: '', next_service_due_km: '', next_service_due_date: '',
      status: 'In Progress', completed_by: appt.assigned_technician_id || '',
    });
    setPartsUsed([]);
    if (appt.customer_id) loadVehicles(appt.customer_id);
  };

  // Parts management
  const addPart = () => {
    setPartsUsed([...partsUsed, { part_id: '', part_name: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removePart = (index: number) => {
    const updated = partsUsed.filter((_, i) => i !== index);
    setPartsUsed(updated);
    updatePartsCost(updated);
  };

  const updatePart = (index: number, field: string, value: any) => {
    const updated = [...partsUsed];
    if (field === 'part_id') {
      const part = parts.find(p => p.id === value);
      if (part) {
        updated[index] = { ...updated[index], part_id: value, part_name: part.part_name, unit_price: part.current_stock?.selling_price || part.selling_price || 0 };
      }
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    updated[index].total = updated[index].quantity * updated[index].unit_price;
    setPartsUsed(updated);
    updatePartsCost(updated);
  };

  const updatePartsCost = (partsList: PartsUsed[]) => {
    const total = partsList.reduce((sum, p) => sum + p.total, 0);
    setServiceForm(prev => ({ ...prev, parts_cost: total.toString() }));
  };

  // Validation
  const validateAppointment = (): boolean => {
    const errors: Record<string, string> = {};
    if (!appointmentForm.customer_id) errors.customer_id = 'Customer is required';
    if (!appointmentForm.vehicle_id) errors.vehicle_id = 'Vehicle is required';
    if (!appointmentForm.appointment_date) errors.appointment_date = 'Date is required';
    if (!appointmentForm.appointment_time) errors.appointment_time = 'Time is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateService = (): boolean => {
    const errors: Record<string, string> = {};
    if (!serviceForm.customer_id) errors.customer_id = 'Customer is required';
    if (!serviceForm.vehicle_id) errors.vehicle_id = 'Vehicle is required';
    if (!serviceForm.odometer_reading) errors.odometer_reading = 'Odometer reading is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // CRUD Operations
  const createAppointment = async () => {
    if (!validateAppointment()) return;
    setIsSubmitting(true);
    try {
      const result = await apiClient.post('/api/service-appointments', appointmentForm);
      if (result.success) {
        await loadAppointments(); await loadStats();
        setShowAppointmentModal(false); resetAppointmentForm();
        showToast('Appointment created!', 'success');
      } else { showToast(result.error || 'Failed', 'error'); }
    } catch { showToast('Failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const updateAppointment = async () => {
    if (!editingAppointment || !validateAppointment()) return;
    setIsSubmitting(true);
    try {
      const result = await apiClient.put(`/api/service-appointments/${editingAppointment.id}`, appointmentForm);
      if (result.success) {
        await loadAppointments();
        setShowAppointmentModal(false); setEditingAppointment(null); resetAppointmentForm();
        showToast('Appointment updated!', 'success');
      }
    } catch { showToast('Failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const createServiceRecord = async () => {
    if (!validateService()) return;
    setIsSubmitting(true);
    try {
      const data = {
        ...serviceForm,
        odometer_reading: parseInt(serviceForm.odometer_reading),
        labor_cost: parseFloat(serviceForm.labor_cost || '0'),
        parts_cost: parseFloat(serviceForm.parts_cost || '0'),
        tax_amount: parseFloat(serviceForm.tax_amount || '0'),
        discount_amount: parseFloat(serviceForm.discount_amount || '0'),
        battery_health_before: serviceForm.battery_health_before ? parseFloat(serviceForm.battery_health_before) : null,
        battery_health_after: serviceForm.battery_health_after ? parseFloat(serviceForm.battery_health_after) : null,
        next_service_due_km: serviceForm.next_service_due_km ? parseInt(serviceForm.next_service_due_km) : null,
        next_service_due_date: serviceForm.next_service_due_date || null,
        completed_by: serviceForm.completed_by || null,
        parts_replaced: partsUsed.length > 0 ? partsUsed : null,
      };
      const result = await apiClient.post('/api/service-records', data);
      if (result.success) {
        await loadRecords(); await loadStats(); await loadParts();
        setShowServiceModal(false); resetServiceForm();
        showToast('Service record created!', 'success');
      } else { showToast(result.error || 'Failed', 'error'); }
    } catch { showToast('Failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleEditServiceRecord = async (recordId: string) => {
    try {
      const result = await apiClient.get(`/api/service-records/${recordId}`);
      if (result.success) {
        const record = result.data;
        setEditingServiceRecord(record);
        setServiceForm({
          customer_id: record.customer_id || '',
          vehicle_id: record.vehicle_id || '',
          service_date: record.service_date || new Date().toISOString().split('T')[0],
          service_type: record.service_type || 'Free Service',
          odometer_reading: record.odometer_reading?.toString() || '',
          customer_complaint: record.customer_complaint || '',
          issues_found: record.issues_found || '',
          work_done: record.work_done || '',
          technician_notes: record.technician_notes || '',
          battery_health_before: record.battery_health_before?.toString() || '',
          battery_health_after: record.battery_health_after?.toString() || '',
          software_version_before: record.software_version_before || '',
          software_version_after: record.software_version_after || '',
          battery_cells_balanced: record.battery_cells_balanced !== false,
          motor_efficiency_check: record.motor_efficiency_check || '',
          charging_port_status: record.charging_port_status || '',
          thermal_management_check: record.thermal_management_check || '',
          labor_cost: record.labor_cost?.toString() || '',
          parts_cost: record.parts_cost?.toString() || '0',
          tax_amount: record.tax_amount?.toString() || '',
          discount_amount: record.discount_amount?.toString() || '0',
          payment_status: record.payment_status || 'Pending',
          payment_method: record.payment_method || '',
          next_service_due_km: record.next_service_due_km?.toString() || '',
          next_service_due_date: record.next_service_due_date || '',
          status: record.status || 'In Progress',
          completed_by: record.completed_by || '',
        });
        if (record.parts_replaced && Array.isArray(record.parts_replaced)) {
          setPartsUsed(record.parts_replaced.map((p: any) => ({
            part_id: p.part_id || '',
            part_name: p.part_name || '',
            quantity: p.quantity || 1,
            unit_price: p.unit_price || 0,
            total: (p.quantity || 0) * (p.unit_price || 0),
          })));
        } else {
          setPartsUsed([]);
        }
        if (record.customer_id) loadVehicles(record.customer_id);
        setShowEditServiceModal(true);
      }
    } catch { showToast('Failed to load record', 'error'); }
  };

  const updateServiceRecord = async () => {
    if (!editingServiceRecord || !validateService()) return;
    setIsSubmitting(true);
    try {
      const data = {
        ...serviceForm,
        odometer_reading: parseInt(serviceForm.odometer_reading),
        labor_cost: parseFloat(serviceForm.labor_cost || '0'),
        parts_cost: parseFloat(serviceForm.parts_cost || '0'),
        tax_amount: parseFloat(serviceForm.tax_amount || '0'),
        discount_amount: parseFloat(serviceForm.discount_amount || '0'),
        battery_health_before: serviceForm.battery_health_before ? parseFloat(serviceForm.battery_health_before) : null,
        battery_health_after: serviceForm.battery_health_after ? parseFloat(serviceForm.battery_health_after) : null,
        next_service_due_km: serviceForm.next_service_due_km ? parseInt(serviceForm.next_service_due_km) : null,
        next_service_due_date: serviceForm.next_service_due_date || null,
        completed_by: serviceForm.completed_by || null,
        parts_replaced: partsUsed.length > 0 ? partsUsed : null,
      };
      const result = await apiClient.put(`/api/service-records/${editingServiceRecord.id}`, data);
      if (result.success) {
        await loadRecords(); await loadStats();
        setShowEditServiceModal(false); setEditingServiceRecord(null); resetServiceForm();
        showToast('Service record updated!', 'success');
      } else { showToast(result.error || 'Failed', 'error'); }
    } catch { showToast('Failed', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const updateServiceStatus = async (id: string, status: string) => {
    try {
      const result = await apiClient.put(`/api/service-records/${id}`, { status });
      if (result.success) { await loadRecords(); await loadStats(); showToast(`Service marked as ${status}!`, 'success'); }
    } catch { showToast('Failed', 'error'); }
  };

  const viewRecord = async (id: string) => {
    try {
      const result = await apiClient.get(`/api/service-records/${id}`);
      if (result.success) { setSelectedRecord(result.data); setShowDetailModal(true); }
    } catch { showToast('Failed to load record', 'error'); }
  };

  const getTotalAmount = (record: ServiceRecord) => {
    return (record.labor_cost || 0) + (record.parts_cost || 0) + (record.tax_amount || 0) - (record.discount_amount || 0);
  };

  if (loading && appointments.length === 0 && records.length === 0) {
    return <div><LoadingSkeleton /></div>;
  }

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Service</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage appointments, service records, and repairs</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { resetAppointmentForm(); setEditingAppointment(null); setShowAppointmentModal(true); }} 
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Appointment
          </button>
          <button 
            onClick={() => { resetServiceForm(); setShowServiceModal(true); }} 
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-border bg-card text-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            <Plus className="w-4 h-4" />
            Service Record
          </button>
        </div>
      </div>

      {/* View Toggle & Search */}
      <div>
        <div className="mb-5 space-y-3">
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveView('appointments')} 
              className={`px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${activeView === 'appointments' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-border hover:text-foreground'}`}
            >
              <Calendar className="w-4 h-4" />
              Appointments
            </button>
            <button 
              onClick={() => setActiveView('records')} 
              className={`px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors ${activeView === 'records' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground border border-border hover:text-foreground'}`}
            >
              <Wrench className="w-4 h-4" />
              Service Records
            </button>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 max-w-xs relative">
              <Search className="absolute left-3 top-2.5 text-muted-foreground w-4 h-4" />
              <input 
                type="text" 
                placeholder={activeView === 'appointments' ? "Search by customer..." : "Search service records..."} 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full px-4 py-2 border border-border rounded-xl bg-card text-sm pl-9 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors" 
              />
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:text-foreground'}`}
            >
              <Filter className="w-4 h-4" />
              Filters {Object.values(filters).some(f => f) && <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>}
            </button>
          </div>
          {showFilters && (
            <div className="bg-card border border-border/60 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4">
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">All Status</option>
                <option value="Scheduled">Scheduled</option><option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option><option value="Cancelled">Cancelled</option>
                <option value="Delayed">Delayed</option>
              </select>
              {activeView === 'records' && (
                <>
                  <select value={filters.service_type} onChange={(e) => setFilters({ ...filters, service_type: e.target.value })} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">All Types</option>
                    <option value="Free Service">Free Service</option><option value="Paid Service">Paid Service</option>
                    <option value="Warranty Repair">Warranty Repair</option><option value="Accidental Repair">Accidental Repair</option>
                    <option value="Recall">Recall</option><option value="Battery Replacement">Battery Replacement</option>
                    <option value="Software Update">Software Update</option>
                  </select>
                  <select value={filters.payment_status} onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">All Payments</option>
                    <option value="Pending">Pending</option><option value="Paid">Paid</option>
                    <option value="Warranty">Warranty</option><option value="Insurance">Insurance</option>
                  </select>
                </>
              )}
              <input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
              <input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} className="border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            {activeView === 'appointments' ? (
              <table className="min-w-full divide-y divide-border/40">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Customer</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Vehicle</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Date & Time</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Technician</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {appointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Calendar className="w-8 h-8 text-muted-foreground/30" />
                          <span>No appointments found</span>
                        </div>
                      </td>
                    </tr>
                  ) : appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{appt.customer?.first_name} {appt.customer?.last_name || ''}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {appt.customer?.mobile}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">{appt.vehicle?.vehicle_model?.brand?.brand_name} {appt.vehicle?.vehicle_model?.model_name}</div>
                        <div className="text-xs text-muted-foreground">{appt.vehicle?.registration_number || appt.vehicle?.chassis_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">{new Date(appt.appointment_date).toLocaleDateString()}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {appt.appointment_time}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{appt.service_type || 'General'}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{appt.technician?.full_name || 'Unassigned'}</td>
                      <td className="px-6 py-4"><StatusBadge status={appt.status} type="appointment" /></td>
                      <td className="px-6 py-4">
                        <div className="flex gap-0.5">
                          <button 
                            onClick={() => { setEditingAppointment(appt); setAppointmentFormFromData(appt); setShowAppointmentModal(true); }} 
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" 
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { setServiceFormFromAppointment(appt); setShowServiceModal(true); }} 
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" 
                            title="Convert to Service"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="min-w-full divide-y divide-border/40">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Service Date</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Customer</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Vehicle</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Type</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Payment</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Rating</th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Wrench className="w-8 h-8 text-muted-foreground/30" />
                          <span>No service records found</span>
                        </div>
                      </td>
                    </tr>
                  ) : records.map((record) => {
                    const totalAmount = getTotalAmount(record);
                    return (
                      <tr key={record.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 text-sm text-foreground">{new Date(record.service_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{record.customer?.first_name} {record.customer?.last_name || ''}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {record.customer?.mobile}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-foreground">{record.vehicle?.registration_number || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Gauge className="w-3 h-3" />
                            {record.odometer_reading} km
                          </div>
                        </td>
                        <td className="px-6 py-4"><ServiceTypeBadge type={record.service_type} /></td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">₹{totalAmount.toLocaleString()}</td>
                        <td className="px-6 py-4"><StatusBadge status={record.payment_status} type="payment" /></td>
                        <td className="px-6 py-4"><StatusBadge status={record.status} type="service" /></td>
                        <td className="px-6 py-4 text-sm text-foreground">
                          {record.customer_rating ? (
                            <span className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-400 fill-current" />
                              {record.customer_rating}
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-0.5">
                            <button onClick={() => viewRecord(record.id)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEditServiceRecord(record.id)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Edit">
                              <Edit className="w-4 h-4" />
                            </button>
                            {record.status === 'In Progress' && (
                              <button onClick={() => updateServiceStatus(record.id, 'Completed')} className="p-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Mark Completed">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          {!loading && (appointments.length > 0 || records.length > 0) && (
            <div className="px-6 py-4 border-t border-border/40 flex justify-between items-center">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="px-3 py-1.5 border border-border rounded-xl text-sm bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors flex items-center gap-1 text-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages} 
                className="px-3 py-1.5 border border-border rounded-xl text-sm bg-card disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted transition-colors flex items-center gap-1 text-foreground"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-background/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="px-6 py-4 border-b border-border/60 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Calendar className="w-5 h-5" />
                {editingAppointment ? 'Edit Appointment' : 'New Appointment'}
              </h2>
              <button 
                onClick={() => { setShowAppointmentModal(false); setEditingAppointment(null); resetAppointmentForm(); }} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer *</label>
                <select 
                  value={appointmentForm.customer_id} 
                  onChange={(e) => handleCustomerChange(e.target.value)} 
                  className={`w-full border rounded px-3 py-2 ${formErrors.customer_id ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ''} - {c.mobile}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vehicle *</label>
                <select 
                  value={appointmentForm.vehicle_id} 
                  onChange={(e) => setAppointmentForm({...appointmentForm, vehicle_id: e.target.value})} 
                  className={`w-full border rounded px-3 py-2 ${formErrors.vehicle_id ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number || v.chassis_number} - {v.vehicle_model?.brand?.brand_name} {v.vehicle_model?.model_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input 
                    type="date" 
                    value={appointmentForm.appointment_date} 
                    onChange={(e) => setAppointmentForm({...appointmentForm, appointment_date: e.target.value})} 
                    className="w-full border rounded px-3 py-2" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Time *</label>
                  <input 
                    type="time" 
                    value={appointmentForm.appointment_time} 
                    onChange={(e) => setAppointmentForm({...appointmentForm, appointment_time: e.target.value})} 
                    className="w-full border rounded px-3 py-2" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Service Type</label>
                  <select 
                    value={appointmentForm.service_type} 
                    onChange={(e) => setAppointmentForm({...appointmentForm, service_type: e.target.value})} 
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select Type</option>
                    <option value="Free Service">Free Service</option>
                    <option value="Paid Service">Paid Service</option>
                    <option value="Warranty Repair">Warranty Repair</option>
                    <option value="Accidental Repair">Accidental Repair</option>
                    <option value="Recall">Recall</option>
                    <option value="Battery Replacement">Battery Replacement</option>
                    <option value="Software Update">Software Update</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Technician</label>
                  <select 
                    value={appointmentForm.assigned_technician_id} 
                    onChange={(e) => setAppointmentForm({...appointmentForm, assigned_technician_id: e.target.value})} 
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Unassigned</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea 
                  rows={3} 
                  value={appointmentForm.customer_notes} 
                  onChange={(e) => setAppointmentForm({...appointmentForm, customer_notes: e.target.value})} 
                  className="w-full border rounded px-3 py-2" 
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={() => { setShowAppointmentModal(false); setEditingAppointment(null); resetAppointmentForm(); }} 
                  className="px-4 py-2 border rounded-md"
                >
                  Cancel
                </button>
                <button 
                  onClick={editingAppointment ? updateAppointment : createAppointment} 
                  disabled={isSubmitting} 
                  className="px-6 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Saving...' : (editingAppointment ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Service Record Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-background/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="px-6 py-4 border-b border-border/60 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Wrench className="w-5 h-5" />
                New Service Record
              </h2>
              <button 
                onClick={() => { setShowServiceModal(false); resetServiceForm(); }} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ServiceFormContent 
              serviceForm={serviceForm} setServiceForm={setServiceForm}
              customers={customers} vehicles={vehicles} technicians={technicians} parts={parts}
              partsUsed={partsUsed} setPartsUsed={setPartsUsed}
              formErrors={formErrors} handleCustomerChange={handleCustomerChange}
              addPart={addPart} removePart={removePart} updatePart={updatePart}
              isSubmitting={isSubmitting} onSubmit={createServiceRecord}
              onCancel={() => { setShowServiceModal(false); resetServiceForm(); }}
              submitLabel="Create Service Record"
            />
          </div>
        </div>
      )}

      {/* Edit Service Record Modal */}
      {showEditServiceModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-background/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="px-6 py-4 border-b border-border/60 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Edit className="w-5 h-5" />
                Edit Service Record
              </h2>
              <button 
                onClick={() => { setShowEditServiceModal(false); setEditingServiceRecord(null); resetServiceForm(); }} 
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ServiceFormContent 
              serviceForm={serviceForm} setServiceForm={setServiceForm}
              customers={customers} vehicles={vehicles} technicians={technicians} parts={parts}
              partsUsed={partsUsed} setPartsUsed={setPartsUsed}
              formErrors={formErrors} handleCustomerChange={handleCustomerChange}
              addPart={addPart} removePart={removePart} updatePart={updatePart}
              isSubmitting={isSubmitting} onSubmit={updateServiceRecord}
              onCancel={() => { setShowEditServiceModal(false); setEditingServiceRecord(null); resetServiceForm(); }}
              submitLabel="Update Service Record"
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 backdrop-blur-md bg-background/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in">
            <div className="px-6 py-4 border-b border-border/60 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <FileText className="w-5 h-5" />
                Service Record Details
              </h2>
              <button onClick={() => setShowDetailModal(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedRecord.customer?.first_name} {selectedRecord.customer?.last_name}</h3>
                  <p className="text-muted-foreground">{selectedRecord.vehicle?.registration_number || selectedRecord.vehicle?.chassis_number}</p>
                </div>
                <div className="flex space-x-2">
                  <ServiceTypeBadge type={selectedRecord.service_type} />
                  <StatusBadge status={selectedRecord.status} type="service" />
                  <StatusBadge status={selectedRecord.payment_status} type="payment" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold border-b pb-1">Service Info</h4>
                  <p><strong>Date:</strong> {new Date(selectedRecord.service_date).toLocaleDateString()}</p>
                  <p><strong>Odometer:</strong> {selectedRecord.odometer_reading} km</p>
                  <p><strong>Technician:</strong> {selectedRecord.technician?.full_name || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="font-semibold border-b pb-1">
                    <Battery className="w-4 h-4 inline mr-1" />
                    Battery Diagnostics
                  </h4>
                  <p><strong>Before:</strong> {selectedRecord.battery_health_before || 'N/A'}%</p>
                  <p><strong>After:</strong> {selectedRecord.battery_health_after || 'N/A'}%</p>
                  <p><strong>Cells Balanced:</strong> {selectedRecord.battery_cells_balanced ? '✅ Yes' : '❌ No'}</p>
                </div>
              </div>
              {selectedRecord.customer_complaint && (
                <div>
                  <h4 className="font-semibold border-b pb-1">Customer Complaint</h4>
                  <p className="text-muted-foreground mt-1">{selectedRecord.customer_complaint}</p>
                </div>
              )}
              {selectedRecord.work_done && (
                <div>
                  <h4 className="font-semibold border-b pb-1">Work Done</h4>
                  <p className="text-muted-foreground mt-1">{selectedRecord.work_done}</p>
                </div>
              )}
              <div className="grid grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Labor</div>
                  <div className="font-bold text-foreground">₹{selectedRecord.labor_cost.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Parts</div>
                  <div className="font-bold text-foreground">₹{selectedRecord.parts_cost.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Tax</div>
                  <div className="font-bold text-foreground">₹{selectedRecord.tax_amount.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Discount</div>
                  <div className="font-bold text-foreground">-₹{selectedRecord.discount_amount.toLocaleString()}</div>
                </div>
              </div>
              <div className="text-center bg-primary/10 p-3 rounded-xl">
                <span className="text-sm text-muted-foreground">Total Amount: </span>
                <span className="text-xl font-bold text-primary">₹{getTotalAmount(selectedRecord).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable Service Form Content Component
function ServiceFormContent({
  serviceForm, setServiceForm, customers, vehicles, technicians, parts,
  partsUsed, setPartsUsed, formErrors, handleCustomerChange,
  addPart, removePart, updatePart, isSubmitting, onSubmit, onCancel, submitLabel
}: any) {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Customer *</label>
          <select 
            value={serviceForm.customer_id} 
            onChange={(e) => handleCustomerChange(e.target.value)} 
            className={`w-full border rounded px-3 py-2 ${formErrors.customer_id ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Select Customer</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name || ''} - {c.mobile}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Vehicle *</label>
          <select 
            value={serviceForm.vehicle_id} 
            onChange={(e) => setServiceForm({...serviceForm, vehicle_id: e.target.value})} 
            className={`w-full border rounded px-3 py-2 ${formErrors.vehicle_id ? 'border-red-500' : 'border-gray-300'}`}
          >
            <option value="">Select Vehicle</option>
            {vehicles.map((v: any) => (
              <option key={v.id} value={v.id}>{v.registration_number || v.chassis_number}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Service Date</label>
          <input 
            type="date" 
            value={serviceForm.service_date} 
            onChange={(e) => setServiceForm({...serviceForm, service_date: e.target.value})} 
            className="w-full border rounded px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Service Type</label>
          <select 
            value={serviceForm.service_type} 
            onChange={(e) => setServiceForm({...serviceForm, service_type: e.target.value})} 
            className="w-full border rounded px-3 py-2"
          >
            <option value="Free Service">Free Service</option>
            <option value="Paid Service">Paid Service</option>
            <option value="Warranty Repair">Warranty Repair</option>
            <option value="Accidental Repair">Accidental Repair</option>
            <option value="Recall">Recall</option>
            <option value="Battery Replacement">Battery Replacement</option>
            <option value="Software Update">Software Update</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Odometer (km) *</label>
          <input 
            type="number" 
            value={serviceForm.odometer_reading} 
            onChange={(e) => setServiceForm({...serviceForm, odometer_reading: e.target.value})} 
            className={`w-full border rounded px-3 py-2 ${formErrors.odometer_reading ? 'border-red-500' : 'border-gray-300'}`} 
          />
        </div>
      </div>
      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Battery className="w-4 h-4" />
          EV Diagnostics
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Battery Health Before (%)</label>
            <input 
              type="number" 
              value={serviceForm.battery_health_before} 
              onChange={(e) => setServiceForm({...serviceForm, battery_health_before: e.target.value})} 
              className="w-full border rounded px-3 py-2" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Battery Health After (%)</label>
            <input 
              type="number" 
              value={serviceForm.battery_health_after} 
              onChange={(e) => setServiceForm({...serviceForm, battery_health_after: e.target.value})} 
              className="w-full border rounded px-3 py-2" 
            />
          </div>
          <div className="flex items-center pt-6">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={serviceForm.battery_cells_balanced} 
                onChange={(e) => setServiceForm({...serviceForm, battery_cells_balanced: e.target.checked})} 
                className="mr-2" 
              />
              <span className="text-sm">Cells Balanced</span>
            </label>
          </div>
        </div>
      </div>
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Parts Used
          </h3>
          <button onClick={addPart} className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-1">
            <Plus className="w-3 h-3" />
            Add Part
          </button>
        </div>
        {partsUsed.map((part: any, index: number) => (
          <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-end">
            <div className="col-span-4">
              <select 
                value={part.part_id} 
                onChange={(e) => updatePart(index, 'part_id', e.target.value)} 
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="">Select Part</option>
                {parts.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.part_name} ({p.part_code})</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <input 
                type="number" 
                value={part.quantity} 
                onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 0)} 
                className="w-full border rounded px-2 py-1 text-sm" 
                placeholder="Qty" 
                min="1" 
              />
            </div>
            <div className="col-span-2">
              <input 
                type="number" 
                value={part.unit_price} 
                onChange={(e) => updatePart(index, 'unit_price', parseFloat(e.target.value) || 0)} 
                className="w-full border rounded px-2 py-1 text-sm" 
                placeholder="Price" 
              />
            </div>
            <div className="col-span-3 flex items-center justify-between">
              <span className="text-sm font-medium">₹{part.total.toLocaleString()}</span>
              <button onClick={() => removePart(index)} className="text-red-600 hover:text-red-800 ml-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        <div className="text-right text-sm font-semibold mt-2">
          Total Parts: ₹{partsUsed.reduce((sum: number, p: any) => sum + p.total, 0).toLocaleString()}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 border-t pt-4">
        <div>
          <label className="block text-sm font-medium mb-1">Labor Cost (₹)</label>
          <input 
            type="number" 
            value={serviceForm.labor_cost} 
            onChange={(e) => setServiceForm({...serviceForm, labor_cost: e.target.value})} 
            className="w-full border rounded px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tax (₹)</label>
          <input 
            type="number" 
            value={serviceForm.tax_amount} 
            onChange={(e) => setServiceForm({...serviceForm, tax_amount: e.target.value})} 
            className="w-full border rounded px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Discount (₹)</label>
          <input 
            type="number" 
            value={serviceForm.discount_amount} 
            onChange={(e) => setServiceForm({...serviceForm, discount_amount: e.target.value})} 
            className="w-full border rounded px-3 py-2" 
          />
        </div>
        <div className="flex items-end">
          <div className="w-full bg-muted rounded-xl px-3 py-2 text-center">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-lg font-bold">
              ₹{(parseFloat(serviceForm.labor_cost || '0') + partsUsed.reduce((sum: number, p: any) => sum + p.total, 0) + parseFloat(serviceForm.tax_amount || '0') - parseFloat(serviceForm.discount_amount || '0')).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Payment Status</label>
          <select 
            value={serviceForm.payment_status} 
            onChange={(e) => setServiceForm({...serviceForm, payment_status: e.target.value})} 
            className="w-full border rounded px-3 py-2"
          >
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Warranty">Warranty</option>
            <option value="Insurance">Insurance</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Payment Method</label>
          <select 
            value={serviceForm.payment_method} 
            onChange={(e) => setServiceForm({...serviceForm, payment_method: e.target.value})} 
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Technician</label>
          <select 
            value={serviceForm.completed_by} 
            onChange={(e) => setServiceForm({...serviceForm, completed_by: e.target.value})} 
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Select</option>
            {technicians.map((t: any) => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Customer Complaint</label>
          <textarea 
            rows={3} 
            value={serviceForm.customer_complaint} 
            onChange={(e) => setServiceForm({...serviceForm, customer_complaint: e.target.value})} 
            className="w-full border rounded px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Work Done</label>
          <textarea 
            rows={3} 
            value={serviceForm.work_done} 
            onChange={(e) => setServiceForm({...serviceForm, work_done: e.target.value})} 
            className="w-full border rounded px-3 py-2" 
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Next Service Due (km)</label>
          <input 
            type="number" 
            value={serviceForm.next_service_due_km} 
            onChange={(e) => setServiceForm({...serviceForm, next_service_due_km: e.target.value})} 
            className="w-full border rounded px-3 py-2" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Next Service Due Date</label>
          <input 
            type="date" 
            value={serviceForm.next_service_due_date} 
            onChange={(e) => setServiceForm({...serviceForm, next_service_due_date: e.target.value})} 
            className="w-full border rounded px-3 py-2" 
          />
        </div>
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button onClick={onCancel} className="px-4 py-2 border rounded-md">Cancel</button>
        <button 
          onClick={onSubmit} 
          disabled={isSubmitting} 
          className="px-6 py-2 bg-green-600 text-white rounded-md disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </div>
  );
}
