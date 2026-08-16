export interface TimeAnalogy {
  durationYears: number;
  headline: string;
  detail: string;
  sourceId?:
    | "earth-year"
    | "wwi"
    | "wwii"
    | "apollo-program"
    | "saturn-year"
    | "cold-war"
    | "life-expectancy"
    | "powered-flight"
    | "pluto-year"
    | "us-independence"
    | "jamestown"
    | "roman-republic"
    | "ottoman-empire"
    | "byzantine-empire"
    | "rome"
    | "parthenon"
    | "uruk"
    | "holocene"
    | "human-dispersal"
    | "homo-sapiens";
}

const TIME_ANALOGIES: readonly TimeAnalogy[] = [
  {
    durationYears: 0,
    headline: "LESS THAN ONE YEAR",
    detail: "",
  },
  {
    durationYears: 1,
    headline: "≈ ONE EARTH ORBIT",
    detail: "365.25 DAYS",
    sourceId: "earth-year",
  },
  {
    durationYears: 4.29,
    headline: "≈ THE FIRST WORLD WAR",
    detail: "1914–1918 · ABOUT FOUR YEARS",
    sourceId: "wwi",
  },
  {
    durationYears: 6,
    headline: "≈ WORLD WAR II",
    detail: "1939–1945 · SIX YEARS",
    sourceId: "wwii",
  },
  {
    durationYears: 10,
    headline: "≈ THE APOLLO PROGRAM",
    detail: "1962–1972 · TEN YEARS",
    sourceId: "apollo-program",
  },
  {
    durationYears: 29.4,
    headline: "≈ ONE SATURN ORBIT",
    detail: "29.4 EARTH YEARS",
    sourceId: "saturn-year",
  },
  {
    durationYears: 46,
    headline: "≈ THE COLD WAR",
    detail: "1945–1991 · 46 YEARS",
    sourceId: "cold-war",
  },
  {
    durationYears: 73.1,
    headline: "≈ ONE GLOBAL HUMAN LIFETIME",
    detail: "73.1 YEARS · WHO 2019",
    sourceId: "life-expectancy",
  },
  {
    durationYears: 123,
    headline: "≈ FROM THE FIRST POWERED FLIGHT TO 2026",
    detail: "1903–2026 · 123 YEARS",
    sourceId: "powered-flight",
  },
  {
    durationYears: 248,
    headline: "≈ ONE PLUTO ORBIT",
    detail: "248 EARTH YEARS",
    sourceId: "pluto-year",
  },
  {
    durationYears: 250,
    headline: "≈ FROM U.S. INDEPENDENCE TO 2026",
    detail: "1776–2026 · 250 YEARS",
    sourceId: "us-independence",
  },
  {
    durationYears: 419,
    headline: "≈ FROM JAMESTOWN’S FOUNDING TO 2026",
    detail: "1607–2026 · 419 YEARS",
    sourceId: "jamestown",
  },
  {
    durationYears: 482,
    headline: "≈ THE ENTIRE ROMAN REPUBLIC",
    detail: "509–27 BCE · ABOUT 482 YEARS",
    sourceId: "roman-republic",
  },
  {
    durationYears: 623,
    headline: "≈ THE OTTOMAN EMPIRE",
    detail: "c. 1299–1922 · ABOUT 623 YEARS",
    sourceId: "ottoman-empire",
  },
  {
    durationYears: 1_123,
    headline: "≈ THE BYZANTINE EMPIRE",
    detail: "330–1453 · ABOUT 1,123 YEARS",
    sourceId: "byzantine-empire",
  },
  {
    durationYears: 1_228,
    headline: "≈ ROME’S TRADITIONAL FOUNDING TO THE WESTERN EMPIRE’S FALL",
    detail: "753 BCE–476 CE · 1,228 YEARS",
    sourceId: "rome",
  },
  {
    durationYears: 2_457,
    headline: "≈ FROM THE PARTHENON’S COMPLETION TO 2026",
    detail: "432 BCE–2026 · ABOUT 2,457 YEARS",
    sourceId: "parthenon",
  },
  {
    durationYears: 6_000,
    headline: "≈ FROM URUK CULTURE TO TODAY",
    detail: "c. 4000 BCE–PRESENT · SIX MILLENNIA",
    sourceId: "uruk",
  },
  {
    durationYears: 11_700,
    headline: "≈ THE ENTIRE HOLOCENE",
    detail: "ABOUT 11,700 YEARS",
    sourceId: "holocene",
  },
  {
    durationYears: 60_000,
    headline: "≈ THE SUCCESSFUL HUMAN DISPERSAL FROM AFRICA",
    detail: "ABOUT 60,000 YEARS",
    sourceId: "human-dispersal",
  },
  {
    durationYears: 300_000,
    headline: "≈ THE AGE OF HOMO SAPIENS",
    detail: "ABOUT 300,000 YEARS",
    sourceId: "homo-sapiens",
  },
] as const;

export function timeAnalogyAt(elapsedYears: number): TimeAnalogy {
  if (!Number.isFinite(elapsedYears) || elapsedYears < 0) {
    throw new RangeError("Elapsed years must be finite and non-negative.");
  }
  if (elapsedYears < 0.75) return TIME_ANALOGIES[0]!;

  const comparableDurations = TIME_ANALOGIES.slice(1);
  return comparableDurations.reduce((closest, candidate) => {
    const closestRatio = Math.abs(Math.log(elapsedYears / closest.durationYears));
    const candidateRatio = Math.abs(Math.log(elapsedYears / candidate.durationYears));
    return candidateRatio < closestRatio ? candidate : closest;
  });
}
