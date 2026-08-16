import {
  VEHICLES,
  formatDuration,
  formatSpeed,
  journeySample,
  milestoneYears,
  onwardComparisonYears,
  profilePoints,
  speedFactorAt,
  totalTravelYears,
  type Vehicle,
} from "./mission-data";
import { createSpaceMapController } from "./space-map-controller";
import {
  buildMissionTour,
  sampleMissionTour,
  type MissionTour,
  type MissionTourSample,
} from "./mission-tour";
import {
  buildMissionPhysicalTimeline,
  sampleMissionTourAtPhysicalTime,
  type MissionPhysicalTimeline,
  type PhysicalMissionTourSample,
} from "./mission-physical-time";
import {
  JULIAN_YEAR_SECONDS,
  SIMULATION_RATE_OPTIONS,
  advanceSimulationClock,
} from "./simulation-clock";
import {
  autoTimeFlowForStage,
  formatAutoPace,
  type AutoTimeStage,
} from "./auto-time-flow";
import { getVehicleDossier } from "./vehicle-dossiers";
import { timeAnalogyAt } from "./time-analogies";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Required element not found: ${selector}`);
  return element;
}

const consoleElement = required<HTMLElement>(".mission-console");
const vehicleButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>("[data-vehicle]"),
);
const selectedKicker = required<HTMLElement>("#selected-kicker");
const selectedName = required<HTMLElement>("#selected-name");
const evidenceTag = required<HTMLElement>("#evidence-tag");
const journeyTime = required<HTMLElement>("#journey-time");
const arrivalRoute = required<HTMLElement>("#arrival-route");
const arrivalSubline = required<HTMLElement>("#arrival-subline");
const launchButton = required<HTMLButtonElement>("#launch-button");
const launchIcon = required<HTMLElement>("#launch-button .launch-icon");
const launchLabel = required<HTMLElement>("#launch-label");
const transportButton = required<HTMLButtonElement>("#transport-button");
const transportIcon = required<HTMLElement>("#transport-icon");
const transportLabel = required<HTMLElement>("#transport-label");
const playbackRateSelect = required<HTMLSelectElement>("#playback-rate");
const resetButton = required<HTMLButtonElement>("#reset-button");
const progressInput = required<HTMLInputElement>("#journey-progress");
const progressLabel = required<HTMLElement>("#progress-label");
const missionFlowContext = required<HTMLElement>("#mission-flow-context");
const missionFlowList = required<HTMLOListElement>("#mission-flow-list");
const elapsedReadout = required<HTMLElement>("#elapsed-readout");
const speedReadout = required<HTMLElement>("#speed-readout");
const phaseReadout = required<HTMLElement>("#phase-readout");
const phaseDescription = required<HTMLElement>("#phase-description");
const nextStageReadout = required<HTMLElement>("#next-stage-readout");
const nextStageTime = required<HTMLElement>("#next-stage-time");
const profileScale = required<HTMLElement>("#profile-scale");
const speedLine = required<SVGPolylineElement>("#speed-line");
const chartCursor = required<SVGLineElement>("#chart-cursor");
const chartPoint = required<SVGCircleElement>("#chart-point");
const chartTitle = required<SVGTitleElement>("#speed-chart-title");
const chartDescription = required<SVGDescElement>("#speed-chart-desc");
const phaseKey = required<HTMLElement>("#phase-key");
const vehicleDescription = required<HTMLElement>("#vehicle-description");
const modelNote = required<HTMLElement>("#model-note");
const timeHeliopause = required<HTMLElement>("#time-heliopause");
const timeOort = required<HTMLElement>("#time-oort");
const timeProxima = required<HTMLElement>("#time-proxima");
const tourStory = required<HTMLElement>("#tour-story");
const tourStep = required<HTMLElement>("#tour-step");
const tourHeadline = required<HTMLElement>("#tour-headline");
const tourNote = required<HTMLElement>("#tour-note");
const tourEvidence = required<HTMLElement>("#tour-evidence");
const vehiclePhoto = required<HTMLImageElement>("#vehicle-photo");
const vehicleMediaFrame = required<HTMLElement>(".vehicle-media-frame");
const vehicleMediaKind = required<HTMLElement>("#vehicle-media-kind");
const vehicleCredit = required<HTMLAnchorElement>("#vehicle-credit");
const missionSummary = required<HTMLElement>("#mission-summary");
const dossierFacts = required<HTMLElement>("#dossier-facts");
const canonicalNote = required<HTMLElement>("#canonical-note");
const mapTimeFlow = required<HTMLElement>("#map-time-flow");
const mapTimePace = required<HTMLElement>("#map-time-pace");
const mapElapsedValue = required<HTMLElement>("#map-elapsed-value");
const mapElapsedUnit = required<HTMLElement>("#map-elapsed-unit");
const mapDurationAnalogy = required<HTMLElement>("#map-duration-analogy");
const spaceMap = createSpaceMapController();

let selectedVehicle = VEHICLES[0];
let selectedTour: MissionTour;
let selectedTimeline: MissionPhysicalTimeline | undefined;
let progress = 0;
let physicalElapsedSeconds = 0;
let animationFrame: number | undefined;
let lastAnimationTimestamp: number | undefined;
let simulationRate = 1;
let timeFlowMode: "auto" | "manual" = "auto";
let autoStageHoldUntil: number | undefined;
let activeFlowIndex = -1;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!selectedVehicle) throw new Error("The launch manifest is empty.");
selectedTour = buildMissionTour(selectedVehicle);
selectedTimeline = buildMissionPhysicalTimeline(selectedTour);

function isRunnable(vehicle: Vehicle): boolean {
  return buildMissionTour(vehicle).playable;
}

function readyLaunchLabel(vehicle: Vehicle): string {
  return buildMissionTour(vehicle).playable ? "TRY THE MISSION" : "EXPLAIN THE LIMIT";
}

function replayLabel(vehicle: Vehicle): string {
  return buildMissionTour(vehicle).playable ? "REPLAY MISSION" : "REPLAY EXPLANATION";
}

function resumeLabel(vehicle: Vehicle): string {
  return buildMissionTour(vehicle).playable ? "RESUME MISSION" : "RESUME EXPLANATION";
}

type PlaybackState = "ready" | "running" | "paused" | "complete";

interface MissionFlowStage {
  label: string;
  description: string;
  chapterIndex: number;
  chapterStart?: number;
  chapterEnd?: number;
  routeStart?: number;
  routeEnd?: number;
  physicalStartSeconds?: number;
  physicalEndSeconds?: number;
}

let missionFlowStages: MissionFlowStage[] = [];
let missionFlowItems: HTMLLIElement[] = [];

function updateText(element: HTMLElement, value: string): void {
  if (element.textContent !== value) element.textContent = value;
}

function updateAttribute(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function setPlaybackState(state: PlaybackState): void {
  consoleElement.dataset.state = state;
  spaceMap.setPlaybackActive(state === "running");
  const isExplanation = !selectedTour.playable;

  if (state === "running") {
    launchIcon.textContent = "Ⅱ";
    launchLabel.textContent = isExplanation ? "PAUSE EXPLANATION" : "PAUSE MISSION";
    transportIcon.textContent = "Ⅱ";
    transportLabel.textContent = "PAUSE TOUR";
    transportButton.setAttribute("aria-label", "Pause guided mission tour");
    return;
  }

  launchIcon.textContent = state === "complete" ? "↺" : "▶";
  transportIcon.textContent = state === "complete" ? "↺" : "▶";
  if (state === "complete") {
    launchLabel.textContent = replayLabel(selectedVehicle);
    transportLabel.textContent = "REPLAY TOUR";
    transportButton.setAttribute("aria-label", "Replay guided mission tour");
  } else if (state === "paused") {
    launchLabel.textContent = resumeLabel(selectedVehicle);
    transportLabel.textContent = "RESUME TOUR";
    transportButton.setAttribute("aria-label", "Resume guided mission tour");
  } else {
    launchLabel.textContent = readyLaunchLabel(selectedVehicle);
    transportLabel.textContent = isExplanation ? "PLAY EXPLANATION" : "PLAY TOUR";
    transportButton.setAttribute("aria-label", "Play guided mission tour");
  }
}

function openingFlowStages(vehicle: Vehicle): MissionFlowStage[] | undefined {
  if (vehicle.id === "voyager") {
    return [
      { label: "EARTH LAUNCH · 1977", description: "Titan IIIE launch and departure from Earth's 1 AU orbit.", chapterIndex: 0, chapterStart: 0, chapterEnd: 0.035 },
      { label: "JUPITER ASSIST · 1979", description: "Jupiter bends the trajectory and raises Voyager's heliocentric escape speed.", chapterIndex: 0, chapterStart: 0.035, chapterEnd: 0.055 },
      { label: "SATURN / TITAN · 1980", description: "The Titan encounter redirects Voyager out of the planetary plane.", chapterIndex: 0, chapterStart: 0.055, chapterEnd: 0.68 },
      { label: "HELIOPAUSE CROSSING · 2012", description: "Voyager crosses the solar-wind boundary into interstellar plasma.", chapterIndex: 0, chapterStart: 0.68, chapterEnd: 0.98 },
      { label: "EPHEMERIS END · 2026", description: "The recorded JPL path reaches its current data endpoint.", chapterIndex: 0, chapterStart: 0.98, chapterEnd: 1.01 },
    ];
  }

  if (vehicle.id === "parker") {
    return [
      { label: "EARTH LAUNCH · 2018", description: "Launch and the first transfer inward from Earth's orbit.", chapterIndex: 0, chapterStart: 0, chapterEnd: 0.06 },
      { label: "VENUS ASSISTS + SOLAR LOOPS", description: "Repeated Venus flybys lower perihelion without pretending the probe is escaping.", chapterIndex: 0, chapterStart: 0.06, chapterEnd: 0.72 },
      { label: "RECORD PERIHELION SERIES", description: "Near-Sun passages reach record speed while remaining on a bound orbit.", chapterIndex: 0, chapterStart: 0.72, chapterEnd: 0.96 },
      { label: "BOUND EPHEMERIS END", description: "The measured mission path ends; any outward leg after this is counterfactual.", chapterIndex: 0, chapterStart: 0.96, chapterEnd: 1.01 },
    ];
  }

  if (vehicle.id === "wandering-earth") {
    return [
      { label: "EARTH @ 1 AU · 42-YEAR ROTATION BRAKE", description: "Earth is the vehicle. The engines first halt its rotation while it remains at a true 1 AU radius.", chapterIndex: 0, routeStart: 0, routeEnd: 42 / 2_500 },
      { label: "15-YEAR / 15-ORBIT ESCAPE SEQUENCE", description: "Fifteen increasingly eccentric solar passes raise aphelion from 1 AU to Jupiter's 5.2 AU orbit.", chapterIndex: 0, routeStart: 42 / 2_500, routeEnd: 56.8 / 2_500 },
      { label: "PLANNED JUPITER GRAVITY ASSIST", description: "The novel's planned Jupiter encounter supplies the final turn onto a solar-escape path.", chapterIndex: 0, routeStart: 56.8 / 2_500, routeEnd: 58 / 2_500 },
      { label: "500-YEAR FULL-THRUST ACCELERATION", description: "The Earth Engines continue at full thrust toward the novel-stated 0.005c cruise speed.", chapterIndex: 0, routeStart: 58 / 2_500, routeEnd: 557 / 2_500 },
      { label: "1,300-YEAR COAST @ 0.005C", description: "The longest stage is an interstellar coast; the plotted distance is normalised to the canonical destination.", chapterIndex: 0, routeStart: 557 / 2_500, routeEnd: 1_857 / 2_500 },
      { label: "500-YEAR DECELERATION", description: "The engines reverse so Earth can shed speed before the destination system.", chapterIndex: 0, routeStart: 1_857 / 2_500, routeEnd: 2_357 / 2_500 },
      { label: "PROXIMA ARRIVAL · YEAR 2400", description: "The route closes on Proxima Centauri after the main interstellar crossing.", chapterIndex: 0, routeStart: 2_357 / 2_500, routeEnd: 2_400 / 2_500 },
      { label: "100-YEAR ORBIT CAPTURE", description: "A final century of braking and manoeuvring places Earth into the new system.", chapterIndex: 0, routeStart: 2_400 / 2_500, routeEnd: 1.01 },
    ];
  }

  return undefined;
}

function buildMissionFlow(vehicle: Vehicle): void {
  const opening = openingFlowStages(vehicle);
  missionFlowStages = opening ?? selectedTour.chapters.map((chapter, chapterIndex) => ({
    label: chapter.title,
    description: chapter.note,
    chapterIndex,
  }));

  if (opening) {
    missionFlowStages.push(...selectedTour.chapters.slice(1).map((chapter, offset) => ({
      label: chapter.title,
      description: chapter.note,
      chapterIndex: offset + 1,
    })));
  }

  missionFlowStages = missionFlowStages.map((stage) => ({
    ...stage,
    ...physicalBoundsForFlowStage(stage),
  }));

  const mission = vehicle.route.mission;
  missionFlowContext.textContent = vehicle.id === "wandering-earth"
    ? "NOVEL CANON · EARTH IS THE VEHICLE · GEOMETRY SCHEMATIC"
    : mission.kind === "ephemeris"
    ? "SUN = MAP ORIGIN · EARTH = HISTORICAL LAUNCH · LOCATOR NOT TO SCALE"
    : mission.kind === "off-map"
    ? "CANON ROUTE IS NOT A LINEAR EARTH-TO-TARGET FLIGHT"
    : "SUN = MAP ORIGIN · EARTH = COMPARISON START · LOCATOR NOT TO SCALE";

  missionFlowList.replaceChildren();
  missionFlowItems = missionFlowStages.map((stage, index) => {
    const item = document.createElement("li");
    item.textContent = `${String(index + 1).padStart(2, "0")} / ${stage.label}`;
    item.dataset.state = "future";
    missionFlowList.append(item);
    return item;
  });
  activeFlowIndex = -1;
}

function physicalSecondsAtRouteProgress(routeProgress: number): number | undefined {
  if (!selectedTimeline) return undefined;
  const boundedProgress = Math.max(0, Math.min(1, routeProgress));
  const chapterIndex = selectedTour.chapters.findIndex((chapter, index) => {
    const isLast = index === selectedTour.chapters.length - 1;
    return boundedProgress >= chapter.routeStart && (
      boundedProgress < chapter.routeEnd || isLast && boundedProgress <= chapter.routeEnd
    );
  });
  const chapter = selectedTour.chapters[chapterIndex];
  const segment = selectedTimeline.segments[chapterIndex];
  if (!chapter || !segment) return undefined;
  const routeSpan = chapter.routeEnd - chapter.routeStart;
  const localProgress = routeSpan <= 0
    ? 0
    : Math.max(0, Math.min(1, (boundedProgress - chapter.routeStart) / routeSpan));
  return segment.startSeconds + segment.durationSeconds * localProgress;
}

function physicalBoundsForFlowStage(stage: MissionFlowStage): Pick<
  MissionFlowStage,
  "physicalStartSeconds" | "physicalEndSeconds"
> {
  if (!selectedTimeline) return {};
  if (stage.routeStart !== undefined || stage.routeEnd !== undefined) {
    if (selectedVehicle.id === "wandering-earth") {
      return {
        physicalStartSeconds: selectedTimeline.totalSeconds
          * Math.max(0, Math.min(1, stage.routeStart ?? 0)),
        physicalEndSeconds: selectedTimeline.totalSeconds
          * Math.max(0, Math.min(1, stage.routeEnd ?? 1)),
      };
    }
    return {
      physicalStartSeconds: physicalSecondsAtRouteProgress(stage.routeStart ?? 0),
      physicalEndSeconds: physicalSecondsAtRouteProgress(stage.routeEnd ?? 1),
    };
  }
  const segment = selectedTimeline.segments[stage.chapterIndex];
  if (!segment) return {};
  return {
    physicalStartSeconds: segment.startSeconds
      + segment.durationSeconds * (stage.chapterStart ?? 0),
    physicalEndSeconds: segment.startSeconds
      + segment.durationSeconds * (stage.chapterEnd ?? 1),
  };
}

function currentMissionFlowIndex(frame: MissionTourSample): number {
  let currentIndex = missionFlowStages.findIndex((stage) => {
    if (
      stage.physicalStartSeconds !== undefined
      && stage.physicalEndSeconds !== undefined
      && selectedTimeline
    ) {
      return physicalElapsedSeconds >= stage.physicalStartSeconds
        && physicalElapsedSeconds < stage.physicalEndSeconds;
    }
    if (stage.routeStart !== undefined || stage.routeEnd !== undefined) {
      const start = stage.routeStart ?? 0;
      const end = stage.routeEnd ?? 1.01;
      return frame.routeProgress >= start && frame.routeProgress < end;
    }
    if (stage.chapterIndex !== frame.chapterIndex) return false;
    const start = stage.chapterStart ?? 0;
    const end = stage.chapterEnd ?? 1.01;
    return frame.chapterProgress >= start && frame.chapterProgress < end;
  });
  if (currentIndex < 0) {
    for (let index = missionFlowStages.length - 1; index >= 0; index -= 1) {
      if ((missionFlowStages[index]?.chapterIndex ?? Number.POSITIVE_INFINITY) <= frame.chapterIndex) {
        currentIndex = index;
        break;
      }
    }
  }
  return currentIndex;
}

function updateMissionFlow(frame: MissionTourSample): number {
  const currentIndex = currentMissionFlowIndex(frame);

  if (currentIndex === activeFlowIndex) return currentIndex;

  for (const [index, item] of missionFlowItems.entries()) {
    item.dataset.state = index < currentIndex
      ? "past"
      : index === currentIndex
      ? "current"
      : "future";
    if (index === currentIndex) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  }

  if (currentIndex !== activeFlowIndex && consoleElement.dataset.state === "running") {
    missionFlowItems[currentIndex]?.scrollIntoView({
      behavior: reducedMotion.matches ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }
  activeFlowIndex = currentIndex;
  return currentIndex;
}

function cancelAnimation(nextState: PlaybackState = progress >= 1 ? "complete" : "ready"): void {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
  animationFrame = undefined;
  lastAnimationTimestamp = undefined;
  autoStageHoldUntil = undefined;
  setPlaybackState(nextState);
}

function formatPhysicalElapsed(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toLocaleString("en-AU", {
      minimumFractionDigits: seconds < 10 ? 1 : 0,
      maximumFractionDigits: 1,
    })} SECONDS`;
  }
  if (seconds < 3_600) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);
    return `${minutes} MIN ${remainder.toString().padStart(2, "0")} SEC`;
  }
  if (seconds < 86_400) {
    const hours = Math.floor(seconds / 3_600);
    const minutes = Math.floor((seconds % 3_600) / 60);
    return `${hours} HR ${minutes.toString().padStart(2, "0")} MIN`;
  }
  if (seconds < JULIAN_YEAR_SECONDS) {
    return `${(seconds / 86_400).toLocaleString("en-AU", {
      maximumFractionDigits: 1,
    })} DAYS`;
  }
  return formatDuration(seconds / JULIAN_YEAR_SECONDS);
}

