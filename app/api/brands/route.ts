// app/api/brands/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createApiClient } from '@/lib/supabase/api-client';

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiClient();
    
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('brand_name', { ascending: true });
    
    if (error) {
      console.error('Error fetching brands:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch brands' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error in brands API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
// app/api/brands/route.ts (add to existing file)
export async function POST(request: NextRequest) {
  try {
    const supabase = createApiClient();
    const body = await request.json();
    
    if (!body.brand_name || !body.brand_name.trim()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Brand name is required' 
      }, { status: 400 });
    }
    
    // Check for duplicate brand name
    const { data: existing, error: checkError } = await supabase
      .from('brands')
      .select('id')
      .ilike('brand_name', body.brand_name.trim())
      .maybeSingle();
    
    if (existing) {
      return NextResponse.json({ 
        success: false, 
        error: 'A brand with this name already exists' 
      }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('brands')
      .insert({ brand_name: body.brand_name.trim() })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating brand:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create brand' 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      message: 'Brand created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error in brand create API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}