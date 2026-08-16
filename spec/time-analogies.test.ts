import { describe, expect, it } from "vitest";
import { timeAnalogyAt } from "../time-analogies";

describe("human-scale time analogies", () => {
  it("changes only after each sourced duration has actually elapsed", () => {
    expect(timeAnalogyAt(5.99).sourceId).toBeUndefined();
    expect(timeAnalogyAt(6).sourceId).toBe("wwii");
    expect(timeAnalogyAt(73).sourceId).toBe("wwii");
    expect(timeAnalogyAt(73.1).sourceId).toBe("life-expectancy");
    expect(timeAnalogyAt(1_227.9).sourceId).toBe("life-expectancy");
    expect(timeAnalogyAt(1_228).sourceId).toBe("rome");
  });

  it("rejects invalid mission time", () => {
    expect(() => timeAnalogyAt(-1)).toThrow(RangeError);
    expect(() => timeAnalogyAt(Number.NaN)).toThrow(RangeError);
  });
});
