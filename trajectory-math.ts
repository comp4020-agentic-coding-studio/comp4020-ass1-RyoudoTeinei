import type { Vec3 } from "./space-map";

export interface JplStateVector extends Vec3 {
  jdTdb: number;
  date: string;
  vx: number;
  vy: number;
  vz: number;
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

function component(
  startPosition: number,
  endPosition: number,
  startVelocity: number,
  endVelocity: number,
  durationDays: number,
  amount: number,
): number {
  const t = clamp01(amount);
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * startPosition
    + h10 * durationDays * startVelocity
    + h01 * endPosition
    + h11 * durationDays * endVelocity;
}

function velocityComponent(
  startPosition: number,
  endPosition: number,
  startVelocity: number,
  endVelocity: number,
  durationDays: number,
  amount: number,
): number {
  if (durationDays === 0) return startVelocity;
  const t = clamp01(amount);
  const t2 = t * t;
  const dh00 = 6 * t2 - 6 * t;
  const dh10 = 3 * t2 - 4 * t + 1;
  const dh01 = -6 * t2 + 6 * t;
  const dh11 = 3 * t2 - 2 * t;
  return (
    dh00 * startPosition
    + dh10 * durationDays * startVelocity
    + dh01 * endPosition
    + dh11 * durationDays * endVelocity
  ) / durationDays;
}

export function hermitePosition(
  start: JplStateVector,
  end: JplStateVector,
  amount: number,
): Vec3 {
  const durationDays = end.jdTdb - start.jdTdb;
  if (durationDays === 0) return { x: start.x, y: start.y, z: start.z };
  return {
    x: component(start.x, end.x, start.vx, end.vx, durationDays, amount),
    y: component(start.y, end.y, start.vy, end.vy, durationDays, amount),
    z: component(start.z, end.z, start.vz, end.vz, durationDays, amount),
  };
}

function bracket(
  samples: readonly JplStateVector[],
  targetJd: number,
): { lower: number; upper: number } {
  let lower = 0;
  let upper = samples.length - 1;
  while (lower + 1 < upper) {
    const middle = Math.floor((lower + upper) / 2);
    if ((samples[middle]?.jdTdb ?? Number.POSITIVE_INFINITY) > targetJd) upper = middle;
    else lower = middle;
  }
  return { lower, upper };
}

export function sampleStateAtProgress(
  samples: readonly JplStateVector[],
  progress: number,
): JplStateVector {
  const first = samples[0];
  const last = samples.at(-1);
  if (!first || !last) throw new Error("Cannot sample an empty JPL trajectory.");
  const clamped = clamp01(progress);
  const targetJd = first.jdTdb + (last.jdTdb - first.jdTdb) * clamped;
  const { lower: lowerIndex, upper: upperIndex } = bracket(samples, targetJd);
  const lower = samples[lowerIndex] ?? first;
  const upper = samples[upperIndex] ?? last;
  const durationDays = upper.jdTdb - lower.jdTdb;
  const amount = durationDays === 0 ? 0 : (targetJd - lower.jdTdb) / durationDays;
  const position = hermitePosition(lower, upper, amount);
  const startMillis = Date.parse(`${first.date}Z`);
  const endMillis = Date.parse(`${last.date}Z`);
  const date = Number.isFinite(startMillis) && Number.isFinite(endMillis)
    ? new Date(startMillis + (endMillis - startMillis) * clamped).toISOString().slice(0, 19)
    : lower.date;
  return {
    ...position,
    jdTdb: targetJd,
    date,
    vx: velocityComponent(lower.x, upper.x, lower.vx, upper.vx, durationDays, amount),
    vy: velocityComponent(lower.y, upper.y, lower.vy, upper.vy, durationDays, amount),
    vz: velocityComponent(lower.z, upper.z, lower.vz, upper.vz, durationDays, amount),
  };
}

export function trajectoryPrefix(
  samples: readonly JplStateVector[],
  progress: number,
): JplStateVector[] {
  const first = samples[0];
  const last = samples.at(-1);
  if (!first || !last) return [];
  const clamped = clamp01(progress);
  if (clamped >= 1) return [...samples];
  const targetJd = first.jdTdb + (last.jdTdb - first.jdTdb) * clamped;
  const { lower } = bracket(samples, targetJd);
  const prefix = samples.slice(0, lower + 1);
  const sampled = sampleStateAtProgress(samples, clamped);
  const prefixLast = prefix.at(-1);
  if (!prefixLast || Math.abs(prefixLast.jdTdb - sampled.jdTdb) > 1e-9) prefix.push(sampled);
  return prefix;
}
