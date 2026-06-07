import { NextRequest, NextResponse } from 'next/server';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createApiClient } from '@/lib/supabase/api-client';

// ============================================
// TYPES
// ============================================

interface InvoiceCreatePayload {
  showroom_id: string;
  created_by: string;
  customer_id: string;
  vehicle_id: string;
  inventory_id: string;
  sale_date: string;
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
  subsidy_reference_number?: string;
  corporate_discount: number;
  exchange_bonus: number;
  festival_discount: number;
  loyalty_discount: number;
  additional_discount: number;
  advance_amount: number;
  payment_status: string;
  insurance_provider?: string;
  insurance_policy_number?: string;
  financing_required: boolean;
  finance_company?: string;
  finance_loan_amount?: number;
  finance_tenure_months?: number;
  finance_roi_percentage?: number;
  gst_customer_type: string;
  billing_address?: string;
  shipping_address?: string;
  delivery_person_name?: string;
  delivery_date?: string;
  registration_number?: string;
  registration_date?: string;
  home_charger_installed?: boolean;
  home_charger_model?: string;
  home_charger_installation_date?: string;
  charger_type?: string;
  insurance_type?: string;
  insurance_expiry?: string;
}

interface BillingConfig {
  id: string;
  showroom_id: string;
  invoice_prefix: string;
  default_gst_percentage: number;
  invoice_sequence: number;
  invoice_footer_note?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  authorized_signature_url?: string;
}

