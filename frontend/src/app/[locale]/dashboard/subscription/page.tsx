'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CreditCard, Zap, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import api from '@/shared/api/axios';
import Link from 'next/link';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/subscriptions/my/current/');
      setSubscription(response.data);
    } catch (err) {
      console.error('No active subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2">My Subscription</h1>
          <p className="text-zinc-500">Manage your billing and plan details.</p>
        </header>

        {loading ? (
          <div className="h-48 bg-white/5 animate-pulse rounded-3xl" />
        ) : subscription ? (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Active Plan Card */}
            <div className="p-8 rounded-3xl border border-purple-500/20 bg-purple-500/5 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{subscription.tariff_name} Plan</h3>
                  <p className="text-xs text-purple-400 font-medium tracking-wider uppercase">Active</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Generations used:</span>
                  <span>{subscription.generations_used} / {subscription.ai_generations_limit || '∞'}</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500" 
                    style={{ width: `${(subscription.generations_used / (subscription.ai_generations_limit || 100)) * 100}%` }} 
                  />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">Projects created:</span>
                  <span>{subscription.projects_created} / {subscription.projects_limit || '∞'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
                <Clock className="w-4 h-4" />
                <span>Expires on {new Date(subscription.end_date).toLocaleDateString()}</span>
              </div>

              <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10">
                Cancel Subscription
              </Button>
            </div>

            {/* Billing Info */}
            <div className="p-8 rounded-3xl border border-white/10 bg-white/5">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-zinc-400" />
                Payment Method
              </h3>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-zinc-800 rounded-lg" />
                  <div>
                    <p className="font-medium">Visa •••• 4242</p>
                    <p className="text-xs text-zinc-500">Expires 12/28</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">Edit</Button>
              </div>
              <Button className="w-full bg-white text-black hover:bg-zinc-200">
                Update Billing
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-12 rounded-3xl border border-dashed border-white/10 text-center">
            <AlertCircle className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">No Active Subscription</h3>
            <p className="text-zinc-500 mb-8 max-w-sm mx-auto">
              Upgrade to a paid plan to unlock AI generation and unlimited projects.
            </p>
            <Link href="/pricing">
              <Button className="bg-purple-600 hover:bg-purple-700">
                View Pricing
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
