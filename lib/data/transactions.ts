import { Payment } from "./types";
import { MOCK_PAYMENTS } from "../mock/data";

const inMemoryPayments = [...MOCK_PAYMENTS];

export interface PaymentFilter {
  tab?: "all" | "orders" | "subscriptions";
  status?: string;
  search?: string;
}

export async function getPayments(filter: PaymentFilter = {}): Promise<Payment[]> {
  let list = [...inMemoryPayments];

  if (filter.tab === "orders") {
    list = list.filter((p) => p.kind === "order");
  } else if (filter.tab === "subscriptions") {
    list = list.filter((p) => p.kind === "subscription");
  }

  if (filter.status && filter.status !== "all") {
    list = list.filter((p) => p.status === filter.status);
  }

  if (filter.search) {
    const q = filter.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.provider_order_id.toLowerCase().includes(q) ||
        p.customer_name.toLowerCase().includes(q) ||
        p.order_code?.toLowerCase().includes(q)
    );
  }

  return list;
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  return inMemoryPayments.find((p) => p.id === id || p.provider_order_id === id) || null;
}

export function recordPayment(payment: Payment) {
  const existingIdx = inMemoryPayments.findIndex(
    (p) => p.provider_order_id === payment.provider_order_id || p.id === payment.id
  );
  if (existingIdx >= 0) {
    inMemoryPayments[existingIdx] = { ...inMemoryPayments[existingIdx], ...payment };
  } else {
    inMemoryPayments.unshift(payment);
  }
}

export function updatePaymentStatus(
  providerOrderId: string,
  updates: Partial<Payment>
): Payment | null {
  const payment = inMemoryPayments.find(
    (p) => p.provider_order_id === providerOrderId || p.order_code === providerOrderId
  );
  if (!payment) return null;

  Object.assign(payment, updates);
  return payment;
}

