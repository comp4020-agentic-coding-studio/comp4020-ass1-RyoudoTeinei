import { describe, expect, it } from "vitest";
import { autoTimeFlowForStage, formatAutoPace } from "../auto-time-flow";

describe("automatic physical time flow", () => {
  it("keeps short stages at literal real time", () => {
    const pace = autoTimeFlowForStage({
      label: "ignition",
      description: "Engine ignition",
      startSeconds: 0,
      endSeconds: 4,
    }, 0);
    expect(pace.multiplier).toBe(1);
    expect(pace.remainingSeconds).toBe(4);
  });

  it("gives a long stage a stable seven-second screen duration", () => {
    const stage = {
      label: "coast",
      description: "Interstellar coast",
      startSeconds: 100,
      endSeconds: 7_100,
    };
    const start = autoTimeFlowForStage(stage, 100);
    const middle = autoTimeFlowForStage(stage, 3_600);
    expect(start.multiplier).toBe(1_000);
    expect(middle.multiplier).toBe(start.multiplier);
    expect(start.estimatedWallSeconds).toBe(7);
    expect(middle.estimatedWallSeconds).toBe(3.5);
  });

  it("reports readable physical pace labels", () => {
    expect(formatAutoPace(1)).toBe("1 SECOND / REAL SECOND");
    expect(formatAutoPace(86_400)).toBe("1 DAY / REAL SECOND");
    expect(formatAutoPace(365.25 * 86_400 * 250)).toBe(
      "250 YEARS / REAL SECOND",
    );
  });
});
