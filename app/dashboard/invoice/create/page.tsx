'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// ============================================
// TYPES
// ============================================

type PaymentStatus = 'Pending' | 'Partial' | 'Paid' | 'Financed';
type GSTCustomerType = 'B2B' | 'B2C';

interface BillingConfiguration {
  id: string;
  showroom_id: string;
  invoice_prefix: string;
  default_gst_percentage: number;
  invoice_footer_note: string | null;
  authorized_signature_url: string | null;
  bank_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  upi_id: string | null;
  invoice_sequence: number;
}

interface Brand {
  id: string;
  brand_name: string;
}

interface Vehicle {
  id: string;
  brand_id: string;
  model_name: string;
  variant_name: string | null;
  ex_showroom_price: number | null;
  insurance_amount: number | null;
  rto_charges: number | null;
  seating_capacity: number;
  vehicle_warranty_years: number;
  vehicle_warranty_km: number;
  battery_warranty_years: number;
  battery_warranty_km: number;
  battery_capacity_kwh: number | null;
  vehicle_type: string | null;
  brands?: Brand;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string | null;
  mobile: string;
  email: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  pincode: string;
  customer_type: string;
  has_home_charging: boolean;
}

interface Inventory {
  id: string;
  vin_number: string;
  color: string | null;
  variant_name: string | null;
  stock_status: string;
  chassis_number: string | null;
  motor_number: string | null;
  battery_number: string | null;
}

interface InvoiceFormData {
  sale_date: string;
  customer_id: string;
  vehicle_id: string;
  inventory_id: string;
  ex_showroom_price: string;
  rto_charges: string;
  insurance_amount: string;
  handling_charges: string;
  fast_charger_cost: string;
  extended_warranty_cost: string;
  accessories_amount: string;
  fame_ii_subsidy: string;
  state_ev_subsidy: string;
  additional_subsidy: string;
  corporate_discount: string;
  exchange_bonus: string;
  festival_discount: string;
  loyalty_discount: string;
  additional_discount: string;
  advance_amount: string;
  payment_status: PaymentStatus;
  insurance_provider: string;
  insurance_policy_number: string;
  financing_required: boolean;
  finance_company: string;
  finance_loan_amount: string;
  finance_tenure_months: string;
  finance_roi_percentage: string;
  gst_customer_type: GSTCustomerType;
  billing_address: string;
  shipping_address: string;
  delivery_person_name: string;
  delivery_date: string;
  subsidy_reference_number: string;
  registration_number: string;
  registration_date: string;
  home_charger_installed: boolean;
  home_charger_model: string;
  home_charger_installation_date: string;
  charger_type: string;
  insurance_type: string;
  insurance_expiry: string;
}

// ============================================
// SUPABASE CLIENT
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================
// UTILITY FUNCTIONS
// ============================================

const parseNum = (val: string): number => parseFloat(val) || 0;

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// ============================================
// REUSABLE COMPONENTS
// ============================================

const SectionCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all duration-300 hover:shadow-md ${className}`}>
    {children}
  </div>
);

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
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

const TextArea = ({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white hover:border-gray-400 resize-none ${props.className || ''}`}
  />
);

// ============================================
// CREATE INVOICE PAGE
// ============================================

