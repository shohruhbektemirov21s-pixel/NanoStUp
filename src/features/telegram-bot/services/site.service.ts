import type { Prisma, Site } from "@prisma/client";

import type { WebsiteSchema } from "@/lib/ai/website-schema.zod";
import { slugifySiteFileName } from "@/shared/lib/slugify";

import { prisma } from "@/lib/prisma";

export async function createSiteForUser(userId: string, schema: WebsiteSchema): Promise<Site> {
  const baseSlug = slugifySiteFileName(schema.siteName);
  let slug = baseSlug;
  let suffix = 1;

  while (
    await prisma.site.findUnique({
      where: { userId_slug: { userId, slug } },
    })
  ) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return prisma.site.create({
    data: {
      userId,
      title: schema.siteName,
      slug,
      summary: schema.seo.description,
      schemaJson: schema as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function listSitesForUser(userId: string): Promise<Site[]> {
  return prisma.site.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
  });
}

export async function getSiteOwnedByTelegramUser(
  siteId: string,
  telegramUserId: number,
): Promise<Site | null> {
  return prisma.site.findFirst({
    where: {
      id: siteId,
      user: { telegramId: String(telegramUserId) },
    },
  });
}
