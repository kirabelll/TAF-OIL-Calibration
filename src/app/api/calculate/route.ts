import { NextResponse } from 'next/server';
import { DensityCalc } from '@/lib/density-calc';
import { TransferOrderCalculator, MeterReading } from '@/lib/transfer-order-calc';

export async function POST(request: Request) {
  try {
    let body: Record<string, any> = {};
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('form-data') || contentType.includes('x-www-form-urlencoded')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    }

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

    // If Origin Vol20 is manually specified (e.g. from Djibouti waybill), recalculate loss against it
    if (originVol20 && originVol20 > 0) {
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

    return NextResponse.json({
      success: true,
      start_density_20: startD20,
      start_factor: startFactor,
      final_density_20: finalD20,
      final_factor: finalFactor,
      calculations: calcResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Calculation error' },
      { status: 400 }
    );
  }
}
