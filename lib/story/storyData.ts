export interface StoryBoss {
  id: string;
  name: string;
  role: string;
  dialogIntro: string;
  dialogPhase: string;
  dialogDefeat: string;
  codex: string;
  weakness: string;
  ability: string;
  ultimate: string;
}

export interface StoryChapter {
  id: number;
  title: string;
  description: string;
  bosses: StoryBoss[];
}

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 1,
    title: 'The Broken Library',
    description: 'Sebuah perpustakaan kuno yang hancur akibat virus typo.',
    bosses: [
      {
        id: 'librarian',
        name: 'The Librarian',
        role: 'Tutorial Boss',
        dialogIntro: 'Setiap kesalahan akan tercatat.',
        dialogPhase: 'Kau pikir bisa lolos?',
        dialogDefeat: 'Arsip... akan selalu ada...',
        codex: 'Penjaga perpustakaan yang terkena korupsi typo. Konon ia dulu adalah penjaga paling teliti di Lexicon Realm.',
        weakness: 'Accuracy',
        ability: 'missing_letter',
        ultimate: 'silent_library'
      },
      {
        id: 'typo_goblin',
        name: 'The Typo Goblin',
        role: 'Chaos Boss',
        dialogIntro: 'Sedikit salah tetap salah!',
        dialogPhase: 'Kau terlalu lambat!',
        dialogDefeat: 'T-tidak mungkin... Goblin... kalah?!',
        codex: 'Makhluk kecil yang gemar menciptakan kekacauan huruf. Tidak ada yang tahu dari mana asalnya.',
        weakness: 'Combo',
        ability: 'letter_swap',
        ultimate: 'typo_storm'
      },
      {
        id: 'syntax_spider',
        name: 'Syntax Spider',
        role: 'Debuff Boss',
        dialogIntro: 'Semakin bergerak, semakin terjerat.',
        dialogPhase: 'Jaringku tak bisa kau putus.',
        dialogDefeat: 'Jaringku... hancur...',
        codex: 'Laba-laba raksasa yang menjerat pemain dalam jebakan waktu. Katanya ia dulunya adalah algorithm pencari kata.',
        weakness: 'WPM tinggi',
        ability: 'web_trap',
        ultimate: 'infinite_web'
      }
    ]
  },
  {
    id: 2,
    title: 'Grammar Prison',
    description: 'Penjara bawah tanah tempat kata-kata salah dihukum selamanya.',
    bosses: [
      {
        id: 'sentence_warden',
        name: 'Sentence Warden',
        role: 'Tank Boss',
        dialogIntro: 'Kesalahan adalah kejahatan.',
        dialogPhase: 'Sel ini tidak bisa kau buka!',
        dialogDefeat: 'Penjara... akhirnya terbuka...',
        codex: 'Penjaga Grammar Prison. Ia percaya bahwa setiap typo harus dihukum berat.',
        weakness: 'Long word typing',
        ability: 'lock_input',
        ultimate: 'prison_sentence'
      },
      {
        id: 'silent_judge',
        name: 'Silent Judge',
        role: 'Precision Boss',
        dialogIntro: 'Aku hanya melihat hasil.',
        dialogPhase: 'Masih ada kesalahan.',
        dialogDefeat: '...Keputusanku... salah.',
        codex: 'Hakim tertinggi Grammar Prison. Tidak pernah berbicara kecuali saat menghukum.',
        weakness: '100% accuracy streak',
        ability: 'judgment',
        ultimate: 'final_verdict'
      },
      {
        id: 'doppelganger',
        name: 'Doppelganger',
        role: 'Mirror Boss',
        dialogIntro: 'Aku adalah dirimu.',
        dialogPhase: 'Kita semakin serupa.',
        dialogDefeat: 'Refleksi... tidak bisa mengalahkan aslinya...',
        codex: 'Makhluk yang mengkopi performa pemain. Tidak ada yang tahu identitas aslinya.',
        weakness: 'Konsistensi',
        ability: 'copy_performance',
        ultimate: 'reflection'
      }
    ]
  },
  {
    id: 3,
    title: 'Corrupted Archive',
    description: 'Arsip kuno terenkripsi tempat data-data terhapus disimpan secara acak.',
    bosses: [
      {
        id: 'memory_eater',
        name: 'Memory Eater',
        role: 'Mind Attack Boss',
        dialogIntro: 'Apa kau masih ingat kata itu?',
        dialogPhase: 'Ingatanmu mulai kabur.',
        dialogDefeat: 'Aku... terlupakan...',
        codex: 'Entitas yang hidup dari ingatan yang terhapus. Konon ia dulunya adalah perpustakaan digital yang kehilangan semua datanya.',
        weakness: 'Kecepatan reaksi',
        ability: 'forgetfulness',
        ultimate: 'memory_wipe'
      },
      {
        id: 'glitch_beast',
        name: 'Glitch Beast',
        role: 'Visual Chaos Boss',
        dialogIntro: '010101 ERROR.',
        dialogPhase: 'SYSTEM CORRUPTED.',
        dialogDefeat: '...signal lost...',
        codex: 'Makhluk yang lahir dari data yang rusak. Tidak ada yang tahu bentuk aslinya karena selalu berubah.',
        weakness: 'Accuracy',
        ability: 'screen_distortion',
        ultimate: 'corrupted_frame'
      },
      {
        id: 'pixel_tyrant',
        name: 'Pixel Tyrant',
        role: 'Retro Boss',
        dialogIntro: 'INSERT SKILL.',
        dialogPhase: 'LAG DETECTED.',
        dialogDefeat: 'GAME OVER... for me.',
        codex: 'Penguasa dunia piksel kuno yang menolak kemajuan teknologi. Beroperasi dengan logika retro yang sudah usang.',
        weakness: 'Combo panjang',
        ability: 'lag_spike',
        ultimate: 'cartridge_corruption'
      }
    ]
  },
  {
    id: 4,
    title: 'Digital Abyss',
    description: 'Palung terdalam dunia digital tempat koneksi lambat dan kode mentah mengalir.',
    bosses: [
      {
        id: 'the_compiler',
        name: 'The Compiler',
        role: 'Technical Boss',
        dialogIntro: 'Build failed.',
        dialogPhase: 'Recompiling...',
        dialogDefeat: '...compilation successful. You win.',
        codex: 'Entitas yang mengubah seluruh dunia menjadi kode yang harus dikompilasi dengan sempurna. Satu kesalahan kecil menghancurkan segalanya.',
        weakness: 'Kata panjang',
        ability: 'syntax_error',
        ultimate: 'compilation_failure'
      },
      {
        id: 'network_phantom',
        name: 'Network Phantom',
        role: 'Delay Boss',
        dialogIntro: 'Connection unstable.',
        dialogPhase: 'Packet loss detected.',
        dialogDefeat: '...disconnected.',
        codex: 'Hantu yang hidup di antara server dan klien. Tidak pernah benar-benar ada di satu tempat.',
        weakness: 'Stabilitas',
        ability: 'latency',
        ultimate: 'packet_loss'
      },
      {
        id: 'firewall_dragon',
        name: 'Firewall Dragon',
        role: 'Burst Damage Boss',
        dialogIntro: 'Access denied.',
        dialogPhase: 'Firewall intensifying.',
        dialogDefeat: '...firewall breached.',
        codex: 'Naga digital yang melindungi batas antara dunia digital dan dunia nyata. Tidak ada yang pernah melewatinya... sampai sekarang.',
        weakness: 'Accuracy',
        ability: 'burn',
        ultimate: 'inferno_protocol'
      }
    ]
  },
  {
    id: 5,
    title: 'The Origin',
    description: 'Fase E — Final Chapter: The Origin. Menghadapi pencipta asli dari Lexicon Realm.',
    bosses: [
      {
        id: 'the_origin',
        name: 'The Origin',
        role: 'Creator of Lexicon',
        dialogIntro: 'Jadi... Kau berhasil sampai ke sini.',
        dialogPhase: 'Setiap cerita membutuhkan aturan.',
        dialogDefeat: 'Bagus. Cerita ini akhirnya memiliki akhir.',
        codex: 'Pencipta asli Lexicon Realm. Berada di luar batasan aturan dan cerita.',
        weakness: 'Semua Skill',
        ability: 'rotation',
        ultimate: 'origin_corruption'
      }
    ]
  }
];
