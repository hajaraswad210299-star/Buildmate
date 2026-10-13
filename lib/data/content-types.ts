export interface AnnouncementContent {
  active: boolean;
  text: string;
  link: string;
}

export interface HeroContent {
  title: string;
  subtitle: string;
  photo_url: string;
  photo_alt: string;
}

export interface PlusBannerContent {
  title: string;
  benefit_1: string;
  benefit_2: string;
  button_text: string;
}

export interface LegalContent {
  terms_markdown: string;
  privacy_markdown: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  updated_at?: string;
}

export interface SiteContentState {
  announcement: AnnouncementContent;
  hero: HeroContent;
  plus_banner: PlusBannerContent;
  legal: LegalContent;
}

// Default values for site content (used as resilient fallback)
export const DEFAULT_SITE_CONTENT: SiteContentState = {
  announcement: {
    active: true,
    text: "BuildMate Plus — bebas biaya layanan & garansi pengerjaan ulang",
    link: "/plus",
  },
  hero: {
    title: "Tukang yang *tepat*, saat hunian membutuhkan.",
    subtitle: "Pilih tukang terverifikasi di kotamu dengan tarif paket pasti. Pembayaran diamankan di rekening bersama platform dan baru dicairkan setelah kamu puas dengan foto hasil kerja.",
    photo_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1800&auto=format&fit=crop&q=85",
    photo_alt: "Mitra tukang BuildMate siap melayani perbaikan hunian",
  },
  plus_banner: {
    title: "The BuildMate Shield",
    benefit_1: "Bebas biaya layanan untuk setiap pesanan perbaikan hunian",
    benefit_2: "Jaminan garansi pengerjaan ulang 14 hari & prioritas penugasan tukang",
    button_text: "Bergabung ke BuildMate Plus",
  },
  legal: {
    terms_markdown: `### Syarat & Ketentuan Layanan BuildMate
1. **Layanan:** BuildMate menyediakan platform pemesanan jasa tukang perbaikan rumah ringan dengan standar artisan.
2. **Pembayaran:** Pembayaran diamankan di rekening bersama platform (Midtrans Escrow). Dana baru diteruskan ke tukang setelah kamu memeriksa foto hasil kerja dan menyetujuinya.
3. **Garansi:** Setiap pesanan dilindungi garansi pengerjaan sesuai paket yang dipilih.`,
    privacy_markdown: `### Kebijakan Privasi BuildMate
1. **Perlindungan Data:** Kami menjaga kerahasiaan nomor telepon, alamat, dan data pesanan kamu.
2. **Penggunaan Data:** Alamat dan nomor kontak hanya dibagikan kepada mitra tukang yang ditugaskan setelah pesanan dibayar.`,
  },
};

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-1",
    question: "Bagaimana cara memesan tukang di BuildMate?",
    answer: "Pilih layanan yang kamu butuhkan, tentukan tanggal dan slot waktu kedatangan, lengkapi alamat dan foto masalah, lalu lakukan pembayaran aman. Sistem akan mencarikan mitra tukang terbaik.",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "faq-2",
    question: "Apakah tarif perbaikan sudah pasti tanpa biaya tersembunyi?",
    answer: "Ya! Semua paket di BuildMate memiliki tarif tetap (fixed-price) transparan tanpa biaya siluman. Rincian biaya terlihat jelas sebelum kamu membayar.",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "faq-3",
    question: "Bagaimana cara kerja Rekber Escrow platform?",
    answer: "Uang pembayaranmu disimpan aman di rekening bersama BuildMate. Dana baru kami cairkan ke tukang setelah kamu memeriksa bukti foto sebelum-sesudah dan mengonfirmasi pekerjaan selesai.",
    sort_order: 3,
    is_active: true,
  },
  {
    id: "faq-4",
    question: "Apa keuntungan bergabung dengan BuildMate Plus?",
    answer: "Member BuildMate Plus menikmati bebas biaya layanan di setiap pesanan perbaikan, jaminan garansi 14 hari, dan prioritas penugasan mitra tukang terbaik.",
    sort_order: 4,
    is_active: true,
  },
];
