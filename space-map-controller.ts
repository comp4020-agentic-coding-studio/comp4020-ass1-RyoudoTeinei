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
  interpolatePoint,
  panByPixels,
  worldToScreen,
  zoomAt,
  type Bounds,
  type Camera,
  type Vec2,
  type Vec3,
  type Viewport,
} from "./space-map";
import {
  formatDistance,
  journeySample,
  type Vehicle,
} from "./mission-data";

const PROXIMA_ID = "proxima-centauri";
const BARNARD_ID = "barnards-star";
const OUTER_OORT_AU = 100_000;
const INNER_OORT_AU = 2_000;
const HELIOPAUSE_AU = 121.6;

interface HorizonsSample extends Vec3 {
  date: string;
}

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
  resetView(): void;
  destroy(): void;
}

export interface MapTelemetry {
  mode: "ephemeris" | "model" | "unavailable";
  date?: string;
  elapsedYears?: number;
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

function sampleTrajectory(
  trajectory: HorizonsTrajectory,
  progress: number,
): HorizonsSample {
  const first = trajectory.samples[0];
  const last = trajectory.samples.at(-1);
  if (!first || !last) throw new Error(`Empty trajectory: ${trajectory.id}`);
  const toTime = (sample: HorizonsSample): number => Date.parse(`${sample.date}Z`);
  const firstTime = toTime(first);
  const lastTime = toTime(last);
  const targetTime = firstTime + (lastTime - firstTime) * Math.max(0, Math.min(1, progress));
  let low = 0;
  let high = trajectory.samples.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    const sample = trajectory.samples[middle];
    if (!sample || toTime(sample) > targetTime) high = middle;
    else low = middle;
  }
  const lower = trajectory.samples[low] ?? first;
  const upper = trajectory.samples[high] ?? last;
  const lowerTime = toTime(lower);
  const upperTime = toTime(upper);
  const amount = upperTime === lowerTime ? 0 : (targetTime - lowerTime) / (upperTime - lowerTime);
  return {
    ...interpolatePoint(lower, upper, amount),
    date: new Date(targetTime).toISOString().slice(0, 19),
  };
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
  inspector?: HTMLElement;
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
    inspector: optionalElement(".map-inspector"),
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
  let followCraft = false;
  let initialized = false;
  let dpr = 1;
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
  const pointers = new Map<number, Vec2>();
  const pointerStarts = new Map<number, Vec2>();

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
    if (!vehicle?.phases?.length || vehicle.outbound === false) return undefined;
    return starById(vehicle.id === "daedalus" ? BARNARD_ID : PROXIMA_ID);
  }

  function trajectoryPoints(trajectory: HorizonsTrajectory): Vec2[] {
    return trajectory.samples.map(({ x, y }) => ({ x, y }));
  }

  function craftPosition(): { point: Vec2; radialAu: number; source?: HorizonsSample; target?: Cns5NearbyStarRecord } {
    const trajectory = actualTrajectory();
    if (trajectory) {
      const source = sampleTrajectory(trajectory, progress);
      return { point: { x: source.x, y: source.y }, radialAu: Math.hypot(source.x, source.y, source.z), source };
    }
    const target = targetStar();
    if (!selectedVehicle || !target) return { point: { x: 0, y: 0 }, radialAu: 0 };
    const destination = starWorld(target);
    const sample = journeySample(selectedVehicle, progress);
    return {
      point: { x: destination.x * sample.distanceFraction, y: destination.y * sample.distanceFraction },
      radialAu: sample.currentAu,
      target,
    };
  }

  function focusVehicle(): void {
    if (!selectedVehicle) return;
    const trajectory = actualTrajectory();
    const padding = viewport.width < 700 ? 48 : 88;
    if (trajectory) {
      const points = trajectoryPoints(trajectory);
      const span = Math.max(...points.map((point) => Math.hypot(point.x, point.y)), 1);
      camera = fitBounds(expandedBounds(points, span * 0.13), viewport, padding);
    } else {
      const target = targetStar();
      if (target) camera = fitBounds(expandedBounds([{ x: 0, y: 0 }, starWorld(target)], OUTER_OORT_AU * 0.18), viewport, padding);
    }
    followCraft = false;
  }

  function preset(name: string): void {
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

  function focusEntity(entity: CanvasMapEntity): void {
    if (entity.world) {
      const span = entity.focusSpanAu ?? viewport.width / camera.pxPerAu;
      camera = fitBounds({ minX: entity.world.x - span / 2, maxX: entity.world.x + span / 2, minY: entity.world.y - span / 2, maxY: entity.world.y + span / 2 }, viewport, viewport.width < 700 ? 44 : 76);
    } else if (entity.focusSpanAu) {
      const half = entity.focusSpanAu / 2;
      camera = fitBounds({ minX: -half, maxX: half, minY: -half, maxY: half }, viewport, viewport.width < 700 ? 44 : 76);
    }
    followCraft = false;
    schedule();
  }

  function queueLabel(label: CanvasLabel): void {
    labels.push(label);
  }

  function reserveInspectorArea(): void {
    const inspector = elements.inspector;
    if (!inspector) return;
    const canvasRect = canvas.getBoundingClientRect();
    const inspectorRect = inspector.getBoundingClientRect();
    if (inspectorRect.width <= 0 || inspectorRect.height <= 0) return;
    occupiedLabels.push({
      minX: Math.max(0, inspectorRect.left - canvasRect.left - 8),
      maxX: Math.min(viewport.width, inspectorRect.right - canvasRect.left + 8),
      minY: Math.max(0, inspectorRect.top - canvasRect.top - 8),
      maxY: Math.min(viewport.height, inspectorRect.bottom - canvasRect.top + 8),
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
      id: "origin-sun", kind: "origin", name: "Sun", meta: "MAP ORIGIN · 0 AU",
      description: "The origin of the ecliptic map. The visible marker is a locator at wide scales.", world: { x: 0, y: 0 }, focusSpanAu: 0.08,
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
      queueLabel({ anchor: centre, lines: ["SUN · ORIGIN"], priority: 98, color: "#f1eee2" });
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

  function drawEvent(trajectory: HorizonsTrajectory, date: string, name: string): void {
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

  function drawTrajectory(): void {
    if (!selectedVehicle) {
      craftReadout = "SUN · 0 AU";
      return;
    }
    const actual = actualTrajectory();
    const craft = craftPosition();
    if (actual) {
      const entity: CanvasMapEntity = {
        id: `trajectory-${actual.id}`, kind: "trajectory", name: `${actual.name} ephemeris`, meta: "NASA/JPL HORIZONS · J2000 ECLIPTIC XY",
        description: "A vendored geometric state-vector path. Source x/y samples are drawn directly, with z retained in the craft readout.",
      };
      const path = drawPath(trajectoryPoints(actual), "#6adfff", [], emphasized(entity.id) ? 1 : 0.78, emphasized(entity.id) ? 3.6 : 2.2);
      hits.push({ type: "path", entity, points: path, tolerance: 7, priority: 8 });
      if (actual.id === "voyager1") {
        drawEvent(actual, "1979-03-05", "JUPITER ASSIST");
        drawEvent(actual, "1980-11-12", "SATURN / TITAN TURN");
        drawEvent(actual, "2012-08-25", "HELIOPAUSE EVENT · 2012");
      }
    } else {
      const target = targetStar();
      if (target) {
        const destination = starWorld(target);
        const color = selectedVehicle.category === "fiction" ? "#c6a8ff" : "#b3ff3f";
        const entity: CanvasMapEntity = {
          id: `trajectory-model-${selectedVehicle.id}`, kind: "trajectory", name: `${selectedVehicle.name} route model`,
          meta: `${selectedVehicle.evidence} · ECLIPTIC XY PROJECTION`, description: selectedVehicle.modelNote,
        };
        const path = drawPath([{ x: 0, y: 0 }, destination], color, selectedVehicle.category === "fiction" ? [4, 7] : [10, 7], emphasized(entity.id) ? 1 : 0.76, emphasized(entity.id) ? 3.6 : 2.2);
        hits.push({ type: "path", entity, points: path, tolerance: 7, priority: 8 });
      }
    }

    const point = worldToScreen(craft.point, camera, viewport);
    const craftEntity: CanvasMapEntity = {
      id: `craft-${selectedVehicle.id}`, kind: "craft", name: selectedVehicle.name,
      meta: actual ? `${craft.source?.date.slice(0, 10)} · ${formatDistance(craft.radialAu)}` : `${selectedVehicle.evidence} · ${formatDistance(craft.radialAu)}`,
      description: actual ? "Position interpolated by elapsed ephemeris time from the vendored JPL Horizons samples." : selectedVehicle.modelNote,
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
      ctx.strokeStyle = "#6adfff";
      ctx.lineWidth = emphasized(craftEntity.id) ? 3.5 : 2.5;
      ctx.stroke();
      hits.push({ type: "point", entity: craftEntity, point, radius: 12, priority: 35 });
      queueLabel({ anchor: point, lines: [selectedVehicle.name.toUpperCase()], priority: 106, color: "#6adfff" });
    }

    if (craft.source) {
      craftReadout = `${selectedVehicle.name.toUpperCase()} · ${craft.source.date.slice(0, 10)} · ${formatDistance(craft.radialAu)} · β ${eclipticLatitudeDegrees(craft.source).toFixed(1)}°`;
    } else if (craft.target) {
      const targetAu = craft.target.distanceLy * AU_PER_LIGHT_YEAR;
      craftReadout = `${selectedVehicle.name.toUpperCase()} · ${formatDistance(craft.radialAu)} · ${(craft.radialAu / targetAu * 100).toFixed(1)}% TO ${craft.target.name.toUpperCase()}`;
    } else craftReadout = `${selectedVehicle.name.toUpperCase()} · NO COMPARABLE LINEAR ROUTE`;
  }

  function drawScale(): void {
    let distance = niceStep(118 / camera.pxPerAu);
    while (distance * camera.pxPerAu > 180) distance /= 2;
    const pixels = distance * camera.pxPerAu;
    if (elements.scaleRule && elements.scaleLabel) {
      elements.scaleRule.style.width = `${pixels}px`;
      elements.scaleLabel.textContent = formatScaleDistance(distance);
      elements.scale.textContent = `SCALE BAR · ${formatScaleDistance(distance)}`;
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
    ctx.fillText(formatScaleDistance(distance), x, y - 10);
    ctx.restore();
    elements.scale.textContent = `SCALE BAR · ${formatScaleDistance(distance)}`;
  }

  function drawHud(): void {
    const visibleAu = viewport.width / camera.pxPerAu;
    if (visibleAu >= AU_PER_LIGHT_YEAR * 12) elements.scope.textContent = `CATALOG RADIUS 12 LY · VIEW ${(visibleAu / AU_PER_LIGHT_YEAR).toFixed(1)} LY WIDE`;
    else if (visibleAu >= 180_000) elements.scope.textContent = `ECLIPTIC XY · ${Math.round(visibleAu).toLocaleString("en-AU")} AU WIDE`;
    else if (visibleAu >= 800) elements.scope.textContent = `OORT SCALE · ${Math.round(visibleAu).toLocaleString("en-AU")} AU WIDE`;
    else if (visibleAu >= 300) elements.scope.textContent = `HELIOPAUSE SCALE · ${Math.round(visibleAu).toLocaleString("en-AU")} AU WIDE`;
    else elements.scope.textContent = `PLANETARY SCALE · ${visibleAu.toFixed(visibleAu < 1 ? 3 : 1)} AU WIDE`;
    const neptunePixels = 30.1104 * camera.pxPerAu;
    elements.resolution.textContent = `NEPTUNE ORBIT = ${neptunePixels < 0.01 ? "<0.01" : neptunePixels.toFixed(neptunePixels < 10 ? 2 : 0)} PX`;
    elements.coordinate.textContent = hovered ? `${hovered.name.toUpperCase()} · ${hovered.meta}` : craftReadout;
    elements.thesis.hidden = visibleAu < 150_000;
    for (const control of elements.controls) {
      if (control.dataset.mapAction === "follow") control.setAttribute("aria-pressed", String(followCraft));
    }
  }

  function render(): void {
    if (destroyed || viewport.width <= 0 || viewport.height <= 0) return;
    if (followCraft && selectedVehicle) camera = { ...camera, centerAu: craftPosition().point };
    const ctx = elements.context;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, viewport.width, viewport.height);
    hits = [];
    labels = [];
    occupiedLabels = [];
    reserveInspectorArea();
    drawBackground();
    drawBoundaries();
    drawRadialGrid();
    drawSolarSystem();
    drawStars();
    drawTrajectory();
    drawLabels();
    drawScale();
    drawHud();
  }

  function telemetry(): MapTelemetry {
    const craft = craftPosition();
    if (craft.source) {
      const first = actualTrajectory()?.samples[0];
      const elapsedYears = first ? (Date.parse(`${craft.source.date}Z`) - Date.parse(`${first.date}Z`)) / (365.25 * 86_400_000) : undefined;
      return { mode: "ephemeris", date: craft.source.date.slice(0, 10), elapsedYears, radialAu: craft.radialAu };
    }
    if (craft.target) return { mode: "model", radialAu: craft.radialAu };
    return { mode: "unavailable", radialAu: 0 };
  }

  function resize(): void {
    const rect = canvas.getBoundingClientRect();
    viewport = { width: Math.max(1, rect.width || 1_200), height: Math.max(1, rect.height || 700) };
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(viewport.width * dpr));
    const height = Math.max(1, Math.round(viewport.height * dpr));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    if (!initialized) {
      camera = fitBounds(catalogueBounds(), viewport, viewport.width < 700 ? 44 : 84);
      initialized = true;
    }
    schedule();
  }

  function localPoint(event: PointerEvent | WheelEvent | MouseEvent): Vec2 {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    camera = zoomAt(camera, localPoint(event), Math.exp(-event.deltaY * 0.0015), viewport);
    followCraft = false;
    schedule();
  }

  function onPointerDown(event: PointerEvent): void {
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
      canvas.style.cursor = entity ? "pointer" : "grab";
      return;
    }
    const previous = new Map(pointers);
    const current = localPoint(event);
    const start = pointerStarts.get(event.pointerId);
    if (start && Math.hypot(current.x - start.x, current.y - start.y) > 4) dragMoved = true;
    pointers.set(event.pointerId, current);
    const pair = [...pointers.entries()].slice(0, 2);
    if (pair.length === 2) {
      const firstEntry = pair[0];
      const secondEntry = pair[1];
      if (!firstEntry || !secondEntry) return;
      const [firstId, first] = firstEntry;
      const [secondId, second] = secondEntry;
      const oldFirst = previous.get(firstId) ?? first;
      const oldSecond = previous.get(secondId) ?? second;
      const centre = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const oldCentre = { x: (oldFirst.x + oldSecond.x) / 2, y: (oldFirst.y + oldSecond.y) / 2 };
      camera = panByPixels(camera, { x: centre.x - oldCentre.x, y: centre.y - oldCentre.y });
      const oldDistance = Math.hypot(oldFirst.x - oldSecond.x, oldFirst.y - oldSecond.y);
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      if (oldDistance > 0) camera = zoomAt(camera, centre, distance / oldDistance, viewport);
    } else {
      const old = previous.get(event.pointerId);
      if (old) camera = panByPixels(camera, { x: current.x - old.x, y: current.y - old.y });
    }
    followCraft = false;
    schedule();
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
    focusEntity(entity);
  }

  function onPointerLeave(): void {
    if (pointers.size > 0) return;
    hovered = undefined;
    hideTooltip();
    schedule();
  }

  function onKeyDown(event: KeyboardEvent): void {
    const centre = { x: viewport.width / 2, y: viewport.height / 2 };
    if (["+", "="].includes(event.key)) camera = zoomAt(camera, centre, 1.7, viewport);
    else if (event.key === "-") camera = zoomAt(camera, centre, 1 / 1.7, viewport);
    else if (event.key === "ArrowLeft") camera = panByPixels(camera, { x: viewport.width * 0.12, y: 0 });
    else if (event.key === "ArrowRight") camera = panByPixels(camera, { x: -viewport.width * 0.12, y: 0 });
    else if (event.key === "ArrowUp") camera = panByPixels(camera, { x: 0, y: viewport.height * 0.12 });
    else if (event.key === "ArrowDown") camera = panByPixels(camera, { x: 0, y: -viewport.height * 0.12 });
    else if (["0", "Home"].includes(event.key)) return preset("full-route");
    else if (event.key === "1") return preset("planets");
    else if (event.key === "2") return preset("oort");
    else if (event.key === "3") return preset("full-route");
    else if (event.key === "4") return preset("local-stars");
    else return;
    event.preventDefault();
    followCraft = false;
    schedule();
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
  setSelection({
    id: "origin-sun", kind: "origin", name: "Sun", meta: "MAP ORIGIN · 0 AU",
    description: "Zoom from physical Solar System scale to the measured nearby-star catalogue without changing the linear coordinate system.", world: { x: 0, y: 0 }, focusSpanAu: 0.08,
  });

  return {
    setVehicle(vehicle, focus = false): void {
      selectedVehicle = vehicle;
      progress = 0;
      if (focus) focusVehicle();
      const craft = craftPosition();
      setSelection({
        id: `craft-${vehicle.id}`, kind: "craft", name: vehicle.name, meta: `${vehicle.evidence} · ${formatDistance(craft.radialAu)}`,
        description: vehicle.modelNote, world: craft.point, focusSpanAu: Math.max(0.04, craft.radialAu * 0.35),
      });
      schedule();
    },
    setProgress(nextProgress): MapTelemetry {
      progress = Math.max(0, Math.min(1, nextProgress));
      schedule();
      return telemetry();
    },
    resetView(): void {
      preset("local-stars");
    },
    destroy(): void {
      destroyed = true;
      resizeObserver.disconnect();
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
