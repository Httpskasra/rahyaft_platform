-- CreateEnum
CREATE TYPE "SupplierKind" AS ENUM ('GOODS', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "SupplierEntityType" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "SupplierLabel" AS ENUM ('WHITE', 'GRAY', 'BLACK');

-- CreateEnum
CREATE TYPE "EvaluationType" AS ENUM ('INITIAL', 'PERIODIC');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ORDERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('INITIAL', 'FOLLOW_UP', 'PURCHASED', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('SUPPLIER_DELIVERY', 'TRANSPORT_SUPPLIER');

-- CreateEnum
CREATE TYPE "WarehouseInvoiceType" AS ENUM ('RECEIPT', 'TRANSFER', 'ISSUE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('REQUESTED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED');

-- CreateEnum
CREATE TYPE "OutboundRequestStatus" AS ENUM ('PENDING_ALLOCATION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboundDispatchStatus" AS ENUM ('PENDING_KEEPER', 'REJECTED', 'PREPARING', 'READY_FOR_DELIVERY', 'DELIVERED');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('IN_PERSON', 'INTERNAL_TRANSPORT', 'FREIGHT');

-- CreateEnum
CREATE TYPE "StocktakeStatus" AS ENUM ('COUNTING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StocktakeWarehouseStatus" AS ENUM ('COUNTING', 'SUBMITTED', 'RETURNED');

-- CreateTable
CREATE TABLE "SequenceCounter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SequenceCounter_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "kind" "SupplierKind" NOT NULL,
    "entityType" "SupplierEntityType" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "representativeName" TEXT,
    "representativePhone" TEXT,
    "accountantName" TEXT,
    "accountantPhone" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "score" DECIMAL(5,2),
    "label" "SupplierLabel",
    "lastEvaluatedAt" TIMESTAMP(3),
    "lastPurchaseAt" TIMESTAMP(3),
    "periodicDueAt" TIMESTAMP(3),
    "lastReminderAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT,
    "title" TEXT,
    "unitPrice" DECIMAL(18,2),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationTemplate" (
    "id" TEXT NOT NULL,
    "supplierKind" "SupplierKind" NOT NULL,
    "type" "EvaluationType" NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvaluationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "weight" DECIMAL(8,2) NOT NULL,
    "guide" JSONB NOT NULL,

    CONSTRAINT "EvaluationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierEvaluation" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" "EvaluationType" NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "label" "SupplierLabel" NOT NULL,
    "notes" TEXT,
    "evaluatedById" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierEvaluationAnswer" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "questionId" TEXT,
    "questionText" TEXT NOT NULL,
    "weight" DECIMAL(8,2) NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "SupplierEvaluationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierScoreSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "whiteMin" DECIMAL(5,2) NOT NULL DEFAULT 60,
    "grayMin" DECIMAL(5,2) NOT NULL DEFAULT 40,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierScoreSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profitPercent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "definitionSuffix" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "grade" TEXT,
    "extraPrefix" TEXT,
    "color" TEXT,
    "fullName" TEXT NOT NULL,
    "trackSerial" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastPurchasePrice" DECIMAL(18,2),
    "lastPurchaseAt" TIMESTAMP(3),
    "currentPrice" DECIMAL(18,2),
    "priceReviewNeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSetting" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "overheadPercent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "profitTaxPercent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "vatPercent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "shippingPercent" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "purchasePrice" DECIMAL(18,2) NOT NULL,
    "overheadPercent" DECIMAL(7,2) NOT NULL,
    "profitTaxPercent" DECIMAL(7,2) NOT NULL,
    "vatPercent" DECIMAL(7,2) NOT NULL,
    "shippingPercent" DECIMAL(7,2) NOT NULL,
    "typeProfitPercent" DECIMAL(7,2) NOT NULL,
    "totalPercent" DECIMAL(8,2) NOT NULL,
    "costPrice" DECIMAL(18,2) NOT NULL,
    "sellingPrice" DECIMAL(18,2) NOT NULL,
    "differenceAmount" DECIMAL(18,2) NOT NULL,
    "profitLossPercent" DECIMAL(9,2) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "neededBy" TIMESTAMP(3),
    "notes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "PurchaseRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "requestId" TEXT,
    "requesterId" TEXT,
    "buyerId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'INITIAL',
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDeliveryAt" TIMESTAMP(3),
    "deliveryMode" "DeliveryMode" NOT NULL DEFAULT 'SUPPLIER_DELIVERY',
    "transportSupplierId" TEXT,
    "transportCost" DECIMAL(18,2),
    "paymentMethod" "PaymentMethod" NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "notes" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestItemId" TEXT,
    "quantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(18,2),

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderStatusLog" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "PurchaseOrderStatus",
    "toStatus" "PurchaseOrderStatus" NOT NULL,
    "userId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseOrderStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "parentId" TEXT,
    "keeperId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "serialNumber" TEXT,
    "manufactureDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "quantity" INTEGER NOT NULL,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseInvoice" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "WarehouseInvoiceType" NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "counterWarehouseId" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "lines" JSONB NOT NULL,
    "notes" TEXT,
    "issuedById" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarehouseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "fromWarehouseId" TEXT NOT NULL,
    "toWarehouseId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "receivedById" TEXT,
    "receivedAt" TIMESTAMP(3),
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransferLine" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "sentItems" JSONB,

    CONSTRAINT "StockTransferLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundRequest" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "saleOrderNumber" TEXT,
    "customerId" TEXT,
    "requestedById" TEXT NOT NULL,
    "status" "OutboundRequestStatus" NOT NULL DEFAULT 'PENDING_ALLOCATION',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OutboundRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundDispatch" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "OutboundDispatchStatus" NOT NULL DEFAULT 'PENDING_KEEPER',
    "rejectReason" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "videoStorageKey" TEXT,
    "videoMimeType" TEXT,
    "videoOriginalName" TEXT,
    "preparedAt" TIMESTAMP(3),
    "deliveryType" "DeliveryType",
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "transportSupplierId" TEXT,
    "transportNote" TEXT,
    "readyAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "deliveredById" TEXT,
    "invoiceId" TEXT,
    "pickedItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboundDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboundDispatchLine" (
    "id" TEXT NOT NULL,
    "dispatchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "OutboundDispatchLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stocktake" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "StocktakeStatus" NOT NULL DEFAULT 'COUNTING',
    "notes" TEXT,
    "startedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Stocktake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocktakeWarehouse" (
    "id" TEXT NOT NULL,
    "stocktakeId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "status" "StocktakeWarehouseStatus" NOT NULL DEFAULT 'COUNTING',
    "returnNote" TEXT,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "StocktakeWarehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StocktakeLine" (
    "id" TEXT NOT NULL,
    "stocktakeWarehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "systemQuantity" INTEGER NOT NULL,
    "countedQuantity" INTEGER,

    CONSTRAINT "StocktakeLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_kind_entityType_idx" ON "Supplier"("kind", "entityType");

-- CreateIndex
CREATE INDEX "Supplier_label_idx" ON "Supplier"("label");

-- CreateIndex
CREATE INDEX "Supplier_lastName_firstName_idx" ON "Supplier"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "Supplier_companyName_idx" ON "Supplier"("companyName");

-- CreateIndex
CREATE INDEX "SupplierProduct_productId_idx" ON "SupplierProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierProduct_supplierId_productId_key" ON "SupplierProduct"("supplierId", "productId");

-- CreateIndex
CREATE INDEX "EvaluationTemplate_supplierKind_type_isActive_idx" ON "EvaluationTemplate"("supplierKind", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationTemplate_supplierKind_type_version_key" ON "EvaluationTemplate"("supplierKind", "type", "version");

-- CreateIndex
CREATE INDEX "EvaluationQuestion_templateId_order_idx" ON "EvaluationQuestion"("templateId", "order");

-- CreateIndex
CREATE INDEX "SupplierEvaluation_supplierId_evaluatedAt_idx" ON "SupplierEvaluation"("supplierId", "evaluatedAt");

-- CreateIndex
CREATE INDEX "SupplierEvaluationAnswer_evaluationId_idx" ON "SupplierEvaluationAnswer"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_code_key" ON "ProductType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_typeId_code_key" ON "ProductCategory"("typeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_fullName_key" ON "Product"("fullName");

-- CreateIndex
CREATE INDEX "Product_typeId_categoryId_idx" ON "Product"("typeId", "categoryId");

-- CreateIndex
CREATE INDEX "Product_fullName_idx" ON "Product"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Product_typeId_categoryId_itemCode_key" ON "Product"("typeId", "categoryId", "itemCode");

-- CreateIndex
CREATE INDEX "ProductPrice_productId_isCurrent_idx" ON "ProductPrice"("productId", "isCurrent");

-- CreateIndex
CREATE INDEX "ProductPrice_productId_approvedAt_idx" ON "ProductPrice"("productId", "approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_number_key" ON "PurchaseRequest"("number");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_createdAt_idx" ON "PurchaseRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequest_requesterId_idx" ON "PurchaseRequest"("requesterId");

-- CreateIndex
CREATE INDEX "PurchaseRequestItem_requestId_idx" ON "PurchaseRequestItem"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_number_key" ON "PurchaseOrder"("number");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_createdAt_idx" ON "PurchaseOrder"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_warehouseId_idx" ON "PurchaseOrder"("warehouseId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_orderId_idx" ON "PurchaseOrderItem"("orderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");

-- CreateIndex
CREATE INDEX "PurchaseOrderStatusLog_orderId_createdAt_idx" ON "PurchaseOrderStatusLog"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_number_key" ON "Warehouse"("number");

-- CreateIndex
CREATE INDEX "Warehouse_keeperId_idx" ON "Warehouse"("keeperId");

-- CreateIndex
CREATE INDEX "Warehouse_parentId_idx" ON "Warehouse"("parentId");

-- CreateIndex
CREATE INDEX "StockItem_warehouseId_productId_idx" ON "StockItem"("warehouseId", "productId");

-- CreateIndex
CREATE INDEX "StockItem_productId_serialNumber_idx" ON "StockItem"("productId", "serialNumber");

-- CreateIndex
CREATE INDEX "StockItem_productId_lotNumber_idx" ON "StockItem"("productId", "lotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseInvoice_number_key" ON "WarehouseInvoice"("number");

-- CreateIndex
CREATE INDEX "WarehouseInvoice_type_issuedAt_idx" ON "WarehouseInvoice"("type", "issuedAt");

-- CreateIndex
CREATE INDEX "WarehouseInvoice_warehouseId_issuedAt_idx" ON "WarehouseInvoice"("warehouseId", "issuedAt");

-- CreateIndex
CREATE INDEX "WarehouseInvoice_refType_refId_idx" ON "WarehouseInvoice"("refType", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_number_key" ON "StockTransfer"("number");

-- CreateIndex
CREATE INDEX "StockTransfer_status_createdAt_idx" ON "StockTransfer"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StockTransfer_fromWarehouseId_idx" ON "StockTransfer"("fromWarehouseId");

-- CreateIndex
CREATE INDEX "StockTransfer_toWarehouseId_idx" ON "StockTransfer"("toWarehouseId");

-- CreateIndex
CREATE INDEX "StockTransferLine_transferId_idx" ON "StockTransferLine"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "OutboundRequest_number_key" ON "OutboundRequest"("number");

-- CreateIndex
CREATE INDEX "OutboundRequest_status_createdAt_idx" ON "OutboundRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OutboundRequest_customerId_idx" ON "OutboundRequest"("customerId");

-- CreateIndex
CREATE INDEX "OutboundRequestItem_requestId_idx" ON "OutboundRequestItem"("requestId");

-- CreateIndex
CREATE INDEX "OutboundDispatch_requestId_idx" ON "OutboundDispatch"("requestId");

-- CreateIndex
CREATE INDEX "OutboundDispatch_warehouseId_status_idx" ON "OutboundDispatch"("warehouseId", "status");

-- CreateIndex
CREATE INDEX "OutboundDispatchLine_dispatchId_idx" ON "OutboundDispatchLine"("dispatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Stocktake_number_key" ON "Stocktake"("number");

-- CreateIndex
CREATE INDEX "Stocktake_status_idx" ON "Stocktake"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StocktakeWarehouse_stocktakeId_warehouseId_key" ON "StocktakeWarehouse"("stocktakeId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "StocktakeLine_stocktakeWarehouseId_productId_key" ON "StocktakeLine"("stocktakeWarehouseId", "productId");

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationQuestion" ADD CONSTRAINT "EvaluationQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvaluation" ADD CONSTRAINT "SupplierEvaluation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvaluation" ADD CONSTRAINT "SupplierEvaluation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvaluationAnswer" ADD CONSTRAINT "SupplierEvaluationAnswer_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "SupplierEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvaluationAnswer" ADD CONSTRAINT "SupplierEvaluationAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EvaluationQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestItem" ADD CONSTRAINT "PurchaseRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PurchaseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_transportSupplierId_fkey" FOREIGN KEY ("transportSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_requestItemId_fkey" FOREIGN KEY ("requestItemId") REFERENCES "PurchaseRequestItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderStatusLog" ADD CONSTRAINT "PurchaseOrderStatusLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_keeperId_fkey" FOREIGN KEY ("keeperId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseInvoice" ADD CONSTRAINT "WarehouseInvoice_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseInvoice" ADD CONSTRAINT "WarehouseInvoice_counterWarehouseId_fkey" FOREIGN KEY ("counterWarehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromWarehouseId_fkey" FOREIGN KEY ("fromWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toWarehouseId_fkey" FOREIGN KEY ("toWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransferLine" ADD CONSTRAINT "StockTransferLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundRequest" ADD CONSTRAINT "OutboundRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundRequest" ADD CONSTRAINT "OutboundRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundRequestItem" ADD CONSTRAINT "OutboundRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "OutboundRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundRequestItem" ADD CONSTRAINT "OutboundRequestItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundDispatch" ADD CONSTRAINT "OutboundDispatch_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "OutboundRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundDispatch" ADD CONSTRAINT "OutboundDispatch_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundDispatch" ADD CONSTRAINT "OutboundDispatch_transportSupplierId_fkey" FOREIGN KEY ("transportSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundDispatchLine" ADD CONSTRAINT "OutboundDispatchLine_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "OutboundDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutboundDispatchLine" ADD CONSTRAINT "OutboundDispatchLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeWarehouse" ADD CONSTRAINT "StocktakeWarehouse_stocktakeId_fkey" FOREIGN KEY ("stocktakeId") REFERENCES "Stocktake"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeWarehouse" ADD CONSTRAINT "StocktakeWarehouse_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_stocktakeWarehouseId_fkey" FOREIGN KEY ("stocktakeWarehouseId") REFERENCES "StocktakeWarehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StocktakeLine" ADD CONSTRAINT "StocktakeLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
