import { UserAchievement } from '@/types';

export type AchievementTier = 'bronze' | 'silver' | 'gold';
export type AchievementCategory = 'speed' | 'accuracy' | 'race' | 'survival' | 'time_attack' | 'boss' | 'daily';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  threshold: number;
}

export const TIER_COLORS = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700'
};

export const TIER_EMOJIS = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇'
};

export const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  speed: 'Kecepatan',
  accuracy: 'Akurasi',
  race: 'Balapan',
  survival: 'Kelangsungan Hidup',
  time_attack: 'Serangan Waktu',
  boss: 'Pertempuran Bos',
  daily: 'Tantangan Harian'
};

export const ACHIEVEMENT_DEFINITIONS: Achievement[] = [
  // KATEGORI SPEED
  {
    id: 'speed_demon_bronze',
    name: 'Speed Demon (Bronze)',
    description: 'Capai 60 WPM di satu sesi manapun',
    category: 'speed',
    tier: 'bronze',
    threshold: 60
  },
  {
    id: 'speed_demon_silver',
    name: 'Speed Demon (Silver)',
    description: 'Capai 80 WPM di satu sesi manapun',
    category: 'speed',
    tier: 'silver',
    threshold: 80
  },
  {
    id: 'speed_demon_gold',
    name: 'Speed Demon (Gold)',
    description: 'Capai 100 WPM di satu sesi manapun',
    category: 'speed',
    tier: 'gold',
    threshold: 100
  },
  {
    id: 'sprint_king_bronze',
    name: 'Sprint King (Bronze)',
    description: 'Capai 70 WPM di Time Attack',
    category: 'speed',
    tier: 'bronze',
    threshold: 70
  },
  {
    id: 'sprint_king_silver',
    name: 'Sprint King (Silver)',
    description: 'Capai 90 WPM di Time Attack',
    category: 'speed',
    tier: 'silver',
    threshold: 90
  },
  {
    id: 'sprint_king_gold',
    name: 'Sprint King (Gold)',
    description: 'Capai 110 WPM di Time Attack',
    category: 'speed',
    tier: 'gold',
    threshold: 110
  },

  // KATEGORI ACCURACY
  {
    id: 'perfectionist_bronze',
    name: 'Perfectionist (Bronze)',
    description: 'Selesaikan sesi dengan akurasi ≥ 95%',
    category: 'accuracy',
    tier: 'bronze',
    threshold: 95
  },
  {
    id: 'perfectionist_silver',
    name: 'Perfectionist (Silver)',
    description: 'Selesaikan sesi dengan akurasi ≥ 98%',
    category: 'accuracy',
    tier: 'silver',
    threshold: 98
  },
  {
    id: 'perfectionist_gold',
    name: 'Perfectionist (Gold)',
    description: 'Selesaikan sesi dengan akurasi 100%',
    category: 'accuracy',
    tier: 'gold',
    threshold: 100
  },
  {
    id: 'sharpshooter_bronze',
    name: 'Sharpshooter (Bronze)',
    description: 'Selesaikan 10 sesi dengan akurasi ≥ 95%',
    category: 'accuracy',
    tier: 'bronze',
    threshold: 10
  },
  {
    id: 'sharpshooter_silver',
    name: 'Sharpshooter (Silver)',
    description: 'Selesaikan 25 sesi dengan akurasi ≥ 95%',
    category: 'accuracy',
    tier: 'silver',
    threshold: 25
  },
  {
    id: 'sharpshooter_gold',
    name: 'Sharpshooter (Gold)',
    description: 'Selesaikan 50 sesi dengan akurasi ≥ 95%',
    category: 'accuracy',
    tier: 'gold',
    threshold: 50
  },

  // KATEGORI RACE
  {
    id: 'racer_bronze',
    name: 'Racer (Bronze)',
    description: 'Selesaikan 1 race',
    category: 'race',
    tier: 'bronze',
    threshold: 1
  },
  {
    id: 'racer_silver',
    name: 'Racer (Silver)',
    description: 'Selesaikan 10 race',
    category: 'race',
    tier: 'silver',
    threshold: 10
  },
  {
    id: 'racer_gold',
    name: 'Racer (Gold)',
    description: 'Selesaikan 50 race',
    category: 'race',
    tier: 'gold',
    threshold: 50
  },
  {
    id: 'ghost_hunter_bronze',
    name: 'Ghost Hunter (Bronze)',
    description: 'Kalahkan ghost 1 kali',
    category: 'race',
    tier: 'bronze',
    threshold: 1
  },
  {
    id: 'ghost_hunter_silver',
    name: 'Ghost Hunter (Silver)',
    description: 'Kalahkan ghost 10 kali',
    category: 'race',
    tier: 'silver',
    threshold: 10
  },
  {
    id: 'ghost_hunter_gold',
    name: 'Ghost Hunter (Gold)',
    description: 'Kalahkan ghost 25 kali',
    category: 'race',
    tier: 'gold',
    threshold: 25
  },

  // KATEGORI SURVIVAL
  {
    id: 'survivor_bronze',
    name: 'Survivor (Bronze)',
    description: 'Capai skor 500 di Survival',
    category: 'survival',
    tier: 'bronze',
    threshold: 500
  },
  {
    id: 'survivor_silver',
    name: 'Survivor (Silver)',
    description: 'Capai skor 3000 di Survival',
    category: 'survival',
    tier: 'silver',
    threshold: 3000
  },
  {
    id: 'survivor_gold',
    name: 'Survivor (Gold)',
    description: 'Capai skor 5000 di Survival',
    category: 'survival',
    tier: 'gold',
    threshold: 5000
  },
  {
    id: 'endurance_bronze',
    name: 'Endurance (Bronze)',
    description: 'Bertahan selama 60 detik di Survival',
    category: 'survival',
    tier: 'bronze',
    threshold: 60
  },
  {
    id: 'endurance_silver',
    name: 'Endurance (Silver)',
    description: 'Bertahan selama 120 detik di Survival',
    category: 'survival',
    tier: 'silver',
    threshold: 120
  },
  {
    id: 'endurance_gold',
    name: 'Endurance (Gold)',
    description: 'Bertahan selama 180 detik di Survival',
    category: 'survival',
    tier: 'gold',
    threshold: 180
  },

  // KATEGORI TIME ATTACK
  {
    id: 'time_keeper_bronze',
    name: 'Time Keeper (Bronze)',
    description: 'Selesaikan 1 sesi Time Attack',
    category: 'time_attack',
    tier: 'bronze',
    threshold: 1
  },
  {
    id: 'time_keeper_silver',
    name: 'Time Keeper (Silver)',
    description: 'Selesaikan 10 sesi Time Attack',
    category: 'time_attack',
    tier: 'silver',
    threshold: 10
  },
  {
    id: 'time_keeper_gold',
    name: 'Time Keeper (Gold)',
    description: 'Selesaikan 25 sesi Time Attack',
    category: 'time_attack',
    tier: 'gold',
    threshold: 25
  },
  {
    id: 'minute_master_bronze',
    name: 'Minute Master (Bronze)',
    description: 'Capai 70 WPM di Time Attack 60 detik',
    category: 'time_attack',
    tier: 'bronze',
    threshold: 70
  },
  {
    id: 'minute_master_silver',
    name: 'Minute Master (Silver)',
    description: 'Capai 90 WPM di Time Attack 60 detik',
    category: 'time_attack',
    tier: 'silver',
    threshold: 90
  },
  {
    id: 'minute_master_gold',
    name: 'Minute Master (Gold)',
    description: 'Capai 110 WPM di Time Attack 60 detik',
    category: 'time_attack',
    tier: 'gold',
    threshold: 110
  },

  // KATEGORI BOSS
  {
    id: 'boss_slayer_bronze',
    name: 'Boss Slayer (Bronze)',
    description: 'Kalahkan 1 boss di Boss Battle mode',
    category: 'boss',
    tier: 'bronze',
    threshold: 1
  },
  {
    id: 'boss_slayer_silver',
    name: 'Boss Slayer (Silver)',
    description: 'Capai level 10 di Boss Battle mode',
    category: 'boss',
    tier: 'silver',
    threshold: 10
  },
  {
    id: 'boss_slayer_gold',
    name: 'Boss Slayer (Gold)',
    description: 'Capai level 20 di Boss Battle mode',
    category: 'boss',
    tier: 'gold',
    threshold: 20
  },
  {
    id: 'story_hero_bronze',
    name: 'Story Hero (Bronze)',
    description: 'Selesaikan Chapter 1 Story Mode',
    category: 'boss',
    tier: 'bronze',
    threshold: 1
  },
  {
    id: 'story_hero_silver',
    name: 'Story Hero (Silver)',
    description: 'Selesaikan Chapter 2 Story Mode',
    category: 'boss',
    tier: 'silver',
    threshold: 2
  },
  {
    id: 'story_hero_gold',
    name: 'Story Hero (Gold)',
    description: 'Kalahkan Doppelganger dengan sisa HP > 50%',
    category: 'boss',
    tier: 'gold',
    threshold: 50
  },
  {
    id: 'story_complete_a',
    name: 'The Age of Possibility',
    description: 'Selesaikan Story Mode dengan Ending A (Destroy the Origin)',
    category: 'boss',
    tier: 'gold',
    threshold: 1
  },
  {
    id: 'story_complete_b',
    name: 'The New Author',
    description: 'Selesaikan Story Mode dengan Ending B (Spare the Origin)',
    category: 'boss',
    tier: 'gold',
    threshold: 1
  },
  {
    id: 'story_complete_both',
    name: 'Both Sides of the Story',
    description: 'Dapatkan kedua ending Story Mode',
    category: 'boss',
    tier: 'gold',
    threshold: 2
  },

  // KATEGORI DAILY
  {
    id: 'daily_challenger_bronze',
    name: 'Daily Challenger (Bronze)',
    description: 'Streak daily challenge 7 hari berturut-turut',
    category: 'daily',
    tier: 'bronze',
    threshold: 7
  },
  {
    id: 'daily_challenger_silver',
    name: 'Daily Challenger (Silver)',
    description: 'Streak daily challenge 30 hari berturut-turut',
    category: 'daily',
    tier: 'silver',
    threshold: 30
  },
  {
    id: 'daily_challenger_gold',
    name: 'Daily Challenger (Gold)',
    description: 'Streak daily challenge 100 hari berturut-turut',
    category: 'daily',
    tier: 'gold',
    threshold: 100
  },
  {
    id: 'secret_prime_gold',
    name: 'Speed Demon',
    description: 'Kalahkan MonkeyType Prime',
    category: 'boss',
    tier: 'gold',
    threshold: 1
  },
  {
    id: 'secret_ghost_gold',
    name: 'Self-Aware',
    description: 'Kalahkan Ghost King',
    category: 'boss',
    tier: 'gold',
    threshold: 1
  },
  {
    id: 'secret_developer_gold',
    name: 'Rule Breaker',
    description: 'Kalahkan The Developer (boss rahasia paling sulit)',
    category: 'boss',
    tier: 'gold',
    threshold: 1
  }
];
