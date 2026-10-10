import { Category, ServicePackage } from "./types";
import { MOCK_CATEGORIES, MOCK_PACKAGES } from "../mock/data";

const inMemoryCategories = [...MOCK_CATEGORIES];
const inMemoryPackages = [...MOCK_PACKAGES];

export async function getCategories(): Promise<Category[]> {
  return inMemoryCategories.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
}

export async function getPackages(categoryId?: string): Promise<ServicePackage[]> {
  if (categoryId) {
    return inMemoryPackages.filter((p) => p.category_id === categoryId);
  }
  return inMemoryPackages;
}

export async function saveCategory(category: Partial<Category> & { name: string }): Promise<Category> {
  const index = inMemoryCategories.findIndex((c) => c.id === category.id);
  if (index >= 0) {
    const updated = { ...inMemoryCategories[index], ...category };
    inMemoryCategories[index] = updated;
    return updated;
  } else {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
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

export async function savePackage(pkg: Partial<ServicePackage> & { name: string; price: number }): Promise<ServicePackage> {
  const index = inMemoryPackages.findIndex((p) => p.id === pkg.id);
  const cat = inMemoryCategories.find((c) => c.id === pkg.category_id);

  if (index >= 0) {
    const updated = {
      ...inMemoryPackages[index],
      ...pkg,
      category_name: cat ? cat.name : inMemoryPackages[index].category_name,
    };
    inMemoryPackages[index] = updated;
    return updated;
  } else {
    const newPkg: ServicePackage = {
      id: `pkg-${Date.now()}`,
      category_id: pkg.category_id || (inMemoryCategories[0]?.id ?? "cat-1"),
      category_name: cat?.name || "Plumbing",
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price,
      est_duration_minutes: pkg.est_duration_minutes || 60,
      inclusions: pkg.inclusions || [],
      exclusions: pkg.exclusions || [],
      is_active: pkg.is_active !== undefined ? pkg.is_active : true,
      worker_count: 0,
      created_at: new Date().toISOString(),
    };
    inMemoryPackages.push(newPkg);
    return newPkg;
  }
}
