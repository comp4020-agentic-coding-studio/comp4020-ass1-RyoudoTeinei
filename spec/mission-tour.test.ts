import { describe, expect, it } from "vitest";
import { PROXIMA_AU, VEHICLES, totalTravelYears, type Vehicle } from "../mission-data";
import {
  buildMissionTour,
  hasFiniteDestinationEstimate,
  isProximaDistanceEquivalent,
  sampleMissionTour,
  type MissionTour,
  type TourChapterId,
} from "../mission-tour";

function vehicle(id: string): Vehicle {
  const match = VEHICLES.find((candidate) => candidate.id === id);
  if (!match) throw new Error(`Missing test vehicle: ${id}`);
  return match;
}

function progressInside(
  tour: MissionTour,
  chapterId: TourChapterId,
  localProgress = 0.5,
): number {
  const index = tour.chapters.findIndex(({ id }) => id === chapterId);
  if (index < 0) throw new Error(`Missing ${chapterId} chapter for ${tour.vehicleId}`);
  const elapsedBefore = tour.chapters
    .slice(0, index)
    .reduce((sum, chapter) => sum + chapter.durationMs, 0);
  const chapter = tour.chapters[index];
  if (!chapter) throw new Error(`Missing chapter index ${index}`);
  return (elapsedBefore + chapter.durationMs * localProgress) / tour.totalDurationMs;
}

