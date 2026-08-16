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
  radialEclipticProjection,
  screenToWorld,
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

const SVG_NS = "http://www.w3.org/2000/svg";
const PROXIMA_ID = "proxima-centauri";
const BARNARD_ID = "barnards-star";
const OUTER_OORT_AU = 100_000;
const INNER_OORT_AU = 2_000;
const HELIOPAUSE_AU = 121.6;
const PLANET_ORBITS = [
  { label: "EARTH", radiusAu: 1 },
  { label: "JUPITER", radiusAu: 5.2 },
  { label: "NEPTUNE", radiusAu: 30.05 },
] as const;

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

interface MapLayers {
  grid: SVGGElement;
  boundaries: SVGGElement;
  stars: SVGGElement;
  trajectories: SVGGElement;
  markers: SVGGElement;
  labels: SVGGElement;
}

interface MapElements {
  svg: SVGSVGElement;
  scope: HTMLElement;
  scale: HTMLElement;
  resolution: HTMLElement;
  coordinate: HTMLElement;
  thesis: HTMLElement;
  controls: HTMLButtonElement[];
  layers: MapLayers;
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

function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

function starWorld(star: Cns5NearbyStarRecord): Vec2 {
  return radialEclipticProjection(star.eclipticAu);
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
  const scaled = Math.max(0, Math.min(1, progress)) * (trajectory.samples.length - 1);
  const lowerIndex = Math.floor(scaled);
  const upperIndex = Math.min(trajectory.samples.length - 1, lowerIndex + 1);
  const lower = trajectory.samples[lowerIndex];
  const upper = trajectory.samples[upperIndex];
  if (!lower || !upper) throw new Error(`Empty trajectory: ${trajectory.id}`);
  const point = interpolatePoint(lower, upper, scaled - lowerIndex);
  return {
    ...point,
    date: progress >= 1 ? upper.date : lower.date,
  };
}

function compactPath(points: Vec2[], camera: Camera, viewport: Viewport): string {
  let lastScreen: Vec2 | undefined;
  const commands: string[] = [];
  for (const [index, point] of points.entries()) {
    const screen = worldToScreen(point, camera, viewport);
    if (
      lastScreen &&
      index !== points.length - 1 &&
      Math.hypot(screen.x - lastScreen.x, screen.y - lastScreen.y) < 1.5
    ) {
      continue;
    }
    commands.push(`${commands.length ? "L" : "M"}${screen.x.toFixed(2)},${screen.y.toFixed(2)}`);
    lastScreen = screen;
  }
  return commands.join(" ");
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

export function createSpaceMapController(): SpaceMapController {
  const elements: MapElements = {
    svg: required("#space-map"),
    scope: required("#map-scope"),
    scale: required("#map-scale"),
    resolution: required("#map-resolution"),
    coordinate: required("#map-coordinate"),
    thesis: required("#map-thesis"),
    controls: Array.from(document.querySelectorAll<HTMLButtonElement>("[data-map-action]")),
    layers: {
      grid: required("#map-grid-layer"),
      boundaries: required("#map-boundary-layer"),
      stars: required("#map-star-layer"),
      trajectories: required("#map-trajectory-layer"),
      markers: required("#map-marker-layer"),
      labels: required("#map-label-layer"),
    },
  };

  let viewport: Viewport = { width: 1_200, height: 700 };
  let camera: Camera = { centerAu: { x: 0, y: 0 }, pxPerAu: 0.001 };
  let selectedVehicle: Vehicle;
  let progress = 0;
  let followCraft = false;
  let initialized = false;
  const pointerPositions = new Map<number, Vec2>();
  const previousPointerPositions = new Map<number, Vec2>();

  const voyager = HORIZONS.trajectories.find(({ id }) => id === "voyager1");
  const parker = HORIZONS.trajectories.find(({ id }) => id === "parkerSolarProbe");
  if (!voyager || !parker) throw new Error("Missing vendored JPL trajectories.");

  function catalogueBounds(): Bounds {
    return expandedBounds(CNS5_NEARBY_STARS.map(starWorld), AU_PER_LIGHT_YEAR * 0.35);
  }

  function fullRouteBounds(): Bounds {
    const proxima = starWorld(starById(PROXIMA_ID));
    return expandedBounds(
      [
        { x: -OUTER_OORT_AU, y: -OUTER_OORT_AU },
        { x: OUTER_OORT_AU, y: OUTER_OORT_AU },
        { x: 0, y: 0 },
        proxima,
      ],
      35_000,
    );
  }

  function preset(name: string): void {
    const padding = viewport.width < 700 ? 44 : 84;
    if (name === "local-stars") {
      camera = fitBounds(catalogueBounds(), viewport, padding);
    } else if (name === "full-route") {
      camera = fitBounds(fullRouteBounds(), viewport, padding);
    } else if (name === "oort") {
      camera = fitBounds(
        { minX: -110_000, maxX: 110_000, minY: -110_000, maxY: 110_000 },
        viewport,
        padding,
      );
    } else if (name === "heliosphere") {
      camera = fitBounds(
        { minX: -185, maxX: 185, minY: -185, maxY: 185 },
        viewport,
        padding,
      );
    } else if (name === "planets") {
      camera = fitBounds(
        { minX: -36, maxX: 36, minY: -36, maxY: 36 },
        viewport,
        padding,
      );
    }
    followCraft = false;
    render();
  }

  function trajectoryForVehicle(vehicle: Vehicle): HorizonsTrajectory | undefined {
    if (vehicle.id === "voyager") return voyager;
    if (vehicle.id === "parker") return parker;
    return undefined;
  }

  function trajectoryWorldPoints(trajectory: HorizonsTrajectory): Vec2[] {
    return trajectory.samples.map(radialEclipticProjection);
  }

  function targetForVehicle(vehicle: Vehicle): Cns5NearbyStarRecord | undefined {
    if (!vehicle.phases?.length || vehicle.outbound === false) return undefined;
    return starById(vehicle.id === "daedalus" ? BARNARD_ID : PROXIMA_ID);
  }

  function craftWorld(): { point: Vec2; source?: HorizonsSample; target?: Cns5NearbyStarRecord } {
    const trajectory = trajectoryForVehicle(selectedVehicle);
    if (trajectory) {
      const source = sampleTrajectory(trajectory, progress);
      return { point: radialEclipticProjection(source), source };
    }
    const target = targetForVehicle(selectedVehicle);
    if (!target) return { point: { x: 0, y: 0 } };
    const destination = starWorld(target);
    const fraction = journeySample(selectedVehicle, progress).distanceFraction;
    return {
      point: { x: destination.x * fraction, y: destination.y * fraction },
      target,
    };
  }

  function focusSelectedVehicle(): void {
    const trajectory = trajectoryForVehicle(selectedVehicle);
    const padding = viewport.width < 700 ? 50 : 90;
    if (trajectory) {
      const points = trajectoryWorldPoints(trajectory);
      const span = Math.max(...points.map((point) => Math.hypot(point.x, point.y)), 1);
      camera = fitBounds(expandedBounds(points, span * 0.13), viewport, padding);
      followCraft = false;
      return;
    }
    const target = targetForVehicle(selectedVehicle);
    if (target) {
      const destination = starWorld(target);
      camera = fitBounds(expandedBounds([{ x: 0, y: 0 }, destination], OUTER_OORT_AU * 0.18), viewport, padding);
    }
    followCraft = false;
  }

  function visibleWorldBounds(): Bounds {
    const topLeft = screenToWorld({ x: 0, y: 0 }, camera, viewport);
    const bottomRight = screenToWorld(
      { x: viewport.width, y: viewport.height },
      camera,
      viewport,
    );
    return {
      minX: Math.min(topLeft.x, bottomRight.x),
      maxX: Math.max(topLeft.x, bottomRight.x),
      minY: Math.min(topLeft.y, bottomRight.y),
      maxY: Math.max(topLeft.y, bottomRight.y),
    };
  }

  function renderGrid(): void {
    elements.layers.grid.replaceChildren();
    const bounds = visibleWorldBounds();
    const step = niceStep(110 / camera.pxPerAu);
    const startX = Math.ceil(bounds.minX / step) * step;
    const startY = Math.ceil(bounds.minY / step) * step;
    const maxLines = 40;
    let count = 0;
    for (let x = startX; x <= bounds.maxX && count < maxLines; x += step, count += 1) {
      const screen = worldToScreen({ x, y: 0 }, camera, viewport);
      elements.layers.grid.append(
        svgElement("line", {
          class: Math.abs(x) < step * 0.01 ? "map-axis-line" : "map-grid-line",
          x1: screen.x,
          y1: 0,
          x2: screen.x,
          y2: viewport.height,
        }),
      );
    }
    count = 0;
    for (let y = startY; y <= bounds.maxY && count < maxLines; y += step, count += 1) {
      const screen = worldToScreen({ x: 0, y }, camera, viewport);
      elements.layers.grid.append(
        svgElement("line", {
          class: Math.abs(y) < step * 0.01 ? "map-axis-line" : "map-grid-line",
          x1: 0,
          y1: screen.y,
          x2: viewport.width,
          y2: screen.y,
        }),
      );
    }
    elements.scale.textContent = `120 PX = ${formatScaleDistance(step)}`;
  }

  function appendLabel(
    text: string,
    screen: Vec2,
    className: string,
    offset: Vec2 = { x: 10, y: -10 },
  ): SVGTextElement {
    const label = svgElement("text", {
      class: className,
      x: screen.x + offset.x,
      y: screen.y + offset.y,
    });
    label.textContent = text;
    elements.layers.labels.append(label);
    return label;
  }

  function renderRing(radiusAu: number, className: string, label: string): void {
    const centre = worldToScreen({ x: 0, y: 0 }, camera, viewport);
    const radius = radiusAu * camera.pxPerAu;
    const maxDimension = Math.max(viewport.width, viewport.height);
    if (radius < 2 || radius > maxDimension * 3.5) return;
    elements.layers.boundaries.append(
      svgElement("circle", {
        class: className,
        cx: centre.x,
        cy: centre.y,
        r: radius,
      }),
    );
    const angle = -0.62;
    const labelScreen = {
      x: centre.x + Math.cos(angle) * radius,
      y: centre.y + Math.sin(angle) * radius,
    };
    if (
      labelScreen.x > 10 &&
      labelScreen.x < viewport.width - 10 &&
      labelScreen.y > 20 &&
      labelScreen.y < viewport.height - 10
    ) {
      appendLabel(label, labelScreen, "map-boundary-label", { x: 8, y: -6 });
    }
  }

  function renderBoundaries(): void {
    elements.layers.boundaries.replaceChildren();
    for (const orbit of PLANET_ORBITS) {
      renderRing(
        orbit.radiusAu,
        `map-orbit${orbit.label === "EARTH" ? " is-earth" : ""}`,
        `${orbit.label} · ${formatDistance(orbit.radiusAu)}`,
      );
    }
    renderRing(HELIOPAUSE_AU, "map-shell is-heliopause", "VOYAGER CROSSING · 121.6 AU");
    renderRing(INNER_OORT_AU, "map-shell", "INNER OORT · ~2,000 AU");
    renderRing(OUTER_OORT_AU, "map-shell is-outer-oort", "OUTER OORT · ~100,000 AU");
    renderRing(AU_PER_LIGHT_YEAR * 10, "map-shell is-local", "10 LY CATALOGUE CONTEXT");

    const sun = worldToScreen({ x: 0, y: 0 }, camera, viewport);
    if (
      sun.x > -12 &&
      sun.x < viewport.width + 12 &&
      sun.y > -12 &&
      sun.y < viewport.height + 12
    ) {
      elements.layers.boundaries.append(
        svgElement("circle", { class: "map-sun", cx: sun.x, cy: sun.y, r: 6 }),
      );
      appendLabel("SUN · ORIGIN", sun, "map-label", { x: 11, y: 17 });
    }
  }

  function renderStars(): void {
    elements.layers.stars.replaceChildren();
    const visible = new Map<string, Vec2>();
    for (const star of CNS5_NEARBY_STARS) {
      const screen = worldToScreen(starWorld(star), camera, viewport);
      if (
        screen.x < -40 ||
        screen.x > viewport.width + 40 ||
        screen.y < -40 ||
        screen.y > viewport.height + 40
      ) {
        continue;
      }
      visible.set(star.id, screen);
      const radius = star.id === PROXIMA_ID ? 7 : 4.5;
      elements.layers.stars.append(
        svgElement("rect", {
          class: `map-star${star.id === PROXIMA_ID ? " is-proxima" : ""}${star.kind === "brown-dwarf-binary" ? " is-brown-dwarf" : ""}`,
          x: screen.x - radius,
          y: screen.y - radius,
          width: radius * 2,
          height: radius * 2,
          transform: `rotate(45 ${screen.x} ${screen.y})`,
        }),
      );
      let side = star.id.length % 2 === 0 ? 1 : -1;
      const edgeGuard = Math.min(135, viewport.width * 0.34);
      if (screen.x < edgeGuard) side = 1;
      if (screen.x > viewport.width - edgeGuard) side = -1;
      const xOffset = side > 0 ? 12 : -12;
      const labelYOffset = star.id === PROXIMA_ID
        ? 18
        : star.id === "alpha-centauri-ab"
          ? -18
          : -10;
      const label = appendLabel(star.name.toUpperCase(), screen, "map-star-label", {
        x: xOffset,
        y: labelYOffset,
      });
      if (side < 0) label.setAttribute("text-anchor", "end");
      const meta = appendLabel(
        `${star.distanceLy.toFixed(2)} LY · β ${eclipticLatitudeDegrees(star.eclipticAu).toFixed(1)}°`,
        screen,
        "map-star-meta",
        { x: xOffset, y: labelYOffset + 14 },
      );
      if (side < 0) meta.setAttribute("text-anchor", "end");
    }

    const proxima = visible.get(PROXIMA_ID);
    const alpha = visible.get("alpha-centauri-ab");
    if (proxima && alpha) {
      elements.layers.stars.prepend(
        svgElement("line", {
          class: "map-connection",
          x1: proxima.x,
          y1: proxima.y,
          x2: alpha.x,
          y2: alpha.y,
        }),
      );
    }
  }

  function renderEventMarker(
    trajectory: HorizonsTrajectory,
    datePrefix: string,
    label: string,
  ): void {
    const targetTime = Date.parse(`${datePrefix}T00:00:00Z`);
    const sample = trajectory.samples.reduce<HorizonsSample | undefined>((nearest, candidate) => {
      if (!nearest) return candidate;
      const candidateDistance = Math.abs(Date.parse(`${candidate.date}Z`) - targetTime);
      const nearestDistance = Math.abs(Date.parse(`${nearest.date}Z`) - targetTime);
      return candidateDistance < nearestDistance ? candidate : nearest;
    }, undefined);
    if (!sample) return;
    const screen = worldToScreen(radialEclipticProjection(sample), camera, viewport);
    const sunScreen = worldToScreen({ x: 0, y: 0 }, camera, viewport);
    if (
      screen.x < 5 ||
      screen.x > viewport.width - 5 ||
      screen.y < 5 ||
      screen.y > viewport.height - 5 ||
      Math.hypot(screen.x - sunScreen.x, screen.y - sunScreen.y) < 28
    ) {
      return;
    }
    elements.layers.markers.append(
      svgElement("circle", { class: "map-craft-marker", cx: screen.x, cy: screen.y, r: 3 }),
    );
    appendLabel(label, screen, "map-star-meta", { x: 8, y: -7 });
  }

  function renderTrajectory(): void {
    elements.layers.trajectories.replaceChildren();
    elements.layers.markers.replaceChildren();
    const actual = trajectoryForVehicle(selectedVehicle);
    const craft = craftWorld();

    if (actual) {
      const points = trajectoryWorldPoints(actual);
      elements.layers.trajectories.append(
        svgElement("path", {
          class: "map-trajectory is-ephemeris",
          d: compactPath(points, camera, viewport),
        }),
      );
      if (actual.id === "voyager1") {
        renderEventMarker(actual, "1979-03-05", "JUPITER ASSIST");
        renderEventMarker(actual, "1980-11-12", "SATURN / TITAN TURN");
        renderEventMarker(actual, "2012-08-25", "HELIOPAUSE EVENT · 2012");
      }
    } else {
      const target = targetForVehicle(selectedVehicle);
      if (target) {
        const destination = starWorld(target);
        elements.layers.trajectories.append(
          svgElement("path", {
            class: `map-trajectory ${selectedVehicle.category === "fiction" ? "is-fiction" : "is-model"}`,
            d: compactPath([{ x: 0, y: 0 }, destination], camera, viewport),
          }),
        );
      }
    }

    const screen = worldToScreen(craft.point, camera, viewport);
    if (
      screen.x >= -25 &&
      screen.x <= viewport.width + 25 &&
      screen.y >= -25 &&
      screen.y <= viewport.height + 25
    ) {
      elements.layers.markers.append(
        svgElement("circle", { class: "map-craft-marker", cx: screen.x, cy: screen.y, r: 7 }),
      );
      appendLabel(selectedVehicle.name.toUpperCase(), screen, "map-craft-label", {
        x: 12,
        y: -11,
      });
    }

    if (craft.source) {
      const radius = Math.hypot(craft.source.x, craft.source.y, craft.source.z);
      const latitude = eclipticLatitudeDegrees(craft.source);
      elements.coordinate.textContent = `${selectedVehicle.name.toUpperCase()} · ${craft.source.date.slice(0, 10)} · ${formatDistance(radius)} · β ${latitude.toFixed(1)}°`;
    } else if (craft.target) {
      const radius = Math.hypot(craft.point.x, craft.point.y);
      elements.coordinate.textContent = `${selectedVehicle.name.toUpperCase()} · ${formatDistance(radius)} · MODEL TO ${craft.target.name.toUpperCase()}`;
    } else {
      elements.coordinate.textContent = `${selectedVehicle.name.toUpperCase()} · NO COMPARABLE LINEAR ROUTE`;
    }
  }

  function renderHud(): void {
    const visibleAu = viewport.width / camera.pxPerAu;
    if (visibleAu >= AU_PER_LIGHT_YEAR * 12) {
      elements.scope.textContent = `LOCAL STARS · ${(visibleAu / AU_PER_LIGHT_YEAR).toFixed(1)} LY WIDE`;
    } else if (visibleAu >= 180_000) {
      elements.scope.textContent = `OORT CONTEXT · ${Math.round(visibleAu).toLocaleString("en-AU")} AU WIDE`;
    } else if (visibleAu >= 800) {
      elements.scope.textContent = `OORT SCALE · ${Math.round(visibleAu).toLocaleString("en-AU")} AU WIDE`;
    } else if (visibleAu >= 300) {
      elements.scope.textContent = `HELIOPAUSE SCALE · ${Math.round(visibleAu).toLocaleString("en-AU")} AU WIDE`;
    } else {
      elements.scope.textContent = `PLANETARY SCALE · ${visibleAu.toFixed(1)} AU WIDE`;
    }
    const neptunePixels = 30.05 * camera.pxPerAu;
    elements.resolution.textContent = `NEPTUNE ORBIT = ${neptunePixels < 0.01 ? "<0.01" : neptunePixels.toFixed(neptunePixels < 10 ? 2 : 0)} PX`;
    elements.thesis.hidden = visibleAu < 150_000;
  }

  function render(): void {
    if (!selectedVehicle) return;
    if (followCraft) camera = { ...camera, centerAu: craftWorld().point };
    renderGrid();
    elements.layers.labels.replaceChildren();
    renderBoundaries();
    renderStars();
    renderTrajectory();
    renderHud();
    for (const control of elements.controls) {
      if (control.dataset.mapAction === "follow") {
        control.setAttribute("aria-pressed", String(followCraft));
      }
    }
  }

  function telemetry(): MapTelemetry {
    const craft = craftWorld();
    if (craft.source) {
      const trajectory = trajectoryForVehicle(selectedVehicle);
      const firstDate = trajectory?.samples[0]?.date;
      const elapsedYears = firstDate
        ? (Date.parse(`${craft.source.date}Z`) - Date.parse(`${firstDate}Z`)) /
          (365.25 * 24 * 60 * 60 * 1_000)
        : undefined;
      return {
        mode: "ephemeris",
        date: craft.source.date.slice(0, 10),
        elapsedYears,
        radialAu: Math.hypot(craft.source.x, craft.source.y, craft.source.z),
      };
    }
    if (craft.target) {
      return {
        mode: "model",
        radialAu: Math.hypot(craft.point.x, craft.point.y),
      };
    }
    return { mode: "unavailable", radialAu: 0 };
  }

  function resize(): void {
    const rect = elements.svg.getBoundingClientRect();
    viewport = {
      width: Math.max(320, rect.width || 1_200),
      height: Math.max(420, rect.height || 700),
    };
    elements.svg.setAttribute("viewBox", `0 0 ${viewport.width} ${viewport.height}`);
    if (!initialized) {
      camera = fitBounds(catalogueBounds(), viewport, viewport.width < 700 ? 44 : 84);
      initialized = true;
    }
    render();
  }

  function localPoint(event: PointerEvent | WheelEvent): Vec2 {
    const rect = elements.svg.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    camera = zoomAt(camera, localPoint(event), Math.exp(-event.deltaY * 0.0015), viewport);
    followCraft = false;
    render();
  }

  function onPointerDown(event: PointerEvent): void {
    elements.svg.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    pointerPositions.set(event.pointerId, point);
    previousPointerPositions.set(event.pointerId, point);
  }

  function onPointerMove(event: PointerEvent): void {
    if (!pointerPositions.has(event.pointerId)) return;
    const current = localPoint(event);
    const previous = pointerPositions.get(event.pointerId);
    if (!previous) return;
    previousPointerPositions.clear();
    for (const [id, point] of pointerPositions) previousPointerPositions.set(id, point);
    pointerPositions.set(event.pointerId, current);

    const currentPoints = [...pointerPositions.values()];
    const previousPoints = [...previousPointerPositions.values()];
    if (currentPoints.length >= 2 && previousPoints.length >= 2) {
      const [a, b] = currentPoints;
      const [previousA, previousB] = previousPoints;
      if (!a || !b || !previousA || !previousB) return;
      const currentCentre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const previousCentre = {
        x: (previousA.x + previousB.x) / 2,
        y: (previousA.y + previousB.y) / 2,
      };
      camera = panByPixels(camera, {
        x: currentCentre.x - previousCentre.x,
        y: currentCentre.y - previousCentre.y,
      });
      const previousDistance = Math.hypot(
        previousA.x - previousB.x,
        previousA.y - previousB.y,
      );
      const currentDistance = Math.hypot(a.x - b.x, a.y - b.y);
      if (previousDistance > 0) {
        camera = zoomAt(camera, currentCentre, currentDistance / previousDistance, viewport);
      }
    } else {
      camera = panByPixels(camera, {
        x: current.x - previous.x,
        y: current.y - previous.y,
      });
    }
    followCraft = false;
    render();
  }

  function onPointerUp(event: PointerEvent): void {
    pointerPositions.delete(event.pointerId);
    previousPointerPositions.delete(event.pointerId);
    if (elements.svg.hasPointerCapture(event.pointerId)) {
      elements.svg.releasePointerCapture(event.pointerId);
    }
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
    else return;
    event.preventDefault();
    followCraft = false;
    render();
  }

  function onControl(event: Event): void {
    const control = event.currentTarget as HTMLButtonElement;
    const action = control.dataset.mapAction;
    const centre = { x: viewport.width / 2, y: viewport.height / 2 };
    if (action === "zoom-in") {
      camera = zoomAt(camera, centre, 1.8, viewport);
      followCraft = false;
      render();
    } else if (action === "zoom-out") {
      camera = zoomAt(camera, centre, 1 / 1.8, viewport);
      followCraft = false;
      render();
    } else if (action === "follow") {
      followCraft = !followCraft;
      render();
    } else if (action) {
      preset(action);
    }
  }

  elements.svg.addEventListener("wheel", onWheel, { passive: false });
  elements.svg.addEventListener("pointerdown", onPointerDown);
  elements.svg.addEventListener("pointermove", onPointerMove);
  elements.svg.addEventListener("pointerup", onPointerUp);
  elements.svg.addEventListener("pointercancel", onPointerUp);
  elements.svg.addEventListener("keydown", onKeyDown);
  for (const control of elements.controls) control.addEventListener("click", onControl);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(elements.svg);

  return {
    setVehicle(vehicle, focus = false): void {
      selectedVehicle = vehicle;
      progress = 0;
      if (focus) focusSelectedVehicle();
      render();
    },
    setProgress(nextProgress): MapTelemetry {
      progress = Math.max(0, Math.min(1, nextProgress));
      render();
      return telemetry();
    },
    resetView(): void {
      preset("local-stars");
    },
    destroy(): void {
      resizeObserver.disconnect();
      elements.svg.removeEventListener("wheel", onWheel);
      elements.svg.removeEventListener("pointerdown", onPointerDown);
      elements.svg.removeEventListener("pointermove", onPointerMove);
      elements.svg.removeEventListener("pointerup", onPointerUp);
      elements.svg.removeEventListener("pointercancel", onPointerUp);
      elements.svg.removeEventListener("keydown", onKeyDown);
      for (const control of elements.controls) control.removeEventListener("click", onControl);
    },
  };
}
