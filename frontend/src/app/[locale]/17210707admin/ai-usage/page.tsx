'use client';

/**
 * Super-admin: AI sarflanishi (nano coin balansi + 30-kunlik aktivlik).
 * Backend: GET /api/accounts/admin/ai-usage/?limit=
 */

import { motion } from 'framer-motion';
import {
  AlertTriangle, Brain, Coins, Loader2, RefreshCw, TrendingUp, Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '@/shared/api/axios';

interface UsageItem {
  id: number;
  email: string;
  tokens_balance: number;
  nano_coins: number;
  sites_30d: number;
  is_active: boolean;
}

interface UsageResp {
  summary: {
    total_tokens: number;
    active_users_30d: number;
    sites_created_30d: number;
  };
  items: UsageItem[];
}

export default function AdminAIUsagePage() {
  const [data, setData] = useState<UsageResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<UsageResp>('/accounts/admin/ai-usage/?limit=200');
      setData(res.data);
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { error?: string } } };
      setError(errObj?.response?.data?.error ?? 'Yuklab bo\'lmadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const sortedItems = useMemo(() => {
    if (!data) return [];
    return [...data.items].sort((a, b) => b.sites_30d - a.sites_30d);
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/5 bg-zinc-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-400" />
              AI sarflanish
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Foydalanuvchilar bo&apos;yicha nano coin balansi va 30-kunlik faollik.
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
      </div>

      {/* KPI cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            icon={Coins}
            color="text-amber-400 bg-amber-500/10"
            label="Jami tokenlar"
            value={data.summary.total_tokens.toLocaleString('uz-UZ')}
          />
          <KpiCard
            icon={Users}
            color="text-blue-400 bg-blue-500/10"
            label="30 kun aktiv user"
            value={data.summary.active_users_30d.toString()}
          />
          <KpiCard
            icon={TrendingUp}
            color="text-emerald-400 bg-emerald-500/10"
            label="30 kunda yaratilgan sayt"
            value={data.summary.sites_created_30d.toString()}
          />
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500 mx-auto" />
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center text-zinc-500 text-sm">
          Hech narsa topilmadi.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-bold">Foydalanuvchi</th>
                <th className="text-right px-4 py-2.5 font-bold">Tokenlar</th>
                <th className="text-right px-4 py-2.5 font-bold">Nano coin</th>
                <th className="text-right px-4 py-2.5 font-bold">30-kun saytlar</th>
                <th className="text-center px-4 py-2.5 font-bold">Holat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedItems.map((it, idx) => (
                <motion.tr
                  key={it.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.005 }}
                  className="hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-2.5 text-zinc-300 text-xs truncate max-w-[260px]">
                    {it.email}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-200 font-mono text-xs">
                    {it.tokens_balance.toLocaleString('uz-UZ')}
                  </td>
                  <td className="px-4 py-2.5 text-right text-amber-300 font-mono text-xs">
                    {it.nano_coins.toLocaleString('uz-UZ')}
                  </td>
                  <td className="px-4 py-2.5 text-right text-emerald-300 font-bold text-xs">
                    {it.sites_30d}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {it.is_active ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        AKTIV
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-700/30 text-zinc-500 border border-zinc-600/30">
                        BLOK
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon, color, label, value,
}: {
  icon: React.FC<{ className?: string }>;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/5 bg-zinc-900 p-5"
    >
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
    </motion.div>
  );
}
