'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  Loader2,
  RefreshCw,
  Search,
  ShieldOff,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import api from '@/shared/api/axios';

interface UserSub {
  name: string | null;
  days_left: number | null;
  status: string | null;
}

interface AdminUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  subscription: UserSub | null;
}

interface Tariff {
  id: number;
  name: string;
  price: string;
}

function UserRow({
  user,
  tariffs,
  onRefresh,
}: {
  user: AdminUser;
  tariffs: Tariff[];
  onRefresh: () => void;
}) {
  const [grantOpen, setGrantOpen] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<number | ''>('');
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const toast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleGrant = async () => {
    if (!selectedTariff) return;
    setLoading(true);
    try {
      const res = await api.post(`/accounts/admin/users/${user.id}/grant/`, {
        tariff_id: selectedTariff,
        days,
      });
      toast((res.data as { message: string }).message);
      setGrantOpen(false);
      onRefresh();
    } catch {
      toast('Xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/accounts/admin/users/${user.id}/toggle/`);
      toast((res.data as { message: string }).message);
      onRefresh();
    } catch {
      toast('Xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  };

  const subColor =
    user.subscription?.status === 'ACTIVE'
      ? (user.subscription.days_left ?? 0) > 3
        ? 'text-emerald-400'
        : 'text-amber-400'
      : 'text-zinc-500';

  return (
    <>
      <motion.tr
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
      >
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-400 shrink-0">
              {user.email[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user.email}</p>
              <p className="text-xs text-zinc-500">{user.full_name}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 hidden sm:table-cell">
          <span className="text-xs text-zinc-400">{user.date_joined}</span>
        </td>
        <td className="px-4 py-3.5">
          {user.subscription ? (
            <div>
              <p className={`text-xs font-semibold ${subColor}`}>{user.subscription.name}</p>
              <p className="text-[10px] text-zinc-600">
                {user.subscription.days_left != null
                  ? `${user.subscription.days_left} kun`
                  : ''}
              </p>
            </div>
          ) : (
            <span className="text-xs text-zinc-600">Yo&apos;q</span>
          )}
        </td>
        <td className="px-4 py-3.5">
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
              user.is_active
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-red-500/10 text-red-400'
            }`}
          >
            {user.is_active ? <CheckCircle2 className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
            {user.is_active ? 'Faol' : 'Bloklangan'}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setGrantOpen((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Award className="w-3.5 h-3.5" />
              Obuna ber
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleToggle}
              disabled={loading}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                user.is_active
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {user.is_active ? <ShieldOff className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            </motion.button>
          </div>
        </td>
      </motion.tr>

      {/* Grant panel */}
      <AnimatePresence>
        {grantOpen && (
          <tr>
            <td colSpan={5} className="px-0 py-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 py-4 bg-zinc-800/50 border-b border-white/5">
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 font-semibold">Tarif</label>
                      <select
                        value={selectedTariff}
                        onChange={(e) => setSelectedTariff(Number(e.target.value))}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Tanlang...</option>
                        {tariffs.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} (${t.price})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 font-semibold">Kunlar</label>
                      <input
                        type="number"
                        min={1}
                        max={3650}
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="w-24 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleGrant}
                      disabled={!selectedTariff || loading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                      Berish
                    </motion.button>
                    <button onClick={() => setGrantOpen(false)} className="p-2 text-zinc-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {toastMsg && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 text-xs text-emerald-400 font-semibold"
                    >
                      ✅ {toastMsg}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = (q = '') => {
    setLoading(true);
    api.get<AdminUser[]>(`/accounts/admin/users/${q ? `?search=${q}` : ''}`)
      .then((r) => setUsers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get<Tariff[]>('/accounts/admin/tariffs/').then((r) => setTariffs(r.data));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(search), 400);
  }, [search]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-white">Foydalanuvchilar</h1>
          <p className="text-zinc-500 text-sm mt-1">Jami: {users.length} ta</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Email yoki ism..."
              className="pl-9 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-xl text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500 w-64"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => load(search)}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900 rounded-2xl border border-white/5 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-zinc-800/50">
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Foydalanuvchi
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider hidden sm:table-cell">
                  Sana
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Obuna
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Holat
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Amallar
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-zinc-500 text-sm">
                    Foydalanuvchilar topilmadi
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <UserRow key={u.id} user={u} tariffs={tariffs} onRefresh={() => load(search)} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
