export type InsightSeverity = "info" | "warning" | "critical" | "positive";

export interface AnalyticsInsight {
  id: string;
  category: string;
  severity: InsightSeverity;
  title: string;
  message: string;
  recommendation?: string;
  evidence?: string[];
  metric?: string;
  current?: number | null;
  previous?: number | null;
  changePct?: number | null;
}

export interface AnalyticsAnomaly {
  id: string;
  kind: "SPIKE" | "DROP" | string;
  severity: "warning" | "critical" | string;
  date: string;
  metric: string;
  actual: number;
  baseline: number;
  zScore: number;
  message: string;
}


export interface AiAnalyticsResult {
  available: boolean;
  provider: "openai-compatible" | "ollama" | "none";
  model: string | null;
  generatedAt: string;
  summary: string;
  findings: Array<{ title: string; detail: string; severity: InsightSeverity }>;
  recommendations: Array<{ title: string; detail: string; priority: "low" | "medium" | "high" }>;
  answer?: string;
  groundedMetrics: string[];
  disclaimer?: string;
}
