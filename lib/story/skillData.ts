export interface StorySkill {
  id: string;
  name: string;
  type: 'active' | 'passive' | 'ultimate';
  effectDescription: string;
  cooldown: number; // in seconds, 0 for passive
}

export const STORY_SKILLS: StorySkill[] = [
  {
    id: 'focus_mode',
    name: 'Focus Mode',
    type: 'active',
    effectDescription: 'Waktu per kata melambat 30% selama 5 detik',
    cooldown: 30
  },
  {
    id: 'purify',
    name: 'Purify',
    type: 'active',
    effectDescription: 'Hapus debuff aktif (seperti Backspace Terkunci)',
    cooldown: 40
  },
  {
    id: 'second_chance',
    name: 'Second Chance',
    type: 'active',
    effectDescription: 'Typo berikutnya tidak dihitung',
    cooldown: 60
  },
  {
    id: 'adrenaline',
    name: 'Adrenaline Rush',
    type: 'active',
    effectDescription: 'Damage ke boss +50% selama 10 detik',
    cooldown: 45
  },
  {
    id: 'healing_word',
    name: 'Healing Word',
    type: 'active',
    effectDescription: 'Pulihkan 20 HP player secara instan',
    cooldown: 50
  },
  {
    id: 'resilience',
    name: 'Resilience',
    type: 'passive',
    effectDescription: 'Damage yang diterima player -15% permanen',
    cooldown: 0
  },
  {
    id: 'precision',
    name: 'Precision',
    type: 'passive',
    effectDescription: 'Ketik 5 kata tanpa typo = bonus damage +10%',
    cooldown: 0
  },
  {
    id: 'vitality',
    name: 'Vitality',
    type: 'passive',
    effectDescription: 'HP maksimum player bertambah menjadi 120',
    cooldown: 0
  },
  {
    id: 'time_shield',
    name: 'Time Shield',
    type: 'active',
    effectDescription: 'Buffer waktu per kata bertambah 2 detik selama 15 detik',
    cooldown: 60
  },
  {
    id: 'word_burst',
    name: 'Word Burst',
    type: 'ultimate',
    effectDescription: '5 kata berikutnya damage ke boss ×3',
    cooldown: 0
  },
  {
    id: 'time_stop',
    name: 'Time Stop',
    type: 'ultimate',
    effectDescription: 'Semua timer kata freeze selama 8 detik (boss tidak menyerang, kata tidak expire)',
    cooldown: 0
  },
  {
    id: 'full_heal',
    name: 'Full Heal',
    type: 'ultimate',
    effectDescription: 'Pulihkan HP player ke nilai maksimal (100, atau 120 jika Vitality aktif)',
    cooldown: 0
  },
  {
    id: 'chain_break',
    name: 'Chain Break',
    type: 'ultimate',
    effectDescription: 'Nonaktifkan semua ability boss aktif selama 10 detik (ability rotation juga di-pause selama durasi ini)',
    cooldown: 0
  },
  {
    id: 'overload',
    name: 'Overload',
    type: 'ultimate',
    effectDescription: 'Selama 10 detik, setiap karakter benar memberikan damage flat 1 ke boss',
    cooldown: 0
  }
];
