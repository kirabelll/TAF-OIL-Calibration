import { NextResponse } from 'next/server';
import { getDb, getAllTransferOrders } from '@/lib/db';
import { DensityCalc } from '@/lib/density-calc';
import { TransferOrderCalculator, MeterReading } from '@/lib/transfer-order-calc';

export async function GET() {
  try {
    const orders = getAllTransferOrders();
    return NextResponse.json({ success: true, orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

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

    const toNumber = String(body.to_number || `TO-${Date.now()}`).trim();
    const plateNo = String(body.plate_no || '').trim();
    const productItemNumber = String(body.product_item_number || 'P07-0001').trim();
    const orderDate = String(body.order_date || new Date().toISOString().split('T')[0]);

    const startObservedLitres = Number(body.start_observed_litres || 0);
    const startDensity = Number(body.start_density || 789);
    const startTemperature = Number(body.start_temperature || 20);
    const originVol20 = body.origin_vol20 ? Number(body.origin_vol20) : null;

    const finalDensity = Number(body.final_density || startDensity);
    const finalTemperature = Number(body.final_temperature || startTemperature);

    const allowableLossPercent = Number(body.allowable_loss_percent || 0.08);
    const pricePerLitre = Number(body.price_per_litre || 0);
    const useMetered = body.use_metered !== false && body.use_metered !== 'false';

    const startD20 = DensityCalc.density20(startDensity, startTemperature);
    const startFactor = DensityCalc.vcf20(startD20, startTemperature);

    const finalD20 = DensityCalc.density20(finalDensity, finalTemperature);
    const finalFactor = DensityCalc.vcf20(finalD20, finalTemperature);

    const meters: MeterReading[] = [];
    if (useMetered) {
      if (body.meter_to_1 !== undefined && body.meter_to_1 !== null && body.meter_to_1 !== '') {
        meters.push({
          from_meter: Number(body.meter_from_1 || 0),
          to_meter: Number(body.meter_to_1 || 0),
          drained: Number(body.drained_1 || 0),
        });
      }
      if (body.meter_to_2 !== undefined && body.meter_to_2 !== null && body.meter_to_2 !== '') {
        meters.push({
          from_meter: Number(body.meter_from_2 || 0),
          to_meter: Number(body.meter_to_2 || 0),
          drained: Number(body.drained_2 || 0),
        });
      }
    }

    const calcResult = TransferOrderCalculator.evaluateTransferOrder({
      start_observed_litres: startObservedLitres,
      start_factor: startFactor,
      final_observed_litres: Number(body.final_observed_litres || 0),
      final_factor: finalFactor,
      meters,
      allowable_loss_percent: allowableLossPercent,
      price_per_litre: pricePerLitre,
      use_metered: meters.length > 0,
    });

    let startVol20 = calcResult.start_vol20;
    if (originVol20 && originVol20 > 0) {
      startVol20 = originVol20;
      const finalVol20 = calcResult.final_vol20;
      const loss = TransferOrderCalculator.calculateLoss(originVol20, finalVol20);
      const allowedVol = TransferOrderCalculator.calculateAllowedLoss(originVol20, allowableLossPercent);
      const allowed2dp = TransferOrderCalculator.calculateAllowedLoss2dp(originVol20, allowableLossPercent);
      const debitVol = TransferOrderCalculator.calculateDebitVolume(loss, originVol20, allowableLossPercent);
      const debitAmt = TransferOrderCalculator.calculateDebitAmount(debitVol, pricePerLitre);

      calcResult.start_vol20 = originVol20;
      calcResult.loss_volume = Math.round((loss + Number.EPSILON) * 100) / 100;
      calcResult.allowed_loss_volume = allowedVol;
      calcResult.allowed_loss_2dp = allowed2dp;
      calcResult.debit_volume = debitVol;
      calcResult.debit_amount = debitAmt;
    }

    const db = getDb();
    const insertStmt = db.prepare(`
      INSERT INTO transfer_orders (
        to_number, reference, order_date, plate_no, trailer_plate_no, carrier_name, driver_name, driver_licence_no, product_item_number,
        ship_from_storage_point, ship_from_date, ship_from_loc, ship_to_depot, ship_to_date, ship_to_loc,
        start_observed_density, start_temperature, start_density_20, start_factor, start_observed_litres, start_vol20, origin_vol20,
        use_metered, meter_reading_from_1, meter_reading_to_1, drained_1, meter_reading_from_2, meter_reading_to_2, drained_2, metered_total,
        final_observed_litres, final_observed_density, final_temperature, final_density_20, final_factor, final_vol20,
        loss_volume, allowable_loss_percent, allowed_loss_volume, allowed_loss_2dp, debit_volume, price_per_litre, debit_amount,
        sg_15_dj_1, sg_15_dj_2, sg_15_diff, insurance_status, via, side_no, transhipment_order_no, delivery_order_no, status
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, 'completed'
      )
    `);

    const info = insertStmt.run(
      toNumber,
      body.reference || null,
      orderDate,
      plateNo,
      body.trailer_plate_no || null,
      body.carrier_name || 'TAF Oil Fleet',
      body.driver_name || null,
      body.driver_licence_no || null,
      productItemNumber,
      body.ship_from_storage_point || null,
      body.ship_from_date || null,
      body.ship_from_loc || null,
      body.ship_to_depot || null,
      body.ship_to_date || null,
      body.ship_to_loc || null,
      startDensity,
      startTemperature,
      startD20,
      startFactor,
      startObservedLitres,
      startVol20,
      originVol20,
      meters.length > 0 ? 1 : 0,
      body.meter_from_1 ? Number(body.meter_from_1) : null,
      body.meter_to_1 ? Number(body.meter_to_1) : null,
      body.drained_1 ? Number(body.drained_1) : null,
      body.meter_from_2 ? Number(body.meter_from_2) : null,
      body.meter_to_2 ? Number(body.meter_to_2) : null,
      body.drained_2 ? Number(body.drained_2) : null,
      meters.length > 0 ? calcResult.final_litres : null,
      body.final_observed_litres ? Number(body.final_observed_litres) : null,
      finalDensity,
      finalTemperature,
      finalD20,
      finalFactor,
      calcResult.final_vol20,
      calcResult.loss_volume,
      allowableLossPercent,
      calcResult.allowed_loss_volume,
      calcResult.allowed_loss_2dp,
      calcResult.debit_volume,
      pricePerLitre,
      calcResult.debit_amount,
      body.sg_15_dj_1 ? Number(body.sg_15_dj_1) : null,
      body.sg_15_dj_2 ? Number(body.sg_15_dj_2) : null,
      body.sg_15_diff ? Number(body.sg_15_diff) : null,
      body.insurance_status || 'No',
      body.via || null,
      body.side_no || null,
      body.transhipment_order_no || null,
      body.delivery_order_no || null
    );

    const newOrderId = info.lastInsertRowid;

    if (isForm) {
      // Redirect back with notification query params
      const redirectUrl = new URL('/', request.url);
      redirectUrl.searchParams.set('saved', '1');
      redirectUrl.searchParams.set('to_number', toNumber);
      redirectUrl.searchParams.set('loss', String(calcResult.loss_volume));
      redirectUrl.searchParams.set('debit', String(calcResult.debit_volume));
      redirectUrl.searchParams.set('amount', String(calcResult.debit_amount));
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    return NextResponse.json({
      success: true,
      id: newOrderId,
      to_number: toNumber,
      calculations: calcResult,
      message: `Transhipment Order #${toNumber} saved successfully!`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
