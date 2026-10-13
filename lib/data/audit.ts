import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminAuditEvent {
  id: string;
  event_type: string;
  actor_id?: string | null;
  actor_name?: string | null;
  details: Record<string, any>;
  created_at: string;
}

const inMemoryAuditLogs: AdminAuditEvent[] = [];

export async function logAdminAudit(event: {
  eventType: string;
  actorId?: string | null;
  actorName?: string | null;
  details: Record<string, any>;
}) {
  const auditEvent: AdminAuditEvent = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    event_type: event.eventType,
    actor_id: event.actorId || null,
    actor_name: event.actorName || "Admin Utama",
    details: event.details || {},
    created_at: new Date().toISOString(),
  };

  inMemoryAuditLogs.unshift(auditEvent);

  try {
    const supabase = createAdminClient();
    await supabase.from("admin_audit").insert({
      event_type: auditEvent.event_type,
      actor_id: auditEvent.actor_id,
      details: {
        ...auditEvent.details,
        actor_name: auditEvent.actor_name,
      },
    });
  } catch {
    // handled gracefully
  }

  return auditEvent;
}

export async function getAdminAuditLogs(limit: number = 50): Promise<AdminAuditEvent[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("admin_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id,
        event_type: d.event_type,
        actor_id: d.actor_id,
        actor_name: d.details?.actor_name || "Admin",
        details: d.details || {},
        created_at: d.created_at,
      }));
    }
  } catch {
    // fallback
  }

  return inMemoryAuditLogs.slice(0, limit);
}
