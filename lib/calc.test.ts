import { describe, expect, it } from "vitest";
import { breakdownTotal } from "./calc";

describe("breakdownTotal", () => {
  it("sums materials + labor + other costs", () => {
    expect(
      breakdownTotal({
        materials: [
          { quantity: 1, price: 289 },
          { quantity: 2, price: 10.5 },
        ],
        labor: { hours: 4, ratePerHour: 35 },
        otherCost: 21,
      }),
    ).toBe(289 + 21 + 140 + 21);
  });

  it("handles an empty breakdown", () => {
    expect(
      breakdownTotal({ materials: [], labor: { hours: 0, ratePerHour: 0 }, otherCost: 0 }),
    ).toBe(0);
  });
});
