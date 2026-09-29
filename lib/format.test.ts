import { describe, expect, it } from "vitest";
import { formatMoney, formatQty } from "./format";

describe("formatMoney", () => {
  it("groups thousands in Spanish style", () => {
    expect(formatMoney(1234.5, "es")).toBe("1.234,50€");
    expect(formatMoney(450, "es")).toBe("450,00€");
    expect(formatMoney(0, "es")).toBe("0,00€");
  });

  it("groups thousands in English style", () => {
    expect(formatMoney(1234.5, "en")).toBe("1,234.50€");
    expect(formatMoney(450, "en")).toBe("450.00€");
  });

  it("rounds to 2 decimals", () => {
    expect(formatMoney(10.556, "es")).toBe("10,56€");
  });
});

describe("formatQty", () => {
  it("groups thousands without forcing decimals", () => {
    expect(formatQty(1500, "es")).toBe("1.500");
    expect(formatQty(1, "es")).toBe("1");
    expect(formatQty(1500, "en")).toBe("1,500");
  });

  it("keeps entered decimals untouched", () => {
    expect(formatQty(1.5, "es")).toBe("1,5");
    expect(formatQty(2.25, "en")).toBe("2.25");
  });
});
