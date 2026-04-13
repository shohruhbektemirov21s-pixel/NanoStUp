import { describe, expect, it } from "vitest";

import { builderRegisterBodySchema } from "../builder-register.validation";

describe("builderRegisterBodySchema", () => {
  it("accepts valid payload with email contact", () => {
    const r = builderRegisterBodySchema.safeParse({
      firstName: "Ali",
      lastName: "Valiyev",
      contact: "ali@example.com",
      password: "password1",
      confirmPassword: "password1",
    });
    expect(r.success).toBe(true);
  });

  it("accepts phone contact without @", () => {
    const r = builderRegisterBodySchema.safeParse({
      firstName: "Ali",
      lastName: "Valiyev",
      contact: "+998 90 111 22 33",
      password: "password1",
      confirmPassword: "password1",
    });
    expect(r.success).toBe(true);
  });

  it("rejects short password", () => {
    const r = builderRegisterBodySchema.safeParse({
      firstName: "Ali",
      lastName: "Valiyev",
      contact: "a@b.co",
      password: "short",
      confirmPassword: "short",
    });
    expect(r.success).toBe(false);
  });

  it("rejects password mismatch", () => {
    const r = builderRegisterBodySchema.safeParse({
      firstName: "Ali",
      lastName: "Valiyev",
      contact: "a@b.co",
      password: "password1",
      confirmPassword: "password2",
    });
    expect(r.success).toBe(false);
  });

  it("rejects bad email when @ present", () => {
    const r = builderRegisterBodySchema.safeParse({
      firstName: "Ali",
      lastName: "Valiyev",
      contact: "not-an-email",
      password: "password1",
      confirmPassword: "password1",
    });
    expect(r.success).toBe(false);
  });
});
