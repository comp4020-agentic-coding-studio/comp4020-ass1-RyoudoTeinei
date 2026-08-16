import { describe, expect, it } from "vitest";
import {
  hermitePosition,
  sampleStateAtProgress,
  trajectoryPrefix,
  type JplStateVector,
} from "../trajectory-math";

const state = (
  jdTdb: number,
  x: number,
  vx: number,
): JplStateVector => ({
  jdTdb,
  date: `2000-01-${String(jdTdb + 1).padStart(2, "0")}T00:00:00`,
  x,
  y: 0,
  z: 0,
  vx,
  vy: 0,
  vz: 0,
});

describe("JPL state-vector interpolation", () => {
  it("passes exactly through both official ephemeris samples", () => {
    const start = state(0, 1, 2);
    const end = state(2, 7, 4);
    expect(hermitePosition(start, end, 0)).toEqual({ x: 1, y: 0, z: 0 });
    expect(hermitePosition(start, end, 1)).toEqual({ x: 7, y: 0, z: 0 });
  });

  it("uses Horizons velocities rather than a visual-only smoothing curve", () => {
    const start = state(0, 0, 1);
    const end = state(1, 1, 1);
    expect(hermitePosition(start, end, 0.5).x).toBeCloseTo(0.5, 12);
    expect(sampleStateAtProgress([start, end], 0.5).vx).toBeCloseTo(1, 12);
  });

  it("builds a travelled prefix that ends at the interpolated craft", () => {
    const samples = [state(0, 0, 1), state(1, 1, 1), state(2, 2, 1)];
    const prefix = trajectoryPrefix(samples, 0.75);
    expect(prefix).toHaveLength(3);
    expect(prefix.at(-1)?.x).toBeCloseTo(1.5, 12);
  });
});