function mapElapsedParts(seconds: number): { value: string; unit: string } {
  if (seconds < 60) {
    return {
      value: seconds.toLocaleString("en-AU", {
        minimumFractionDigits: seconds < 10 ? 1 : 0,
        maximumFractionDigits: 1,
      }),
      unit: "SECONDS",
    };
  }
  if (seconds < 3_600) {
    return {
      value: `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`,
      unit: "MINUTES",
    };
  }
  if (seconds < 86_400) {
    return {
      value: `${Math.floor(seconds / 3_600)}:${Math.floor((seconds % 3_600) / 60).toString().padStart(2, "0")}`,
      unit: "HOURS",
    };
  }
  if (seconds < JULIAN_YEAR_SECONDS) {
    return {
      value: (seconds / 86_400).toLocaleString("en-AU", { maximumFractionDigits: 1 }),
      unit: "DAYS",
    };
  }
  return {
    value: (seconds / JULIAN_YEAR_SECONDS).toLocaleString("en-AU", {
      maximumFractionDigits: 1,
    }),
    unit: "YEARS",
  };
}

function timedMissionStage(): (MissionFlowStage & AutoTimeStage) | undefined {
  if (!selectedTimeline) return undefined;
  const stage = missionFlowStages.find((candidate) => {
    const start = candidate.physicalStartSeconds;
    const end = candidate.physicalEndSeconds;
    return start !== undefined && end !== undefined && end > start
      && physicalElapsedSeconds >= start && physicalElapsedSeconds < end;
  }) ?? missionFlowStages.find((candidate) => {
    const end = candidate.physicalEndSeconds;
    return end !== undefined && end > physicalElapsedSeconds;
  });
  if (stage?.physicalStartSeconds === undefined || stage.physicalEndSeconds === undefined) {
    return undefined;
  }
  return {
    ...stage,
    startSeconds: stage.physicalStartSeconds,
    endSeconds: stage.physicalEndSeconds,
  };
}

