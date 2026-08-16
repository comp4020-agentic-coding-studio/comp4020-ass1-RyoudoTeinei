import { describe, expect, it } from "vitest";
import { timeAnalogyAt } from "../time-analogies";

describe("human-scale time analogies", () => {
  it("selects the closest duration on a proportional scale", () => {
    expect(timeAnalogyAt(0.5).headline).toBe("LESS THAN ONE YEAR");
    expect(timeAnalogyAt(1).sourceId).toBe("earth-year");
    expect(timeAnalogyAt(5).sourceId).toBe("wwi");
    expect(timeAnalogyAt(6).sourceId).toBe("wwii");
    expect(timeAnalogyAt(10).sourceId).toBe("apollo-program");
    expect(timeAnalogyAt(30).sourceId).toBe("saturn-year");
    expect(timeAnalogyAt(48.6).sourceId).toBe("cold-war");
    expect(timeAnalogyAt(73.1).sourceId).toBe("life-expectancy");
    expect(timeAnalogyAt(100).headline).toBe("≈ ONE CENTURY");
    expect(timeAnalogyAt(248).sourceId).toBe("pluto-year");
    expect(timeAnalogyAt(500).headline).toBe("≈ HALF A MILLENNIUM");
    expect(timeAnalogyAt(1_000).headline).toBe("≈ ONE MILLENNIUM");
    expect(timeAnalogyAt(1_228).sourceId).toBe("rome");
    expect(timeAnalogyAt(2_500).headline).toBe("≈ TWENTY-FIVE CENTURIES");
    expect(timeAnalogyAt(7_365).sourceId).toBe("uruk");
    expect(timeAnalogyAt(11_700).sourceId).toBe("holocene");
    expect(timeAnalogyAt(74_479.7).sourceId).toBe("human-dispersal");
    expect(timeAnalogyAt(300_000).sourceId).toBe("homo-sapiens");
  });

  it("rejects invalid mission time", () => {
    expect(() => timeAnalogyAt(-1)).toThrow(RangeError);
    expect(() => timeAnalogyAt(Number.NaN)).toThrow(RangeError);
  });
});
