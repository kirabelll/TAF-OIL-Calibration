/**
 * Density / VCF calculation – TypeScript port of CALCUL_DE_DENSITE_STANDATD.xlsx
 * (ASTM 54B/D algorithms for sheets: dens_15, vcf_15, dens_20, vcf_20, CALCUL).
 *
 * All Excel ROUND / TRUNC steps are reproduced so results match the standard.
 */

// Product-class constants (K0, K1)
const GAS: [number, number] = [346.4228, 0.4388];    // rho15 <= 770
const JET: [number, number] = [594.5418, 0.0];       // 770 .. 839
const FO: [number, number] = [186.9696, 0.4862];     // >= 839
const TA = -0.00336312;                              // transition zone alpha = A + B/rho^2
const TB = 2680.3206;
const SEED = 778.84;                                 // starting density, transition zone

/**
 * Excel works on 15 significant digits.
 */
function p15(x: number): number {
  return parseFloat(x.toPrecision(15));
}

/**
 * Excel ROUND(x, n) – half away from zero.
 */
export function rnd(x: number, n: number = 0): number {
  const f = Math.pow(10, n);
  const v = p15(x * f);
  const sign = v < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(v))) / f;
}

/**
 * Excel TRUNC(x, n) – truncate towards zero.
 */
export function trc(x: number, n: number = 0): number {
  const f = Math.pow(10, n);
  const v = p15(x * f);
  return Math.trunc(v) / f;
}

function cols(): Record<'G' | 'J' | 'F', [number, number]> & { T: null } {
  return { G: GAS, T: null, J: JET, F: FO };
}

function alpha(c: 'G' | 'T' | 'J' | 'F', rho: number): number {
  if (c === 'T') {
    return rnd(TA + TB / (rho * rho), 7);
  }
  const [k0, k1] = cols()[c]!;
  return rnd(k0 / (rho * rho) + k1 / rho, 7);
}

function vcfStd(a: number, d: number): number {
  return rnd(Math.exp(-a * d - rnd(0.8 * Math.pow(a * d, 2), 9)), 6);
}

/**
 * Hydrometer correction + rounding of inputs.
 * Returns [rT, tRound]
 */
function prepare(rho: number, t: number, tRef: number): [number, number] {
  const r = rnd(rho / 5, 1) * 5;
  const tRound = rnd(t * 2, 1) / 2;
  const d = tRound - tRef;
  const hy = 1 - rnd(23e-6 * d, 9) - rnd(2e-8 * d * d, 9);
  const rT = trc(rnd(r * hy, 2), 2);
  return [rT, tRound];
}

interface IterateResult {
  a: number;
  vcf: number;
  r: number;
  rr: number;
}

/**
 * 7-pass iteration rT -> rho15 for one column.
 */
function iterate(c: 'G' | 'T' | 'J' | 'F', rT: number, d15: number): IterateResult {
  const r: number[] = [0];
  const rr: number[] = [0];
  let a = 0;
  let v = 0;

  for (let k = 1; k <= 7; k++) {
    if (k === 1) {
      a = alpha(c, c === 'T' ? SEED : rT);
    } else if (k === 2) {
      a = alpha(c, rr[1]);
    } else {
      const prev = c === 'T' ? r[k - 2] : rr[k - 2];
      if (Math.abs(prev - rr[k - 1]) > 0.05) {
        a = alpha(c, rr[k - 1]);
      }
    }
    v = vcfStd(a, d15);
    r[k] = trc(rT / v, 3);
    rr[k] = rnd(r[k], 2);
  }

  return { a, vcf: v, r: r[7], rr: rr[7] };
}

function pick15(results: Record<'G' | 'T' | 'J' | 'F', IterateResult>): 'G' | 'T' | 'J' | 'F' {
  if (results.T.r > 770.5 && results.T.r < 787.5) {
    return 'T';
  }
  if (results.G.r <= 770) {
    return 'G';
  }
  return results.J.r < 839 ? 'J' : 'F';
}

/**
 * Calculate 15 °C density and volume correction factor (VCF).
 */
export function to15(rho: number, t: number): { density: number; vcf: number } {
  const [rT, tRound] = prepare(rho, t, 15);
  const d = tRound - 15;
  const results = {
    G: iterate('G', rT, d),
    T: iterate('T', rT, d),
    J: iterate('J', rT, d),
    F: iterate('F', rT, d),
  };

  const pick = pick15(results);
  return {
    density: rnd(results[pick].r, 1),
    vcf: rnd(results[pick].vcf, 5),
  };
}

/**
 * Calculate density at 20 °C in kg/m3.
 */