function formatRateMultiplier(multiplier: number): string {
  if (multiplier < 1_000) {
    return `${multiplier.toLocaleString("en-AU", { maximumFractionDigits: 1 })}×`;
  }
  return `${multiplier.toLocaleString("en-AU", {
    notation: "compact",
    maximumFractionDigits: 2,
  })}×`;
}

function effectiveTimeFlow(): {
  multiplier: number;
  stage?: MissionFlowStage & AutoTimeStage;
  remainingSeconds?: number;
} {
  const stage = timedMissionStage();
  if (timeFlowMode === "auto" && stage) {
    const pace = autoTimeFlowForStage(stage, physicalElapsedSeconds);
    return {
      multiplier: pace.multiplier,
      stage,
      remainingSeconds: pace.remainingSeconds,
    };
  }
  return { multiplier: simulationRate, stage };
}

function updateTimeFlow(): void {
  if (!selectedTimeline) {
    updateText(mapTimeFlow, "NOT COMPARABLE");
    updateText(mapTimePace, "NO LINEAR TIME SCALE");
    playbackRateSelect.disabled = true;
    return;
  }
  playbackRateSelect.disabled = false;
  const effective = effectiveTimeFlow();
  if (timeFlowMode === "auto") {
    updateText(mapTimeFlow, `${formatRateMultiplier(effective.multiplier)} REALTIME`);
    updateText(mapTimePace, formatAutoPace(effective.multiplier));
    return;
  }
  const option = SIMULATION_RATE_OPTIONS.find(
    ({ multiplier }) => multiplier === simulationRate,
  );
  const pace = option?.paceLabel ?? `${simulationRate.toLocaleString("en-AU")} SECONDS / SECOND`;
  updateText(mapTimeFlow, `${formatRateMultiplier(simulationRate)} REALTIME`);
  updateText(mapTimePace, pace.replace(" / SECOND", " / REAL SECOND"));
}

