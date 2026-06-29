import { curatedTexts, CuratedTextSeed } from '@/lib/text-generator/curatedTexts';

export type DailyChallengeType = 'speed_run' | 'accuracy_trial' | 'survival_reach' | 'boss_rush' | 'perfect_word';

export interface DailyChallenge {
  dateString: string; // YYYY-MM-DD
  seed: number;
  type: DailyChallengeType;
  targetValue: number;
  text?: string;
  textId?: string; // We'll resolve this in queries or page
  language: 'id' | 'en';
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  title: string;
}

class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 2147483648;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  choice<T>(arr: T[]): T {
    const idx = this.nextInt(0, arr.length - 1);
    return arr[idx];
  }
}

export function getChallengeDateString(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function generateDailyChallenge(date: Date): DailyChallenge {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const seed = year * 10000 + month * 100 + day;
  const dateString = getChallengeDateString(date);

  const rng = new SeededRandom(seed);

  // 1. Pick challenge type
  const types: DailyChallengeType[] = ['speed_run', 'accuracy_trial', 'survival_reach', 'boss_rush', 'perfect_word'];
  const type = rng.choice(types);

  // 2. Pick language & difficulty deterministically
  const language = rng.nextInt(0, 1) === 0 ? 'id' : 'en';
  const difficulties: ('easy' | 'medium' | 'hard')[] = ['easy', 'medium', 'hard'];
  const difficulty = rng.choice(difficulties);

  // 3. Pick curated text
  const filteredTexts = curatedTexts.filter(t => t.language === language && t.difficulty === difficulty);
  const selectedTextObj = rng.choice(filteredTexts.length > 0 ? filteredTexts : curatedTexts);
  const text = selectedTextObj.content;

  // 4. Set target values based on type
  let targetValue = 0;
  let title = '';
  let description = '';

  switch (type) {
    case 'speed_run':
      // Target WPM between 50 and 90, in increments of 5 WPM
      targetValue = 50 + rng.nextInt(0, 8) * 5;
      title = 'Speed Run';
      description = `Capai kecepatan mengetik minimal ${targetValue} WPM di teks yang ditentukan.`;
      break;

    case 'accuracy_trial':
      // Target accuracy between 90% and 99%
      targetValue = rng.nextInt(90, 99);
      title = 'Accuracy Trial';
      description = `Selesaikan sesi Time Attack 60 detik dengan akurasi minimal ${targetValue}%.`;
      break;

    case 'survival_reach':
      // Target survival score between 500 and 4000, in increments of 250
      targetValue = 500 + rng.nextInt(0, 14) * 250;
      title = 'Survival Reach';
      description = `Capai skor minimal ${targetValue} di mode Survival.`;
      break;

    case 'boss_rush':
      // Target boss rush level between 3 and 15
      targetValue = rng.nextInt(3, 15);
      title = 'Boss Rush';
      description = `Kalahkan bos dan capai minimal Level ${targetValue} di mode Boss Battle.`;
      break;

    case 'perfect_word':
      // Target max typos between 0 and 5
      targetValue = rng.nextInt(0, 5);
      title = 'Perfect Word';
      description = `Selesaikan race pada teks yang ditentukan dengan maksimal ${targetValue} kesalahan ketik (typo).`;
      break;
  }

  return {
    dateString,
    seed,
    type,
    targetValue,
    text: (type === 'speed_run' || type === 'perfect_word') ? text : undefined,
    language,
    difficulty,
    title,
    description
  };
}
