import { describe, expect, it } from "vitest";
import {
  PROXIMA_AU,
  VEHICLES,
  constantTravelYears,
  formatDuration,
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

  it("keeps useful precision for human-scale interstellar estimates", () => {
    expect(formatDuration(42.465)).toBe("42.5 YEARS");
    expect(formatDuration(21.25)).toBe("21.3 YEARS");
  });

  it("keeps Discovery's 18-month Jupiter mission separate from its Proxima analogy", () => {
    const discovery = VEHICLES.find(({ id }) => id === "discovery");
    expect(discovery).toBeTruthy();
    expect(totalTravelYears(discovery!)).toBe(1.5);
    expect(discovery?.route.mission).toMatchObject({
      kind: "in-system-profile",
      targetBody: "jupiter",
      targetAu: 5.2,
    });
    expect(discovery?.arrivalEstimate?.years).toBeCloseTo(95_900, -2);
  });

  it("never invents arrival times for incomparable fiction", () => {
    for (const id of ["enterprise", "millennium-falcon", "droplet", "warhammer"]) {
      const vehicle = VEHICLES.find((item) => item.id === id);
      expect(vehicle).toBeTruthy();
      expect(totalTravelYears(vehicle!)).toBeUndefined();
    }
  });

  it("gives every non-runnable selection an explicit comparison estimate", () => {
    const estimates = Object.fromEntries(
      VEHICLES.filter(({ arrivalEstimate }) => arrivalEstimate)
        .map((vehicle) => [vehicle.id, vehicle.arrivalEstimate]),
    );

    expect(estimates.orion?.years).toBeCloseTo(42.5, 1);
    expect(estimates.discovery?.years).toBeCloseTo(95_900, -2);
    expect((estimates.enterprise?.years ?? 0) * 365.25).toBeCloseTo(3.0, 1);
    expect((estimates["millennium-falcon"]?.years ?? 0) * 365.25 * 24 * 60).toBeCloseTo(14.9, 1);
    expect(estimates.droplet?.years).toBeCloseTo(50.9, 1);
    expect(estimates.warhammer?.display).toBe("HOURS–WEEKS / OR WORSE");

    for (const vehicle of VEHICLES) {
      if (totalTravelYears(vehicle) !== undefined) continue;
      expect(
        vehicle.arrivalEstimate ?? onwardComparisonYears(vehicle),
        `${vehicle.name} needs an explicit comparison or range`,
      ).toBeTruthy();
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
