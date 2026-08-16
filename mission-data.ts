export const AU_KM = 149_597_870.7;
export const HOURS_PER_YEAR = 8_766;
export const C_KMH = 1_079_252_849;
// 4.2465 light-years from the corrected CNS5 catalogue used by the map.
export const PROXIMA_AU = 268_553.234;

export type VehicleCategory = "measured" | "study" | "fiction";
export type EvidenceLevel =
  | "COUNTERFACTUAL"
  | "MEASURED"
  | "DESIGN STUDY"
  | "FICTION / CANON"
  | "FICTION / INFERRED"
  | "NOT COMPARABLE";

export interface Phase {
  label: string;
  start: number;
  end: number;
  from: number;
  to: number;
}

export interface Vehicle {
  id: string;
  name: string;
  kicker: string;
  category: VehicleCategory;
  evidence: EvidenceLevel;
  maxSpeedKmh?: number;
  totalYears?: number;
  outbound?: boolean;
  phases?: Phase[];
  description: string;
  modelNote: string;
  sourceIds: string[];
  unavailableReason?: string;
}

export interface Milestone {
  id: string;
  label: string;
  au: number;
  note: string;
}

export interface JourneySample {
  currentAu: number;
  distanceFraction: number;
  elapsedYears: number;
  speedKmh: number;
  phase: string;
}

export const MILESTONES: Milestone[] = [
  { id: "earth", label: "Earth", au: 1, note: "The comparison starts here." },
  { id: "jupiter", label: "Jupiter", au: 5.2, note: "5.2 AU" },
  { id: "neptune", label: "Neptune", au: 30.05, note: "30 AU" },
  {
    id: "heliopause",
    label: "Heliopause",
    au: 122,
    note: "The Sun's wind ends. The Solar System does not.",
  },
  { id: "inner-oort", label: "Inner Oort", au: 2_000, note: "Modelled start: 2,000–5,000 AU" },
  { id: "outer-oort", label: "Outer Oort", au: 100_000, note: "Conservative outer edge" },
  { id: "proxima", label: "Proxima", au: PROXIMA_AU, note: "4.25 light-years" },
];

const constant = (label: string): Phase[] => [
  { label, start: 0, end: 1, from: 1, to: 1 },
];

