import { NextResponse } from "next/server";

import { builderRegisterBodySchema } from "@/lib/auth/builder-register.validation";

/**
 * Builder self-registration — hozircha serverda akkaunt yaratilmaydi.
 * Kelajakda shu endpoint Prisma / email tasdiq bilan kengaytiriladi.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false as const, error: "invalid_json" }, { status: 400 });
  }

  const parsed = builderRegisterBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false as const,
        error: "validation_failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
        formErrors: parsed.error.flatten().formErrors,
      },
      { status: 422 },
    );
  }

  const enabled = process.env.BUILDER_SELF_REGISTRATION_ENABLED === "true";
  if (!enabled) {
    return NextResponse.json({
      ok: true as const,
      provision: "none" as const,
    });
  }

  return NextResponse.json(
    {
      ok: false as const,
      error: "registration_backend_pending",
    },
    { status: 501 },
  );
}
