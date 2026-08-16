import { describe, expect, it } from "vitest";
import horizonsJson from "../data/spacecraft-trajectories.json";
import {
  AU_PER_LIGHT_YEAR,
  CNS5_NEARBY_STARS,
  CNS5_SOURCE,
  lightYearsFromParallaxMas,
} from "../space-data";

interface Sample {
  date: string;
  x: number;
  y: number;
  z: number;
}

describe("vendored astronomy data", () => {
  it("uses the complete published CNS5 slice within twelve light-years", () => {
    expect(CNS5_NEARBY_STARS).toHaveLength(28);
    expect(CNS5_SOURCE.subsetRecordCount).toBe(CNS5_NEARBY_STARS.length);
    expect(CNS5_SOURCE.catalogueUrl).toMatch(/^https:\/\/vizier\.cds\.unistra\.fr\//);
    expect(new Set(CNS5_NEARBY_STARS.map(({ cns5Id }) => cns5Id)).size).toBe(28);
    expect(new Set(CNS5_NEARBY_STARS.map(({ id }) => id)).size).toBe(28);
    expect(CNS5_NEARBY_STARS.every(({ distanceLy }) => distanceLy <= 12)).toBe(true);
    expect(CNS5_NEARBY_STARS.map(({ distanceLy }) => distanceLy)).toEqual(
      [...CNS5_NEARBY_STARS].map(({ distanceLy }) => distanceLy).sort((a, b) => a - b),
    );
    const proxima = CNS5_NEARBY_STARS.find(({ id }) => id === "proxima-centauri");
    expect(proxima?.distanceLy).toBeCloseTo(4.2465, 4);
    expect(proxima?.distanceLy).toBeCloseTo(
      lightYearsFromParallaxMas(proxima?.parallaxMas ?? 1),
      10,
    );
    expect(
      Math.hypot(
        proxima?.eclipticAu.x ?? 0,
        proxima?.eclipticAu.y ?? 0,
        proxima?.eclipticAu.z ?? 0,
      ) / AU_PER_LIGHT_YEAR,
    ).toBeCloseTo(proxima?.distanceLy ?? 0, 3);
  });

  it("derives every ecliptic vector from the sourced ICRS direction and parallax", () => {
    for (const star of CNS5_NEARBY_STARS) {
      expect(Math.hypot(star.eclipticLy.x, star.eclipticLy.y, star.eclipticLy.z)).toBeCloseTo(
        star.distanceLy,
        10,
      );
      expect(star.shell).toBe(star.distanceLy <= 10 ? "within-10-ly" : "10-to-12-ly");
    }
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
