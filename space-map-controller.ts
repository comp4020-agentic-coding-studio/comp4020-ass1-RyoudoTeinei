import horizonsJson from "./data/spacecraft-trajectories.json";
import {
  AU_PER_LIGHT_YEAR,
  CNS5_NEARBY_STARS,
  type Cns5NearbyStarRecord,
} from "./space-data";
import {
  boundsOf,
  eclipticLatitudeDegrees,
  fitBounds,
  worldToScreen,
  zoomAt,
  type Bounds,
  type Camera,
  type Vec2,
  type Viewport,
} from "./space-map";
import {
  AU_KM,
  formatDistance,
  journeySample,
  type Vehicle,
} from "./mission-data";
import {
  sampleStateAtProgress,
  trajectoryPrefix,
  type JplStateVector,
} from "./trajectory-math";
import type { MissionTourSample, TourCameraCue } from "./mission-tour";

const PROXIMA_ID = "proxima-centauri";
const BARNARD_ID = "barnards-star";
const OUTER_OORT_AU = 100_000;
const INNER_OORT_AU = 2_000;
const HELIOPAUSE_AU = 121.6;

export interface AutomaticCameraBand {
  id: "inner-system" | "planetary" | "heliopause" | "inner-oort" | "outer-oort" | "interstellar";
  label: string;
  spanAu: number;
}

/** Fixed true-linear view ranges. Crossing a boundary expands the view; the
 * craft remains the centre and no logarithmic coordinate distortion is used. */
export function automaticCameraBand(
  radialAu: number,
): AutomaticCameraBand {
  if (radialAu >= OUTER_OORT_AU) {
    return { id: "interstellar", label: "INTERSTELLAR RANGE", spanAu: AU_PER_LIGHT_YEAR * 6 };
  }
  if (radialAu >= 20_000) {
    return { id: "outer-oort", label: "OUTER OORT RANGE", spanAu: 220_000 };
  }
  if (radialAu >= INNER_OORT_AU) {
    return { id: "inner-oort", label: "INNER OORT RANGE · 2,000–20,000 AU", spanAu: 44_000 };
  }
  if (radialAu >= HELIOPAUSE_AU) {
    return { id: "heliopause", label: "HELIOPAUSE RANGE", spanAu: 380 };
  }
  if (radialAu >= 8) {
    return { id: "planetary", label: "OUTER PLANETARY RANGE", spanAu: 112 };
  }
  return { id: "inner-system", label: "INNER SOLAR SYSTEM RANGE", spanAu: 14 };
}

interface HorizonsSample extends JplStateVector {}

interface HorizonsTrajectory {
  id: string;
  name: string;
  samples: HorizonsSample[];
}

interface HorizonsBundle {
  queriedAt: string;
  coordinateFrame: Record<string, string>;
  trajectories: HorizonsTrajectory[];
}

export interface SpaceMapController {
  setVehicle(vehicle: Vehicle, focus?: boolean): void;
  setProgress(progress: number): MapTelemetry;
  setTourFrame(frame: MissionTourSample): MapTelemetry;
  setPlaybackActive(active: boolean): void;
  resetView(): void;
  destroy(): void;
}

export interface MapTelemetry {
  mode: "ephemeris" | "model" | "unavailable";
  date?: string;
  elapsedYears?: number;
  speedKmh?: number;
  radialAu: number;
}

