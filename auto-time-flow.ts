export interface AutoTimeStage {
  label: string;
  description: string;
  startSeconds: number;
  endSeconds: number;
}

export interface AutoTimeFlow {
  multiplier: number;
  remainingSeconds: number;
  estimatedWallSeconds: number;
}

const DEFAULT_STAGE_WALL_SECONDS = 7;

/**
 * Chooses a literal physical-time rate that gives each mission stage enough
 * wall-clock time to be read. The multiplier is held constant for the stage;
 * it never changes the mission's physical duration or route geometry.
 */
export function autoTimeFlowForStage(
  stage: AutoTimeStage,
  elapsedSeconds: number,
  targetWallSeconds = DEFAULT_STAGE_WALL_SECONDS,
): AutoTimeFlow {
  if (!Number.isFinite(stage.startSeconds) || !Number.isFinite(stage.endSeconds)) {
    throw new RangeError("Stage boundaries must be finite.");
  }
  if (stage.endSeconds < stage.startSeconds) {
    throw new RangeError("A stage cannot end before it starts.");
  }
  if (!Number.isFinite(targetWallSeconds) || targetWallSeconds <= 0) {
    throw new RangeError("targetWallSeconds must be positive and finite.");
  }

  const durationSeconds = stage.endSeconds - stage.startSeconds;
  const multiplier = Math.max(1, durationSeconds / targetWallSeconds);
  const remainingSeconds = Math.max(
    0,
    stage.endSeconds - Math.max(stage.startSeconds, elapsedSeconds),
  );

  return {
    multiplier,
    remainingSeconds,
    estimatedWallSeconds: remainingSeconds / multiplier,
  };
}

export function formatAutoPace(multiplier: number): string {
  const secondsPerDay = 86_400;
  const secondsPerYear = 365.25 * secondsPerDay;
  if (multiplier >= secondsPerYear) {
    const years = multiplier / secondsPerYear;
    const value = years.toLocaleString("en-AU", {
      maximumFractionDigits: years < 10 ? 1 : 0,
    });
    return `${value} ${years === 1 ? "YEAR" : "YEARS"} / REAL SECOND`;
  }
  if (multiplier >= secondsPerDay) {
    const days = multiplier / secondsPerDay;
    const value = days.toLocaleString("en-AU", {
      maximumFractionDigits: days < 10 ? 1 : 0,
    });
    return `${value} ${days === 1 ? "DAY" : "DAYS"} / REAL SECOND`;
  }
  if (multiplier >= 3_600) {
    return `${(multiplier / 3_600).toLocaleString("en-AU", {
      maximumFractionDigits: 1,
    })} HOURS / REAL SECOND`;
  }
  if (multiplier >= 60) {
    return `${(multiplier / 60).toLocaleString("en-AU", {
      maximumFractionDigits: 1,
    })} MINUTES / REAL SECOND`;
  }
  const value = multiplier.toLocaleString("en-AU", {
    maximumFractionDigits: 1,
  });
  return `${value} ${multiplier === 1 ? "SECOND" : "SECONDS"} / REAL SECOND`;
}