interface SalesInvoice {
  id: string;
  invoice_number: string;
  showroom_id: string;
  customer_id: string;
  vehicle_id: string;
  inventory_id: string;
  [key: string]: any;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateTaxableAmount(data: any): number {
  const additions = [
    data.ex_showroom_price || 0,
    data.rto_charges || 0,
    data.insurance_amount || 0,
    data.handling_charges || 0,
    data.fast_charger_cost || 0,
    data.extended_warranty_cost || 0,
    data.accessories_amount || 0
  ].reduce((a: number, b: number) => Number(a) + Number(b), 0);
  
  const discounts = [
    data.corporate_discount || 0,
    data.exchange_bonus || 0,
    data.festival_discount || 0,
    data.loyalty_discount || 0,
    data.additional_discount || 0
  ].reduce((a: number, b: number) => Number(a) + Number(b), 0);
  
  const subsidies = [
    data.fame_ii_subsidy || 0,
    data.state_ev_subsidy || 0,
    data.additional_subsidy || 0
  ].reduce((a: number, b: number) => Number(a) + Number(b), 0);
  
  return additions - discounts - subsidies;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatCurrencyRaw(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function calculateEMI(principal: number, tenureMonths: number, annualRoi: number): number {
  if (principal <= 0 || tenureMonths <= 0 || annualRoi <= 0) return 0;
  const monthlyRoi = annualRoi / 12 / 100;
  const emi = principal * monthlyRoi * Math.pow(1 + monthlyRoi, tenureMonths) / (Math.pow(1 + monthlyRoi, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
}

function getBrandName(vehicleData: any): string {
  if (!vehicleData?.brands) return '';
  if (Array.isArray(vehicleData.brands)) {
    return vehicleData.brands[0]?.brand_name || '';
  }
  return (vehicleData.brands as any).brand_name || '';
}

async function generateInvoiceNumber(
  supabase: any,
  showroomId: string
): Promise<{ invoiceNumber: string; sequence: number }> {
  const { data: billingConfig, error } = await supabase
    .from('billing_configurations')
    .select('*')
    .eq('showroom_id', showroomId)
    .single();

  if (error || !billingConfig) {
    throw new Error('Billing configuration not found');
  }

  const config = billingConfig as BillingConfig;
  const prefix = config.invoice_prefix || 'INV';
  const seq = (config.invoice_sequence || 1).toString().padStart(4, '0');
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');

  return {
    invoiceNumber: `${prefix}/${year}${month}/${seq}`,
    sequence: config.invoice_sequence || 1
  };
}

// ============================================
// COMPREHENSIVE INVOICE HTML TEMPLATE
// ============================================

function generatePDFHTML(invoice: any): string {
  const taxableAmount = calculateTaxableAmount(invoice);
  const grandTotal = taxableAmount + Number(invoice.cgst_amount || 0) + Number(invoice.sgst_amount || 0);
  const balanceDue = grandTotal - Number(invoice.advance_amount || 0);
  const gstPercent = Number(invoice.cgst_percentage || 9) + Number(invoice.sgst_percentage || 9);
  const cgstPercent = Number(invoice.cgst_percentage || 9);
  const sgstPercent = Number(invoice.sgst_percentage || 9);

  // Payment status display
  const paymentStatusDisplay: Record<string, string> = {
    'Pending': 'Pending',
    'Partial': 'Partial Payment',
    'Paid': 'Paid',
    'Financed': 'Financed',
    'cancelled': 'Cancelled'
  };

  const paymentMode = invoice.financing_required 
    ? `Financed - ${invoice.finance_company || 'N/A'}` 
    : invoice.payment_status === 'Paid' ? 'Paid' : invoice.payment_status === 'Partial' ? 'Partial Payment' : 'Pending';

  const customerGST = invoice.customer_gst || '';
  const gstLabel = invoice.gst_customer_type === 'B2B' ? 'GSTIN' : '';

  // Build items table rows
  let itemsRows = '';
  let serialNo = 1;
  let subtotalAmount = 0;

  // Main vehicle item
  if (Number(invoice.ex_showroom_price) > 0) {
    const desc = `<strong>${invoice.vehicle_name || 'Electric Vehicle'}</strong><br>
      VIN: ${invoice.vin_number || 'N/A'}<br>
      Chassis: ${invoice.chassis_number || 'N/A'}<br>
      Motor: ${invoice.motor_number || 'N/A'}<br>
      Battery: ${invoice.battery_number || 'N/A'}<br>
      Color: ${invoice.vehicle_color || 'N/A'}`;

    itemsRows += `<tr>
      <td class="text-center">${serialNo}</td>
      <td class="item-description">${desc}</td>
      <td class="text-center">8703</td>
      <td class="text-center">1</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.ex_showroom_price))}</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.ex_showroom_price))}</td>
    </tr>`;
    serialNo++;
    subtotalAmount += Number(invoice.ex_showroom_price);
  }

  // RTO Charges
  if (Number(invoice.rto_charges) > 0) {
    itemsRows += `<tr>
      <td class="text-center">${serialNo}</td>
      <td class="item-description"><strong>RTO / Registration Charges</strong></td>
      <td class="text-center">9999</td>
      <td class="text-center">1</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.rto_charges))}</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.rto_charges))}</td>
    </tr>`;
    serialNo++;
    subtotalAmount += Number(invoice.rto_charges);
  }

  // Insurance
  if (Number(invoice.insurance_amount) > 0) {
    itemsRows += `<tr>
      <td class="text-center">${serialNo}</td>
      <td class="item-description"><strong>Insurance</strong><br>Provider: ${invoice.insurance_provider || 'N/A'}<br>Policy: ${invoice.insurance_policy_number || 'N/A'}</td>
      <td class="text-center">9971</td>
      <td class="text-center">1</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.insurance_amount))}</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.insurance_amount))}</td>
    </tr>`;
    serialNo++;
    subtotalAmount += Number(invoice.insurance_amount);
  }

  // Handling Charges
  if (Number(invoice.handling_charges) > 0) {
    itemsRows += `<tr>
      <td class="text-center">${serialNo}</td>
      <td class="item-description"><strong>Handling & Logistics Charges</strong></td>
      <td class="text-center">9965</td>
      <td class="text-center">1</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.handling_charges))}</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.handling_charges))}</td>
    </tr>`;
    serialNo++;
    subtotalAmount += Number(invoice.handling_charges);
  }

  // Fast Charger
  if (Number(invoice.fast_charger_cost) > 0) {
    itemsRows += `<tr>
      <td class="text-center">${serialNo}</td>
      <td class="item-description"><strong>Fast Charger</strong><br>Type: ${invoice.charger_type || 'Standard'}</td>
      <td class="text-center">8504</td>
      <td class="text-center">1</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.fast_charger_cost))}</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.fast_charger_cost))}</td>
    </tr>`;
    serialNo++;
    subtotalAmount += Number(invoice.fast_charger_cost);
  }

  // Extended Warranty
  if (Number(invoice.extended_warranty_cost) > 0) {
    itemsRows += `<tr>
      <td class="text-center">${serialNo}</td>
      <td class="item-description"><strong>Extended Warranty</strong></td>
      <td class="text-center">9999</td>
      <td class="text-center">1</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.extended_warranty_cost))}</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.extended_warranty_cost))}</td>
    </tr>`;
    serialNo++;
    subtotalAmount += Number(invoice.extended_warranty_cost);
  }

  // Accessories
  if (Number(invoice.accessories_amount) > 0) {
    itemsRows += `<tr>
      <td class="text-center">${serialNo}</td>
      <td class="item-description"><strong>Accessories</strong></td>
      <td class="text-center">8708</td>
      <td class="text-center">1</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.accessories_amount))}</td>
      <td class="text-right">${formatCurrencyRaw(Number(invoice.accessories_amount))}</td>
    </tr>`;
    serialNo++;
    subtotalAmount += Number(invoice.accessories_amount);
  }

  // Home Charger
  if (invoice.home_charger_installed && invoice.home_charger_model) {
    itemsRows += `<tr>
      <td class="text-center">${serialNo}</td>
      <td class="item-description"><strong>Home Charger Installation</strong><br>Model: ${invoice.home_charger_model}<br>Date: ${invoice.home_charger_installation_date || 'N/A'}</td>
      <td class="text-center">8504</td>
      <td class="text-center">1</td>
      <td class="text-right">0</td>
      <td class="text-right">0</td>
    </tr>`;
    serialNo++;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px; }
        .invoice-container { background-color: white; width: 100%; max-width: 850px; margin: 0 auto; padding: 25px; border: 2px solid #000; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 12px; }
        .logo-section { display: flex; gap: 12px; align-items: center; }
        .logo { width: 55px; height: 55px; background-color: #e8e8e8; border: 2px solid #000; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 22px; }
        .company-title { text-align: center; flex: 1; }
        .company-title h1 { font-size: 20px; font-weight: bold; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 1px; }
        .company-title p { font-size: 10px; color: #555; }
        .badge { width: 45px; height: 45px; background-color: #f0f0f0; border: 2px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; }
        .company-details { margin-bottom: 15px; font-size: 10px; line-height: 1.5; }
        .company-details p { margin-bottom: 2px; }
        .bill-type { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 12px; letter-spacing: 3px; text-transform: uppercase; }
        .content { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
        .bill-from, .bill-details { font-size: 10px; }
        .bill-from h3, .bill-details h3 { font-size: 11px; font-weight: bold; margin-bottom: 6px; border-bottom: 1px solid #000; padding-bottom: 4px; }
        .bill-from p, .bill-details p { margin-bottom: 4px; line-height: 1.3; }
        .bill-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .detail-item { border: 1px solid #ccc; padding: 6px; background-color: #fafafa; }
        .detail-label { font-weight: bold; font-size: 9px; color: #666; text-transform: uppercase; }
        .detail-value { font-size: 11px; margin-top: 2px; font-weight: bold; }
        .items-section { margin-bottom: 15px; }
        .items-header { font-weight: bold; font-size: 11px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #000; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10px; }
        th { background-color: #f5f5f5; padding: 8px 6px; text-align: left; border: 1px solid #000; font-weight: bold; font-size: 10px; }
        td { padding: 10px 6px; border: 1px solid #ccc; }
        tr:nth-child(even) { background-color: #fafafa; }
        .item-description { font-size: 9px; line-height: 1.3; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totals { display: flex; justify-content: flex-end; margin-bottom: 15px; }
        .totals-box { width: 280px; }
        .total-row { display: flex; justify-content: space-between; padding: 7px 10px; border: 1px solid #ccc; font-size: 11px; }
        .total-row.subtotal { background-color: #fafafa; }
        .total-row.grand-total { background-color: #fff3cd; font-weight: bold; font-size: 13px; border-top: 2px solid #000; border-bottom: 2px solid #000; }
        .total-row.discount { color: #dc2626; }
        .total-row.subsidy { color: #059669; }
        .notes { margin-bottom: 15px; padding: 10px; border: 1px solid #ccc; background-color: #fafafa; font-size: 9px; line-height: 1.4; }
        .notes h4 { font-weight: bold; margin-bottom: 6px; font-size: 10px; }
        .notes ol { margin-left: 18px; }
        .notes li { margin-bottom: 3px; }
        .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 25px; font-size: 10px; }
        .company-name { font-weight: bold; }
        .signature-section { text-align: center; }
        .signature-line { width: 130px; height: 1px; background-color: #000; margin: 15px auto 5px; }
        .signature-text { font-size: 9px; color: #666; }
        .bank-details { margin-top: 10px; font-size: 9px; padding: 8px; border: 1px solid #ccc; background-color: #fafafa; }
        .bank-details h4 { font-size: 10px; margin-bottom: 5px; }
        @media print { body { background-color: white; padding: 0; } .invoice-container { box-shadow: none; max-width: 100%; } }
    </style>
</head>
<body>
    <div class="invoice-container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <div class="logo">⚡</div>
                <div class="company-title">
                    <h1>${invoice.showroom_name || 'EV SHOWROOM'}</h1>
                    <p>Authorized Electric Vehicle Dealer</p>
                </div>
            </div>
            <div class="badge">🚗</div>
        </div>
        
        <div class="company-details">
            <p><strong>Address:</strong> ${invoice.showroom_address || 'N/A'}</p>
            <p><strong>Phone:</strong> ${invoice.showroom_phone || 'N/A'} | <strong>Email:</strong> ${invoice.showroom_email || 'N/A'}</p>
            <p><strong>GSTIN:</strong> ${invoice.gst_number || 'N/A'} | <strong>PAN:</strong> ${invoice.pan_number || 'N/A'}</p>
        </div>
        
        <!-- Bill Type -->
        <div class="bill-type">TAX INVOICE</div>
        
        <!-- Content Section -->
        <div class="content">
            <div class="bill-from">
                <h3>INVOICE DETAILS</h3>
                <p><strong>Sold By:</strong></p>
                <p>${invoice.showroom_name || 'N/A'}<br>${invoice.showroom_city || ''}, ${invoice.showroom_state || ''}</p>
                <p style="margin-top: 10px;"><strong>Bill To:</strong></p>
                <p><strong>${invoice.customer_name || 'N/A'}</strong><br>
                ${invoice.customer_address || 'N/A'}<br>
                ${invoice.customer_mobile ? 'Mobile: ' + invoice.customer_mobile : ''}<br>
                ${invoice.customer_email ? 'Email: ' + invoice.customer_email : ''}<br>
                ${invoice.customer_gst ? 'GSTIN: ' + invoice.customer_gst : ''}</p>
            </div>
            
            <div class="bill-details">
                <div class="detail-item">
                    <div class="detail-label">Invoice No.</div>
                    <div class="detail-value">${invoice.invoice_number}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Date</div>
                    <div class="detail-value">${new Date(invoice.sale_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Payment Mode</div>
                    <div class="detail-value">${paymentMode}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">GST Type</div>
                    <div class="detail-value">${invoice.gst_customer_type || 'B2C'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Payment Status</div>
                    <div class="detail-value">${paymentStatusDisplay[invoice.payment_status] || invoice.payment_status}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Delivery Date</div>
                    <div class="detail-value">${invoice.delivery_date ? new Date(invoice.delivery_date).toLocaleDateString('en-IN') : 'N/A'}</div>
                </div>
                ${invoice.registration_number ? `<div class="detail-item"><div class="detail-label">Reg. Number</div><div class="detail-value">${invoice.registration_number}</div></div>` : ''}
                ${invoice.registration_date ? `<div class="detail-item"><div class="detail-label">Reg. Date</div><div class="detail-value">${new Date(invoice.registration_date).toLocaleDateString('en-IN')}</div></div>` : ''}
            </div>
        </div>
        
        <!-- Items Table -->
        <div class="items-section">
            <div class="items-header">ITEMS / SERVICES DESCRIPTION</div>
            <table>
                <thead>
                    <tr>
                        <th>S.No.</th>
                        <th>DESCRIPTION OF GOODS/SERVICES</th>
                        <th>HSN CODE</th>
                        <th class="text-center">QTY</th>
                        <th class="text-right">RATE (₹)</th>
                        <th class="text-right">AMOUNT (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsRows}
                    ${serialNo <= 1 ? '<tr style="height: 30px;"><td colspan="6">&nbsp;</td></tr>' : ''}
                </tbody>
            </table>
        </div>
        
        <!-- Totals -->
        <div class="totals">
            <div class="totals-box">
                <div class="total-row subtotal">
                    <span>Subtotal</span>
                    <span>${formatCurrencyRaw(subtotalAmount)}</span>
                </div>
                ${Number(invoice.corporate_discount) > 0 ? `<div class="total-row discount"><span>Corporate Discount</span><span>- ${formatCurrencyRaw(Number(invoice.corporate_discount))}</span></div>` : ''}
                ${Number(invoice.exchange_bonus) > 0 ? `<div class="total-row discount"><span>Exchange Bonus</span><span>- ${formatCurrencyRaw(Number(invoice.exchange_bonus))}</span></div>` : ''}
                ${Number(invoice.festival_discount) > 0 ? `<div class="total-row discount"><span>Festival Discount</span><span>- ${formatCurrencyRaw(Number(invoice.festival_discount))}</span></div>` : ''}
                ${Number(invoice.loyalty_discount) > 0 ? `<div class="total-row discount"><span>Loyalty Discount</span><span>- ${formatCurrencyRaw(Number(invoice.loyalty_discount))}</span></div>` : ''}
                ${Number(invoice.additional_discount) > 0 ? `<div class="total-row discount"><span>Additional Discount</span><span>- ${formatCurrencyRaw(Number(invoice.additional_discount))}</span></div>` : ''}
                ${Number(invoice.fame_ii_subsidy) > 0 ? `<div class="total-row subsidy"><span>FAME II Subsidy</span><span>- ${formatCurrencyRaw(Number(invoice.fame_ii_subsidy))}</span></div>` : ''}
                ${Number(invoice.state_ev_subsidy) > 0 ? `<div class="total-row subsidy"><span>State EV Subsidy</span><span>- ${formatCurrencyRaw(Number(invoice.state_ev_subsidy))}</span></div>` : ''}
                ${Number(invoice.additional_subsidy) > 0 ? `<div class="total-row subsidy"><span>Additional Subsidy</span><span>- ${formatCurrencyRaw(Number(invoice.additional_subsidy))}</span></div>` : ''}
                <div class="total-row subtotal">
                    <span>Taxable Amount</span>
                    <span>${formatCurrencyRaw(taxableAmount)}</span>
                </div>
                <div class="total-row subtotal">
                    <span>CGST @ ${cgstPercent}%</span>
                    <span>${formatCurrencyRaw(Number(invoice.cgst_amount))}</span>
                </div>
                <div class="total-row subtotal">
                    <span>SGST @ ${sgstPercent}%</span>
                    <span>${formatCurrencyRaw(Number(invoice.sgst_amount))}</span>
                </div>
                <div class="total-row grand-total">
                    <span>GRAND TOTAL</span>
                    <span>₹ ${formatCurrencyRaw(grandTotal)}</span>
                </div>
                ${Number(invoice.advance_amount) > 0 ? `<div class="total-row" style="color: #2563eb;"><span>Advance Paid</span><span>- ${formatCurrencyRaw(Number(invoice.advance_amount))}</span></div><div class="total-row" style="color: #dc2626; font-weight: bold;"><span>Balance Due</span><span>₹ ${formatCurrencyRaw(balanceDue)}</span></div>` : ''}
            </div>
        </div>
        
        <!-- Notes -->
        <div class="notes">
            <h4>Important Terms & Conditions:</h4>
            <ol>
                <li>This is a computer generated invoice and does not require a physical signature.</li>
                <li>Vehicle warranty: ${invoice.vehicle_warranty || '3 Years / 125,000 KM'} from date of purchase.</li>
                <li>Battery warranty: ${invoice.battery_warranty || '5 Years / 60,000 KM'} from date of purchase.</li>
                <li>All disputes are subject to jurisdiction of local courts.</li>
                ${invoice.invoice_footer_note ? `<li>${invoice.invoice_footer_note}</li>` : ''}
            </ol>
        </div>
        
        <!-- Bank Details -->
        ${invoice.bank_name ? `
        <div class="bank-details">
            <h4>Bank Details</h4>
            <p><strong>Bank:</strong> ${invoice.bank_name} | <strong>Account:</strong> ${invoice.account_number} | <strong>IFSC:</strong> ${invoice.ifsc_code}${invoice.upi_id ? ` | <strong>UPI:</strong> ${invoice.upi_id}` : ''}</p>
        </div>` : ''}
        
        <!-- Footer -->
        <div class="footer">
            <div class="company-name">
                For ${invoice.showroom_name || 'EV Showroom'}
            </div>
            <div class="signature-section">
                <div class="signature-line"></div>
                <div class="signature-text">Authorized Signature</div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// ============================================
// PDF BUFFER GENERATION USING jsPDF
// ============================================

async function generatePDFBuffer(invoice: any): Promise<ArrayBuffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = 15;

  // Helper functions
  const addText = (text: string, x: number, fontSize: number, color: number[] = [0, 0, 0], bold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    if (bold) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    doc.text(text, x, y);
  };

  const addLine = (yPos: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  };

  const taxableAmount = calculateTaxableAmount(invoice);
  const grandTotal = taxableAmount + Number(invoice.cgst_amount || 0) + Number(invoice.sgst_amount || 0);

  // Header
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.showroom_name || 'EV SHOWROOM', margin, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Authorized Electric Vehicle Dealer', margin, y);
  y += 4;
  doc.text(`GST: ${invoice.gst_number || 'N/A'} | PAN: ${invoice.pan_number || 'N/A'}`, margin, y);
  y += 4;
  doc.text(`Address: ${invoice.showroom_address || 'N/A'}`, margin, y);
  y += 4;
  doc.text(`Phone: ${invoice.showroom_phone || 'N/A'} | Email: ${invoice.showroom_email || 'N/A'}`, margin, y);
  
  y += 5;
  addLine(y);
  y += 8;

  // Invoice Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TAX INVOICE', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Bill To & Invoice Details
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', margin, y);
  doc.text('Invoice Details', pageWidth / 2 + 10, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${invoice.customer_name || 'N/A'}`, margin, y);
  doc.text(`Invoice No: ${invoice.invoice_number}`, pageWidth / 2 + 10, y);
  y += 4;
  doc.text(`${invoice.customer_address || 'N/A'}`, margin, y);
  doc.text(`Date: ${new Date(invoice.sale_date).toLocaleDateString('en-IN')}`, pageWidth / 2 + 10, y);
  y += 4;
  doc.text(`Mobile: ${invoice.customer_mobile || 'N/A'}`, margin, y);
  doc.text(`GST Type: ${invoice.gst_customer_type || 'B2C'}`, pageWidth / 2 + 10, y);
  y += 4;
  if (invoice.customer_gst) {
    doc.text(`GSTIN: ${invoice.customer_gst}`, margin, y);
    y += 4;
  }
  doc.text(`Payment Status: ${invoice.payment_status || 'Pending'}`, pageWidth / 2 + 10, y);
  y += 4;
  if (invoice.delivery_date) {
    doc.text(`Delivery Date: ${new Date(invoice.delivery_date).toLocaleDateString('en-IN')}`, pageWidth / 2 + 10, y);
  }

  y += 8;

  // Items Table
  const tableBody: any[] = [];
  
  if (Number(invoice.ex_showroom_price) > 0) {
    tableBody.push([
      '1',
      `${invoice.vehicle_name || 'EV'}\nVIN: ${invoice.vin_number || 'N/A'}\nColor: ${invoice.vehicle_color || 'N/A'}`,
      '8703', '1',
      formatCurrencyRaw(Number(invoice.ex_showroom_price)),
      formatCurrencyRaw(Number(invoice.ex_showroom_price))
    ]);
  }
  if (Number(invoice.rto_charges) > 0) tableBody.push(['2', 'RTO / Registration Charges', '9999', '1', formatCurrencyRaw(Number(invoice.rto_charges)), formatCurrencyRaw(Number(invoice.rto_charges))]);
  if (Number(invoice.insurance_amount) > 0) tableBody.push(['3', `Insurance\nProvider: ${invoice.insurance_provider || 'N/A'}`, '9971', '1', formatCurrencyRaw(Number(invoice.insurance_amount)), formatCurrencyRaw(Number(invoice.insurance_amount))]);
  if (Number(invoice.handling_charges) > 0) tableBody.push(['4', 'Handling Charges', '9965', '1', formatCurrencyRaw(Number(invoice.handling_charges)), formatCurrencyRaw(Number(invoice.handling_charges))]);
  if (Number(invoice.fast_charger_cost) > 0) tableBody.push(['5', 'Fast Charger', '8504', '1', formatCurrencyRaw(Number(invoice.fast_charger_cost)), formatCurrencyRaw(Number(invoice.fast_charger_cost))]);
  if (Number(invoice.extended_warranty_cost) > 0) tableBody.push(['6', 'Extended Warranty', '9999', '1', formatCurrencyRaw(Number(invoice.extended_warranty_cost)), formatCurrencyRaw(Number(invoice.extended_warranty_cost))]);
  if (Number(invoice.accessories_amount) > 0) tableBody.push(['7', 'Accessories', '8708', '1', formatCurrencyRaw(Number(invoice.accessories_amount)), formatCurrencyRaw(Number(invoice.accessories_amount))]);

  autoTable(doc, {
    startY: y,
    head: [['S.No', 'Description', 'HSN', 'QTY', 'Rate (₹)', 'Amount (₹)']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [245, 245, 245], textColor: 0, fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 30 }
    },
    margin: { left: margin, right: margin }
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Totals
  const totalsX = pageWidth - margin - 80;
  
  // Calculate subtotal
  let subtotal = 0;
  if (Number(invoice.ex_showroom_price) > 0) subtotal += Number(invoice.ex_showroom_price);
  if (Number(invoice.rto_charges) > 0) subtotal += Number(invoice.rto_charges);
  if (Number(invoice.insurance_amount) > 0) subtotal += Number(invoice.insurance_amount);
  if (Number(invoice.handling_charges) > 0) subtotal += Number(invoice.handling_charges);
  if (Number(invoice.fast_charger_cost) > 0) subtotal += Number(invoice.fast_charger_cost);
  if (Number(invoice.extended_warranty_cost) > 0) subtotal += Number(invoice.extended_warranty_cost);
  if (Number(invoice.accessories_amount) > 0) subtotal += Number(invoice.accessories_amount);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', totalsX, y);
  doc.text(formatCurrencyRaw(subtotal), pageWidth - margin, y, { align: 'right' });
  y += 5;

  if (Number(invoice.corporate_discount) > 0) { doc.setTextColor(220, 38, 38); doc.text('Corporate Discount:', totalsX, y); doc.text(`- ${formatCurrencyRaw(Number(invoice.corporate_discount))}`, pageWidth - margin, y, { align: 'right' }); y += 5; }
  if (Number(invoice.exchange_bonus) > 0) { doc.setTextColor(220, 38, 38); doc.text('Exchange Bonus:', totalsX, y); doc.text(`- ${formatCurrencyRaw(Number(invoice.exchange_bonus))}`, pageWidth - margin, y, { align: 'right' }); y += 5; }
  if (Number(invoice.festival_discount) > 0) { doc.setTextColor(220, 38, 38); doc.text('Festival Discount:', totalsX, y); doc.text(`- ${formatCurrencyRaw(Number(invoice.festival_discount))}`, pageWidth - margin, y, { align: 'right' }); y += 5; }
  if (Number(invoice.loyalty_discount) > 0) { doc.setTextColor(220, 38, 38); doc.text('Loyalty Discount:', totalsX, y); doc.text(`- ${formatCurrencyRaw(Number(invoice.loyalty_discount))}`, pageWidth - margin, y, { align: 'right' }); y += 5; }
  if (Number(invoice.additional_discount) > 0) { doc.setTextColor(220, 38, 38); doc.text('Additional Discount:', totalsX, y); doc.text(`- ${formatCurrencyRaw(Number(invoice.additional_discount))}`, pageWidth - margin, y, { align: 'right' }); y += 5; }
  if (Number(invoice.fame_ii_subsidy) > 0) { doc.setTextColor(5, 150, 105); doc.text('FAME II Subsidy:', totalsX, y); doc.text(`- ${formatCurrencyRaw(Number(invoice.fame_ii_subsidy))}`, pageWidth - margin, y, { align: 'right' }); y += 5; }
  if (Number(invoice.state_ev_subsidy) > 0) { doc.setTextColor(5, 150, 105); doc.text('State EV Subsidy:', totalsX, y); doc.text(`- ${formatCurrencyRaw(Number(invoice.state_ev_subsidy))}`, pageWidth - margin, y, { align: 'right' }); y += 5; }
  if (Number(invoice.additional_subsidy) > 0) { doc.setTextColor(5, 150, 105); doc.text('Additional Subsidy:', totalsX, y); doc.text(`- ${formatCurrencyRaw(Number(invoice.additional_subsidy))}`, pageWidth - margin, y, { align: 'right' }); y += 5; }

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Taxable Amount:', totalsX, y);
  doc.text(formatCurrencyRaw(taxableAmount), pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`CGST @ ${invoice.cgst_percentage || 9}%:`, totalsX, y);
  doc.text(formatCurrencyRaw(Number(invoice.cgst_amount)), pageWidth - margin, y, { align: 'right' });
  y += 5;
  doc.text(`SGST @ ${invoice.sgst_percentage || 9}%:`, totalsX, y);
  doc.text(formatCurrencyRaw(Number(invoice.sgst_amount)), pageWidth - margin, y, { align: 'right' });
  y += 6;

  doc.setFillColor(255, 243, 205);
  doc.rect(totalsX - 2, y - 5, pageWidth - totalsX - margin + 4, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('GRAND TOTAL:', totalsX, y);
  doc.text(`₹ ${formatCurrencyRaw(grandTotal)}`, pageWidth - margin, y, { align: 'right' });
  y += 8;

  if (Number(invoice.advance_amount) > 0) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(37, 99, 235);
    doc.text('Advance Paid:', totalsX, y);
    doc.text(`- ${formatCurrencyRaw(Number(invoice.advance_amount))}`, pageWidth - margin, y, { align: 'right' });
    y += 5;
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    doc.text('Balance Due:', totalsX, y);
    doc.text(`₹ ${formatCurrencyRaw(grandTotal - Number(invoice.advance_amount))}`, pageWidth - margin, y, { align: 'right' });
  }

  // Terms & Conditions
  y += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Terms & Conditions:', margin, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('1. This is a computer generated invoice.', margin + 5, y); y += 3.5;
  doc.text(`2. Vehicle Warranty: ${invoice.vehicle_warranty || '3 Years / 125,000 KM'}`, margin + 5, y); y += 3.5;
  doc.text(`3. Battery Warranty: ${invoice.battery_warranty || '5 Years / 60,000 KM'}`, margin + 5, y); y += 3.5;
  doc.text('4. All disputes subject to local jurisdiction.', margin + 5, y); y += 3.5;
  if (invoice.invoice_footer_note) {
    doc.text(`5. ${invoice.invoice_footer_note}`, margin + 5, y); y += 3.5;
  }

  // Bank Details
  if (invoice.bank_name) {
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Bank Details:', margin, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Bank: ${invoice.bank_name} | Account: ${invoice.account_number} | IFSC: ${invoice.ifsc_code}${invoice.upi_id ? ` | UPI: ${invoice.upi_id}` : ''}`, margin, y);
  }

  // Footer
  y = pageHeight - 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${invoice.showroom_name || 'EV Showroom'}`, margin, y);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Authorized Signature', pageWidth - margin - 40, y + 8, { align: 'center' });
  doc.line(pageWidth - margin - 60, y + 3, pageWidth - margin - 20, y + 3);

  return doc.output('arraybuffer');
}

// ============================================
// PDF UPLOAD
// ============================================

async function generateAndUploadPDF(
  supabase: any,
  invoice: SalesInvoice,
  showroomId: string
): Promise<string | null> {
  try {
    console.log('Generating PDF for invoice:', invoice.invoice_number);

    const { data: invoiceData } = await supabase.from('sales_invoices').select('*').eq('id', invoice.id).single();
    const { data: customerData } = await supabase.from('customers').select('*').eq('id', invoice.customer_id).single();
    const { data: vehicleData } = await supabase.from('vehicles').select('model_name, variant_name, brands(brand_name)').eq('id', invoice.vehicle_id).single();
    const { data: inventoryData } = await supabase.from('inventory').select('*').eq('id', invoice.inventory_id).single();
    const { data: showroomData } = await supabase.from('showrooms').select('*').eq('id', showroomId).single();
    const { data: addressData } = await supabase.from('showroom_addresses').select('*').eq('showroom_id', showroomId).eq('is_primary', true).single();
    const { data: brandingData } = await supabase.from('showroom_branding').select('*').eq('showroom_id', showroomId).single();
    const { data: billingConfigData } = await supabase.from('billing_configurations').select('*').eq('showroom_id', showroomId).single();

    if (!invoiceData) return null;

    const brandName = getBrandName(vehicleData);
    const showroomAddress = addressData 
      ? `${addressData.address_line_1 || ''}${addressData.address_line_2 ? ', ' + addressData.address_line_2 : ''}, ${addressData.city || ''}, ${addressData.state || ''} - ${addressData.pincode || ''}`
      : 'N/A';

    const customerAddress = customerData 
      ? `${customerData.address_line1 || ''}${customerData.address_line2 ? ', ' + customerData.address_line2 : ''}, ${customerData.city || ''}, ${customerData.state || ''} - ${customerData.pincode || ''}`
      : '';

    const pdfData = {
      ...invoiceData,
      customer_name: customerData ? `${customerData.first_name || ''} ${customerData.last_name || ''}`.trim() : 'N/A',
      customer_mobile: customerData?.mobile || 'N/A',
      customer_email: customerData?.email || '',
      customer_gst: customerData?.gst_number || '',
      customer_address: customerAddress,
      customer_city: customerData?.city || '',
      customer_state: customerData?.state || '',
      customer_pincode: customerData?.pincode || '',
      vehicle_name: vehicleData ? `${brandName} ${vehicleData.model_name || ''} ${vehicleData.variant_name || ''}`.trim() : 'N/A',
      vin_number: inventoryData?.vin_number || null,
      chassis_number: inventoryData?.chassis_number || null,
      motor_number: inventoryData?.motor_number || null,
      battery_number: inventoryData?.battery_number || null,
      vehicle_color: inventoryData?.color || null,
      vehicle_warranty: vehicleData ? `${vehicleData.vehicle_warranty_years || 3} Years / ${vehicleData.vehicle_warranty_km || 125000} KM` : '3 Years / 125,000 KM',
      battery_warranty: vehicleData ? `${vehicleData.battery_warranty_years || 5} Years / ${vehicleData.battery_warranty_km || 60000} KM` : '5 Years / 60,000 KM',
      showroom_name: showroomData?.showroom_name || 'N/A',
      showroom_address: showroomAddress,
      showroom_city: addressData?.city || '',
      showroom_state: addressData?.state || '',
      showroom_phone: brandingData?.official_mobile_number || brandingData?.whatsapp_number || 'N/A',
      showroom_email: brandingData?.support_email || 'N/A',
      gst_number: showroomData?.gst_number || 'N/A',
      pan_number: showroomData?.pan_number || 'N/A',
      bank_name: billingConfigData?.bank_name || null,
      account_number: billingConfigData?.account_number || null,
      ifsc_code: billingConfigData?.ifsc_code || null,
      upi_id: billingConfigData?.upi_id || null,
      invoice_footer_note: billingConfigData?.invoice_footer_note || null,
      charger_type: invoiceData.charger_type || 'Standard',
      home_charger_installed: invoiceData.home_charger_installed || false,
      home_charger_model: invoiceData.home_charger_model || null,
      home_charger_installation_date: invoiceData.home_charger_installation_date || null,
      registration_number: invoiceData.registration_number || null,
      registration_date: invoiceData.registration_date || null,
    };

    const pdfArrayBuffer = await generatePDFBuffer(pdfData);
    const pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
    const pdfFileName = `invoices/${showroomId}/${invoice.invoice_number.replace(/\//g, '_')}.pdf`;

    console.log('Uploading PDF:', pdfFileName);

    const { error: uploadError } = await supabase.storage.from('invoice-pdfs').upload(pdfFileName, pdfBlob, {
      contentType: 'application/pdf', upsert: true, cacheControl: '3600'
    });

    if (uploadError) { console.error('Upload error:', uploadError); return null; }

    const { data: { publicUrl } } = supabase.storage.from('invoice-pdfs').getPublicUrl(pdfFileName);
    console.log('PDF uploaded:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('PDF error:', error);
    return null;
  }
}

const supabase = createApiClient();

// ============================================
// POST - Create invoice
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: InvoiceCreatePayload = await request.json();

    const requiredFields = ['showroom_id', 'created_by', 'customer_id', 'vehicle_id', 'inventory_id', 'sale_date', 'ex_showroom_price'];
    for (const field of requiredFields) {
      if (!(body as any)[field]) {
        return NextResponse.json({ success: false, error: `Missing: ${field}` }, { status: 400 });
      }
    }

    const { invoiceNumber, sequence } = await generateInvoiceNumber(supabase, body.showroom_id);
    const { data: billingConfig } = await supabase.from('billing_configurations').select('*').eq('showroom_id', body.showroom_id).single();
    const gstPercent = (billingConfig as BillingConfig)?.default_gst_percentage || 18;
    const taxableAmount = calculateTaxableAmount(body);
    const cgst = Math.round((taxableAmount * (gstPercent / 2)) / 100 * 100) / 100;
    const sgst = Math.round((taxableAmount * (gstPercent / 2)) / 100 * 100) / 100;

    let emiAmount: number | null = null;
    if (body.financing_required && body.finance_loan_amount && body.finance_tenure_months && body.finance_roi_percentage) {
      emiAmount = calculateEMI(Number(body.finance_loan_amount), Number(body.finance_tenure_months), Number(body.finance_roi_percentage));
    }

    const { data: invoice, error: invoiceError } = await supabase.from('sales_invoices').insert({
      invoice_number: invoiceNumber, showroom_id: body.showroom_id, created_by: body.created_by,
      customer_id: body.customer_id, vehicle_id: body.vehicle_id, inventory_id: body.inventory_id,
      sale_date: body.sale_date, delivery_date: body.delivery_date || null, delivery_person_name: body.delivery_person_name || null,
      ex_showroom_price: body.ex_showroom_price, rto_charges: body.rto_charges || 0, insurance_amount: body.insurance_amount || 0,
      insurance_provider: body.insurance_provider || null, insurance_policy_number: body.insurance_policy_number || null,
      handling_charges: body.handling_charges || 0, fast_charger_cost: body.fast_charger_cost || 0,
      extended_warranty_cost: body.extended_warranty_cost || 0, accessories_amount: body.accessories_amount || 0,
      fame_ii_subsidy: body.fame_ii_subsidy || 0, state_ev_subsidy: body.state_ev_subsidy || 0, additional_subsidy: body.additional_subsidy || 0,
      subsidy_reference_number: body.subsidy_reference_number || null,
      corporate_discount: body.corporate_discount || 0, exchange_bonus: body.exchange_bonus || 0,
      festival_discount: body.festival_discount || 0, loyalty_discount: body.loyalty_discount || 0, additional_discount: body.additional_discount || 0,
      cgst_percentage: Math.round((gstPercent / 2) * 100) / 100, sgst_percentage: Math.round((gstPercent / 2) * 100) / 100,
      cgst_amount: cgst, sgst_amount: sgst,
      payment_status: body.payment_status || 'Pending', advance_amount: body.advance_amount || 0,
      financing_required: body.financing_required || false, finance_company: body.finance_company || null,
      finance_loan_amount: body.finance_loan_amount || null, finance_emi_amount: emiAmount,
      finance_tenure_months: body.finance_tenure_months || null, finance_roi_percentage: body.finance_roi_percentage || null,
      gst_customer_type: body.gst_customer_type || 'B2C', billing_address: body.billing_address || null, shipping_address: body.shipping_address || null,
    }).select().single();

    if (invoiceError) throw invoiceError;
    console.log('Invoice created:', invoice.invoice_number);

    const { data: inventoryItem } = await supabase.from('inventory').select('*').eq('id', body.inventory_id).single();
    const { data: vehicleDetails } = await supabase.from('vehicles').select('*').eq('id', body.vehicle_id).single();

    if (inventoryItem && vehicleDetails) {
      const purchaseDate = body.sale_date;
      const vwy = vehicleDetails.vehicle_warranty_years || 3;
      const bwy = vehicleDetails.battery_warranty_years || 5;
      const vExp = new Date(purchaseDate); vExp.setFullYear(vExp.getFullYear() + vwy);
      const bExp = new Date(purchaseDate); bExp.setFullYear(bExp.getFullYear() + bwy);
      const nsDate = new Date(purchaseDate); nsDate.setMonth(nsDate.getMonth() + 3);
      const vin = inventoryItem.vin_number || 'UNKNOWN';
      const ts = Date.now().toString(36).toUpperCase();
      const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();

      let extExp: string | null = null;
      if (body.extended_warranty_cost > 0) { const d = new Date(purchaseDate); d.setFullYear(d.getFullYear() + vwy + 2); extExp = d.toISOString().split('T')[0]; }
      let insExp: string | null = null;
      if (body.insurance_policy_number) { insExp = body.insurance_expiry || (() => { const d = new Date(purchaseDate); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0]; })(); }

      await supabase.from('customer_vehicles').insert({
        showroom_id: body.showroom_id, customer_id: body.customer_id, vehicle_model_id: body.vehicle_id, purchase_invoice_id: invoice.id,
        chassis_number: inventoryItem.chassis_number || `CH-${vin.substring(0, 4)}-${ts}-${rnd}`,
        motor_number: inventoryItem.motor_number || `MT-${vin.substring(0, 4)}-${ts}-${rnd}`,
        battery_number: inventoryItem.battery_number || `BT-${vin.substring(0, 4)}-${ts}-${rnd}`,
        vehicle_color: inventoryItem.color, variant_name: inventoryItem.variant_name || vehicleDetails.variant_name,
        manufacturing_year: inventoryItem.manufacturing_date ? new Date(inventoryItem.manufacturing_date).getFullYear() : new Date().getFullYear(),
        purchase_date: purchaseDate, registration_number: body.registration_number || null, registration_date: body.registration_date || null,
        battery_capacity_kwh: vehicleDetails.battery_capacity_kwh, battery_type: vehicleDetails.vehicle_type || 'Lithium-ion',
        battery_warranty_years: bwy, battery_warranty_km: vehicleDetails.battery_warranty_km || 60000, battery_warranty_expiry: bExp.toISOString().split('T')[0],
        battery_health_percentage: 100, vehicle_warranty_years: vwy, vehicle_warranty_km: vehicleDetails.vehicle_warranty_km || 125000,
        vehicle_warranty_expiry: vExp.toISOString().split('T')[0], extended_warranty_purchased: body.extended_warranty_cost > 0, extended_warranty_expiry: extExp,
        charger_type: body.charger_type || 'Standard', home_charger_installed: body.home_charger_installed || false,
        home_charger_model: body.home_charger_model || null, home_charger_installation_date: body.home_charger_installation_date || null,
        insurance_provider: body.insurance_provider || null, insurance_policy_number: body.insurance_policy_number || null,
        insurance_expiry: insExp, insurance_type: body.insurance_type || 'Comprehensive',
        current_odometer_km: 0, next_service_due_km: 3000, next_service_due_date: nsDate.toISOString().split('T')[0], vehicle_status: 'Active',
      });
    }

    await supabase.from('inventory').update({ stock_status: 'Sold', sold_date: body.sale_date, sold_to_customer_id: body.customer_id, sale_invoice_id: invoice.id, updated_at: new Date().toISOString() }).eq('id', body.inventory_id);

    const grandTotal = taxableAmount + cgst + sgst;
    const { data: cust } = await supabase.from('customers').select('total_vehicles_owned, total_purchase_amount').eq('id', body.customer_id).single();
    if (cust) {
      await supabase.from('customers').update({
        total_vehicles_owned: (cust.total_vehicles_owned || 0) + 1,
        total_purchase_amount: parseFloat(String(cust.total_purchase_amount || '0')) + grandTotal,
        lead_status: 'Converted', customer_status: 'Active', last_contact_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString()
      }).eq('id', body.customer_id);
    }

    await supabase.from('billing_configurations').update({ invoice_sequence: sequence + 1, updated_at: new Date().toISOString() }).eq('showroom_id', body.showroom_id);

    const pdfUrl = await generateAndUploadPDF(supabase, invoice, body.showroom_id);
    if (pdfUrl) {
      await supabase.from('sales_invoices').update({ invoice_pdf_url: pdfUrl }).eq('id', invoice.id);
      invoice.invoice_pdf_url = pdfUrl;
    }

    return NextResponse.json({ success: true, data: invoice, message: `Invoice ${invoiceNumber} created` });
  } catch (error: any) {
    console.error('Create error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================
// PUT, PATCH, GET, DELETE
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    updateData.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('sales_invoices').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, reason, cancelled_by } = body;
    if (!id || !reason) return NextResponse.json({ success: false, error: 'ID and reason required' }, { status: 400 });
    const { data: invoice } = await supabase.from('sales_invoices').select('*').eq('id', id).single();
    if (!invoice) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    if (invoice.is_cancelled) return NextResponse.json({ success: false, error: 'Already cancelled' }, { status: 400 });
    await supabase.from('sales_invoices').update({ payment_status: 'cancelled', is_cancelled: true, cancelled_at: new Date().toISOString(), cancelled_by: cancelled_by || null, cancellation_reason: reason, updated_at: new Date().toISOString() }).eq('id', id);
    if (invoice.inventory_id) await supabase.from('inventory').update({ stock_status: 'Available', sold_date: null, sold_to_customer_id: null, sale_invoice_id: null, updated_at: new Date().toISOString() }).eq('id', invoice.inventory_id);
    await supabase.from('customer_vehicles').update({ vehicle_status: 'Sold', updated_at: new Date().toISOString() }).eq('purchase_invoice_id', id);
    return NextResponse.json({ success: true, message: 'Cancelled' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showroomId = searchParams.get('showroom_id');
    const invoiceId = searchParams.get('id');
    if (!showroomId && !invoiceId) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    let q;
    if (invoiceId) { q = supabase.from('sales_invoices').select('*').eq('id', invoiceId).single(); }
    else { q = supabase.from('sales_invoices').select('*', { count: 'exact' }).eq('showroom_id', showroomId).order('created_at', { ascending: false }); }
    const { data, error, count } = await q;
    if (error) throw error;
    return NextResponse.json({ success: true, data, count });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
    const { data: inv } = await supabase.from('sales_invoices').select('*').eq('id', id).single();
    if (!inv) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    if (inv.inventory_id) await supabase.from('inventory').update({ stock_status: 'Available', sold_date: null, sold_to_customer_id: null, sale_invoice_id: null }).eq('id', inv.inventory_id);
    await supabase.from('customer_vehicles').delete().eq('purchase_invoice_id', id);
    if (inv.invoice_pdf_url) { try { const fn = inv.invoice_pdf_url.split('/').pop(); await supabase.storage.from('invoice-pdfs').remove([`invoices/${inv.showroom_id}/${fn}`]); } catch (e) {} }
    await supabase.from('sales_invoices').delete().eq('id', id);
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ============================================
// PDF Endpoint for viewing
// ============================================

export async function generatePDFEndpoint(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();
    const { data: invoice } = await supabase.from('sales_invoices').select('*').eq('id', invoiceId).single();
    if (!invoice) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

    const { data: cust } = await supabase.from('customers').select('*').eq('id', invoice.customer_id).single();
    const { data: veh } = await supabase.from('vehicles').select('model_name, variant_name, brands(brand_name)').eq('id', invoice.vehicle_id).single();
    const { data: inv } = await supabase.from('inventory').select('*').eq('id', invoice.inventory_id).single();
    const { data: shw } = await supabase.from('showrooms').select('*').eq('id', invoice.showroom_id).single();
    const { data: addr } = await supabase.from('showroom_addresses').select('*').eq('showroom_id', invoice.showroom_id).eq('is_primary', true).single();
    const { data: brd } = await supabase.from('showroom_branding').select('*').eq('showroom_id', invoice.showroom_id).single();
    const { data: bcfg } = await supabase.from('billing_configurations').select('*').eq('showroom_id', invoice.showroom_id).single();

    const brandName = getBrandName(veh);
    const showroomAddress = addr ? `${addr.address_line_1 || ''}${addr.address_line_2 ? ', ' + addr.address_line_2 : ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}` : 'N/A';
    const customerAddress = cust ? `${cust.address_line1 || ''}${cust.address_line2 ? ', ' + cust.address_line2 : ''}, ${cust.city || ''}, ${cust.state || ''} - ${cust.pincode || ''}` : '';

    const htmlContent = generatePDFHTML({
      ...invoice,
      customer_name: cust ? `${cust.first_name || ''} ${cust.last_name || ''}`.trim() : 'N/A',
      customer_mobile: cust?.mobile || 'N/A',
      customer_email: cust?.email || '',
      customer_gst: cust?.gst_number || '',
      customer_address: customerAddress,
      customer_city: cust?.city || '',
      customer_state: cust?.state || '',
      customer_pincode: cust?.pincode || '',
      vehicle_name: veh ? `${brandName} ${veh.model_name || ''} ${veh.variant_name || ''}`.trim() : 'N/A',
      vin_number: inv?.vin_number || null,
      chassis_number: inv?.chassis_number || null,
      motor_number: inv?.motor_number || null,
      battery_number: inv?.battery_number || null,
      vehicle_color: inv?.color || null,
      vehicle_warranty: veh ? `${veh.vehicle_warranty_years || 3} Years / ${veh.vehicle_warranty_km || 125000} KM` : '3 Years',
      battery_warranty: veh ? `${veh.battery_warranty_years || 5} Years / ${veh.battery_warranty_km || 60000} KM` : '5 Years',
      showroom_name: shw?.showroom_name || 'N/A',
      showroom_address: showroomAddress,
      showroom_city: addr?.city || '',
      showroom_state: addr?.state || '',
      showroom_phone: brd?.official_mobile_number || 'N/A',
      showroom_email: brd?.support_email || 'N/A',
      gst_number: shw?.gst_number || 'N/A',
      pan_number: shw?.pan_number || 'N/A',
      bank_name: bcfg?.bank_name || null,
      account_number: bcfg?.account_number || null,
      ifsc_code: bcfg?.ifsc_code || null,
      upi_id: bcfg?.upi_id || null,
      invoice_footer_note: bcfg?.invoice_footer_note || null,
    });

    return NextResponse.json({ success: true, data: { html: htmlContent, invoice } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}