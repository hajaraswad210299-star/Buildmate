import { Payout } from "./types";
import { MOCK_PAYOUTS } from "../mock/data";

const inMemoryPayouts = [...MOCK_PAYOUTS];

export interface PayoutFilter {
  tab?: "pending" | "paid";
  workerId?: string;
  search?: string;
}

export async function getPayouts(filter: PayoutFilter = {}): Promise<Payout[]> {
  let list = [...inMemoryPayouts];

  if (filter.tab) {
    list = list.filter((p) => p.status === filter.tab);
  }

  if (filter.workerId) {
    list = list.filter((p) => p.worker_id === filter.workerId);
  }

  if (filter.search) {
    const q = filter.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.worker_name.toLowerCase().includes(q) ||
        p.order_code.toLowerCase().includes(q)
    );
  }

  return list;
}

export async function markPayoutAsPaid(
  payoutId: string,
  note: string = "Transfer simulasi"
): Promise<{ success: boolean; payout?: Payout }> {
  const payout = inMemoryPayouts.find((p) => p.id === payoutId);
  if (!payout) return { success: false };

  payout.status = "paid";
  payout.paid_at = new Date().toISOString();
  payout.paid_by = "adm-1";
  payout.paid_by_name = "Super Admin";
  payout.note = note;

  return { success: true, payout };
}