export const VEHICLES: Vehicle[] = [
  {
    id: "voyager",
    name: "Voyager 1",
    kicker: "THE REAL OUTBOUND BASELINE",
    category: "measured",
    evidence: "MEASURED",
    maxSpeedKmh: 61_198,
    phases: constant("COAST · CURRENT HELIOCENTRIC SPEED"),
    description: "Humanity's most distant spacecraft supplies the honest baseline: fast enough to cross the heliopause, nowhere near fast enough to clear the Oort Cloud in a lifetime.",
    modelNote: "Straight-line comparison at Voyager 1's current Sun-relative speed. NASA's actual estimate is about 300 years to enter the Oort Cloud and about 30,000 years to pass beyond it.",
    sourceIds: ["voyager", "oort"],
  },
  {
    id: "f1",
    name: "F1 record car",
    kicker: "A FAMILIAR SPEED, EXPOSED",
    category: "measured",
    evidence: "COUNTERFACTUAL",
    maxSpeedKmh: 397.36,
    phases: constant("IMPOSSIBLE CONSTANT CRUISE"),
    description: "A Bonneville speed-run car makes interstellar distance human-sized for a moment—then the calendar makes it absurd again.",
    modelNote: "Counterfactual: a Formula 1 car cannot operate in space. The model holds its sanctioned 397.36 km/h record speed forever in a straight line.",
    sourceIds: ["f1"],
  },
  {
    id: "737",
    name: "Boeing 737-8",
    kicker: "THE AIRLINE-SPEED MYTH",
    category: "measured",
    evidence: "COUNTERFACTUAL",
    maxSpeedKmh: 839,
    phases: constant("IMPOSSIBLE CONSTANT CRUISE"),
    description: "Even the speed that folds continents into hours barely moves the marker on an interstellar clock.",
    modelNote: "Counterfactual: 839 km/h is an approximate conversion of Mach 0.79 at a typical cruise altitude, held forever in vacuum.",
    sourceIds: ["boeing"],
  },
  {
    id: "concorde",
    name: "Concorde",
    kicker: "SUPERSONIC IS STILL LOCAL",
    category: "measured",
    evidence: "COUNTERFACTUAL",
    maxSpeedKmh: 2_179,
    phases: constant("IMPOSSIBLE CONSTANT CRUISE"),
    description: "Mach 2 once made the Atlantic feel small. On this route it changes millions of years into merely millions of years.",
    modelNote: "Counterfactual straight-line travel at Concorde's quoted maximum cruise speed; the aircraft cannot fly in vacuum.",
    sourceIds: ["concorde"],
  },
  {
    id: "apollo10",
    name: "Apollo 10",
    kicker: "FASTEST HUMANS",
    category: "measured",
    evidence: "COUNTERFACTUAL",
    maxSpeedKmh: 39_897,
    phases: constant("PEAK SPEED HELD FOREVER"),
    description: "The fastest humans in history reached their record while falling home. Holding that instant forever still leaves a five-digit journey to Proxima.",
    modelNote: "Counterfactual: 39,897 km/h was Apollo 10's return-to-Earth peak, not a sustainable outbound cruise speed.",
    sourceIds: ["apollo"],
  },
  {
    id: "parker",
    name: "Parker Solar Probe",
    kicker: "THE FASTEST OBJECT—GOING NOWHERE OUTWARD",
    category: "measured",
    evidence: "MEASURED",
    outbound: false,
    maxSpeedKmh: 692_018,
    phases: [
      { label: "FALL TOWARD SUN", start: 0, end: 0.12, from: 0.08, to: 1 },
      { label: "CLIMB / SLOW", start: 0.12, end: 0.24, from: 1, to: 0.08 },
      { label: "VENUS LOWERS ORBIT", start: 0.24, end: 0.3, from: 0.08, to: 0.06 },
      { label: "FALL DEEPER", start: 0.3, end: 0.44, from: 0.06, to: 1 },
      { label: "CLIMB / SLOW", start: 0.44, end: 0.58, from: 1, to: 0.07 },
      { label: "VENUS LOWERS ORBIT", start: 0.58, end: 0.64, from: 0.07, to: 0.05 },
      { label: "FINAL PERIHELIA", start: 0.64, end: 0.82, from: 0.05, to: 1 },
      { label: "BOUND ORBIT CONTINUES", start: 0.82, end: 1, from: 1, to: 0.05 },
    ],
    description: "Parker owns the speed record because it repeatedly falls into the Sun's gravity well. Venus flybys remove orbital energy; the probe does not escape toward the stars.",
    modelNote: "The chart sketches the real accelerate–decelerate orbit pattern, so there is no outward arrival model. Only as a separate, impossible thought experiment would freezing the 430,000 mph perihelion instant reduce the Proxima crossing to about 6,628 years.",
    sourceIds: ["parker", "parker-orbits"],
  },
  {
    id: "daedalus",
    name: "Project Daedalus",
    kicker: "A STARSHIP STUDY, NOT A PROMISE",
    category: "study",
    evidence: "DESIGN STUDY",
    maxSpeedKmh: C_KMH * 0.12,
    totalYears: 37.4,
    phases: [
      { label: "STAGE 1 FUSION PULSE", start: 0, end: 0.055, from: 0, to: 0.32 },
      { label: "STAGE 2 FUSION PULSE", start: 0.055, end: 0.102, from: 0.32, to: 1 },
      { label: "COAST · NO BRAKING", start: 0.102, end: 1, from: 1, to: 1 },
    ],
    description: "The 1970s BIS study takes interstellar travel seriously: two fusion stages, years of acceleration, then a decades-long coast and a high-speed flyby.",
    modelNote: "Model extrapolation: Daedalus targeted Barnard's Star, not Proxima. Its published 3.8-year boost and >0.12c cruise are applied to the shorter 4.25 ly route; no arrival braking is included.",
    sourceIds: ["daedalus"],
  },
  {
    id: "starshot",
    name: "Breakthrough Starshot",
    kicker: "GRAMS, GIGAWATTS, ONE FLYBY",
    category: "study",
    evidence: "DESIGN STUDY",
    maxSpeedKmh: C_KMH * 0.2,
    totalYears: 21.25,
    phases: [
      { label: "LASER BOOST · ~10 MIN", start: 0, end: 0.001, from: 0, to: 1 },
      { label: "COAST · NO BRAKING", start: 0.001, end: 1, from: 1, to: 1 },
    ],
    description: "A ground laser trades spacecraft mass for speed: a gram-scale sail accelerates in minutes, coasts for about twenty years, and flashes through the destination.",
    modelNote: "Concept target, not a flown system. The probe reaches about 0.2c, has no published arrival braking phase, and needs roughly another 4.25 years to radio data home.",
    sourceIds: ["starshot"],
  },
  {
    id: "orion",
    name: "Project Orion",
    kicker: "NUCLEAR PULSES, MANY POSSIBLE SHIPS",
    category: "study",
    evidence: "DESIGN STUDY",
    description: "Orion accelerates by detonating nuclear pulse units behind a pusher plate. It is a propulsion family, not one vehicle with one honest arrival time.",
    modelNote: "No universal speed is plotted. A trustworthy calculation requires choosing a specific Orion point design, mass, pulse unit and mission.",
    sourceIds: ["orion"],
    unavailableReason: "NO SINGLE ORION PROFILE",
  },
  {
    id: "wandering-earth",
    name: "The Wandering Earth",
    kicker: "A PLANET-SCALE STORY ARC",
    category: "fiction",
    evidence: "FICTION / CANON",
    maxSpeedKmh: C_KMH * 0.005,
    totalYears: 2_500,
    phases: [
      { label: "STOP ROTATION / DEPART", start: 0, end: 0.2, from: 0, to: 1 },
      { label: "ACCELERATE / JUPITER CRISIS", start: 0.2, end: 0.42, from: 0.3, to: 1 },
      { label: "WANDERING", start: 0.42, end: 0.72, from: 1, to: 1 },
      { label: "DECELERATE", start: 0.72, end: 0.92, from: 1, to: 0.18 },
      { label: "CAPTURE", start: 0.92, end: 1, from: 0.18, to: 0 },
    ],
    description: "This is not a ship but an entire world, whose interstellar crossing is told as historical eras: departure, acceleration, wandering, deceleration and capture.",
    modelNote: "Film-continuity narrative diagram: 2,500 years and a quoted 0.5% c ceiling. The phases are story structure, not a physically integrated flight plan, and are not mixed with the novel's differing details.",
    sourceIds: ["wandering-earth"],
  },
  {
    id: "natural-selection",
    name: "Natural Selection",
    kicker: "ESCAPE VELOCITY AS POLITICS",
    category: "fiction",
    evidence: "FICTION / INFERRED",
    maxSpeedKmh: C_KMH * 0.15,
    phases: [
      { label: "FUSION DRIVE ACCELERATION", start: 0, end: 0.12, from: 0, to: 1 },
      { label: "DEEP-SPACE CRUISE", start: 0.12, end: 0.88, from: 1, to: 1 },
      { label: "MODELLED BRAKING", start: 0.88, end: 1, from: 1, to: 0 },
    ],
    description: "The Three-Body Problem turns acceleration into a moral and political choice: who gets to leave, and who can still turn back.",
    modelNote: "Continuity-derived comparison using the commonly described 15% c capability. The exact Proxima transfer and braking curve are modelled here, not specified by the novel.",
    sourceIds: ["three-body"],
  },
  {
    id: "discovery",
    name: "Discovery One",
    kicker: "2001: A SPACE ODYSSEY",
    category: "fiction",
    evidence: "NOT COMPARABLE",
    description: "Discovery makes Jupiter feel like a destination, not a waypoint. Neither film nor novel gives one canonical interstellar cruise speed suitable for this scale.",
    modelNote: "The film travels to Jupiter; the novel continues toward Saturn after a Jupiter assist. No invented km/h value is used.",
    sourceIds: ["discovery"],
    unavailableReason: "NO CANONICAL INTERSTELLAR SPEED",
  },
  {
    id: "enterprise",
    name: "USS Enterprise",
    kicker: "THE SILVER LADY",
    category: "fiction",
    evidence: "NOT COMPARABLE",
    description: "Warp travel changes the geometry of the trip rather than offering a conventional engine speed that belongs on this chart.",
    modelNote: "Warp factors vary by Star Trek continuity and are not converted into a fake km/h figure. The affectionate 'Silver Lady' name refers here to NCC-1701, especially the refit-era ship.",
    sourceIds: ["enterprise"],
    unavailableReason: "WARP SCALE · OFF THIS PHYSICS",
  },
  {
    id: "millennium-falcon",
    name: "Millennium Falcon",
    kicker: "HYPERSPACE IS NOT A SPEEDOMETER",
    category: "fiction",
    evidence: "NOT COMPARABLE",
    description: "A hyperdrive rating describes a fictional travel system, not a sustained velocity through ordinary space.",
    modelNote: "No canon-consistent linear speed is plotted; screen travel times vary with route and story.",
    sourceIds: ["falcon"],
    unavailableReason: "HYPERSPACE · OFF THIS PHYSICS",
  },
  {
    id: "droplet",
    name: "The Droplet",
    kicker: "NEAR-LIGHT ATTACK VECTOR",
    category: "fiction",
    evidence: "NOT COMPARABLE",
    description: "The Droplet's terrifying manoeuvres matter more than a single cruise figure, and the story does not provide a clean Proxima mission profile.",
    modelNote: "No unsupported decimal fraction of light speed is invented for this comparison.",
    sourceIds: ["three-body"],
    unavailableReason: "NO COMPLETE TRANSFER PROFILE",
  },
  {
    id: "warhammer",
    name: "Imperial voidship",
    kicker: "WARHAMMER 40,000",
    category: "fiction",
    evidence: "NOT COMPARABLE",
    description: "A voyage through the Warp is deliberately uncertain in duration and does not trace this route through normal space.",
    modelNote: "FTL setting logic is shown as incomparable rather than reduced to a misleading speed.",
    sourceIds: ["warhammer"],
    unavailableReason: "THE WARP · OFF THIS PHYSICS",
  },
];

