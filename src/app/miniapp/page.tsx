import Link from "next/link";

export default function MiniAppHomePage() {
  return (
    <>
      <main className="mx-auto max-w-lg space-y-6 px-4 py-6">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">AI Website Builder</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Xush kelibsiz</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Biznesingiz uchun zamonaviy sayt — veb-sayt bilan bir xil dizayn va jarayon, mobil uchun optimallashtirilgan.
          </p>
        </div>
        <div className="grid gap-3">
          <Link
            href="/miniapp/builder"
            className="rounded-2xl bg-primary px-5 py-4 text-center text-sm font-semibold text-primary-foreground shadow-md transition hover:opacity-95"
          >
            Sayt yaratish
          </Link>
          <Link
            href="/miniapp/projects"
            className="rounded-2xl border border-border bg-card px-5 py-4 text-center text-sm font-semibold shadow-sm transition hover:bg-muted/60"
          >
            Loyihalarim
          </Link>
          <Link
            href="/miniapp/pricing"
            className="rounded-2xl border border-border bg-card px-5 py-4 text-center text-sm font-semibold shadow-sm transition hover:bg-muted/60"
          >
            Tariflar va obuna
          </Link>
        </div>
      </main>
    </>
  );
}
