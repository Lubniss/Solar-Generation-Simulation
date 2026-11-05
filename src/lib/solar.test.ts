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
});
