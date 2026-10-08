import { describe, expect, it } from "vitest";
import { formatDateTime, formatMoney, formatQty } from "./format";

describe("formatDateTime (issue #56)", () => {
  // NB: Node test envs often ship minimal ICU data, so month names may
  // fall back — assert structure (year/day/time present), not exact words.
  it("renders day, year and time in both locales", () => {
    const es = formatDateTime("2026-10-07T14:32:00.000Z", "es");
    expect(es).toContain("2026");
    expect(es).toMatch(/14:32|15:32|16:32/);
    const en = formatDateTime("2026-10-07T14:32:00.000Z", "en");
    expect(en).toContain("2026");
    expect(en).toMatch(/14:32|15:32|16:32|2:32|3:32|4:32/);
  });

  it("falls back to the raw string for garbage input", () => {
    expect(formatDateTime("not-a-date", "es")).toBe("not-a-date");
    expect(formatDateTime("", "en")).toBe("");
  });
});

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
