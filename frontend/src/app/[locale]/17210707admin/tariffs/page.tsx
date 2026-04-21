'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
  Users,
  DollarSign,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import api from '@/shared/api/axios';

interface Tariff {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_days: number;
  projects_limit: number;
  ai_generations_limit: number;
  is_active: boolean;
  active_subscribers: number;
}

const EMPTY: Omit<Tariff, 'id' | 'active_subscribers'> = {
  name: '',
  description: '',
  price: '0',
  duration_days: 30,
  projects_limit: 10,
  ai_generations_limit: 50,
  is_active: true,
};

function TariffCard({
  tariff,
  onSave,
  onDelete,
}: {
  tariff: Tariff;
  onSave: (id: number, data: Partial<Tariff>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...tariff });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSave = async () => {
    setLoading(true);
    await onSave(tariff.id, form);
    showToast('Saqlandi!');
    setLoading(false);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirm(`"${tariff.name}" tarifini o'chirishni tasdiqlaysizmi?`)) return;
    setLoading(true);
    await onDelete(tariff.id);
  };

  const f = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((p) => ({ ...p, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={editing ? {} : { y: -2 }}
      className={`relative rounded-2xl border p-6 transition-colors ${
        tariff.is_active
          ? 'border-white/10 bg-zinc-900'
          : 'border-white/5 bg-zinc-900/50 opacity-60'
      }`}
    >
      {/* Active badge */}
      {tariff.active_subscribers > 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
          <Users className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] font-bold text-emerald-400">{tariff.active_subscribers} faol</span>
        </div>
      )}

      {!editing ? (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-black text-white">{tariff.name}</h3>
            <p className="text-zinc-500 text-sm mt-1">{tariff.description || '—'}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: 'Narx', value: `$${tariff.price}/oy` },
              { label: 'Muddat', value: `${tariff.duration_days} kun` },
              { label: 'Loyihalar', value: tariff.projects_limit === 0 ? 'Cheksiz' : String(tariff.projects_limit) },
              { label: 'AI Generatsiya', value: tariff.ai_generations_limit === 0 ? 'Cheksiz' : String(tariff.ai_generations_limit) },
            ].map((item) => (
              <div key={item.label} className="bg-zinc-800 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wide">{item.label}</p>
                <p className="text-sm font-bold text-white mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => { setForm({ ...tariff }); setEditing(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Tahrirlash
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleDelete}
              disabled={loading || tariff.active_subscribers > 0}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </motion.button>
            {tariff.active_subscribers > 0 && (
              <p className="text-[10px] text-zinc-600">Faol obunalar bor</p>
            )}
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-zinc-400 font-semibold mb-1 block">Nomi</label>
              <input value={form.name} onChange={f('name')}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-zinc-400 font-semibold mb-1 block">Tavsif</label>
              <textarea value={form.description} onChange={f('description')} rows={2}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none" />
            </div>
            {[
              { key: 'price' as const, label: 'Narx ($)', type: 'number' },
              { key: 'duration_days' as const, label: 'Kunlar', type: 'number' },
              { key: 'projects_limit' as const, label: 'Loyihalar (0=∞)', type: 'number' },
              { key: 'ai_generations_limit' as const, label: 'AI gen (0=∞)', type: 'number' },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs text-zinc-400 font-semibold mb-1 block">{field.label}</label>
                <input type={field.type} value={form[field.key]} onChange={f(field.key)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id={`active-${tariff.id}`} checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))} className="accent-purple-600" />
            <label htmlFor={`active-${tariff.id}`} className="text-sm text-zinc-300">Faol</label>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={handleSave} disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Saqlash
            </motion.button>
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded-xl transition-colors">
              <X className="w-4 h-4" /> Bekor
            </button>
          </div>
          {toast && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {toast}
            </motion.p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function AdminTariffsPage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ ...EMPTY });
  const [createLoading, setCreateLoading] = useState(false);
  const [globalToast, setGlobalToast] = useState('');

  const showGlobalToast = (msg: string) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(''), 3000);
  };

  const load = () => {
    setLoading(true);
    api.get<Tariff[]>('/accounts/admin/tariffs/')
      .then((r) => setTariffs(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (id: number, data: Partial<Tariff>) => {
    await api.patch(`/accounts/admin/tariffs/${id}/`, data);
    load();
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/accounts/admin/tariffs/${id}/`);
      showGlobalToast("O'chirildi.");
      load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Xatolik";
      showGlobalToast(msg);
    }
  };

  const handleCreate = async () => {
    if (!newForm.name) return;
    setCreateLoading(true);
    try {
      await api.post('/accounts/admin/tariffs/', newForm);
      showGlobalToast(`'${newForm.name}' tarifi yaratildi!`);
      setNewForm({ ...EMPTY });
      setCreating(false);
      load();
    } catch {
      showGlobalToast('Xatolik yuz berdi.');
    } finally {
      setCreateLoading(false);
    }
  };

  const nf = (key: keyof typeof newForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setNewForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-white">Tariflar</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Bu yerda o&apos;zgartirilgan narxlar sayt Pricing sahifasida ham ko&apos;rinadi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={load}
            className="p-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setCreating((p) => !p)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus className="w-4 h-4" />
            Yangi tarif
          </motion.button>
        </div>
      </motion.div>

      {/* Global toast */}
      <AnimatePresence>
        {globalToast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm font-semibold text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> {globalToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pricing info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-3 px-4 py-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
        <DollarSign className="w-5 h-5 text-blue-400 shrink-0" />
        <p className="text-sm text-zinc-400">
          Narxlarni o&apos;zgartirsangiz, <strong className="text-white">sayt Pricing sahifasida</strong> darhol yangilanadi — bu real vaqtda API orqali yuklanadi.
        </p>
      </motion.div>

      {/* New tariff form */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-900 border border-purple-500/30 rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" /> Yangi tarif yaratish
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs text-zinc-400 font-semibold mb-1 block">Nomi *</label>
                  <input value={newForm.name} onChange={nf('name')} placeholder="Pro, Starter..."
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500" />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs text-zinc-400 font-semibold mb-1 block">Tavsif</label>
                  <input value={newForm.description} onChange={nf('description')}
                    className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500" />
                </div>
                {[
                  { key: 'price' as const, label: 'Narx ($)' },
                  { key: 'duration_days' as const, label: 'Kunlar' },
                  { key: 'projects_limit' as const, label: 'Loyihalar (0=∞)' },
                  { key: 'ai_generations_limit' as const, label: 'AI gen (0=∞)' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="text-xs text-zinc-400 font-semibold mb-1 block">{field.label}</label>
                    <input type="number" value={newForm[field.key]} onChange={nf(field.key)}
                      className="w-full bg-zinc-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  onClick={handleCreate} disabled={!newForm.name || createLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Yaratish
                </motion.button>
                <button onClick={() => setCreating(false)}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-sm rounded-xl transition-colors">
                  Bekor qilish
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tariff cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        </div>
      ) : (
        <motion.div layout className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {tariffs.map((t) => (
              <TariffCard key={t.id} tariff={t} onSave={handleSave} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
