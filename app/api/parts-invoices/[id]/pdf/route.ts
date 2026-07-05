import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Helpers (identical to billing/invoices/route.ts) ──────────────────────────

function round2(n: number): number {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function num2(n: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
}

const inrFmt = (n: number) =>
  `${Number(n) < 0 ? '-' : ''}Rs. ${num2(Math.abs(Number(n)))}`;

const GST_STATE_CODES: Record<string, string> = {
  'jammu and kashmir':'01','himachal pradesh':'02','punjab':'03','chandigarh':'04',
  'uttarakhand':'05','haryana':'06','delhi':'07','rajasthan':'08','uttar pradesh':'09',
  'bihar':'10','sikkim':'11','arunachal pradesh':'12','nagaland':'13','manipur':'14',
  'mizoram':'15','tripura':'16','meghalaya':'17','assam':'18','west bengal':'19',
  'jharkhand':'20','odisha':'21','chhattisgarh':'22','madhya pradesh':'23','gujarat':'24',
  'daman and diu':'25','dadra and nagar haveli':'26','maharashtra':'27','karnataka':'29',
  'goa':'30','lakshadweep':'31','kerala':'32','tamil nadu':'33','puducherry':'34',
  'andaman and nicobar islands':'35','telangana':'36','andhra pradesh':'37','ladakh':'38',
};

function formatPlaceOfSupply(state: string | null | undefined): string {
  if (!state) return 'N/A';
  const code = GST_STATE_CODES[state.trim().toLowerCase()];
  return code ? `${code}-${state.toUpperCase()}` : state.toUpperCase();
}

function numberToWordsIndian(amount: number): string {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const twoDigits = (n: number): string => n < 20 ? ones[n] : `${tens[Math.floor(n/10)]}${n%10?' '+ones[n%10]:''}`;
  const threeDigits = (n: number): string => {
    const h = Math.floor(n/100); const rest = n%100;
    return `${h?ones[h]+' Hundred'+(rest?' ':''):''}${rest?twoDigits(rest):''}`;
  };
  const toWords = (num: number): string => {
    if (num===0) return 'Zero';
    const crore=Math.floor(num/10000000); num%=10000000;
    const lakh=Math.floor(num/100000); num%=100000;
    const thousand=Math.floor(num/1000); num%=1000;
    const hundred=num; let str='';
    if(crore) str+=`${twoDigits(crore)} Crore `;
    if(lakh)  str+=`${twoDigits(lakh)} Lakh `;
    if(thousand) str+=`${twoDigits(thousand)} Thousand `;
    if(hundred)  str+=threeDigits(hundred);
    return str.trim();
  };
  const rupees=Math.floor(amount); const paise=Math.round((amount-rupees)*100);
  let words=`INR ${toWords(rupees)}`;
  if(paise>0) words+=` and ${twoDigits(paise)} Paise`;
  return `${words} Only`;
}

const DEFAULT_INVOICE_TERMS = [
  'Goods once sold cannot be taken back or exchanged.',
  'All parts carry manufacturer warranty only.',
  'Interest @24% p.a. charged on overdue bills beyond 15 days.',
  'Subject to local jurisdiction.',
];

function resolveInvoiceTerms(raw?: string | null): string[] {
  const lines = (raw || '').split('\n').map(l=>l.replace(/^\s*\d+[.)]\s*/,'').trim()).filter(l=>l.length>0);
  const source = lines.length>0 ? lines : DEFAULT_INVOICE_TERMS;
  return source.map((t,i)=>`${i+1}. ${t}`);
}

async function fetchImageAsDataUrl(
  url: string | null | undefined
): Promise<{dataUrl:string; format:'PNG'|'JPEG'}|null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache:'no-store' });
    if (!res.ok) return null;
    const ct  = (res.headers.get('content-type')||'image/png').toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength===0) return null;
    const format:'PNG'|'JPEG' = ct.includes('jpeg')||ct.includes('jpg') ? 'JPEG' : 'PNG';
    return { dataUrl:`data:${format==='JPEG'?'image/jpeg':'image/png'};base64,${buf.toString('base64')}`, format };
  } catch { return null; }
}

// ── PDF generator — same layout as generateInvoicePDF in billing/invoices ─────

