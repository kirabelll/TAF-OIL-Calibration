import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { TruckDipCalculator, CalibrationPoint } from '@/lib/truck-dip-calc';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plateNo = String(body.plate_no || '').trim();
    const compNo = Number(body.compartment_no);
    const dipMm = Number(body.dip_mm);

    if (!plateNo || isNaN(compNo) || isNaN(dipMm)) {
      return NextResponse.json(
        { success: false, message: 'Invalid plate_no, compartment_no, or dip_mm' },
        { status: 400 }
      );
    }

    const db = getDb();
    const points = db
      .prepare('SELECT dip_mm, litres FROM truck_calibrations WHERE plate_no = ? AND compartment_no = ?')
      .all(plateNo, compNo) as unknown as CalibrationPoint[];

    const litres = TruckDipCalculator.interpolateLitres(dipMm, points);

    return NextResponse.json({
      success: true,
      litres,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Error calculating dip' },
      { status: 500 }
    );
  }
}
