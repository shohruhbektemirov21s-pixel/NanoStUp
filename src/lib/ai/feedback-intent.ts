/**
 * Foydalanuvchi tabiiy tilidagi feedback → qayta generatsiya qamrovi va yordamchi signallar.
 */

export type WebsiteEditScopeKind =
  | "full"
  | "theme"
  | "seo"
  | "page"
  | "section"
  | "navigation"
  | "add_page"
  | "remove_page"
  | "tone"
  | "unknown";

export type WebsiteEditScope = {
  kind: WebsiteEditScopeKind;
  pageSlug?: string;
  sectionId?: string;
};

export type FeedbackIntent = {
  primaryScope: WebsiteEditScopeKind;
  pageSlug?: string;
  sectionId?: string;
  sectionTypeHint?: string;
  wantsShorterText: boolean;
  wantsModernTone: boolean;
  wantsPremiumVoice: boolean;
  removePageSlugs: string[];
  addPageKind?: string;
  raw: string;
};

const SLUGS = /\b(home|about|services|gallery|pricing|testimonials|faq|contact|blog|portfolio)\b/gi;

const THEME_RE = /\b(colors?|colou?rs?|palette|theme|rang|dizayn|design)\b/i;
const PREMIUM_RE = /\b(premium|luxury|vip|elit|zamonaviy\s+ko‘rinish)\b/i;
const MODERN_TONE_RE = /\b(modern|zamonaviy|contemporary|minimal|fresh)\b/i;
const SHORTER_RE = /\b(shorter|less text|qisqa|короче|сократи|qisqartir)\b/i;
const SEO_RE = /\b(seo|meta title|meta description|google|search)\b/i;
const NAV_RE = /\b(nav|navbar|menu|footer link|havola\s*menyu)\b/i;
const REWRITE_RE = /\b(rewrite|qayta yoz|перепиши|yangilab ber|update text)\b/i;
const FIX_RE = /\b(fix|tuzat|исправь|bug|xato)\b/i;
const TONE_RE = /\b(tone|voice|uslub|стиль речи)\b/i;