function currentTourFrame(): MissionTourSample | PhysicalMissionTourSample {
  if (!selectedTimeline) return sampleMissionTour(selectedTour, progress);
  return sampleMissionTourAtPhysicalTime(
    selectedTour,
    selectedTimeline,
    physicalElapsedSeconds,
  );
}

function crossingTime(vehicle: Vehicle, au: number): number | undefined {
  return milestoneYears(vehicle, au) ?? onwardComparisonYears(vehicle, au);
}

function setTextWithPrefix(
  element: HTMLElement,
  prefix: string,
  content: string,
): void {
  element.replaceChildren();
  const strong = document.createElement("strong");
  strong.textContent = prefix;
  element.append(strong, document.createTextNode(content));
}

function renderPhaseKey(vehicle: Vehicle): void {
  phaseKey.replaceChildren();
  const unique = [...new Set(vehicle.phases?.map(({ label }) => label) ?? [])];
  for (const label of unique) {
    const item = document.createElement("span");
    item.textContent = label;
    phaseKey.append(item);
  }
  if (!unique.length) {
    const item = document.createElement("span");
    item.textContent = vehicle.unavailableReason ?? "NO PROFILE";
    phaseKey.append(item);
  }
}

function renderProfile(vehicle: Vehicle): void {
  const hasProfile = Boolean(vehicle.phases?.length);
  speedLine.setAttribute("points", hasProfile ? profilePoints(vehicle) : "");
  speedLine.classList.toggle("is-unavailable", !hasProfile);
  chartTitle.textContent = `${vehicle.name} speed and mission profile`;
  chartDescription.textContent = hasProfile
    ? `${vehicle.phases?.map(({ label }) => label).join(", ")}.`
    : `${vehicle.unavailableReason ?? "No comparable linear speed profile"}.`;
  profileScale.textContent = vehicle.maxSpeedKmh
    ? `MAX ${formatSpeed(vehicle.maxSpeedKmh)}`
    : "NO LINEAR SCALE";
  renderPhaseKey(vehicle);
}

