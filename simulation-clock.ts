export const SECONDS_PER_DAY = 86_400;
export const JULIAN_YEAR_SECONDS = 365.25 * SECONDS_PER_DAY;

export interface SimulationRateOption {
  /** Simulated seconds advanced by one real second. */
  multiplier: number;
  label: string;
  paceLabel: string;
}

/**
 * Physical-time presets. At 1x, one wall-clock second is exactly one second
 * inside the mission. Larger values are necessary because the same clock must
 * cover launch sequences, decades of ephemeris, and billion-year comparisons.
 */
export const SIMULATION_RATE_OPTIONS = [
  { multiplier: 1, label: "1× · REAL TIME", paceLabel: "1 SECOND / SECOND" },
  { multiplier: 60, label: "60×", paceLabel: "1 MINUTE / SECOND" },
  { multiplier: 3_600, label: "3,600×", paceLabel: "1 HOUR / SECOND" },
  { multiplier: SECONDS_PER_DAY, label: "86,400×", paceLabel: "1 DAY / SECOND" },
  {
    multiplier: JULIAN_YEAR_SECONDS / 12,
    label: "2.63M×",
    paceLabel: "1 MONTH / SECOND",
  },
  {
    multiplier: JULIAN_YEAR_SECONDS,
    label: "31.56M×",
    paceLabel: "1 YEAR / SECOND",
  },
  {
    multiplier: JULIAN_YEAR_SECONDS * 100,
    label: "3.16B×",
    paceLabel: "100 YEARS / SECOND",
  },
  {
    multiplier: JULIAN_YEAR_SECONDS * 1_000,
    label: "31.56B×",
    paceLabel: "1,000 YEARS / SECOND",
  },
  {
    multiplier: JULIAN_YEAR_SECONDS * 10_000,
    label: "315.58B×",
    paceLabel: "10,000 YEARS / SECOND",
  },
  {
    multiplier: JULIAN_YEAR_SECONDS * 100_000,
    label: "3.16T×",
    paceLabel: "100,000 YEARS / SECOND",
  },
  {
    multiplier: JULIAN_YEAR_SECONDS * 1_000_000,
    label: "31.56T×",
    paceLabel: "1,000,000 YEARS / SECOND",
  },
] as const satisfies readonly SimulationRateOption[];

