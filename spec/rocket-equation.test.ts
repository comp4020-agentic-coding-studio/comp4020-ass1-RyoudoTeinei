import { describe, expect, it } from "vitest";
import {
  idealCruiseYears,
  rapidityAtFractionOfLightSpeed,
  relativisticMassRatio,
} from "../rocket-equation-math";

describe("relativistic rocket equation", () => {
  it("uses rapidity rather than treating 0.1c as exactly Newtonian", () => {
    expect(rapidityAtFractionOfLightSpeed(0.1)).toBeCloseTo(0.10033535, 7);
  });

  it("shows the chemical mass ratio at 0.1c is about ten to the 2969", () => {
    const result = relativisticMassRatio(0.1, 4.4);
    expect(result.ratio).toBeUndefined();
    expect(result.log10Ratio).toBeCloseTo(2968.97, 1);
  });

  it("squares the mass ratio when the craft must accelerate and stop", () => {
    const launch = relativisticMassRatio(0.1, 10_000, 1);
    const arrival = relativisticMassRatio(0.1, 10_000, 2);
    expect(launch.ratio).toBeCloseTo(20.25, 1);
    expect(arrival.ratio).toBeCloseTo((launch.ratio ?? 0) ** 2, 8);
  });

  it("computes the no-acceleration cruise floor to Proxima", () => {
    expect(idealCruiseYears(0.1)).toBeCloseTo(42.465, 3);
  });
});
