import { apiClient } from "./client";

export type SupplierKind = "GOODS" | "TRANSPORT";
export type SupplierEntityType = "PERSON" | "COMPANY";
export type SupplierLabel = "WHITE" | "GRAY" | "BLACK";
export type EvaluationType = "INITIAL" | "PERIODIC";
export type PurchaseRequestStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "ORDERED" | "CANCELLED";
export type PurchaseOrderStatus = "INITIAL" | "FOLLOW_UP" | "PURCHASED" | "FINALIZED" | "CANCELLED";
export type DeliveryMode = "SUPPLIER_DELIVERY" | "TRANSPORT_SUPPLIER";
export type PaymentMethod = "CASH" | "CREDIT";

export interface PageResult<T> { items: T[]; total: number; page: number; pageSize: number; totalPages?: number }
export interface ProductType { id: string; code: string; name: string; profitPercent: number; categories: ProductCategory[] }
export interface ProductCategory { id: string; typeId: string; code: string; name: string }
export interface Product {
  id: string; code: string; fullName: string; typeId: string; categoryId: string; itemCode: string;
  definitionSuffix?: string | null; brand?: string | null; model?: string | null; grade?: string | null;
  extraPrefix?: string | null; color?: string | null; trackSerial: boolean; isActive: boolean;
  lastPurchasePrice?: number | null; lastPurchaseAt?: string | null; currentPrice?: number | null; priceReviewNeeded: boolean;
  type: ProductType; category: ProductCategory;
}
export interface SupplierProduct { id?: string; productId?: string | null; title?: string | null; unitPrice?: number | null; note?: string | null; product?: Pick<Product,"id"|"code"|"fullName"|"brand"|"model"> }
export interface Supplier {
  id: string; kind: SupplierKind; entityType: SupplierEntityType; displayName: string; firstName?: string | null;
  lastName?: string | null; companyName?: string | null; representativeName?: string | null; representativePhone?: string | null;
  accountantName?: string | null; accountantPhone?: string | null; phone?: string | null; address?: string | null;
  score?: number | null; label?: SupplierLabel | null; lastEvaluatedAt?: string | null; periodicDueAt?: string | null;
  isActive: boolean; products?: SupplierProduct[]; evaluations?: SupplierEvaluation[]; _count?: { products: number };
}
export interface EvaluationQuestion { id: string; order: number; text: string; weight: number; guide: Record<"0"|"1"|"2"|"3",string> }
export interface EvaluationTemplate { id: string; supplierKind: SupplierKind; type: EvaluationType; version: number; title: string; description?: string; isActive: boolean; questions: EvaluationQuestion[] }
export interface SupplierEvaluation { id: string; type: EvaluationType; score: number; label: SupplierLabel; notes?: string; evaluatedAt: string; template?: { id:string; title:string; version:number }; answers?: Array<{ id:string; questionText:string; weight:number; score:number }> }
export interface PurchaseRequestItem { id: string; productId: string; quantity: number; note?: string; product: Pick<Product,"id"|"code"|"fullName">; orderItems?: Array<{ quantity:number; order:{id:string;number:string;status:PurchaseOrderStatus} }> }
export interface PurchaseRequest { id:string; number:string; requesterId:string; requester?:{id:string;name:string}; status:PurchaseRequestStatus; neededBy?:string|null; notes?:string|null; reviewNote?:string|null; reviewedAt?:string|null; createdAt:string; items?:PurchaseRequestItem[]; orders?:Array<{id:string;number:string;status:PurchaseOrderStatus;supplierId:string}>; _count?:{items:number} }
export interface OrderableItem { requestItemId:string; product:Pick<Product,"id"|"code"|"fullName">; quantity:number; orderedQuantity:number; remaining:number; suppliers:Array<{supplierId:string;displayName:string;label?:SupplierLabel|null;score?:number|null;unitPrice?:number|null}> }
export interface OrderableRequest { id:string; number:string; requester:{id:string;name:string}; neededBy?:string|null; notes?:string|null; items:OrderableItem[] }
export interface Warehouse { id:string; number:string; name:string; parentId?:string|null; isActive:boolean; keeperId?:string|null }
export interface PurchaseOrderItem { id:string; productId:string; requestItemId?:string|null; quantity:number; receivedQuantity:number; unitPrice?:number|null; product:Pick<Product,"id"|"code"|"fullName"> }
export interface PurchaseOrder { id:string; number:string; requestId?:string|null; requesterId?:string|null; buyerId:string; supplierId:string; supplierName:string; supplier?:Supplier; transportSupplier?:Supplier|null; warehouseId:string; warehouse:Warehouse; requester?:{id:string;name:string}|null; buyer?:{id:string;name:string}; status:PurchaseOrderStatus; orderedAt:string; expectedDeliveryAt?:string|null; deliveryMode:DeliveryMode; paymentMethod:PaymentMethod; transportSupplierId?:string|null; transportCost?:number|null; notes?:string|null; purchasedAt?:string|null; finalizedAt?:string|null; items?:PurchaseOrderItem[]; statusLogs?:Array<{id:string;fromStatus?:PurchaseOrderStatus|null;toStatus:PurchaseOrderStatus;note?:string|null;createdAt:string}>; _count?:{items:number}; warnings?:string[] }
export interface PricingSettings { overheadPercent:number; profitTaxPercent:number; vatPercent:number; shippingPercent:number; updatedAt:string }
export interface PricingCalculation { product:{id:string;code:string;fullName:string}; purchasePrice:number; currentPrice?:number|null; priceReviewNeeded:boolean; percents:{overhead:number;profitTax:number;vat:number;shipping:number;typeProfit:number}; totalPercent:number; costPrice:number; sellingPrice?:number; differenceAmount?:number; profitLossPercent?:number; profitLossType?:"PROFIT"|"LOSS"|"EVEN" }

