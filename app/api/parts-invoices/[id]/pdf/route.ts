import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Shared helpers ────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

const num2 = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const inr = (n: number) =>
  `${Number(n) < 0 ? '-' : ''}Rs. ${num2(Math.abs(Number(n)))}`;

async function fetchImageAsDataUrl(
  url: string | null | undefined,
): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || 'image/png').toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) return null;
    const format: 'PNG' | 'JPEG' = ct.includes('jpeg') || ct.includes('jpg') ? 'JPEG' : 'PNG';
    return { dataUrl: `data:${format === 'JPEG' ? 'image/jpeg' : 'image/png'};base64,${buf.toString('base64')}`, format };
  } catch { return null; }
}

// ── PDF generator (mirrors service-invoices template) ────────────────────────

async function generatePartsInvoicePDF(data: any): Promise<ArrayBuffer> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const L      = 8;
  const R      = 202;
  const TOP    = 8;
  const NAVY: [number, number, number]  = [26, 35, 126];
  const BLACK: [number, number, number] = [0, 0, 0];
  const GRAY: [number, number, number]  = [90, 90, 90];
  const LIGHT: [number, number, number] = [235, 235, 240];
  const GREEN: [number, number, number] = [21, 128, 61];

  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  const box   = (x: number, yy: number, w: number, h: number) => doc.rect(x, yy, w, h);
  const vline = (x: number, y1: number, y2: number)           => doc.line(x, y1, x, y2);
  const hline = (x1: number, x2: number, yy: number)          => doc.line(x1, yy, x2, yy);
  const txt = (
    t: string, x: number, yy: number,
    opts: { size?: number; bold?: boolean; italic?: boolean; color?: [number, number, number]; align?: 'left' | 'center' | 'right' } = {},
  ) => {
    const { size = 8, bold = false, italic = false, color = BLACK, align = 'left' } = opts;
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', bold ? (italic ? 'bolditalic' : 'bold') : (italic ? 'italic' : 'normal'));
    doc.text(t, x, yy, { align });
  };

  // Totals
  const subtotal    = round2(Number(data.subtotal || 0));
  const taxAmount   = round2(Number(data.tax_amount || 0));
  const discAmount  = round2(Number(data.discount_amount || 0));
  const grandTotal  = round2(subtotal + taxAmount - discAmount);

  const saleDate = data.sale_date
    ? new Date(data.sale_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

  let y = 8;

  // ============ TITLE BAR ============
  const titleH = 8;
  box(L, y, R - L, titleH);
  txt('SPARE PARTS INVOICE', (L + R) / 2, y + 5.5, { size: 12, bold: true, align: 'center' });
  txt('ORIGINAL FOR RECIPIENT', R - 2, y + 5, { size: 7, color: GRAY, align: 'right' });
  y += titleH;

  // ============ COMPANY + META ============
  const compH   = 32;
  const splitX  = 120;
  const metaMidX = 161;
  box(L, y, R - L, compH);
  vline(splitX, y, y + compH);

  // Logo
  const logoSize = 15;
  const logoX    = L + 3;
  const logoY    = y + 3;
  const logoImg  = await fetchImageAsDataUrl(data.logo_url);
  if (logoImg) {
    try {
      const props = doc.getImageProperties(logoImg.dataUrl);
      const ratio = props.width / props.height;
      let w = logoSize; let h = logoSize;
      if (ratio > 1) h = logoSize / ratio; else w = logoSize * ratio;
      doc.addImage(logoImg.dataUrl, logoImg.format, logoX + (logoSize - w) / 2, logoY + (logoSize - h) / 2, w, h);
    } catch { drawMonogram(); }
  } else { drawMonogram(); }

  function drawMonogram() {
    doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.rect(logoX, logoY, logoSize, logoSize, 'F');
    const initials = (data.showroom_name || 'EV').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
    txt(initials, logoX + logoSize / 2, logoY + logoSize / 2 + 2, { size: 11, bold: true, color: [255, 255, 255], align: 'center' });
  }

  const compTextX = L + 3 + logoSize + 3;
  txt(data.showroom_name || 'EV Showroom', compTextX, y + 6,  { size: 11, bold: true, color: NAVY });
  txt(`GSTIN ${data.gst_number || 'N/A'}`,  compTextX, y + 11, { size: 7.5 });
  const compAddr = doc.splitTextToSize(data.showroom_address || 'N/A', splitX - compTextX - 3);
  let cy = y + 15;
  compAddr.slice(0, 2).forEach((ln: string) => { txt(ln, compTextX, cy, { size: 7, color: GRAY }); cy += 3.2; });
  txt(`Mobile ${data.showroom_phone || 'N/A'}`, compTextX, cy, { size: 7, color: GRAY });

  // Meta grid
  const metaRowH = compH / 2;
  vline(metaMidX, y, y + compH);
  hline(splitX, R, y + metaRowH);
  const metaCell = (x: number, yy: number, label: string, value: string) => {
    txt(label, x + 2, yy + 3.5,  { size: 6.5, color: GRAY });
    txt(value,  x + 2, yy + 8.5, { size: 8.5, bold: true });
  };
  metaCell(splitX,    y,            'Invoice #:',      data.sale_number || '-');
  metaCell(metaMidX,  y,            'Invoice Date:',   saleDate);
  metaCell(splitX,    y + metaRowH, 'Payment Method:', data.payment_method || 'Cash');
  metaCell(metaMidX,  y + metaRowH, 'Payment Status:', data.payment_status || '-');
  y += compH;

  // ============ CUSTOMER ============
  const custH = 20;
  box(L, y, R - L, custH);
  txt('Customer Details:', L + 3, y + 5, { size: 8, bold: true });
  txt(data.customer_name   || 'Walk-in Customer', L + 3, y + 10,  { size: 8.5, bold: true });
  txt(`Ph: ${data.customer_mobile || 'N/A'}`,       L + 3, y + 15, { size: 7, color: GRAY });
  if (data.customer_gst) {
    txt(`GSTIN: ${data.customer_gst}`, splitX + 4, y + 10, { size: 7.5, bold: true });
  }
  y += custH;

  // ============ ITEMS TABLE ============
  const items: any[] = data.items || [];
  const itemBody = items.map((it: any, i: number) => [
    String(i + 1),
    it.part_name || 'Part',
    it.hsn_code  || '-',
    String(it.quantity),
    num2(it.unit_price),
    'Nos',
    num2(Number(it.unit_price) * Number(it.quantity)),
  ]);

  autoTable(doc, {
    startY  : y,
    margin  : { left: L, right: 210 - R, top: TOP, bottom: 12 },
    head    : [['#', 'Description', 'HSN/SAC', 'Qty', 'Rate', 'Per', 'Amount']],
    body    : itemBody,
    headStyles: {
      fillColor  : [NAVY[0], NAVY[1], NAVY[2]],
      textColor  : [255, 255, 255],
      fontStyle  : 'bold',
      fontSize   : 8,
      halign     : 'left',
      cellPadding: { top: 3, bottom: 3, left: 2, right: 2 },
    },
    columnStyles: {
      0: { cellWidth: 8,  halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 22, halign: 'right' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 25, halign: 'right' },
    },
    bodyStyles : { fontSize: 8, cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 } },
    alternateRowStyles: { fillColor: [LIGHT[0], LIGHT[1], LIGHT[2]] },
    tableLineColor: [0, 0, 0],
    tableLineWidth: 0.2,
  });

  y = (doc as any).lastAutoTable.finalY;

  // ============ SUB-TOTAL BLOCK ============
  const subH   = 6;
  const subLines: [string, number][] = [
    ['Subtotal',  subtotal],
    ...(taxAmount  > 0 ? [['GST / Tax', taxAmount] as [string, number]]  : []),
    ...(discAmount > 0 ? [['Discount',  -discAmount] as [string, number]] : []),
  ];
  const subW  = 80;
  const subX  = R - subW;
  subLines.forEach(([label, amt]) => {
    box(subX, y, subW, subH);
    vline(subX + 48, y, y + subH);
    txt(label,   subX + 2,       y + 4.3, { size: 7.5, color: GRAY });
    txt(inr(amt), R - 2,         y + 4.3, { size: 7.5, align: 'right' });
    y += subH;
  });

  // Grand total row
  const gtH = 8;
  box(subX, y, subW, gtH);
  vline(subX + 48, y, y + gtH);
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(subX, y, subW, gtH, 'F');
  txt('Grand Total',  subX + 2, y + 5.5, { size: 8.5, bold: true, color: [255, 255, 255] });
  txt(inr(grandTotal), R - 2,   y + 5.5, { size: 8.5, bold: true, color: [255, 255, 255], align: 'right' });
  y += gtH;

  // E&OE
  txt('E & O E', R - 2, y + 4, { size: 6.5, italic: true, color: GRAY, align: 'right' });
  y += 8;

  // ============ BANK / UPI QR / SIGNATURE ============
  const payH = 40;
  const c1   = L;
  const c2   = 78;
  const c3   = 145;
  box(L, y, R - L, payH);
  vline(c2, y, y + payH);
  vline(c3, y, y + payH);

  // Col 1 — bank
  txt('Bank Details:', c1 + 3, y + 5, { size: 8, bold: true });
  const bankRows: [string, string][] = [
    ['Bank:',   data.bank_name      || 'N/A'],
    ['A/C No:', data.account_number || 'N/A'],
    ['IFSC:',   data.ifsc_code      || 'N/A'],
    ['UPI:',    data.upi_id         || 'N/A'],
  ];
  let byk = y + 11;
  bankRows.forEach(([k, v]) => {
    txt(k, c1 + 3,  byk, { size: 7, color: GRAY });
    txt(v, c1 + 20, byk, { size: 7, bold: true });
    byk += 5;
  });

  // Col 2 — UPI QR
  txt('Pay using UPI', (c2 + c3) / 2, y + 5, { size: 8, bold: true, align: 'center' });
  if (data.upi_id) {
    try {
      const upiStr  = `upi://pay?pa=${encodeURIComponent(data.upi_id)}&pn=${encodeURIComponent(data.showroom_name || 'Merchant')}&am=${grandTotal}&cu=INR`;
      const qrDataUrl = await QRCode.toDataURL(upiStr, { margin: 0, width: 240 });
      const qrSize  = 26;
      doc.addImage(qrDataUrl, 'PNG', (c2 + c3) / 2 - qrSize / 2, y + 8, qrSize, qrSize);
    } catch {
      txt('QR unavailable', (c2 + c3) / 2, y + 22, { size: 7, color: GRAY, align: 'center' });
    }
  } else {
    txt('No UPI configured', (c2 + c3) / 2, y + 22, { size: 7, color: GRAY, align: 'center' });
  }

  // Col 3 — signature
  txt(`For ${data.showroom_name || 'EV Showroom'}`, R - 3, y + 5, { size: 7.5, bold: true, align: 'right' });
  const signImg   = await fetchImageAsDataUrl(data.authorized_signature_url);
  const signPlaced = (() => {
    if (!signImg) return false;
    try {
      const props = doc.getImageProperties(signImg.dataUrl);
      const ratio = props.width / props.height;
      const maxW  = R - c3 - 8;
      const maxH  = 16;
      let w = maxW; let h = w / ratio;
      if (h > maxH) { h = maxH; w = h * ratio; }
      doc.addImage(signImg.dataUrl, signImg.format, R - 3 - w, y + 8, w, h);
      return true;
    } catch { return false; }
  })();
  if (!signPlaced) {
    const cx = (c3 + R) / 2;
    const cy = y + 20;
    doc.setDrawColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.setLineWidth(0.5);
    doc.circle(cx, cy, 12);
    doc.setLineWidth(0.3);
    doc.circle(cx, cy, 9.5);
    txt('SIGNATURE', cx, cy + 1, { size: 7, bold: true, color: NAVY, align: 'center' });
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
  }
  txt('Authorised Signatory', R - 3, y + payH - 3, { size: 7, color: GRAY, align: 'right' });
  y += payH;

  // ============ NOTES / TERMS ============
  if (data.notes || data.invoice_footer_note) {
    const noteH = 14;
    box(L, y, R - L, noteH);
    if (data.notes) {
      txt('Notes:', L + 3, y + 4, { size: 7.5, bold: true });
      const notelines = doc.splitTextToSize(data.notes, R - L - 50);
      let ny = y + 8;
      notelines.slice(0, 2).forEach((ln: string) => { txt(ln, L + 3, ny, { size: 7, color: GRAY }); ny += 3.5; });
    }
    if (data.invoice_footer_note) {
      txt('Terms:', R / 2, y + 4, { size: 7.5, bold: true });
      const termlines = doc.splitTextToSize(data.invoice_footer_note, (R - L) / 2 - 6);
      let ty = y + 8;
      termlines.slice(0, 2).forEach((ln: string) => { txt(ln, R / 2, ty, { size: 7, color: GRAY }); ty += 3.5; });
    }
    y += noteH;
  }

  // ============ FOOTER ============
  const ph = doc.internal.pageSize.getHeight();
  doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]);
  doc.rect(L, ph - 10, R - L, 8, 'F');
  txt(
    'This is a computer-generated document and does not require a physical signature.',
    (L + R) / 2, ph - 5.5,
    { size: 6.5, color: GRAY, align: 'center' },
  );

  return doc.output('arraybuffer');
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const showroomId  = cookieStore.get('showroom_id')?.value;
    if (!showroomId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, serviceKey);

    // Step 1: fetch the sale + customer (no deep nesting to avoid FK ambiguity)
    const { data: sale, error: saleErr } = await supabase
      .from('parts_counter_sales')
      .select('*, customer:customers(id, first_name, last_name, mobile, gst_number)')
      .eq('id', id)
      .eq('showroom_id', showroomId)
      .single();

    if (saleErr || !sale) {
      console.error('[v0] parts PDF sale fetch:', saleErr?.message, 'id:', id, 'showroom:', showroomId);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Step 2: fetch line items separately, then fetch part details
    const { data: rawItems } = await supabase
      .from('parts_counter_sale_items')
      .select('id, quantity, unit_price, total_price, part_id')
      .eq('counter_sale_id', id);

    const partIds = (rawItems || []).map((it: any) => it.part_id).filter(Boolean);
    const { data: partsData } = partIds.length
      ? await supabase.from('parts').select('id, part_name, part_code, hsn_code, gst_percentage').in('id', partIds)
      : { data: [] };

    const partsMap: Record<string, any> = {};
    (partsData || []).forEach((p: any) => { partsMap[p.id] = p; });

    const saleItems = (rawItems || []).map((it: any) => ({
      ...it,
      part: partsMap[it.part_id] || null,
    }));
    (sale as any).items = saleItems;

    const [{ data: brandingData }, { data: billingData }, { data: addressData }, { data: showroomData }] =
      await Promise.all([
        supabase.from('showroom_branding').select('*').eq('showroom_id', showroomId).single(),
        supabase.from('billing_configurations').select('*').eq('showroom_id', showroomId).single(),
        supabase.from('showroom_addresses').select('*').eq('showroom_id', showroomId).eq('is_primary', true).single(),
        supabase.from('showrooms').select('showroom_name, gst_number, pan_number').eq('id', showroomId).single(),
      ]);

    const showroomAddress = addressData
      ? [addressData.address_line_1, addressData.address_line_2, addressData.city, addressData.state, addressData.pincode]
          .filter(Boolean).join(', ')
      : 'N/A';

    // Flatten items for the template
    const flatItems = (sale.items || []).map((it: any) => ({
      part_name  : it.part?.part_name || 'Part',
      hsn_code   : it.part?.hsn_code  || '-',
      quantity   : it.quantity,
      unit_price : it.unit_price,
      total_price: it.total_price,
    }));

    const pdfData = {
      sale_number            : sale.sale_number,
      sale_date              : sale.sale_date,
      payment_method         : sale.payment_method,
      payment_status         : sale.payment_status,
      subtotal               : sale.subtotal,
      tax_amount             : sale.tax_amount,
      discount_amount        : sale.discount_amount,
      notes                  : sale.notes,
      items                  : flatItems,
      customer_name          : sale.customer_name || [sale.customer?.first_name, sale.customer?.last_name].filter(Boolean).join(' ') || 'Walk-in Customer',
      customer_mobile        : sale.customer_mobile || sale.customer?.mobile || null,
      customer_gst           : sale.customer?.gst_number || null,
      showroom_name          : showroomData?.showroom_name || 'EV Showroom',
      gst_number             : showroomData?.gst_number    || 'N/A',
      pan_number             : showroomData?.pan_number    || 'N/A',
      showroom_address       : showroomAddress,
      showroom_phone         : brandingData?.official_mobile_number || brandingData?.whatsapp_number || 'N/A',
      logo_url               : brandingData?.logo_url || null,
      bank_name              : billingData?.bank_name      || null,
      account_number         : billingData?.account_number || null,
      ifsc_code              : billingData?.ifsc_code      || null,
      upi_id                 : billingData?.upi_id         || null,
      authorized_signature_url: billingData?.authorized_signature_url || null,
      invoice_footer_note    : billingData?.invoice_footer_note || null,
    };

    const pdfBuffer = await generatePartsInvoicePDF(pdfData);

    return new NextResponse(pdfBuffer, {
      status : 200,
      headers: {
        'Content-Type'        : 'application/pdf',
        'Content-Disposition' : `inline; filename="${sale.sale_number.replace(/\//g, '_')}.pdf"`,
        'Cache-Control'       : 'no-store',
      },
    });
  } catch (err) {
    console.error('Parts invoice PDF error:', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
