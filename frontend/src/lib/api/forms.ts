import { apiClient } from "./client";

// ─── Schema ───────────────────────────────────────────────────
export interface FormField {
  id: string;
  type: "text" | "number" | "select" | "radio" | "checkbox" | "textarea";
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
}

export interface FormSchema {
  fields: FormField[];
}

export interface Form {
  id: string;
  name: string;
  description?: string;
  schema: FormSchema;
  version: number;
  isActive: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { submissions: number };
}

// ─── Legacy stats endpoint types ──────────────────────────────
export interface FormAnalysis {
  id: string;
  formId: string;
  fieldId?: string;
  metric: string;
  value: unknown;
  source: string;
  updatedAt: string;
}

export interface FormStat {
  id: string;
  formId: string;
  fieldId: string;
  metric: string;
  value: unknown;
  updatedAt: string;
}

export interface FormStats {
  formId: string;
  submissionCount: number;
  stats: FormStat[];
  analysis: FormAnalysis[];
}

// ─── Deep analysis types ──────────────────────────────────────

export interface Submission {
  id: string;
  formId: string;
  formVersion: number;
  userId?: string;
  data: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; name: string; phoneNumber: string } | null;
}

export interface RiskAssessment {
  risk_level: "low" | "medium" | "high";
  risk_score: number;
  reasons: string[];
  passed_checks: string[];
}

export interface AnomalyDetection {
  is_anomaly: boolean;
  anomaly_score: number;
  anomalous_fields: {
    field: string;
    value: number;
    expected_range: [number, number];
    z_score: number;
    severity: string;
  }[];
}

export interface DomainInsight {
  type: "positive" | "neutral" | "warning";
  message: string;
}

export interface DomainWarning {
  severity: "high" | "medium" | "low";
  field: string;
  message: string;
}

export interface DomainRecommendation {
  priority: "high" | "medium" | "low";
  action: string;
  detail: string;
}

export interface DomainInsights {
  domain: string;
  domain_label: string;
  kpis: Record<string, { label: string; value: number | string }>;
  insights: DomainInsight[];
  warnings: DomainWarning[];
  recommendations: DomainRecommendation[];
}

export interface FieldHealth {
  field_id: string;
  label: string;
  required: boolean;
  fill_rate: number;
  filled: number;
  missing: number;
  status: "excellent" | "good" | "warning" | "critical";
}

export interface CompletionHealth {
  overall_score: number;
  field_health: FieldHealth[];
}

export interface WeeklyCount {
  week: string;
  count: number;
}

export interface TrendPoint {
  week: string;
  avg: number;
  count: number;
}

export interface TrendAnalysis {
  volume_trend: "up" | "down" | "flat" | "insufficient_data" | "no_data";
  trend_pct: number | null;
  weekly_counts: WeeklyCount[];
  field_trends: Record<string, TrendPoint[]>;
}

export interface Predictions {
  next_week_volume?: {
    value: number;
    confidence: string;
    basis: string;
  };
  field_predictions?: Record<string, {
    label: string;
    predicted_avg: number;
    confidence_interval: [number, number];
  }>;
}

export interface SubmissionHistoryItem {
  id: string;
  createdAt: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high";
  completion_pct: number;
}

export interface FieldRollingStats {
  count: number;
  // numeric
  avg?: number | null;
  median?: number | null;
  min?: number | null;
  max?: number | null;
  std?: number | null;
  p25?: number | null;
  p75?: number | null;
  // categorical / choice
  unique?: number;
  top?: string | null;
  top_freq?: number;
  distribution?: Record<string, number>;
  avg_length?: number;
  // boolean checkbox
  true_count?: number;
  false_count?: number;
  true_rate?: number;
}

/** Aggregate NLP across ALL text responses for a field */
export interface NlpCorpus {
  total_responses: number;
  sentiment_distribution: { positive: number; negative: number; neutral: number };
  dominant_sentiment: "positive" | "negative" | "neutral";
  sentiment_score: number; // -1.0 to +1.0
  top_keywords: string[];
  avg_word_count: number;
  short_response_rate: number; // 0–1
  sample_positive: string | null;
  sample_negative: string | null;
  recent_sentiment_trend: "improving" | "declining" | "stable";
}

export interface DeepAnalysis {
  form: Omit<Form, "_count">;
  submissionCount: number;
  submissions: Submission[];
  analytics: {
    riskAssessment: RiskAssessment | null;
    anomalyDetection: AnomalyDetection | null;
    formCategory: { category: string } | null;
    domainClassification: { domain: string } | null;
    domainInsights: DomainInsights | null;
    completionHealth: CompletionHealth | null;
    trendAnalysis: TrendAnalysis | null;
    predictions: Predictions | null;
    submissionHistory: SubmissionHistoryItem[] | null;
  };
  statsByField: Record<string, FieldRollingStats>;
  nlpByField: Record<string, NlpCorpus>;
}

// ─── API ──────────────────────────────────────────────────────

export const formsApi = {
  findAll: () => apiClient.get<Form[]>("/forms"),
  findById: (id: string) => apiClient.get<Form>(`/forms/${id}`),
  getStats: (id: string) => apiClient.get<FormStats>(`/forms/${id}/stats`),
  getDeepAnalysis: (id: string) => apiClient.get<DeepAnalysis>(`/forms/${id}/deep-analysis`),
  create: (data: { name: string; description?: string; schema: FormSchema }) =>
    apiClient.post<Form>("/forms", data),
  update: (
    id: string,
    data: Partial<{ name: string; description: string; schema: FormSchema; isActive: boolean }>
  ) => apiClient.patch<Form>(`/forms/${id}`, data),
  remove: (id: string) => apiClient.delete(`/forms/${id}`),
};

export const submissionsApi = {
  submit: (formId: string, data: Record<string, unknown>) =>
    apiClient.post("/form-submissions", { formId, data }),
  findByForm: (formId: string) =>
    apiClient.get<Submission[]>(`/form-submissions/form/${formId}`),
  findMine: () => apiClient.get("/form-submissions/my"),
};
