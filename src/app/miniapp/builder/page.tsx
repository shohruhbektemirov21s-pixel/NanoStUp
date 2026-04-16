import { Suspense } from "react";

import { MiniBuilderClient } from "./mini-builder-client";

export default function MiniAppBuilderPage() {
  return (
    <Suspense fallback={<p className="p-4 text-sm text-muted-foreground">Yuklanmoqda…</p>}>
      <MiniBuilderClient />
    </Suspense>
  );
}