const REMOVE_PAGE_RE =
  /\b(remove|delete|o'chir|o‘chir|olib\s*tashla|убери|удали)\s+(?:the\s+)?(home|about|services|gallery|pricing|testimonials|faq|contact|blog|portfolio)\s*(?:page|sahifa|страниц)?\b/i;

const ADD_PAGE_RE =
  /\b(add|yangi|qo.?sh|добавь|создай)\s+(?:a\s+)?(pricing|testimonials|faq|gallery|blog|contact|about|services)\s*(?:page|sahifa)?\b/i;

const SECTION_ID_RE = /\bsection\s*[:#]?\s*([a-z0-9_-]{2,64})\b/i;

const PAGE_THEN_TYPE_RE =
  /\b(home|about|services|gallery|pricing|testimonials|faq|contact)\s+(?:page\s+)?(hero|features|footer|contact|pricing|faq|gallery|cta)\b/i;

const TYPE_ON_PAGE_RE =
  /\b(hero|features|footer|contact|pricing|faq|gallery|cta)\s+(?:on|in|да|на)\s+(?:the\s+)?(home|about|services|gallery|pricing|testimonials|faq|contact)\b/i;

function uniqueSlugsInText(t: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(SLUGS.source, "gi");
  while ((m = re.exec(t)) !== null) {
    found.add(m[1].toLowerCase());
  }
  return Array.from(found);
}

export function parseFeedbackIntent(feedback: string): FeedbackIntent {
  const raw = feedback.trim();
  const t = raw;
  const lower = t.toLowerCase();

  const slugList = uniqueSlugsInText(t);

  const wantsShorterText = SHORTER_RE.test(t);
  const wantsModernTone = MODERN_TONE_RE.test(t) && !TONE_RE.test(t) && !THEME_RE.test(t);
  const wantsPremiumVoice = PREMIUM_RE.test(t);
  const removePageSlugs: string[] = [];
  let addPageKind: string | undefined;
  let pageSlug: string | undefined;
  let sectionId: string | undefined;
  let sectionTypeHint: string | undefined;

  const rm = REMOVE_PAGE_RE.exec(t);
  if (rm?.[2]) {
    removePageSlugs.push(rm[2].toLowerCase());
  }

  const am = ADD_PAGE_RE.exec(t);
  if (am?.[2]) {
    addPageKind = am[2].toLowerCase();
  }

  const sid = SECTION_ID_RE.exec(t);
  if (sid?.[1]) {
    sectionId = sid[1];
  }

  const ptt = PAGE_THEN_TYPE_RE.exec(lower);
  if (ptt) {
    pageSlug = ptt[1].toLowerCase();
    sectionTypeHint = ptt[2].toLowerCase();
  }
  const top = TYPE_ON_PAGE_RE.exec(lower);
  if (top) {
    sectionTypeHint = top[1].toLowerCase();
    pageSlug = top[2].toLowerCase();
  }

  if (!pageSlug && !sectionId) {
    if (/\b(page|sahifa|страниц)\b/i.test(t) && slugList.length === 1) {
      [pageSlug] = slugList;
    }
    if (FIX_RE.test(t) && slugList.length === 1) {
      [pageSlug] = slugList;
    }
  }

  if (!sectionTypeHint && REWRITE_RE.test(t)) {
    const hm = /\b(hero|features|footer|pricing|faq|gallery|cta)\b/i.exec(t);
    if (hm?.[1]) {
      sectionTypeHint = hm[1].toLowerCase();
    }
  }

  let primaryScope: WebsiteEditScopeKind = "unknown";

  if (removePageSlugs.length > 0) {
    primaryScope = "remove_page";
  } else if (addPageKind) {
    primaryScope = "add_page";
  } else if (SEO_RE.test(t) && !THEME_RE.test(t)) {
    primaryScope = "seo";
  } else if (NAV_RE.test(t)) {
    primaryScope = "navigation";
  } else if (THEME_RE.test(t) || (wantsModernTone && /\b(color|palette)\b/i.test(t))) {
    primaryScope = "theme";
  } else if (TONE_RE.test(t) || wantsModernTone || wantsPremiumVoice) {
    primaryScope = "tone";
  } else if (sectionId || sectionTypeHint) {
    primaryScope = "section";
    if (!pageSlug && (sectionTypeHint === "hero" || sectionTypeHint === "features")) {
      pageSlug = "home";
    }
  } else if (pageSlug && (REWRITE_RE.test(t) || FIX_RE.test(t) || wantsShorterText)) {
    primaryScope = "page";
  } else if (t.length > 420 || /\b(entire|whole|hamma|весь\s*сайт|butun sayt)\b/i.test(t)) {
    primaryScope = "full";
  } else if (slugList.length > 1 && REWRITE_RE.test(t)) {
    primaryScope = "full";
  }

  return {
    primaryScope,
    pageSlug,
    sectionId,
    sectionTypeHint,
    wantsShorterText,
    wantsModernTone: wantsModernTone || wantsPremiumVoice,
    wantsPremiumVoice,
    removePageSlugs,
    addPageKind,
    raw,
  };
}

export function formatFeedbackIntentForPrompt(intent: FeedbackIntent): string {
  return JSON.stringify(intent);
}

export function inferWebsiteEditScope(userFeedback: string): WebsiteEditScope {
  const i = parseFeedbackIntent(userFeedback);
  const hint = i.sectionTypeHint ? `hint:${i.sectionTypeHint}` : undefined;
  return {
    kind: i.primaryScope === "tone" ? "full" : i.primaryScope,
    pageSlug: i.pageSlug,
    sectionId: i.sectionId ?? hint,
  };
}

export function formatEditScopeForPrompt(scope: WebsiteEditScope): string {
  return JSON.stringify(scope);
}
