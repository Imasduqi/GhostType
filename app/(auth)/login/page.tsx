"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        throw loginError;
      }

      if (data?.user) {
        // Redirect to homepage/race page on success
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat masuk. Periksa kembali email dan password Anda.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-ink flex justify-center items-center relative overflow-hidden font-sans">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* Background terminal overlay lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-8 relative">
        {/* Header */}
        <div className="text-center space-y-2 select-none">
          <Link href="/">
            <h1 className="text-4xl font-black tracking-tight text-amber transition-colors inline-block">
              GhostType
            </h1>
          </Link>
          <p className="text-slate-custom text-sm font-medium">
            Masuk ke Boarding Gate untuk melacak statistik mengetik Anda
          </p>
        </div>

        {/* Card Form */}
        <div className="glass-card p-8 rounded border border-[#2D3345] shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber rounded-t" />

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Alert Error */}
            {error && (
              <div className="p-4 bg-error-custom/10 border border-error-custom/40 rounded text-error-custom text-xs font-semibold leading-relaxed animate-shake">
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-custom">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 bg-[#11131A] border border-[#2D3345] rounded focus:border-amber/60 focus:ring-1 focus:ring-amber/30 text-paper outline-none text-sm transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-custom">
                  Password
                </label>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#11131A] border border-[#2D3345] rounded focus:border-amber/60 focus:ring-1 focus:ring-amber/30 text-paper outline-none text-sm transition-all"
              />
            </div>

            {/* Button Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-amber hover:bg-amber/90 text-ink font-bold rounded shadow-lg shadow-amber/10 transition-all cursor-pointer disabled:opacity-50 select-none active:scale-[0.98] text-sm"
            >
              {loading ? 'Masuk ke Akun...' : 'Masuk'}
            </button>

          </form>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-custom select-none">
          Belum punya akun?{' '}
          <Link href="/register" className="text-amber hover:text-amber/80 font-bold underline transition-colors">
            Daftar sekarang
          </Link>
        </div>

      </div>
    </main>
  );
}
