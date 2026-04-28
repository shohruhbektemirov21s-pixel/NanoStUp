import { redirect } from 'next/navigation';

// Eski URL → yangi `/site-admin/<slug>` ga yo'naltiramiz (backwards-compat).
// AI yoki foydalanuvchi tomonidan saqlangan eski havolalar ishlashda davom etadi.
export default async function LegacyAdminRedirect(
  { params }: { params: Promise<{ slug: string; locale: string }> },
) {
  const { slug, locale } = await params;
  redirect(`/${locale}/site-admin/${slug}`);
}