function renderTourStory(frame: MissionTourSample): void {
  const chapterNumber = String(frame.chapterIndex + 1).padStart(2, "0");
  const chapterCount = String(selectedTour.chapters.length).padStart(2, "0");
  const step = `CHAPTER ${chapterNumber} / ${chapterCount}`;
  const evidence = `EVIDENCE / ${frame.evidence}`;
  if (tourStep.textContent !== step) tourStep.textContent = step;
  if (tourHeadline.textContent !== frame.chapter.title) tourHeadline.textContent = frame.chapter.title;
  if (tourNote.textContent !== frame.chapter.note) tourNote.textContent = frame.chapter.note;
  if (tourEvidence.textContent !== evidence) tourEvidence.textContent = evidence;
  tourStory.dataset.evidence = frame.evidence;
}

function renderDossier(vehicle: Vehicle): void {
  const dossier = getVehicleDossier(vehicle.id);
  vehiclePhoto.src = dossier.media.src;
  vehiclePhoto.alt = dossier.media.alt;
  vehicleMediaKind.textContent = dossier.media.kind.toUpperCase();
  vehicleMediaFrame.dataset.fit = dossier.media.kind === "publisher cover" || vehicle.id === "daedalus"
    ? "contain"
    : "cover";
  vehicleCredit.href = dossier.media.sourceUrl;
  vehicleCredit.textContent = [dossier.media.credit, dossier.media.license]
    .filter(Boolean)
    .join(" · ");
  missionSummary.textContent = dossier.missionSummary;
  canonicalNote.textContent = `CANONICAL LIMIT / ${dossier.canonicalNote}`;
  dossierFacts.replaceChildren();
  for (const [index, fact] of dossier.facts.entries()) {
    const row = document.createElement("div");
    const term = document.createElement("dt");
    const detail = document.createElement("dd");
    term.textContent = `FACT ${String(index + 1).padStart(2, "0")}`;
    detail.textContent = fact;
    row.append(term, detail);
    dossierFacts.append(row);
  }
}

