export interface TimeAnalogy {
  thresholdYears: number;
  headline: string;
  detail: string;
  sourceId?: "wwii" | "life-expectancy" | "rome";
}

const TIME_ANALOGIES: readonly TimeAnalogy[] = [
  {
    thresholdYears: 0,
    headline: "LESS THAN A HUMAN YEAR",
    detail: "The mission clock has not yet crossed its first year.",
  },
  {
    thresholdYears: 6,
    headline: "ABOUT THE LENGTH OF WORLD WAR II",
    detail: "1939–1945 · roughly six years",
    sourceId: "wwii",
  },
  {
    thresholdYears: 73.1,
    headline: "ABOUT ONE GLOBAL HUMAN LIFETIME",
    detail: "WHO global life expectancy in 2019 · 73.1 years",
    sourceId: "life-expectancy",
  },
  {
    thresholdYears: 1_228,
    headline: "ABOUT ROME’S TRADITIONAL FOUNDING TO THE WESTERN EMPIRE’S FALL",
    detail: "753 BCE–476 CE · approximately 1,228 elapsed years",
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
