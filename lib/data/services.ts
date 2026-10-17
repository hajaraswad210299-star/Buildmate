import { Category, ServicePackage } from "./types";
import { MOCK_CATEGORIES, MOCK_PACKAGES } from "../mock/data";

const inMemoryCategories = [...MOCK_CATEGORIES];
const inMemoryPackages = [...MOCK_PACKAGES];

function isUuid(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const CATEGORY_UUID_MAP: Record<string, string> = {
  "cat-1": "a0000000-0000-0000-0000-000000000001",
  plumbing: "a0000000-0000-0000-0000-000000000001",
  "cat-2": "a0000000-0000-0000-0000-000000000002",
  pengecatan: "a0000000-0000-0000-0000-000000000002",
  "cat-3": "a0000000-0000-0000-0000-000000000003",
  "perbaikan-umum": "a0000000-0000-0000-0000-000000000003",
  "cat-4": "a0000000-0000-0000-0000-000000000004",
  "servis-ac": "a0000000-0000-0000-0000-000000000004",
};

async function getSupabase() {
  try {
    if (typeof window === "undefined") {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      return createAdminClient();
    } else {
      const { createClient } = await import("@/lib/supabase/client");
      return createClient();
    }
  } catch (err) {
    console.warn("Could not initialize Supabase in services lib:", err);
    return null;
  }
}

export async function getCategories(): Promise<Category[]> {
  // If in browser, fetch through API route for seamless DB access
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/services", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          return data.categories;
        }
      }
    } catch (err) {
      console.warn("Client fetch /api/services error:", err);
    }
  }

  try {
    const supabase = await getSupabase();
    if (supabase) {
      const { data: dbCategories, error } = await supabase
        .from("categories")
        .select("*")
        .order("order_index", { ascending: true });

      if (!error && dbCategories && dbCategories.length > 0) {
        // Fetch package counts
        const { data: dbPkgs } = await supabase
          .from("service_packages")
          .select("category_id, is_active");

        const pkgs = dbPkgs || [];
        const mapped: Category[] = dbCategories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon || "Setting4",
          is_active: c.is_active ?? true,
          order_index: c.order_index ?? 0,
          package_count: pkgs.filter(
            (p) => (p.category_id === c.id || p.category_id === c.slug) && p.is_active
          ).length,
          created_at: c.created_at,
        }));

        // The DB is the source of truth once it answers: mock categories must not leak in,
        // otherwise users can pick ids that do not exist in public.categories.
        return mapped.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      }
    }
  } catch (err) {
    console.warn("getCategories DB error, falling back to mock:", err);
  }

  // Fallback to in-memory
  return inMemoryCategories
    .map((cat) => ({
      ...cat,
      package_count: inMemoryPackages.filter(
        (p) => (p.category_id === cat.id || p.category_slug === cat.slug) && p.is_active
      ).length,
    }))
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
}

