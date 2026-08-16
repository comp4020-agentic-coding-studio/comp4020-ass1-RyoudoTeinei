import {
  AU_KM,
  HOURS_PER_YEAR,
  PROXIMA_AU,
  journeyProgressAtAu,
  journeySample,
  totalTravelYears,
  type EphemerisTrajectoryId,
  type EvidenceLevel,
  type OnwardPath,
  type RouteDestination,
  type RouteDirection,
  type Vehicle,
} from "./mission-data";

export const PLUTO_MEAN_ORBIT_AU = 39.482;
export const HELIOPAUSE_AU = 122;
export const INNER_OORT_AU = 2_000;
export const OUTER_OORT_AU = 100_000;

export type TourChapterId =
  | "mission"
  | "counterfactual-cut"
  | "pluto"
  | "heliopause"
  | "inner-oort"
  | "outer-oort"
  | "destination"
  | "off-map";

export type TourRouteMode =
  | "ephemeris"
  | "profile"
  | "comparison"
  | "off-map";

export type TourCameraCue =
  | "mission"
  | "pluto"
  | "heliopause"
  | "inner-oort"
  | "outer-oort"
  | "destination"
  | "off-map";

export interface TourChapter {
  id: TourChapterId;
  title: string;
  note: string;
  durationMs: number;
  routeMode: TourRouteMode;
  evidence: EvidenceLevel;
  cameraCue: TourCameraCue;
  routeStart: number;
  routeEnd: number;
  startAu?: number;
  endAu?: number;
  elapsedStartYears?: number;
  elapsedEndYears?: number;
  speedKmh?: number;
  trajectoryId?: EphemerisTrajectoryId;
  direction?: RouteDirection;
  destination?: RouteDestination;
  discontinuity: boolean;
}

export interface MissionTour {
  vehicle: Vehicle;
  vehicleId: string;
  playable: boolean;
  chapters: TourChapter[];
  totalDurationMs: number;
  unavailableReason?: string;
}

export interface MissionTourSample {
  vehicleId: string;
  tourProgress: number;
  elapsedMs: number;
  chapterIndex: number;
  chapterProgress: number;
  chapter: TourChapter;
  routeMode: TourRouteMode;
  routeProgress: number;
  evidence: EvidenceLevel;
  currentAu?: number;
  elapsedYears?: number;
  speedKmh?: number;
  phase: string;
  trajectoryId?: EphemerisTrajectoryId;
  direction?: RouteDirection;
  destination?: RouteDestination;
}

interface DistanceStop {
  id: Exclude<TourChapterId, "mission" | "counterfactual-cut" | "off-map">;
  au: number;
  cameraCue: Exclude<TourCameraCue, "mission" | "off-map">;
  title: string;
  note: string;
  durationMs: number;
}

const DISTANCE_STOPS: readonly DistanceStop[] = [
  {
    id: "pluto",
    au: PLUTO_MEAN_ORBIT_AU,
    cameraCue: "pluto",
    title: "CROSS PLUTO'S MEAN ORBIT",
    note: "This is an orbital-radius crossing, not a Pluto flyby.",
    durationMs: 2_600,
  },
  {
    id: "heliopause",
    au: HELIOPAUSE_AU,
    cameraCue: "heliopause",
    title: "CROSS THE HELIOPAUSE",
    note: "The solar wind ends here; the Solar System does not.",
    durationMs: 2_600,
  },
  {
    id: "inner-oort",
    au: INNER_OORT_AU,
    cameraCue: "inner-oort",
    title: "ENTER THE INNER OORT REGION",
    note: "A model boundary, not a directly photographed shell.",
    durationMs: 2_800,
  },
  {
    id: "outer-oort",
    au: OUTER_OORT_AU,
    cameraCue: "outer-oort",
    title: "CLEAR THE OUTER OORT MODEL",
    note: "This conservative boundary is the explainer's Solar System exit.",
    durationMs: 3_200,
  },
] as const;

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function constantLegYears(speedKmh: number, originAu: number, currentAu: number): number {
  return Math.max(0, currentAu - originAu) * AU_KM / speedKmh / HOURS_PER_YEAR;
}

function destinationTitle(destination: RouteDestination): string {
  return destination.kind === "distance-equivalent"
    ? "REACH THE PROXIMA DISTANCE-EQUIVALENT"
    : `REACH ${destination.label.toUpperCase()}`;
}

