import { describe, expect, it } from "vitest";
import { formatPhone } from "./phone";

describe("formatPhone", () => {
  it("formats Spanish mobiles and landlines", () => {
    expect(formatPhone("600123456")).toBe("600 12 34 56");
    expect(formatPhone("910123456")).toBe("910 12 34 56");
    expect(formatPhone("+34600123456")).toBe("600 12 34 56");
  });

  it("leaves anything else untouched", () => {
    expect(formatPhone("1234")).toBe("1234");
    expect(formatPhone("+1 555 123 4567")).toBe("+1 555 123 4567");
  });
});