describe("mission tour semantics", () => {
  it("keeps Parker's measured bound mission separate from the outward thought experiment", () => {
    const parker = vehicle("parker");
    const tour = buildMissionTour(parker);
    const ids = tour.chapters.map(({ id }) => id);

    expect(totalTravelYears(parker)).toBeUndefined();
    expect(ids[0]).toBe("mission");
    expect(ids[1]).toBe("counterfactual-cut");
    expect(tour.chapters[0]).toMatchObject({
      routeMode: "ephemeris",
      evidence: "MEASURED",
      trajectoryId: "parkerSolarProbe",
    });
    expect(tour.chapters[1]).toMatchObject({
      routeMode: "comparison",
      evidence: "COUNTERFACTUAL",
      discontinuity: true,
    });

    const actual = sampleMissionTour(tour, progressInside(tour, "mission"));
    const cut = sampleMissionTour(
      tour,
      progressInside(tour, "counterfactual-cut"),
    );
    const outward = sampleMissionTour(tour, progressInside(tour, "pluto"));
    expect(actual).toMatchObject({
      routeMode: "ephemeris",
      evidence: "MEASURED",
      trajectoryId: "parkerSolarProbe",
    });
    expect(actual.elapsedYears).toBeUndefined();
    expect(cut).toMatchObject({
      routeMode: "comparison",
      evidence: "COUNTERFACTUAL",
      currentAu: 0.046,
      elapsedYears: 0,
      speedKmh: 692_018,
    });
    expect(outward.evidence).toBe("COUNTERFACTUAL");
    expect(outward.currentAu).toBeGreaterThan(0.046);
  });

  it("continues Voyager along its last velocity and calls Proxima distance-equivalent only", () => {
    const voyager = vehicle("voyager");
    const tour = buildMissionTour(voyager);
    const onward = voyager.route.onward;

    expect(onward).toMatchObject({
      kind: "constant",
      start: "ephemeris-end",
      direction: { kind: "last-velocity" },
      destination: {
        kind: "distance-equivalent",
        label: "Proxima distance-equivalent",
        au: PROXIMA_AU,
      },
    });
    expect(tour.chapters[0]).toMatchObject({
      routeMode: "ephemeris",
      trajectoryId: "voyager1",
      evidence: "MEASURED",
    });
    expect(tour.chapters.some(({ id }) => id === "counterfactual-cut")).toBe(false);
    expect(tour.chapters.some(({ id }) => id === "pluto")).toBe(false);
    expect(tour.chapters.some(({ id }) => id === "heliopause")).toBe(false);
    expect(isProximaDistanceEquivalent(tour)).toBe(true);

    const destination = tour.chapters.at(-1);
    expect(destination?.id).toBe("destination");
    expect(destination?.title).toMatch(/DISTANCE-EQUIVALENT/);
    expect(destination?.destination?.kind).toBe("distance-equivalent");
    expect(destination?.direction?.kind).toBe("last-velocity");
    expect(destination?.evidence).toBe("COUNTERFACTUAL");
  });

  it("never assigns finite normal-space time to off-map and FTL vehicles", () => {
    for (const id of [
      "enterprise",
      "millennium-falcon",
      "warhammer",
      "droplet",
    ]) {
      const tour = buildMissionTour(vehicle(id));
      const sample = sampleMissionTour(tour, 0.5);
      expect(tour.playable, id).toBe(false);
      expect(tour.chapters, id).toHaveLength(1);
      expect(sample.routeMode, id).toBe("off-map");
      expect(sample.evidence, id).toBe("NOT COMPARABLE");
      expect(sample.currentAu, id).toBeUndefined();
      expect(sample.elapsedYears, id).toBeUndefined();
      expect(sample.speedKmh, id).toBeUndefined();
      expect(hasFiniteDestinationEstimate(tour), id).toBe(false);
    }
  });

  it("splits profile missions into true-distance boundary chapters", () => {
    const tour = buildMissionTour(vehicle("daedalus"));
    expect(tour.chapters.map(({ id }) => id)).toEqual([
      "mission",
      "heliopause",
      "inner-oort",
      "outer-oort",
      "destination",
    ]);

    const samples = tour.chapters.map(({ id }) =>
      sampleMissionTour(tour, progressInside(tour, id, 1)),
    );
    const distances = samples.map(({ currentAu }) => currentAu ?? -1);
    const elapsed = samples.map(({ elapsedYears }) => elapsedYears ?? -1);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(elapsed).toEqual([...elapsed].sort((a, b) => a - b));
    expect(distances.at(-1)).toBeCloseTo(PROXIMA_AU, 5);
    expect(samples.every(({ evidence }) => evidence === "DESIGN STUDY")).toBe(true);
  });

  it("plays Discovery's Jupiter mission before an explicit comparison continuation", () => {
    const discovery = vehicle("discovery");
    const tour = buildMissionTour(discovery);
    const sample = sampleMissionTour(tour, progressInside(tour, "mission", 0.5));

    expect(discovery.route.mission).toMatchObject({
      kind: "in-system-profile",
      targetBody: "jupiter",
      targetAu: 5.2,
    });
    expect(tour.playable).toBe(true);
    expect(tour.chapters.map(({ id }) => id)).toEqual([
      "mission",
      "counterfactual-cut",
      "pluto",
      "heliopause",
      "inner-oort",
      "outer-oort",
      "destination",
    ]);
    expect(tour.chapters[0]).toMatchObject({
      routeMode: "profile",
      endAu: 5.2,
      elapsedEndYears: 1.5,
      evidence: "FICTION / INFERRED",
    });
    expect(tour.chapters[1]).toMatchObject({
      id: "counterfactual-cut",
      routeMode: "comparison",
      evidence: "COUNTERFACTUAL",
      discontinuity: true,
    });
    expect(tour.chapters.at(-1)).toMatchObject({
      id: "destination",
      endAu: PROXIMA_AU,
      evidence: "COUNTERFACTUAL",
    });
    expect(sample.phase).toMatch(/HIBERNATION CRUISE/);
  });

  it("plays the selected Orion benchmark across every Solar System boundary", () => {
    const tour = buildMissionTour(vehicle("orion"));
    expect(tour.playable).toBe(true);
    expect(tour.chapters.map(({ id }) => id)).toEqual([
      "mission",
      "heliopause",
      "inner-oort",
      "outer-oort",
      "destination",
    ]);
    expect(tour.chapters.every(({ evidence }) => evidence === "DESIGN STUDY")).toBe(true);
    expect(tour.chapters.at(-1)?.endAu).toBeCloseTo(PROXIMA_AU, 5);
  });

  it("labels constant comparators as counterfactual at every boundary", () => {
    const tour = buildMissionTour(vehicle("f1"));
    expect(tour.playable).toBe(true);
    expect(tour.chapters.map(({ id }) => id)).toEqual([
      "pluto",
      "heliopause",
      "inner-oort",
      "outer-oort",
      "destination",
    ]);
    expect(tour.chapters.every(({ evidence }) => evidence === "COUNTERFACTUAL")).toBe(true);
    expect(hasFiniteDestinationEstimate(tour)).toBe(true);
  });

  it("is deterministic, clamps progress and does not mutate its inputs", () => {
    const parker = vehicle("parker");
    const vehicleBefore = JSON.stringify(parker);
    const first = buildMissionTour(parker);
    const second = buildMissionTour(parker);
    expect(second).toEqual(first);
    expect(sampleMissionTour(first, -3).tourProgress).toBe(0);
    expect(sampleMissionTour(first, 4).tourProgress).toBe(1);
    expect(JSON.stringify(parker)).toBe(vehicleBefore);
  });
});