export function distancePosition(au: number): number {
  if (au <= 1) return 0;
  return Math.min(1, Math.log10(au) / Math.log10(PROXIMA_AU));
}

export function constantTravelYears(speedKmh: number, targetAu = PROXIMA_AU): number {
  return ((targetAu - 1) * AU_KM) / speedKmh / HOURS_PER_YEAR;
}

export function totalTravelYears(vehicle: Vehicle): number | undefined {
  if (vehicle.outbound === false) return undefined;
  if (vehicle.totalYears !== undefined) return vehicle.totalYears;
  if (vehicle.maxSpeedKmh === undefined) return undefined;
  const phases = vehicle.phases;
  if (!phases?.length) return undefined;
  const averageFactor = phases.reduce(
    (sum, phase) => sum + phaseAreaUntil(phase, phase.end),
    0,
  );
  if (averageFactor <= 0) return undefined;
  return constantTravelYears(vehicle.maxSpeedKmh * averageFactor);
}

export function speedFactorAt(vehicle: Vehicle, progress: number): number {
  const phases = vehicle.phases;
  if (!phases?.length) return 0;
  const p = Math.max(0, Math.min(1, progress));
  const phase = phases.find((item) => p >= item.start && p <= item.end) ?? phases.at(-1);
  if (!phase) return 0;
  const span = Math.max(phase.end - phase.start, Number.EPSILON);
  const local = Math.max(0, Math.min(1, (p - phase.start) / span));
  return phase.from + (phase.to - phase.from) * local;
}

