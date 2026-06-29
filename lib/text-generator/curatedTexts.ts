export interface CuratedTextSeed {
  content: string;
  language: 'id' | 'en';
  difficulty: 'easy' | 'medium' | 'hard';
  source: 'curated';
  char_count: number;
}

export const curatedTexts: CuratedTextSeed[] = [
  // ==========================================
  // BAHASA INDONESIA (25 Teks)
  // ==========================================
  // Easy (8 Teks)
  {
    content: 'Pagi hari yang cerah membuat hati menjadi sangat senang.',
    language: 'id',
    difficulty: 'easy',
    source: 'curated',
    char_count: 57,
  },
  {
    content: 'Kucing belang tiga sedang tidur siang di teras rumah.',
    language: 'id',
    difficulty: 'easy',
    source: 'curated',
    char_count: 53,
  },
  {
    content: 'Ayah membaca koran sambil minum kopi hangat di halaman.',
    language: 'id',
    difficulty: 'easy',
    source: 'curated',
    char_count: 55,
  },
  {
    content: 'Adik suka menggambar pemandangan gunung dan sawah hijau.',
    language: 'id',
    difficulty: 'easy',
    source: 'curated',
    char_count: 56,
  },
  {
    content: 'Mari kita jaga kebersihan lingkungan sekitar kita bersama.',
    language: 'id',
    difficulty: 'easy',
    source: 'curated',
    char_count: 58,
  },
  {
    content: 'Ibu membeli buah mangga dan pisang manis di pasar tradisional.',
    language: 'id',
    difficulty: 'easy',
    source: 'curated',
    char_count: 62,
  },
  {
    content: 'Buku adalah jendela dunia yang membuka cakrawala pengetahuan.',
    language: 'id',
    difficulty: 'easy',
    source: 'curated',
    char_count: 61,
  },
  {
    content: 'Olahraga teratur setiap pagi menjaga tubuh tetap sehat dan bugar.',
    language: 'id',
    difficulty: 'easy',
    source: 'curated',
    char_count: 65,
  },
  
  // Medium (9 Teks)
  {
    content: 'Bunga mawar merah itu tumbuh dengan sangat indah di taman belakang rumah kami, menebarkan wangi harum setiap sore.',
    language: 'id',
    difficulty: 'medium',
    source: 'curated',
    char_count: 114,
  },
  {
    content: 'Liburan ke pantai bersama seluruh anggota keluarga selalu menjadi momen paling menyenangkan dan tidak mudah dilupakan.',
    language: 'id',
    difficulty: 'medium',
    source: 'curated',
    char_count: 118,
  },
  {
    content: 'Hujan deras yang turun sejak tadi malam menyebabkan beberapa ruas jalan utama di pusat kota tergenang air cukup tinggi.',
    language: 'id',
    difficulty: 'medium',
    source: 'curated',
    char_count: 120,
  },
  {
    content: 'Belajar hal-hal baru setiap hari dapat meningkatkan kapasitas berpikir dan melatih ketajaman konsentrasi otak kita.',
    language: 'id',
    difficulty: 'medium',
    source: 'curated',
    char_count: 115,
  },
  {
    content: 'Makanan tradisional Indonesia terkenal dengan cita rasa rempah yang sangat kaya dan proses memasak yang cukup unik.',
    language: 'id',
    difficulty: 'medium',
    source: 'curated',
    char_count: 115,
  },
  {
    content: 'Persahabatan yang tulus dibangun di atas rasa saling percaya, menghargai perbedaan, dan selalu ada dalam suka maupun duka.',
    language: 'id',
    difficulty: 'medium',
    source: 'curated',
    char_count: 122,
  },
  {
    content: 'Untuk menjadi mahir dalam mengetik cepat, seseorang perlu melatih konsistensi posisi jari di atas papan ketik secara rutin.',
    language: 'id',
    difficulty: 'medium',
    source: 'curated',
    char_count: 123,
  },
  {
    content: 'Sepeda kayuh berwarna biru itu sudah menemani perjalanan sekolah saya selama lebih dari tiga tahun tanpa pernah mogok.',
    language: 'id',
    difficulty: 'medium',
    source: 'curated',
    char_count: 117,
  },
  {
    content: 'Pemandangan matahari terbenam di ufuk barat sore hari ini tampak sangat memukau dengan perpaduan warna jingga dan ungu.',
    language: 'id',
    difficulty: 'medium',
    source: 'curated',
    char_count: 118,
  },

  // Hard (8 Teks)
  {
    content: 'Masyarakat yang tinggal di lereng gunung api itu sudah sangat terbiasa dengan tanda-tanda alam yang ditunjukkan oleh aktivitas kawah, sehingga mereka selalu siap melakukan evakuasi mandiri demi menjaga keselamatan jiwa masing-masing.',
    language: 'id',
    difficulty: 'hard',
    source: 'curated',
    char_count: 242,
  },
  {
    content: 'Konservasi lingkungan hidup bukan hanya tanggung jawab pemerintah semata, melainkan tugas kolektif seluruh lapisan masyarakat demi menjamin kelangsungan hidup generasi mendatang yang bersih, sehat, serta berkecukupan sumber daya alam.',
    language: 'id',
    difficulty: 'hard',
    source: 'curated',
    char_count: 242,
  },
  {
    content: 'Menjaga keseimbangan antara kehidupan pekerjaan dengan waktu istirahat pribadi merupakan kunci utama dalam menghindari stres berlebih, yang pada akhirnya dapat mengoptimalkan produktivitas serta memelihara kesehatan mental jangka panjang.',
    language: 'id',
    difficulty: 'hard',
    source: 'curated',
    char_count: 246,
  },
  {
    content: 'Kesenian angklung tradisional dari Jawa Barat telah diakui oleh badan dunia UNESCO sebagai warisan budaya takbenda asli Indonesia, yang tidak hanya memiliki nilai estetika musik tinggi melainkan juga mengandung filosofi kebersamaan yang mendalam.',
    language: 'id',
    difficulty: 'hard',
    source: 'curated',
    char_count: 252,
  },
  {
    content: 'Menanam sayuran sendiri di pekarangan rumah menggunakan metode hidroponik sederhana kini menjadi tren gaya hidup sehat masyarakat perkotaan, yang selain menghemat pengeluaran bulanan juga menjamin ketersediaan bahan pangan segar bebas pestisida.',
    language: 'id',
    difficulty: 'hard',
    source: 'curated',
    char_count: 249,
  },
  {
    content: 'Kemampuan berkomunikasi secara efektif di depan publik merupakan aset berharga yang sangat dibutuhkan dalam dunia kerja profesional modern, karena hal tersebut mempermudah penyampaian ide taktis serta memperluas jejaring relasi bisnis secara global.',
    language: 'id',
    difficulty: 'hard',
    source: 'curated',
    char_count: 254,
  },
  {
    content: 'Membiasakan diri untuk minum air putih minimal delapan gelas sehari terbukti membantu kelancaran sistem metabolisme tubuh, memelihara kesehatan organ ginjal secara maksimal, serta menjaga tingkat konsentrasi berpikir tetap fokus sepanjang hari.',
    language: 'id',
    difficulty: 'hard',
    source: 'curated',
    char_count: 250,
  },
  {
    content: 'Kombinasi antara pola makan gizi seimbang dengan jadwal tidur yang teratur dapat memperkuat sistem imunitas tubuh dari serangan berbagai macam virus penyakit, terutama di tengah kondisi cuaca ekstrem pancaroba yang sering berganti secara mendadak.',
    language: 'id',
    difficulty: 'hard',
    source: 'curated',
    char_count: 251,
  },

  // ==========================================
  // ENGLISH (25 Teks)
  // ==========================================
  // Easy (8 Teks)
  {
    content: 'Reading books is a wonderful hobby that relaxes the mind.',
    language: 'en',
    difficulty: 'easy',
    source: 'curated',
    char_count: 57,
  },
  {
    content: 'The little puppy barked happily when its owner came home.',
    language: 'en',
    difficulty: 'easy',
    source: 'curated',
    char_count: 57,
  },
  {
    content: 'A warm cup of tea makes cold winter mornings much better.',
    language: 'en',
    difficulty: 'easy',
    source: 'curated',
    char_count: 57,
  },
  {
    content: 'Trees provide us with fresh oxygen and cool green shade.',
    language: 'en',
    difficulty: 'easy',
    source: 'curated',
    char_count: 56,
  },
  {
    content: 'Always try to be kind to everyone you meet in life.',
    language: 'en',
    difficulty: 'easy',
    source: 'curated',
    char_count: 51,
  },
  {
    content: 'The stars shine brightly in the dark midnight sky.',
    language: 'en',
    difficulty: 'easy',
    source: 'curated',
    char_count: 50,
  },
  {
    content: 'He likes to play guitar and sing old acoustic songs.',
    language: 'en',
    difficulty: 'easy',
    source: 'curated',
    char_count: 52,
  },
  {
    content: 'She painted a beautiful landscape with water colors.',
    language: 'en',
    difficulty: 'easy',
    source: 'curated',
    char_count: 52,
  },

  // Medium (9 Teks)
  {
    content: 'Learning a second language can open up new opportunities for traveling and meeting people from different cultures.',
    language: 'en',
    difficulty: 'medium',
    source: 'curated',
    char_count: 115,
  },
  {
    content: 'A healthy breakfast in the morning provides the necessary fuel and energy to keep you active throughout the entire day.',
    language: 'en',
    difficulty: 'medium',
    source: 'curated',
    char_count: 120,
  },
  {
    content: 'The small wooden cabin by the quiet lake was the perfect place for them to escape the busy and noisy city life.',
    language: 'en',
    difficulty: 'medium',
    source: 'curated',
    char_count: 112,
  },
  {
    content: 'Regular exercise combined with a well balanced diet is highly recommended for maintaining a healthy physical weight.',
    language: 'en',
    difficulty: 'medium',
    source: 'curated',
    char_count: 117,
  },
  {
    content: 'Patience and persistence are key virtues when you are trying to learn complex skills like playing a musical instrument.',
    language: 'en',
    difficulty: 'medium',
    source: 'curated',
    char_count: 120,
  },
  {
    content: 'The old museum downtown houses an impressive collection of historical artifacts from ancient civilizations around the world.',
    language: 'en',
    difficulty: 'medium',
    source: 'curated',
    char_count: 124,
  },
  {
    content: 'Walking in nature has been scientifically proven to reduce stress levels, improve mood, and boost creative thinking skills.',
    language: 'en',
    difficulty: 'medium',
    source: 'curated',
    char_count: 123,
  },
  {
    content: 'Many people find that listening to classical music helps them concentrate better while studying or working on projects.',
    language: 'en',
    difficulty: 'medium',
    source: 'curated',
    char_count: 119,
  },
  {
    content: 'The sunset over the ocean horizon painted the evening clouds with soft shades of orange, pink, and glowing gold.',
    language: 'en',
    difficulty: 'medium',
    source: 'curated',
    char_count: 114,
  },

  // Hard (8 Teks)
  {
    content: 'Developing a successful daily routine requires a clear understanding of your personal priorities, combined with the discipline to stick to your plans even when you feel tired or lack the immediate motivation to complete your scheduled tasks.',
    language: 'en',
    difficulty: 'hard',
    source: 'curated',
    char_count: 247,
  },
  {
    content: 'Scientific research continuously suggests that maintaining strong social connections with friends and family members plays a critical role in preserving mental health, increasing longevity, and enhancing overall emotional well-being.',
    language: 'en',
    difficulty: 'hard',
    source: 'curated',
    char_count: 243,
  },
  {
    content: 'Protecting global biodiversity is essential because every single species plays a unique role in maintaining the balance of ecosystems, which in turn provides humanity with clean air, fresh water, fertile soil, and crucial medical resources.',
    language: 'en',
    difficulty: 'hard',
    source: 'curated',
    char_count: 245,
  },
  {
    content: 'Effective time management is not about working longer hours, but rather about learning how to work smarter by allocating specific blocks of time to high-priority tasks and eliminating unnecessary distractions that reduce your daily output.',
    language: 'en',
    difficulty: 'hard',
    source: 'curated',
    char_count: 248,
  },
  {
    content: 'Artistic expression in its various forms allows individuals to communicate complex emotions and abstract ideas that words alone often fail to capture, fostering empathy and deeper understanding among diverse communities across the globe.',
    language: 'en',
    difficulty: 'hard',
    source: 'curated',
    char_count: 248,
  },
  {
    content: 'The rapid expansion of urban areas presents significant challenges for sustainable development, requiring city planners to design efficient public transportation networks, green infrastructure, and affordable housing solutions for citizens.',
    language: 'en',
    difficulty: 'hard',
    source: 'curated',
    char_count: 248,
  },
  {
    content: 'Cultivating mindfulness through daily meditation practices can help individuals develop a calm mind, improve emotional resilience in stressful situations, and increase their overall capacity for appreciation and happiness in everyday life.',
    language: 'en',
    difficulty: 'hard',
    source: 'curated',
    char_count: 249,
  },
  {
    content: 'Volunteering in local community projects not only provides vital support to those in need, but also offers volunteers a profound sense of purpose, helps them acquire valuable new skills, and builds strong networks of friendly neighborhood support.',
    language: 'en',
    difficulty: 'hard',
    source: 'curated',
    char_count: 251,
  }
];
