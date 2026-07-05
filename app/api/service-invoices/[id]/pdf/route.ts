import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

const supabaseUrl  = process.env.SUPABASE_URL!;
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Helpers (mirrors billing/invoices/route.ts) ──────────────────────────────

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const num2 = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const inr = (n: number) =>
  `${Number(n) < 0 ? '-' : ''}Rs. ${num2(Math.abs(Number(n)))}`;

async function fetchImageAsDataUrl(
  url: string | null | undefined
): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const contentType = (res.headers.get('content-type') || 'image/png').toLowerCase();
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength === 0) return null;
    const format: 'PNG' | 'JPEG' = contentType.includes('jpeg') || contentType.includes('jpg') ? 'JPEG' : 'PNG';
    return { dataUrl: `data:${format === 'JPEG' ? 'image/jpeg' : 'image/png'};base64,${buffer.toString('base64')}`, format };
  } catch {
    return null;
  }
}

// ── Service Invoice PDF generator ─────────────────────────────────────────────

async function generateServiceInvoicePDF(data: any): Promise<ArrayBuffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Layout constants — matches billing template exactly
  const L = 8;
  const R = 202;
  const TOP = 8;
  const BOTTOM = 289;
  const NAVY: [number, number, number] = [26, 35, 126];
  const BLACK: [number, number, number] = [0, 0, 0];
  const GRAY: [number, number, number]  = [90, 90, 90];
  const LIGHT: [number, number, number] = [235, 235, 240];
  const GREEN: [number, number, number] = [21, 128, 61];

  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  // Drawing helpers
  const box   = (x: number, yy: number, w: number, h: number) => doc.rect(x, yy, w, h);
  const vline = (x: number, y1: number, y2: number)           => doc.line(x, y1, x, y2);
  const hline = (x1: number, x2: number, yy: number)          => doc.line(x1, yy, x2, yy);
  const txt = (
    t: string, x: number, yy: number,
    opts: { size?: number; bold?: boolean; italic?: boolean; color?: [number, number, number]; align?: 'left' | 'center' | 'right' } = {}
  ) => {
    const { size = 8, bold = false, italic = false, color = BLACK, align = 'left' } = opts;
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', bold ? (italic ? 'bolditalic' : 'bold') : (italic ? 'italic' : 'normal'));
    doc.text(t, x, yy, { align });
  };

  // Cost breakdown
  const laborCost   = round2(Number(data.labor_cost    || 0));
  const partsCost   = round2(Number(data.parts_cost    || 0));
  const taxAmount   = round2(Number(data.tax_amount    || 0));
  const discAmount  = round2(Number(data.discount_amount || 0));
  const grandTotal  = round2(laborCost + partsCost + taxAmount - discAmount);

  const invoiceDate = data.invoice_date
    ? new Date(data.invoice_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

  let y = 8;

  // ============ TITLE BAR ============
  const titleH = 8;
  box(L, y, R - L, titleH);
  txt('SERVICE INVOICE', (L + R) / 2, y + 5.5, { size: 12, bold: true, align: 'center' });
  txt('ORIGINAL FOR RECIPIENT', R - 2, y + 5, { size: 7, color: GRAY, align: 'right' });
  y += titleH;

  // ============ COMPANY + META ============
  const compH  = 32;
  const splitX = 120;
  const metaMidX = 161;
  box(L, y, R - L, compH);
  vline(splitX, y, y + compH);

  // Logo
  const logoSize = 15;
  const logoX = L + 3;
  const logoY = y + 3;
  const logoImg = await fetchImageAsDataUrl(data.logo_url);
  if (logoImg) {
    try {
      const props = doc.getImageProperties(logoImg.dataUrl);
      const ratio = props.width / props.height;
      let w = logoSize; let h = logoSize;
      if (ratio > 1) h = logoSize / ratio; else w = logoSize * ratio;
      doc.addImage(logoImg.dataUrl, logoImg.format, logoX + (logoSize - w) / 2, logoY + (logoSize - h) / 2, w, h);
    } catch {
      drawMonogram();
    }
  } else {
    drawMonogram();
  }
  function drawMonogram() {
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(logoX, logoY, logoSize, logoSize, 'F');
    const initials = (data.showroom_name || 'EV').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    txt(initials, logoX + logoSize / 2, logoY + logoSize / 2 + 2, { size: 11, bold: true, color: [255, 255, 255], align: 'center' });
  }

  const compTextX = L + 3 + logoSize + 3;
  txt(data.showroom_name || 'EV Showroom', compTextX, y + 6, { size: 11, bold: true, color: NAVY });
  txt(`GSTIN ${data.gst_number || 'N/A'}`, compTextX, y + 11, { size: 7.5 });
  const compAddr = doc.splitTextToSize(data.showroom_address || 'N/A', splitX - compTextX - 3);
  let cy = y + 15;
  compAddr.slice(0, 2).forEach((ln: string) => { txt(ln, compTextX, cy, { size: 7, color: GRAY }); cy += 3.2; });
  txt(`Mobile ${data.showroom_phone || 'N/A'}`, compTextX, cy, { size: 7, color: GRAY });

  // Meta grid (2×2): Invoice #, Date, Service Type, Status
  const metaRowH = compH / 2;
  vline(metaMidX, y, y + compH);
  hline(splitX, R, y + metaRowH);
  const metaCell = (x: number, yy: number, label: string, value: string) => {
    txt(label, x + 2, yy + 3.5, { size: 6.5, color: GRAY });
    txt(value,  x + 2, yy + 8.5, { size: 8.5, bold: true });
  };
  metaCell(splitX,    y,             'Invoice #:',     data.invoice_number || '-');
  metaCell(metaMidX,  y,             'Invoice Date:',  invoiceDate);
  metaCell(splitX,    y + metaRowH,  'Service Type:',  data.service_type || 'Service');
  metaCell(metaMidX,  y + metaRowH,  'Payment Status:', data.payment_status || '-');
  y += compH;

  // ============ CUSTOMER + VEHICLE ============
  const custH = 30;
  box(L, y, R - L, custH);
  vline(splitX, y, y + custH);

  // Left — customer
  txt('Customer Details:', L + 3, y + 5, { size: 8, bold: true });
  txt(data.customer_name || 'N/A', L + 3, y + 9.5, { size: 8.5, bold: true });
  txt(`Ph: ${data.customer_mobile || 'N/A'}`, L + 3, y + 14.5, { size: 7, color: GRAY });

  // Right — vehicle
  txt('Vehicle Details:', splitX + 4, y + 5, { size: 8, bold: true });
  txt(data.vehicle_name || 'N/A', splitX + 4, y + 9.5, { size: 8.5, bold: true });
  if (data.registration_number)
    txt(`Reg No: ${data.registration_number}`, splitX + 4, y + 14.5, { size: 7, color: GRAY });
  if (data.chassis_number)
    txt(`Chassis: ${data.chassis_number}`, splitX + 4, y + 18.5, { size: 7, color: GRAY });
  if (data.odometer_reading)
    txt(`Odometer: ${Number(data.odometer_reading).toLocaleString('en-IN')} km`, splitX + 4, y + 22.5, { size: 7, color: GRAY });
  y += custH;

  // ============ SERVICE ITEMS TABLE ============
  // Build item rows — ONLY billable line items (labour + parts).
  // Discount, tax, and sub-totals are rendered BELOW the table, not inside it.
  type Line = { desc: string; hsn: string; qty: number; rate: number; amount: number; per: string };
  const lines: Line[] = [];
  if (laborCost > 0) {
    lines.push({ desc: 'Labour Charges', hsn: '9987', qty: 1, rate: laborCost, amount: laborCost, per: 'Job' });
  }
  if (partsCost > 0) {
    const parts = Array.isArray(data.parts_detail) && data.parts_detail.length > 0 ? data.parts_detail : null;
    if (parts) {
      parts.forEach((p: any) => {
        const qty  = Number(p.quantity || 1);
        const rate = Number(p.price || p.cost || p.unit_price || 0);
        lines.push({ desc: p.part_name || p.name || 'Part', hsn: p.hsn || '8708', qty, rate, amount: round2(qty * rate), per: 'Nos' });
      });
    } else {
      lines.push({ desc: 'Parts & Materials', hsn: '8708', qty: 1, rate: partsCost, amount: partsCost, per: 'Nos' });
    }
  }
  // NOTE: discAmount and taxAmount are NOT added here — they appear only in the sub-total section below.

  const itemBody = lines.map((l, i) => [
    String(i + 1), l.desc, l.hsn || '-', `${l.qty}`, num2(l.rate), l.per, num2(l.amount),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: L, right: 210 - R, top: TOP, bottom: 12 },
    head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Per', 'Amount']],
    body: itemBody,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.6, lineColor: [0, 0, 0], lineWidth: 0.2, textColor: BLACK, valign: 'top' },
    headStyles: { fillColor: [255, 255, 255], textColor: BLACK, fontStyle: 'bold', fontSize: 8, lineWidth: 0.2, lineColor: [0, 0, 0] },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 68 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 14, halign: 'center', fontStyle: 'italic' },
      6: { cellWidth: 30, halign: 'right' },
    },
  });
  let ty = (doc as any).lastAutoTable.finalY;

  const ensureSpace = (needed: number) => {
    if (ty + needed > BOTTOM) { doc.addPage(); ty = TOP; }
  };

  // ---- Sub-total lines ----
  const amountColX = 172;
  const subH = 5;
  const subLine = (label: string, value: string, bold = false) => {
    ensureSpace(subH);
    box(L, ty, R - L, subH);
    vline(amountColX, ty, ty + subH);
    txt(label, amountColX - 2, ty + 3.5, { size: 8, bold, italic: !bold, align: 'right' });
    txt(value, R - 2, ty + 3.5, { size: 8, bold, align: 'right' });
    ty += subH;
  };

  ensureSpace(subH * 4 + 8 + 8);
  if (laborCost > 0) subLine('Labour Charges', inr(laborCost));
  if (partsCost > 0) subLine('Parts & Materials', inr(partsCost));
  if (discAmount > 0) subLine('Discount', `-${inr(discAmount)}`);
  if (taxAmount > 0)  subLine('Tax / GST', inr(taxAmount));

  // ---- Total bar ----
  const totalH = 8;
  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.rect(L, ty, R - L, totalH, 'F');
  box(L, ty, R - L, totalH);
  vline(amountColX, ty, ty + totalH);
  txt('Grand Total', amountColX - 2, ty + 5.5, { size: 9.5, bold: true, align: 'right' });
  txt(inr(grandTotal), R - 2, ty + 5.5, { size: 10, bold: true, align: 'right' });
  ty += totalH;

  // ---- Amount in words ----
  const wordsH = 8;
  ensureSpace(wordsH);
  box(L, ty, R - L, wordsH);
  txt('E & O.E', R - 2, ty + 3.5, { size: 7, italic: true, color: GRAY, align: 'right' });
  ty += wordsH + 3;

  // ============ PAYMENT STATUS BADGE ============
  const isPaid = String(data.payment_status || '').toLowerCase() === 'paid';
  ensureSpace(5 + (isPaid ? 9 : 0) + 40);
  ty += 2;
  if (isPaid) {
    doc.setFillColor(GREEN[0], GREEN[1], GREEN[2]);
    doc.circle(R - 42, ty - 0.5, 1.6, 'F');
    txt('\u2713', R - 42, ty + 0.5, { size: 7, bold: true, color: [255, 255, 255], align: 'center' });
    txt('Amount Paid', R - 38, ty + 1, { size: 9, bold: true, color: GREEN });
    txt(`${inr(grandTotal)} paid via ${data.payment_method || 'Cash'} on ${invoiceDate}`, R - 2, ty + 6, { size: 7.5, color: GRAY, align: 'right' });
    ty += 9;
  }

  // ============ BANK / UPI QR / SIGNATURE ============
  // Three-column layout — exactly mirrors billing/invoices/route.ts
  const payH = 40;
  const c1 = L, c2 = 78, c3 = 145;
  box(L, ty, R - L, payH);
  vline(c2, ty, ty + payH);
  vline(c3, ty, ty + payH);

  // Column 1 — Bank details
  txt('Bank Details:', c1 + 3, ty + 5, { size: 8, bold: true });
  const bankRows: [string, string][] = [
    ['Bank:',   data.bank_name      || 'N/A'],
    ['A/C No:', data.account_number || 'N/A'],
    ['IFSC:',   data.ifsc_code      || 'N/A'],
    ['UPI:',    data.upi_id         || 'N/A'],
  ];
  let byk = ty + 11;
  bankRows.forEach(([k, v]) => {
    txt(k, c1 + 3,  byk, { size: 7, color: GRAY });
    txt(v, c1 + 20, byk, { size: 7, bold: true });
    byk += 5;
  });

  // Column 2 — UPI QR code
  txt('Pay using UPI', (c2 + c3) / 2, ty + 5, { size: 8, bold: true, align: 'center' });
  if (data.upi_id) {
    try {
      const upiString = `upi://pay?pa=${encodeURIComponent(data.upi_id)}&pn=${encodeURIComponent(data.showroom_name || 'Merchant')}&am=${grandTotal}&cu=INR`;
      const qrDataUrl = await QRCode.toDataURL(upiString, { margin: 0, width: 240 });
      const qrSize = 26;
      doc.addImage(qrDataUrl, 'PNG', (c2 + c3) / 2 - qrSize / 2, ty + 8, qrSize, qrSize);
    } catch {
      txt('QR unavailable', (c2 + c3) / 2, ty + 22, { size: 7, color: GRAY, align: 'center' });
    }
  } else {
    txt('No UPI configured', (c2 + c3) / 2, ty + 22, { size: 7, color: GRAY, align: 'center' });
  }

  // Column 3 — Signature
  txt(`For ${data.showroom_name || 'EV Showroom'}`, R - 3, ty + 5, { size: 7.5, bold: true, align: 'right' });
  const signImg = await fetchImageAsDataUrl(data.authorized_signature_url);
  const signPlaced = (() => {
    if (!signImg) return false;
    try {
      const props = doc.getImageProperties(signImg.dataUrl);
      const ratio = props.width / props.height;
      const maxW = R - c3 - 8;
      const maxH = 16;
      let w = maxW; let h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      doc.addImage(signImg.dataUrl, signImg.format, R - 3 - w, ty + 8, w, h);
      return true;
    } catch { return false; }
  })();
  if (!signPlaced) {
    const stampCx = (c3 + R) / 2;
    const stampCy = ty + 20;
    doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setLineWidth(0.5);
    doc.circle(stampCx, stampCy, 12);
    doc.setLineWidth(0.3);
    doc.circle(stampCx, stampCy, 9.5);
    txt('SIGNATURE', stampCx, stampCy + 1, { size: 7, bold: true, color: NAVY, align: 'center' });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
  }
  txt('Authorised Signatory', R - 3, ty + payH - 3, { size: 7, color: GRAY, align: 'right' });
  ty += payH;

  // ============ FOOTER / TERMS ============
  const footerH = 14;
  if (ty + footerH > BOTTOM) { doc.addPage(); ty = TOP; }
  box(L, ty, R - L, footerH);
  vline(splitX, ty, ty + footerH);
  txt('Notes:', L + 3, ty + 5, { size: 8, bold: true });
  txt(data.invoice_footer_note || 'Thank you for choosing our service.', L + 3, ty + 10, { size: 7.5, color: GRAY });
  txt('Terms & Conditions:', splitX + 4, ty + 5, { size: 8, bold: true });
  txt('This is a system-generated invoice.', splitX + 4, ty + 10, { size: 7, color: GRAY });

  return doc.output('arraybuffer');
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const showroomId  = cookieStore.get('showroom_id')?.value;

    if (!showroomId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch service invoice with all relations
    const { data: inv, error: invErr } = await supabase
      .from('service_invoices')
      .select(`
        *,
        customer:customers(id, first_name, last_name, mobile),
        vehicle:customer_vehicles(
          id, chassis_number, registration_number, current_odometer_km,
          vehicle_model:vehicles(model_name, variant_name, brand:brands(brand_name))
        ),
        showroom:showrooms(showroom_name, gst_number, pan_number)
      `)
      .eq('id', id)
      .eq('showroom_id', showroomId)
      .single();

    if (invErr || !inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    // Fetch branding & billing config for logo / bank / signature
    const [{ data: brandingData }, { data: billingData }, { data: addressData }] = await Promise.all([
      supabase.from('showroom_branding').select('*').eq('showroom_id', showroomId).single(),
      supabase.from('billing_configurations').select('*').eq('showroom_id', showroomId).single(),
      supabase.from('showroom_addresses').select('*').eq('showroom_id', showroomId).eq('is_primary', true).single(),
    ]);

    const showroomAddress = addressData
      ? [addressData.address_line_1, addressData.address_line_2, addressData.city, addressData.state, addressData.pincode]
          .filter(Boolean).join(', ')
      : 'N/A';

    const custName    = [inv.customer?.first_name, inv.customer?.last_name].filter(Boolean).join(' ') || 'N/A';
    const brandName   = (inv.vehicle?.vehicle_model as any)?.brand?.brand_name || '';
    const modelName   = (inv.vehicle?.vehicle_model as any)?.model_name || '';
    const variantName = (inv.vehicle?.vehicle_model as any)?.variant_name || '';
    const vehicleName = [brandName, modelName, variantName].filter(Boolean).join(' ');

    const pdfData = {
      invoice_number      : inv.invoice_number,
      invoice_date        : inv.invoice_date,
      service_type        : inv.service_type,
      payment_status      : inv.payment_status,
      payment_method      : inv.payment_method,
      labor_cost          : inv.labor_cost,
      parts_cost          : inv.parts_cost,
      tax_amount          : inv.tax_amount,
      discount_amount     : inv.discount_amount,
      parts_detail        : inv.parts_detail,
      notes               : inv.notes,
      // Customer
      customer_name       : custName,
      customer_mobile     : inv.customer?.mobile || 'N/A',
      // Vehicle
      vehicle_name        : vehicleName || 'N/A',
      registration_number : inv.vehicle?.registration_number || null,
      chassis_number      : inv.vehicle?.chassis_number || null,
      odometer_reading    : inv.vehicle?.current_odometer_km || null,
      // Showroom
      showroom_name       : inv.showroom?.showroom_name || 'EV Showroom',
      gst_number          : inv.showroom?.gst_number || 'N/A',
      pan_number          : inv.showroom?.pan_number || 'N/A',
      showroom_address    : showroomAddress,
      showroom_phone      : brandingData?.official_mobile_number || brandingData?.whatsapp_number || 'N/A',
      logo_url            : brandingData?.logo_url || null,
      // Bank / payment
      bank_name           : billingData?.bank_name || null,
      account_number      : billingData?.account_number || null,
      ifsc_code           : billingData?.ifsc_code || null,
      upi_id              : billingData?.upi_id || null,
      authorized_signature_url : billingData?.authorized_signature_url || null,
      invoice_footer_note : billingData?.invoice_footer_note || null,
    };

    const pdfBuffer = await generateServiceInvoicePDF(pdfData);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type'        : 'application/pdf',
        'Content-Disposition' : `inline; filename="${inv.invoice_number.replace(/\//g, '_')}.pdf"`,
        'Cache-Control'       : 'no-store',
      },
    });
  } catch (err) {
    console.error('Service invoice PDF error:', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
