import { describe, expect, it } from "vitest";
import { C_KMH, MILESTONES, PROXIMA_AU, VEHICLES } from "../mission-data";
import { VEHICLE_DOSSIERS } from "../vehicle-dossiers";

function wanderingEarth() {
  const vehicle = VEHICLES.find(({ id }) => id === "wandering-earth");
  if (!vehicle) throw new Error("Missing Wandering Earth vehicle");
  return vehicle;
}

describe("The Wandering Earth novel route", () => {
  it("launches the planet from Earth's real 1 AU position rather than the Sun", () => {
    const sequence = wanderingEarth().route.canonicalSequence;

    expect(sequence).toMatchObject({
      kind: "canon-sequence",
      continuity: "LIU CIXIN NOVEL",
      coordinateOrigin: { body: "sun" },
      launch: { body: "earth", au: 1 },
      target: {
        body: "proxima-centauri",
        au: PROXIMA_AU,
        arrivalYear: 2_400,
        captureEndYear: 2_500,
      },
      totalYears: 2_500,
    });
    expect(sequence?.launch.au).not.toBe(0);
    expect(sequence?.launch.label).toMatch(/EARTH IS THE VEHICLE.*1 AU/);
    expect(sequence?.coordinateOrigin.label).toMatch(/NOT THE LAUNCH POINT/);
  });

  it("records the fifteen-pass escape and planned Jupiter assist without claiming an ephemeris", () => {
    const sequence = wanderingEarth().route.canonicalSequence;
    const jupiter = MILESTONES.find(({ id }) => id === "jupiter");

    expect(sequence?.geometry).toBe("SCHEMATIC");
    expect(sequence?.escapeSequence).toEqual({
      orbitCount: 15,
      startYear: 42,
      endYear: 57,
      startAu: 1,
      finalAphelionAu: jupiter?.au,
      shapeProgression: "increasingly-eccentric",
      encounterBody: "jupiter",
      encounterKind: "planned-gravity-assist",
      evidence: "CANON SEQUENCE · ORBIT SHAPE SCHEMATIC",
    });
  });

  it("keeps canon sequence, schematic geometry and inferred timing explicit in every era", () => {
    const vehicle = wanderingEarth();
    const sequence = vehicle.route.canonicalSequence;
    if (!sequence) throw new Error("Missing canonical sequence");

    expect(sequence.stages.map(({ id, startYear, endYear }) => [id, startYear, endYear]))
      .toEqual([
        ["rotation-brake", 0, 42],
        ["solar-escape", 42, 57],
        ["jupiter-assist", 57, 57],
        ["interstellar-acceleration", 57, 557],
        ["interstellar-coast", 557, 1857],
        ["interstellar-deceleration", 1857, 2357],
        ["proxima-approach", 2357, 2400],
        ["proxima-capture", 2400, 2500],
      ]);
    expect(sequence.stages.every(({ evidence }) => evidence.length > 0)).toBe(true);
    expect(sequence.stages.find(({ id }) => id === "solar-escape")?.evidence)
      .toMatch(/CANON SEQUENCE.*SCHEMATIC GEOMETRY/);
    expect(sequence.stages.find(({ id }) => id === "proxima-approach")?.evidence)
      .toBe("INFERRED TIMING");
    expect(vehicle.maxSpeedKmh).toBe(C_KMH * 0.005);
    expect(vehicle.phases?.map(({ end }) => end)).toEqual([
      42 / 2_500,
      57 / 2_500,
      557 / 2_500,
      1_857 / 2_500,
      2_357 / 2_500,
      2_400 / 2_500,
      1,
    ]);
  });

  it("documents the novel continuity and its limits in the visible dossier", () => {
    const dossier = VEHICLE_DOSSIERS["wandering-earth"];
    const copy = [
      ...dossier.facts,
      dossier.missionSummary,
      dossier.canonicalNote,
    ].join(" ");

    expect(copy).toMatch(/12,000/);
    expect(copy).toMatch(/42-year/);
    expect(copy).toMatch(/fifteen|15/i);
    expect(copy).toMatch(/planned Jupiter gravity assist/i);
    expect(copy).toMatch(/2,500-year/);
    expect(copy).toMatch(/Proxima/i);
    expect(copy).toMatch(/schematic/i);
    expect(copy).not.toMatch(/displayed route follows the film continuity/i);
    expect(dossier.media.sourceUrl).toMatch(/bloomsbury\.com|macmillan\.com/);
  });
});
