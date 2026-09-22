import { describe, expect, it } from "vitest";
import { fmt, getStrings } from "./i18n";

describe("i18n", () => {
  it("keeps es/en key parity", () => {
    expect(Object.keys(getStrings("en")).sort()).toEqual(Object.keys(getStrings("es")).sort());
  });

  it("falls back to Spanish for unknown locales", () => {
    expect(getStrings("fr" as never)["meta.total"]).toBe(getStrings("es")["meta.total"]);
  });

  it("interpolates {vars}", () => {
    expect(fmt("Delete {n} items?", { n: 3 })).toBe("Delete 3 items?");
    expect(fmt("Plain")).toBe("Plain");
  });
});
