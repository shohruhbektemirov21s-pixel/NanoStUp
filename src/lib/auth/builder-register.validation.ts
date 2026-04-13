import { z } from "zod";

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function contactIsValid(contact: string): { ok: true } | { ok: false; reason: "empty" | "email" | "phone" } {
  const t = contact.trim();
  if (t.length < 3) {
    return { ok: false, reason: "empty" };
  }
  if (t.includes("@")) {
    return emailRx.test(t) ? { ok: true } : { ok: false, reason: "email" };
  }
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 9 && digits.length <= 15) {
    return { ok: true };
  }
  return { ok: false, reason: "phone" };
}

export const builderRegisterBodySchema = z
  .object({
    firstName: z.string().trim().min(1, { message: "required" }).max(80),
    lastName: z.string().trim().min(1, { message: "required" }).max(80),
    contact: z.string().trim().min(1, { message: "required" }).max(200),
    password: z.string().min(8, { message: "password_min" }).max(128),
    confirmPassword: z.string().min(1, { message: "required" }),
  })
  .superRefine((data, ctx) => {
    const c = contactIsValid(data.contact);
    if (!c.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: c.reason === "empty" ? "contact_required" : c.reason === "email" ? "contact_email" : "contact_phone",
        path: ["contact"],
      });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "password_mismatch",
        path: ["confirmPassword"],
      });
    }
  });

export type BuilderRegisterBody = z.infer<typeof builderRegisterBodySchema>;
