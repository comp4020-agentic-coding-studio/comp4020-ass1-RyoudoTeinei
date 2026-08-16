import { describe, expect, it } from "vitest";
import {
  JULIAN_YEAR_SECONDS,
  SECONDS_PER_DAY,
  SIMULATION_RATE_OPTIONS,
  advanceSimulationClock,
  buildPhysicalTimeline,
  physicalChapterDurationSeconds,
  samplePhysicalTimeline,
} from "../simulation-clock";

describe("physical simulation rates", () => {
  it("starts at literal real time and provides astronomical acceleration", () => {
    expect(SIMULATION_RATE_OPTIONS.map(({ multiplier }) => multiplier)).toEqual([
      1,
      60,
      3_600,
      SECONDS_PER_DAY,
      JULIAN_YEAR_SECONDS / 12,
      JULIAN_YEAR_SECONDS,
      JULIAN_YEAR_SECONDS * 100,
      JULIAN_YEAR_SECONDS * 1_000,
      JULIAN_YEAR_SECONDS * 10_000,
      JULIAN_YEAR_SECONDS * 100_000,
      JULIAN_YEAR_SECONDS * 1_000_000,
    ]);
    expect(SIMULATION_RATE_OPTIONS[0]?.label).toBe("1× · REAL TIME");
    expect(SIMULATION_RATE_OPTIONS.at(-1)?.paceLabel).toBe(
      "1,000,000 YEARS / SECOND",
    );
  });

  it("advances exactly one physical second per real second at 1x", () => {
    expect(advanceSimulationClock(12, 1, 1, 100)).toEqual({
      elapsedSeconds: 13,
      advancedSeconds: 1,
      progress: 0.13,
      complete: false,
    });
  });

  it.each([
    [60, 60],
    [3_600, 3_600],
    [SECONDS_PER_DAY, SECONDS_PER_DAY],
    [JULIAN_YEAR_SECONDS, JULIAN_YEAR_SECONDS],
    [JULIAN_YEAR_SECONDS * 1_000, JULIAN_YEAR_SECONDS * 1_000],
  ])("advances %s physical seconds per real second", (rate, expected) => {
    expect(
      advanceSimulationClock(0, 1, rate, JULIAN_YEAR_SECONDS * 2_000)
        .elapsedSeconds,
    ).toBe(expected);
  });

  it("clamps at mission completion", () => {
    expect(advanceSimulationClock(90, 1, 60, 100)).toEqual({
      elapsedSeconds: 100,
      advancedSeconds: 10,
      progress: 1,
      complete: true,
    });
    expect(advanceSimulationClock(-20, 0, 1, 100).elapsedSeconds).toBe(0);
  });

  it.each([0.5, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects a sub-real-time or invalid rate of %s",
    (rate) => {
      expect(() => advanceSimulationClock(0, 1, rate, 100)).toThrow(RangeError);
    },
  );
});

describe("non-uniform physical mission timelines", () => {
  it("derives ephemeris spans from Julian days and profiles from years", () => {
    expect(
      physicalChapterDurationSeconds({
        kind: "ephemeris",
        startJulianDay: 2_443_392.5,
        endJulianDay: 2_443_393.5,
      }),
    ).toBe(SECONDS_PER_DAY);
    expect(
      physicalChapterDurationSeconds({
        kind: "elapsed-years",
        elapsedStartYears: 3,
        elapsedEndYears: 5,
      }),
    ).toBe(JULIAN_YEAR_SECONDS * 2);
  });

  it("weights chapters by physical time rather than equal narrative beats", () => {
    const timeline = buildPhysicalTimeline([
      {
        id: "launch",
        timing: { kind: "duration-seconds", durationSeconds: 10 },
      },
      {
        id: "camera-cut",
        timing: { kind: "instant" },
      },
      {
        id: "cruise",
        timing: { kind: "duration-seconds", durationSeconds: 90 },
      },
    ]);

    expect(timeline.totalSeconds).toBe(100);
    expect(timeline.segments[0]?.normalizedEnd).toBe(0.1);
    expect(timeline.segments[1]?.normalizedStart).toBe(0.1);
    expect(timeline.segments[1]?.normalizedEnd).toBe(0.1);
    expect(timeline.segments[2]?.normalizedStart).toBe(0.1);

    const sample = samplePhysicalTimeline(timeline, 55);
    expect(sample.segment.id).toBe("cruise");
    expect(sample.segmentIndex).toBe(2);
    expect(sample.segmentProgress).toBe(0.5);
    expect(sample.progress).toBe(0.55);
  });

  it("clamps samples at both timeline boundaries", () => {
    const timeline = buildPhysicalTimeline([
      {
        id: "mission",
        timing: { kind: "elapsed-years", elapsedStartYears: 0, elapsedEndYears: 1 },
      },
    ]);

    expect(samplePhysicalTimeline(timeline, -1).progress).toBe(0);
    const end = samplePhysicalTimeline(timeline, JULIAN_YEAR_SECONDS * 2);
    expect(end.progress).toBe(1);
    expect(end.segmentProgress).toBe(1);
  });

  it("rejects reversed and durationless timelines", () => {
    expect(() =>
      physicalChapterDurationSeconds({
        kind: "elapsed-years",
        elapsedStartYears: 5,
        elapsedEndYears: 2,
      })
    ).toThrow(RangeError);
    expect(() => buildPhysicalTimeline([
      { id: "cut", timing: { kind: "instant" } },
    ])).toThrow(RangeError);
  });
});
