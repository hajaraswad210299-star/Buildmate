/**
 * BuildMate Permission Catalog (SPEC_ADMIN.md A12)
 * Pure typed definition of all system permissions, module groupings,
 * presets, implication rules, and utility helpers.
 */

export const ALL_PERMISSIONS = [
  "dashboard.view",
  "orders.view",
  "orders.manage",
  "workers.view",
  "workers.manage",
  "workers.review",
  "services.view",
  "services.manage",
  "transactions.view",
  "payouts.view",
  "payouts.manage",
  "customers.view",
  "content.manage",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export interface ModulePermissionConfig {
  moduleKey: string;
  moduleName: string;
  description: string;
  viewPermission?: Permission;
  managePermissions: {
    permission: Permission;
    label: string;
    description: string;
  }[];
}

export const MODULE_PERMISSIONS: ModulePermissionConfig[] = [
  {
    moduleKey: "dashboard",
    moduleName: "Dashboard",
    description: "Statistik, ringkasan transaksi & antrean platform",
    viewPermission: "dashboard.view",
    managePermissions: [],
  },
  {
    moduleKey: "orders",
    moduleName: "Pesanan",
    description: "Daftar, detail, dispatching, dan intervensi pesanan",
    viewPermission: "orders.view",
    managePermissions: [
      {
        permission: "orders.manage",
        label: "Kelola Pesanan",
        description: "Tugaskan manual, cari ulang, lepas tukang, komplain, refund & foto hasil",
      },
    ],
  },
  {
    moduleKey: "workers",
    moduleName: "Tukang (Mitra)",
    description: "Katalog tukang, verifikasi aplikasi pendaftaran & status",
    viewPermission: "workers.view",
    managePermissions: [
      {
        permission: "workers.manage",
        label: "Kelola Tukang",
        description: "Tambah, ubah data, dan nonaktifkan/aktifkan mitra",
      },
      {
        permission: "workers.review",
        label: "Verifikasi Pendaftaran",
        description: "Setujui atau tolak aplikasi pendaftaran mandiri tukang",
      },
    ],
  },
  {
    moduleKey: "services",
    moduleName: "Layanan & Kategori",
    description: "Katalog paket harga tetap dan kategori perbaikan",
    viewPermission: "services.view",
    managePermissions: [
      {
        permission: "services.manage",
        label: "Kelola Layanan",
        description: "Tambah, ubah, dan nonaktifkan kategori dan paket perbaikan",
      },
    ],
  },
  {
    moduleKey: "transactions",
    moduleName: "Transaksi",
    description: "Riwayat pembayaran pelanggan & payload webhook Midtrans",
    viewPermission: "transactions.view",
    managePermissions: [],
  },
  {
    moduleKey: "payouts",
    moduleName: "Pencairan Dana",
    description: "Ledger dana escrow dan pencairan ke rekening mitra",
    viewPermission: "payouts.view",
    managePermissions: [
      {
        permission: "payouts.manage",
        label: "Kelola Pencairan",
        description: "Tandai dana pesanan telah dicairkan ke rekening mitra",
      },
    ],
  },
  {
    moduleKey: "customers",
    moduleName: "Pelanggan & Member",
    description: "Daftar pelanggan dan status langganan BuildMate Plus",
    viewPermission: "customers.view",
    managePermissions: [],
  },
  {
    moduleKey: "content",
    moduleName: "Konten Situs (CMS)",
    description: "Pengumuman, hero beranda, banner Plus, FAQ & halaman legal",
    managePermissions: [
      {
        permission: "content.manage",
        label: "Kelola Konten",
        description: "Ubah teks, banner, FAQ, dan gambar beranda publik",
      },
    ],
  },
];

/**
 * Implication rules: Checking a manage/review permission automatically grants the module's view permission.
 */
export const PERMISSION_IMPLICATIONS: Record<string, Permission[]> = {
  "orders.manage": ["orders.view"],
  "workers.manage": ["workers.view"],
  "workers.review": ["workers.view"],
  "services.manage": ["services.view"],
  "payouts.manage": ["payouts.view"],
};

/**
 * Preset Roles defined in SPEC_ADMIN.md A10 & A12
 */
export interface RolePreset {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isPreset: boolean;
}

export const PRESET_ROLES: RolePreset[] = [
  {
    id: "preset-editor-konten",
    name: "Editor Konten",
    description: "Dapat melihat dashboard dan mengelola seluruh konten publik CMS.",
    permissions: ["dashboard.view", "content.manage"],
    isPreset: true,
  },
  {
    id: "preset-pemantau-tukang",
    name: "Pemantau Tukang",
    description: "Dapat memantau pesanan, melihat mitra, dan memverifikasi aplikasi pendaftaran tukang.",
    permissions: ["dashboard.view", "workers.view", "workers.review", "orders.view"],
    isPreset: true,
  },
];

/**
 * Normalizes permissions list by automatically adding implied "view" permissions.
 */
export function normalizePermissions(permissions: (Permission | string)[]): Permission[] {
  const set = new Set<Permission>();

  for (const perm of permissions) {
    if (ALL_PERMISSIONS.includes(perm as Permission)) {
      set.add(perm as Permission);
      const implied = PERMISSION_IMPLICATIONS[perm];
      if (implied) {
        for (const imp of implied) {
          set.add(imp);
        }
      }
    }
  }

  return Array.from(set);
}

/**
 * Checks if a given permission is satisfied.
 * Admin Utama always passes.
 */
export function hasPermission(
  userPermissions: string[] | undefined,
  required: Permission | Permission[],
  isAdmin: boolean = false
): boolean {
  if (isAdmin) return true;
  if (!userPermissions || userPermissions.length === 0) return false;

  const requiredList = Array.isArray(required) ? required : [required];
  // If multiple are specified, user must possess at least one unless specified otherwise
  return requiredList.some((req) => userPermissions.includes(req));
}

/**
 * Returns human-readable summary of accessible modules for a list of permissions.
 */
export function getAccessibleModulesSummary(permissions: string[]): string[] {
  const modules: string[] = [];
  const normalized = normalizePermissions(permissions);

  for (const mod of MODULE_PERMISSIONS) {
    const hasView = mod.viewPermission && normalized.includes(mod.viewPermission);
    const hasManage = mod.managePermissions.some((mp) => normalized.includes(mp.permission));
    if (hasView || hasManage) {
      modules.push(mod.moduleName);
    }
  }

  return modules;
}

/**
 * Returns the first route a user is allowed to view based on their permissions.
 */
export function getFirstAllowedRoute(permissions: string[], isAdmin: boolean = false): string {
  if (isAdmin || permissions.includes("dashboard.view")) return "/admin";
  if (permissions.includes("orders.view")) return "/admin/orders";
  if (permissions.includes("workers.view")) return "/admin/workers";
  if (permissions.includes("services.view")) return "/admin/services";
  if (permissions.includes("transactions.view")) return "/admin/transactions";
  if (permissions.includes("payouts.view")) return "/admin/payouts";
  if (permissions.includes("customers.view")) return "/admin/customers";
  if (permissions.includes("content.manage")) return "/admin/content";
  return "/admin/no-access";
}