function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite.`);
  }
}

function requireNonNegative(value: number, name: string): void {
  requireFinite(value, name);
  if (value < 0) throw new RangeError(`${name} must not be negative.`);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export interface SimulationClockAdvance {
  elapsedSeconds: number;
  advancedSeconds: number;
  progress: number;
  complete: boolean;
}

/**
 * Advances physical mission time from wall-clock time.
 *
 * `rateMultiplier` is deliberately literal: 1 means one simulated second for
 * one real second, 86,400 means one simulated day per real second, and so on.
 */
export function advanceSimulationClock(
  currentElapsedSeconds: number,
  realElapsedSeconds: number,
  rateMultiplier: number,
  totalPhysicalSeconds: number,
): SimulationClockAdvance {
  requireFinite(currentElapsedSeconds, "currentElapsedSeconds");
  requireNonNegative(realElapsedSeconds, "realElapsedSeconds");
  requireNonNegative(totalPhysicalSeconds, "totalPhysicalSeconds");
  requireFinite(rateMultiplier, "rateMultiplier");
  if (rateMultiplier < 1) {
    throw new RangeError("rateMultiplier must be at least 1× real time.");
  }

  const start = clamp(currentElapsedSeconds, 0, totalPhysicalSeconds);
  const simulatedDelta = realElapsedSeconds * rateMultiplier;
  if (!Number.isFinite(simulatedDelta)) {
    throw new RangeError("The simulated time advance must be finite.");
  }
  const elapsedSeconds = clamp(
    start + simulatedDelta,
    0,
    totalPhysicalSeconds,
  );

  return {
    elapsedSeconds,
    advancedSeconds: elapsedSeconds - start,
    progress: totalPhysicalSeconds === 0
      ? 1
      : elapsedSeconds / totalPhysicalSeconds,
    complete: elapsedSeconds >= totalPhysicalSeconds,
  };
}

export type PhysicalChapterTiming =
  | {
      /** The JPL samples' TDB Julian-day endpoints. */
      kind: "ephemeris";
      startJulianDay: number;
      endJulianDay: number;
    }
  | {
      /** Chapter-local elapsed-year endpoints used by profiles/comparisons. */
      kind: "elapsed-years";
      elapsedStartYears: number;
      elapsedEndYears: number;
    }
  | {
      kind: "duration-seconds";
      durationSeconds: number;
    }
  | {
      /** A narrative/camera boundary that consumes no fictional physical time. */
      kind: "instant";
    };

export interface PhysicalChapterDefinition {
  id: string;
  timing: PhysicalChapterTiming;
}

export interface PhysicalTimelineSegment extends PhysicalChapterDefinition {
  index: number;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  normalizedStart: number;
  normalizedEnd: number;
}

export interface PhysicalTimeline {
  segments: readonly PhysicalTimelineSegment[];
  totalSeconds: number;
}

export interface PhysicalTimelineSample {
  elapsedSeconds: number;
  progress: number;
  segmentIndex: number;
  segment: PhysicalTimelineSegment;
  segmentProgress: number;
}

export function physicalChapterDurationSeconds(
  timing: PhysicalChapterTiming,
): number {
  switch (timing.kind) {
    case "ephemeris": {
      requireFinite(timing.startJulianDay, "startJulianDay");
      requireFinite(timing.endJulianDay, "endJulianDay");
      if (timing.endJulianDay < timing.startJulianDay) {
        throw new RangeError("endJulianDay must not precede startJulianDay.");
      }
      return (timing.endJulianDay - timing.startJulianDay) * SECONDS_PER_DAY;
    }
    case "elapsed-years": {
      requireFinite(timing.elapsedStartYears, "elapsedStartYears");
      requireFinite(timing.elapsedEndYears, "elapsedEndYears");
      if (timing.elapsedEndYears < timing.elapsedStartYears) {
        throw new RangeError(
          "elapsedEndYears must not precede elapsedStartYears.",
        );
      }
      return (
        timing.elapsedEndYears - timing.elapsedStartYears
      ) * JULIAN_YEAR_SECONDS;
    }
    case "duration-seconds":
      requireNonNegative(timing.durationSeconds, "durationSeconds");
      return timing.durationSeconds;
    case "instant":
      return 0;
  }
}

/**
 * Builds a continuous physical clock from non-uniform chapters.
 *
 * The chapter's real/fictional duration, rather than a UI animation duration,
 * determines its share of the timeline. Instant story cards remain available
 * as boundary markers but do not distort the clock.
 */
export function buildPhysicalTimeline(
  chapters: readonly PhysicalChapterDefinition[],
): PhysicalTimeline {
  if (chapters.length === 0) {
    throw new RangeError("A physical timeline needs at least one chapter.");
  }

  const durations = chapters.map(({ timing }) =>
    physicalChapterDurationSeconds(timing)
  );
  const totalSeconds = durations.reduce((sum, duration) => sum + duration, 0);
  if (totalSeconds <= 0) {
    throw new RangeError(
      "A physical timeline needs at least one positive-duration chapter.",
    );
  }

  let elapsedSeconds = 0;
  const segments = chapters.map((chapter, index): PhysicalTimelineSegment => {
    const durationSeconds = durations[index] ?? 0;
    const startSeconds = elapsedSeconds;
    const endSeconds = startSeconds + durationSeconds;
    elapsedSeconds = endSeconds;
    return {
      ...chapter,
      index,
      startSeconds,
      endSeconds,
      durationSeconds,
      normalizedStart: startSeconds / totalSeconds,
      normalizedEnd: endSeconds / totalSeconds,
    };
  });

  return { segments, totalSeconds };
}

/** Locates physical elapsed time within a non-uniform mission timeline. */
export function samplePhysicalTimeline(
  timeline: PhysicalTimeline,
  elapsedSeconds: number,
): PhysicalTimelineSample {
  requireNonNegative(timeline.totalSeconds, "timeline.totalSeconds");
  if (timeline.totalSeconds <= 0 || timeline.segments.length === 0) {
    throw new RangeError("Cannot sample an empty physical timeline.");
  }
  requireFinite(elapsedSeconds, "elapsedSeconds");
  const elapsed = clamp(elapsedSeconds, 0, timeline.totalSeconds);
  const positiveSegments = timeline.segments.filter(
    ({ durationSeconds }) => durationSeconds > 0,
  );
  const segment = positiveSegments.find(({ endSeconds }) => elapsed < endSeconds)
    ?? positiveSegments.at(-1);
  if (!segment) {
    throw new RangeError("Cannot sample a timeline without physical duration.");
  }
  const segmentProgress = clamp(
    (elapsed - segment.startSeconds) / segment.durationSeconds,
    0,
    1,
  );

  return {
    elapsedSeconds: elapsed,
    progress: elapsed / timeline.totalSeconds,
    segmentIndex: segment.index,
    segment,
    segmentProgress,
  };
}