export function density20(rho: number, t: number): number {
  const [rT, tRound] = prepare(rho, t, 20);
  const d20 = tRound - 20;
  const d15 = tRound - 15;

  const colsList: ('G' | 'T' | 'J' | 'F')[] = ['G', 'T', 'J', 'F'];
  const out: Partial<Record<'G' | 'T' | 'J' | 'F', { rr: number; r20: number }>> = {};

  for (const c of colsList) {
    const it = iterate(c, rT, d15);
    const a = alpha(c, it.rr);
    const v = rnd(Math.exp(-a * d20 - 8 * a * a * d20 - 0.8 * a * a * d20 * d20), 6);
    out[c] = { rr: it.rr, r20: trc(rT / v, 3) };
  }

  let pick: 'G' | 'T' | 'J' | 'F';
  if (out.T!.rr > 770.5 && out.T!.rr < 787.5) {
    pick = 'T';
  } else if (out.G!.rr <= 770) {
    pick = 'G';
  } else {
    pick = out.F!.rr < 839 ? 'J' : 'F';
  }

  return rnd(out[pick]!.r20, 1);
}

/**
 * VCF volume at T -> 20 °C, from density at 20 °C (rho20) and observed temp.
 */
export function vcf20(rho20: number, t: number): number {
  const tRound = rnd(t * 2, 1) / 2;
  const r0 = rnd(rho20 / 5, 1) * 5;
  const d = 5.0;

  const aV = (k: [number, number], rho: number): number => {
    return rnd(
      trc(trc(k[0] / rho, 8) / rho, 10) + trc(k[1] / rho, 10),
      7
    );
  };

  const aG = (rho: number): number => {
    return rnd(TA + rnd(trc(TB / rho, 6) / rho, 8), 7);
  };

  const vc = (a: number): number => {
    return rnd(Math.exp(-a * d - rnd(a * d * 0.8 * a * d, 9)), 6);
  };

  const ks: Record<'C' | 'H' | 'I', [number, number]> = { C: GAS, H: JET, I: FO };
  const A: Record<'C' | 'G' | 'H' | 'I', number[]> = {
    C: [0],
    G: [0],
    H: [0],
    I: [0],
  };
  const RR: Record<'C' | 'G' | 'H' | 'I', number[]> = {
    C: [0],
    G: [0],
    H: [0],
    I: [0],
  };

  for (let k = 1; k <= 8; k++) {
    for (const c of ['C', 'G', 'H', 'I'] as const) {
      const getAlpha = (rho: number) => (c === 'G' ? aG(rho) : aV(ks[c], rho));
      let a: number;
      if (k === 1) {
        a = c === 'G' ? aG(SEED) : aV(ks[c as 'C' | 'H' | 'I'], r0);
      } else if (k === 2) {
        a = getAlpha(RR[c][1]);
      } else {
        const ref = c === 'G' ? 'C' : c;
        if (Math.abs(RR[ref][k - 2] - RR[ref][k - 1]) > 0.05) {
          a = getAlpha(RR[c][k - 1]);
        } else {
          a = A[ref][k - 1];
        }
      }
      A[c][k] = a;
      RR[c][k] = rnd(trc(r0 / vc(a), 3), 2);
    }
  }

  let r: number;
  if (RR.G[8] > 770.5 && RR.G[8] < 787.5) {
    r = rnd(RR.G[8], 1);
  } else if (RR.C[8] <= 770) {
    r = rnd(RR.C[8], 1);
  } else {
    r = rnd(RR.I[8] < 839 ? RR.H[8] : RR.I[8], 1);
  }

  const k = r > 770 ? (r > 839 ? FO : JET) : GAS;
  const aC = aV(k, r);
  const aT = rnd(TA + rnd(trc(TB / r, 6) / r, 8), 7);

  const d20 = tRound - 20;
  const comp = (a: number): number => {
    const t1 = trc(a * d20, 9);
    const t2 = rnd(8 * trc(a * t1, 9), 9);
    const t3 = rnd(t1 * trc(0.8 * trc(a * d20, 10), 9), 9);
    const v = rnd(Math.exp(-t1 - t2 - t3), 6);
    return v >= 1 ? rnd(v, 4) : rnd(v, 5);
  };

  return rho20 > 770 && rho20 < 788 ? rnd(comp(aT), 4) : rnd(comp(aC), 4);
}

/**
 * Full CALCUL sheet calculation: converts density and volume to 15 °C and 20 °C, and mass in tonnes.
 */
export function compute(
  density: number,
  tempC: number,
  volume: number
): {
  density15: number;
  vcf15: number;
  density20: number;
  vcf20: number;
  volume15: number;
  volume20: number;
  tonnes: number;
} {
  const d15 = to15(density, tempC);
  const d20 = density20(density, tempC);
  const vcf = vcf20(d20, tempC);

  const dens15 = d15.density / 1000;
  const dens20 = d20 / 1000;
  const v15 = volume * d15.vcf;
  const v20 = volume * vcf;

  return {
    density15: dens15,
    vcf15: d15.vcf,
    density20: dens20,
    vcf20: vcf,
    volume15: v15,
    volume20: v20,
    tonnes: (v15 * dens15) / 1000,
  };
}

export const DensityCalc = {
  rnd,
  trc,
  to15,
  density20,
  vcf20,
  compute,
};
