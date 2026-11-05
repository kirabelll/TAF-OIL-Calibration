import { NextResponse } from 'next/server';
import { getTransferOrderByIdOrNumber } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = getTransferOrderByIdOrNumber(id);

    if (!order) {
      return NextResponse.json({ success: false, message: 'Transfer Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
