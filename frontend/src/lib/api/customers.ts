import { apiClient } from "./client";

export type Gender = "MALE" | "FEMALE";

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

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  phone: string;
  nationalCode: string;
  gender: Gender;
  birthDate: string;
  province: string;
  city: string;
  address: string;
  occupation: string;
  occupationGroup: OccupationGroup;
  email?: string | null;
  postalCode?: string | null;
  registeredAt: string;
  createdAt: string;
  updatedAt: string;
  _count?: { repairs: number };
}

export interface CustomerRepairSummary {
  id: string;
  caseNumber: string;
  status: string;
  type: string;
  deviceTitle: string;
  createdAt: string;
}

export interface CustomerDetail extends Customer {
  repairs: CustomerRepairSummary[];
}

export interface CustomerListResponse {
  items: Customer[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface QueryCustomerParams {
  search?: string;
  firstName?: string;
  lastName?: string;
  nationalCode?: string;
  mobile?: string;
  phone?: string;
  province?: string;
  city?: string;
  occupation?: string;
  occupationGroup?: OccupationGroup | string;
  gender?: Gender | string;
  email?: string;
  registeredFrom?: string;
  registeredTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?:
    | "createdAt"
    | "updatedAt"
    | "firstName"
    | "lastName"
    | "registeredAt"
    | "city"
    | "province";
  sortOrder?: "asc" | "desc";
}

export interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  mobile: string;
  phone: string;
  nationalCode: string;
  birthDate: string;
  gender: Gender;
  province: string;
  city: string;
  address: string;
  occupation: string;
  occupationGroup: OccupationGroup;
  email?: string;
  postalCode?: string;
}

export type UpdateCustomerDto = Partial<CreateCustomerDto>

export const customersApi = {
  findAll: (params?: QueryCustomerParams) =>
    apiClient.get<CustomerListResponse>("/customers", { params }),

  findOne: (id: string) => apiClient.get<CustomerDetail>(`/customers/${id}`),

  create: (body: CreateCustomerDto) =>
    apiClient.post<Customer>("/customers", body),

  update: (id: string, body: UpdateCustomerDto) =>
    apiClient.patch<Customer>(`/customers/${id}`, body),

  remove: (id: string) => apiClient.delete(`/customers/${id}`),
};
