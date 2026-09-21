import { authErrorMessage } from "../authErrors";

describe("authErrorMessage", () => {
  test("does not reveal whether an email has an account", () => {
    const wrongPassword = authErrorMessage({ code: "auth/invalid-credential" });
    expect(wrongPassword).toBe("Wrong email or password.");
    expect(authErrorMessage({ code: "auth/user-not-found" })).toBe(wrongPassword);
  });

  test("explains the common signup problems", () => {
    expect(authErrorMessage({ code: "auth/email-already-in-use" })).toMatch(/already exists/);
    expect(authErrorMessage({ code: "auth/weak-password" })).toMatch(/6 characters/);
  });

  test("tells the user when it's their connection", () => {
    expect(authErrorMessage({ code: "auth/network-request-failed" })).toMatch(/connection/);
  });

  test("falls back to something generic for anything unexpected", () => {
    expect(authErrorMessage(new Error("boom"))).toMatch(/went wrong/);
    expect(authErrorMessage(undefined)).toMatch(/went wrong/);
  });
});
