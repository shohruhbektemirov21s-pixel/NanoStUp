import { z } from "zod";
import { designDNASchema } from "./website-schema.zod";

export const blueprintSchema = z.object({
  siteName: z.string().min(1).describe("Saytning qisqa nomi"),
  businessType: z.string().min(1).describe("Biznesning aniq turi (masalan, restoron, blog, portfolio)"),
  targetAudience: z.string().min(1).describe("Asosiy mijozlari yoki o'quvchilari"),
  brandTone: z.string().min(1).describe("Brendning asosiy uslubi (masalan, rasmiy, do'stona, qimmatbaho)"),
  designDNA: designDNASchema,
  pages: z.array(
    z.object({
      slug: z.string(),
      title: z.string(),
      requiredSections: z.array(z.string()).describe("Ushbu sahifada bo'lishi shart bo'lgan section turlari"),
    })
  ).min(1),
  featureSuggestions: z.array(z.string()).optional().describe("Biznes uchun qo'shimcha foydali funksiyalar"),
});

export type WebsiteBlueprint = z.infer<typeof blueprintSchema>;
