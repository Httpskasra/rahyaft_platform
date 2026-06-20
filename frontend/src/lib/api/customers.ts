import { apiClient } from "./client";

export interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string;
  companyName: string | null;
  nationalCode: string | null;
  address: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
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
  phoneNumber?: string;
  nationalCode?: string;
  companyName?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "updatedAt" | "fullName";
  sortOrder?: "asc" | "desc";
}

export interface CreateCustomerDto {
  fullName: string;
  phoneNumber: string;
  companyName?: string;
  nationalCode?: string;
  address?: string;
  description?: string;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}

export const customersApi = {
  findAll: (params?: QueryCustomerParams) =>
    apiClient.get<CustomerListResponse>("/customers", { params }),

  findOne: (id: string) => apiClient.get<Customer>(`/customers/${id}`),

  create: (body: CreateCustomerDto) =>
    apiClient.post<Customer>("/customers", body),

  update: (id: string, body: UpdateCustomerDto) =>
    apiClient.patch<Customer>(`/customers/${id}`, body),

  remove: (id: string) => apiClient.delete(`/customers/${id}`),
};