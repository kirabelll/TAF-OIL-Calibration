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

    const plateNo = String(body.plate_no || '').trim();
    const productItemNumber = String(body.product_item_number || 'P07-0001').trim();
    const originVol20 = Number(body.origin_vol20 || 0);
    const lossVolume = Number(body.loss_volume || 0);
    const debitVolume = Number(body.debit_volume || 0);
    const pricePerLitre = Number(body.price_per_litre || 0);
    const orderDate = String(body.order_date || new Date().toISOString().split('T')[0]);

    if (!plateNo || originVol20 <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid plate_no or origin_vol20' }, { status: 400 });
    }

    const debitAmount = Math.round((debitVolume * pricePerLitre + Number.EPSILON) * 100) / 100;
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const dateStr = orderDate.replace(/-/g, '');
    const toNum = `DN-${dateStr}-${randomSuffix}`;

    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO transfer_orders (
        to_number, reference, order_date, plate_no, carrier_name, driver_name, product_item_number,
        start_observed_density, start_temperature, start_density_20, start_factor,
        start_observed_litres, start_vol20, final_density_20, final_factor, final_vol20,
        loss_volume, allowable_loss_percent, allowed_loss_volume, debit_volume, price_per_litre, debit_amount, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        789.0, 20.0, 789.0, 1.0,
        ?, ?, 789.0, 1.0, ?,
        ?, 0.12, ?, ?, ?, ?, 'completed'
      )
    `);

    const finalVol20 = originVol20 - lossVolume;
    const allowedLossVol = Math.round(originVol20 * 0.0012);

    stmt.run(
      toNum,
      body.reference || 'MANUAL-DEBIT',
      orderDate,
      plateNo,
      body.carrier_name || 'TAF Transporter',
      body.driver_name || null,
      productItemNumber,
      originVol20,
      originVol20,
      finalVol20,
      lossVolume,
      allowedLossVol,
      debitVolume,
      pricePerLitre,
      debitAmount
    );

    if (isForm) {
      return NextResponse.redirect(new URL(`/debit-note/${toNum}`, request.url), { status: 303 });
    }

    return NextResponse.json({
      success: true,
      to_number: toNum,
      message: `Debit Note #${toNum} created successfully!`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
