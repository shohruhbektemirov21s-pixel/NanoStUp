import type { StorageAdapter } from "grammy";

import { prisma } from "@/lib/prisma";

import type { TelegramSessionRecord } from "../context";

/**
 * Serverless / bir nechta instans uchun sessionni PostgreSQLda saqlash.
 */
export function createPrismaSessionStorage(): StorageAdapter<TelegramSessionRecord> {
  return {
    async read(key: string): Promise<TelegramSessionRecord | undefined> {
      const row = await prisma.telegramSession.findUnique({ where: { key } });
      if (!row?.value) {
        return undefined;
      }
      try {
        return JSON.parse(row.value) as TelegramSessionRecord;
      } catch {
        return undefined;
      }
    },
    async write(key: string, value: TelegramSessionRecord): Promise<void> {
      await prisma.telegramSession.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      });
    },
    async delete(key: string): Promise<void> {
      await prisma.telegramSession.deleteMany({ where: { key } });
    },
  };
}
