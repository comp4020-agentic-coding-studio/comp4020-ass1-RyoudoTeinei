import {
  VEHICLES,
  distancePosition,
  formatDistance,
  formatDuration,
  formatSpeed,
  journeySample,
  milestoneYears,
  profilePoints,
  speedFactorAt,
  totalTravelYears,
  type Vehicle,
} from "./mission-data";

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
const arrivalSubline = required<HTMLElement>("#arrival-subline");
const launchButton = required<HTMLButtonElement>("#launch-button");
const launchLabel = required<HTMLElement>("#launch-label");
const resetButton = required<HTMLButtonElement>("#reset-button");
const progressInput = required<HTMLInputElement>("#journey-progress");
const routeFill = required<HTMLElement>("#route-fill");
const journeyMarker = required<HTMLElement>("#journey-marker");
const distanceReadout = required<HTMLElement>("#distance-readout");
const elapsedReadout = required<HTMLElement>("#elapsed-readout");
const speedReadout = required<HTMLElement>("#speed-readout");
const phaseReadout = required<HTMLElement>("#phase-readout");
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

let selectedVehicle = VEHICLES[0];
let progress = 0;
let animationFrame: number | undefined;
let animationStart: number | undefined;
let startProgress = 0;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (!selectedVehicle) throw new Error("The launch manifest is empty.");

function isRunnable(vehicle: Vehicle): boolean {
  return Boolean(totalTravelYears(vehicle) && vehicle.phases?.length);
}

function cancelAnimation(): void {
  if (animationFrame !== undefined) cancelAnimationFrame(animationFrame);
  animationFrame = undefined;
  animationStart = undefined;
  consoleElement.dataset.state = progress >= 1 ? "complete" : "ready";
}

function crossingTime(vehicle: Vehicle, au: number): number | undefined {
  return milestoneYears(vehicle, au);
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

function arrivalContext(vehicle: Vehicle): string {
  if (vehicle.id === "parker") return "BOUND SOLAR ORBIT · NO OUTWARD ARRIVAL";
  if (!isRunnable(vehicle)) return vehicle.unavailableReason ?? "NO ARRIVAL MODEL";
  if (vehicle.evidence === "DESIGN STUDY") return "PUBLISHED PROFILE · MODELLED TO PROXIMA";
  if (vehicle.category === "fiction") return "FICTIONAL PROFILE · CONTINUITY LABELLED";
  return `AT ${formatSpeed(vehicle.maxSpeedKmh ?? 0)} · STRAIGHT-LINE MODEL`;
}

function renderVehicle(vehicle: Vehicle): void {
  selectedKicker.textContent = vehicle.kicker;
  selectedName.textContent = vehicle.name.toUpperCase();
  evidenceTag.textContent = vehicle.evidence;
  evidenceTag.dataset.category = vehicle.category;
  const totalYears = totalTravelYears(vehicle);
  journeyTime.textContent = vehicle.id === "parker" ? "NO OUTWARD ARRIVAL" : formatDuration(totalYears);
  arrivalSubline.textContent = arrivalContext(vehicle);
  vehicleDescription.textContent = vehicle.description;
  setTextWithPrefix(modelNote, "MODEL NOTE / ", vehicle.modelNote);

  launchButton.disabled = !isRunnable(vehicle);
  progressInput.disabled = !isRunnable(vehicle);
  launchLabel.textContent = isRunnable(vehicle) ? "LAUNCH MODEL" : "PROFILE UNAVAILABLE";
  timeHeliopause.textContent = formatDuration(crossingTime(vehicle, 122));
  timeOort.textContent = formatDuration(crossingTime(vehicle, 100_000));
  timeProxima.textContent = formatDuration(totalYears);
  renderProfile(vehicle);
}

function renderProgress(): void {
  const sample = journeySample(selectedVehicle, progress);
  const plottedPosition = distancePosition(sample.currentAu) * 100;
  routeFill.style.setProperty("--route-progress", `${plottedPosition}%`);
  journeyMarker.style.setProperty("--marker-position", `${plottedPosition}%`);
  progressInput.value = String(Math.round(progress * 1_000));

  distanceReadout.textContent = formatDistance(sample.currentAu);
  elapsedReadout.textContent = formatDuration(sample.elapsedYears);
  speedReadout.textContent = formatSpeed(sample.speedKmh);
  phaseReadout.textContent = sample.phase;

  const chartX = progress * 1_000;
  const chartY = 184 - speedFactorAt(selectedVehicle, progress) * 142;
  chartCursor.setAttribute("x1", chartX.toFixed(1));
  chartCursor.setAttribute("x2", chartX.toFixed(1));
  chartPoint.setAttribute("cx", chartX.toFixed(1));
  chartPoint.setAttribute("cy", chartY.toFixed(1));
}

function selectVehicle(vehicle: Vehicle): void {
  cancelAnimation();
  progress = 0;
  selectedVehicle = vehicle;
  for (const button of vehicleButtons) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.vehicle === vehicle.id),
    );
  }
  renderVehicle(vehicle);
  renderProgress();
}

function animate(timestamp: number): void {
  if (animationStart === undefined) animationStart = timestamp;
  const duration = 12_000;
  const elapsed = timestamp - animationStart;
  progress = Math.min(1, startProgress + (elapsed / duration) * (1 - startProgress));
  renderProgress();

  if (progress < 1) {
    animationFrame = requestAnimationFrame(animate);
    return;
  }

  animationFrame = undefined;
  consoleElement.dataset.state = "complete";
  launchLabel.textContent = "REPLAY MODEL";
}

function toggleLaunch(): void {
  if (!isRunnable(selectedVehicle)) return;
  if (reducedMotion.matches) {
    progress = progress >= 1 ? 0 : 1;
    consoleElement.dataset.state = progress >= 1 ? "complete" : "ready";
    launchLabel.textContent = progress >= 1 ? "REPLAY MODEL" : "LAUNCH MODEL";
    renderProgress();
    return;
  }

  if (animationFrame !== undefined) {
    cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
    animationStart = undefined;
    consoleElement.dataset.state = "paused";
    launchLabel.textContent = "RESUME MODEL";
    return;
  }

  if (progress >= 1) progress = 0;
  startProgress = progress;
  animationStart = undefined;
  consoleElement.dataset.state = "running";
  launchLabel.textContent = "PAUSE MODEL";
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

resetButton.addEventListener("click", () => {
  cancelAnimation();
  progress = 0;
  launchLabel.textContent = isRunnable(selectedVehicle) ? "LAUNCH MODEL" : "PROFILE UNAVAILABLE";
  renderProgress();
});

progressInput.addEventListener("input", () => {
  cancelAnimation();
  progress = Number(progressInput.value) / 1_000;
  launchLabel.textContent = progress >= 1 ? "REPLAY MODEL" : "RESUME MODEL";
  renderProgress();
});

renderVehicle(selectedVehicle);
renderProgress();