function arrivalContext(vehicle: Vehicle): string {
  if (vehicle.arrivalEstimate) {
    return `${vehicle.arrivalEstimate.context} · ${vehicle.arrivalEstimate.evidence}`;
  }
  if (vehicle.id === "parker") return `IF ${formatSpeed(vehicle.maxSpeedKmh ?? 0)} WERE FROZEN OUTWARD · COUNTERFACTUAL`;
  if (!isRunnable(vehicle)) return vehicle.unavailableReason ?? "NO ARRIVAL MODEL";
  if (vehicle.evidence === "DESIGN STUDY") return "PUBLISHED PROFILE · MODELLED TO PROXIMA";
  if (vehicle.category === "fiction") return "FICTIONAL PROFILE · CONTINUITY LABELLED";
  return `AT ${formatSpeed(vehicle.maxSpeedKmh ?? 0)} · STRAIGHT-LINE MODEL`;
}

function renderVehicle(vehicle: Vehicle, focusMap = false): void {
  selectedTour = buildMissionTour(vehicle);
  selectedTimeline = buildMissionPhysicalTimeline(selectedTour);
  physicalElapsedSeconds = 0;
  buildMissionFlow(vehicle);
  selectedKicker.textContent = vehicle.kicker;
  selectedName.textContent = vehicle.name.toUpperCase();
  evidenceTag.textContent = vehicle.evidence;
  evidenceTag.dataset.category = vehicle.category;
  const actualTravelYears = totalTravelYears(vehicle);
  const displayedTravelYears = vehicle.id === "parker"
    ? onwardComparisonYears(vehicle)
    : actualTravelYears;
  arrivalRoute.textContent = vehicle.arrivalEstimate?.routeLabel
    ?? (vehicle.id === "parker"
      ? "PARKER PEAK → PROXIMA DISTANCE"
      : "EARTH → PROXIMA CENTAURI");
  journeyTime.textContent = vehicle.arrivalEstimate?.display
    ?? formatDuration(vehicle.arrivalEstimate?.years ?? displayedTravelYears);
  arrivalSubline.textContent = arrivalContext(vehicle);
  vehicleDescription.textContent = vehicle.description;
  setTextWithPrefix(modelNote, "MODEL NOTE / ", vehicle.modelNote);
  renderDossier(vehicle);

  launchButton.disabled = false;
  progressInput.disabled = false;
  setPlaybackState("ready");
  progressLabel.textContent = selectedTimeline
    ? "PHYSICAL MISSION CLOCK"
    : "EXPLANATION POSITION · NO FINITE CLOCK";
  updateTimeFlow();
  timeHeliopause.textContent = formatDuration(crossingTime(vehicle, 122));
  timeOort.textContent = formatDuration(crossingTime(vehicle, 100_000));
  timeProxima.textContent = vehicle.arrivalEstimate?.display
    ?? formatDuration(vehicle.arrivalEstimate?.years ?? displayedTravelYears);
  renderProfile(vehicle);
  spaceMap.setVehicle(vehicle, focusMap);
}