const HORIZONS = horizonsJson as HorizonsBundle;

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required map element not found: ${selector}`);
  return element;
}

function starWorld(star: Cns5NearbyStarRecord): Vec2 {
  return { x: star.eclipticAu.x, y: star.eclipticAu.y };
}

function starById(id: string): Cns5NearbyStarRecord {
  const star = CNS5_NEARBY_STARS.find((candidate) => candidate.id === id);
  if (!star) throw new Error(`Missing catalogue star: ${id}`);
  return star;
}

export interface CanonicalMapRoutePoint extends Vec2 {
  routeProgress: number;
  leg: "braking" | "solar-pass" | "jupiter-assist" | "outbound";
}

export interface CanonicalMapRoute {
  points: CanonicalMapRoutePoint[];
  solarPasses: CanonicalMapRoutePoint[][];
  launchPoint: Vec2;
  jupiterPoint: Vec2;
  destinationPoint: Vec2;
  jupiterProgress: number;
  evidence: string;
}

function normalised(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function rotated(vector: Vec2, angle: number): Vec2 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine,
  };
}

/**
 * Build the novel-continuity Wandering Earth route in the same true-linear AU
 * coordinate space as every other map object. The sequence is canonical; its
 * unsupplied orbital elements and position angles are deliberately schematic.
 */
export function buildCanonicalMapRoute(vehicle: Vehicle): CanonicalMapRoute | undefined {
  const sequence = vehicle.route.canonicalSequence;
  const totalYears = vehicle.totalYears;
  if (!sequence || !totalYears || totalYears <= 0) return undefined;

  const target = starById(sequence.target.body);
  const destinationPoint = starWorld(target);
  const targetDirection = normalised(destinationPoint);
  // The novel does not specify an ecliptic departure longitude. Rotating the
  // schematic major axis keeps the true 1 AU launch visibly distinct from the
  // Sun while leaving every radius and catalogue destination on one AU scale.
  const majorAxis = rotated(targetDirection, Math.PI * 0.42);
  const minorAxis = { x: -majorAxis.y, y: majorAxis.x };
  const launchPoint = {
    x: majorAxis.x * sequence.launch.au,
    y: majorAxis.y * sequence.launch.au,
  };
  const escapeStart = sequence.escapeSequence.startYear / totalYears;
  const jupiterProgress = sequence.escapeSequence.endYear / totalYears;
  const orbitCount = sequence.escapeSequence.orbitCount;
  const points: CanonicalMapRoutePoint[] = [
    { ...launchPoint, routeProgress: 0, leg: "braking" },
    { ...launchPoint, routeProgress: escapeStart, leg: "braking" },
  ];
  const solarPasses: CanonicalMapRoutePoint[][] = [];

  for (let orbitIndex = 0; orbitIndex < orbitCount; orbitIndex += 1) {
    const fraction = (orbitIndex + 1) / orbitCount;
    const aphelionAu = sequence.escapeSequence.startAu +
      (sequence.escapeSequence.finalAphelionAu - sequence.escapeSequence.startAu) * fraction ** 1.35;
    const perihelionAu = sequence.escapeSequence.startAu;
    const semiMajor = (perihelionAu + aphelionAu) / 2;
    const eccentricity = (aphelionAu - perihelionAu) / (aphelionAu + perihelionAu);
    const semiMinor = semiMajor * Math.sqrt(1 - eccentricity * eccentricity);
    // Fourteen complete passes return to perihelion. The fifteenth ends at
    // aphelion, where the displayed planned Jupiter encounter takes place.
    const sweep = orbitIndex === orbitCount - 1 ? Math.PI : Math.PI * 2;
    const segments = orbitIndex === orbitCount - 1 ? 72 : 112;
    const pass: CanonicalMapRoutePoint[] = [];
    for (let step = 0; step <= segments; step += 1) {
      const local = step / segments;
      const eccentricAnomaly = sweep * local;
      const alongMajor = semiMajor * (Math.cos(eccentricAnomaly) - eccentricity);
      const alongMinor = semiMinor * Math.sin(eccentricAnomaly);
      const routeProgress = escapeStart +
        (jupiterProgress - escapeStart) * (orbitIndex + local) / orbitCount;
      pass.push({
        x: majorAxis.x * alongMajor + minorAxis.x * alongMinor,
        y: majorAxis.y * alongMajor + minorAxis.y * alongMinor,
        routeProgress,
        leg: "solar-pass",
      });
    }
    solarPasses.push(pass);
    points.push(...pass);
  }

  const jupiterPoint = {
    x: -majorAxis.x * sequence.escapeSequence.finalAphelionAu,
    y: -majorAxis.y * sequence.escapeSequence.finalAphelionAu,
  };
  points.push({ ...jupiterPoint, routeProgress: jupiterProgress, leg: "jupiter-assist" });

  const assistSample = journeySample(vehicle, jupiterProgress);
  const remainingFraction = Math.max(Number.EPSILON, 1 - assistSample.distanceFraction);
  const outboundDirection = normalised({
    x: destinationPoint.x - jupiterPoint.x,
    y: destinationPoint.y - jupiterPoint.y,
  });
  // Tangent at the displayed fifteenth-pass aphelion. A short decaying offset
  // makes the planned gravity-assist turn legible at planetary scale, without
  // claiming a numerical flyby solution.
  const incomingTangent = { x: minorAxis.x, y: minorAxis.y };
  const targetDistance = Math.hypot(
    destinationPoint.x - jupiterPoint.x,
    destinationPoint.y - jupiterPoint.y,
  );
  const outboundSamples = 420;
  for (let index = 1; index <= outboundSamples; index += 1) {
    const routeProgress = jupiterProgress + (1 - jupiterProgress) * index / outboundSamples;
    const sample = journeySample(vehicle, routeProgress);
    const distanceFraction = Math.max(
      0,
      Math.min(1, (sample.distanceFraction - assistSample.distanceFraction) / remainingFraction),
    );
    const distanceAlong = targetDistance * distanceFraction;
    const tangentOffset = 0.72 * (1 - Math.exp(-distanceAlong / 0.28)) * Math.exp(-distanceAlong / 3.2);
    points.push({
      x: jupiterPoint.x + outboundDirection.x * distanceAlong + incomingTangent.x * tangentOffset,
      y: jupiterPoint.y + outboundDirection.y * distanceAlong + incomingTangent.y * tangentOffset,
      routeProgress,
      leg: "outbound",
    });
  }
  const last = points.at(-1);
  if (last) {
    last.x = destinationPoint.x;
    last.y = destinationPoint.y;
    last.routeProgress = 1;
  }

  return {
    points,
    solarPasses,
    launchPoint,
    jupiterPoint,
    destinationPoint,
    jupiterProgress,
    evidence: sequence.escapeSequence.evidence,
  };
}

export function sampleCanonicalMapRoute(route: CanonicalMapRoute, progress: number): Vec2 {
  const amount = Math.max(0, Math.min(1, progress));
  let previous = route.points[0];
  if (!previous) return route.launchPoint;
  for (const point of route.points.slice(1)) {
    if (point.routeProgress < amount) {
      previous = point;
      continue;
    }
    const span = point.routeProgress - previous.routeProgress;
    if (span <= Number.EPSILON) {
      previous = point;
      continue;
    }
    const local = Math.max(0, Math.min(1, (amount - previous.routeProgress) / span));
    return {
      x: previous.x + (point.x - previous.x) * local,
      y: previous.y + (point.y - previous.y) * local,
    };
  }
  return { x: route.destinationPoint.x, y: route.destinationPoint.y };
}

export function canonicalMapRoutePrefix(route: CanonicalMapRoute, progress: number): Vec2[] {
  const amount = Math.max(0, Math.min(1, progress));
  const prefix: Vec2[] = [];
  let previous = route.points[0];
  if (!previous) return [route.launchPoint];
  prefix.push({ x: previous.x, y: previous.y });
  for (const point of route.points.slice(1)) {
    if (point.routeProgress <= amount) {
      prefix.push({ x: point.x, y: point.y });
      previous = point;
      continue;
    }
    const span = point.routeProgress - previous.routeProgress;
    if (span > Number.EPSILON) {
      const local = Math.max(0, Math.min(1, (amount - previous.routeProgress) / span));
      prefix.push({
        x: previous.x + (point.x - previous.x) * local,
        y: previous.y + (point.y - previous.y) * local,
      });
    }
    break;
  }
  return prefix;
}

const CANONICAL_MAP_ROUTE_CACHE = new WeakMap<Vehicle, CanonicalMapRoute | undefined>();

function canonicalMapRoute(vehicle: Vehicle | undefined): CanonicalMapRoute | undefined {
  if (!vehicle) return undefined;
  if (CANONICAL_MAP_ROUTE_CACHE.has(vehicle)) return CANONICAL_MAP_ROUTE_CACHE.get(vehicle);
  const route = buildCanonicalMapRoute(vehicle);
  CANONICAL_MAP_ROUTE_CACHE.set(vehicle, route);
  return route;
}

function sampleTrajectory(trajectory: HorizonsTrajectory, progress: number): HorizonsSample {
  return sampleStateAtProgress(trajectory.samples, progress);
}

function niceStep(raw: number): number {
  const exponent = 10 ** Math.floor(Math.log10(Math.max(raw, Number.EPSILON)));
  const fraction = raw / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

function formatScaleDistance(au: number): string {
  if (au >= AU_PER_LIGHT_YEAR * 0.1) {
    return `${(au / AU_PER_LIGHT_YEAR).toLocaleString("en-AU", { maximumFractionDigits: 2 })} LY`;
  }
  if (au >= 1_000) return `${Math.round(au).toLocaleString("en-AU")} AU`;
  if (au >= 1) return `${au.toLocaleString("en-AU", { maximumFractionDigits: 1 })} AU`;
  return `${au.toLocaleString("en-AU", { maximumSignificantDigits: 2 })} AU`;
}

function expandedBounds(points: Vec2[], marginAu: number): Bounds {
  const bounds = boundsOf(points);
  return {
    minX: bounds.minX - marginAu,
    maxX: bounds.maxX + marginAu,
    minY: bounds.minY - marginAu,
    maxY: bounds.maxY + marginAu,
  };
}

interface CanvasMapElements {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  scope: HTMLElement;
  scale: HTMLElement;
  resolution: HTMLElement;
  coordinate: HTMLElement;
  thesis: HTMLElement;
  tooltip?: HTMLElement;
  story?: HTMLElement;
  clock?: HTMLElement;
  scaleRule?: HTMLElement;
  scaleLabel?: HTMLElement;
  selectionName?: HTMLElement;
  selectionMeta?: HTMLElement;
  selectionDescription?: HTMLElement;
  controls: HTMLButtonElement[];
}

interface CanvasMapEntity {
  id: string;
  kind: "star" | "planet" | "craft" | "trajectory" | "boundary" | "origin";
  name: string;
  meta: string;
  description: string;
  world?: Vec2;
  focusSpanAu?: number;
}

type CanvasHit =
  | { type: "point"; entity: CanvasMapEntity; point: Vec2; radius: number; priority: number }
  | { type: "ring"; entity: CanvasMapEntity; centre: Vec2; radius: number; tolerance: number; priority: number }
  | { type: "annulus"; entity: CanvasMapEntity; centre: Vec2; inner: number; outer: number; priority: number }
  | { type: "path"; entity: CanvasMapEntity; points: Vec2[]; tolerance: number; priority: number };

interface CanvasLabel {
  anchor: Vec2;
  lines: string[];
  priority: number;
  color: string;
  placements?: Vec2[];
  leader?: {
    color: string;
    dash?: number[];
    marker?: "diamond" | "ring" | "square";
  };
}

interface CanvasPlanet {
  id: string;
  name: string;
  orbitAu: number;
  color: string;
}

const CANVAS_PLANETS: readonly CanvasPlanet[] = [
  { id: "mercury", name: "Mercury", orbitAu: 0.3871, color: "#b9b5a9" },
  { id: "venus", name: "Venus", orbitAu: 0.7233, color: "#e5bd78" },
  { id: "earth", name: "Earth", orbitAu: 1, color: "#6adfff" },
  { id: "mars", name: "Mars", orbitAu: 1.5237, color: "#f36a3d" },
  { id: "jupiter", name: "Jupiter", orbitAu: 5.2026, color: "#e6bc8a" },
  { id: "saturn", name: "Saturn", orbitAu: 9.5549, color: "#e7d19a" },
  { id: "uranus", name: "Uranus", orbitAu: 19.2184, color: "#8edce7" },
  { id: "neptune", name: "Neptune", orbitAu: 30.1104, color: "#648ef0" },
] as const;

function optionalElement<T extends Element>(selector: string): T | undefined {
  return document.querySelector<T>(selector) ?? undefined;
}

function canvasDistanceToSegment(point: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  const amount = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return Math.hypot(point.x - a.x - dx * amount, point.y - a.y - dy * amount);
}

function canvasBackdrop(): Array<{ u: number; v: number; radius: number; alpha: number; warm: boolean }> {
  let seed = 0x4020_51a7;
  const random = (): number => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  return Array.from({ length: 220 }, () => ({
    u: random(),
    v: random(),
    radius: 0.35 + random() * 1.05,
    alpha: 0.1 + random() * 0.4,
    warm: random() > 0.9,
  }));
}

export function createSpaceMapController(): SpaceMapController {
  const canvas = required<HTMLCanvasElement>("#space-map");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");
  const elements: CanvasMapElements = {
    canvas,
    context,
    scope: required("#map-scope"),
    scale: required("#map-scale"),
    resolution: required("#map-resolution"),
    coordinate: required("#map-coordinate"),
    thesis: required("#map-thesis"),
    tooltip: optionalElement("#map-tooltip"),
    story: optionalElement("#tour-story"),
    clock: optionalElement(".map-clock-panel"),
    scaleRule: optionalElement("#map-scale-rule"),
    scaleLabel: optionalElement("#map-scale-label"),
    selectionName: optionalElement("#map-selection-name"),
    selectionMeta: optionalElement("#map-selection-meta"),
    selectionDescription: optionalElement("#map-selection-description"),
    controls: Array.from(document.querySelectorAll<HTMLButtonElement>("[data-map-action]")),
  };
  const voyager = HORIZONS.trajectories.find(({ id }) => id === "voyager1");
  const parker = HORIZONS.trajectories.find(({ id }) => id === "parkerSolarProbe");
  if (!voyager || !parker) throw new Error("Missing vendored JPL trajectories.");

  const backdrop = canvasBackdrop();
  let viewport: Viewport = { width: 1_200, height: 700 };
  let camera: Camera = { centerAu: { x: 0, y: 0 }, pxPerAu: 0.001 };
  let selectedVehicle: Vehicle | undefined;
  let progress = 0;
  let tourFrame: MissionTourSample | undefined;
  let cameraTransition: { chapterIndex: number; from: Camera; to: Camera } | undefined;
  let followCraft = true;
  let initialized = false;
  let dpr = 1;
  let playbackActive = false;
  let destroyed = false;
  let queued = false;
  let animationFrame = 0;
  let dragMoved = false;
  let hovered: CanvasMapEntity | undefined;
  let selected: CanvasMapEntity | undefined;
  let craftReadout = "SUN · 0 AU";
  let hits: CanvasHit[] = [];
  let labels: CanvasLabel[] = [];
  let occupiedLabels: Bounds[] = [];
  let reservedOverlayBounds: Bounds[] = [];
  const pointers = new Map<number, Vec2>();
  const pointerStarts = new Map<number, Vec2>();

  function updateText(element: HTMLElement, value: string): void {
    if (element.textContent !== value) element.textContent = value;
  }

  function catalogueBounds(): Bounds {
    return expandedBounds(CNS5_NEARBY_STARS.map(starWorld), AU_PER_LIGHT_YEAR * 0.4);
  }

  function fullRouteBounds(): Bounds {
    const target = starWorld(starById(PROXIMA_ID));
    return expandedBounds(
      [{ x: -OUTER_OORT_AU, y: -OUTER_OORT_AU }, { x: OUTER_OORT_AU, y: OUTER_OORT_AU }, { x: 0, y: 0 }, target],
      35_000,
    );
  }

  function schedule(): void {
    if (queued || destroyed) return;
    queued = true;
    animationFrame = requestAnimationFrame(() => {
      queued = false;
      render();
    });
  }

  function actualTrajectory(vehicle = selectedVehicle): HorizonsTrajectory | undefined {
    if (vehicle?.id === "voyager") return voyager;
    if (vehicle?.id === "parker") return parker;
    return undefined;
  }

  function targetStar(vehicle = selectedVehicle): Cns5NearbyStarRecord | undefined {
    if (!vehicle) return undefined;
    const mission = vehicle.route.mission;
    if (mission.kind === "profile") return starById(mission.targetStarId);
    const onward = vehicle.route.onward;
    if (onward.kind === "constant" && onward.destination.kind === "target") {
      return starById(onward.destination.starId);
    }
    if (!vehicle.phases?.length || vehicle.outbound === false) return undefined;
    return starById(vehicle.id === "daedalus" ? BARNARD_ID : PROXIMA_ID);
  }

  const trajectoryPointCache = new WeakMap<HorizonsTrajectory, Vec2[]>();
  const canonicalPointCache = new WeakMap<CanonicalMapRoute, Vec2[]>();

  function trajectoryPoints(trajectory: HorizonsTrajectory): Vec2[] {
    const cached = trajectoryPointCache.get(trajectory);
    if (cached) return cached;
    const points = trajectory.samples.map(({ x, y }) => ({ x, y }));
    trajectoryPointCache.set(trajectory, points);
    return points;
  }

  function canonicalRoutePoints(route: CanonicalMapRoute): Vec2[] {
    const cached = canonicalPointCache.get(route);
    if (cached) return cached;
    const points = route.points.map(({ x, y }) => ({ x, y }));
    canonicalPointCache.set(route, points);
    return points;
  }

  function unit(vector: Vec2): Vec2 {
    const length = Math.hypot(vector.x, vector.y) || 1;
    return { x: vector.x / length, y: vector.y / length };
  }

  function comparisonPoint(frame: MissionTourSample, distanceAu = frame.currentAu ?? 0): Vec2 {
    if (frame.direction?.kind === "last-velocity") {
      const trajectory = actualTrajectory();
      const last = trajectory?.samples.at(-1);
      if (last) {
        const direction = unit({ x: last.vx, y: last.vy });
        const originAu = frame.chapter.startAu ?? Math.hypot(last.x, last.y, last.z);
        const travelledAu = Math.max(0, distanceAu - originAu);
        return { x: last.x + direction.x * travelledAu, y: last.y + direction.y * travelledAu };
      }
    }
    const target = frame.destination?.kind === "target"
      ? starById(frame.destination.starId)
      : starById(PROXIMA_ID);
    const direction = unit(starWorld(target));
    return { x: direction.x * distanceAu, y: direction.y * distanceAu };
  }

  function earthLaunchWorld(vehicle = selectedVehicle): Vec2 | undefined {
    if (!vehicle) return undefined;
    const canonical = canonicalMapRoute(vehicle);
    if (canonical) return canonical.launchPoint;
    const trajectory = actualTrajectory(vehicle);
    const first = trajectory?.samples[0];
    if (first) return { x: first.x, y: first.y };
    const target = targetStar(vehicle);
    if (!target) return undefined;
    const direction = unit(starWorld(target));
    return { x: direction.x, y: direction.y };
  }

  function craftPosition(): { point: Vec2; radialAu: number; source?: HorizonsSample; target?: Cns5NearbyStarRecord } {
    const trajectory = actualTrajectory();
    if (trajectory && (!tourFrame || tourFrame.routeMode === "ephemeris")) {
      const source = sampleTrajectory(trajectory, tourFrame?.routeProgress ?? progress);
      return { point: { x: source.x, y: source.y }, radialAu: Math.hypot(source.x, source.y, source.z), source };
    }
    if (tourFrame?.routeMode === "comparison") {
      const point = comparisonPoint(tourFrame);
      return { point, radialAu: tourFrame.currentAu ?? Math.hypot(point.x, point.y) };
    }
    const canonical = canonicalMapRoute(selectedVehicle);
    if (canonical) {
      const routeProgress = tourFrame?.routeMode === "profile" ? tourFrame.routeProgress : progress;
      const point = sampleCanonicalMapRoute(canonical, routeProgress);
      return {
        point,
        radialAu: Math.hypot(point.x, point.y),
        target: targetStar(),
      };
    }
    const target = targetStar();
    if (!selectedVehicle || !target) return { point: { x: 0, y: 0 }, radialAu: 0 };
    const destination = starWorld(target);
    const launch = earthLaunchWorld() ?? { x: 0, y: 0 };
    const routeProgress = tourFrame?.routeMode === "profile" ? tourFrame.routeProgress : progress;
    const sample = journeySample(selectedVehicle, routeProgress);
    return {
      point: {
        x: launch.x + (destination.x - launch.x) * sample.distanceFraction,
        y: launch.y + (destination.y - launch.y) * sample.distanceFraction,
      },
      radialAu: sample.currentAu,
      target,
    };
  }

  function focusVehicle(): void {
    if (!selectedVehicle) return;
    const trajectory = actualTrajectory();
    const padding = viewport.width < 700 ? 48 : 88;
    const canonical = canonicalMapRoute(selectedVehicle);
    if (canonical) {
      const radius = Math.hypot(canonical.jupiterPoint.x, canonical.jupiterPoint.y);
      camera = radialCamera(radius * 1.34);
    } else if (trajectory) {
      const points = trajectoryPoints(trajectory);
      const span = Math.max(...points.map((point) => Math.hypot(point.x, point.y)), 1);
      camera = fitBounds(expandedBounds(points, span * 0.13), viewport, padding);
    } else {
      const target = targetStar();
      if (target) camera = fitBounds(expandedBounds([{ x: 0, y: 0 }, starWorld(target)], OUTER_OORT_AU * 0.18), viewport, padding);
    }
    followCraft = false;
  }

  function radialCamera(radiusAu: number): Camera {
    const padding = viewport.width < 700 ? 42 : 76;
    return fitBounds(
      { minX: -radiusAu, maxX: radiusAu, minY: -radiusAu, maxY: radiusAu },
      viewport,
      padding,
    );
  }

  function cameraForTour(cue: TourCameraCue): Camera {
    const craft = craftPosition();
    const band = selectedVehicle?.id === "parker" && cue === "mission"
      ? { spanAu: 2.4 }
      : automaticCameraBand(craft.radialAu);
    const halfSpan = band.spanAu / 2;
    return fitBounds({
      minX: craft.point.x - halfSpan,
      maxX: craft.point.x + halfSpan,
      minY: craft.point.y - halfSpan,
      maxY: craft.point.y + halfSpan,
    }, viewport, viewport.width < 700 ? 38 : 68);
  }

  function blendCamera(from: Camera, to: Camera, amount: number): Camera {
    const t = Math.max(0, Math.min(1, amount));
    const eased = t * t * (3 - 2 * t);
    return {
      centerAu: {
        x: from.centerAu.x + (to.centerAu.x - from.centerAu.x) * eased,
        y: from.centerAu.y + (to.centerAu.y - from.centerAu.y) * eased,
      },
      pxPerAu: Math.exp(
        Math.log(from.pxPerAu) + (Math.log(to.pxPerAu) - Math.log(from.pxPerAu)) * eased,
      ),
    };
  }

  function preset(name: string): void {
    cameraTransition = undefined;
    const padding = viewport.width < 700 ? 44 : 84;
    if (name === "local-stars") camera = fitBounds(catalogueBounds(), viewport, padding);
    else if (name === "full-route") camera = fitBounds(fullRouteBounds(), viewport, padding);
    else if (name === "oort") camera = fitBounds({ minX: -112_000, maxX: 112_000, minY: -112_000, maxY: 112_000 }, viewport, padding);
    else if (name === "heliosphere") camera = fitBounds({ minX: -185, maxX: 185, minY: -185, maxY: 185 }, viewport, padding);
    else if (name === "planets") camera = fitBounds({ minX: -36, maxX: 36, minY: -36, maxY: 36 }, viewport, padding);
    followCraft = false;
    schedule();
  }

  function radialRange(): { min: number; max: number; centre: Vec2 } {
    const centre = worldToScreen({ x: 0, y: 0 }, camera, viewport);
    const dx = centre.x < 0 ? -centre.x : centre.x > viewport.width ? centre.x - viewport.width : 0;
    const dy = centre.y < 0 ? -centre.y : centre.y > viewport.height ? centre.y - viewport.height : 0;
    const max = Math.max(
      Math.hypot(centre.x, centre.y),
      Math.hypot(centre.x - viewport.width, centre.y),
      Math.hypot(centre.x, centre.y - viewport.height),
      Math.hypot(centre.x - viewport.width, centre.y - viewport.height),
    );
    return { min: Math.hypot(dx, dy) / camera.pxPerAu, max: max / camera.pxPerAu, centre };
  }

  function rangeVisible(inner: number, outer = inner): boolean {
    const range = radialRange();
    return outer >= range.min && inner <= range.max;
  }

  function emphasized(id: string): boolean {
    return selected?.id === id || hovered?.id === id;
  }

  function setSelection(entity: CanvasMapEntity): void {
    selected = entity;
    if (elements.selectionName) elements.selectionName.textContent = entity.name.toUpperCase();
    if (elements.selectionMeta) elements.selectionMeta.textContent = entity.meta;
    if (elements.selectionDescription) elements.selectionDescription.textContent = entity.description;
    canvas.setAttribute("aria-label", `${entity.name}. ${entity.meta}. ${entity.description}`);
  }

  function showTooltip(entity: CanvasMapEntity, point: Vec2): void {
    const tooltip = elements.tooltip;
    if (!tooltip) return;
    const title = tooltip.querySelector("strong");
    const detail = tooltip.querySelector("span");
    if (title) title.textContent = entity.name.toUpperCase();
    if (detail) detail.textContent = entity.meta;
    if (!title || !detail) tooltip.textContent = `${entity.name.toUpperCase()} · ${entity.meta}`;
    tooltip.hidden = false;
    tooltip.style.left = `${Math.min(viewport.width - 230, Math.max(8, point.x + 14))}px`;
    tooltip.style.top = `${Math.min(viewport.height - 76, Math.max(8, point.y + 14))}px`;
  }

  function hideTooltip(): void {
    if (elements.tooltip) elements.tooltip.hidden = true;
  }

  function findHit(point: Vec2): CanvasMapEntity | undefined {
    const ordered = [...hits].sort((a, b) => b.priority - a.priority);
    for (const hit of ordered) {
      if (hit.type === "point" && Math.hypot(point.x - hit.point.x, point.y - hit.point.y) <= hit.radius) return hit.entity;
      if (hit.type === "ring" && Math.abs(Math.hypot(point.x - hit.centre.x, point.y - hit.centre.y) - hit.radius) <= hit.tolerance) return hit.entity;
      if (hit.type === "annulus") {
        const radius = Math.hypot(point.x - hit.centre.x, point.y - hit.centre.y);
        if (radius >= hit.inner && radius <= hit.outer) return hit.entity;
      }
      if (hit.type === "path") {
        for (let index = 1; index < hit.points.length; index += 1) {
          const a = hit.points[index - 1];
          const b = hit.points[index];
          if (a && b && canvasDistanceToSegment(point, a, b) <= hit.tolerance) return hit.entity;
        }
      }
    }
    return undefined;
  }

  function queueLabel(label: CanvasLabel): void {
    labels.push(label);
  }

  function measureReservedOverlayBounds(): void {
    const canvasRect = canvas.getBoundingClientRect();
    reservedOverlayBounds = [elements.story, elements.clock].flatMap((overlay) => {
      if (!overlay) return [];
      const overlayRect = overlay.getBoundingClientRect();
      if (overlayRect.width <= 0 || overlayRect.height <= 0) return [];
      return [{
        minX: Math.max(0, overlayRect.left - canvasRect.left - 8),
        maxX: Math.min(viewport.width, overlayRect.right - canvasRect.left + 8),
        minY: Math.max(0, overlayRect.top - canvasRect.top - 8),
        maxY: Math.min(viewport.height, overlayRect.bottom - canvasRect.top + 8),
      }];
    });
  }

  function drawLabels(): void {
    const ctx = elements.context;
    labels.sort((a, b) => b.priority - a.priority);
    for (const label of labels) {
      const placements = label.placements ?? [
        { x: 11, y: -11 }, { x: 11, y: 23 }, { x: -11, y: -11 }, { x: -11, y: 23 }, { x: 0, y: -25 },
      ];
      ctx.save();
      const widths = label.lines.map((line, index) => {
        ctx.font = index === 0 ? "700 11px 'Cascadia Mono', Consolas, monospace" : "9px 'Cascadia Mono', Consolas, monospace";
        return ctx.measureText(line).width;
      });
      const width = Math.max(...widths, 1) + 12;
      const height = label.lines.length * 14 + 5;
      let placement: { box: Bounds; x: number; y: number; align: CanvasTextAlign } | undefined;
      for (const offset of placements) {
        const align: CanvasTextAlign = offset.x < 0 ? "right" : offset.x === 0 ? "center" : "left";
        const x = label.anchor.x + offset.x;
        const left = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
        const top = label.anchor.y + offset.y - 13;
        const box = { minX: left, maxX: left + width, minY: top, maxY: top + height };
        const overlaps = occupiedLabels.some((other) => box.minX < other.maxX && box.maxX > other.minX && box.minY < other.maxY && box.maxY > other.minY);
        if (left < 5 || left + width > viewport.width - 5 || top < 5 || top + height > viewport.height - 5 || overlaps) continue;
        placement = { box, x, y: top + 12, align };
        break;
      }
      if (!placement && label.priority >= 100) {
        const x = Math.max(8, Math.min(viewport.width - width - 8, label.anchor.x + 11));
        const top = Math.max(5, Math.min(viewport.height - height - 5, label.anchor.y - 24));
        placement = { box: { minX: x, maxX: x + width, minY: top, maxY: top + height }, x, y: top + 12, align: "left" };
      }
      if (!placement) {
        ctx.restore();
        continue;
      }
      occupiedLabels.push(placement.box);
      if (label.leader) {
        const target = {
          x: Math.max(placement.box.minX, Math.min(placement.box.maxX, label.anchor.x)),
          y: Math.max(placement.box.minY, Math.min(placement.box.maxY, label.anchor.y)),
        };
        ctx.beginPath();
        ctx.moveTo(label.anchor.x, label.anchor.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = label.leader.color;
        ctx.lineWidth = 1.2;
        ctx.setLineDash(label.leader.dash ?? [4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.translate(label.anchor.x, label.anchor.y);
        if (label.leader.marker === "diamond") {
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = "rgba(2, 9, 6, 0.92)";
          ctx.fillRect(-4, -4, 8, 8);
          ctx.strokeStyle = label.leader.color;
          ctx.strokeRect(-4, -4, 8, 8);
        } else if (label.leader.marker === "square") {
          ctx.fillStyle = "rgba(2, 9, 6, 0.92)";
          ctx.fillRect(-4, -4, 8, 8);
          ctx.strokeStyle = label.leader.color;
          ctx.strokeRect(-4, -4, 8, 8);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(2, 9, 6, 0.92)";
          ctx.fill();
          ctx.strokeStyle = label.leader.color;
          ctx.stroke();
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      ctx.fillStyle = "rgba(2, 9, 6, 0.84)";
      ctx.fillRect(placement.box.minX, placement.box.minY, width, height);
      ctx.textAlign = placement.align;
      label.lines.forEach((line, index) => {
        ctx.font = index === 0 ? "700 11px 'Cascadia Mono', Consolas, monospace" : "9px 'Cascadia Mono', Consolas, monospace";
        ctx.fillStyle = index === 0 ? label.color : "#9baca7";
        ctx.fillText(line, placement.x, placement.y + index * 14);
      });
      ctx.restore();
    }
  }

  function drawBackground(): void {
    const ctx = elements.context;
    const gradient = ctx.createRadialGradient(viewport.width * 0.45, viewport.height * 0.45, 0, viewport.width * 0.5, viewport.height * 0.5, Math.max(viewport.width, viewport.height) * 0.8);
    gradient.addColorStop(0, "#061913");
    gradient.addColorStop(0.58, "#020d09");
    gradient.addColorStop(1, "#010604");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    for (const star of backdrop) {
      ctx.beginPath();
      ctx.arc(star.u * viewport.width, star.v * viewport.height, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = star.warm ? `rgba(243,106,61,${star.alpha})` : `rgba(192,233,226,${star.alpha})`;
      ctx.fill();
    }
  }

  function drawAnnulus(innerAu: number, outerAu: number, fill: string, stroke: string, entity: CanvasMapEntity): void {
    if (!rangeVisible(innerAu, outerAu)) return;
    const centre = worldToScreen({ x: 0, y: 0 }, camera, viewport);
    const inner = innerAu * camera.pxPerAu;
    const outer = outerAu * camera.pxPerAu;
    if (outer > 150_000) return;
    const ctx = elements.context;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, outer, 0, Math.PI * 2);
    ctx.arc(centre.x, centre.y, inner, 0, Math.PI * 2, true);
    ctx.fillStyle = fill;
    ctx.fill("evenodd");
    ctx.strokeStyle = emphasized(entity.id) ? "#f1eee2" : stroke;
    ctx.lineWidth = emphasized(entity.id) ? 2.5 : 1.1;
    ctx.setLineDash([8, 7]);
    for (const radius of [inner, outer]) {
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    hits.push({ type: "annulus", entity, centre, inner, outer, priority: 1 });
    const labelPoint = outer - inner >= 14 && outer >= 35
      ? visibleRingPoint(centre, (inner + outer) / 2)
      : undefined;
    if (labelPoint) queueLabel({
      anchor: labelPoint,
      lines: [entity.name.toUpperCase(), entity.meta],
      priority: emphasized(entity.id) ? 102 : 34,
      color: stroke,
    });
  }

  function visibleRingPoint(centre: Vec2, radius: number): Vec2 | undefined {
    for (const angle of [-0.72, -2.42, 0.72, 2.42, 0, Math.PI, -Math.PI / 2, Math.PI / 2]) {
      const point = { x: centre.x + Math.cos(angle) * radius, y: centre.y + Math.sin(angle) * radius };
      if (point.x > 22 && point.x < viewport.width - 22 && point.y > 28 && point.y < viewport.height - 28) return point;
    }
    return undefined;
  }

  function drawRing(radiusAu: number, color: string, dash: number[], entity: CanvasMapEntity, label?: string, priority = 24): void {
    if (!rangeVisible(radiusAu)) return;
    const centre = worldToScreen({ x: 0, y: 0 }, camera, viewport);
    const radius = radiusAu * camera.pxPerAu;
    if (radius < 1.5 || radius > 150_000) return;
    const ctx = elements.context;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = emphasized(entity.id) ? "#f1eee2" : color;
    ctx.lineWidth = emphasized(entity.id) ? 2.7 : 1.25;
    ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
    hits.push({ type: "ring", entity, centre, radius, tolerance: 6, priority: 3 });
    const labelPoint = label ? visibleRingPoint(centre, radius) : undefined;
    if (label && labelPoint) queueLabel({ anchor: labelPoint, lines: [label], priority: emphasized(entity.id) ? 101 : priority, color, placements: [{ x: 8, y: -7 }, { x: -8, y: 18 }] });
  }

  function drawRadialGrid(): void {
    const range = radialRange();
    const step = niceStep(95 / camera.pxPerAu);
    let radiusAu = Math.max(step, Math.ceil(range.min / step) * step);
    let count = 0;
    const ctx = elements.context;
    ctx.save();
    ctx.strokeStyle = "rgba(106,223,255,0.105)";
    ctx.lineWidth = 1;
    while (radiusAu <= range.max && count < 14) {
      const radius = radiusAu * camera.pxPerAu;
      if (radius < 150_000) {
        ctx.beginPath();
        ctx.arc(range.centre.x, range.centre.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        const point = visibleRingPoint(range.centre, radius);
        if (point && count % 2 === 0) queueLabel({ anchor: point, lines: [formatScaleDistance(radiusAu)], priority: 4, color: "rgba(106,223,255,0.62)", placements: [{ x: 5, y: 14 }] });
      }
      radiusAu += step;
      count += 1;
    }
    ctx.restore();
  }

  function drawBoundaries(): void {
    const inner: CanvasMapEntity = {
      id: "boundary-inner-oort", kind: "boundary", name: "Inner Oort cloud", meta: "2,000–20,000 AU · MODEL RANGE",
      description: "A modelled inner Oort region shown as a true linear annulus, not as an evenly spaced milestone.", focusSpanAu: 47_000,
    };
    const outer: CanvasMapEntity = {
      id: "boundary-outer-oort", kind: "boundary", name: "Outer Oort cloud", meta: "20,000–100,000 AU · MODEL RANGE",
      description: "The conservative Solar System exit used by this explainer. Its width shares the same linear scale as the planetary orbits and stars.", focusSpanAu: 225_000,
    };
    drawAnnulus(INNER_OORT_AU, 20_000, "rgba(106,223,255,0.06)", "rgba(106,223,255,0.48)", inner);
    drawAnnulus(20_000, OUTER_OORT_AU, "rgba(179,255,63,0.075)", "rgba(179,255,63,0.58)", outer);
    drawRing(HELIOPAUSE_AU, "#f36a3d", [7, 6], {
      id: "boundary-heliopause", kind: "boundary", name: "Heliopause", meta: "121.6 AU · VOYAGER 1 REFERENCE",
      description: "The solar-wind boundary is important, but it is not the Solar System exit used by this explainer.", focusSpanAu: 370,
    }, "HELIOPAUSE · 121.6 AU", 60);
    drawRing(AU_PER_LIGHT_YEAR * 10, "rgba(198,168,255,0.38)", [3, 8], {
      id: "boundary-10ly", kind: "boundary", name: "10 light-year shell", meta: "632,411 AU",
      description: "A radial context ring for the CNS5 nearby-star catalogue.", focusSpanAu: AU_PER_LIGHT_YEAR * 21,
    }, "10 LY", 12);
  }

  function drawSolarSystem(): void {
    const centre = worldToScreen({ x: 0, y: 0 }, camera, viewport);
    const ctx = elements.context;
    const sun: CanvasMapEntity = {
      id: "origin-sun", kind: "origin", name: "Sun", meta: "COORDINATE ORIGIN · 0 AU",
      description: "The coordinate origin of the ecliptic map, not the route's launch point. The visible marker is a locator at wide scales.", world: { x: 0, y: 0 }, focusSpanAu: 0.08,
    };
    if (centre.x > -20 && centre.x < viewport.width + 20 && centre.y > -20 && centre.y < viewport.height + 20) {
      const physicalRadius = 0.004_650_47 * camera.pxPerAu;
      const radius = physicalRadius >= 0.8 ? Math.min(physicalRadius, 160) : 5.5;
      ctx.beginPath();
      ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f1eee2";
      ctx.fill();
      ctx.strokeStyle = emphasized(sun.id) ? "#b3ff3f" : "#f36a3d";
      ctx.lineWidth = 2;
      ctx.stroke();
      hits.push({ type: "point", entity: sun, point: centre, radius: Math.max(10, Math.min(radius, 40)), priority: 20 });
      queueLabel({
        anchor: centre,
        lines: selectedVehicle ? ["SUN · COORDINATE ORIGIN", "NOT THE LAUNCH POINT"] : ["SUN · COORDINATE ORIGIN"],
        priority: 98,
        color: "#f1eee2",
      });
    }
    for (const planet of CANVAS_PLANETS) {
      const entity: CanvasMapEntity = {
        id: `orbit-${planet.id}`, kind: "planet", name: `${planet.name} orbit`, meta: `${planet.orbitAu.toFixed(planet.orbitAu < 1 ? 3 : 2)} AU MEAN RADIUS`,
        description: "This is the real mean orbital radius on the shared linear AU scale. No invented current planet position is plotted.", focusSpanAu: Math.max(planet.orbitAu * 2.45, 0.08),
      };
      const orbitPixels = planet.orbitAu * camera.pxPerAu;
      drawRing(planet.orbitAu, planet.id === "earth" ? "rgba(106,223,255,0.48)" : "rgba(241,238,226,0.22)", [], entity, orbitPixels > 45 ? `${planet.name.toUpperCase()} ORBIT` : undefined, planet.id === "earth" ? 42 : 18);
    }
  }

  function starEntity(star: Cns5NearbyStarRecord): CanvasMapEntity {
    const latitude = eclipticLatitudeDegrees(star.eclipticAu);
    return {
      id: `star-${star.id}`, kind: "star", name: star.name,
      meta: `${star.distanceLy.toFixed(4)} LY · β ${latitude >= 0 ? "+" : ""}${latitude.toFixed(1)}° · CNS5`,
      description: "A real CNS5 catalogue system. J2000 ecliptic x/y are plotted directly; z and the full 3D distance are reported rather than folded into the plane.",
      world: starWorld(star), focusSpanAu: AU_PER_LIGHT_YEAR * 0.75,
    };
  }

  function drawStars(): void {
    const ctx = elements.context;
    const visibleAu = viewport.width / camera.pxPerAu;
    const labelCandidates: Array<{
      star: Cns5NearbyStarRecord;
      entity: CanvasMapEntity;
      point: Vec2;
      latitude: number;
      color: string;
      priority: number;
    }> = [];
    const proxima = worldToScreen(starWorld(starById(PROXIMA_ID)), camera, viewport);
    const alpha = worldToScreen(starWorld(starById("alpha-centauri-ab")), camera, viewport);
    if ([proxima, alpha].every((point) => point.x > -40 && point.x < viewport.width + 40 && point.y > -40 && point.y < viewport.height + 40)) {
      ctx.beginPath();
      ctx.moveTo(proxima.x, proxima.y);
      ctx.lineTo(alpha.x, alpha.y);
      ctx.strokeStyle = "rgba(106,223,255,0.38)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (const star of CNS5_NEARBY_STARS) {
      const point = worldToScreen(starWorld(star), camera, viewport);
      if (point.x < -32 || point.x > viewport.width + 32 || point.y < -32 || point.y > viewport.height + 32) continue;
      const entity = starEntity(star);
      const major = [PROXIMA_ID, "alpha-centauri-ab", BARNARD_ID, "sirius-ab"].includes(star.id);
      const size = emphasized(entity.id) ? 8 : star.id === PROXIMA_ID ? 6.5 : major ? 5 : 3.8;
      const latitude = eclipticLatitudeDegrees(star.eclipticAu);
      const color = star.id === PROXIMA_ID ? "#b3ff3f" : star.kind === "brown-dwarf-binary" ? "#f36a3d" : latitude >= 0 ? "#6adfff" : "#c6a8ff";
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#f1eee2";
      ctx.strokeStyle = color;
      ctx.lineWidth = emphasized(entity.id) ? 2.6 : 1.4;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.strokeRect(-size / 2, -size / 2, size, size);
      ctx.restore();
      hits.push({ type: "point", entity, point, radius: Math.max(10, size + 4), priority: 25 });
      const priority = emphasized(entity.id) ? 110 : star.id === PROXIMA_ID ? 100 : star.id === "alpha-centauri-ab" ? 94 : star.id === BARNARD_ID ? 90 : star.id === "sirius-ab" ? 84 : visibleAu < AU_PER_LIGHT_YEAR * 16 ? 42 : 0;
      if (priority > 0) labelCandidates.push({ star, entity, point, latitude, color, priority });
    }
    const acceptedBySystem = new Map<string, Vec2[]>();
    labelCandidates.sort((a, b) => b.priority - a.priority);
    for (const candidate of labelCandidates) {
      const accepted = acceptedBySystem.get(candidate.star.systemId) ?? [];
      if (accepted.some((point) => Math.hypot(point.x - candidate.point.x, point.y - candidate.point.y) < 12)) continue;
      accepted.push(candidate.point);
      acceptedBySystem.set(candidate.star.systemId, accepted);
      queueLabel({
        anchor: candidate.point,
        lines: emphasized(candidate.entity.id) || visibleAu < AU_PER_LIGHT_YEAR * 6
          ? [candidate.star.name.toUpperCase(), `${candidate.star.distanceLy.toFixed(2)} LY · β ${candidate.latitude.toFixed(1)}°`]
          : [candidate.star.name.toUpperCase()],
        priority: candidate.priority,
        color: candidate.color,
      });
    }
  }

  function compactScreenPoints(points: Vec2[]): Vec2[] {
    const compact: Vec2[] = [];
    let previous: Vec2 | undefined;
    for (const [index, world] of points.entries()) {
      const screen = worldToScreen(world, camera, viewport);
      if (previous && index !== points.length - 1 && Math.hypot(screen.x - previous.x, screen.y - previous.y) < 1.3) continue;
      compact.push(screen);
      previous = screen;
    }
    return compact;
  }

  function drawPath(points: Vec2[], color: string, dash: number[], alpha: number, width: number): Vec2[] {
    const screenPoints = compactScreenPoints(points);
    const first = screenPoints[0];
    if (!first) return screenPoints;
    const ctx = elements.context;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    for (const point of screenPoints.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.setLineDash(dash);
    ctx.stroke();
    ctx.restore();
    return screenPoints;
  }

  function eventSample(trajectory: HorizonsTrajectory, date: string): HorizonsSample | undefined {
    const time = Date.parse(`${date}T00:00:00Z`);
    return trajectory.samples.reduce<HorizonsSample | undefined>((nearest, candidate) => {
      if (!nearest) return candidate;
      return Math.abs(Date.parse(`${candidate.date}Z`) - time) < Math.abs(Date.parse(`${nearest.date}Z`) - time) ? candidate : nearest;
    }, undefined);
  }

  function drawEvent(
    trajectory: HorizonsTrajectory,
    date: string,
    name: string,
    visibleThrough?: string,
  ): void {
    if (visibleThrough && Date.parse(`${date}T00:00:00Z`) > Date.parse(`${visibleThrough}Z`)) return;
    const sample = eventSample(trajectory, date);
    if (!sample) return;
    const point = worldToScreen({ x: sample.x, y: sample.y }, camera, viewport);
    const sun = worldToScreen({ x: 0, y: 0 }, camera, viewport);
    if (point.x < 8 || point.x > viewport.width - 8 || point.y < 8 || point.y > viewport.height - 8 || Math.hypot(point.x - sun.x, point.y - sun.y) < 27) return;
    elements.context.beginPath();
    elements.context.arc(point.x, point.y, 2.8, 0, Math.PI * 2);
    elements.context.fillStyle = "#6adfff";
    elements.context.fill();
    queueLabel({ anchor: point, lines: [name], priority: 52, color: "#6adfff" });
  }

  function locatorPlacements(worldDirection: Vec2): Vec2[] {
    const screenDirection = unit({ x: worldDirection.x, y: -worldDirection.y });
    const horizontal = screenDirection.x < -0.18 ? -58 : 58;
    const vertical = screenDirection.y > 0.18 ? 48 : -28;
    return [
      { x: horizontal, y: vertical },
      { x: -horizontal, y: vertical },
      { x: horizontal, y: vertical > 0 ? -28 : 48 },
      { x: -horizontal, y: vertical > 0 ? -28 : 48 },
      { x: 0, y: 72 },
      { x: 0, y: -48 },
      { x: 58, y: 48 },
      { x: -58, y: -28 },
    ];
  }

  function queueFixedLocator(
    screenPoint: Vec2,
    worldDirection: Vec2,
    lines: string[],
    color: string,
    priority: number,
    marker: "diamond" | "ring" | "square" = "ring",
  ): void {
    if (
      screenPoint.x < -14 || screenPoint.x > viewport.width + 14 ||
      screenPoint.y < -14 || screenPoint.y > viewport.height + 14
    ) return;
    queueLabel({
      anchor: screenPoint,
      lines,
      priority,
      color,
      placements: locatorPlacements(worldDirection),
      leader: { color, dash: [4, 4], marker },
    });
  }

  function drawEarthLaunchLocator(actual?: HorizonsTrajectory): void {
    const launch = earthLaunchWorld();
    if (!launch) return;
    const canonical = canonicalMapRoute(selectedVehicle);
    if (canonical && selectedVehicle?.route.canonicalSequence) {
      queueFixedLocator(
        worldToScreen(launch, camera, viewport),
        launch,
        [
          selectedVehicle.route.canonicalSequence.launch.label,
          "TRUE 1 AU RADIUS · POSITION ANGLE SCHEMATIC",
        ],
        "#6adfff",
        126,
        "diamond",
      );
      return;
    }
    const first = actual?.samples[0];
    const detail = first
      ? `${selectedVehicle?.name.toUpperCase() ?? "SPACECRAFT"} · ${first.date.slice(0, 4)}`
      : "ROUTE START · 1 AU";
    queueFixedLocator(
      worldToScreen(launch, camera, viewport),
      launch,
      ["EARTH LAUNCH · LOCATOR NOT TO SCALE", detail],
      "#6adfff",
      122,
      "diamond",
    );
  }

  function drawContinuationCallouts(
    actual: HorizonsTrajectory,
    modelOrigin: Vec2,
    evidenceColor: string,
  ): void {
    const last = actual.samples.at(-1);
    if (!last) return;
    const realEndpoint = { x: last.x, y: last.y };
    const realScreen = worldToScreen(realEndpoint, camera, viewport);
    const modelScreen = worldToScreen(modelOrigin, camera, viewport);
    const collapsed = Math.hypot(realScreen.x - modelScreen.x, realScreen.y - modelScreen.y) < 34;

    if (collapsed) {
      const anchor = { x: (realScreen.x + modelScreen.x) / 2, y: (realScreen.y + modelScreen.y) / 2 };
      queueFixedLocator(
        anchor,
        { x: realEndpoint.x + modelOrigin.x, y: realEndpoint.y + modelOrigin.y },
        ["REAL EPHEMERIS END / MODEL START", `${last.date.slice(0, 10)} · ${tourFrame?.evidence ?? "MODEL"}`],
        evidenceColor,
        118,
        "square",
      );
      return;
    }

    queueFixedLocator(
      realScreen,
      realEndpoint,
      ["REAL EPHEMERIS END", last.date.slice(0, 10)],
      "#6adfff",
      118,
      "ring",
    );
    queueFixedLocator(
      modelScreen,
      modelOrigin,
      ["MODEL CONTINUATION START", tourFrame?.evidence ?? "MODEL"],
      evidenceColor,
      117,
      "square",
    );
  }

  function drawCanonicalSequence(route: CanonicalMapRoute, routeProgress: number): void {
    if (!selectedVehicle?.route.canonicalSequence) return;
    const sequence = selectedVehicle.route.canonicalSequence;
    const color = "#c6a8ff";
    const entity: CanvasMapEntity = {
      id: `trajectory-canon-${selectedVehicle.id}`,
      kind: "trajectory",
      name: `${selectedVehicle.name} canonical sequence`,
      meta: `${sequence.continuity} · ${route.evidence}`,
      description: "The fifteen-pass escape and planned Jupiter assist follow the novel's sequence. AU radii are linear; orbit shapes and position angles are schematic rather than JPL ephemerides.",
    };

    const routePoints = canonicalRoutePoints(route);
    drawPath(routePoints, color, [4, 7], 0.14, 1.2);
    const travelled = canonicalMapRoutePrefix(route, routeProgress);
    const path = drawPath(
      travelled,
      color,
      [],
      emphasized(entity.id) ? 1 : 0.9,
      emphasized(entity.id) ? 3.8 : 2.7,
    );
    hits.push({ type: "path", entity, points: path, tolerance: 8, priority: 10 });

    const jupiterEntity: CanvasMapEntity = {
      id: `jupiter-assist-${selectedVehicle.id}`,
      kind: "planet",
      name: "Planned Jupiter gravity assist",
      meta: `TRUE RADIUS ${sequence.escapeSequence.finalAphelionAu.toFixed(1)} AU · ${route.evidence}`,
      description: "The encounter belongs to the novel's planned escape sequence. Its marker is fixed at Jupiter's true orbital radius; its ecliptic longitude and drawn turn are schematic.",
      world: route.jupiterPoint,
      focusSpanAu: 2.4,
    };
    const jupiterScreen = worldToScreen(route.jupiterPoint, camera, viewport);
    if (
      jupiterScreen.x > -18 && jupiterScreen.x < viewport.width + 18 &&
      jupiterScreen.y > -18 && jupiterScreen.y < viewport.height + 18
    ) {
      const ctx = elements.context;
      ctx.save();
      ctx.beginPath();
      ctx.arc(jupiterScreen.x, jupiterScreen.y, emphasized(jupiterEntity.id) ? 9 : 7, 0, Math.PI * 2);
      ctx.fillStyle = "#020906";
      ctx.fill();
      ctx.strokeStyle = "#ff9a55";
      ctx.lineWidth = emphasized(jupiterEntity.id) ? 3.2 : 2.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(jupiterScreen.x - 12, jupiterScreen.y);
      ctx.lineTo(jupiterScreen.x + 12, jupiterScreen.y);
      ctx.moveTo(jupiterScreen.x, jupiterScreen.y - 12);
      ctx.lineTo(jupiterScreen.x, jupiterScreen.y + 12);
      ctx.globalAlpha = 0.72;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      hits.push({ type: "point", entity: jupiterEntity, point: jupiterScreen, radius: 14, priority: 48 });
      queueFixedLocator(
        jupiterScreen,
        route.jupiterPoint,
        [
          "JUPITER GRAVITY ASSIST · PLANNED",
          `PASS 15 · TRUE RADIUS ${sequence.escapeSequence.finalAphelionAu.toFixed(1)} AU`,
        ],
        "#ff9a55",
        124,
        "ring",
      );
    }

    const visibleAu = viewport.width / camera.pxPerAu;
    if (visibleAu < 70) {
      const labelledPasses = [4, 9, 14];
      for (const passIndex of labelledPasses) {
        const pass = route.solarPasses[passIndex];
        if (!pass?.length) continue;
        const apoapsis = pass.reduce((farthest, candidate) =>
          Math.hypot(candidate.x, candidate.y) > Math.hypot(farthest.x, farthest.y)
            ? candidate
            : farthest,
        );
        const point = worldToScreen(apoapsis, camera, viewport);
        if (point.x < 10 || point.x > viewport.width - 10 || point.y < 10 || point.y > viewport.height - 10) continue;
        queueLabel({
          anchor: point,
          lines: [
            `PASS ${String(passIndex + 1).padStart(2, "0")} · APOAPSIS ${Math.hypot(apoapsis.x, apoapsis.y).toFixed(1)} AU`,
          ],
          priority: passIndex === 14 ? 86 : 38 + passIndex,
          color,
        });
      }
      const evidencePass = route.solarPasses[7];
      const evidenceAnchor = evidencePass?.reduce((farthest, candidate) =>
        Math.hypot(candidate.x, candidate.y) > Math.hypot(farthest.x, farthest.y)
          ? candidate
          : farthest,
      );
      if (evidenceAnchor) {
        queueFixedLocator(
          worldToScreen(evidenceAnchor, camera, viewport),
          evidenceAnchor,
          ["15 SOLAR PASSES · CANON SEQUENCE", "ORBIT SHAPE SCHEMATIC · TRUE AU RADII"],
          color,
          116,
          "square",
        );
      }
    }
  }

  function drawTrajectory(): void {
    if (!selectedVehicle) {
      craftReadout = "SUN · 0 AU";
      return;
    }
    const actual = actualTrajectory();
    const craft = craftPosition();
    const canonical = canonicalMapRoute(selectedVehicle);
    drawEarthLaunchLocator(actual);
    if (actual) {
      const entity: CanvasMapEntity = {
        id: `trajectory-${actual.id}`, kind: "trajectory", name: `${actual.name} ephemeris`, meta: "NASA/JPL HORIZONS · J2000 ECLIPTIC XY",
        description: "A vendored geometric state-vector path. Source x/y samples are drawn directly, with z retained in the craft readout.",
      };
      const actualProgress = tourFrame?.routeMode === "ephemeris"
        ? tourFrame.routeProgress
        : tourFrame?.routeMode === "comparison"
          ? 1
          : progress;
      const currentActual = sampleTrajectory(actual, actualProgress);
      drawPath(trajectoryPoints(actual), "#6adfff", [3, 7], 0.14, 1);
      const travelled = trajectoryPrefix(actual.samples, actualProgress).map(({ x, y }) => ({ x, y }));
      const path = drawPath(travelled, "#6adfff", [], emphasized(entity.id) ? 1 : 0.86, emphasized(entity.id) ? 3.6 : 2.4);
      hits.push({ type: "path", entity, points: path, tolerance: 7, priority: 8 });
      if (actual.id === "voyager1") {
        drawEvent(actual, "1979-03-05", "JUPITER ASSIST", currentActual.date);
        drawEvent(actual, "1980-11-12", "SATURN / TITAN TURN", currentActual.date);
        drawEvent(actual, "2012-08-25", "HELIOPAUSE EVENT · 2012", currentActual.date);
      } else {
        drawEvent(actual, "2018-10-03", "VENUS ASSIST 1", currentActual.date);
        drawEvent(actual, "2020-07-11", "VENUS ASSIST 3", currentActual.date);
        drawEvent(actual, "2021-10-16", "VENUS ASSIST 5", currentActual.date);
        drawEvent(actual, "2024-11-06", "VENUS ASSIST 7", currentActual.date);
      }
    }

    if (tourFrame?.routeMode === "comparison" && tourFrame.destination) {
      const onward = selectedVehicle.route.onward;
      const originAu = onward.kind === "constant" ? onward.startAu : tourFrame.chapter.startAu ?? 0;
      const origin = tourFrame.direction?.kind === "last-velocity" && actual
        ? { x: actual.samples.at(-1)?.x ?? 0, y: actual.samples.at(-1)?.y ?? 0 }
        : comparisonPoint(tourFrame, originAu);
      const destination = comparisonPoint(tourFrame, tourFrame.destination.au);
      const evidenceColor = tourFrame.evidence === "COUNTERFACTUAL" ? "#ff5a36" : "#b8ff3d";
      const entity: CanvasMapEntity = {
        id: `trajectory-comparison-${selectedVehicle.id}`,
        kind: "trajectory",
        name: `${selectedVehicle.name} comparison branch`,
        meta: `${tourFrame.evidence} · ${tourFrame.destination.label.toUpperCase()}`,
        description: tourFrame.chapter.note,
      };
      if (actual) drawContinuationCallouts(actual, origin, evidenceColor);
      drawPath([origin, destination], evidenceColor, [9, 8], 0.16, 1.2);
      const path = drawPath([origin, craft.point], evidenceColor, [9, 6], emphasized(entity.id) ? 1 : 0.92, emphasized(entity.id) ? 3.6 : 2.6);
      hits.push({ type: "path", entity, points: path, tolerance: 7, priority: 9 });
      if (onward.kind === "constant" && onward.discontinuity) {
        const cutPoint = worldToScreen(origin, camera, viewport);
        if (cutPoint.x > 12 && cutPoint.x < viewport.width - 12 && cutPoint.y > 12 && cutPoint.y < viewport.height - 12) {
          elements.context.fillStyle = "#ff5a36";
          elements.context.fillRect(cutPoint.x - 4, cutPoint.y - 4, 8, 8);
          queueLabel({ anchor: cutPoint, lines: ["COUNTERFACTUAL CUT", "REAL PATH ENDS"], priority: 94, color: "#ff5a36" });
        }
      }
    } else if (canonical) {
      const routeProgress = tourFrame?.routeMode === "profile" ? tourFrame.routeProgress : progress;
      drawCanonicalSequence(canonical, routeProgress);
    } else if (!actual) {
      const target = targetStar();
      if (target) {
        const destination = starWorld(target);
        const launch = earthLaunchWorld() ?? { x: 0, y: 0 };
        const color = selectedVehicle.category === "fiction" ? "#c6a8ff" : "#b3ff3f";
        const entity: CanvasMapEntity = {
          id: `trajectory-model-${selectedVehicle.id}`, kind: "trajectory", name: `${selectedVehicle.name} route model`,
          meta: `${selectedVehicle.evidence} · ECLIPTIC XY PROJECTION`, description: selectedVehicle.modelNote,
        };
        drawPath([launch, destination], color, [4, 8], 0.14, 1.1);
        const path = drawPath([launch, craft.point], color, selectedVehicle.category === "fiction" ? [4, 7] : [10, 7], emphasized(entity.id) ? 1 : 0.82, emphasized(entity.id) ? 3.6 : 2.4);
        hits.push({ type: "path", entity, points: path, tolerance: 7, priority: 8 });
      }
    }

    const point = worldToScreen(craft.point, camera, viewport);
    const craftColor = tourFrame?.evidence === "COUNTERFACTUAL"
      ? "#ff5a36"
      : selectedVehicle.category === "fiction"
        ? "#c6a8ff"
        : tourFrame?.routeMode === "profile"
          ? "#b8ff3d"
          : "#6adfff";
    const craftEntity: CanvasMapEntity = {
      id: `craft-${selectedVehicle.id}`, kind: "craft", name: selectedVehicle.name,
      meta: craft.source
        ? `${craft.source.date.slice(0, 10)} · ${formatDistance(craft.radialAu)}`
        : `${tourFrame?.evidence ?? selectedVehicle.evidence} · ${formatDistance(craft.radialAu)}`,
      description: craft.source
        ? "Position interpolated from the vendored JPL Horizons position and velocity vectors."
        : tourFrame?.chapter.note ?? selectedVehicle.modelNote,
      world: craft.point, focusSpanAu: Math.max(0.04, craft.radialAu * 0.35),
    };
    if (selected?.id === craftEntity.id) setSelection(craftEntity);
    const sunPoint = worldToScreen({ x: 0, y: 0 }, camera, viewport);
    const clearsSunLocator = Math.hypot(point.x - sunPoint.x, point.y - sunPoint.y) >= 24;
    if (clearsSunLocator && point.x > -28 && point.x < viewport.width + 28 && point.y > -28 && point.y < viewport.height + 28) {
      const ctx = elements.context;
      ctx.beginPath();
      ctx.arc(point.x, point.y, emphasized(craftEntity.id) ? 8.5 : 6.5, 0, Math.PI * 2);
      ctx.fillStyle = "#020906";
      ctx.fill();
      ctx.strokeStyle = craftColor;
      ctx.lineWidth = emphasized(craftEntity.id) ? 3.5 : 2.5;
      ctx.stroke();
      hits.push({ type: "point", entity: craftEntity, point, radius: 12, priority: 35 });
      queueLabel({ anchor: point, lines: [selectedVehicle.name.toUpperCase()], priority: 106, color: craftColor });
    }

    if (craft.source) {
      craftReadout = `${selectedVehicle.name.toUpperCase()} · ${craft.source.date.slice(0, 10)} · ${formatDistance(craft.radialAu)} · β ${eclipticLatitudeDegrees(craft.source).toFixed(1)}°`;
    } else if (tourFrame?.routeMode === "comparison") {
      craftReadout = `${selectedVehicle.name.toUpperCase()} · ${tourFrame.evidence} · ${formatDistance(craft.radialAu)} · ${tourFrame.chapter.title}`;
    } else if (canonical && selectedVehicle.route.canonicalSequence) {
      const elapsedYears = tourFrame?.elapsedYears ?? progress * (selectedVehicle.totalYears ?? 0);
      const stages = selectedVehicle.route.canonicalSequence.stages;
      const stage = stages.find(({ startYear, endYear }) =>
        elapsedYears >= startYear && (elapsedYears < endYear || startYear === endYear && elapsedYears === startYear),
      ) ?? stages.at(-1);
      craftReadout = `${selectedVehicle.name.toUpperCase()} · ${formatDistance(craft.radialAu)} FROM SUN · ${stage?.label ?? canonical.evidence}`;
    } else if (craft.target) {
      const targetAu = craft.target.distanceLy * AU_PER_LIGHT_YEAR;
      craftReadout = `${selectedVehicle.name.toUpperCase()} · ${formatDistance(craft.radialAu)} · ${(craft.radialAu / targetAu * 100).toFixed(1)}% TO ${craft.target.name.toUpperCase()}`;
    } else craftReadout = `${selectedVehicle.name.toUpperCase()} · NO COMPARABLE LINEAR ROUTE`;
  }

  function drawScale(): void {
    let distance = niceStep(118 / camera.pxPerAu);
    while (distance * camera.pxPerAu > 180) distance /= 2;
    const pixels = distance * camera.pxPerAu;
    const formattedDistance = formatScaleDistance(distance);
    if (elements.scaleRule && elements.scaleLabel) {
      const width = `${pixels}px`;
      if (elements.scaleRule.style.width !== width) elements.scaleRule.style.width = width;
      updateText(elements.scaleLabel, formattedDistance);
      updateText(elements.scale, `SCALE BAR · ${formattedDistance}`);
      return;
    }
    const x = 24;
    const y = viewport.height - 48;
    const ctx = elements.context;
    ctx.save();
    ctx.strokeStyle = "#f1eee2";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.moveTo(x, y);
    ctx.lineTo(x + pixels, y);
    ctx.moveTo(x + pixels, y - 5);
    ctx.lineTo(x + pixels, y + 5);
    ctx.stroke();
    ctx.fillStyle = "#f1eee2";
    ctx.font = "700 10px 'Cascadia Mono', Consolas, monospace";
    ctx.fillText(formattedDistance, x, y - 10);
    ctx.restore();
    updateText(elements.scale, `SCALE BAR · ${formattedDistance}`);
  }

  function drawHud(): void {
    const visibleAu = viewport.width / camera.pxPerAu;
    const band = automaticCameraBand(craftPosition().radialAu);
    const width = visibleAu >= AU_PER_LIGHT_YEAR
      ? `${(visibleAu / AU_PER_LIGHT_YEAR).toFixed(2)} LY WIDE`
      : `${visibleAu.toLocaleString("en-AU", { maximumFractionDigits: visibleAu < 1 ? 3 : 0 })} AU WIDE`;
    updateText(elements.scope, `AUTO CAMERA · ${band.label} · ${width}`);
    const neptunePixels = 30.1104 * camera.pxPerAu;
    updateText(elements.resolution, `NEPTUNE ORBIT = ${neptunePixels < 0.01 ? "<0.01" : neptunePixels.toFixed(neptunePixels < 10 ? 2 : 0)} PX`);
    updateText(elements.coordinate, hovered ? `${hovered.name.toUpperCase()} · ${hovered.meta}` : craftReadout);
    const hideThesis = visibleAu < 150_000;
    if (elements.thesis.hidden !== hideThesis) elements.thesis.hidden = hideThesis;
    for (const control of elements.controls) {
      if (control.dataset.mapAction !== "follow") continue;
      const pressed = String(followCraft);
      if (control.getAttribute("aria-pressed") !== pressed) control.setAttribute("aria-pressed", pressed);
    }
  }

  function render(): void {
    if (destroyed || viewport.width <= 0 || viewport.height <= 0) return;
    let cameraSettling = false;
    if (followCraft && selectedVehicle && tourFrame) {
      const target = cameraForTour(tourFrame.chapter.cameraCue);
      cameraTransition = {
        chapterIndex: tourFrame.chapterIndex,
        from: camera,
        to: target,
      };
      const smoothed = blendCamera(cameraTransition.from, cameraTransition.to, 0.18);
      const scaleError = Math.abs(Math.log(smoothed.pxPerAu / target.pxPerAu));
      camera = {
        centerAu: target.centerAu,
        pxPerAu: scaleError < 0.002 ? target.pxPerAu : smoothed.pxPerAu,
      };
      cameraSettling = scaleError >= 0.002;
    } else if (followCraft && selectedVehicle) {
      camera = { ...camera, centerAu: craftPosition().point };
    }
    const ctx = elements.context;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    hits = [];
    labels = [];
    occupiedLabels = [...reservedOverlayBounds];
    drawBackground();
    drawBoundaries();
    drawRadialGrid();
    drawSolarSystem();
    drawStars();
    drawTrajectory();
    drawLabels();
    drawScale();
    drawHud();
    if (cameraSettling) schedule();
  }

  function telemetry(): MapTelemetry {
    const craft = craftPosition();
    if (craft.source) {
      const first = actualTrajectory()?.samples[0];
      const elapsedYears = first ? (Date.parse(`${craft.source.date}Z`) - Date.parse(`${first.date}Z`)) / (365.25 * 86_400_000) : undefined;
      const speedKmh = Math.hypot(craft.source.vx, craft.source.vy, craft.source.vz) * AU_KM / 24;
      return { mode: "ephemeris", date: craft.source.date.slice(0, 10), elapsedYears, speedKmh, radialAu: craft.radialAu };
    }
    if (tourFrame?.routeMode === "profile" || tourFrame?.routeMode === "comparison") {
      const canonical = canonicalMapRoute(selectedVehicle);
      return {
        mode: "model",
        elapsedYears: tourFrame.elapsedYears,
        speedKmh: tourFrame.speedKmh,
        radialAu: canonical ? craft.radialAu : tourFrame.currentAu ?? craft.radialAu,
      };
    }
    if (craft.target) return { mode: "model", radialAu: craft.radialAu };
    return { mode: "unavailable", radialAu: 0 };
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    viewport = { width: Math.max(1, rect.width || 1_200), height: Math.max(1, rect.height || 700) };
    dpr = Math.min(window.devicePixelRatio || 1, playbackActive ? 1 : 1.5);
    const width = Math.max(1, Math.round(viewport.width * dpr));
    const height = Math.max(1, Math.round(viewport.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    if (!initialized) {
      camera = fitBounds(catalogueBounds(), viewport, viewport.width < 700 ? 44 : 84);
      initialized = true;
    }
    measureReservedOverlayBounds();
    schedule();
  }

  function localPoint(event: PointerEvent | WheelEvent | MouseEvent): Vec2 {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
  }

  function onPointerDown(event: PointerEvent): void {
    cameraTransition = undefined;
    canvas.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    pointers.set(event.pointerId, point);
    pointerStarts.set(event.pointerId, point);
    dragMoved = false;
    hideTooltip();
  }

  function onPointerMove(event: PointerEvent): void {
    if (!pointers.has(event.pointerId)) {
      const point = localPoint(event);
      const entity = findHit(point);
      if (entity?.id !== hovered?.id) {
        hovered = entity;
        schedule();
      }
      if (entity) showTooltip(entity, point);
      else hideTooltip();
      canvas.style.cursor = entity ? "pointer" : "crosshair";
      return;
    }
    const current = localPoint(event);
    const start = pointerStarts.get(event.pointerId);
    if (start && Math.hypot(current.x - start.x, current.y - start.y) > 4) dragMoved = true;
    pointers.set(event.pointerId, current);
  }

  function onPointerUp(event: PointerEvent): void {
    const point = localPoint(event);
    if (pointers.size === 1 && !dragMoved) {
      const entity = findHit(point);
      if (entity) setSelection(entity);
      schedule();
    }
    pointers.delete(event.pointerId);
    pointerStarts.delete(event.pointerId);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (pointers.size === 0) dragMoved = false;
  }

  function onDoubleClick(event: MouseEvent): void {
    const entity = findHit(localPoint(event));
    if (!entity) return;
    setSelection(entity);
    schedule();
  }

  function onPointerLeave(): void {
    if (pointers.size > 0) return;
    hovered = undefined;
    hideTooltip();
    schedule();
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "+", "=", "-"].includes(event.key)) {
      event.preventDefault();
    }
  }

  function onControl(event: Event): void {
    const action = (event.currentTarget as HTMLButtonElement).dataset.mapAction;
    const centre = { x: viewport.width / 2, y: viewport.height / 2 };
    if (action === "zoom-in") {
      camera = zoomAt(camera, centre, 1.8, viewport);
      followCraft = false;
      schedule();
    } else if (action === "zoom-out") {
      camera = zoomAt(camera, centre, 1 / 1.8, viewport);
      followCraft = false;
      schedule();
    } else if (action === "follow") {
      followCraft = !followCraft;
      schedule();
    } else if (action) preset(action);
  }

  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("dblclick", onDoubleClick);
  canvas.addEventListener("keydown", onKeyDown);
  for (const control of elements.controls) control.addEventListener("click", onControl);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const overlayResizeObserver = new ResizeObserver(() => {
    measureReservedOverlayBounds();
    schedule();
  });
  if (elements.story) overlayResizeObserver.observe(elements.story);
  if (elements.clock) overlayResizeObserver.observe(elements.clock);
  setSelection({
    id: "origin-sun", kind: "origin", name: "Sun", meta: "MAP ORIGIN · 0 AU",
    description: "Zoom from physical Solar System scale to the measured nearby-star catalogue without changing the linear coordinate system.", world: { x: 0, y: 0 }, focusSpanAu: 0.08,
  });

  return {
    setVehicle(vehicle, focus = false): void {
      selectedVehicle = vehicle;
      progress = 0;
      tourFrame = undefined;
      cameraTransition = undefined;
      if (focus) focusVehicle();
      const craft = craftPosition();
      setSelection({
        id: `craft-${vehicle.id}`, kind: "craft", name: vehicle.name, meta: `${vehicle.evidence} · ${formatDistance(craft.radialAu)}`,
        description: vehicle.modelNote, world: craft.point, focusSpanAu: Math.max(0.04, craft.radialAu * 0.35),
      });
      schedule();
    },
    setProgress(nextProgress): MapTelemetry {
      tourFrame = undefined;
      progress = Math.max(0, Math.min(1, nextProgress));
      schedule();
      return telemetry();
    },
    setTourFrame(frame): MapTelemetry {
      tourFrame = frame;
      progress = frame.routeProgress;
      followCraft = true;
      schedule();
      return telemetry();
    },
    setPlaybackActive(active): void {
      if (playbackActive === active) return;
      playbackActive = active;
      resize();
    },
    resetView(): void {
      preset("local-stars");
    },
    destroy(): void {
      destroyed = true;
      resizeObserver.disconnect();
      overlayResizeObserver.disconnect();
      if (animationFrame) cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("dblclick", onDoubleClick);
      canvas.removeEventListener("keydown", onKeyDown);
      for (const control of elements.controls) control.removeEventListener("click", onControl);
    },
  };
}
