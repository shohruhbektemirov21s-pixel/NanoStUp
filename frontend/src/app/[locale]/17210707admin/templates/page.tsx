'use client';

/**
 * Super-admin: Template registry (read-only).
 * Backend: GET /api/accounts/admin/templates/
 */

import { motion } from 'framer-motion';
import {
  AlertTriangle, Layers, Layout, Loader2, RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '@/shared/api/axios';

interface TemplateItem {
  id: string;
  niche: string;
  name: string;
  description: string;
  layout_variant: string;
  typography_variant: string;
  density_variant: string;
  section_count: number;
  section_types: string[];
}

interface TemplatesResp {
  stats: {
    total_templates?: number;
    niches?: string[];
    templates_per_niche?: Record<string, number>;
  };
  items: TemplateItem[];
}

const NICHE_LABELS: Record<string, string> = {
  restaurant: '🍽 Restoran',
  clinic: '🏥 Klinika',
  shop: '🛍 Do\'kon',
  portfolio: '🎨 Portfolio',
  hotel: '🏨 Mehmonxona',
  legal: '⚖ Yuridik',
  education: '📚 Ta\'lim',
  finance: '💰 Moliya',
  news: '📰 Yangiliklar',
  wedding: '💍 To\'y',
  default: '✨ Universal',
};

function nicheLabel(n: string) {
  return NICHE_LABELS[n] ?? `· ${n}`;
}

export default function AdminTemplatesPage() {
  const [data, setData] = useState<TemplatesResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nicheFilter, setNicheFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<TemplatesResp>('/accounts/admin/templates/');
      setData(res.data);
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { error?: string } } };
      setError(errObj?.response?.data?.error ?? 'Yuklab bo\'lmadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const niches = useMemo(() => Object.keys(data?.stats?.templates_per_niche ?? {}).sort(), [data]);
  const filteredItems = useMemo(() => {
    if (!data) return [];
    return nicheFilter
      ? data.items.filter((t) => t.niche === nicheFilter)
      : data.items;
  }, [data, nicheFilter]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/5 bg-zinc-900 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Layout className="w-5 h-5 text-blue-400" />
              Shablonlar (template registry)
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Jami: <span className="text-zinc-300 font-semibold">{data?.stats?.total_templates ?? 0}</span> shablon
              · {niches.length} niche
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
        </div>

        {/* Niche filter */}
        {niches.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setNicheFilter('')}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                !nicheFilter
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Barchasi ({data?.stats?.total_templates ?? 0})
            </button>
            {niches.map((n) => {
              const count = data?.stats?.templates_per_niche?.[n] ?? 0;
              return (
                <button
                  key={n}
                  onClick={() => setNicheFilter(n)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                    nicheFilter === n
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {nicheLabel(n)} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500 mx-auto" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center text-zinc-500 text-sm">
          Tanlangan filterga mos shablon yo&apos;q.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredItems.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="rounded-2xl border border-white/5 bg-zinc-900 p-4 hover:border-purple-500/30 transition"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{t.name}</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{nicheLabel(t.niche)}</p>
                </div>
                <span className="text-[10px] font-mono text-zinc-600 shrink-0 ml-2">{t.id}</span>
              </div>
              {t.description && (
                <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{t.description}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-3">
                <Tag color="bg-blue-500/10 text-blue-300 border-blue-500/20">layout: {t.layout_variant}</Tag>
                <Tag color="bg-purple-500/10 text-purple-300 border-purple-500/20">typo: {t.typography_variant}</Tag>
                <Tag color="bg-emerald-500/10 text-emerald-300 border-emerald-500/20">density: {t.density_variant}</Tag>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-zinc-500 mt-3 pt-3 border-t border-white/5">
                <Layers className="w-3 h-3" />
                <span>{t.section_count} bo&apos;lim:</span>
                <span className="text-zinc-400 truncate">
                  {t.section_types.slice(0, 4).join(', ')}
                  {t.section_types.length > 4 && '…'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${color}`}>
      {children}
    </span>
  );
}