function renderProgress(): void {
  const frame = currentTourFrame();
  if ("physicalProgress" in frame) progress = frame.physicalProgress;
  const sample = journeySample(selectedVehicle, frame.routeProgress);
  const progressValue = String(Math.round(progress * 1_000));
  if (progressInput.value !== progressValue) progressInput.value = progressValue;
  updateAttribute(
    progressInput,
    "aria-valuetext",
    selectedTimeline
      ? `T plus ${formatPhysicalElapsed(physicalElapsedSeconds)}`
      : `${Math.round(progress * 100)} percent of explanation`,
  );

  const mapTelemetry = spaceMap.setTourFrame(frame);
  if (selectedTimeline) {
    const elapsedYears = physicalElapsedSeconds / JULIAN_YEAR_SECONDS;
    const analogy = timeAnalogyAt(elapsedYears);
    const elapsed = mapElapsedParts(physicalElapsedSeconds);
    updateText(mapElapsedValue, elapsed.value);
    updateText(mapElapsedUnit, elapsed.unit);
    updateText(
      mapDurationAnalogy,
      [analogy.headline, analogy.detail].filter(Boolean).join(" · "),
    );
    const analogySource = analogy.sourceId ?? "intro";
    if (mapDurationAnalogy.dataset.source !== analogySource) {
      mapDurationAnalogy.dataset.source = analogySource;
    }
  } else {
    updateText(mapElapsedValue, "—");
    updateText(mapElapsedUnit, "NO CLOCK");
    updateText(mapDurationAnalogy, "NOT COMPARABLE TO A LINEAR CLOCK");
    if (mapDurationAnalogy.dataset.source !== "none") {
      mapDurationAnalogy.dataset.source = "none";
    }
  }
  updateText(elapsedReadout, frame.routeMode === "off-map"
    ? "NOT COMPARABLE"
    : selectedTimeline
    ? `${formatPhysicalElapsed(physicalElapsedSeconds)}${mapTelemetry.date ? ` · ${mapTelemetry.date.slice(0, 10)}` : ""}`
    : mapTelemetry.mode === "ephemeris"
    ? `${formatDuration(mapTelemetry.elapsedYears)}${mapTelemetry.date ? ` · ${mapTelemetry.date.slice(0, 4)}` : ""}`
    : formatDuration(frame.elapsedYears ?? mapTelemetry.elapsedYears));
  updateText(speedReadout, frame.routeMode === "off-map"
    ? "NOT COMPARABLE"
    : formatSpeed(mapTelemetry.speedKmh ?? frame.speedKmh ?? sample.speedKmh));
  renderTourStory(frame);
  const flowIndex = updateMissionFlow(frame);
  const flowStage = missionFlowStages[flowIndex];
  const nextStage = missionFlowStages[flowIndex + 1];
  updateText(phaseReadout, flowStage?.label ?? frame.phase);
  updateText(phaseDescription, flowStage?.description ?? frame.chapter.note);
  updateText(nextStageReadout, nextStage?.label ?? "MISSION COMPLETE");
  if (
    flowStage?.physicalEndSeconds !== undefined
    && flowStage.physicalEndSeconds > physicalElapsedSeconds
  ) {
    updateText(
      nextStageTime,
      `IN ${formatPhysicalElapsed(flowStage.physicalEndSeconds - physicalElapsedSeconds)}`,
    );
  } else {
    updateText(nextStageTime, nextStage ? "AT THE NEXT ROUTE BOUNDARY" : "FINAL STATE");
  }
  updateTimeFlow();

  const chartX = frame.routeProgress * 1_000;
  const chartY = 184 - speedFactorAt(selectedVehicle, frame.routeProgress) * 142;
  chartCursor.setAttribute("x1", chartX.toFixed(1));
  chartCursor.setAttribute("x2", chartX.toFixed(1));
  chartPoint.setAttribute("cx", chartX.toFixed(1));
  chartPoint.setAttribute("cy", chartY.toFixed(1));
}

