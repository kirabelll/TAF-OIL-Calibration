/**
 * Service to calculate truck compartment volume from dip measurements in mm
 * using straight-line linear interpolation against calibration points.
 */

export interface CalibrationPoint {
  dip_mm: number;
  litres: number;
}

/**
 * Interpolate litres for a single compartment given its dip measurement in mm
 * and calibration points array [{dip_mm, litres}, ...].
 */
export function interpolateLitres(
  dipMm: number,
  calibrationPoints: CalibrationPoint[]
): number {
  if (dipMm <= 0) {
    return 0;
  }

  if (!calibrationPoints || calibrationPoints.length === 0) {
    return 0;
  }

  // Sort calibration points ascending by dip_mm
  const sorted = [...calibrationPoints].sort((a, b) => a.dip_mm - b.dip_mm);

  // Exact match
  for (const point of sorted) {
    if (point.dip_mm === dipMm) {
      return Math.round(point.litres);
    }
  }

  const minPoint = sorted[0];
  const maxPoint = sorted[sorted.length - 1];

  // Below lowest calibration point
  if (dipMm < minPoint.dip_mm) {
    if (minPoint.dip_mm > 0) {
      const fraction = dipMm / minPoint.dip_mm;
      return Math.round(fraction * minPoint.litres);
    }
    return Math.round(minPoint.litres);
  }

  // Above highest calibration point: extrapolate using the last slope
  if (dipMm > maxPoint.dip_mm) {
    if (sorted.length > 1) {
      const secondLast = sorted[sorted.length - 2];
      const dx = maxPoint.dip_mm - secondLast.dip_mm;
      const dy = maxPoint.litres - secondLast.litres;
      const slope = dx > 0 ? dy / dx : 0;
      const litres = maxPoint.litres + (dipMm - maxPoint.dip_mm) * slope;
      return Math.round(litres);
    }
    return Math.round(maxPoint.litres);
  }

  // Linear interpolation between surrounding points [x0, x1]
  for (let i = 0; i < sorted.length - 1; i++) {
    const p0 = sorted[i];
    const p1 = sorted[i + 1];

    const x0 = p0.dip_mm;
    const x1 = p1.dip_mm;
    const y0 = p0.litres;
    const y1 = p1.litres;

    if (dipMm >= x0 && dipMm <= x1) {
      const dx = x1 - x0;
      if (dx === 0) {
        return Math.round(y0);
      }
      const litres = y0 + ((dipMm - x0) / dx) * (y1 - y0);
      return Math.round(litres);
    }
  }

  return Math.round(maxPoint.litres);
}

export const TruckDipCalculator = {
  interpolateLitres,
};
