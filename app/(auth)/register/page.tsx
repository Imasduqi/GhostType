"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { isUsernameUnique } from '@/lib/supabase/queries';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function RegisterPage() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Status states
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debounce username check
  useEffect(() => {
    if (!username) {
      setUsernameStatus('idle');
      return;
    }

    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      setUsernameStatus('invalid');
      return;
    }

    // Regexp check: alphanumeric and underscore only
    const isValidPattern = /^[a-zA-Z0-9_]+$/.test(cleanUsername);
    if (!isValidPattern) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const unique = await isUsernameUnique(cleanUsername);
        setUsernameStatus(unique ? 'available' : 'taken');
      } catch (err) {
        console.error(err);
        setUsernameStatus('available'); // fallback to avoid blocking
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Form validations
    if (usernameStatus === 'invalid') {
      setError('Username minimal 3 karakter dan hanya boleh berisi huruf, angka, atau underscore (_).');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('Username sudah digunakan oleh pengguna lain.');
      return;
    }
    if (password.length < 6) {
      setError('Password minimal harus 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up the user via Supabase Auth
      // Pass the username in user_metadata so that the PostgreSQL trigger handle_new_user() catches it
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim(),
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data?.user) {
        setSuccess(true);
        // Automatically redirect to login page or home after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 2500);
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
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
            Buat akun untuk bersaing melawan ghost rekor terbaik Anda
          </p>
        </div>

        {/* Card Form */}
        <div className="glass-card p-8 rounded border border-[#2D3345] shadow-2xl relative">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber rounded-t" />

          {success ? (
            <div className="text-center py-8 space-y-4 font-sans">
              <div className="w-16 h-16 bg-ghost-teal/20 text-ghost-teal rounded flex items-center justify-center mx-auto animate-bounce">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-paper">Registrasi Berhasil!</h2>
              <p className="text-slate-custom text-sm">
                Akun Anda telah dibuat. Mengalihkan ke halaman boarding gate...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
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

              {/* Username */}
              <div className="space-y-1.5 relative">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-custom">
                    Username
                  </label>
                  
                  {/* Status Indicator */}
                  {usernameStatus === 'checking' && (
                    <span className="text-[10px] text-amber font-semibold animate-pulse font-sans">Memeriksa...</span>
                  )}
                  {usernameStatus === 'available' && (
                    <span className="text-[10px] text-ghost-teal font-semibold font-sans">Tersedia</span>
                  )}
                  {usernameStatus === 'taken' && (
                    <span className="text-[10px] text-error-custom font-semibold font-sans">Username sudah dipakai</span>
                  )}
                  {usernameStatus === 'invalid' && (
                    <span className="text-[10px] text-amber font-semibold font-sans">Format tidak valid</span>
                  )}
                </div>
                
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ''))} // No space allowed
                  placeholder="john_doe"
                  className={`w-full px-4 py-3 bg-[#11131A] border rounded text-paper outline-none text-sm transition-all focus:ring-1 ${
                    usernameStatus === 'available'
                      ? 'border-ghost-teal/50 focus:border-ghost-teal/80 focus:ring-ghost-teal/20'
                      : usernameStatus === 'taken' || usernameStatus === 'invalid'
                      ? 'border-error-custom/50 focus:border-error-custom/80 focus:ring-error-custom/20'
                      : 'border-[#2D3345] focus:border-amber/60 focus:ring-amber/30'
                  }`}
                />
                <p className="text-[10px] text-slate-custom mt-1 font-sans">
                  Minimal 3 karakter, alfanumerik dan garis bawah (a-z, 0-9, _).
                </p>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-custom">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#11131A] border border-[#2D3345] rounded focus:border-amber/60 focus:ring-1 focus:ring-amber/30 text-paper outline-none text-sm transition-all"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-custom">
                  Konfirmasi Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#11131A] border border-[#2D3345] rounded focus:border-amber/60 focus:ring-1 focus:ring-amber/30 text-paper outline-none text-sm transition-all"
                />
              </div>

              {/* Button Submit */}
              <button
                type="submit"
                disabled={loading || usernameStatus === 'checking' || usernameStatus === 'taken' || usernameStatus === 'invalid'}
                className="w-full py-3.5 bg-amber hover:bg-amber/90 text-ink font-bold rounded shadow-lg shadow-amber/10 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] text-sm"
              >
                {loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
              </button>

            </form>
          )}
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-custom select-none">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-amber hover:text-amber/80 font-bold underline transition-colors">
            Login di sini
          </Link>
        </div>

      </div>
    </main>
  );
}