export async function getPackages(categoryId?: string): Promise<ServicePackage[]> {
  // If in browser, fetch through API route for seamless DB access
  if (typeof window !== "undefined") {
    try {
      const url = categoryId
        ? `/api/services?category=${encodeURIComponent(categoryId)}`
        : "/api/services";
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.packages && Array.isArray(data.packages) && data.packages.length > 0) {
          if (categoryId) {
            const catUuid = CATEGORY_UUID_MAP[categoryId] || categoryId;
            return data.packages.filter(
              (p: ServicePackage) =>
                p.category_id === categoryId ||
                p.category_id === catUuid ||
                p.category_slug === categoryId
            );
          }
          return data.packages;
        }
      }
    } catch (err) {
      console.warn("Client fetch /api/services error:", err);
    }
  }

  try {
    const supabase = await getSupabase();
    if (supabase) {
      const { data: dbPackages, error } = await supabase
        .from("service_packages")
        .select("*, categories(id, name, slug)")
        .order("created_at", { ascending: true });

      if (!error && dbPackages && dbPackages.length > 0) {
        const mapped: ServicePackage[] = dbPackages.map((p) => {
          const inMemMatch = inMemoryPackages.find((im) => im.id === p.id);
          const mockMatch = MOCK_PACKAGES.find(
            (m) => m.name.toLowerCase() === p.name.toLowerCase()
          );

          return {
            id: p.id,
            category_id: p.category_id,
            category_name: p.categories?.name || inMemMatch?.category_name || "Layanan",
            category_slug: p.categories?.slug || inMemMatch?.category_slug || "layanan",
            name: p.name,
            description: p.description || "",
            price: Number(p.price) || 100000,
            est_duration_minutes: Number(p.est_duration_minutes) || 60,
            inclusions: p.inclusions || ["Penyelesaian pengerjaan sesuai standar SOP"],
            exclusions: p.exclusions || ["Material suku cadang baru disediakan pelanggan"],
            is_active: p.is_active ?? true,
            worker_count: inMemMatch?.worker_count || mockMatch?.worker_count || 5,
            badge: inMemMatch?.badge || mockMatch?.badge || "STANDAR",
            image_url:
              inMemMatch?.image_url ||
              mockMatch?.image_url ||
              "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80",
            created_at: p.created_at,
          };
        });

        // No mock packages here: their ids (pkg-1, ...) are not in service_packages, so
        // orders and worker_packages rows referencing them would fail.
        if (categoryId) {
          const catUuid = CATEGORY_UUID_MAP[categoryId] || categoryId;
          return mapped.filter(
            (p) =>
              p.category_id === categoryId ||
              p.category_id === catUuid ||
              p.category_slug === categoryId
          );
        }

        return mapped;
      }
    }
  } catch (err) {
    console.warn("getPackages DB error, falling back to mock:", err);
  }

  // Fallback to in-memory
  if (categoryId) {
    const catUuid = CATEGORY_UUID_MAP[categoryId] || categoryId;
    return inMemoryPackages.filter(
      (p) =>
        p.category_id === categoryId ||
        p.category_id === catUuid ||
        p.category_slug === categoryId
    );
  }
  return inMemoryPackages;
}

export async function getPackageById(id: string): Promise<ServicePackage | null> {
  // If in browser, fetch through API route for seamless DB access
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/services?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.package) {
          return data.package;
        }
      }
    } catch (err) {
      console.warn("Client fetch /api/services?id error:", err);
    }
  }

  const all = await getPackages();
  const match = all.find(
    (p) =>
      p.id === id ||
      p.name.toLowerCase().replace(/\s+/g, "-") === id.toLowerCase() ||
      p.name.toLowerCase() === id.toLowerCase()
  );
  if (match) return match;

  // Try direct DB lookup
  try {
    const supabase = await getSupabase();
    if (supabase) {
      let p: any = null;
      if (isUuid(id)) {
        const { data } = await supabase
          .from("service_packages")
          .select("*, categories(id, name, slug)")
          .eq("id", id)
          .maybeSingle();
        p = data;
      } else {
        const searchName = id.replace(/-/g, " ");
        const { data } = await supabase
          .from("service_packages")
          .select("*, categories(id, name, slug)")
          .ilike("name", `%${searchName}%`)
          .maybeSingle();
        p = data;
      }

      if (p) {
        const inMemMatch = inMemoryPackages.find((im) => im.id === p.id);
        const mockMatch = MOCK_PACKAGES.find(
          (m) => m.name.toLowerCase() === p.name.toLowerCase()
        );
        return {
          id: p.id,
          category_id: p.category_id,
          category_name: p.categories?.name || inMemMatch?.category_name || "Layanan",
          category_slug: p.categories?.slug || inMemMatch?.category_slug || "layanan",
          name: p.name,
          description: p.description || "",
          price: Number(p.price) || 100000,
          est_duration_minutes: Number(p.est_duration_minutes) || 60,
          inclusions: p.inclusions || ["Penyelesaian pengerjaan sesuai standar SOP"],
          exclusions: p.exclusions || ["Material suku cadang baru disediakan pelanggan"],
          is_active: p.is_active ?? true,
          worker_count: inMemMatch?.worker_count || mockMatch?.worker_count || 5,
          badge: inMemMatch?.badge || mockMatch?.badge || "STANDAR",
          image_url:
            inMemMatch?.image_url ||
            mockMatch?.image_url ||
            "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80",
          created_at: p.created_at,
        };
      }
    }
  } catch (err) {
    console.warn("getPackageById DB lookup error:", err);
  }

  return null;
}

