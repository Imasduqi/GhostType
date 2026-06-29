import { wordPoolID } from './wordPoolID';

// Templates for each difficulty level
const EASY_TEMPLATES = [
  '{subjek} {predikat} {objek}.',
  '{subjek} {predikat} {keteranganTempat}.',
  '{subjek} sedang {predikat} {objek} {keteranganTempat}.',
  '{subjek} yang {kataSifat} {predikat} {objek}.',
  '{keteranganWaktu} {subjek} {predikat} {objek}.',
  '{subjek} membeli {objek} yang {kataSifat}.',
  '{subjek} {predikat} {objek} {keteranganWaktu}.',
  '{subjek} yang {kataSifat} sedang berada {keteranganTempat}.',
  '{subjek} membawa {objek} {keteranganTempat}.',
  '{keteranganWaktu} {subjek} melihat {subjek} yang {kataSifat}.'
];

const MEDIUM_TEMPLATES = [
  '{subjek} {predikat} {objek} dan {subjek} {predikat} {objek} {keteranganWaktu}.',
  '{subjek} sedang {predikat} {objek} ketika {subjek} {predikat} {keteranganTempat}.',
  '{subjek} {predikat} {objek} {keteranganTempat}, tetapi {objek} itu {kataSifat}.',
  '{keteranganWaktu}, {subjek} yang {kataSifat} {predikat} {objek} {keteranganTempat}.',
  '{subjek} selalu {predikat} {objek} karena {subjek} sangat {kataSifat}.',
  '{subjek} menaruh {objek} {keteranganTempat} setelah {predikat} {objek} itu.',
  '{subjek} yang {kataSifat} suka {predikat} {objek} {keteranganTempat} {keteranganWaktu}.',
  '{keteranganWaktu} {subjek} {predikat} {objek}, lalu {subjek} pergi {keteranganTempat}.',
  '{subjek} membantu {subjek} yang {kataSifat} untuk {predikat} {objek} {keteranganTempat}.',
  '{subjek} mencari {objek} yang {kataSifat} di {keteranganTempat} {keteranganWaktu}.'
];

const HARD_TEMPLATES = [
  'Apakah {subjek} {predikat} {objek} {keteranganTempat}? {subjek} {predikat} {objek} {keteranganWaktu}.',
  '{subjek} {predikat} {objek} {keteranganTempat}. Kenapa {subjek} yang {kataSifat} itu {predikat} {objek} {keteranganWaktu}?',
  '{subjek} {predikat} {objek} {keteranganTempat}, tetapi {subjek} {predikat} {objek} yang {kataSifat} {keteranganWaktu}.',
  '{subjek} harus {predikat} {objek} di {keteranganTempat}! {keteranganWaktu}, {subjek} tampak {kataSifat}.',
  'Jika {subjek} tidak {predikat} {objek} {keteranganWaktu}, maka {subjek} akan mencari {objek} {keteranganTempat}.',
  '{subjek} sedang {predikat} {objek} yang {kataSifat} {keteranganTempat}; padahal {subjek} {predikat} {objek} {keteranganWaktu}.',
  'Bagaimana bisa {subjek} yang {kataSifat} {predikat} {objek} {keteranganTempat}? Sungguh {subjek} {kataSifat} sekali!',
  '{subjek} mengambil {objek} {keteranganTempat}, kemudian {subjek} memberikan {objek} yang {kataSifat} itu.',
  'Meskipun {subjek} {predikat} {objek} {keteranganWaktu}, {subjek} tetap {predikat} {objek} {keteranganTempat}.',
  '{subjek} yang {kataSifat} tidak boleh {predikat} {objek} {keteranganTempat}! Siapa yang {predikat} {objek} itu?'
];

/**
 * Capitalizes the first letter of each sentence in a text.
 */
function capitalizeSentences(text: string): string {
  // Split on punctuation (.!? followed by spaces or end of string)
  const parts = text.split(/([.!?]\s+)/);
  
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] && !/^[.!?]/.test(parts[i])) {
      const trimmed = parts[i].trimStart();
      const leadingSpaces = parts[i].slice(0, parts[i].length - trimmed.length);
      if (trimmed.length > 0) {
        parts[i] = leadingSpaces + trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      }
    }
  }
  
  return parts.join('');
}

/**
 * Generates structured Indonesian text based on grammatical templates.
 * F-TEXT-02: Pure random grammatical generator using templates.
 * 
 * @param difficulty Level of difficulty ('easy', 'medium', 'hard')
 * @returns Generated target text string
 */
export function generateRandomText(difficulty: 'easy' | 'medium' | 'hard'): string {
  // Choose templates list
  const templates = 
    difficulty === 'easy' ? EASY_TEMPLATES :
    difficulty === 'medium' ? MEDIUM_TEMPLATES :
    HARD_TEMPLATES;

  // Pick a random template
  const randomIndex = Math.floor(Math.random() * templates.length);
  let template = templates[randomIndex];

  // Helper to get random item from pool and keep track of used words to avoid duplicates in a single generation
  const usedWords = new Set<string>();
  
  const getRandomWord = (category: keyof typeof wordPoolID): string => {
    const pool = wordPoolID[category];
    const available = pool.filter(word => !usedWords.has(word));
    
    // Fallback to full pool if all words are exhausted (unlikely with our pool size)
    const activePool = available.length > 0 ? available : pool;
    
    const wordIndex = Math.floor(Math.random() * activePool.length);
    const chosen = activePool[wordIndex];
    usedWords.add(chosen);
    return chosen;
  };

  // Replace placeholders in the template
  let result = template;

  // We loop to replace all placeholders.
  // Note: Replacing placeholder-by-placeholder allows multiple placeholders of the same type to get different words.
  while (result.includes('{subjek}')) {
    result = result.replace('{subjek}', getRandomWord('subjek'));
  }
  while (result.includes('{predikat}')) {
    result = result.replace('{predikat}', getRandomWord('predikat'));
  }
  while (result.includes('{objek}')) {
    result = result.replace('{objek}', getRandomWord('objek'));
  }
  while (result.includes('{keteranganTempat}')) {
    result = result.replace('{keteranganTempat}', getRandomWord('keteranganTempat'));
  }
  while (result.includes('{keteranganWaktu}')) {
    result = result.replace('{keteranganWaktu}', getRandomWord('keteranganWaktu'));
  }
  while (result.includes('{kataSifat}')) {
    result = result.replace('{kataSifat}', getRandomWord('kataSifat'));
  }

  // Capitalize the first letter of all sentences (e.g. at start and after punctuation)
  return capitalizeSentences(result);
}
