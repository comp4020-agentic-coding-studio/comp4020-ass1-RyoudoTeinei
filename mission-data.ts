export const AU_KM = 149_597_870.7;
export const HOURS_PER_YEAR = 8_766;
export const C_KMH = 1_079_252_849;
export const PROXIMA_LY = 4.2465;
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

export type EphemerisTrajectoryId = "voyager1" | "parkerSolarProbe";

export type MissionPath =
  | {
      kind: "ephemeris";
      trajectoryId: EphemerisTrajectoryId;
      outcome: "outbound" | "bound";
      summary: string;
    }
  | {
      kind: "profile";
      targetStarId: "proxima-centauri";
      targetLabel: "Proxima Centauri";
      targetAu: number;
      summary: string;
    }
  | {
      kind: "in-system-profile";
      targetBody: "jupiter";
      targetLabel: "Jupiter";
      targetAu: number;
      summary: string;
    }
  | { kind: "none" }
  | { kind: "off-map"; reason: string };

export type RouteDirection =
  | { kind: "last-velocity" }
  | { kind: "catalogue-target"; starId: "proxima-centauri" };

export type RouteDestination =
  | {
      kind: "target";
      starId: "proxima-centauri";
      label: "Proxima Centauri";
      au: number;
    }
  | {
      kind: "distance-equivalent";
      label: string;
      au: number;
    };

export type OnwardPath =
  | {
      kind: "constant";
      start: "earth" | "ephemeris-end" | "peak-ephemeris";
      startAu: number;
      speedSource: "vehicle-max" | "mission-average" | "ephemeris-end" | "ephemeris-peak";
      speedKmh: number;
      direction: RouteDirection;
      destination: RouteDestination;
      evidence: "COUNTERFACTUAL";
      discontinuity: boolean;
      note: string;
    }
  | { kind: "none"; reason?: string };

export type CanonicalRouteEvidence =
  | "CANON"
  | "CANON SEQUENCE · SCHEMATIC GEOMETRY"
  | "INFERRED TIMING";

export interface CanonicalRouteStage {
  id:
    | "rotation-brake"
    | "solar-escape"
    | "jupiter-assist"
    | "interstellar-acceleration"
    | "interstellar-coast"
    | "interstellar-deceleration"
    | "proxima-approach"
    | "proxima-capture";
  label: string;
  startYear: number;
  endYear: number;
  evidence: CanonicalRouteEvidence;
  note: string;
}

export interface CanonicalRouteSequence {
  kind: "canon-sequence";
  continuity: "LIU CIXIN NOVEL";
  coordinateOrigin: {
    body: "sun";
    label: "SUN = COORDINATE ORIGIN · NOT THE LAUNCH POINT";
  };
  launch: {
    body: "earth";
    au: 1;
    label: "EARTH IS THE VEHICLE · LAUNCH POINT = 1 AU";
  };
  target: {
    body: "proxima-centauri";
    au: number;
    label: "PROXIMA CENTAURI";
    arrivalYear: number;
    captureEndYear: number;
  };
  totalYears: number;
  geometry: "SCHEMATIC";
  escapeSequence: {
    orbitCount: 15;
    startYear: 42;
    endYear: 57;
    startAu: 1;
    finalAphelionAu: number;
    shapeProgression: "increasingly-eccentric";
    encounterBody: "jupiter";
    encounterKind: "planned-gravity-assist";
    evidence: "CANON SEQUENCE · ORBIT SHAPE SCHEMATIC";
  };
  stages: readonly CanonicalRouteStage[];
}

export interface InSystemRouteSequence {
  kind: "in-system-sequence";
  continuity: "KUBRICK FILM · 1968";
  launchAu: 1;
  targetBody: "jupiter";
  targetAu: number;
  totalYears: number;
  transferEndProgress: number;
  stargateProgress: number;
  geometry: "SCHEMATIC HELIOCENTRIC TRANSFER";
}

