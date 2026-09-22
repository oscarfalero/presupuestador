import { describe, expect, it } from "vitest";
import { withProtocol } from "./urls";

describe("withProtocol", () => {
  it("keeps explicit protocols", () => {
    expect(withProtocol("https://example.com/x")).toBe("https://example.com/x");
    expect(withProtocol("http://example.com")).toBe("http://example.com");
  });

  it("assumes https and trims", () => {
    expect(withProtocol("example.com/price")).toBe("https://example.com/price");
    expect(withProtocol("  supplier.es  ")).toBe("https://supplier.es");
  });
});
