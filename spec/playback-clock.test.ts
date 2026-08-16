import { describe, expect, it } from "vitest";
import { advanceTourProgress } from "../playback-clock";

describe("guided-tour playback clock", () => {
  it.each([
    [0.25, 0.0625],
    [0.5, 0.125],
    [1, 0.25],
    [2, 0.5],
    [4, 1],
    [8, 1],
  ])("advances at %sx playback", (playbackRate, expected) => {
    expect(advanceTourProgress(0, 2_000, 8_000, playbackRate)).toBe(expected);
  });

  it("advances only the remaining portion when playback resumes", () => {
    expect(advanceTourProgress(0.5, 2_000, 8_000, 2)).toBe(0.75);
  });

  it("clamps both the starting value and the result to normalized progress", () => {
    expect(advanceTourProgress(-2, 0, 8_000, 1)).toBe(0);
    expect(advanceTourProgress(2, 4_000, 8_000, 1)).toBe(1);
    expect(advanceTourProgress(0.75, 99_000, 8_000, 8)).toBe(1);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid duration of %s",
    (durationMs) => {
      expect(() => advanceTourProgress(0, 100, durationMs, 1)).toThrow(
        RangeError,
      );
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid playback rate of %s",
    (playbackRate) => {
      expect(() => advanceTourProgress(0, 100, 1_000, playbackRate)).toThrow(
        RangeError,
      );
    },
  );

  it("rejects non-finite or negative clock samples", () => {
    expect(() => advanceTourProgress(Number.NaN, 0, 1_000, 1)).toThrow(
      RangeError,
    );
    expect(() => advanceTourProgress(0, Number.NaN, 1_000, 1)).toThrow(
      RangeError,
    );
    expect(() => advanceTourProgress(0, -1, 1_000, 1)).toThrow(RangeError);
  });
});
