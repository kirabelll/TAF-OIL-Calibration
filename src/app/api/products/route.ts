import { NextResponse } from 'next/server';
import { getAllProducts } from '@/lib/db';

export async function GET() {
  try {
    const products = getAllProducts();
    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
