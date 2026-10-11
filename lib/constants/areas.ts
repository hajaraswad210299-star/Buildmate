export const SERVICE_AREAS = [
  "Semua Area",
  "Jakarta Selatan",
  "Jakarta Timur",
  "Jakarta Barat",
  "Jakarta Pusat",
  "Jakarta Utara",
  "Tangerang Selatan",
  "Depok",
  "Bekasi",
] as const;

export interface DistrictItem {
  id: string;
  name: string;
  area: string;
}

export const DISTRICTS: DistrictItem[] = [
  { id: "d-1", name: "Tebet", area: "Jakarta Selatan" },
  { id: "d-2", name: "Kebayoran Baru", area: "Jakarta Selatan" },
  { id: "d-3", name: "Cilandak", area: "Jakarta Selatan" },
  { id: "d-4", name: "Mampang Prapatan", area: "Jakarta Selatan" },
  { id: "d-5", name: "Pasar Minggu", area: "Jakarta Selatan" },
  { id: "d-6", name: "Pancoran", area: "Jakarta Selatan" },
  { id: "d-7", name: "Setiabudi", area: "Jakarta Selatan" },
  { id: "d-8", name: "Pesanggrahan", area: "Jakarta Selatan" },
  { id: "d-9", name: "Jagakarsa", area: "Jakarta Selatan" },
  { id: "d-10", name: "Duren Sawit", area: "Jakarta Timur" },
  { id: "d-11", name: "Jatinegara", area: "Jakarta Timur" },
  { id: "d-12", name: "Matraman", area: "Jakarta Timur" },
  { id: "d-13", name: "Kebon Jeruk", area: "Jakarta Barat" },
  { id: "d-14", name: "Palmerah", area: "Jakarta Barat" },
  { id: "d-15", name: "Kembangan", area: "Jakarta Barat" },
  { id: "d-16", name: "Menteng", area: "Jakarta Pusat" },
  { id: "d-17", name: "Tanah Abang", area: "Jakarta Pusat" },
  { id: "d-18", name: "Kelapa Gading", area: "Jakarta Utara" },
  { id: "d-19", name: "Ciputat", area: "Tangerang Selatan" },
  { id: "d-20", name: "Pamulang", area: "Tangerang Selatan" },
  { id: "d-21", name: "Cinere", area: "Depok" },
  { id: "d-22", name: "Pondok Gede", area: "Bekasi" },
];
