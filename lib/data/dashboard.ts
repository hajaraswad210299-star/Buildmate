import { DashboardStats } from "./types";
import { getMockDashboardStats } from "../mock/data";

export async function getDashboardStats(
  period: string = "7d"
): Promise<DashboardStats> {
  // Fase 1: USE_MOCK_DATA default true
  return getMockDashboardStats(period);
}
