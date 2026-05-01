'use client';

/**
 * VersionsPanel — sayt egasi uchun versiyalar tarixi va rollback UI.
 *
 * Backend endpointlari:
 *   GET  /api/projects/owner/by_slug/<slug>/versions/
 *   GET  /api/projects/owner/by_slug/<slug>/versions/<id>/
 *   POST /api/projects/owner/by_slug/<slug>/versions/<id>/restore/
 *
 * Funksiyalar:
 *   - Oxirgi 50 versiyani ko'rsatish (yangidan eskigacha)
 *   - Versiya schema'sini preview qilish (modal)
 *   - "Tiklash" tugmasi — joriy holat avtomatik snapshot bo'ladi, eski versiya
 *     joriy bo'ladi
 *   - Restore bo'lgach, parent component (page.tsx) saytni qayta yuklaydi
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  History, RotateCcw, Eye, Loader2, AlertTriangle, CheckCircle2, X,
  Sparkles, Wrench, Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '@/shared/api/axios';

interface VersionRow {
  id: string;
  version_number: number;
  intent: string;
  prompt_preview: string;
  created_at: string;
}

interface ListResp {
  success: boolean;
  versions?: VersionRow[];
  current_version?: number;
  error?: string;
}

interface DetailResp {
  success: boolean;
  version?: {
    id: string;
    version_number: number;
    intent: string;
    prompt: string;
    schema_data: Record<string, unknown>;
    created_at: string;
  };
  error?: string;
}

interface RestoreResp {
  success: boolean;
  message?: string;
  project?: { schema_data: Record<string, unknown>; title: string };
  error?: string;
}

// ── Intent → ikonka + rang ────────────────────────────────────────
const INTENT_META: Record<string, { label: string; icon: React.FC<{ className?: string }>; color: string }> = {
  GENERATE:                  { label: 'AI yaratdi',      icon: Sparkles, color: 'text-purple-300 bg-purple-500/15 border-purple-500/30' },
  REVISE:                    { label: 'AI tahrirladi',   icon: Wand2,    color: 'text-blue-300 bg-blue-500/15 border-blue-500/30' },
  manual_edit:               { label: 'Qo\'lda tahrir',  icon: Wrench,   color: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30' },
  restore:                   { label: 'Tiklandi',        icon: RotateCcw,color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  auto_snapshot_before_restore: { label: 'Auto-snapshot', icon: History, color: 'text-zinc-400 bg-zinc-700/30 border-zinc-600/30' },
};

function intentMeta(intent: string) {
  return INTENT_META[intent] ?? { label: intent || 'O\'zgartirildi', icon: History, color: 'text-zinc-400 bg-zinc-800 border-zinc-700' };
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('uz-UZ', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ── Main component ────────────────────────────────────────────────

export function VersionsPanel({
  slug,
  onRestored,
}: {
  slug: string;
  /** Restore muvaffaqiyatli bo'lgach chaqiriladi — parent saytni qayta yuklashi uchun. */
  onRestored?: (newSchema: Record<string, unknown>) => void;
}) {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(0);

  const [previewVersion, setPreviewVersion] = useState<DetailResp['version'] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Versiyalar ro'yxatini olish
  const fetchList = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setListError(null);
    try {
      const res = await api.get<ListResp>(
        `/projects/owner/by_slug/${encodeURIComponent(slug)}/versions/`,
      );
      if (res.data.success && Array.isArray(res.data.versions)) {
        setVersions(res.data.versions);
        setCurrentVersion(res.data.current_version ?? 0);
      } else {
        setListError(res.data.error ?? 'Versiyalar yuklanmadi.');
      }
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { error?: string } } };
      setListError(errObj?.response?.data?.error ?? 'Server bilan bog\'lanib bo\'lmadi.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openPreview = useCallback(
    async (id: string) => {
      setPreviewLoading(true);
      try {
        const res = await api.get<DetailResp>(
          `/projects/owner/by_slug/${encodeURIComponent(slug)}/versions/${id}/`,
        );
        if (res.data.success && res.data.version) {
          setPreviewVersion(res.data.version);
        }
      } catch {
        // ignore — modal ochilmaydi
      } finally {
        setPreviewLoading(false);
      }
    },
    [slug],
  );

  const doRestore = useCallback(
    async (id: string) => {
      setRestoreBusy(true);
      setRestoreError(null);
      setRestoreSuccess(null);
      try {
        const res = await api.post<RestoreResp>(
          `/projects/owner/by_slug/${encodeURIComponent(slug)}/versions/${id}/restore/`,
        );
        if (res.data.success) {
          setRestoreSuccess(res.data.message ?? '✅ Tiklandi.');
          setRestoreId(null);
          setPreviewVersion(null);
          // Parent'ga xabar — sayt schema'sini yangilash uchun
          if (res.data.project?.schema_data && onRestored) {
            onRestored(res.data.project.schema_data);
          }
          // Versiyalar ro'yxatini ham yangilaymiz (ikkita yangi yozuv qo'shildi)
          await fetchList();
        } else {
          setRestoreError(res.data.error ?? 'Tiklash imkonsiz.');
        }
      } catch (e: unknown) {
        const errObj = e as { response?: { data?: { error?: string } } };
        setRestoreError(errObj?.response?.data?.error ?? 'Server xatosi.');
      } finally {
        setRestoreBusy(false);
      }
    },
    [slug, onRestored, fetchList],
  );

  // Auto-snapshot versiyalarni filtrlash uchun toggle
  const [showAutoSnaps, setShowAutoSnaps] = useState(false);
  const visibleVersions = useMemo(
    () => showAutoSnaps
      ? versions
      : versions.filter((v) => v.intent !== 'auto_snapshot_before_restore'),
    [versions, showAutoSnaps],
  );

  return (
    <div className="space-y-4">
      {/* Sarlavha + reload */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              Versiya tarixi
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Saytning oldingi holatlariga qaytishingiz mumkin. Tiklash xavfsiz —
              joriy holat avtomatik saqlanadi.
            </p>
            {currentVersion > 0 && (
              <p className="mt-1 text-[11px] text-zinc-600">
                Jami versiyalar: <span className="text-zinc-400 font-semibold">{currentVersion}</span>
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-[11px] text-zinc-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAutoSnaps}
              onChange={(e) => setShowAutoSnaps(e.target.checked)}
              className="accent-purple-500"
            />
            Auto-snapshotlarni ko&apos;rsatish
          </label>
        </div>

        {/* Status xabarlari */}
        <AnimatePresence>
          {restoreSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> {restoreSuccess}
            </motion.div>
          )}
          {restoreError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" /> {restoreError}
            </motion.div>
          )}
          {listError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" /> {listError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Ro'yxat */}
      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500 mx-auto" />
          <p className="text-xs text-zinc-500 mt-3">Versiyalar yuklanmoqda…</p>
        </div>
      ) : visibleVersions.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center">
          <History className="w-8 h-8 text-zinc-700 mx-auto" />
          <p className="text-sm text-zinc-500 mt-3">Hozircha versiyalar yo&apos;q.</p>
          <p className="text-[11px] text-zinc-600 mt-1">
            Saytda har bir o&apos;zgartirish avtomatik saqlanadi va shu yerda paydo bo&apos;ladi.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 overflow-hidden">
          <ul className="divide-y divide-white/5">
            {visibleVersions.map((v, idx) => {
              const meta = intentMeta(v.intent);
              const Icon = meta.icon;
              const isCurrent = v.version_number === currentVersion;
              return (
                <motion.li
                  key={v.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="px-4 py-3 hover:bg-white/[0.02] transition flex items-center gap-3"
                >
                  <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${meta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">
                        v{v.version_number}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${meta.color}`}>
                        {meta.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          JORIY
                        </span>
                      )}
                      <span className="text-[10px] text-zinc-600 ml-auto">
                        {formatDate(v.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-500 truncate">
                      {v.prompt_preview || <span className="italic text-zinc-600">(tavsifsiz)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openPreview(v.id)}
                      disabled={previewLoading}
                      className="text-[11px] px-2 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50 transition flex items-center gap-1"
                      title="Versiya schema'sini ko'rish"
                    >
                      <Eye className="w-3 h-3" /> Ko&apos;rish
                    </button>
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => setRestoreId(v.id)}
                        disabled={restoreBusy}
                        className="text-[11px] px-2 py-1.5 rounded-md bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-200 disabled:opacity-50 transition flex items-center gap-1"
                        title="Bu versiyaga tiklash"
                      >
                        <RotateCcw className="w-3 h-3" /> Tiklash
                      </button>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Preview modal */}
      <AnimatePresence>
        {previewVersion && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPreviewVersion(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    v{previewVersion.version_number} — {intentMeta(previewVersion.intent).label}
                  </h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {formatDate(previewVersion.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewVersion(null)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-5 py-3 overflow-auto flex-1">
                {previewVersion.prompt && (
                  <div className="mb-3 p-3 rounded-lg bg-zinc-950 border border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Tavsif</p>
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap">{previewVersion.prompt}</p>
                  </div>
                )}
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Schema (JSON)</p>
                <pre className="text-[10px] text-zinc-400 bg-zinc-950 border border-white/5 rounded-lg p-3 overflow-auto max-h-[50vh]">
                  {JSON.stringify(previewVersion.schema_data, null, 2)}
                </pre>
              </div>
              <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between gap-3">
                <p className="text-[11px] text-zinc-500">
                  Tiklash xavfsiz — joriy holat saqlanadi.
                </p>
                <button
                  type="button"
                  onClick={() => setRestoreId(previewVersion.id)}
                  disabled={previewVersion.version_number === currentVersion || restoreBusy}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-purple-500/30"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Bu versiyaga tiklash
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restore tasdiqlash dialogi */}
      <AnimatePresence>
        {restoreId && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !restoreBusy && setRestoreId(null)}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Tiklashni tasdiqlang</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Sayt tanlangan versiyaga qaytadi. Joriy holat avtomatik snapshot
                    sifatida saqlanadi — kerak bo&apos;lsa qaytadan tiklashingiz mumkin.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setRestoreId(null)}
                  disabled={restoreBusy}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50"
                >
                  Bekor
                </button>
                <button
                  type="button"
                  onClick={() => doRestore(restoreId)}
                  disabled={restoreBusy}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  {restoreBusy ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Tiklanmoqda…</>
                  ) : (
                    <><RotateCcw className="w-3.5 h-3.5" /> Ha, tikla</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
