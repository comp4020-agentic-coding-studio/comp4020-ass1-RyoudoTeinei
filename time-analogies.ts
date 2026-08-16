export interface TimeAnalogy {
  thresholdYears: number;
  headline: string;
  detail: string;
  sourceId?: "wwii" | "life-expectancy" | "rome";
}

const TIME_ANALOGIES: readonly TimeAnalogy[] = [
  {
    thresholdYears: 0,
    headline: "LESS THAN ONE YEAR",
    detail: "",
  },
  {
    thresholdYears: 6,
    headline: "≈ WORLD WAR II",
    detail: "1939–1945 · SIX YEARS",
    sourceId: "wwii",
  },
  {
    thresholdYears: 73.1,
    headline: "≈ ONE GLOBAL HUMAN LIFETIME",
    detail: "73.1 YEARS · WHO 2019",
    sourceId: "life-expectancy",
  },
  {
    thresholdYears: 1_228,
    headline: "≈ ROME’S TRADITIONAL FOUNDING TO THE WESTERN EMPIRE’S FALL",
    detail: "753 BCE–476 CE · 1,228 YEARS",
    sourceId: "rome",
  },
] as const;

export function timeAnalogyAt(elapsedYears: number): TimeAnalogy {
  if (!Number.isFinite(elapsedYears) || elapsedYears < 0) {
    throw new RangeError("Elapsed years must be finite and non-negative.");
  }
  let selected = TIME_ANALOGIES[0]!;
  for (const analogy of TIME_ANALOGIES) {
    if (elapsedYears < analogy.thresholdYears) break;
    selected = analogy;
  }
  return selected;
}
