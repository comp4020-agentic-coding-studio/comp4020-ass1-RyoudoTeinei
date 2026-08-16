import { describe, expect, it } from "vitest";
import horizonsJson from "../data/spacecraft-trajectories.json";
import {
  AU_PER_LIGHT_YEAR,
  CNS5_NEARBY_STARS,
  CNS5_SOURCE,
} from "../space-data";

interface Sample {
  date: string;
  x: number;
  y: number;
  z: number;
}

describe("vendored astronomy data", () => {
  it("uses twelve sourced CNS5 anchors with true radial distances", () => {
    expect(CNS5_NEARBY_STARS).toHaveLength(12);
    expect(CNS5_SOURCE.catalogueUrl).toMatch(/^https:\/\/vizier\.cds\.unistra\.fr\//);
    const proxima = CNS5_NEARBY_STARS.find(({ id }) => id === "proxima-centauri");
    expect(proxima?.distanceLy).toBeCloseTo(4.2465, 4);
    expect(
      Math.hypot(
        proxima?.eclipticAu.x ?? 0,
        proxima?.eclipticAu.y ?? 0,
        proxima?.eclipticAu.z ?? 0,
      ) / AU_PER_LIGHT_YEAR,
    ).toBeCloseTo(proxima?.distanceLy ?? 0, 3);
  });

  it("keeps JPL trajectories local and identifies their coordinate frame", () => {
    expect(horizonsJson.source.name).toMatch(/JPL Horizons/i);
    expect(horizonsJson.coordinateFrame.origin).toMatch(/Sun/i);
    expect(horizonsJson.coordinateFrame.referencePlane).toMatch(/Ecliptic/i);
    expect(horizonsJson.trajectories).toHaveLength(2);
  });

  it("ends Voyager at the verified 2026 heliocentric state", () => {
    const voyager = horizonsJson.trajectories.find(({ id }) => id === "voyager1");
    const last = voyager?.samples.at(-1) as Sample | undefined;
    expect(voyager?.samples.length).toBeGreaterThan(1_700);
    expect(last?.date).toBe("2026-08-16T00:00:00");
    expect(Math.hypot(last?.x ?? 0, last?.y ?? 0, last?.z ?? 0)).toBeCloseTo(171.4686, 3);
  });

  it("keeps Parker on its sub-AU bound orbit", () => {
    const parker = horizonsJson.trajectories.find(({ id }) => id === "parkerSolarProbe");
    const last = parker?.samples.at(-1) as Sample | undefined;
    expect(parker?.samples.length).toBeGreaterThan(580);
    expect(Math.hypot(last?.x ?? 0, last?.y ?? 0, last?.z ?? 0)).toBeLessThan(1);
  });
});