export function phaseAt(vehicle: Vehicle, progress: number): string {
  const phases = vehicle.phases;
  if (!phases?.length) return vehicle.unavailableReason ?? "NO PROFILE";
  const p = Math.max(0, Math.min(1, progress));
  return (
    phases.find((phase) => p >= phase.start && p <= phase.end)?.label ??
    phases.at(-1)?.label ??
    "NO PROFILE"
  );
}

function phaseAreaUntil(phase: Phase, progress: number): number {
  const end = Math.max(phase.start, Math.min(phase.end, progress));
  const duration = end - phase.start;
  if (duration <= 0) return 0;
  const span = Math.max(phase.end - phase.start, Number.EPSILON);
  const local = duration / span;
  const endFactor = phase.from + (phase.to - phase.from) * local;
  return duration * (phase.from + endFactor) / 2;
}

function integratedFraction(vehicle: Vehicle, progress: number): number {
  if (!vehicle.phases?.length) return 0;
  const p = Math.max(0, Math.min(1, progress));
  const total = vehicle.phases.reduce(
    (sum, phase) => sum + phaseAreaUntil(phase, phase.end),
    0,
  );
  if (total <= 0) return p;
  const partial = vehicle.phases.reduce(
    (sum, phase) => sum + phaseAreaUntil(phase, p),
    0,
  );
  return Math.max(0, Math.min(1, partial / total));
}

