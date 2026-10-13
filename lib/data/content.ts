import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { logAdminAudit } from "./audit";
import {
  AnnouncementContent,
  HeroContent,
  PlusBannerContent,
  LegalContent,
  FaqItem,
  SiteContentState,
  DEFAULT_SITE_CONTENT,
  DEFAULT_FAQ_ITEMS,
} from "./content-types";

export type {
  AnnouncementContent,
  HeroContent,
  PlusBannerContent,
  LegalContent,
  FaqItem,
  SiteContentState,
};
export { DEFAULT_SITE_CONTENT, DEFAULT_FAQ_ITEMS };

// In-memory cache for live synchronization
let inMemoryContent: SiteContentState = { ...DEFAULT_SITE_CONTENT };
let inMemoryFaq: FaqItem[] = [...DEFAULT_FAQ_ITEMS];

export async function getSiteContent(): Promise<SiteContentState> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("site_content").select("*");

    if (!error && data && data.length > 0) {
      data.forEach((row) => {
        if (row.key in inMemoryContent) {
          (inMemoryContent as any)[row.key] = {
            ...(inMemoryContent as any)[row.key],
            ...(row.value || {}),
          };
        }
      });
    }
  } catch {
    // fallback
  }

  return { ...inMemoryContent };
}

export async function saveSiteContentSection<K extends keyof SiteContentState>(
  sectionKey: K,
  value: SiteContentState[K],
  userId?: string
): Promise<SiteContentState[K]> {
  inMemoryContent[sectionKey] = {
    ...inMemoryContent[sectionKey],
    ...value,
  };

  try {
    const supabase = createAdminClient();
    await supabase.from("site_content").upsert({
      key: sectionKey,
      value: inMemoryContent[sectionKey],
      updated_by: userId || null,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // handled
  }

  try {
    revalidatePath("/");
    revalidatePath("/admin/content");
  } catch {}

  await logAdminAudit({
    eventType: "content_updated",
    actorId: userId,
    actorName: "Admin Utama",
    details: {
      section: sectionKey,
    },
  });

  return inMemoryContent[sectionKey];
}

export async function getFaqItems(onlyActive: boolean = false): Promise<FaqItem[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase.from("faq_items").select("*").order("sort_order", { ascending: true });
    if (onlyActive) {
      query = query.eq("is_active", true);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      inMemoryFaq = data.map((d) => ({
        id: d.id,
        question: d.question,
        answer: d.answer,
        sort_order: d.sort_order ?? 0,
        is_active: Boolean(d.is_active),
        updated_at: d.updated_at,
      }));
    }
  } catch {
    // fallback
  }

  const items = onlyActive ? inMemoryFaq.filter((f) => f.is_active) : inMemoryFaq;
  return [...items].sort((a, b) => a.sort_order - b.sort_order);
}

export async function saveFaqItem(item: Partial<FaqItem> & { question: string; answer: string }): Promise<FaqItem> {
  const existingIdx = inMemoryFaq.findIndex((f) => f.id === item.id);
  const now = new Date().toISOString();

  let savedItem: FaqItem;
  if (existingIdx >= 0) {
    savedItem = {
      ...inMemoryFaq[existingIdx],
      ...item,
      updated_at: now,
    };
    inMemoryFaq[existingIdx] = savedItem;
  } else {
    savedItem = {
      id: item.id || `faq-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      question: item.question.trim(),
      answer: item.answer.trim(),
      sort_order: item.sort_order ?? inMemoryFaq.length + 1,
      is_active: item.is_active !== undefined ? item.is_active : true,
      updated_at: now,
    };
    inMemoryFaq.push(savedItem);
  }

  try {
    const supabase = createAdminClient();
    await supabase.from("faq_items").upsert({
      id: savedItem.id,
      question: savedItem.question,
      answer: savedItem.answer,
      sort_order: savedItem.sort_order,
      is_active: savedItem.is_active,
      updated_at: savedItem.updated_at,
    });
  } catch {}

  try {
    revalidatePath("/");
    revalidatePath("/admin/content");
  } catch {}

  return savedItem;
}

export async function deleteFaqItem(id: string): Promise<boolean> {
  inMemoryFaq = inMemoryFaq.filter((f) => f.id !== id);

  try {
    const supabase = createAdminClient();
    await supabase.from("faq_items").delete().eq("id", id);
  } catch {}

  try {
    revalidatePath("/");
    revalidatePath("/admin/content");
  } catch {}

  return true;
}

export async function reorderFaqItems(orderedIds: string[]): Promise<FaqItem[]> {
  inMemoryFaq = inMemoryFaq.map((item) => {
    const idx = orderedIds.indexOf(item.id);
    if (idx !== -1) {
      return { ...item, sort_order: idx + 1 };
    }
    return item;
  });

  try {
    const supabase = createAdminClient();
    for (const item of inMemoryFaq) {
      await supabase.from("faq_items").update({ sort_order: item.sort_order }).eq("id", item.id);
    }
  } catch {}

  try {
    revalidatePath("/");
  } catch {}

  return [...inMemoryFaq].sort((a, b) => a.sort_order - b.sort_order);
}
