export interface WordPool {
  subjek: string[];
  predikat: string[];
  objek: string[];
  keteranganTempat: string[];
  keteranganWaktu: string[];
  kataSifat: string[];
}

/**
 * Daftar kosakata bahasa Indonesia sehari-hari dikelompokkan per kategori gramatikal.
 * MURNI tanpa istilah IT/teknis, dapat diedit dan ditambahkan dengan mudah.
 */
export const wordPoolID: WordPool = {
  subjek: [
    'anak', 'ayah', 'ibu', 'kakak', 'adik', 'guru', 'dokter', 'petani', 'kucing', 'kelinci',
    'anjing', 'burung', 'ayam', 'kuda', 'gajah', 'kawan', 'teman', 'tetangga', 'paman', 'bibi',
    'kakek', 'nenek', 'pedagang', 'nelayan', 'pemuda', 'murid', 'perawat', 'polisi', 'tentara', 'sopir',
    'masinis', 'pilot', 'nahkoda', 'koki', 'pelayan', 'kasir', 'penjahit', 'pembeli', 'pengunjung', 'pasien',
    'penonton', 'penyanyi', 'penari', 'pelukis', 'penulis', 'wartawan', 'fotografer', 'atlet', 'pelatih', 'wasit',
    'hakim', 'jaksa', 'pengacara', 'direktur', 'manajer', 'karyawan', 'sekretaris', 'satpam', 'montir', 'kurir',
    'sepupu', 'keponakan', 'mertua', 'menantu', 'ipar', 'majikan', 'buruh', 'bayi', 'balita', 'remaja',
    'lansia', 'pria', 'wanita', 'suami', 'istri', 'sahabat', 'rekan', 'mitra', 'tamu', 'raja',
    'ratu', 'pangeran', 'putri', 'pahlawan', 'prajurit', 'komandan', 'presiden', 'menteri', 'gubernur', 'bupati',
    'camat', 'lurah', 'kades', 'warga', 'rakyat', 'bebek', 'angsa', 'sapi', 'kerbau', 'kambing',
    'domba', 'singa', 'harimau', 'jerapah', 'monyet', 'tikus', 'landak', 'rubah', 'serigala', 'beruang',
    'panda', 'koala', 'kanguru', 'lumba-lumba', 'paus', 'hiu', 'ikan', 'kura-kura', 'katak', 'ular',
    'kadal', 'buaya', 'komodo', 'kupu-kupu', 'lebah', 'semut', 'belalang', 'capung', 'laba-laba', 'ulat',
    'kijang', 'rusa', 'unta', 'keledai', 'tupai', 'elang', 'merpati', 'kakaktua', 'gagak', 'pinguin',
    'anjing laut', 'berang-berang', 'kepiting', 'gurita', 'cumi-cumi', 'siput', 'cacing', 'kumbang', 'kunang-kunang', 'tokek'
  ],
  
  predikat: [
    'membaca', 'menulis', 'memakan', 'meminum', 'melihat', 'mendengar', 'membawa', 'mengambil',
    'menaruh', 'membuang', 'mencuci', 'memasak', 'menyapu', 'membantu', 'mencari', 'mengejar',
    'membeli', 'menjual', 'meminjam', 'menjaga', 'memotong', 'membuat', 'menggambar', 'membuka',
    'menutup', 'memanggil', 'menemukan', 'mencium', 'meraba', 'memegang', 'menyimpan', 'menangkap',
    'melepas', 'membayar', 'menukar', 'mengembalikan', 'merawat', 'membersihkan', 'mengepel', 'menyiram',
    'membelah', 'mengupas', 'mengiris', 'menggoreng', 'merebus', 'membakar', 'memanggang', 'merakit',
    'memperbaiki', 'merusak', 'melukis', 'mewarnai', 'memotret', 'merekam', 'memutar', 'menyetel',
    'menghidupkan', 'mematikan', 'mengunci', 'mengetuk', 'mengundang', 'menyapa', 'memeluk', 'menjabat',
    'memukul', 'menendang', 'melempar', 'mendorong', 'menarik', 'mengangkat', 'menurunkan', 'memanjat',
    'menuruni', 'melompati', 'menyeberang', 'melewati', 'mengendarai', 'menyetir', 'menumpangi', 'memarkir',
    'menuntun', 'menggendong', 'memuji', 'memarahi', 'menasihati', 'mengajari', 'mempelajari', 'menghafal',
    'menghitung', 'mengukur', 'menimbang', 'mencatat', 'merangkum', 'menerjemahkan', 'mengetik', 'mengecat',
    'memaku', 'menggergaji', 'memahat', 'menyusun', 'menata', 'merapikan', 'menghias', 'membungkus',
    'merobek', 'menggunting', 'menempel', 'menjahit', 'merajut', 'menyulam', 'menenun', 'menjemur',
    'menyetrika', 'melipat', 'memakai', 'melepas', 'mencoba', 'bertanya', 'menjawab', 'berbicara',
    'berkata', 'menyanyi', 'berbisik', 'berteriak', 'tertawa', 'menangis', 'tersenyum', 'cemberut',
    'berjalan', 'berlari', 'melompat', 'menari', 'berenang', 'terbang', 'merangkak', 'beristirahat',
    'tidur', 'bangun', 'berdiri', 'duduk', 'membungkuk', 'berputar', 'menonton', 'menunjuk',
    'membagikan', 'memberikan', 'menerima', 'menyukai', 'mencintai', 'membenci', 'menginginkan', 'membutuhkan'
  ],
  
  objek: [
    'buku', 'pena', 'pensil', 'tas', 'sepatu', 'baju', 'celana', 'topi', 'piring', 'gelas',
    'sendok', 'garpu', 'roti', 'susu', 'kopi', 'teh', 'nasi', 'sayur', 'buah', 'daging',
    'sepeda', 'mobil', 'motor', 'meja', 'kursi', 'kertas', 'payung', 'kunci', 'kue', 'ikan',
    'air', 'jus', 'sup', 'mie', 'keju', 'mentega', 'cokelat', 'permen', 'es krim', 'kentang',
    'wortel', 'bayam', 'kangkung', 'kubis', 'tomat', 'cabai', 'bawang', 'jahe', 'kunyit', 'jeruk',
    'apel', 'pisang', 'mangga', 'anggur', 'stroberi', 'semangka', 'melon', 'nanas', 'pepaya', 'kelapa',
    'jambu', 'durian', 'rambutan', 'nangka', 'salak', 'duku', 'sawo', 'sirsak', 'alpukat', 'ceri',
    'persik', 'kurma', 'kismis', 'madu', 'selai', 'saus', 'garam', 'gula', 'minyak', 'tepung',
    'telur', 'tahu', 'tempe', 'bakso', 'sosis', 'kornet', 'nugget', 'sate', 'soto', 'rendang',
    'gado-gado', 'salad', 'pizza', 'burger', 'pasta', 'spageti', 'sandwich', 'biskuit', 'keripik', 'kerupuk',
    'martabak', 'donat', 'puding', 'agar-agar', 'jeli', 'sirup', 'soda', 'limun', 'yogurt', 'oatmeal',
    'sereal', 'bubur', 'ketupat', 'lontong', 'lemper', 'pastel', 'risoles', 'kroket', 'lumpia', 'bakwan',
    'mendoan', 'koin', 'peta', 'kotak', 'keranjang', 'kartu', 'foto', 'bunga', 'daun', 'batu',
    'pasir', 'kayu', 'logam', 'kaca', 'plastik', 'kapas', 'wol', 'sutra', 'selimut', 'bantal',
    'handuk', 'sabun', 'sikat', 'pasta gigi', 'cermin', 'sisir', 'jam', 'arloji', 'lampu', 'lilin',
    'korek', 'benang', 'jarum', 'gunting', 'palu', 'paku', 'gergaji', 'ember', 'sapu', 'kemoceng'
  ],
  
  keteranganTempat: [
    'di rumah', 'di sekolah', 'di pasar', 'di jalan', 'di jembatan', 'di gunung', 'di sungai', 'di laut',
    'di pantai', 'di hutan', 'di taman', 'di kamar', 'di teras', 'di kebun', 'di dapur', 'di perpustakaan',
    'di warung', 'di lapangan', 'di bioskop', 'di museum', 'di kebun binatang', 'di stasiun', 'di bandara', 'di pelabuhan',
    'di terminal', 'di hotel', 'di restoran', 'di kafe', 'di kantor', 'di bank', 'di pos', 'di apotek',
    'di rumah sakit', 'di klinik', 'di puskesmas', 'di masjid', 'di gereja', 'di pura', 'di wihara', 'di kelenteng',
    'di toko', 'di butik', 'di salon', 'di bengkel', 'di pabrik', 'di sawah', 'di ladang', 'di tambak',
    'di kolam', 'di danau', 'di telaga', 'di bukit', 'di lembah', 'di gua', 'di air terjun', 'di pulau',
    'di kota', 'di desa', 'di kampung', 'di perumahan', 'di apartemen', 'di kos', 'di asrama', 'di panti asuhan',
    'di halte', 'di trotoar', 'di persimpangan', 'di gang', 'di lorong', 'di halaman', 'di balkon', 'di loteng',
    'di basement', 'di gudang', 'di garasi', 'di ruang tamu', 'di ruang keluarga', 'di ruang makan', 'di ruang kerja', 'di ruang kelas',
    'di aula', 'di lobi', 'di koridor', 'di tangga', 'di lift', 'di eskalator', 'di atap', 'di halaman belakang',
    'di halaman depan', 'di kebun raya', 'di kebun teh', 'di kebun kopi', 'di kebun buah', 'di taman kota', 'di taman bermain', 'di taman bunga',
    'di taman safari', 'di suaka margasatwa', 'di cagar alam', 'di puncak gunung', 'di lereng bukit', 'di kaki gunung', 'di lembah sungai', 'di pinggir sungai',
    'di muara', 'di teluk', 'di selat', 'di samudera', 'di terumbu karang', 'di mercusuar', 'di dermaga', 'di landasan pacu',
    'di hangar', 'di gerbong kereta', 'di dalam bus', 'di dalam taksi', 'di dalam kapal', 'di dalam pesawat', 'di bawah pohon', 'di bawah jembatan',
    'di bawah meja', 'di atas kursi', 'di balik pintu', 'di depan gerbang', 'di luar pagar', 'di dalam gedung', 'di stadion', 'di pameran',
    'di pusat kebugaran', 'di peternakan', 'di kandang', 'di toko roti', 'di toko buku', 'di toko mainan', 'di swalayan', 'di mal',
    'di sirkus', 'di pekarangan', 'di lapangan bola', 'di lapangan basket', 'di lapangan tenis', 'di lapangan bulu tangkis', 'di lapangan golf', 'di arena balap',
    'di sirkuit', 'di lintasan lari', 'di kolam renang', 'di pantai berpasir', 'di tengah laut', 'di kutub utara', 'di gurun pasir', 'di sabana',
    'di rawa-rawa'
  ],
  
  keteranganWaktu: [
    'pagi ini', 'siang ini', 'sore ini', 'malam ini', 'kemarin pagi', 'besok sore', 'setiap hari', 'saat senja',
    'tadi siang', 'malam kemarin', 'minggu lalu', 'hari ini', 'saat fajar', 'sore kemarin', 'subuh tadi', 'tadi pagi',
    'nanti sore', 'nanti malam', 'besok lusa', 'kemarin lusa', 'minggu depan', 'bulan depan', 'tahun depan', 'bulan lalu',
    'tahun lalu', 'setiap minggu', 'setiap bulan', 'setiap tahun', 'hampir setiap jam', 'beberapa menit yang lalu', 'satu jam lagi', 'dua hari yang lalu',
    'tiga hari ke depan', 'saat matahari terbit', 'saat matahari terbenam', 'tengah malam nanti', 'dini hari tadi', 'pada jam makan siang', 'menjelang malam', 'saat turun hujan',
    'ketika badai reda', 'saat musim kemarau', 'ketika musim hujan tiba', 'saat liburan sekolah', 'pada hari libur', 'di hari kerja', 'setiap akhir pekan', 'sewaktu kecil',
    'di masa depan', 'di masa lalu', 'saat jam istirahat', 'ketika lonceng berbunyi', 'sesudah makan pagi', 'sebelum tidur malam', 'saat hari raya', 'pada hari ulang tahun',
    'di kala senggang', 'saat cuaca cerah', 'ketika awan mendung', 'di pagi hari yang dingin', 'pada sore hari yang hangat', 'saat malam yang sunyi', 'ketika fajar menyingsing', 'sewaktu matahari tepat di atas',
    'saat rembulan bersinar', 'ketika bintang bermunculan', 'di saat yang tepat', 'pada waktu yang bersamaan', 'sesaat kemudian', 'beberapa saat setelah itu', 'sejak saat itu', 'sampai hari ini',
    'hingga akhir pekan nanti', 'selama beberapa hari', 'sepanjang hari kemarin', 'sepanjang malam ini', 'di awal bulan', 'di pertengahan tahun', 'di akhir pekan', 'menjelang akhir tahun',
    'pada awal musim semi', 'di akhir musim gugur', 'saat malam natal', 'pada malam tahun baru', 'ketika upacara dimulai', 'saat rapat berlangsung', 'sewaktu pameran dibuka', 'pada jam sibuk',
    'ketika jalanan sepi', 'di waktu luang', 'saat libur panjang', 'pada musim panen', 'sewaktu gerhana terjadi', 'ketika angin bertiup kencang', 'saat ombak sedang pasang', 'ketika air laut surut',
    'pada hari keberangkatan', 'saat tiba di tujuan', 'sesaat sebelum pergi', 'setelah makan malam', 'sebelum makan siang', 'pada waktu istirahat kopi', 'dua hari sekali', 'dua kali seminggu',
    'tiga kali setahun', 'sekali-sekali', 'secara tiba-tiba', 'dalam sekejap mata', 'sejak kemarin', 'selama satu jam', 'di pagi hari', 'di siang hari',
    'di sore hari', 'di malam hari', 'di hari Senin pagi', 'di hari Jumat malam', 'di hari Sabtu malam', 'di hari Minggu sore', 'sepanjang minggu ini', 'selama akhir pekan',
    'di akhir hari', 'sebelum fajar menyingsing', 'setelah senja berlalu', 'tepat tengah hari', 'tepat tengah malam', 'saat jam berdentang dua belas', 'pada jam buka toko', 'pada jam tutup toko',
    'selama libur musim panas', 'selama libur musim dingin', 'pada hari libur nasional', 'ketika festival berlangsung', 'saat konser dimulai', 'sebelum pertandingan dimulai', 'setelah kompetisi selesai', 'pada malam hari yang dingin',
    'pada pagi hari yang cerah', 'saat badai salju terjadi', 'ketika petir menyambar', 'saat kabut tebal turun', 'pada hari yang bersejarah', 'di momen penting'
  ],
  
  kataSifat: [
    'besar', 'kecil', 'panjang', 'pendek', 'tinggi', 'rendah', 'lebar', 'sempit', 'tebal', 'tipis',
    'bersih', 'kotor', 'baru', 'lama', 'muda', 'tua', 'baik', 'buruk', 'ramah', 'rajin',
    'malas', 'senang', 'sedih', 'marah', 'takut', 'berani', 'lincah', 'indah', 'wangi', 'murah',
    'mahal', 'lambat', 'cepat', 'kuat', 'lemah', 'berat', 'ringan', 'keras', 'lunak', 'kasar',
    'halus', 'tajam', 'tumpul', 'terang', 'gelap', 'panas', 'dinign', 'hangat', 'sejuk', 'basah',
    'kering', 'ramai', 'sepi', 'bising', 'sunyi', 'rapi', 'berantakan', 'luas', 'dalam', 'dangkal',
    'penuh', 'kosong', 'mudah', 'sulit', 'sukar', 'pintar', 'bodoh', 'cerdas', 'pandai', 'dungu',
    'disiplin', 'jujur', 'bohong', 'pelit', 'dermawan', 'sombong', 'sopan', 'santun', 'nakal', 'penurut',
    'tenang', 'gelisah', 'gugup', 'panik', 'cemas', 'khawatir', 'aman', 'bahaya', 'sehat', 'sakit',
    'segar', 'layu', 'harum', 'busuk', 'lezat', 'enak', 'hambar', 'manis', 'pahit', 'asin',
    'asam', 'pedas', 'gurih', 'kenyang', 'lapar', 'haus', 'capek', 'lelah', 'letih', 'bugar',
    'aktif', 'pasif', 'sibuk', 'senggang', 'bebas', 'terikat', 'dekat', 'jauh', 'erat', 'renggang',
    'mirip', 'beda', 'sama', 'lain', 'asing', 'akrab', 'terkenal', 'populer', 'biasa', 'istimewa',
    'unik', 'langka', 'umum', 'khusus', 'kurus', 'gemuk', 'cantik', 'tampan', 'jelek', 'kejam',
    'kasar', 'lembut', 'penakut', 'bijaksana', 'kaya', 'miskin', 'nyaring', 'sayup', 'redup', 'jernih'
  ]
};
