import { Category, ServicePackage } from "./types";
import { MOCK_CATEGORIES, MOCK_PACKAGES } from "../mock/data";

const inMemoryCategories = [...MOCK_CATEGORIES];
const inMemoryPackages = [...MOCK_PACKAGES];

export async function getCategories(): Promise<Category[]> {
  // Update package counts dynamically
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
  if (categoryId) {
    return inMemoryPackages.filter(
      (p) => p.category_id === categoryId || p.category_slug === categoryId
    );
  }
  return inMemoryPackages;
}

export async function getPackageById(id: string): Promise<ServicePackage | null> {
  return (
    inMemoryPackages.find(
      (p) => p.id === id || p.name.toLowerCase().replace(/\s+/g, "-") === id
    ) || null
  );
}

export async function saveCategory(
  category: Partial<Category> & { name: string }
): Promise<Category> {
  const index = inMemoryCategories.findIndex((c) => c.id === category.id);
  if (index >= 0) {
    const updated: Category = {
      ...inMemoryCategories[index],
      ...category,
      slug: category.slug || inMemoryCategories[index].slug,
    };
    inMemoryCategories[index] = updated;
    return updated;
  } else {
    const newCat: Category = {
      id: category.id || `cat-${Date.now()}`,
      name: category.name,
      slug: category.slug || category.name.toLowerCase().replace(/\s+/g, "-"),
      icon: category.icon || "Setting4",
      is_active: category.is_active !== undefined ? category.is_active : true,
      order_index: inMemoryCategories.length + 1,
      package_count: 0,
      created_at: new Date().toISOString(),
    };
    inMemoryCategories.push(newCat);
    return newCat;
  }
}

export async function savePackage(
  pkg: Partial<ServicePackage> & { name: string; price: number }
): Promise<ServicePackage> {
  const index = inMemoryPackages.findIndex((p) => p.id === pkg.id);
  const cat = inMemoryCategories.find(
    (c) => c.id === pkg.category_id || c.slug === pkg.category_slug
  );

  if (index >= 0) {
    const updated: ServicePackage = {
      ...inMemoryPackages[index],
      ...pkg,
      category_id: cat ? cat.id : inMemoryPackages[index].category_id,
      category_name: cat ? cat.name : inMemoryPackages[index].category_name,
      category_slug: cat ? cat.slug : inMemoryPackages[index].category_slug,
    };
    inMemoryPackages[index] = updated;
    return updated;
  } else {
    const newPkg: ServicePackage = {
      id: pkg.id || `pkg-${Date.now()}`,
      category_id: cat ? cat.id : (inMemoryCategories[0]?.id ?? "cat-1"),
      category_name: cat?.name || "Plumbing",
      category_slug: cat?.slug || "plumbing",
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
        pkg.image_url !== undefined
          ? pkg.image_url
          : "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80",
      created_at: new Date().toISOString(),
    };
    inMemoryPackages.push(newPkg);
    return newPkg;
  }
}

export async function deletePackage(id: string): Promise<boolean> {
  const index = inMemoryPackages.findIndex((p) => p.id === id);
  if (index >= 0) {
    inMemoryPackages.splice(index, 1);
    return true;
  }
  return false;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const index = inMemoryCategories.findIndex((c) => c.id === id);
  if (index >= 0) {
    inMemoryCategories.splice(index, 1);
    return true;
  }
  return false;
}
