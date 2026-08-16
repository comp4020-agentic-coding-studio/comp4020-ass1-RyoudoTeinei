export const LIGHT_SPEED_KM_S = 299_792.458;
export const PROXIMA_DISTANCE_LY = 4.2465;

export interface RocketMassRatio {
  burns: 1 | 2;
  lnRatio: number;
  log10Ratio: number;
  ratio?: number;
}

export function rapidityAtFractionOfLightSpeed(beta: number): number {
  if (!Number.isFinite(beta) || beta <= 0 || beta >= 1) {
    throw new RangeError("beta must be greater than zero and less than one");
  }
  return 0.5 * Math.log((1 + beta) / (1 - beta));
}

export function relativisticMassRatio(
  beta: number,
  exhaustVelocityKmS: number,
  burns: 1 | 2 = 1,
): RocketMassRatio {
  if (!Number.isFinite(exhaustVelocityKmS) || exhaustVelocityKmS <= 0) {
    throw new RangeError("exhaust velocity must be positive");
  }

  const exhaustFractionC = exhaustVelocityKmS / LIGHT_SPEED_KM_S;
  const lnRatio = (rapidityAtFractionOfLightSpeed(beta) / exhaustFractionC) * burns;
  const log10Ratio = lnRatio / Math.LN10;
  return {
    burns,
    lnRatio,
    log10Ratio,
    ratio: lnRatio <= Math.log(Number.MAX_VALUE) ? Math.exp(lnRatio) : undefined,
  };
}

export function idealCruiseYears(beta: number, distanceLy = PROXIMA_DISTANCE_LY): number {
  if (!Number.isFinite(distanceLy) || distanceLy <= 0) {
    throw new RangeError("distance must be positive");
  }
  rapidityAtFractionOfLightSpeed(beta);
  return distanceLy / beta;
}

export function formatMassRatio(result: RocketMassRatio): string {
  if (result.ratio !== undefined && result.log10Ratio < 6) {
    return `${result.ratio.toLocaleString("en-US", { maximumFractionDigits: 2 })}:1`;
  }
  return `10^${result.log10Ratio.toLocaleString("en-US", { maximumFractionDigits: 0 })}:1`;
}

