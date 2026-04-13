import type { AppLocale } from "@/i18n/routing";
import { isAppLocale, routing } from "@/i18n/routing";
import en from "@messages/en.json";
import ru from "@messages/ru.json";
import uz from "@messages/uz.json";

const apiByLocale = {
  uz: uz.ApiGenerate,
  en: en.ApiGenerate,
  ru: ru.ApiGenerate,
} as const;

export type ApiGenerateMessages = (typeof uz)["ApiGenerate"];

export function resolveContentLocale(value: unknown): AppLocale {
  if (typeof value === "string" && isAppLocale(value)) {
    return value;
  }
  return routing.defaultLocale;
}

export function getApiGenerateMessages(locale: AppLocale): ApiGenerateMessages {
  return apiByLocale[locale];
}