async function generatePartsInvoicePDF(invoice: any): Promise<ArrayBuffer> {
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

  const L      = 8;
  const R      = 202;
  const TOP    = 8;
  const BOTTOM = 289;
  const NAVY:  [number,number,number] = [26,35,126];
  const BLACK: [number,number,number] = [0,0,0];
  const GRAY:  [number,number,number] = [90,90,90];
  const LIGHT: [number,number,number] = [235,235,240];
  const GREEN: [number,number,number] = [21,128,61];

  doc.setLineWidth(0.2);
  doc.setDrawColor(0,0,0);

  const box   = (x:number,yy:number,w:number,h:number) => doc.rect(x,yy,w,h);
  const vline = (x:number,y1:number,y2:number)          => doc.line(x,y1,x,y2);
  const hline = (x1:number,x2:number,yy:number)         => doc.line(x1,yy,x2,yy);
  const txt = (
    t:string, x:number, yy:number,
    opts:{size?:number;bold?:boolean;italic?:boolean;color?:[number,number,number];align?:'left'|'center'|'right'}={},
  ) => {
    const {size=8,bold=false,italic=false,color=BLACK,align='left'}=opts;
    doc.setFontSize(size);
    doc.setTextColor(color[0],color[1],color[2]);
    doc.setFont('helvetica', bold?(italic?'bolditalic':'bold'):(italic?'italic':'normal'));
    doc.text(t,x,yy,{align});
  };

  // ── totals ────────────────────────────────────────────────────────────────
  const subtotal   = round2(Number(invoice.subtotal    || 0));
  const taxAmount  = round2(Number(invoice.tax_amount  || 0));
  const discAmount = round2(Number(invoice.discount_amount || 0));
  const grandTotal = round2(subtotal + taxAmount - discAmount);

  // Per-item GST breakdown — derive CGST/SGST from tax_amount (split 50/50 for intra-state)
  const cgstTotal = round2(taxAmount / 2);
  const sgstTotal = round2(taxAmount - cgstTotal);

  const invoiceDate = invoice.sale_date
    ? new Date(invoice.sale_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})
    : '-';

  type Line = {desc:string;hsn:string;qty:number;rate:number;amount:number;per:string};
  const lines: Line[] = (invoice.items||[]).map((it:any)=>({
    desc      : it.part_name || 'Part',
    hsn       : it.hsn_code  || '-',
    qty       : Number(it.quantity),
    rate      : Number(it.unit_price),
    amount    : Number(it.unit_price)*Number(it.quantity),
    per       : 'Nos',
  }));
  const qtyTotal = lines.reduce((s,l)=>s+l.qty, 0);

  // HSN grouping
  const groupMap = new Map<string,number>();
  for (const l of lines) groupMap.set(l.hsn,(groupMap.get(l.hsn)||0)+l.amount);
  const groups = Array.from(groupMap.entries()).map(([hsn,gross])=>({
    hsn, taxableValue: round2(subtotal>0 ? gross*(subtotal/lines.reduce((s,l)=>s+l.amount,0)||1) : gross),
  }));
  if (groups.length) {
    const diff = round2(subtotal - groups.reduce((s,g)=>s+g.taxableValue,0));
    groups[groups.length-1].taxableValue = round2(groups[groups.length-1].taxableValue+diff);
  }
  const cgstPct = lines.length>0 ? round2((it=>it?.gst_pct||0)(invoice.items?.[0]) / 2) : 9;
  const sgstPct = cgstPct;
  const hsnRows = groups.map(g=>({
    hsn: g.hsn, taxableValue: g.taxableValue,
    cRate: cgstPct, cAmt: round2(g.taxableValue*cgstPct/100),
    sRate: sgstPct, sAmt: round2(g.taxableValue*sgstPct/100),
  }));
  if (hsnRows.length) {
    const cDiff = round2(cgstTotal - hsnRows.reduce((s,r)=>s+r.cAmt,0));
    const sDiff = round2(sgstTotal - hsnRows.reduce((s,r)=>s+r.sAmt,0));
    hsnRows[hsnRows.length-1].cAmt = round2(hsnRows[hsnRows.length-1].cAmt+cDiff);
    hsnRows[hsnRows.length-1].sAmt = round2(hsnRows[hsnRows.length-1].sAmt+sDiff);
  }

  const placeOfSupply = formatPlaceOfSupply(invoice.showroom_state);
  const addrOrDash = (v:string|null|undefined) => (v&&v.trim() ? v : 'N/A');

  let y = TOP;

  // ============ TITLE BAR ============
  box(L,y,R-L,8);
  txt('SPARE PARTS INVOICE',(L+R)/2,y+5.5,{size:12,bold:true,align:'center'});
  txt('ORIGINAL FOR RECIPIENT',R-2,y+5,{size:7,color:GRAY,align:'right'});
  y+=8;

  // ============ COMPANY + META ============
  const compH  = 32;
  const splitX = 120;
  const metaMidX = 161;
  box(L,y,R-L,compH);
  vline(splitX,y,y+compH);

  const logoSize=15; const logoX=L+3; const logoY=y+3;
  const logoImg = await fetchImageAsDataUrl(invoice.logo_url);
  const drawMonogram = () => {
    doc.setFillColor(NAVY[0],NAVY[1],NAVY[2]);
    doc.rect(logoX,logoY,logoSize,logoSize,'F');
    const initials=(invoice.showroom_name||'EV').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase();
    txt(initials,logoX+logoSize/2,logoY+logoSize/2+2,{size:11,bold:true,color:[255,255,255],align:'center'});
  };
  if (logoImg) {
    try {
      const props=doc.getImageProperties(logoImg.dataUrl);
      const ratio=props.width/props.height;
      let w=logoSize; let h=logoSize;
      if(ratio>1) h=logoSize/ratio; else w=logoSize*ratio;
      doc.addImage(logoImg.dataUrl,logoImg.format,logoX+(logoSize-w)/2,logoY+(logoSize-h)/2,w,h);
    } catch { drawMonogram(); }
  } else { drawMonogram(); }

  const compTextX=L+3+logoSize+3;
  txt(invoice.showroom_name||'EV Showroom',compTextX,y+6,{size:11,bold:true,color:NAVY});
  txt(`GSTIN ${invoice.gst_number||'N/A'}`,compTextX,y+11,{size:7.5});
  const compAddr=doc.splitTextToSize(addrOrDash(invoice.showroom_address),splitX-compTextX-3);
  let cy=y+15;
  compAddr.slice(0,2).forEach((ln:string)=>{txt(ln,compTextX,cy,{size:7,color:GRAY}); cy+=3.2;});
  txt(`Mobile ${invoice.showroom_phone||'N/A'}`,compTextX,cy,{size:7,color:GRAY});

  const metaRowH=compH/2;
  vline(metaMidX,y,y+compH);
  hline(splitX,R,y+metaRowH);
  const metaCell=(x:number,yy:number,label:string,value:string)=>{
    txt(label,x+2,yy+3.5,{size:6.5,color:GRAY});
    txt(value,x+2,yy+8.5,{size:8.5,bold:true});
  };
  metaCell(splitX,y,'Invoice #:',invoice.sale_number||'-');
  metaCell(metaMidX,y,'Invoice Date:',invoiceDate);
  metaCell(splitX,y+metaRowH,'Place of Supply:',placeOfSupply);
  metaCell(metaMidX,y+metaRowH,'Due Date:',invoiceDate);
  y+=compH;

  // ============ CUSTOMER ============
  const custH=30;
  box(L,y,R-L,custH);
  vline(splitX,y,y+custH);
  txt('Customer Details:',L+3,y+5,{size:8,bold:true});
  txt(invoice.customer_name||'Walk-in Customer',L+3,y+9.5,{size:8.5,bold:true});
  txt('Billing address:',L+3,y+14,{size:7.5,bold:true});
  const billLines=doc.splitTextToSize(addrOrDash(invoice.customer_address),splitX-L-6);
  let by=y+18;
  billLines.slice(0,3).forEach((ln:string)=>{txt(ln,L+3,by,{size:7,color:GRAY}); by+=3.2;});
  txt(`Ph: ${invoice.customer_mobile||'N/A'}`,L+3,Math.min(by,y+custH-2),{size:7,color:GRAY});
  txt('Shipping address:',splitX+4,y+5,{size:8,bold:true});
  const shipLines=doc.splitTextToSize(addrOrDash(invoice.customer_address),R-splitX-8);
  let sy=y+9.5;
  shipLines.slice(0,4).forEach((ln:string)=>{txt(ln,splitX+4,sy,{size:7,color:GRAY}); sy+=3.4;});
  y+=custH;

  // ============ ITEMS TABLE ============
  const itemBody=lines.map((l,i)=>[
    String(i+1), l.desc, l.hsn,
    `${round2(cgstPct+sgstPct)}%`,
    num2(l.qty), num2(l.rate), l.per, num2(l.amount),
  ]);
  autoTable(doc,{
    startY:y,
    margin:{left:L,right:210-R,top:TOP,bottom:12},
    head:[['#','Item','HSN/SAC','Tax','Qty','Rate/Item','Per','Amount']],
    body:itemBody,
    theme:'grid',
    styles:{fontSize:8,cellPadding:1.6,lineColor:[0,0,0],lineWidth:0.2,textColor:BLACK,valign:'top'},
    headStyles:{fillColor:[255,255,255],textColor:BLACK,fontStyle:'bold',fontSize:8,lineWidth:0.2,lineColor:[0,0,0]},
    columnStyles:{
      0:{cellWidth:8,halign:'center'},
      1:{cellWidth:62},
      2:{cellWidth:22,halign:'center'},
      3:{cellWidth:14,halign:'center',fontStyle:'bold'},
      4:{cellWidth:20,halign:'center'},
      5:{cellWidth:24,halign:'right'},
      6:{cellWidth:14,halign:'center',fontStyle:'italic'},
      7:{cellWidth:30,halign:'right'},
    },
  });
  let ty=(doc as any).lastAutoTable.finalY;

  const ensureSpace=(needed:number)=>{
    if(ty+needed>BOTTOM){ doc.addPage(); ty=TOP; }
  };

  // ============ SUBTOTAL LINES ============
  const amountColX=172;
  const subH=5;
  const subLine=(label:string,value:string,bold=false)=>{
    ensureSpace(subH);
    box(L,ty,R-L,subH);
    vline(amountColX,ty,ty+subH);
    txt(label,amountColX-2,ty+3.5,{size:8,bold,italic:!bold,align:'right'});
    txt(value,R-2,ty+3.5,{size:8,bold,align:'right'});
    ty+=subH;
  };
  ensureSpace(subH*4+8+8);
  subLine('Subtotal',inrFmt(subtotal),true);
  if(cgstTotal>0) subLine(`CGST ${num2(cgstPct)}%`,inrFmt(cgstTotal));
  if(sgstTotal>0) subLine(`SGST ${num2(sgstPct)}%`,inrFmt(sgstTotal));
  if(discAmount>0) subLine('Discount',`- ${inrFmt(discAmount)}`);

  // ============ TOTAL BAR ============
  const totalH=8;
  doc.setFillColor(LIGHT[0],LIGHT[1],LIGHT[2]);
  doc.rect(L,ty,R-L,totalH,'F');
  box(L,ty,R-L,totalH);
  vline(114,ty,ty+totalH);
  vline(amountColX,ty,ty+totalH);
  txt('Total',112,ty+5.5,{size:9.5,bold:true,align:'right'});
  txt(num2(qtyTotal),124,ty+5.5,{size:9,bold:true,align:'center'});
  txt(inrFmt(grandTotal),R-2,ty+5.5,{size:10,bold:true,align:'right'});
  ty+=totalH;

  // ============ AMOUNT IN WORDS ============
  const wordsH=8;
  box(L,ty,R-L,wordsH);
  txt('Amount Chargeable (in words):',L+3,ty+3.5,{size:7,bold:true});
  txt(numberToWordsIndian(grandTotal),L+3,ty+6.8,{size:7.5,bold:true});
  txt('E & O.E',R-2,ty+3.5,{size:7,italic:true,color:GRAY,align:'right'});
  ty+=wordsH+3;

  // ============ HSN/SAC BREAKDOWN TABLE ============
  ensureSpace(24);
  autoTable(doc,{
    startY:ty,
    margin:{left:L,right:210-R,top:TOP,bottom:12},
    head:[[
      {content:'HSN/SAC',rowSpan:2,styles:{valign:'middle'}},
      {content:'Taxable Value',rowSpan:2,styles:{valign:'middle',halign:'right'}},
      {content:'Central Tax',colSpan:2,styles:{halign:'center'}},
      {content:'State Tax',colSpan:2,styles:{halign:'center'}},
      {content:'Total Tax Amount',rowSpan:2,styles:{valign:'middle',halign:'right'}},
    ],[
      {content:'Rate',styles:{halign:'center'}},
      {content:'Amount',styles:{halign:'right'}},
      {content:'Rate',styles:{halign:'center'}},
      {content:'Amount',styles:{halign:'right'}},
    ]] as any,
    body:[
      ...hsnRows.map(r=>[
        r.hsn,num2(r.taxableValue),`${num2(r.cRate)}%`,num2(r.cAmt),`${num2(r.sRate)}%`,num2(r.sAmt),num2(round2(r.cAmt+r.sAmt)),
      ]),
      [
        {content:'TOTAL',styles:{fontStyle:'bold'}},
        {content:num2(subtotal),styles:{fontStyle:'bold',halign:'right'}},
        '',
        {content:num2(cgstTotal),styles:{fontStyle:'bold',halign:'right'}},
        '',
        {content:num2(sgstTotal),styles:{fontStyle:'bold',halign:'right'}},
        {content:num2(round2(cgstTotal+sgstTotal)),styles:{fontStyle:'bold',halign:'right'}},
      ],
    ] as any,
    theme:'grid',
    styles:{fontSize:7.5,cellPadding:1.4,lineColor:[0,0,0],lineWidth:0.2,textColor:BLACK},
    headStyles:{fillColor:[255,255,255],textColor:BLACK,fontStyle:'bold',fontSize:7.5,lineWidth:0.2,lineColor:[0,0,0]},
    columnStyles:{
      0:{cellWidth:34},
      1:{cellWidth:34,halign:'right'},
      2:{cellWidth:20,halign:'center'},
      3:{cellWidth:28,halign:'right'},
      4:{cellWidth:20,halign:'center'},
      5:{cellWidth:28,halign:'right'},
      6:{cellWidth:30,halign:'right'},
    },
  });
  ty=(doc as any).lastAutoTable.finalY;

  // ============ PAID BADGE ============
  const isPaid=String(invoice.payment_status||'').toLowerCase()==='paid';
  ensureSpace(5+(isPaid?9:0)+40);
  ty+=5;
  if (isPaid) {
    doc.setFillColor(GREEN[0],GREEN[1],GREEN[2]);
    doc.circle(R-42,ty-0.5,1.6,'F');
    txt('\u2713',R-42,ty+0.5,{size:7,bold:true,color:[255,255,255],align:'center'});
    txt('Amount Paid',R-38,ty+1,{size:9,bold:true,color:GREEN});
    txt(`${inrFmt(grandTotal)} paid via ${invoice.upi_id?'UPI':'Cash/Bank'} on ${invoiceDate}`,R-2,ty+6,{size:7.5,color:GRAY,align:'right'});
    ty+=9;
  }

  // ============ BANK / UPI / SIGNATURE ============
  const payH=40;
  const c1=L, c2=78, c3=145;
  box(L,ty,R-L,payH);
  vline(c2,ty,ty+payH);
  vline(c3,ty,ty+payH);

  txt('Bank Details:',c1+3,ty+5,{size:8,bold:true});
  const bankRows:[string,string][]=[
    ['Bank:',   invoice.bank_name      ||'N/A'],
    ['A/C No:', invoice.account_number ||'N/A'],
    ['IFSC:',   invoice.ifsc_code      ||'N/A'],
    ['UPI:',    invoice.upi_id         ||'N/A'],
  ];
  let byk=ty+11;
  bankRows.forEach(([k,v])=>{txt(k,c1+3,byk,{size:7,color:GRAY}); txt(v,c1+20,byk,{size:7,bold:true}); byk+=5;});

  txt('Pay using UPI',(c2+c3)/2,ty+5,{size:8,bold:true,align:'center'});
  if (invoice.upi_id) {
    try {
      const upiStr=`upi://pay?pa=${encodeURIComponent(invoice.upi_id)}&pn=${encodeURIComponent(invoice.showroom_name||'Merchant')}&am=${grandTotal}&cu=INR`;
      const qrDataUrl=await QRCode.toDataURL(upiStr,{margin:0,width:240});
      doc.addImage(qrDataUrl,'PNG',(c2+c3)/2-13,ty+8,26,26);
    } catch {
      txt('QR unavailable',(c2+c3)/2,ty+22,{size:7,color:GRAY,align:'center'});
    }
  } else {
    txt('No UPI configured',(c2+c3)/2,ty+22,{size:7,color:GRAY,align:'center'});
  }

  txt(`For ${invoice.showroom_name||'EV Showroom'}`,R-3,ty+5,{size:7.5,bold:true,align:'right'});
  const signImg=await fetchImageAsDataUrl(invoice.authorized_signature_url);
  const signPlaced=(()=>{
    if(!signImg) return false;
    try {
      const props=doc.getImageProperties(signImg.dataUrl);
      const ratio=props.width/props.height;
      const maxW=R-c3-8; const maxH=16;
      let w=maxW; let h=w/ratio;
      if(h>maxH){h=maxH; w=h*ratio;}
      doc.addImage(signImg.dataUrl,signImg.format,R-3-w,ty+8,w,h);
      return true;
    } catch { return false; }
  })();
  if (!signPlaced) {
    const stampCx=(c3+R)/2; const stampCy=ty+20;
    doc.setDrawColor(NAVY[0],NAVY[1],NAVY[2]);
    doc.setLineWidth(0.5);
    doc.circle(stampCx,stampCy,12);
    doc.setLineWidth(0.3);
    doc.circle(stampCx,stampCy,9.5);
    txt('SIGNATURE',stampCx,stampCy+1,{size:7,bold:true,color:NAVY,align:'center'});
    doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
  }
  txt('Authorised Signatory',R-3,ty+payH-3,{size:7,color:GRAY,align:'right'});
  ty+=payH;

  // ============ NOTES / TERMS ============
  const terms=resolveInvoiceTerms(invoice.invoice_terms_conditions);
  const wrappedTerms:string[]=[];
  terms.forEach(t=>{ doc.splitTextToSize(t,R-splitX-8).forEach((ln:string)=>wrappedTerms.push(ln)); });

  const lineH=3.2; const padBottom=4;
  if(ty+30>BOTTOM){ doc.addPage(); ty=TOP; }

  let termIdx=0; let firstSegment=true;
  while(true){
    const segTop=ty;
    const topOffset=firstSegment?10:9;
    const maxLines=Math.max(0,Math.floor((BOTTOM-segTop-topOffset-padBottom)/lineH));
    const linesThisPage=Math.min(maxLines,wrappedTerms.length-termIdx);
    const segH=Math.max(firstSegment?30:12,topOffset+linesThisPage*lineH+padBottom);

    box(L,segTop,R-L,segH);
    vline(splitX,segTop,segTop+segH);

    if(firstSegment){
      txt('Notes:',L+3,segTop+5,{size:8,bold:true});
      txt(invoice.invoice_footer_note||'Thank you for your business.',L+3,segTop+10,{size:7.5,color:GRAY});
      txt('Terms and Conditions:',splitX+4,segTop+5,{size:8,bold:true});
    } else {
      txt('Terms and Conditions (contd.):',splitX+4,segTop+5,{size:8,bold:true});
    }

    let lineY=segTop+topOffset;
    for(let k=0;k<linesThisPage;k++){
      txt(wrappedTerms[termIdx],splitX+4,lineY,{size:6.8,color:GRAY});
      termIdx++; lineY+=lineH;
    }

    ty=segTop+segH; firstSegment=false;
    if(termIdx>=wrappedTerms.length) break;
    doc.addPage(); ty=TOP;
  }

  return doc.output('arraybuffer');
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const showroomId  = cookieStore.get('showroom_id')?.value;
    if (!showroomId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch sale (no customer FK join — not in schema cache)
    const { data: sale, error: saleErr } = await supabase
      .from('parts_counter_sales')
      .select('*')
      .eq('id', id)
      .eq('showroom_id', showroomId)
      .single();

    if (saleErr || !sale) {
      console.error('[parts-pdf] sale fetch:', saleErr?.message, 'id:', id, 'showroom:', showroomId);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. Line items
    const { data: rawItems } = await supabase
      .from('parts_counter_sale_items')
      .select('id, quantity, unit_price, total_price, part_id')
      .eq('counter_sale_id', id);

    // 3. Part details
    const partIds = (rawItems||[]).map((it:any)=>it.part_id).filter(Boolean);
    const { data: partsData } = partIds.length
      ? await supabase.from('parts').select('id,part_name,part_code,hsn_code,gst_percentage').in('id',partIds)
      : { data: [] };

    const partsMap:Record<string,any>={};
    (partsData||[]).forEach((p:any)=>{ partsMap[p.id]=p; });

    const flatItems=(rawItems||[]).map((it:any)=>{
      const p=partsMap[it.part_id]||{};
      return {
        part_name  : p.part_name   ||'Part',
        part_code  : p.part_code   ||'-',
        hsn_code   : p.hsn_code    ||'-',
        gst_pct    : p.gst_percentage||0,
        quantity   : it.quantity,
        unit_price : it.unit_price,
        total_price: it.total_price,
      };
    });

    // 4. Showroom / branding / billing in parallel
    const [
      {data:showroomData},
      {data:brandingData},
      {data:billingData},
      {data:addressData},
    ] = await Promise.all([
      supabase.from('showrooms').select('showroom_name,gst_number,pan_number,state').eq('id',showroomId).single(),
      supabase.from('showroom_branding').select('*').eq('showroom_id',showroomId).maybeSingle(),
      supabase.from('billing_configurations').select('*').eq('showroom_id',showroomId).maybeSingle(),
      supabase.from('showroom_addresses').select('*').eq('showroom_id',showroomId).eq('is_primary',true).maybeSingle(),
    ]);

    const showroomAddress = addressData
      ? [addressData.address_line_1,addressData.address_line_2,addressData.city,addressData.state,addressData.pincode].filter(Boolean).join(', ')
      : 'N/A';

    const pdfData = {
      sale_number              : sale.sale_number,
      sale_date                : sale.sale_date,
      payment_method           : sale.payment_method,
      payment_status           : sale.payment_status,
      subtotal                 : sale.subtotal,
      tax_amount               : sale.tax_amount,
      discount_amount          : sale.discount_amount,
      notes                    : sale.notes,
      items                    : flatItems,
      customer_name            : sale.customer_name  ||'Walk-in Customer',
      customer_mobile          : sale.customer_mobile||'N/A',
      customer_address         : sale.customer_address||null,
      showroom_name            : showroomData?.showroom_name||'EV Showroom',
      gst_number               : showroomData?.gst_number   ||'N/A',
      showroom_state           : showroomData?.state         ||null,
      showroom_address         : showroomAddress,
      showroom_phone           : brandingData?.official_mobile_number||brandingData?.whatsapp_number||'N/A',
      logo_url                 : brandingData?.logo_url||null,
      bank_name                : billingData?.bank_name      ||null,
      account_number           : billingData?.account_number ||null,
      ifsc_code                : billingData?.ifsc_code      ||null,
      upi_id                   : billingData?.upi_id         ||null,
      authorized_signature_url : billingData?.authorized_signature_url||null,
      invoice_footer_note      : billingData?.invoice_footer_note     ||null,
      invoice_terms_conditions : billingData?.invoice_terms_conditions||null,
    };

    // 5. Generate PDF
    const pdfBuffer = await generatePartsInvoicePDF(pdfData);
    const fileName  = `${sale.sale_number.replace(/[/\\]/g,'_')}.pdf`;

    // 6. Store in Supabase Storage (non-fatal)
    try {
      await supabase.storage
        .from('invoice-pdfs')
        .upload(`parts/${showroomId}/${fileName}`, pdfBuffer, {
          contentType: 'application/pdf',
          upsert      : true,
        });
    } catch (storageErr) {
      console.error('[parts-pdf] storage:', storageErr);
    }

    // 7. Return
    return new NextResponse(pdfBuffer, {
      status : 200,
      headers: {
        'Content-Type'       : 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control'      : 'no-store',
      },
    });
  } catch (err) {
    console.error('[parts-pdf] unhandled:', err);
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
