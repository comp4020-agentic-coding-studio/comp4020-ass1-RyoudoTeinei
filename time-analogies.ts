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
    | "pluto-year"
    | "rome";
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
    durationYears: 100,
    headline: "≈ ONE CENTURY",
    detail: "100 YEARS",
  },
  {
    durationYears: 248,
    headline: "≈ ONE PLUTO ORBIT",
    detail: "248 EARTH YEARS",
    sourceId: "pluto-year",
  },
  {
    durationYears: 500,
    headline: "≈ HALF A MILLENNIUM",
    detail: "FIVE CENTURIES",
  },
  {
    durationYears: 1_000,
    headline: "≈ ONE MILLENNIUM",
    detail: "TEN CENTURIES",
  },
  {
    durationYears: 1_228,
    headline: "≈ ROME’S TRADITIONAL FOUNDING TO THE WESTERN EMPIRE’S FALL",
    detail: "753 BCE–476 CE · 1,228 YEARS",
    sourceId: "rome",
  },
  {
    durationYears: 2_500,
    headline: "≈ TWENTY-FIVE CENTURIES",
    detail: "TWO AND A HALF MILLENNIA",
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
