import { describe, expect, it } from "vitest";
import { sessionEmail } from "./supabase";

describe("sessionEmail (issue #53)", () => {
  it("returns the trimmed email from a signed-in session", () => {
    expect(sessionEmail({ user: { email: "  dcreformasbcn@hotmail.com " } })).toBe(
      "dcreformasbcn@hotmail.com",
    );
  });

  it("returns null when signed out or the email is blank", () => {
    expect(sessionEmail(null)).toBeNull();
    expect(sessionEmail(undefined)).toBeNull();
    expect(sessionEmail({})).toBeNull();
    expect(sessionEmail({ user: null })).toBeNull();
    expect(sessionEmail({ user: { email: null } })).toBeNull();
    expect(sessionEmail({ user: { email: "   " } })).toBeNull();
  });
});
