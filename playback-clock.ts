const clampProgress = (progress: number): number =>
  Math.max(0, Math.min(1, progress));

function requireFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite.`);
  }
}

function requirePositive(value: number, name: string): void {
  requireFinite(value, name);
  if (value <= 0) {
    throw new RangeError(`${name} must be greater than zero.`);
  }
}

/**
 * Advances a normalized guided-tour progress value using wall-clock time.
 *
 * The remaining portion of the tour is animated over `durationMs`, matching
 * the resume semantics used by the mission player. Invalid clock inputs fail
 * loudly so a broken playback control cannot silently freeze the experience.
 */
export function advanceTourProgress(
  startProgress: number,
  elapsedMs: number,
  durationMs: number,
  playbackRate: number,
): number {
  requireFinite(startProgress, "startProgress");
  requireFinite(elapsedMs, "elapsedMs");
  requirePositive(durationMs, "durationMs");
  requirePositive(playbackRate, "playbackRate");

  if (elapsedMs < 0) {
    throw new RangeError("elapsedMs must not be negative.");
  }

  const start = clampProgress(startProgress);
  const elapsedFraction = (elapsedMs * playbackRate) / durationMs;
  return clampProgress(start + elapsedFraction * (1 - start));
}