export interface VehicleRoute {
  mission: MissionPath;
  onward: OnwardPath;
  canonicalSequence?: CanonicalRouteSequence;
  inSystemSequence?: InSystemRouteSequence;
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
  arrivalEstimate?: {
    routeLabel: string;
    years?: number;
    display?: string;
    context: string;
    evidence: "DERIVED" | "ILLUSTRATIVE" | "COMMUNITY ESTIMATE" | "LORE RANGE";
  };
  route: VehicleRoute;
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

function proximaTarget(): RouteDestination {
  return {
    kind: "target",
    starId: "proxima-centauri",
    label: "Proxima Centauri",
    au: PROXIMA_AU,
  };
}

function comparisonFromEarth(speedKmh: number, note: string): VehicleRoute {
  return {
    mission: { kind: "none" },
    onward: {
      kind: "constant",
      start: "earth",
      startAu: 1,
      speedSource: "vehicle-max",
      speedKmh,
      direction: { kind: "catalogue-target", starId: "proxima-centauri" },
      destination: proximaTarget(),
      evidence: "COUNTERFACTUAL",
      discontinuity: false,
      note,
    },
  };
}

function profileToProxima(summary: string): VehicleRoute {
  return {
    mission: {
      kind: "profile",
      targetStarId: "proxima-centauri",
      targetLabel: "Proxima Centauri",
      targetAu: PROXIMA_AU,
      summary,
    },
    onward: { kind: "none" },
  };
}

function offMap(reason: string): VehicleRoute {
  return {
    mission: { kind: "off-map", reason },
    onward: { kind: "none", reason },
  };
}

const WANDERING_EARTH_NOVEL_ROUTE: CanonicalRouteSequence = {
  kind: "canon-sequence",
  continuity: "LIU CIXIN NOVEL",
  coordinateOrigin: {
    body: "sun",
    label: "SUN = COORDINATE ORIGIN · NOT THE LAUNCH POINT",
  },
  launch: {
    body: "earth",
    au: 1,
    label: "EARTH IS THE VEHICLE · LAUNCH POINT = 1 AU",
  },
  target: {
    body: "proxima-centauri",
    au: PROXIMA_AU,
    label: "PROXIMA CENTAURI",
    arrivalYear: 2_400,
    captureEndYear: 2_500,
  },
  totalYears: 2_500,
  geometry: "SCHEMATIC",
  escapeSequence: {
    orbitCount: 15,
    startYear: 42,
    endYear: 57,
    startAu: 1,
    finalAphelionAu: 5.2,
    shapeProgression: "increasingly-eccentric",
    encounterBody: "jupiter",
    encounterKind: "planned-gravity-assist",
    evidence: "CANON SEQUENCE · ORBIT SHAPE SCHEMATIC",
  },
  stages: [
    {
      id: "rotation-brake",
      label: "BRAKING ERA · ROTATION HALTED",
      startYear: 0,
      endYear: 42,
      evidence: "CANON",
      note: "The Earth Engines first stop the planet's rotation during the novel's 42-year Braking Era.",
    },
    {
      id: "solar-escape",
      label: "ESCAPE ERA · 15 SOLAR PASSES",
      startYear: 42,
      endYear: 57,
      evidence: "CANON SEQUENCE · SCHEMATIC GEOMETRY",
      note: "Fifteen increasingly extended solar passes are the canon sequence; one displayed year per pass and the drawn orbital shapes are schematic.",
    },
    {
      id: "jupiter-assist",
      label: "JUPITER GRAVITY ASSIST · PLANNED",
      startYear: 57,
      endYear: 57,
      evidence: "CANON SEQUENCE · SCHEMATIC GEOMETRY",
      note: "Jupiter is a planned gravity-assist encounter at the end of the escape sequence, not the launch point and not an accidental crisis.",
    },
    {
      id: "interstellar-acceleration",
      label: "WANDERING ERA I · ACCELERATE TO 0.005C",
      startYear: 57,
      endYear: 557,
      evidence: "CANON",
      note: "The novel gives five centuries of full-thrust acceleration to 0.005c; displayed spatial positions are normalised to the stated Proxima destination.",
    },
    {
      id: "interstellar-coast",
      label: "WANDERING ERA I · INTERSTELLAR COAST",
      startYear: 557,
      endYear: 1857,
      evidence: "CANON",
      note: "The novel gives a 1,300-year coast at 0.005c; the map labels it as narrative canon rather than a physical ephemeris.",
    },
    {
      id: "interstellar-deceleration",
      label: "WANDERING ERA II · ENGINES REVERSED",
      startYear: 1857,
      endYear: 2357,
      evidence: "CANON",
      note: "The novel gives five centuries of reversed-engine deceleration; the rendered curve remains a distance-normalised story route.",
    },
    {
      id: "proxima-approach",
      label: "NEW SUN APPROACH · ARRIVAL YEAR 2400",
      startYear: 2357,
      endYear: 2400,
      evidence: "INFERRED TIMING",
      note: "This 43-year approach closes the stated 2,400-year arrival clock without pretending that the novel supplies exact orbital elements.",
    },
    {
      id: "proxima-capture",
      label: "NEW SUN ERA · 100-YEAR CAPTURE",
      startYear: 2400,
      endYear: 2500,
      evidence: "CANON",
      note: "The novel reserves the final century for capture into the new star system; its drawn curve remains schematic.",
    },
  ],
};

const DISCOVERY_ONE_FILM_ROUTE: InSystemRouteSequence = {
  kind: "in-system-sequence",
  continuity: "KUBRICK FILM · 1968",
  launchAu: 1,
  targetBody: "jupiter",
  targetAu: 5.2,
  totalYears: 1.5,
  transferEndProgress: 0.92,
  stargateProgress: 0.985,
  geometry: "SCHEMATIC HELIOCENTRIC TRANSFER",
};

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
    route: {
      mission: {
        kind: "ephemeris",
        trajectoryId: "voyager1",
        outcome: "outbound",
        summary: "Recorded JPL path from Earth past Jupiter, Saturn and the heliopause to the current endpoint.",
      },
      onward: {
        kind: "constant",
        start: "ephemeris-end",
        startAu: 171.5,
        speedSource: "ephemeris-end",
        speedKmh: 61_198,
        direction: { kind: "last-velocity" },
        destination: {
          kind: "distance-equivalent",
          label: "Proxima distance-equivalent",
          au: PROXIMA_AU,
        },
        evidence: "COUNTERFACTUAL",
        discontinuity: false,
        note: "The continuation follows Voyager's last measured velocity direction. Proxima is only a distance-equivalent marker; Voyager is not aimed at the star.",
      },
    },
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
    route: comparisonFromEarth(397.36, "An impossible constant-speed comparison aimed at Proxima Centauri."),
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
    route: comparisonFromEarth(839, "An airliner cannot fly in vacuum; its cruise speed is frozen solely to expose distance."),
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
    route: comparisonFromEarth(2_179, "A counterfactual straight-line comparison at Concorde's quoted cruise speed."),
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
    route: comparisonFromEarth(39_897, "Apollo 10's return peak is frozen and redirected outward; this is not a flown mission."),
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
    modelNote: "The chart sketches the real accelerate–decelerate orbit pattern, so there is no outward arrival model. As a separate, impossible thought experiment, freezing and redirecting the 692,018 km/h perihelion instant gives a Proxima-distance crossing of about 6,623 years.",
    sourceIds: ["parker", "parker-orbits"],
    route: {
      mission: {
        kind: "ephemeris",
        trajectoryId: "parkerSolarProbe",
        outcome: "bound",
        summary: "Recorded JPL path through Venus gravity assists and repeated bound solar perihelia.",
      },
      onward: {
        kind: "constant",
        start: "peak-ephemeris",
        startAu: 0.046,
        speedSource: "ephemeris-peak",
        speedKmh: 692_018,
        direction: { kind: "catalogue-target", starId: "proxima-centauri" },
        destination: proximaTarget(),
        evidence: "COUNTERFACTUAL",
        discontinuity: true,
        note: "Impossible branch: freeze Parker's perihelion speed and redirect it outward. The real probe remains bound to the Sun.",
      },
    },
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
    route: profileToProxima("The published two-stage fusion profile is reapplied to a clearly labelled Proxima comparison."),
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
    route: profileToProxima("A concept profile: laser boost near Earth followed by an unbraked coast to Proxima."),
  },
  {
    id: "orion",
    name: "Project Orion",
    kicker: "NUCLEAR PULSES, MANY POSSIBLE SHIPS",
    category: "study",
    evidence: "DESIGN STUDY",
    maxSpeedKmh: C_KMH * 0.1,
    totalYears: PROXIMA_LY / 0.1,
    phases: [
      { label: "NUCLEAR-PULSE BOOST", start: 0, end: 0.04, from: 1, to: 1 },
      { label: "0.1C INTERSTELLAR COAST", start: 0.04, end: 1, from: 1, to: 1 },
    ],
    description: "Orion accelerates by detonating nuclear pulse units behind a pusher plate. It is a propulsion family, not one vehicle with one honest arrival time.",
    modelNote: "Orion has no universal speed, so this tour explicitly selects the 0.1c interstellar benchmark discussed in NASA's survey of Orion-era concepts. It is a flyby-scale design-study route: an Earth-orbit departure, nuclear-pulse boost and coast to the Proxima distance, not one finished Orion point design.",
    sourceIds: ["orion"],
    arrivalEstimate: {
      routeLabel: "SELECTED ORION 0.1C → PROXIMA DISTANCE",
      years: PROXIMA_LY / 0.1,
      context: "0.1C INTERSTELLAR ORION BENCHMARK · COAST-ONLY SCALE",
      evidence: "DERIVED",
    },
    route: profileToProxima("Selected 0.1c Orion design-study benchmark: depart Earth orbit, accelerate by nuclear pulse propulsion, then coast through the heliopause and Oort-cloud scale to the Proxima distance."),
  },
  {
    id: "wandering-earth",
    name: "The Wandering Earth",
    kicker: "EARTH IS THE VEHICLE",
    category: "fiction",
    evidence: "FICTION / CANON",
    maxSpeedKmh: C_KMH * 0.005,
    totalYears: 2_500,
    phases: [
      { label: "BRAKING ERA · 42 YEARS", start: 0, end: 42 / 2_500, from: 0, to: 0 },
      { label: "ESCAPE ERA · 15 SOLAR PASSES", start: 42 / 2_500, end: 57 / 2_500, from: 0, to: 0.01 },
      { label: "ACCELERATE · 500 YEARS", start: 57 / 2_500, end: 557 / 2_500, from: 0.01, to: 1 },
      { label: "INTERSTELLAR COAST · 1,300 YEARS", start: 557 / 2_500, end: 1_857 / 2_500, from: 1, to: 1 },
      { label: "DECELERATE · 500 YEARS", start: 1_857 / 2_500, end: 2_357 / 2_500, from: 1, to: 0.15 },
      { label: "PROXIMA APPROACH · YEAR 2400", start: 2_357 / 2_500, end: 2_400 / 2_500, from: 0.15, to: 0.05 },
      { label: "CAPTURE · FINAL 100 YEARS", start: 2_400 / 2_500, end: 1, from: 0.05, to: 0 },
    ],
    description: "Earth itself is the vehicle: engines halt its rotation, fifteen widening solar passes lead to a planned Jupiter gravity assist, and the planet then begins the long acceleration–coast–deceleration journey to Proxima.",
    modelNote: "Liu Cixin novel continuity. The 42-year Braking Era, fifteen-pass escape sequence, planned Jupiter assist and 2,500-year destination plan are kept as story facts. Orbit shapes and the interactive era timings are explicitly schematic or inferred—not a fabricated ephemeris.",
    sourceIds: ["wandering-earth"],
    route: {
      ...profileToProxima("Novel-continuity sequence: Earth departs from 1 AU, makes fifteen widening solar passes, uses a planned Jupiter gravity assist, then follows a labelled interstellar era model to Proxima."),
      canonicalSequence: WANDERING_EARTH_NOVEL_ROUTE,
    },
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
    route: profileToProxima("A continuity-derived acceleration, cruise and modelled braking profile."),
  },
  {
    id: "discovery",
    name: "Discovery One",
    kicker: "2001: A SPACE ODYSSEY",
    category: "fiction",
    evidence: "FICTION / INFERRED",
    maxSpeedKmh: 60_000,
    totalYears: 1.5,
    phases: [
      { label: "EARTH DEPARTURE BURN", start: 0, end: 0.08, from: 0.15, to: 1 },
      { label: "HIBERNATION CRUISE · HAL 9000", start: 0.08, end: 0.82, from: 1, to: 1 },
      { label: "JUPITER APPROACH", start: 0.82, end: 0.985, from: 1, to: 0.35 },
      { label: "MONOLITH / STARGATE", start: 0.985, end: 1, from: 0.35, to: 0 },
    ],
    description: "Discovery One is a nuclear-powered deep-space ship built around a spherical crew module, rotating centrifuge, long structural spine and an isolated propulsion section. In Kubrick's film it carries five astronauts and HAL 9000 on an eighteen-month mission to Jupiter after the lunar monolith transmits a signal there.",
    modelNote: "Film continuity. The route draws the 18-month Earth-to-Jupiter mission and labels the monolith/Stargate endpoint. It then makes an explicit counterfactual cut and reapplies that mission's average pace to the heliopause, Oort Cloud and Proxima distance. The transfer curve, burn timing, speed profile and continuation are explanatory reconstructions, not canonical orbital elements.",
    sourceIds: ["discovery"],
    arrivalEstimate: {
      routeLabel: "DISCOVERY JUPITER PACE → PROXIMA DISTANCE",
      years: ((PROXIMA_AU - 1) / (5.2 - 1)) * 1.5,
      context: "18-MONTH FILM VOYAGE REAPPLIED AS AN AVERAGE PACE",
      evidence: "DERIVED",
    },
    route: {
      mission: {
        kind: "in-system-profile",
        targetBody: "jupiter",
        targetLabel: "Jupiter",
        targetAu: 5.2,
        summary: "Film-continuity reconstruction from Earth's orbit to Jupiter; the normal trajectory ends at the monolith/Stargate event.",
      },
      onward: {
        kind: "constant",
        start: "earth",
        startAu: 5.2,
        speedSource: "mission-average",
        speedKmh: (5.2 - 1) * AU_KM / (1.5 * HOURS_PER_YEAR),
        direction: {
          kind: "catalogue-target",
          starId: "proxima-centauri",
        },
        destination: {
          kind: "distance-equivalent",
          label: "Proxima distance-equivalent",
          au: PROXIMA_AU,
        },
        evidence: "COUNTERFACTUAL",
        discontinuity: true,
        note: "The film mission ends at Jupiter and the monolith/Stargate event. After this explicit cut, the tour reapplies Discovery's reconstructed Earth–Jupiter average pace only as a normal-space distance comparison; it is not a canonical continuation through the Stargate.",
      },
      inSystemSequence: DISCOVERY_ONE_FILM_ROUTE,
    },
  },
  {
    id: "enterprise",
    name: "USS Enterprise",
    kicker: "THE SILVER LADY",
    category: "fiction",
    evidence: "NOT COMPARABLE",
    description: "The original Enterprise's emergency maximum is Warp 8; under the original-series cubic convention that is approximately 512c.",
    modelNote: "Warp scales vary between Star Trek eras. This comparison uses the original-series cubic convention and the Constitution class's emergency maximum of Warp 8, producing about 3.0 days across the present Proxima distance.",
    sourceIds: ["enterprise"],
    unavailableReason: "WARP SCALE · OFF THIS PHYSICS",
    arrivalEstimate: {
      routeLabel: "ENTERPRISE WARP 8 → PROXIMA DISTANCE",
      years: PROXIMA_LY / 512,
      context: "TOS-ERA CUBIC CONVENTION · EMERGENCY MAXIMUM WARP 8 ≈ 512C",
      evidence: "ILLUSTRATIVE",
    },
    route: offMap("Warp 8 is presented in the separate setting-performance section rather than on the normal-space map."),
  },
  {
    id: "millennium-falcon",
    name: "Millennium Falcon",
    kicker: "HYPERSPACE IS NOT A SPEEDOMETER",
    category: "fiction",
    evidence: "NOT COMPARABLE",
    description: "The Falcon's upgraded Class 0.5 hyperdrive is among the fastest in its setting; this explainer adopts the widely circulated Legends-era estimate of 150,000c.",
    modelNote: "The Kessel Run demonstrates route efficiency and survivability. For a numerical comparison, this explainer applies the community estimate of 150,000c to the present Proxima distance.",
    sourceIds: ["falcon"],
    unavailableReason: "HYPERSPACE · OFF THIS PHYSICS",
    arrivalEstimate: {
      routeLabel: "FALCON HYPERSPACE → PROXIMA DISTANCE",
      years: PROXIMA_LY / 150_000,
      context: "LEGENDS-ERA COMMUNITY ESTIMATE · 150,000C",
      evidence: "COMMUNITY ESTIMATE",
    },
    route: offMap("The adopted 150,000c hyperspace benchmark is presented in the separate setting-performance section."),
  },
  {
    id: "droplet",
    name: "The Droplet",
    kicker: "25,000 KM/S ATTACK VECTOR",
    category: "fiction",
    evidence: "NOT COMPARABLE",
    description: "Later in the trilogy, droplets are explicitly detected at 25,000 km/s—about 8.3% of light speed—while retaining their terrifying manoeuvrability.",
    modelNote: "The headline applies the setting's stated 25,000 km/s droplet maximum as a constant-speed comparison across the present Proxima distance, producing about 50.9 years.",
    sourceIds: ["three-body"],
    unavailableReason: "FICTIONAL ATTACK VECTOR · STATIC COMPARISON",
    arrivalEstimate: {
      routeLabel: "DROPLET 25,000 KM/S → PROXIMA DISTANCE",
      years: constantTravelYears(25_000 * 3_600),
      context: "SETTING MAXIMUM · 25,000 KM/S · CONSTANT-SPEED COMPARISON",
      evidence: "DERIVED",
    },
    route: offMap("The stated 25,000 km/s maximum is presented as a constant-speed comparison in the setting-performance section."),
  },
  {
    id: "warhammer",
    name: "Macragge's Honour",
    kicker: "GLORIANA-CLASS FLAGSHIP",
    category: "fiction",
    evidence: "NOT COMPARABLE",
    description: "The Ultramarines' 26-kilometre Gloriana-class flagship crosses realspace under conventional power, then translates into the Warp for interstellar voyages.",
    modelNote: "Imperial accounts make variability part of Warp performance: a short passage may take hours or weeks, while hostile currents and time displacement can produce much worse outcomes.",
    sourceIds: ["warhammer"],
    unavailableReason: "THE WARP · OFF THIS PHYSICS",
    arrivalEstimate: {
      routeLabel: "MACRAGGE'S HONOUR WARP HOP → PROXIMA DISTANCE",
      display: "HOURS–WEEKS / OR WORSE",
      context: "IMPERIAL LORE RANGE · WARP CURRENTS AND TIME DISPLACEMENT",
      evidence: "LORE RANGE",
    },
    route: offMap("The best-case Imperial Warp benchmark is presented in the separate setting-performance section."),
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

export function onwardComparisonYears(
  vehicle: Vehicle,
  targetAu?: number,
): number | undefined {
  const onward = vehicle.route.onward;
  if (onward.kind !== "constant" || onward.speedKmh <= 0) return undefined;
  const distanceAu = (targetAu ?? onward.destination.au) - onward.startAu;
  if (distanceAu <= 0) return undefined;
  return (distanceAu * AU_KM) / onward.speedKmh / HOURS_PER_YEAR;
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
  const progress = journeyProgressAtAu(vehicle, milestoneAu);
  if (total === undefined || progress === undefined) return undefined;
  return total * progress;
}

export function journeyProgressAtAu(
  vehicle: Vehicle,
  milestoneAu: number,
): number | undefined {
  if (totalTravelYears(vehicle) === undefined || !vehicle.phases?.length) return undefined;
  const targetFraction = (milestoneAu - 1) / (PROXIMA_AU - 1);
  if (targetFraction <= 0) return 0;
  if (targetFraction >= 1) return 1;
  let lower = 0;
  let upper = 1;
  for (let iteration = 0; iteration < 48; iteration += 1) {
    const midpoint = (lower + upper) / 2;
    if (integratedFraction(vehicle, midpoint) < targetFraction) lower = midpoint;
    else upper = midpoint;
  }
  return upper;
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
  if (years < 100) return `${years.toFixed(1)} YEARS`;
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
