import { describe, it, expect } from "vitest";
import { analyze, interpolate, trapezoid, bisect, equivalents } from "./solar";

describe("solar numerics", () => {
  it("interpolates a gap linearly", () => {
    expect(interpolate([0, null, 10])).toEqual([0, 5, 10]);
  });
  it("trapezoid integrates a constant", () => {
    expect(trapezoid([2, 2, 2], 1)).toBe(4);
  });
  it("bisection finds root", () => {
    expect(bisect((t) => t, 0, 10, 5)).toBeCloseTo(5, 6);
  });
  it("winter yields less energy than summer", () => {
    expect(analyze("sunny", "winter").energy).toBeLessThan(analyze("sunny", "summer").energy);
  });
  it("overcast never crosses 50 kW", () => {
    expect(analyze("overcast", "equator").crossings).toHaveLength(0);
  });
  it("energy equivalents follow the conversion rules", () => {
    const eq = Object.fromEntries(equivalents(330.2).map((e) => [e.id, e.value]));
    expect(eq["bulbs"]).toBe("33,020 hours"); // 330.2 * 100
    expect(eq["homes"]).toBe("11 days"); // 330.2 / 30
    expect(eq["evs"]).toBe("1,156 miles"); // 330.2 * 3.5
    expect(eq["phones"]).toBe("22,013 charges"); // 330.2 / 0.015
  });
  it("equivalents scale with energy", () => {
    const small = equivalents(100);
    const large = equivalents(400);
    expect(small[0]!.value).toBe("10,000 hours");
    expect(large[0]!.value).toBe("40,000 hours");
  });
});
