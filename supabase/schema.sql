-- 1. Buat Tabel public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Buat Tabel public.texts
CREATE TABLE IF NOT EXISTS public.texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('id', 'en')),
  source TEXT NOT NULL CHECK (source IN ('curated', 'generated')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  char_count INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Buat Tabel public.attempts
CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text_id UUID NOT NULL REFERENCES public.texts(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'race',
  wpm NUMERIC NOT NULL,
  accuracy NUMERIC NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
  duration_ms INT NOT NULL,
  keystroke_log JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. Buat View Agregat public.user_stats
CREATE OR REPLACE VIEW public.user_stats AS
SELECT
  user_id,
  ROUND(AVG(wpm), 2) AS avg_wpm,
  MAX(wpm) AS best_wpm,
  COUNT(*) AS total_attempts,
  ROUND(AVG(accuracy), 2) AS avg_accuracy
FROM public.attempts
GROUP BY user_id;

-- 5. Aktifkan Row Level Security (RLS) pada semua tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

-- 6. Definisikan Kebijakan RLS (RLS Policies)

-- Kebijakan untuk tabel 'texts'
CREATE POLICY "texts_read_public" 
  ON public.texts 
  FOR SELECT 
  USING (true);

-- Kebijakan untuk tabel 'profiles'
CREATE POLICY "profiles_read_public" 
  ON public.profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "profiles_update_owner" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Kebijakan untuk tabel 'attempts'
CREATE POLICY "attempts_read_public" 
  ON public.attempts 
  FOR SELECT 
  USING (true);

CREATE POLICY "attempts_insert_authenticated" 
  ON public.attempts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 7. Trigger Otomatis untuk Membuat Profil Baru setelah User Mendaftar di Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  -- Dapatkan username dasar dari meta data (jika dikirim dari frontend) atau dari email prefix
  base_username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );

  -- Pastikan username tidak mengandung karakter ilegal atau terlalu panjang
  base_username := REGEXP_REPLACE(base_username, '[^a-zA-Z0-9_]', '', 'g');
  IF length(base_username) < 3 THEN
    base_username := base_username || '_user';
  END IF;

  final_username := base_username;

  -- Loop untuk memastikan keunikan username (jika ada konflik)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    new.id,
    final_username,
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || final_username)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Jalankan trigger handle_new_user sesaat setelah user baru masuk ke auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