export function journeySample(vehicle: Vehicle, progress: number): JourneySample {
  const p = Math.max(0, Math.min(1, progress));
  const years = totalTravelYears(vehicle) ?? 0;
  const distanceFraction = integratedFraction(vehicle, p);
  return {
    currentAu: 1 + (PROXIMA_AU - 1) * distanceFraction,
    distanceFraction,
    elapsedYears: years * p,
    speedKmh: (vehicle.maxSpeedKmh ?? 0) * speedFactorAt(vehicle, p),
    phase: phaseAt(vehicle, p),
  };
}

export function milestoneYears(vehicle: Vehicle, milestoneAu: number): number | undefined {
  const total = totalTravelYears(vehicle);
  if (total === undefined || !vehicle.phases?.length) return undefined;
  const targetFraction = (milestoneAu - 1) / (PROXIMA_AU - 1);
  if (targetFraction <= 0) return 0;
  if (targetFraction >= 1) return total;
  let lower = 0;
  let upper = 1;
  for (let iteration = 0; iteration < 48; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    if (integratedFraction(vehicle, midpoint) < targetFraction) lower = midpoint;
    else upper = midpoint;
  }
  return total * upper;
}

export function profilePoints(vehicle: Vehicle, count = 120): string {
  if (!vehicle.phases?.length) return "";
  const values = Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const x = progress * 1_000;
    const factor = speedFactorAt(vehicle, progress);
    const y = 184 - factor * 142;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return values.join(" ");
}

export function formatDuration(years: number | undefined): string {
  if (years === undefined) return "NOT COMPARABLE";
  if (years < 1 / 365.25) return `${Math.round(years * 365.25 * 24)} HOURS`;
  if (years < 1) return `${Math.round(years * 365.25)} DAYS`;
  if (years < 100) return `${years.toFixed(years < 10 ? 1 : 0)} YEARS`;
  return `${Math.round(years).toLocaleString("en-AU")} YEARS`;
}

export function formatSpeed(speedKmh: number): string {
  if (speedKmh <= 0) return "0 KM/H";
  if (speedKmh >= C_KMH * 0.01) return `${(speedKmh / C_KMH).toFixed(3)} c`;
  return `${Math.round(speedKmh).toLocaleString("en-AU")} KM/H`;
}

export function formatDistance(au: number): string {
  if (au >= 63_241) return `${(au / 63_241.077).toFixed(2)} LY`;
  if (au >= 1_000) return `${Math.round(au).toLocaleString("en-AU")} AU`;
  if (au >= 10) return `${au.toFixed(1)} AU`;
  return `${au.toFixed(2)} AU`;
}
