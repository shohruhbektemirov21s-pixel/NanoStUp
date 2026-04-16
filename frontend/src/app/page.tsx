'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Layout, Zap, Globe } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">AI Builder</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#showcase" className="hover:text-white transition-colors">Showcase</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium hover:text-purple-400 transition-colors">Login</Link>
            <Link href="/register">
              <Button size="sm" className="bg-white text-black hover:bg-gray-200">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-purple-400 mb-6">
              Powered by Gemini 1.5 Pro
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
              Build your website <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
                with a single prompt
              </span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              Describe your business in any language and watch our AI create a premium, 
              multi-page website with copy, images, and high-converting layouts in seconds.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/builder">
                <Button size="lg" className="h-14 px-8 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-lg font-semibold group">
                  Start Building
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-14 px-8 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-lg">
                View Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats/Proof */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Generated Sites', value: '10k+' },
            { label: 'Business Types', value: '50+' },
            { label: 'Countries', value: '15+' },
            { label: 'Uptime', value: '99.9%' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-4" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything you need to grow</h2>
            <p className="text-gray-400">Professional tools for professional businesses.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Layout className="w-6 h-6" />,
                title: 'Multi-page Layouts',
                desc: 'Generate complete sites with Home, About, Services, Contact, and more.',
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: 'Instant Preview',
                desc: 'See your changes in real-time as the AI crafts your digital presence.',
              },
              {
                icon: <Globe className="w-6 h-6" />,
                title: 'Multi-language',
                desc: 'Full support for English, Russian, and Uzbek out of the box.',
              },
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/[0.08] transition-colors group">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
