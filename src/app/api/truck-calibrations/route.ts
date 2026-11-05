import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    let body: Record<string, any> = {};
    const contentType = request.headers.get('content-type') || '';
    const isForm = contentType.includes('form-data') || contentType.includes('x-www-form-urlencoded');

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (isForm) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    }

    const plate = String(body.plate_no || '').trim();
    const compNo = Number(body.compartment_no || 1);

    if (!plate) {
      return NextResponse.json({ success: false, message: 'plate_no is required' }, { status: 400 });
    }

    const db = getDb();

    // Ensure truck header exists
    db.prepare(`
      INSERT OR IGNORE INTO truck_headers (plate_no, carrier_name, compartment_count, total_capacity)
      VALUES (?, 'TAF Transporter', ?, 45000)
    `).run(plate, Math.max(compNo, 5));

    // Handle Bulk import if bulk_data is provided
    if (body.bulk_data) {
      const lines = String(body.bulk_data).split(/\r\n|\r|\n/);
      let count = 0;

      const upsertStmt = db.prepare(`
        INSERT INTO truck_calibrations (plate_no, compartment_no, dip_mm, litres)
        VALUES (?, ?, ?, ?)
      `);

      const deleteExisting = db.prepare(`
        DELETE FROM truck_calibrations WHERE plate_no = ? AND compartment_no = ? AND dip_mm = ?
      `);

      db.exec('BEGIN');
      try {
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line || line.startsWith('#')) continue;

          const parts = line.split(/[,\t\s]+/);
          if (parts.length >= 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
            const dip = Number(parts[0]);
            const litres = Number(parts[1]);

            deleteExisting.run(plate, compNo, dip);
            upsertStmt.run(plate, compNo, dip, litres);
            count++;
          }
        }
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }

      if (isForm) {
        const redirectUrl = new URL('/tables?table=truck_calibrations', request.url);
        redirectUrl.searchParams.set('status', `Imported ${count} points for ${plate}`);
        return NextResponse.redirect(redirectUrl, { status: 303 });
      }

      return NextResponse.json({
        success: true,
        count,
        message: `Successfully imported ${count} calibration points for ${plate} (Comp ${compNo})`,
      });
    }

    // Handle single calibration point
    const dipMm = Number(body.dip_mm || 0);
    const litres = Number(body.litres || 0);

    db.prepare(`
      DELETE FROM truck_calibrations WHERE plate_no = ? AND compartment_no = ? AND dip_mm = ?
    `).run(plate, compNo, dipMm);

    db.prepare(`
      INSERT INTO truck_calibrations (plate_no, compartment_no, dip_mm, litres)
      VALUES (?, ?, ?, ?)
    `).run(plate, compNo, dipMm, litres);

    if (isForm) {
      const redirectUrl = new URL('/tables?table=truck_calibrations', request.url);
      redirectUrl.searchParams.set('status', `Calibration added for ${plate}`);
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    return NextResponse.json({
      success: true,
      message: `Calibration point added for ${plate} (Comp ${compNo}: ${dipMm} mm = ${litres} L)`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
