import { describe, expect, it } from "vitest";
import {
  PROXIMA_AU,
  VEHICLES,
  constantTravelYears,
  journeySample,
  milestoneYears,
  onwardComparisonYears,
  totalTravelYears,
} from "../mission-data";

describe("journey model", () => {
  it("calculates the verified Voyager scale comparison", () => {
    const voyager = VEHICLES.find(({ id }) => id === "voyager");
    expect(voyager).toBeTruthy();
    expect(totalTravelYears(voyager!)).toBeCloseTo(74_889, -1);
    expect(constantTravelYears(61_198, 100_000)).toBeCloseTo(27_886, -1);
    expect(milestoneYears(voyager!, 122)).toBeCloseTo(33.5, 0);
  });

  it("never invents arrival times for incomparable fiction", () => {
    for (const id of ["enterprise", "millennium-falcon", "droplet", "warhammer"]) {
      const vehicle = VEHICLES.find((item) => item.id === id);
      expect(vehicle).toBeTruthy();
      expect(totalTravelYears(vehicle!)).toBeUndefined();
    }
  });

  it("does not turn Parker's perihelion record into an outbound mission", () => {
    const parker = VEHICLES.find(({ id }) => id === "parker");
    expect(parker).toBeTruthy();
    expect(parker?.phases?.length).toBeGreaterThan(2);
    expect(totalTravelYears(parker!)).toBeUndefined();
    expect(onwardComparisonYears(parker!, 122)).toBeCloseTo(3, 0);
    expect(onwardComparisonYears(parker!)).toBeCloseTo(6_623, 0);
  });

  it("moves a simulated craft from Earth to Proxima without overshooting", () => {
    const daedalus = VEHICLES.find(({ id }) => id === "daedalus");
    expect(daedalus).toBeTruthy();
    expect(journeySample(daedalus!, 0).currentAu).toBe(1);
    expect(journeySample(daedalus!, 0.5).currentAu).toBeGreaterThan(1);
    expect(journeySample(daedalus!, 1).currentAu).toBeCloseTo(PROXIMA_AU);
  });
});
