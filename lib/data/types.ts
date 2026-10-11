import { OrderStatus } from "../orders/transitions";
export type { OrderStatus };

export type Role = "customer" | "worker" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  default_address?: string;
  avatar_url?: string;
  onboarding_completed: boolean;
  role: Role;
  created_at: string;
  // Plus membership status
  is_plus?: boolean;
  plus_expires_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  is_active: boolean;
  order_index?: number;
  package_count?: number;
  created_at: string;
}

export interface ServicePackage {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  description: string;
  price: number;
  est_duration_minutes: number;
  inclusions?: string[];
  exclusions?: string[];
  is_active: boolean;
  worker_count?: number;
  created_at: string;
}

export type ApplicationStatus = "draft" | "pending" | "approved" | "rejected";

export interface Worker {
  id: string;
  user_id: string | null; // null = dikelola admin
  full_name: string;
  slug: string;
  phone: string;
  email?: string | null;
  bio: string;
  service_area: string;
  experience_years: number;
  photo_path?: string | null;
  portfolio_paths?: string[];
  application_status: ApplicationStatus;
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  is_verified: boolean;
  is_active: boolean;
  completed_jobs_count?: number;
  package_ids?: string[];
  created_at: string;
}

export interface OrderPhoto {
  id: string;
  order_id: string;
  type: "problem" | "result";
  uploaded_by: "customer" | "worker" | "admin";
  source_note?: string; // "Diunggah tukang" | "Dari tukang via WA, diunggah admin"
  storage_path: string;
  created_at: string;
}

export interface OrderEvent {
  id: string;
  order_id: string;
  event_type: string;
  from_status?: string;
  to_status?: string;
  actor_type: "system" | "webhook" | "admin" | "customer" | "worker";
  actor_name?: string;
  note?: string;
  created_at: string;
}

export interface Complaint {
  id: string;
  order_id: string;
  description: string;
  status: "open" | "closed";
  is_warranty: boolean;
  resolution?: string;
  created_at: string;
  closed_at?: string;
}

export interface Order {
  id: string;
  order_code: string; // BM-241012-0007
  customer_id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    is_plus: boolean;
  };
  worker_id: string | null;
  worker?: {
    id: string;
    name: string;
    phone: string;
    service_area: string;
    is_verified: boolean;
    has_account: boolean; // berakun vs dikelola admin
    avatar_url?: string;
  };
  package_id: string;
  package: {
    id: string;
    name: string;
    category_name: string;
    inclusions?: string[];
    exclusions?: string[];
  };
  package_price: number;
  service_fee: number;
  total: number;
  address: string;
  scheduled_date: string;
  time_slot: string;
  description: string;
  status: OrderStatus;
  worker_response: "pending" | "accepted" | "declined";
  admin_notes?: string;
  cancel_reason?: string;
  paid_at?: string;
  worker_confirmed_at?: string;
  on_the_way_at?: string;
  in_progress_at?: string;
  awaiting_confirmation_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  completed_by?: "customer" | "admin";
  created_at: string;
  updated_at: string;
  photos?: OrderPhoto[];
  events?: OrderEvent[];
  complaint?: Complaint;
  transaction_id?: string;
  snap_token?: string;
  dispatch_status?: "idle" | "searching" | "assigned" | "exhausted";
  customer_preferred_worker_name?: string;
  allow_reassign?: boolean;
  dispatch_offers?: DispatchOffer[];
  assignment_method?: "auto" | "manual";
  assigned_by?: string;
}

export interface DispatchOffer {
  id: string;
  attempt_number: number;
  worker_id: string;
  worker_name: string;
  worker_avatar?: string;
  worker_area?: string;
  status: "pending" | "accepted" | "declined" | "expired";
  decline_reason?: string;
  sent_at: string;
  responded_at?: string;
  expires_at?: string;
  is_manual?: boolean;
  assigned_by?: string;
}

export interface Payment {
  id: string;
  provider_order_id: string; // ORD-xxx / SUB-xxx
  kind: "order" | "subscription";
  ref_id: string;
  order_code?: string;
  customer_name: string;
  customer_id: string;
  amount: number;
  status: "pending" | "success" | "failed" | "refunded";
  payment_type: string; // qris, bank_transfer, gopay, credit_card
  snap_token?: string;
  raw_payload?: Record<string, unknown>;
  processed_at?: string;
  created_at: string;
}

export interface Payout {
  id: string;
  order_id: string;
  order_code: string;
  worker_id: string;
  worker_name: string;
  worker_avatar?: string;
  amount: number;
  status: "pending" | "paid";
  completed_at: string;
  paid_at?: string;
  paid_by?: string;
  paid_by_name?: string;
  note?: string;
  created_at: string;
}

export interface DashboardMetricCard {
  title: string;
  value: number;
  formattedValue: string;
  deltaPercent?: number;
  isPositiveDelta?: boolean;
  deltaLabel?: string;
  accent: "lavender" | "success" | "info" | "warning" | "orange" | "teal";
  icon: string;
  linkText?: string;
  linkHref?: string;
  subStats?: {
    label: string;
    value: string;
    ticks?: number; // 0-10 for mini bars
  }[];
}

export interface UrgentActionItem {
  id: string;
  title: string;
  count: number;
  type: "danger" | "warning" | "lavender" | "neutral";
  linkHref: string;
  icon: string;
}

export interface DashboardStats {
  period: string; // 'today' | '7d' | '30d' | 'custom'
  metrics: {
    totalOrders: DashboardMetricCard;
    completedOrders: DashboardMetricCard;
    transactionValue: DashboardMetricCard;
    platformRevenue: DashboardMetricCard;
    escrowHeld: DashboardMetricCard;
    pendingPayouts: DashboardMetricCard;
    activePlusMembers: DashboardMetricCard;
    activeWorkers: DashboardMetricCard;
  };
  chartData: {
    date: string;
    label: string;
    completed: number;
    cancelled: number;
  }[];
  urgentActions: UrgentActionItem[];
  statusDistribution: {
    status: OrderStatus;
    label: string;
    count: number;
    percentage: number;
    color: string;
  }[];
  performance: {
    completionRate: number; // e.g. 88%
    avgResponseTime: string; // e.g. "1j 24m"
  };
  topWorkers: {
    id: string;
    name: string;
    category: string;
    completedCount: number;
    avatar?: string;
  }[];
  topCategories: {
    id: string;
    name: string;
    orderCount: number;
    revenue: number;
  }[];
  recentOrders: Order[];
  activityTicker: {
    id: string;
    orderCode: string;
    text: string;
    timestamp: string;
  }[];
  // Heatmap timeline data (mirroring reference image)
  activityTimeline: {
    year: number;
    activeDays: number;
    bestMonth: string;
    bestMonthRate: string;
    months: {
      monthName: string;
      weeks: number[][]; // intensity 0-4
    }[];
  };
}
