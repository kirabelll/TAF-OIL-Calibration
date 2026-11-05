import { NextResponse } from 'next/server';
import { getTruckByPlate } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ plate: string }> }
) {
  try {
    const { plate } = await params;
    const decodedPlate = decodeURIComponent(plate);
    const truck = getTruckByPlate(decodedPlate);

    if (!truck) {
      return NextResponse.json({ success: false, message: 'Truck not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, truck });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