const query = (params: Record<string, unknown> = {}) => ({ params: Object.fromEntries(Object.entries(params).filter(([,v]) => v !== "" && v !== undefined && v !== null)) });

export const commerceApi = {
  products: {
    list: (params:Record<string,unknown>={}) => apiClient.get<PageResult<Product>>("/products",query(params)),
    get: (id:string) => apiClient.get<Product>(`/products/${id}`),
    types: () => apiClient.get<ProductType[]>("/product-types"),
    check: (data:Record<string,unknown>) => apiClient.post("/products/check",data),
    create: (data:Record<string,unknown>) => apiClient.post<Product>("/products",data),
    update: (id:string,data:Record<string,unknown>) => apiClient.patch<Product>(`/products/${id}`,data),
    remove: (id:string) => apiClient.delete(`/products/${id}`),
    createType: (data:{code:string;name:string}) => apiClient.post("/product-types",data),
    createCategory: (typeId:string,data:{code:string;name:string}) => apiClient.post(`/product-types/${typeId}/categories`,data),
    labelPrint: (id:string) => apiClient.get<string>(`/products/${id}/label/print`,{responseType:"text"}),
    labelPrintUrl: (id:string) => `/dashboard/commerce/products/${id}/label`,
  },
  suppliers: {
    list: (params:Record<string,unknown>={}) => apiClient.get<PageResult<Supplier>>("/suppliers",query(params)),
    get: (id:string) => apiClient.get<Supplier>(`/suppliers/${id}`),
    create: (data:Record<string,unknown>) => apiClient.post<Supplier>("/suppliers",data),
    update: (id:string,data:Record<string,unknown>) => apiClient.patch<Supplier>(`/suppliers/${id}`,data),
    replaceProducts: (id:string,products:SupplierProduct[]) => apiClient.put<Supplier>(`/suppliers/${id}/products`,{products}),
    remove: (id:string) => apiClient.delete(`/suppliers/${id}`),
    byProduct: (productId:string) => apiClient.get(`/suppliers/by-product/${productId}`),
  },
  evaluations: {
    settings: () => apiClient.get<{whiteMin:number;grayMin:number;updatedAt:string}>("/supplier-evaluations/settings"),
    saveSettings: (data:{whiteMin:number;grayMin:number}) => apiClient.put("/supplier-evaluations/settings",data),
    templates: (params:Record<string,unknown>={}) => apiClient.get<EvaluationTemplate[]>("/supplier-evaluations/templates",query(params)),
    saveTemplate: (kind:SupplierKind,type:EvaluationType,data:Record<string,unknown>) => apiClient.put(`/supplier-evaluations/templates/${kind}/${type}`,data),
    preview: (data:Record<string,unknown>) => apiClient.post<{score:number;label:SupplierLabel}>("/supplier-evaluations/preview",data),
    list: (supplierId:string) => apiClient.get<SupplierEvaluation[]>(`/supplier-evaluations/suppliers/${supplierId}`),
    submit: (supplierId:string,data:Record<string,unknown>) => apiClient.post(`/supplier-evaluations/suppliers/${supplierId}`,data),
    runReminders: () => apiClient.post<{reminded:number}>("/supplier-evaluations/reminders/run"),
  },
  requests: {
    list: (params:Record<string,unknown>={}) => apiClient.get<PageResult<PurchaseRequest>>("/purchase-requests",query(params)),
    get: (id:string) => apiClient.get<PurchaseRequest>(`/purchase-requests/${id}`),
    create: (data:Record<string,unknown>) => apiClient.post<PurchaseRequest>("/purchase-requests",data),
    approve: (id:string,note?:string) => apiClient.post(`/purchase-requests/${id}/approve`,{note}),
    reject: (id:string,note:string) => apiClient.post(`/purchase-requests/${id}/reject`,{note}),
    cancel: (id:string) => apiClient.post(`/purchase-requests/${id}/cancel`),
  },
  orders: {
    list: (params:Record<string,unknown>={}) => apiClient.get<PageResult<PurchaseOrder>>("/purchase-orders",query(params)),
    get: (id:string) => apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`),
    orderable: () => apiClient.get<OrderableRequest[]>("/purchase-orders/orderable"),
    create: (data:Record<string,unknown>) => apiClient.post<PurchaseOrder>("/purchase-orders",data),
    update: (id:string,data:Record<string,unknown>) => apiClient.patch(`/purchase-orders/${id}`,data),
    changeStatus: (id:string,data:Record<string,unknown>) => apiClient.patch<PurchaseOrder>(`/purchase-orders/${id}/status`,data),
  },
  pricing: {
    settings: () => apiClient.get<PricingSettings>("/pricing/settings"),
    saveSettings: (data:Omit<PricingSettings,"updatedAt">) => apiClient.put("/pricing/settings",data),
    typeProfits: () => apiClient.get<Array<{typeId:string;code:string;name:string;profitPercent:number}>>("/pricing/type-profits"),
    setTypeProfit: (typeId:string,profitPercent:number) => apiClient.put(`/pricing/type-profits/${typeId}`,{profitPercent}),
    reviewNeeded: () => apiClient.get<Array<Pick<Product,"id"|"code"|"fullName"|"lastPurchasePrice"|"lastPurchaseAt"|"currentPrice">>>("/pricing/review-needed"),
    calculate: (productId:string,sellingPrice?:number) => apiClient.get<PricingCalculation>(`/pricing/products/${productId}/calculate`,query({sellingPrice})),
    approve: (productId:string,sellingPrice:number) => apiClient.post(`/pricing/products/${productId}/approve`,{sellingPrice}),
    history: (productId:string) => apiClient.get(`/pricing/products/${productId}/history`),
  },
  warehouses: () => apiClient.get<Warehouse[]>("/warehouses"),
};
