// app/api/sales-executives/route.ts
// There is no dedicated sales executive role — one user per showroom.
// Return empty array so any existing callers receive a safe empty list.
import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  return NextResponse.json({ success: true, data: [] });
}
