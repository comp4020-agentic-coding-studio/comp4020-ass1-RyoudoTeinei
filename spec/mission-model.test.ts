import { describe, expect, it } from "vitest";
import {
  MILESTONES,
  PROXIMA_AU,
  VEHICLES,
  constantTravelYears,
  distancePosition,
  journeySample,
  totalTravelYears,
} from "../mission-data";

describe("journey model", () => {
  it("places every milestone on one monotonically increasing log scale", () => {
    const positions = MILESTONES.map(({ au }) => distancePosition(au));
    expect(positions[0]).toBe(0);
    expect(positions.at(-1)).toBeCloseTo(1);
    for (let index = 1; index < positions.length; index += 1) {
      expect(positions[index]).toBeGreaterThan(positions[index - 1] ?? -1);
    }
  });

  it("makes the heliopause visibly much earlier than the Oort exit", () => {
    expect(distancePosition(122)).toBeLessThan(distancePosition(100_000));
    expect(distancePosition(100_000) - distancePosition(122)).toBeGreaterThan(0.5);
  });

  it("calculates the verified Voyager scale comparison", () => {
    const voyager = VEHICLES.find(({ id }) => id === "voyager");
    expect(voyager).toBeTruthy();
    expect(totalTravelYears(voyager!)).toBeCloseTo(74_950, -1);
    expect(constantTravelYears(61_198, 100_000)).toBeCloseTo(27_886, -1);
  });

  it("never invents arrival times for incomparable fiction", () => {
    for (const id of ["enterprise", "millennium-falcon", "droplet", "warhammer"]) {
      const vehicle = VEHICLES.find((item) => item.id === id);
      expect(vehicle).toBeTruthy();
      expect(totalTravelYears(vehicle!)).toBeUndefined();
    }
  });

  it("moves a simulated craft from Earth to Proxima without overshooting", () => {
    const daedalus = VEHICLES.find(({ id }) => id === "daedalus");
    expect(daedalus).toBeTruthy();
    expect(journeySample(daedalus!, 0).currentAu).toBe(1);
    expect(journeySample(daedalus!, 0.5).currentAu).toBeGreaterThan(1);
    expect(journeySample(daedalus!, 1).currentAu).toBeCloseTo(PROXIMA_AU);
  });
});
