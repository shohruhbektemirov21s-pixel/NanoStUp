import "server-only";

import type { Site } from "@prisma/client";
import { InputFile } from "grammy";

import { websiteSchema } from "@/lib/ai/website-schema.zod";
import { buildWebsiteZipUint8Array } from "@/shared/lib/build-website-zip";
import { slugifySiteFileName } from "@/shared/lib/slugify";

import type { BotContext } from "../context";
import { buildSiteActionsKeyboard } from "../lib/site-inline-keyboards";

/**
 * Tayyor sayt uchun tugmalar + ZIP faylini Telegram orqali yuborish.
 */
export async function sendSiteCreatedBundle(
  ctx: BotContext,
  site: Site,
  meta: { attemptsUsed: number },
): Promise<void> {
  const parsed = websiteSchema.safeParse(site.schemaJson);
  if (!parsed.success) {
    await ctx.reply("Sxema saqlangan, lekin tekshiruvdan o‘tmadi. Administratorga murojaat qiling.");
    return;
  }

  const lines = [
    "✅ Sayt sxemasi tayyor va saqlandi.",
    `📛 Nomi: ${site.title}`,
    `🔗 Slug: ${site.slug}`,
    `🆔 ID: ${site.id}`,
    `🔁 AI urinishlari: ${meta.attemptsUsed}`,
    "",
    "Quyidagi tugmalar: ko‘rish, ZIP, tahrir (reja).",
  ];

  const keyboard = buildSiteActionsKeyboard(site.id);
  await ctx.reply(lines.join("\n"), { reply_markup: keyboard });

  try {
    const zipBytes = await buildWebsiteZipUint8Array(parsed.data);
    const fileName = `${slugifySiteFileName(site.title)}.zip`;
    await ctx.replyWithDocument(new InputFile(Buffer.from(zipBytes), fileName), {
      caption: "📦 Starter paket: HTML/CSS, package.json, README, deployment, partials.",
    });
  } catch {
    await ctx.reply("ZIP tayyorlashda xato. Keyinroq «📦 ZIP» tugmasi orqali qayta urinib ko‘ring.");
  }
}
