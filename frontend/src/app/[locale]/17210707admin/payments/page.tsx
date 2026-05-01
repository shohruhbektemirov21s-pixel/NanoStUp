'use client';

/**
 * Super-admin: To'lovlar ro'yxati.
 * Backend: GET /api/accounts/admin/payments/?status=&provider=
 */

import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Clock, CreditCard, Loader2,
  RefreshCw, RotateCcw, X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import api from '@/shared/api/axios';

interface PaymentItem {
  id: number;
  amount: string;
  provider: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELLED' | string;
  external_id: string | null;
  created_at: string | null;
  user: { id: number; email: string };
  tariff: { id: number; name: string } | null;
}

interface ListResp {
  total: number;
  items: PaymentItem[];
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  SUCCESS:   { label: 'Muvaffaqiyat', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
  PENDING:   { label: 'Kutilmoqda',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/30',           icon: Clock },
  FAILED:    { label: 'Xato',         color: 'bg-red-500/15 text-red-300 border-red-500/30',              icon: AlertTriangle },
  REFUNDED:  { label: 'Qaytarilgan',  color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',        icon: RotateCcw },
  CANCELLED: { label: 'Bekor',        color: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',           icon: X },
};

function statusMeta(s: string) {
  return STATUS_META[s] ?? { label: s, color: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30', icon: Clock };
}

const STATUS_OPTS = ['', 'SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'CANCELLED'];

export default function AdminPaymentsPage() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (providerFilter) params.set('provider', providerFilter);
      params.set('limit', '100');
      const res = await api.get<ListResp>(`/accounts/admin/payments/?${params.toString()}`);
      setItems(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { error?: string } } };
      setError(errObj?.response?.data?.error ?? 'Yuklab bo\'lmadi.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, providerFilter]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // Provider'larni jo'natilgan ma'lumotdan aniqlaymiz
  const providers = useMemo(() => {
    const set = new Set(items.map((i) => i.provider).filter(Boolean));
    return Array.from(set).sort();
  }, [items]);

  // Summary KPI
  const totalSuccess = useMemo(
    () => items.filter((i) => i.status === 'SUCCESS')
      .reduce((s, i) => s + parseFloat(i.amount || '0'), 0),
    [items],
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/5 bg-zinc-900 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              To&apos;lovlar
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Jami: <span className="text-zinc-300 font-semibold">{total}</span>
              {' · '}
              Muvaffaqiyatli summa:{' '}
              <span className="text-emerald-300 font-semibold">
                {totalSuccess.toLocaleString('uz-UZ')} so&apos;m
              </span>
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

        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 text-xs focus:outline-none focus:border-purple-500"
            >
              {STATUS_OPTS.map((s) => (
                <option key={s} value={s}>{s ? statusMeta(s).label : 'Barchasi'}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            <span>Provider:</span>
            <select
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="">Barchasi</option>
              {providers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
        </div>
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
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 p-10 text-center text-zinc-500 text-sm">
          To&apos;lovlar topilmadi.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-bold">ID</th>
                <th className="text-left px-4 py-2.5 font-bold">Foydalanuvchi</th>
                <th className="text-left px-4 py-2.5 font-bold">Tarif</th>
                <th className="text-right px-4 py-2.5 font-bold">Summa</th>
                <th className="text-left px-4 py-2.5 font-bold">Provider</th>
                <th className="text-left px-4 py-2.5 font-bold">Status</th>
                <th className="text-left px-4 py-2.5 font-bold">Sana</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((it, idx) => {
                const meta = statusMeta(it.status);
                const Icon = meta.icon;
                return (
                  <motion.tr
                    key={it.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2.5 text-zinc-500 font-mono text-[11px]">#{it.id}</td>
                    <td className="px-4 py-2.5 text-zinc-300 text-xs truncate max-w-[200px]">
                      {it.user.email}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 text-xs">
                      {it.tariff?.name ?? <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right text-zinc-200 font-bold text-xs">
                      {parseFloat(it.amount).toLocaleString('uz-UZ')}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 text-xs uppercase">
                      {it.provider}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border ${meta.color}`}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-500 text-[11px]">
                      {it.created_at ? new Date(it.created_at).toLocaleString('uz-UZ', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      }) : '—'}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