export async function saveCategory(
  category: Partial<Category> & { name: string }
): Promise<Category> {
  const catId = isUuid(category.id) ? category.id! : generateUuid();
  const slug =
    category.slug ||
    category.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const newCat: Category = {
    id: catId,
    name: category.name,
    slug,
    icon: category.icon || "Setting4",
    is_active: category.is_active !== undefined ? category.is_active : true,
    order_index: category.order_index ?? inMemoryCategories.length + 1,
    package_count: category.package_count || 0,
    created_at: new Date().toISOString(),
  };

  const index = inMemoryCategories.findIndex(
    (c) => c.id === category.id || c.slug === slug
  );
  if (index >= 0) {
    inMemoryCategories[index] = { ...inMemoryCategories[index], ...newCat };
  } else {
    inMemoryCategories.push(newCat);
  }

  // Persist to Supabase DB
  try {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.from("categories").upsert(
        {
          id: catId,
          name: newCat.name,
          slug: newCat.slug,
          icon: newCat.icon,
          is_active: newCat.is_active,
          order_index: newCat.order_index,
        },
        { onConflict: "slug" }
      );
    }
  } catch (err) {
    console.warn("saveCategory DB error:", err);
  }

  return newCat;
}

export async function savePackage(
  pkg: Partial<ServicePackage> & { name: string; price: number }
): Promise<ServicePackage> {
  // Resolve valid UUID for category
  let resolvedCatId = pkg.category_id || "";
  let catName = pkg.category_name || "Layanan";
  let catSlug = pkg.category_slug || "layanan";

  if (!isUuid(resolvedCatId)) {
    if (CATEGORY_UUID_MAP[resolvedCatId]) {
      resolvedCatId = CATEGORY_UUID_MAP[resolvedCatId];
    } else {
      const cats = await getCategories();
      const matchCat = cats.find(
        (c) =>
          c.id === resolvedCatId ||
          c.slug === pkg.category_slug ||
          c.name === pkg.category_name
      );
      if (matchCat && isUuid(matchCat.id)) {
        resolvedCatId = matchCat.id;
        catName = matchCat.name;
        catSlug = matchCat.slug;
      } else {
        resolvedCatId = "a0000000-0000-0000-0000-000000000001";
      }
    }
  }

  const pkgId = isUuid(pkg.id) ? pkg.id! : generateUuid();

  const newPkg: ServicePackage = {
    id: pkgId,
    category_id: resolvedCatId,
    category_name: catName,
    category_slug: catSlug,
    name: pkg.name,
    description: pkg.description || "",
    price: Number(pkg.price) || 100000,
    est_duration_minutes: Number(pkg.est_duration_minutes) || 60,
    inclusions: pkg.inclusions || ["Penyelesaian pengerjaan sesuai standar SOP"],
    exclusions: pkg.exclusions || ["Material suku cadang baru disediakan pelanggan"],
    is_active: pkg.is_active !== undefined ? pkg.is_active : true,
    worker_count: pkg.worker_count || 6,
    badge: pkg.badge || "STANDAR",
    image_url:
      pkg.image_url ||
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80",
    created_at: new Date().toISOString(),
  };

  const index = inMemoryPackages.findIndex(
    (p) => p.id === pkg.id || p.id === pkgId
  );
  if (index >= 0) {
    inMemoryPackages[index] = { ...inMemoryPackages[index], ...newPkg };
  } else {
    inMemoryPackages.push(newPkg);
  }

  // Persist to Supabase DB
  try {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.from("service_packages").upsert(
        {
          id: pkgId,
          category_id: resolvedCatId,
          name: newPkg.name,
          description: newPkg.description,
          price: newPkg.price,
          est_duration_minutes: newPkg.est_duration_minutes,
          inclusions: newPkg.inclusions,
          exclusions: newPkg.exclusions,
          is_active: newPkg.is_active,
        },
        { onConflict: "id" }
      );
    }
  } catch (err) {
    console.warn("savePackage DB error:", err);
  }

  return newPkg;
}

export async function deletePackage(id: string): Promise<boolean> {
  const index = inMemoryPackages.findIndex((p) => p.id === id);
  if (index >= 0) {
    inMemoryPackages.splice(index, 1);
  }
  try {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.from("service_packages").delete().eq("id", id);
    }
  } catch (err) {
    console.warn("deletePackage DB error:", err);
  }
  return true;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const index = inMemoryCategories.findIndex((c) => c.id === id);
  if (index >= 0) {
    inMemoryCategories.splice(index, 1);
  }
  try {
    const supabase = await getSupabase();
    if (supabase) {
      await supabase.from("categories").delete().eq("id", id);
    }
  } catch (err) {
    console.warn("deleteCategory DB error:", err);
  }
  return true;
}
