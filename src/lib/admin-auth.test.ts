import { afterEach, describe, expect, it } from "vitest";
import { token, validPassword, validToken } from "./admin-auth";
describe("admin-login", () => {
  afterEach(() => delete process.env.ADMIN_SECRET);
  it("afviser forkert og accepterer korrekt hemmelighed/token", () => {
    process.env.ADMIN_SECRET = "en-lang-test-hemmelighed";
    expect(validPassword("forkert")).toBe(false);
    expect(validPassword("en-lang-test-hemmelighed")).toBe(true);
    expect(validToken(token())).toBe(true);
  });
});
