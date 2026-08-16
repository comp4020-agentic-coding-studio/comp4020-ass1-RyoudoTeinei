import horizonsJson from "./data/spacecraft-trajectories.json";
import {
  JULIAN_YEAR_SECONDS,
  buildPhysicalTimeline,
  physicalChapterDurationSeconds,
  samplePhysicalTimeline,
  type PhysicalChapterDefinition,
  type PhysicalChapterTiming,
  type PhysicalTimeline,
} from "./simulation-clock";
import {
  sampleMissionTour,
  type MissionTour,
  type MissionTourSample,
  type TourChapter,
} from "./mission-tour";

interface HorizonsSampleEndpoint {
  jdTdb: number;
}

interface HorizonsTrajectory {
  id: string;
  samples: HorizonsSampleEndpoint[];
}

interface HorizonsBundle {
  trajectories: HorizonsTrajectory[];
}

const HORIZONS = horizonsJson as HorizonsBundle;

/** A physical timeline whose segment indices deliberately match tour chapters. */
export interface MissionPhysicalTimeline extends PhysicalTimeline {
  vehicleId: string;
}

/**
 * The normal mission frame plus the literal elapsed time used to produce it.
 * Consumers can therefore keep using the existing route renderer while
 * displaying a cumulative clock that does not reset at chapter boundaries.
 */
export interface PhysicalMissionTourSample extends MissionTourSample {
  physicalElapsedSeconds: number;
  physicalElapsedYears: number;
  physicalProgress: number;
  totalPhysicalSeconds: number;
  complete: boolean;
}

function ephemerisTiming(trajectoryId: string): PhysicalChapterTiming {
  const trajectory = HORIZONS.trajectories.find(({ id }) => id === trajectoryId);
  const first = trajectory?.samples[0];
  const last = trajectory?.samples.at(-1);
  if (!trajectory || !first || !last) {
    throw new Error(`Missing JPL ephemeris endpoints for ${trajectoryId}.`);
  }
  return {
    kind: "ephemeris",
    startJulianDay: first.jdTdb,
    endJulianDay: last.jdTdb,
  };
}

function timingForChapter(chapter: TourChapter): PhysicalChapterTiming {
  if (chapter.id === "counterfactual-cut" || chapter.routeMode === "off-map") {
    return { kind: "instant" };
  }
  if (chapter.routeMode === "ephemeris") {
    if (!chapter.trajectoryId) {
      throw new Error(`Ephemeris chapter ${chapter.id} has no trajectory id.`);
    }
    return ephemerisTiming(chapter.trajectoryId);
  }
  if (
    chapter.elapsedStartYears !== undefined
    && chapter.elapsedEndYears !== undefined
  ) {
    return {
      kind: "elapsed-years",
      elapsedStartYears: chapter.elapsedStartYears,
      elapsedEndYears: chapter.elapsedEndYears,
    };
  }
  throw new Error(
    `Chapter ${chapter.id} for ${chapter.routeMode} has no physical timing.`,
  );
}

/**
 * Converts a mission tour into one continuous physical clock.
 *
 * Recorded missions use the first and last JPL TDB Julian days. Profile and
 * comparison legs use their elapsed-year endpoints. A counterfactual cut is a
 * zero-time boundary, so it remains in the chapter sequence without stealing
 * years from the mission. Tours that only explain an off-map/FTL route have no
 * finite physical timeline and return `undefined`.
 */
export function buildMissionPhysicalTimeline(
  tour: MissionTour,
): MissionPhysicalTimeline | undefined {
  const chapters: PhysicalChapterDefinition[] = tour.chapters.map(
    (chapter, index) => ({
      id: `${index}:${chapter.id}`,
      timing: timingForChapter(chapter),
    }),
  );
  if (!chapters.some(({ timing }) => physicalChapterDurationSeconds(timing) > 0)) {
    return undefined;
  }
  return {
    ...buildPhysicalTimeline(chapters),
    vehicleId: tour.vehicleId,
  };
}

function narrativeProgressForPhysicalSample(
  tour: MissionTour,
  chapterIndex: number,
  chapterProgress: number,
): number {
  const chapter = tour.chapters[chapterIndex];
  if (!chapter) {
    throw new RangeError(
      `Physical timeline chapter ${chapterIndex} is outside ${tour.vehicleId}.`,
    );
  }
  const elapsedBefore = tour.chapters
    .slice(0, chapterIndex)
    .reduce((sum, candidate) => sum + candidate.durationMs, 0);
  return (elapsedBefore + chapter.durationMs * chapterProgress)
    / tour.totalDurationMs;
}

/**
 * Samples the existing route/tour model from literal physical elapsed time.
 * At 1x, passing one additional elapsed second moves this frame by exactly one
 * second of mission time, irrespective of narrative chapter durations.
 */
export function sampleMissionTourAtPhysicalTime(
  tour: MissionTour,
  timeline: MissionPhysicalTimeline,
  physicalElapsedSeconds: number,
): PhysicalMissionTourSample {
  if (timeline.vehicleId !== tour.vehicleId) {
    throw new Error(
      `Physical timeline for ${timeline.vehicleId} cannot sample ${tour.vehicleId}.`,
    );
  }
  const physical = samplePhysicalTimeline(timeline, physicalElapsedSeconds);
  const tourProgress = narrativeProgressForPhysicalSample(
    tour,
    physical.segmentIndex,
    physical.segmentProgress,
  );
  return {
    ...sampleMissionTour(tour, tourProgress),
    physicalElapsedSeconds: physical.elapsedSeconds,
    physicalElapsedYears: physical.elapsedSeconds / JULIAN_YEAR_SECONDS,
    physicalProgress: physical.progress,
    totalPhysicalSeconds: timeline.totalSeconds,
    complete: physical.elapsedSeconds >= timeline.totalSeconds,
  };
}
