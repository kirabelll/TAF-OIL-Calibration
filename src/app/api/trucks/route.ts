import { NextResponse } from 'next/server';
import { getAllTrucks, getDb } from '@/lib/db';

export async function GET() {
  try {
    const trucks = getAllTrucks();
    return NextResponse.json({ success: true, trucks });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const plateNo = String(body.plate_no || '').trim();

    if (!plateNo) {
      return NextResponse.json({ success: false, message: 'plate_no is required' }, { status: 400 });
    }

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO truck_headers (
        plate_no, truck_no, trailer_plate_no, carrier_name, driver_name, driver_licence_no, compartment_count, total_capacity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(plate_no) DO UPDATE SET
        truck_no = excluded.truck_no,
        trailer_plate_no = excluded.trailer_plate_no,
        carrier_name = excluded.carrier_name,
        driver_name = excluded.driver_name,
        driver_licence_no = excluded.driver_licence_no,
        compartment_count = excluded.compartment_count,
        total_capacity = excluded.total_capacity,
        updated_at = datetime('now')
    `);

    stmt.run(
      plateNo,
      body.truck_no || null,
      body.trailer_plate_no || null,
      body.carrier_name || 'TAF Oil Fleet',
      body.driver_name || null,
      body.driver_licence_no || null,
      Number(body.compartment_count || 5),
      Number(body.total_capacity || 45000)
    );

    return NextResponse.json({ success: true, message: 'Truck saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