function constantChapters(path: Extract<OnwardPath, { kind: "constant" }>): TourChapter[] {
  const originAu = path.startAu;
  const destinationAu = path.destination.au;
  const stops = DISTANCE_STOPS.filter(
    ({ au }) => au > originAu && au < destinationAu,
  );
  const endpoints: Array<DistanceStop | undefined> = [...stops, undefined];
  const chapters: TourChapter[] = [];
  let startAu = originAu;

  for (const stop of endpoints) {
    const endAu = stop?.au ?? destinationAu;
    const routeStart = clamp((startAu - originAu) / (destinationAu - originAu));
    const routeEnd = clamp((endAu - originAu) / (destinationAu - originAu));
    chapters.push({
      id: stop?.id ?? "destination",
      title: stop?.title ?? destinationTitle(path.destination),
      note: stop?.note ?? path.note,
      durationMs: stop?.durationMs ?? 3_600,
      routeMode: "comparison",
      evidence: path.evidence,
      cameraCue: stop?.cameraCue ?? "destination",
      routeStart,
      routeEnd,
      startAu,
      endAu,
      elapsedStartYears: constantLegYears(path.speedKmh, originAu, startAu),
      elapsedEndYears: constantLegYears(path.speedKmh, originAu, endAu),
      speedKmh: path.speedKmh,
      direction: path.direction,
      destination: path.destination,
      discontinuity: false,
    });
    startAu = endAu;
  }

  return chapters;
}

function profileChapters(vehicle: Vehicle): TourChapter[] {
  const mission = vehicle.route.mission;
  if (mission.kind !== "profile") return [];
  const totalYears = totalTravelYears(vehicle);
  if (totalYears === undefined) return [];
  const stops = DISTANCE_STOPS.filter(({ au }) => au < mission.targetAu);
  const endpoints: Array<DistanceStop | undefined> = [...stops, undefined];
  const chapters: TourChapter[] = [];
  let startAu = 1;
  let startProgress = 0;

  for (const [index, stop] of endpoints.entries()) {
    const endAu = stop?.au ?? mission.targetAu;
    const endProgress = journeyProgressAtAu(vehicle, endAu) ?? 1;
    chapters.push({
      id: index === 0 ? "mission" : stop?.id ?? "destination",
      title: index === 0
        ? `MISSION PROFILE · EARTH TO ${stop?.title.replace("CROSS ", "") ?? mission.targetLabel.toUpperCase()}`
        : stop?.title ?? `REACH ${mission.targetLabel.toUpperCase()}`,
      note: index === 0 ? mission.summary : stop?.note ?? mission.summary,
      durationMs: index === 0 ? 4_000 : stop?.durationMs ?? 3_600,
      routeMode: "profile",
      evidence: vehicle.evidence,
      cameraCue: stop?.cameraCue ?? "destination",
      routeStart: startProgress,
      routeEnd: endProgress,
      startAu,
      endAu,
      elapsedStartYears: totalYears * startProgress,
      elapsedEndYears: totalYears * endProgress,
      destination: {
        kind: "target",
        starId: mission.targetStarId,
        label: mission.targetLabel,
        au: mission.targetAu,
      },
      discontinuity: false,
    });
    startAu = endAu;
    startProgress = endProgress;
  }

  return chapters;
}

export function buildMissionTour(vehicle: Vehicle): MissionTour {
  const chapters: TourChapter[] = [];
  const mission = vehicle.route.mission;

  if (mission.kind === "off-map") {
    chapters.push({
      id: "off-map",
      title: "OFF THIS LINEAR MAP",
      note: mission.reason,
      durationMs: 2_800,
      routeMode: "off-map",
      evidence: "NOT COMPARABLE",
      cameraCue: "off-map",
      routeStart: 0,
      routeEnd: 0,
      discontinuity: false,
    });
  } else if (mission.kind === "ephemeris") {
    chapters.push({
      id: "mission",
      title: mission.outcome === "bound"
        ? "PLAY THE RECORDED BOUND MISSION"
        : "PLAY THE RECORDED OUTBOUND MISSION",
      note: mission.summary,
      durationMs: 5_400,
      routeMode: "ephemeris",
      evidence: "MEASURED",
      cameraCue: "mission",
      routeStart: 0,
      routeEnd: 1,
      trajectoryId: mission.trajectoryId,
      discontinuity: false,
    });
  } else if (mission.kind === "profile") {
    chapters.push(...profileChapters(vehicle));
  }

  const onward = vehicle.route.onward;
  if (onward.kind === "constant") {
    if (onward.discontinuity) {
      chapters.push({
        id: "counterfactual-cut",
        title: "COUNTERFACTUAL CUT",
        note: onward.note,
        durationMs: 1_600,
        routeMode: "comparison",
        evidence: "COUNTERFACTUAL",
        cameraCue: "mission",
        routeStart: 0,
        routeEnd: 0,
        startAu: onward.startAu,
        endAu: onward.startAu,
        elapsedStartYears: 0,
        elapsedEndYears: 0,
        speedKmh: onward.speedKmh,
        direction: onward.direction,
        destination: onward.destination,
        discontinuity: true,
      });
    }
    chapters.push(...constantChapters(onward));
  }

  if (chapters.length === 0) {
    const reason = vehicle.unavailableReason ?? "NO ROUTE PROFILE";
    chapters.push({
      id: "off-map",
      title: "NO FINITE ROUTE",
      note: reason,
      durationMs: 2_800,
      routeMode: "off-map",
      evidence: "NOT COMPARABLE",
      cameraCue: "off-map",
      routeStart: 0,
      routeEnd: 0,
      discontinuity: false,
    });
  }

  const playable = chapters.some(({ routeMode }) => routeMode !== "off-map");
  return {
    vehicle,
    vehicleId: vehicle.id,
    playable,
    chapters,
    totalDurationMs: chapters.reduce((sum, chapter) => sum + chapter.durationMs, 0),
    unavailableReason: playable
      ? undefined
      : vehicle.unavailableReason ?? chapters[0]?.note,
  };
}

