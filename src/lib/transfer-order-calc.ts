/**
 * Service to calculate Transfer Order (TO) volumes, losses, debit notes,
 * and tank expansion according to legacy Access business rules.
 */

export const STEEL_EXPANSION_COEFFICIENT = 0.000011;
export const DEBIT_LOSS_THRESHOLD = 150.0;
export const DEBIT_BUFFER = 0.5;

function round2dp(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export interface MeterReading {
  from_meter: number;
  to_meter: number;
  drained?: number;
}

export interface EvaluateTransferOrderParams {
  start_observed_litres: number;
  start_factor: number;
  meters?: MeterReading[];
  final_observed_litres?: number;
  final_factor: number;
  allowable_loss_percent: number;
  price_per_litre: number;
  use_metered?: boolean;
}

export interface EvaluateTransferOrderResult {
  start_vol20: number;
  final_litres: number;
  final_vol20: number;
  loss_volume: number;
  allowed_loss_volume: number;
  allowed_loss_2dp: number;
  debit_volume: number;
  debit_amount: number;
}

/**
 * Calculate metered total across meters.
 * Rule: (TOMET - FROMMET + DRAINED) summed over meters.
 */
export function calculateMeteredTotal(meters: MeterReading[]): number {
  let total = 0.0;
  for (const m of meters) {
    const from = Number(m.from_meter || 0);
    const to = Number(m.to_meter || 0);
    const drained = Number(m.drained || 0);
    total += to - from + drained;
  }
  return total;
}

/**
 * Calculate Volume at 20°C.
 */
export function calculateVolume20(volume: number, factor: number): number {
  return volume * factor;
}

/**
 * Calculate absolute loss between start volume at 20°C and final volume at 20°C.
 * Rule: Vol = |Vol20_start - Vol20_final|.
 */
export function calculateLoss(vol20Start: number, vol20Final: number): number {
  return Math.abs(vol20Start - vol20Final);
}

/**
 * Calculate allowed loss.
 * Rule: round(Vol20_start * percent / 100).
 */
export function calculateAllowedLoss(vol20Start: number, percent: number): number {
  return Math.round((vol20Start * percent) / 100.0);
}

/**
 * Calculate allowed loss with 2-decimal precision used for debit note thresholding.
 */
export function calculateAllowedLoss2dp(vol20Start: number, percent: number): number {
  return round2dp((vol20Start * percent) / 100.0);
}

/**
 * Calculate debit volume according to the two-branch rule:
 * - Loss <= 150 L: debit is Vol - allowed, but ONLY if loss exceeds the 2-decimal
 *   allowed figure by at least 0.5 L.
 * - Loss > 150 L: debit is the entire loss, with no allowance deducted.
 */
export function calculateDebitVolume(
  loss: number,
  vol20Start: number,
  percent: number
): number {
  if (loss <= 0) {
    return 0.0;
  }

  if (loss > DEBIT_LOSS_THRESHOLD) {
    // Over 150 L: entire loss, no allowance
    return round2dp(loss);
  }

  // Loss of 150 L or less
  const allowed2dp = calculateAllowedLoss2dp(vol20Start, percent);
  const allowedRounded = calculateAllowedLoss(vol20Start, percent);

  // Check if loss exceeds the 2-decimal allowed figure by at least 0.5 L
  if (loss - allowed2dp >= DEBIT_BUFFER) {
    const debit = loss - allowedRounded;
    return Math.max(0.0, round2dp(debit));
  }

  return 0.0;
}

/**
 * Calculate debit amount: Voldebit * price per litre.
 */
export function calculateDebitAmount(
  debitVolume: number,
  pricePerLitre: number
): number {
  return round2dp(debitVolume * pricePerLitre);
}

/**
 * Tank steel expansion volume correction.
 * Rule: (1 + 3 * 0.000011 * (T - 20)) * Vol20.
 */
export function calculateSteelExpansion(
  vol20: number,
  temperature: number
): number {
  const factor = 1.0 + 3.0 * STEEL_EXPANSION_COEFFICIENT * (temperature - 20.0);
  return vol20 * factor;
}

/**
 * Full Transfer Order evaluation.
 */
export function evaluateTransferOrder(
  data: EvaluateTransferOrderParams
): EvaluateTransferOrderResult {
  const startVol20 = calculateVolume20(
    data.start_observed_litres,
    data.start_factor
  );

  const useMetered = data.use_metered ?? (Boolean(data.meters && data.meters.length > 0));

  let finalLitres = 0.0;
  if (useMetered && data.meters && data.meters.length > 0) {
    finalLitres = calculateMeteredTotal(data.meters);
  } else {
    finalLitres = Number(data.final_observed_litres || 0.0);
  }

  const finalVol20 = calculateVolume20(finalLitres, data.final_factor);
  const loss = calculateLoss(startVol20, finalVol20);

  const percent = data.allowable_loss_percent;
  const allowed = calculateAllowedLoss(startVol20, percent);
  const allowed2dp = calculateAllowedLoss2dp(startVol20, percent);
  const debitVol = calculateDebitVolume(loss, startVol20, percent);
  const debitAmt = calculateDebitAmount(debitVol, data.price_per_litre);

  return {
    start_vol20: round2dp(startVol20),
    final_litres: round2dp(finalLitres),
    final_vol20: round2dp(finalVol20),
    loss_volume: round2dp(loss),
    allowed_loss_volume: allowed,
    allowed_loss_2dp: allowed2dp,
    debit_volume: debitVol,
    debit_amount: debitAmt,
  };
}

export const TransferOrderCalculator = {
  calculateMeteredTotal,
  calculateVolume20,
  calculateLoss,
  calculateAllowedLoss,
  calculateAllowedLoss2dp,
  calculateDebitVolume,
  calculateDebitAmount,
  calculateSteelExpansion,
  evaluateTransferOrder,
};
