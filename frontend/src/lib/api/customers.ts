import { apiClient } from "./client";

export type CustomerType = "PERSON" | "ORGANIZATION";
export type CustomerStatus = "ACTIVE" | "INACTIVE" | "BLACKLISTED";
export type Gender = "MALE" | "FEMALE";
export type AiInsightLevel = "LOW" | "MEDIUM" | "HIGH";
export type OccupationGroup =
  | "HAIR_TRANSPLANT_TECHNICIAN"
  | "NAIL_TECHNICIAN"
  | "GENERAL_PRACTITIONER"
  | "PHYSICIAN"
  | "HAIR_BEAUTY_CLINIC"
  | "HOME_DEVICE_CUSTOMER"
  | "BARBER"
  | "DENTIST"
  | "VETERINARIAN"
  | "COLLEAGUE"
  | "EMPLOYEE"
  | "DERMATOLOGIST"
  | "GYNECOLOGIST"
  | "OTHER";
export type SalesOpportunityStatus =
  | "NEW"
  | "CONTACTED"
  | "NEEDS_QUOTE"
  | "QUOTED"
  | "NEGOTIATION"
  | "WON"
  | "LOST"
  | "CANCELED";
export type SalesOpportunityPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type CustomerActivityType =
  | "NOTE"
  | "CALL"
  | "SMS"
  | "VISIT"
  | "FOLLOW_UP"
  | "CUSTOMER_CREATED"
  | "CUSTOMER_UPDATED"
  | "CONTACT_CREATED"
  | "CONTACT_UPDATED"
  | "CONTACT_DELETED"
  | "SALES_OPPORTUNITY_CREATED"
  | "SALES_OPPORTUNITY_UPDATED"
  | "SALES_OPPORTUNITY_DELETED"
  | "REPAIR_CREATED"
  | "REPAIR_STATUS_CHANGED"
  | "AI_ANALYSIS_UPDATED";

export interface CustomerContact {
  id: string;
  customerId: string;
  fullName: string;
  role?: string | null;
  mobile?: string | null;
  phone?: string | null;
  email?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface SalesOpportunity {
  id: string;
  customerId: string;
  title: string;
  description?: string | null;
  status: SalesOpportunityStatus;
  priority: SalesOpportunityPriority;
  estimatedValue?: string | number | null;
  probability?: number | null;
  expectedCloseAt?: string | null;
  nextFollowUpAt?: string | null;
  lossReason?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CustomerActivity {
  id: string;
  customerId: string;
  type: CustomerActivityType;
  title: string;
  body?: string | null;
  dueAt?: string | null;
  relatedRepairId?: string | null;
  relatedSalesOpportunityId?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CustomerAiAnalysis {
  id: string;
  customerId: string;
  summary: string;
  riskLevel?: AiInsightLevel | null;
  salesPotential?: AiInsightLevel | null;
  nextBestAction?: string | null;
  tags?: string[] | null;
  insights?: Record<string, unknown> | null;
  source: string;
  modelName?: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface CustomerRepairSummary {
  id: string;
  caseNumber: string;
  status: string;
  type: string;
  deviceTitle: string;
  createdAt: string;
}
export interface Customer {
  id: string;
  type: CustomerType;
  status: CustomerStatus;
  firstName?: string | null;
  lastName?: string | null;
  nationalCode?: string | null;
  birthDate?: string | null;
  gender?: Gender | null;
  organizationName?: string | null;
  economicCode?: string | null;
  registrationNo?: string | null;
  nationalId?: string | null;
  mobile?: string | null;
  phone?: string | null;
  email?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  postalCode?: string | null;
  occupation?: string | null;
  occupationGroup?: OccupationGroup | null;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    repairs: number;
    contacts?: number;
    salesOpportunities?: number;
    activities?: number;
    aiAnalyses?: number;
  };
}
export interface CustomerDetail extends Customer {
  contacts: CustomerContact[];
  repairs: CustomerRepairSummary[];
  salesOpportunities: SalesOpportunity[];
  activities: CustomerActivity[];
  aiAnalyses: CustomerAiAnalysis[];
}
export interface CustomerListResponse {
  items: Customer[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}
export interface QueryCustomerParams {
  search?: string;
  type?: CustomerType | "";
  status?: CustomerStatus | "";
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
export type CustomerPayload = Partial<
  Omit<Customer, "id" | "registeredAt" | "createdAt" | "updatedAt" | "_count">
>;
export type ContactPayload = Pick<CustomerContact, "fullName"> &
  Partial<
    Pick<CustomerContact, "role" | "mobile" | "phone" | "email" | "isPrimary">
  >;
export type OpportunityPayload = Pick<SalesOpportunity, "title"> &
  Partial<
    Pick<
      SalesOpportunity,
      | "description"
      | "status"
      | "priority"
      | "probability"
      | "expectedCloseAt"
      | "nextFollowUpAt"
      | "lossReason"
    >
  > & { estimatedValue?: number };
export type ActivityPayload = Pick<CustomerActivity, "type" | "title"> &
  Partial<
    Pick<
      CustomerActivity,
      "body" | "dueAt" | "relatedRepairId" | "relatedSalesOpportunityId"
    >
  >;

export const customersApi = {
  findAll: (params?: QueryCustomerParams) =>
    apiClient.get<CustomerListResponse>("/customers", { params }),
  findOne: (id: string) => apiClient.get<CustomerDetail>(`/customers/${id}`),
  create: (body: CustomerPayload) =>
    apiClient.post<Customer>("/customers", body),
  update: (id: string, body: CustomerPayload) =>
    apiClient.patch<Customer>(`/customers/${id}`, body),
  remove: (id: string) => apiClient.delete(`/customers/${id}`),
  createContact: (customerId: string, body: ContactPayload) =>
    apiClient.post<CustomerContact>(`/customers/${customerId}/contacts`, body),
  updateContact: (
    customerId: string,
    id: string,
    body: Partial<ContactPayload>,
  ) =>
    apiClient.patch<CustomerContact>(
      `/customers/${customerId}/contacts/${id}`,
      body,
    ),
  removeContact: (customerId: string, id: string) =>
    apiClient.delete(`/customers/${customerId}/contacts/${id}`),
  createOpportunity: (customerId: string, body: OpportunityPayload) =>
    apiClient.post<SalesOpportunity>(
      `/customers/${customerId}/sales-opportunities`,
      body,
    ),
  updateOpportunity: (
    customerId: string,
    id: string,
    body: Partial<OpportunityPayload>,
  ) =>
    apiClient.patch<SalesOpportunity>(
      `/customers/${customerId}/sales-opportunities/${id}`,
      body,
    ),
  removeOpportunity: (customerId: string, id: string) =>
    apiClient.delete(`/customers/${customerId}/sales-opportunities/${id}`),
  createActivity: (customerId: string, body: ActivityPayload) =>
    apiClient.post<CustomerActivity>(
      `/customers/${customerId}/activities`,
      body,
    ),
  latestAiAnalysis: (customerId: string) =>
    apiClient.get<CustomerAiAnalysis>(
      `/customers/${customerId}/ai-analysis/latest`,
    ),
};