export function sampleMissionTour(
  tour: MissionTour,
  tourProgress: number,
): MissionTourSample {
  const progress = clamp(tourProgress);
  const elapsedMs = progress * tour.totalDurationMs;
  let elapsedBefore = 0;
  let chapterIndex = tour.chapters.length - 1;
  let chapterProgress = 1;

  for (const [index, candidate] of tour.chapters.entries()) {
    const elapsedAfter = elapsedBefore + candidate.durationMs;
    if (elapsedMs < elapsedAfter || index === tour.chapters.length - 1) {
      chapterIndex = index;
      chapterProgress = candidate.durationMs <= 0
        ? 1
        : clamp((elapsedMs - elapsedBefore) / candidate.durationMs);
      break;
    }
    elapsedBefore = elapsedAfter;
  }

  const chapter = tour.chapters[chapterIndex];
  if (!chapter) throw new Error(`Mission tour for ${tour.vehicleId} has no chapters.`);
  const routeProgress = lerp(chapter.routeStart, chapter.routeEnd, chapterProgress);
  let currentAu: number | undefined;
  let elapsedYears: number | undefined;
  let speedKmh: number | undefined;
  let phase = chapter.title;

  if (chapter.routeMode === "profile") {
    const sample = journeySample(tour.vehicle, routeProgress);
    currentAu = sample.currentAu;
    elapsedYears = sample.elapsedYears;
    speedKmh = sample.speedKmh;
    phase = sample.phase;
  } else if (chapter.routeMode === "comparison") {
    if (chapter.startAu !== undefined && chapter.endAu !== undefined) {
      currentAu = lerp(chapter.startAu, chapter.endAu, chapterProgress);
    }
    if (
      chapter.elapsedStartYears !== undefined &&
      chapter.elapsedEndYears !== undefined
    ) {
      elapsedYears = lerp(
        chapter.elapsedStartYears,
        chapter.elapsedEndYears,
        chapterProgress,
      );
    }
    speedKmh = chapter.speedKmh;
  } else if (chapter.routeMode === "ephemeris") {
    phase = "RECORDED EPHEMERIS";
  } else {
    phase = "NOT COMPARABLE";
  }

  return {
    vehicleId: tour.vehicleId,
    tourProgress: progress,
    elapsedMs,
    chapterIndex,
    chapterProgress,
    chapter,
    routeMode: chapter.routeMode,
    routeProgress,
    evidence: chapter.evidence,
    currentAu,
    elapsedYears,
    speedKmh,
    phase,
    trajectoryId: chapter.trajectoryId,
    direction: chapter.direction,
    destination: chapter.destination,
  };
}

export function hasFiniteDestinationEstimate(tour: MissionTour): boolean {
  const lastChapter = tour.chapters.at(-1);
  return Boolean(
    tour.playable &&
    lastChapter?.id === "destination" &&
    Number.isFinite(lastChapter.elapsedEndYears),
  );
}

export function isProximaDistanceEquivalent(tour: MissionTour): boolean {
  return tour.chapters.some(
    ({ destination }) => destination?.kind === "distance-equivalent" && destination.au === PROXIMA_AU,
  );
}
