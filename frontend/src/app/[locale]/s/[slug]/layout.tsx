// Publik sayt ko'rinishi uchun — parent layout'ning qora fonini oq bilan almashtiramiz
export default function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen w-full bg-white text-zinc-900">{children}</div>;
}
