'use client';

/**
 * Super-admin: Hosting boshqaruvi sahifasi.
 * - Saytlar ro'yxati hosting_status filter bilan
 * - Custom domain bor/yo'q filter
 * - Status o'zgartirish (ACTIVE / EXPIRED / SUSPENDED / ARCHIVED)
 *
 * Backend: GET /api/accounts/admin/hosting/?status=&custom_domain=
 *          POST /api/accounts/admin/hosting/<project_id>/status/
 *          POST /api/accounts/admin/hosting/<project_id>/domain/
 */

import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink, Globe2,
  Loader2, RefreshCw, Server, Shield, ShieldOff, X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import api from '@/shared/api/axios';

interface HostingItem {
  id: string;
  title: string;
  slug: string | null;
  hosting_status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED' | 'ARCHIVED';
  hosting_expires_at: string | null;
  days_until_expiry: number | null;
  is_locked: boolean;
  is_live: boolean;
  custom_domain: string;
  custom_domain_verified: boolean;
  suspension_reason: string;
  user: { id: number; email: string };
}

interface ListResp {
  total: number;
  items: HostingItem[];
}

const STATUS_META: Record<HostingItem['hosting_status'], { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  ACTIVE:    { label: 'Faol',         color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', icon: CheckCircle2 },
  TRIAL:     { label: 'Sinov',        color: 'bg-blue-500/15 text-blue-300 border-blue-500/30',           icon: Clock },
  EXPIRED:   { label: 'Tugagan',      color: 'bg-amber-500/15 text-amber-300 border-amber-500/30',        icon: AlertTriangle },
  SUSPENDED: { label: 'To\'xtatilgan',color: 'bg-red-500/15 text-red-300 border-red-500/30',              icon: ShieldOff },
  ARCHIVED:  { label: 'Arxivlangan',  color: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/30',           icon: Shield },
};

const STATUS_OPTIONS: HostingItem['hosting_status'][] = ['ACTIVE', 'TRIAL', 'EXPIRED', 'SUSPENDED', 'ARCHIVED'];

export default function AdminHostingPage() {
  const [items, setItems] = useState<HostingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<'' | 'true' | 'false'>('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (domainFilter) params.set('custom_domain', domainFilter);
      params.set('limit', '100');
      const res = await api.get<ListResp>(`/accounts/admin/hosting/?${params.toString()}`);
      setItems(res.data.items ?? []);
      setTotal(res.data.total ?? 0);
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { error?: string } } };
      setError(errObj?.response?.data?.error ?? 'Yuklab bo\'lmadi.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, domainFilter]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const setStatus = async (id: string, newStatus: string, reason: string = '') => {
    try {
      await api.post(`/accounts/admin/hosting/${id}/status/`, { status: newStatus, reason });
      await fetchData();
    } catch {
      alert('Status o\'zgartirib bo\'lmadi.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Filtrlar */}
      <div className="rounded-2xl border border-white/5 bg-zinc-900 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400" />
              Hosting boshqaruvi
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Jami: <span className="text-zinc-300 font-semibold">{total}</span> sayt
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
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'Barchasi' },
              ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_META[s].label })),
            ]}
          />
          <FilterSelect
            label="Custom domain"
            value={domainFilter}
            onChange={(v) => setDomainFilter(v as '' | 'true' | 'false')}
            options={[
              { value: '', label: 'Barchasi' },
              { value: 'true', label: 'Bor' },
              { value: 'false', label: 'Yo\'q' },
            ]}
          />
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
          Hech narsa topilmadi.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-zinc-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-bold">Sayt</th>
                <th className="text-left px-4 py-2.5 font-bold">Egasi</th>
                <th className="text-left px-4 py-2.5 font-bold">Status</th>
                <th className="text-left px-4 py-2.5 font-bold">Tugash</th>
                <th className="text-left px-4 py-2.5 font-bold">Domen</th>
                <th className="text-right px-4 py-2.5 font-bold">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((it, idx) => {
                const meta = STATUS_META[it.hosting_status];
                const Icon = meta.icon;
                return (
                  <motion.tr
                    key={it.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.01 }}
                    className="hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200 font-semibold truncate max-w-[180px]">{it.title}</span>
                        {it.is_live && it.slug && (
                          <a
                            href={`/s/${it.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-zinc-500 hover:text-zinc-300"
                            title="Saytni ochish"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {it.suspension_reason && (
                        <p className="text-[10px] text-red-400 mt-0.5 truncate max-w-[200px]" title={it.suspension_reason}>
                          {it.suspension_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-400 text-xs truncate max-w-[180px]">
                      {it.user.email}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border ${meta.color}`}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-zinc-400">
                      {it.days_until_expiry == null ? (
                        <span className="text-zinc-600">—</span>
                      ) : it.days_until_expiry <= 0 ? (
                        <span className="text-red-400">Tugagan</span>
                      ) : (
                        <span>{it.days_until_expiry} kun</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {it.custom_domain ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Globe2 className={`w-3 h-3 ${it.custom_domain_verified ? 'text-emerald-400' : 'text-amber-400'}`} />
                          <span className="text-zinc-300 truncate max-w-[150px]">{it.custom_domain}</span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusActions item={it} onChange={(s) => setStatus(it.id, s)} />
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

// ── Sub-components ────────────────────────────────────────────────

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-500">
      <span>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-300 text-xs focus:outline-none focus:border-purple-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function StatusActions({
  item,
  onChange,
}: {
  item: HostingItem;
  onChange: (newStatus: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
      >
        O&apos;zgartirish
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} className="fixed inset-0 z-10" />
          <div className="absolute right-0 mt-1 w-48 rounded-lg bg-zinc-800 border border-white/10 shadow-xl z-20 p-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => { onChange(s); setOpen(false); }}
                disabled={s === item.hosting_status}
                className="w-full text-left text-[11px] px-2 py-1.5 rounded hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span>{STATUS_META[s].label}</span>
                {s === item.hosting_status && <X className="w-3 h-3 text-zinc-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
