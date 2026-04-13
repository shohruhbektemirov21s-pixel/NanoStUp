import type { User } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import type { BotContext } from "../context";

async function resolveAuthSourceForTelegramUserId(userId: string): Promise<"TELEGRAM" | "BOTH"> {
  const link = await prisma.webUser.findFirst({
    where: { linkedTelegramUserId: userId },
    select: { id: true },
  });
  return link ? "BOTH" : "TELEGRAM";
}

export type UpsertTelegramProfileInput = {
  telegramNumericId: number;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  photoUrl?: string | null;
  touchMiniApp?: boolean;
};

export async function upsertUserFromTelegramProfile(input: UpsertTelegramProfileInput): Promise<User> {
  const telegramId = String(input.telegramNumericId);
  const user = await prisma.user.upsert({
    where: { telegramId },
    create: {
      telegramId,
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      languageCode: input.languageCode ?? null,
      telegramPhotoUrl: input.photoUrl ?? null,
      authSource: "TELEGRAM",
      miniAppLastOpenedAt: input.touchMiniApp ? new Date() : null,
    },
    update: {
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      languageCode: input.languageCode ?? null,
      telegramPhotoUrl: input.photoUrl ?? null,
      ...(input.touchMiniApp ? { miniAppLastOpenedAt: new Date() } : {}),
    },
  });

  const nextSource = await resolveAuthSourceForTelegramUserId(user.id);
  if (nextSource === "BOTH" && user.authSource !== "BOTH") {
    return prisma.user.update({
      where: { id: user.id },
      data: { authSource: "BOTH" },
    });
  }
  return user;
}

export async function upsertUserFromTelegramContext(ctx: BotContext): Promise<User> {
  const from = ctx.from;
  if (!from) {
    throw new Error("Telegram foydalanuvchi ma’lumoti topilmadi.");
  }
  return upsertUserFromTelegramProfile({
    telegramNumericId: from.id,
    username: from.username ?? null,
    firstName: from.first_name ?? null,
    lastName: from.last_name ?? null,
    languageCode: from.language_code ?? null,
    touchMiniApp: false,
  });
}

export async function findUserByTelegramId(telegramUserId: number): Promise<User | null> {
  return prisma.user.findUnique({
    where: { telegramId: String(telegramUserId) },
  });
}

export async function incrementUserMiniappSessionVersion(userId: string): Promise<number> {
  const row = await prisma.user.update({
    where: { id: userId },
    data: { miniappSessionVersion: { increment: 1 } },
    select: { miniappSessionVersion: true },
  });
  return row.miniappSessionVersion;
}
