import { describe, expect, it } from "vitest";
import { VEHICLES } from "../mission-data";
import {
  automaticCameraBand,
  buildCanonicalMapRoute,
  canonicalMapRoutePrefix,
  sampleCanonicalMapRoute,
} from "../space-map-controller";

const wanderingEarth = VEHICLES.find(({ id }) => id === "wandering-earth");

describe("Wandering Earth canonical map route", () => {
  it("expands a craft-centred true-linear camera at physical boundaries", () => {
    expect(automaticCameraBand(1).spanAu).toBe(14);
    expect(automaticCameraBand(40).spanAu).toBe(112);
    expect(automaticCameraBand(122).spanAu).toBe(380);
    expect(automaticCameraBand(2_000)).toMatchObject({
      id: "inner-oort",
      spanAu: 44_000,
    });
    expect(automaticCameraBand(7_516).id).toBe("inner-oort");
    expect(automaticCameraBand(19_999).id).toBe("inner-oort");
    expect(automaticCameraBand(20_000).id).toBe("outer-oort");
    expect(automaticCameraBand(100_000).spanAu)
      .toBeGreaterThan(220_000);
  });

  it("starts at Earth on the true 1 AU radius and never originates at the Sun", () => {
    expect(wanderingEarth).toBeTruthy();
    const route = buildCanonicalMapRoute(wanderingEarth!);
    expect(route).toBeTruthy();
    expect(Math.hypot(route!.launchPoint.x, route!.launchPoint.y)).toBeCloseTo(1, 10);
    expect(sampleCanonicalMapRoute(route!, 0)).toEqual(route!.launchPoint);
    expect(
      Math.min(...route!.points.map(({ x, y }) => Math.hypot(x, y))),
    ).toBeGreaterThan(0.95);
  });

  it("draws fifteen increasingly eccentric passes to a 5.2 AU planned Jupiter turn", () => {
    const route = buildCanonicalMapRoute(wanderingEarth!);
    expect(route?.solarPasses).toHaveLength(15);
    const aphelia = route!.solarPasses.map((pass) =>
      Math.max(...pass.map(({ x, y }) => Math.hypot(x, y))),
    );
    expect(aphelia.every((radius, index) => index === 0 || radius > aphelia[index - 1]!)).toBe(true);
    expect(aphelia.at(-1)).toBeCloseTo(5.2, 8);
    expect(Math.hypot(route!.jupiterPoint.x, route!.jupiterPoint.y)).toBeCloseTo(5.2, 10);
    expect(route!.jupiterProgress).toBeCloseTo(57 / 2_500, 12);
    expect(sampleCanonicalMapRoute(route!, route!.jupiterProgress)).toEqual(route!.jupiterPoint);
    expect(route!.evidence).toMatch(/CANON SEQUENCE.*SCHEMATIC/);
  });

  it("keeps route progress monotonic and splits travelled from future geometry", () => {
    const route = buildCanonicalMapRoute(wanderingEarth!);
    expect(route).toBeTruthy();
    expect(route!.points.every((point, index) =>
      index === 0 || point.routeProgress >= route!.points[index - 1]!.routeProgress,
    )).toBe(true);

    const halfwayThroughEscape = (42 + 7.5) / 2_500;
    const prefix = canonicalMapRoutePrefix(route!, halfwayThroughEscape);
    const sampled = sampleCanonicalMapRoute(route!, halfwayThroughEscape);
    expect(prefix.at(-1)?.x).toBeCloseTo(sampled.x, 10);
    expect(prefix.at(-1)?.y).toBeCloseTo(sampled.y, 10);
    expect(prefix.length).toBeGreaterThan(100);
    expect(prefix.length).toBeLessThan(route!.points.length);

    const complete = canonicalMapRoutePrefix(route!, 1);
    expect(complete.at(-1)).toEqual(route!.destinationPoint);
  });
});
