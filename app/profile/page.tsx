"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { getUserProfile } from '@/lib/supabase/queries';

export default function ProfileRedirect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkAuthAndRedirect() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session?.user) {
          if (active) {
            router.push('/login?redirect=/profile');
          }
          return;
        }

        // Fetch user profile to get the username
        const profile = await getUserProfile(session.user.id);
        if (!profile || !profile.username) {
          throw new Error("Profil atau username tidak ditemukan.");
        }

        if (active) {
          router.push(`/profile/${profile.username}`);
        }
      } catch (err: any) {
        console.error("Auth check redirect error:", err);
        if (active) {
          setError(err.message || "Gagal mengautentikasi pengguna.");
          setLoading(false);
          // Fallback redirect to login
          router.push('/login?redirect=/profile');
        }
      }
    }

    checkAuthAndRedirect();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-ink flex flex-col justify-center items-center font-sans relative overflow-hidden">
      {/* Background terminal overlay lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none -z-10" />

      <div className="glass-card p-8 rounded border border-[#2D3345] shadow-2xl flex flex-col items-center space-y-6 max-w-sm w-full text-center">
        <h1 className="text-xl font-black text-amber tracking-wider uppercase">
          Mengecek Tiket Keberangkatan...
        </h1>
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-4 border-[#2D3345] border-t-amber animate-spin" />
            <p className="text-xs text-slate-custom font-semibold">
              Menghubungkan ke database bandara...
            </p>
          </div>
        ) : error ? (
          <div className="text-xs text-error-custom font-semibold leading-relaxed">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