export default function CreateInvoicePage() {
  const router = useRouter();
  const [billingConfig, setBillingConfig] = useState<BillingConfiguration | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [animating, setAnimating] = useState<boolean>(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const [form, setForm] = useState<InvoiceFormData>({
    sale_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    vehicle_id: '',
    inventory_id: '',
    ex_showroom_price: '',
    rto_charges: '0',
    insurance_amount: '0',
    handling_charges: '0',
    fast_charger_cost: '0',
    extended_warranty_cost: '0',
    accessories_amount: '0',
    fame_ii_subsidy: '0',
    state_ev_subsidy: '0',
    additional_subsidy: '0',
    corporate_discount: '0',
    exchange_bonus: '0',
    festival_discount: '0',
    loyalty_discount: '0',
    additional_discount: '0',
    advance_amount: '0',
    payment_status: 'Pending',
    insurance_provider: '',
    insurance_policy_number: '',
    financing_required: false,
    finance_company: '',
    finance_loan_amount: '',
    finance_tenure_months: '',
    finance_roi_percentage: '',
    gst_customer_type: 'B2C',
    billing_address: '',
    shipping_address: '',
    delivery_person_name: '',
    delivery_date: '',
    subsidy_reference_number: '',
    registration_number: '',
    registration_date: '',
    home_charger_installed: false,
    home_charger_model: '',
    home_charger_installation_date: '',
    charger_type: 'Standard',
    insurance_type: 'Comprehensive',
    insurance_expiry: '',
  });

  const getShowroomId = useCallback((): string => {
    const showroomStr = localStorage.getItem('showroom') || sessionStorage.getItem('showroom');
    if (showroomStr) return JSON.parse(showroomStr).id;
    return '';
  }, []);

  const getUserId = useCallback((): string => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) return JSON.parse(userStr).id;
    return '';
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadBillingConfig();
      await fetchCustomers();
      await fetchVehicles();
    };
    init();
  }, []);

  // FIXED: Fetch billing config from Supabase database instead of localStorage
  const loadBillingConfig = async () => {
    try {
      const showroomId = getShowroomId();
      if (!showroomId) {
        setLoading(false);
        return;
      }

      // Fetch fresh billing config from Supabase database
      const { data, error } = await supabase
        .from('billing_configurations')
        .select('*')
        .eq('showroom_id', showroomId)
        .single();

      if (error) {
        console.error('Error fetching billing config from DB:', error);
        // Fallback to localStorage if DB fetch fails
        const configStr = localStorage.getItem('billing_configuration') || 
                         sessionStorage.getItem('billing_configuration');
        if (configStr) {
          const parsedConfig = JSON.parse(configStr);
          setBillingConfig(parsedConfig);
          console.log('Using billing config from localStorage fallback, sequence:', parsedConfig.invoice_sequence);
        }
      } else if (data) {
        const config = data as BillingConfiguration;
        setBillingConfig(config);
        // Update localStorage with fresh data from DB
        localStorage.setItem('billing_configuration', JSON.stringify(config));
        console.log('Fetched fresh billing config from DB, sequence:', config.invoice_sequence);
      }
    } catch (error) {
      console.error('Error loading billing config:', error);
      // Fallback to localStorage
      const configStr = localStorage.getItem('billing_configuration') || 
                       sessionStorage.getItem('billing_configuration');
      if (configStr) {
        setBillingConfig(JSON.parse(configStr));
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    const showroomId = getShowroomId();
    if (!showroomId) return;
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('showroom_id', showroomId)
      .order('created_at', { ascending: false });
    if (data) setCustomers(data as Customer[]);
  };

  const fetchVehicles = async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*, brands(brand_name)')
      .eq('is_active', true);
    if (data) setVehicles(data as Vehicle[]);
  };

  const fetchInventory = async (vehicleModelId: string) => {
    const showroomId = getShowroomId();
    if (!showroomId || !vehicleModelId) return;
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .eq('showroom_id', showroomId)
      .eq('vehicle_model_id', vehicleModelId)
      .eq('stock_status', 'Available')
      .order('received_date', { ascending: false });
    if (data) setInventory(data as Inventory[]);
  };

  const handleCustomerSelect = (customerId: string): void => {
    const customer = customers.find(c => c.id === customerId) || null;
    setSelectedCustomer(customer);
    setForm(prev => ({
      ...prev,
      customer_id: customerId,
      billing_address: customer ? `${customer.address_line1}${customer.address_line2 ? ', ' + customer.address_line2 : ''}, ${customer.city}, ${customer.state} - ${customer.pincode}` : '',
      shipping_address: customer ? `${customer.address_line1}${customer.address_line2 ? ', ' + customer.address_line2 : ''}, ${customer.city}, ${customer.state} - ${customer.pincode}` : '',
      gst_customer_type: (customer?.customer_type === 'Corporate' || customer?.customer_type === 'Dealer') ? 'B2B' : 'B2C',
      home_charger_installed: customer?.has_home_charging || false,
    }));
  };

  const handleVehicleSelect = (vehicleId: string): void => {
    const vehicle = vehicles.find(v => v.id === vehicleId) || null;
    setSelectedVehicle(vehicle);
    setForm(prev => ({
      ...prev,
      vehicle_id: vehicleId,
      ex_showroom_price: vehicle?.ex_showroom_price?.toString() || '',
      insurance_amount: vehicle?.insurance_amount?.toString() || '0',
      rto_charges: vehicle?.rto_charges?.toString() || '0',
      inventory_id: '',
    }));
    if (vehicle) fetchInventory(vehicleId);
  };

  const updateField = (field: keyof InvoiceFormData, value: string | boolean): void => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Calculations
  const calculateSubtotal = (): number => 
    parseNum(form.ex_showroom_price) + parseNum(form.rto_charges) + parseNum(form.insurance_amount) + 
    parseNum(form.handling_charges) + parseNum(form.fast_charger_cost) + parseNum(form.extended_warranty_cost) + 
    parseNum(form.accessories_amount);
    
  const calculateTotalDiscounts = (): number => 
    parseNum(form.corporate_discount) + parseNum(form.exchange_bonus) + parseNum(form.festival_discount) + 
    parseNum(form.loyalty_discount) + parseNum(form.additional_discount);
    
  const calculateTotalSubsidies = (): number => 
    parseNum(form.fame_ii_subsidy) + parseNum(form.state_ev_subsidy) + parseNum(form.additional_subsidy);
    
  const calculateTaxableAmount = (): number => 
    calculateSubtotal() - calculateTotalDiscounts() - calculateTotalSubsidies();

  const calculateGST = (): { cgst: number; sgst: number; total: number } => {
    const gstPercent = billingConfig?.default_gst_percentage || 18;
    const taxable = calculateTaxableAmount();
    const cgst = (taxable * (gstPercent / 2)) / 100;
    const sgst = (taxable * (gstPercent / 2)) / 100;
    return { cgst, sgst, total: cgst + sgst };
  };

  const calculateGrandTotal = (): number => calculateTaxableAmount() + calculateGST().total;

  const calculateEMI = (): number => {
    const loanAmount = parseNum(form.finance_loan_amount);
    const tenure = parseInt(form.finance_tenure_months) || 1;
    const roi = parseNum(form.finance_roi_percentage) / 12 / 100;
    if (loanAmount <= 0 || roi <= 0) return 0;
    return loanAmount * roi * Math.pow(1 + roi, tenure) / (Math.pow(1 + roi, tenure) - 1);
  };

  // FIXED: Now uses fresh billingConfig from database
  const generateInvoiceNumber = (): string => {
    if (!billingConfig) return 'Loading...';
    const prefix = billingConfig.invoice_prefix || 'INV';
    const seq = (billingConfig.invoice_sequence || 1).toString().padStart(4, '0');
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    return `${prefix}/${year}${month}/${seq}`;
  };

  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!form.customer_id) { alert('Please select a customer'); return false; }
      if (!form.vehicle_id) { alert('Please select a vehicle'); return false; }
      if (!form.inventory_id) { alert('Please select a vehicle from inventory'); return false; }
      if (!form.sale_date) { alert('Please select sale date'); return false; }
    }
    if (step === 2) {
      if (!form.ex_showroom_price || parseNum(form.ex_showroom_price) <= 0) { 
        alert('Please enter ex-showroom price'); 
        return false; 
      }
    }
    return true;
  };

  const handleNextStep = (): void => {
    if (validateStep(currentStep)) {
      setAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setAnimating(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 150);
    }
  };

  const handlePrevStep = (): void => {
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setAnimating(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!form.customer_id || !form.vehicle_id || !form.inventory_id) {
      alert('Please select customer, vehicle, and inventory');
      return;
    }
    if (!form.ex_showroom_price || parseNum(form.ex_showroom_price) <= 0) {
      alert('Please enter a valid ex-showroom price');
      return;
    }
    
    setSaving(true);
    
    try {
      const payload = {
        sale_date: form.sale_date,
        customer_id: form.customer_id,
        vehicle_id: form.vehicle_id,
        inventory_id: form.inventory_id,
        ex_showroom_price: parseNum(form.ex_showroom_price),
        rto_charges: parseNum(form.rto_charges),
        insurance_amount: parseNum(form.insurance_amount),
        handling_charges: parseNum(form.handling_charges),
        fast_charger_cost: parseNum(form.fast_charger_cost),
        extended_warranty_cost: parseNum(form.extended_warranty_cost),
        accessories_amount: parseNum(form.accessories_amount),
        fame_ii_subsidy: parseNum(form.fame_ii_subsidy),
        state_ev_subsidy: parseNum(form.state_ev_subsidy),
        additional_subsidy: parseNum(form.additional_subsidy),
        corporate_discount: parseNum(form.corporate_discount),
        exchange_bonus: parseNum(form.exchange_bonus),
        festival_discount: parseNum(form.festival_discount),
        loyalty_discount: parseNum(form.loyalty_discount),
        additional_discount: parseNum(form.additional_discount),
        advance_amount: parseNum(form.advance_amount),
        payment_status: form.payment_status,
        insurance_provider: form.insurance_provider || null,
        insurance_policy_number: form.insurance_policy_number || null,
        financing_required: form.financing_required,
        finance_company: form.finance_company || null,
        finance_loan_amount: parseNum(form.finance_loan_amount) || null,
        finance_tenure_months: parseInt(form.finance_tenure_months) || null,
        finance_roi_percentage: parseNum(form.finance_roi_percentage) || null,
        gst_customer_type: form.gst_customer_type,
        billing_address: form.billing_address || null,
        shipping_address: form.shipping_address || null,
        delivery_person_name: form.delivery_person_name || null,
        delivery_date: form.delivery_date || null,
        subsidy_reference_number: form.subsidy_reference_number || null,
        registration_number: form.registration_number || null,
        registration_date: form.registration_date || null,
        home_charger_installed: form.home_charger_installed,
        home_charger_model: form.home_charger_model || null,
        home_charger_installation_date: form.home_charger_installation_date || null,
        charger_type: form.charger_type,
        insurance_type: form.insurance_type,
        insurance_expiry: form.insurance_expiry || null,
        showroom_id: getShowroomId(),
        created_by: getUserId(),
      };
      
      const response = await fetch('/api/billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Invoice ${result.data.invoice_number} created successfully!`);
        router.push('/billing');
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice');
    } finally {
      setSaving(false);
    }
  };

  const InvoiceSummary = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
      <div className="flex items-center space-x-2 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Invoice Summary</h2>
      </div>
      
      <div className="space-y-2.5">
        <SummaryRow label="Ex-Showroom Price" value={formatCurrency(parseNum(form.ex_showroom_price))} />
        <SummaryRow label="RTO Charges" value={formatCurrency(parseNum(form.rto_charges))} />
        <SummaryRow label="Insurance" value={formatCurrency(parseNum(form.insurance_amount))} />
        {parseNum(form.handling_charges) > 0 && <SummaryRow label="Handling Charges" value={formatCurrency(parseNum(form.handling_charges))} />}
        {parseNum(form.fast_charger_cost) > 0 && <SummaryRow label="Fast Charger" value={formatCurrency(parseNum(form.fast_charger_cost))} />}
        {parseNum(form.extended_warranty_cost) > 0 && <SummaryRow label="Ext. Warranty" value={formatCurrency(parseNum(form.extended_warranty_cost))} />}
        {parseNum(form.accessories_amount) > 0 && <SummaryRow label="Accessories" value={formatCurrency(parseNum(form.accessories_amount))} />}
        
        <div className="border-t border-gray-200 my-2"></div>
        <SummaryRow label="Subtotal" value={formatCurrency(calculateSubtotal())} bold />
        
        {calculateTotalDiscounts() > 0 && (
          <SummaryRow label="Total Discounts" value={`- ${formatCurrency(calculateTotalDiscounts())}`} textColor="text-red-600" />
        )}
        {calculateTotalSubsidies() > 0 && (
          <SummaryRow label="EV Subsidies" value={`- ${formatCurrency(calculateTotalSubsidies())}`} textColor="text-green-600" />
        )}
        
        <div className="border-t border-gray-200 my-2"></div>
        <SummaryRow label="Taxable Amount" value={formatCurrency(calculateTaxableAmount())} bold />
        <SummaryRow label={`CGST (${((billingConfig?.default_gst_percentage || 18) / 2)}%)`} value={formatCurrency(calculateGST().cgst)} textColor="text-gray-500" />
        <SummaryRow label={`SGST (${((billingConfig?.default_gst_percentage || 18) / 2)}%)`} value={formatCurrency(calculateGST().sgst)} textColor="text-gray-500" />
        
        <div className="border-t-2 border-blue-200 my-2"></div>
        <div className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
          <span className="text-base font-bold text-gray-900">Grand Total</span>
          <span className="text-xl font-bold text-blue-700">{formatCurrency(calculateGrandTotal())}</span>
        </div>
        
        {parseNum(form.advance_amount) > 0 && (
          <>
            <SummaryRow label="Advance Paid" value={`- ${formatCurrency(parseNum(form.advance_amount))}`} textColor="text-blue-600" />
            <div className="flex justify-between items-center bg-red-50 p-2 rounded-lg">
              <span className="text-sm font-semibold text-red-700">Balance Due</span>
              <span className="text-sm font-bold text-red-700">{formatCurrency(calculateGrandTotal() - parseNum(form.advance_amount))}</span>
            </div>
          </>
        )}
        
        {form.financing_required && calculateEMI() > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <p className="text-xs font-medium text-blue-700 mb-1">ESTIMATED MONTHLY EMI</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(calculateEMI())}</p>
            <p className="text-xs text-blue-600 mt-1">
              For {form.finance_tenure_months || 0} months at {form.finance_roi_percentage || 0}% ROI
            </p>
          </div>
        )}
      </div>
      
      {billingConfig && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-3">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">Bank Details</h3>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-gray-500">Bank</span><span className="font-medium text-gray-700">{billingConfig.bank_name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Account</span><span className="font-medium text-gray-700">{billingConfig.account_number || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">IFSC</span><span className="font-medium text-gray-700">{billingConfig.ifsc_code || 'N/A'}</span></div>
            {billingConfig.upi_id && <div className="flex justify-between"><span className="text-gray-500">UPI</span><span className="font-medium text-gray-700">{billingConfig.upi_id}</span></div>}
          </div>
        </div>
      )}
    </div>
  );

  const SummaryRow = ({ label, value, bold, textColor }: { label: string; value: string; bold?: boolean; textColor?: string }) => (
    <div className="flex justify-between items-center">
      <span className={`${bold ? 'font-semibold text-gray-900' : 'text-gray-600'} text-sm`}>{label}</span>
      <span className={`${bold ? 'font-semibold text-gray-900' : 'text-gray-700'} text-sm ${textColor || ''}`}>{value}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
          <div className="absolute top-0 animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
        </div>
        <p className="mt-4 text-gray-500 font-medium">Loading invoice form...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Steps Indicator */}
      <div className="mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-center">
            {[1, 2, 3].map((step) => (
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
                  {currentStep > step ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : step}
                </button>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${currentStep >= step ? 'text-blue-700' : 'text-gray-500'}`}>
                    {step === 1 ? 'Customer & Vehicle' : step === 2 ? 'Pricing' : 'Payment & Delivery'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {step === 1 ? 'Select details' : step === 2 ? 'Set pricing' : 'Finalize invoice'}
                  </p>
                </div>
                {step < 3 && (
                  <div className="mx-4 hidden sm:block">
                    <div className={`w-12 lg:w-20 h-0.5 rounded-full transition-all duration-300 ${
                      currentStep > step ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gray-200'
                    }`}></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STEP 1 & 2 */}
      {currentStep < 3 && (
        <div className={`transition-all duration-300 ${animating ? 'opacity-0 transform translate-y-4' : 'opacity-100'}`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1 */}
              {currentStep === 1 && (
                <>
                  <SectionCard>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Invoice Details</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Basic invoice information</p>
                      </div>
                      <div className="text-right bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 font-medium">Invoice Number</p>
                        <p className="text-lg font-bold text-blue-700">{generateInvoiceNumber()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label required>Sale Date</Label>
                        <Input type="date" value={form.sale_date} onChange={(e) => updateField('sale_date', e.target.value)} />
                      </div>
                      <div>
                        <Label>GST Type</Label>
                        <Select value={form.gst_customer_type} onChange={(e) => updateField('gst_customer_type', e.target.value)}>
                          <option value="B2C">B2C - Individual Customer</option>
                          <option value="B2B">B2B - Business Customer</option>
                        </Select>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Customer</h2>
                    <p className="text-xs text-gray-500 mb-4">Choose the customer for this invoice</p>
                    <Select required value={form.customer_id} onChange={(e) => handleCustomerSelect(e.target.value)}>
                      <option value="">Search and select customer...</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.first_name} {customer.last_name} • {customer.mobile} • {customer.city}
                        </option>
                      ))}
                    </Select>
                    {selectedCustomer && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 animate-fadeIn">
                        <h3 className="font-semibold text-sm text-blue-900 mb-3">Customer Details</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-white/50 p-2 rounded"><span className="text-gray-500 text-xs">Name</span><p className="font-medium text-gray-900">{selectedCustomer.first_name} {selectedCustomer.last_name}</p></div>
                          <div className="bg-white/50 p-2 rounded"><span className="text-gray-500 text-xs">Mobile</span><p className="font-medium text-gray-900">{selectedCustomer.mobile}</p></div>
                          <div className="bg-white/50 p-2 rounded"><span className="text-gray-500 text-xs">City</span><p className="font-medium text-gray-900">{selectedCustomer.city}</p></div>
                          <div className="bg-white/50 p-2 rounded"><span className="text-gray-500 text-xs">Type</span><p className="font-medium text-gray-900">{selectedCustomer.customer_type}</p></div>
                        </div>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Vehicle</h2>
                    <p className="text-xs text-gray-500 mb-4">Choose vehicle model and inventory</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label required>Vehicle Model</Label>
                        <Select value={form.vehicle_id} onChange={(e) => handleVehicleSelect(e.target.value)}>
                          <option value="">Select vehicle...</option>
                          {vehicles.map(vehicle => (
                            <option key={vehicle.id} value={vehicle.id}>
                              {vehicle.brands?.brand_name} {vehicle.model_name} {vehicle.variant_name ? `(${vehicle.variant_name})` : ''}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label required>Inventory (VIN)</Label>
                        <Select value={form.inventory_id} onChange={(e) => updateField('inventory_id', e.target.value)} disabled={!selectedVehicle}>
                          <option value="">{selectedVehicle ? 'Select from inventory...' : 'Select vehicle first'}</option>
                          {inventory.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.vin_number} • {item.color} • {item.variant_name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </SectionCard>
                </>
              )}

              {/* Step 2 */}
              {currentStep === 2 && (
                <>
                  <SectionCard>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Vehicle Pricing</h2>
                    <p className="text-xs text-gray-500 mb-4">Set the pricing breakdown for this vehicle</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div><Label required>Ex-Showroom Price</Label><Input type="number" value={form.ex_showroom_price} onChange={(e) => updateField('ex_showroom_price', e.target.value)} placeholder="₹ 0" /></div>
                      <div><Label>RTO Charges</Label><Input type="number" value={form.rto_charges} onChange={(e) => updateField('rto_charges', e.target.value)} /></div>
                      <div><Label>Insurance</Label><Input type="number" value={form.insurance_amount} onChange={(e) => updateField('insurance_amount', e.target.value)} /></div>
                      <div><Label>Handling Charges</Label><Input type="number" value={form.handling_charges} onChange={(e) => updateField('handling_charges', e.target.value)} /></div>
                      <div><Label>Fast Charger</Label><Input type="number" value={form.fast_charger_cost} onChange={(e) => updateField('fast_charger_cost', e.target.value)} /></div>
                      <div><Label>Extended Warranty</Label><Input type="number" value={form.extended_warranty_cost} onChange={(e) => updateField('extended_warranty_cost', e.target.value)} /></div>
                      <div><Label>Accessories</Label><Input type="number" value={form.accessories_amount} onChange={(e) => updateField('accessories_amount', e.target.value)} /></div>
                    </div>
                  </SectionCard>

                  <SectionCard>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">EV Subsidies</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div><Label>FAME II Subsidy</Label><Input type="number" value={form.fame_ii_subsidy} onChange={(e) => updateField('fame_ii_subsidy', e.target.value)} className="border-green-300 bg-green-50 focus:ring-green-500" /></div>
                      <div><Label>State EV Subsidy</Label><Input type="number" value={form.state_ev_subsidy} onChange={(e) => updateField('state_ev_subsidy', e.target.value)} className="border-green-300 bg-green-50 focus:ring-green-500" /></div>
                      <div><Label>Additional Subsidy</Label><Input type="number" value={form.additional_subsidy} onChange={(e) => updateField('additional_subsidy', e.target.value)} className="border-green-300 bg-green-50 focus:ring-green-500" /></div>
                    </div>
                  </SectionCard>

                  <SectionCard>
                    <div className="flex items-center space-x-2 mb-4">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Discounts</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div><Label>Corporate Discount</Label><Input type="number" value={form.corporate_discount} onChange={(e) => updateField('corporate_discount', e.target.value)} /></div>
                      <div><Label>Exchange Bonus</Label><Input type="number" value={form.exchange_bonus} onChange={(e) => updateField('exchange_bonus', e.target.value)} /></div>
                      <div><Label>Festival Discount</Label><Input type="number" value={form.festival_discount} onChange={(e) => updateField('festival_discount', e.target.value)} /></div>
                      <div><Label>Loyalty Discount</Label><Input type="number" value={form.loyalty_discount} onChange={(e) => updateField('loyalty_discount', e.target.value)} /></div>
                      <div><Label>Additional Discount</Label><Input type="number" value={form.additional_discount} onChange={(e) => updateField('additional_discount', e.target.value)} /></div>
                    </div>
                  </SectionCard>
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-between pb-6">
                {currentStep > 1 ? (
                  <button type="button" onClick={handlePrevStep} className="group flex items-center px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium">
                    <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Previous
                  </button>
                ) : <div></div>}
                <button type="button" onClick={handleNextStep} className="group flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200 hover:shadow-xl transition-all duration-200 font-medium">
                  Next Step
                  <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <InvoiceSummary />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {currentStep === 3 && (
        <div className={`transition-all duration-300 ${animating ? 'opacity-0 transform translate-y-4' : 'opacity-100'}`}>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <SectionCard>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Payment Details</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Payment Status</Label>
                      <Select value={form.payment_status} onChange={(e) => updateField('payment_status', e.target.value)}>
                        <option value="Pending">⏳ Pending</option>
                        <option value="Partial">💳 Partial</option>
                        <option value="Paid">✅ Paid</option>
                        <option value="Financed">🏦 Financed</option>
                      </Select>
                    </div>
                    <div>
                      <Label>Advance Amount (₹)</Label>
                      <Input type="number" value={form.advance_amount} onChange={(e) => updateField('advance_amount', e.target.value)} />
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" checked={form.financing_required} onChange={(e) => updateField('financing_required', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Financing Required</span>
                    </label>
                  </div>
                  {form.financing_required && (
                    <div className="grid grid-cols-2 gap-3 mt-4 p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 animate-fadeIn">
                      <div><Label>Finance Company</Label><Input type="text" value={form.finance_company} onChange={(e) => updateField('finance_company', e.target.value)} placeholder="e.g., HDFC Bank" /></div>
                      <div><Label>Loan Amount (₹)</Label><Input type="number" value={form.finance_loan_amount} onChange={(e) => updateField('finance_loan_amount', e.target.value)} /></div>
                      <div><Label>Tenure (Months)</Label><Input type="number" value={form.finance_tenure_months} onChange={(e) => updateField('finance_tenure_months', e.target.value)} /></div>
                      <div><Label>ROI (%)</Label><Input type="number" step="0.01" value={form.finance_roi_percentage} onChange={(e) => updateField('finance_roi_percentage', e.target.value)} /></div>
                      {parseNum(form.finance_loan_amount) > 0 && (
                        <div className="col-span-2 mt-2 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium text-blue-700">ESTIMATED MONTHLY EMI</p>
                              <p className="text-2xl font-bold text-blue-900">{formatCurrency(calculateEMI())}</p>
                            </div>
                            <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>

                <SectionCard>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Insurance & Delivery</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Insurance Provider</Label><Input type="text" value={form.insurance_provider} onChange={(e) => updateField('insurance_provider', e.target.value)} placeholder="e.g., ICICI Lombard" /></div>
                    <div><Label>Policy Number</Label><Input type="text" value={form.insurance_policy_number} onChange={(e) => updateField('insurance_policy_number', e.target.value)} /></div>
                    <div><Label>Delivery Person</Label><Input type="text" value={form.delivery_person_name} onChange={(e) => updateField('delivery_person_name', e.target.value)} /></div>
                    <div><Label>Delivery Date</Label><Input type="date" value={form.delivery_date} onChange={(e) => updateField('delivery_date', e.target.value)} /></div>
                  </div>
                </SectionCard>

                <SectionCard>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Registration & Vehicle Setup</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><Label>Registration Number</Label><Input type="text" value={form.registration_number} onChange={(e) => updateField('registration_number', e.target.value)} placeholder="e.g., UP78 AB 1234" /></div>
                    <div><Label>Registration Date</Label><Input type="date" value={form.registration_date} onChange={(e) => updateField('registration_date', e.target.value)} /></div>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Charger & Insurance Setup</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Charger Type</Label>
                        <Select value={form.charger_type} onChange={(e) => updateField('charger_type', e.target.value)}>
                          <option value="Standard">⚡ Standard (3.3 kW)</option>
                          <option value="Fast">⚡ Fast (7.2 kW)</option>
                          <option value="Portable">🔌 Portable Charger</option>
                          <option value="DC Fast">🚀 DC Fast Charger</option>
                        </Select>
                      </div>
                      <div><Label>Insurance Type</Label>
                        <Select value={form.insurance_type} onChange={(e) => updateField('insurance_type', e.target.value)}>
                          <option value="Comprehensive">🛡️ Comprehensive</option>
                          <option value="Third Party">📋 Third Party</option>
                          <option value="Zero Dep">💎 Zero Depreciation</option>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input type="checkbox" checked={form.home_charger_installed} onChange={(e) => updateField('home_charger_installed', e.target.checked)} className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-medium text-gray-700">Home Charger Installed</span>
                    </label>
                  </div>
                  {form.home_charger_installed && (
                    <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 animate-fadeIn">
                      <div><Label>Charger Model</Label><Input type="text" value={form.home_charger_model} onChange={(e) => updateField('home_charger_model', e.target.value)} placeholder="e.g., Delta AC Mini" /></div>
                      <div><Label>Installation Date</Label><Input type="date" value={form.home_charger_installation_date} onChange={(e) => updateField('home_charger_installation_date', e.target.value)} /></div>
                    </div>
                  )}
                  <div className="mt-4">
                    <Label>Insurance Expiry Date</Label>
                    <Input type="date" value={form.insurance_expiry} onChange={(e) => updateField('insurance_expiry', e.target.value)} />
                    <p className="text-xs text-gray-400 mt-1">Leave blank to auto-calculate (1 year from purchase date)</p>
                  </div>
                </SectionCard>

                <SectionCard>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Addresses</h2>
                  <div className="space-y-4">
                    <div><Label>Billing Address</Label><TextArea rows={2} value={form.billing_address} onChange={(e) => updateField('billing_address', e.target.value)} /></div>
                    <div><Label>Shipping Address</Label><TextArea rows={2} value={form.shipping_address} onChange={(e) => updateField('shipping_address', e.target.value)} /></div>
                  </div>
                </SectionCard>

                {/* Navigation */}
                <div className="flex justify-between pb-6">
                  <button type="button" onClick={handlePrevStep} className="group flex items-center px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium">
                    <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Previous
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="group flex items-center px-10 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Invoice...
                      </>
                    ) : (
                      <>
                        Generate Invoice
                        <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <InvoiceSummary />
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg"
                >
                  {saving ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Creating Invoice...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Generate Invoice
                    </span>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}