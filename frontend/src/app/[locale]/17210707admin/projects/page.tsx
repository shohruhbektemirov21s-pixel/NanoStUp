'use client';

import { motion } from 'framer-motion';
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  ShieldOff,
  Trash2,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import api from '@/shared/api/axios';

interface ProjectRow {
  id: string;
  title: string;
  slug: string | null;
  language: string;
  status: string;
  is_published: boolean;
  is_active: boolean;
  view_count: number;
  page_count: number;
  section_count: number;
  created_at: string;
  updated_at: string;
  user: { id: number; email: string; username: string };
}

interface ProjectsResp {
  total: number;
  limit: number;
  offset: number;
  items: ProjectRow[];
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Tayyor', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  GENERATING: { label: 'Yaratilmoqda', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  FAILED: { label: 'Xatolik', cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  IDLE: { label: 'Boshlanmagan', cls: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

export default function AdminProjectsPage() {
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'uz';

  const [data, setData] = useState<ProjectsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (statusFilter) qs.set('status', statusFilter);
      if (publishedFilter) qs.set('published', publishedFilter);
      if (activeFilter) qs.set('active', activeFilter);
      qs.set('limit', '100');
      const res = await api.get<ProjectsResp>(`/accounts/admin/projects/?${qs.toString()}`);
      setData(res.data);
    } catch {
      setData({ total: 0, limit: 100, offset: 0, items: [] });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, publishedFilter, activeFilter]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const togglePublished = async (p: ProjectRow) => {
    setActionId(p.id);
    try {
      await api.patch(`/accounts/admin/projects/${p.id}/`, { is_published: !p.is_published });
      showToast(p.is_published ? 'Publikatsiya bekor qilindi' : 'Sayt publish qilindi');
      load();
    } catch {
      showToast('Xatolik yuz berdi');
    } finally {
      setActionId(null);
    }
  };

  const toggleActive = async (p: ProjectRow) => {
    setActionId(p.id);
    try {
      await api.patch(`/accounts/admin/projects/${p.id}/`, { is_active: !p.is_active });
      showToast(p.is_active ? "Hosting o'chirildi" : 'Hosting yoqildi');
      load();
    } catch {
      showToast('Xatolik yuz berdi');
    } finally {
      setActionId(null);
    }
  };

  const removeProject = async (p: ProjectRow) => {
    if (!confirm(`"${p.title}" loyihasini butunlay o'chirasizmi?`)) return;
    setActionId(p.id);
    try {
      await api.delete(`/accounts/admin/projects/${p.id}/`);
      showToast("O'chirildi");
      load();
    } catch {
      showToast('Xatolik yuz berdi');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight">User loyihalari</h2>
          <p className="text-sm text-zinc-500">
            Barcha foydalanuvchilar yaratgan saytlar — qidirish, hosting boshqaruvi, o&apos;chirish.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yangilash
        </button>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sayt yoki user qidirish..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-white/5 text-sm focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/5 text-sm focus:outline-none focus:border-purple-500/50"
        >
          <option value="">Barcha statuslar</option>
          <option value="COMPLETED">Tayyor</option>
          <option value="GENERATING">Yaratilmoqda</option>
          <option value="FAILED">Xatolik</option>
          <option value="IDLE">Boshlanmagan</option>
        </select>
        <select
          value={publishedFilter}
          onChange={(e) => setPublishedFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/5 text-sm focus:outline-none focus:border-purple-500/50"
        >
          <option value="">Publish: barchasi</option>
          <option value="true">Publish qilingan</option>
          <option value="false">Draft</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/5 text-sm focus:outline-none focus:border-purple-500/50"
        >
          <option value="">Hosting: barchasi</option>
          <option value="true">Faol</option>
          <option value="false">Bloklangan</option>
        </select>
        <div className="ml-auto text-xs text-zinc-500">
          Jami: <span className="text-white font-bold">{data?.total ?? 0}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-zinc-900/60 border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-zinc-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Sayt</th>
                <th className="text-left px-4 py-3 font-semibold">Egasi</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Mazmun</th>
                <th className="text-left px-4 py-3 font-semibold">Yaratilgan</th>
                <th className="text-right px-4 py-3 font-semibold">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-500">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                    Yuklanmoqda...
                  </td>
                </tr>
              )}
              {!loading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-500">
                    <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Loyihalar topilmadi
                  </td>
                </tr>
              )}
              {data?.items.map((p) => {
                const badge = STATUS_BADGE[p.status] ?? STATUS_BADGE.IDLE;
                const busy = actionId === p.id;
                return (
                  <tr key={p.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                          {(p.title || '?')[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate max-w-[260px]">{p.title}</p>
                          <p className="text-[11px] text-zinc-500 font-mono truncate">
                            /{p.slug ?? '—'} · {p.language}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-zinc-300 truncate max-w-[200px]">{p.user.email}</p>
                      {p.user.username && (
                        <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">@{p.user.username}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                        {p.is_published ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Publish
                          </span>
                        ) : (
                          <span className="text-zinc-500">Draft</span>
                        )}
                        {!p.is_active && (
                          <span className="text-red-400 flex items-center gap-1">
                            <ShieldOff className="w-3 h-3" /> Block
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      <span className="font-bold text-white">{p.page_count}</span> sahifa ·{' '}
                      <span className="font-bold text-white">{p.section_count}</span> section
                      <p className="text-[10px] text-zinc-600 mt-0.5">{p.view_count} ko&apos;rilgan</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{fmtDate(p.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.slug && p.is_published && p.is_active && (
                          <a
                            href={`/${locale}/s/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Saytni ochish"
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => togglePublished(p)}
                          disabled={busy}
                          title={p.is_published ? 'Publishni bekor qilish' : 'Publish qilish'}
                          className={`p-2 rounded-lg transition-colors ${
                            p.is_published
                              ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300'
                              : 'bg-white/5 hover:bg-white/10 text-zinc-400'
                          } disabled:opacity-50`}
                        >
                          {p.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          disabled={busy}
                          title={p.is_active ? 'Hostingni bloklash' : 'Hostingni yoqish'}
                          className={`p-2 rounded-lg transition-colors ${
                            p.is_active
                              ? 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300'
                              : 'bg-red-500/15 hover:bg-red-500/25 text-red-300'
                          } disabled:opacity-50`}
                        >
                          <ShieldOff className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeProject(p)}
                          disabled={busy}
                          title="O'chirish"
                          className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-sm font-semibold text-white shadow-2xl"
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
}