function selectVehicle(vehicle: Vehicle): void {
  cancelAnimation();
  progress = 0;
  physicalElapsedSeconds = 0;
  selectedVehicle = vehicle;
  for (const button of vehicleButtons) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.vehicle === vehicle.id),
    );
  }
  renderVehicle(vehicle, true);
  renderProgress();
}

function animate(timestamp: number): void {
  if (!selectedTimeline) {
    progress = 1;
    renderProgress();
    animationFrame = undefined;
    setPlaybackState("complete");
    return;
  }

  if (lastAnimationTimestamp === undefined) {
    lastAnimationTimestamp = timestamp;
    animationFrame = requestAnimationFrame(animate);
    return;
  }
  if (autoStageHoldUntil !== undefined && timestamp < autoStageHoldUntil) {
    lastAnimationTimestamp = timestamp;
    animationFrame = requestAnimationFrame(animate);
    return;
  }
  autoStageHoldUntil = undefined;
  const realElapsedSeconds = Math.max(
    0,
    (timestamp - lastAnimationTimestamp) / 1_000,
  );
  lastAnimationTimestamp = timestamp;
  const effective = effectiveTimeFlow();
  const stageBoundary = timeFlowMode === "auto" && effective.stage
    ? Math.min(effective.stage.endSeconds, selectedTimeline.totalSeconds)
    : selectedTimeline.totalSeconds;
  const clock = advanceSimulationClock(
    physicalElapsedSeconds,
    realElapsedSeconds,
    effective.multiplier,
    stageBoundary,
  );
  physicalElapsedSeconds = clock.elapsedSeconds;
  progress = physicalElapsedSeconds / selectedTimeline.totalSeconds;
  renderProgress();

  if (physicalElapsedSeconds < selectedTimeline.totalSeconds) {
    if (clock.complete && stageBoundary < selectedTimeline.totalSeconds) {
      autoStageHoldUntil = timestamp + 650;
    }
    animationFrame = requestAnimationFrame(animate);
    return;
  }

  animationFrame = undefined;
  setPlaybackState("complete");
}

function toggleLaunch(): void {
  if (!selectedTimeline) {
    progress = progress >= 1 ? 0 : 1;
    setPlaybackState(progress >= 1 ? "complete" : "ready");
    renderProgress();
    return;
  }

  if (reducedMotion.matches) {
    physicalElapsedSeconds = progress >= 1 ? 0 : selectedTimeline.totalSeconds;
    progress = physicalElapsedSeconds / selectedTimeline.totalSeconds;
    setPlaybackState(progress >= 1 ? "complete" : "ready");
    renderProgress();
    return;
  }

  if (animationFrame !== undefined) {
    cancelAnimation("paused");
    return;
  }

  if (progress >= 1) {
    progress = 0;
    physicalElapsedSeconds = 0;
  }
  lastAnimationTimestamp = undefined;
  autoStageHoldUntil = undefined;
  setPlaybackState("running");
  animationFrame = requestAnimationFrame(animate);
}

for (const [index, button] of vehicleButtons.entries()) {
  button.addEventListener("click", () => {
    const vehicle = VEHICLES.find(({ id }) => id === button.dataset.vehicle);
    if (vehicle) selectVehicle(vehicle);
  });

  button.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % vehicleButtons.length;
    if (event.key === "ArrowUp") nextIndex = (index - 1 + vehicleButtons.length) % vehicleButtons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = vehicleButtons.length - 1;
    vehicleButtons[nextIndex]?.focus();
    vehicleButtons[nextIndex]?.click();
  });
}

launchButton.addEventListener("click", toggleLaunch);
transportButton.addEventListener("click", toggleLaunch);

resetButton.addEventListener("click", () => {
  progress = 0;
  physicalElapsedSeconds = 0;
  cancelAnimation("ready");
  renderProgress();
});

progressInput.addEventListener("input", () => {
  progress = Number(progressInput.value) / 1_000;
  if (selectedTimeline) {
    physicalElapsedSeconds = selectedTimeline.totalSeconds * progress;
  }
  cancelAnimation(progress >= 1 ? "complete" : "paused");
  renderProgress();
});

playbackRateSelect.addEventListener("change", () => {
  if (playbackRateSelect.value === "auto") {
    timeFlowMode = "auto";
    lastAnimationTimestamp = undefined;
    autoStageHoldUntil = undefined;
    updateTimeFlow();
    renderProgress();
    return;
  }
  const nextRate = Number(playbackRateSelect.value);
  if (!Number.isFinite(nextRate) || nextRate < 1) {
    playbackRateSelect.value = timeFlowMode === "auto" ? "auto" : String(simulationRate);
    return;
  }

  timeFlowMode = "manual";
  simulationRate = nextRate;
  lastAnimationTimestamp = undefined;
  autoStageHoldUntil = undefined;
  updateTimeFlow();
  renderProgress();
});

renderVehicle(selectedVehicle);
renderProgress();
