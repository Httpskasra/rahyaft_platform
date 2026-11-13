-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('PERSON', 'COMPANY');

-- CreateEnum
CREATE TYPE "SupplierLabel" AS ENUM ('WHITE', 'GRAY', 'BLACK');

-- CreateEnum
CREATE TYPE "EvaluationKind" AS ENUM ('INITIAL', 'PERIODIC');

-- AlterTable
ALTER TABLE "RepairSla" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL,
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
    "score" DOUBLE PRECISION,
    "label" "SupplierLabel",
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierProduct" (
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierProduct_pkey" PRIMARY KEY ("supplierId","productId")
);

-- CreateTable
CREATE TABLE "EvaluationTemplate" (
    "id" TEXT NOT NULL,
    "kind" "EvaluationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "whiteMinScore" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "grayMinScore" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluationQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "helpText" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "guideScore0" TEXT,
    "guideScore1" TEXT,
    "guideScore2" TEXT,
    "guideScore3" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvaluationQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierEvaluation" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "templateId" TEXT,
    "kind" "EvaluationKind" NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "label" "SupplierLabel" NOT NULL,
    "note" TEXT,
    "evaluatorId" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierEvaluationAnswer" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "questionId" TEXT,
    "questionTitle" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "score" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "SupplierEvaluationAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profitPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "nameGroup" TEXT,
    "nameType" TEXT,
    "nameDefinition" TEXT,
    "brand" TEXT,
    "model" TEXT,
    "grade" TEXT,
    "extraCode" TEXT,
    "color" TEXT,
    "fullName" TEXT NOT NULL,
    "lotNumber" TEXT,
    "serialNumber" TEXT,
    "manufactureDate" DATE,
    "expiryDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "overheadPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitTaxPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "purchasePrice" DECIMAL(18,2) NOT NULL,
    "costPrice" DECIMAL(18,2) NOT NULL,
    "sellPrice" DECIMAL(18,2) NOT NULL,
    "profitLossPercent" DOUBLE PRECISION NOT NULL,
    "breakdown" JSONB NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_type_idx" ON "Supplier"("type");

-- CreateIndex
CREATE INDEX "Supplier_label_idx" ON "Supplier"("label");

-- CreateIndex
CREATE INDEX "Supplier_companyName_idx" ON "Supplier"("companyName");

-- CreateIndex
CREATE INDEX "Supplier_firstName_lastName_idx" ON "Supplier"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "SupplierProduct_productId_idx" ON "SupplierProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "EvaluationTemplate_kind_key" ON "EvaluationTemplate"("kind");

-- CreateIndex
CREATE INDEX "EvaluationQuestion_templateId_order_idx" ON "EvaluationQuestion"("templateId", "order");

-- CreateIndex
CREATE INDEX "SupplierEvaluation_supplierId_kind_evaluatedAt_idx" ON "SupplierEvaluation"("supplierId", "kind", "evaluatedAt");

-- CreateIndex
CREATE INDEX "SupplierEvaluationAnswer_evaluationId_idx" ON "SupplierEvaluationAnswer"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductType_code_key" ON "ProductType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_typeId_code_key" ON "ProductCategory"("typeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Product_productCode_key" ON "Product"("productCode");

-- CreateIndex
CREATE INDEX "Product_fullName_idx" ON "Product"("fullName");

-- CreateIndex
CREATE INDEX "Product_lotNumber_idx" ON "Product"("lotNumber");

-- CreateIndex
CREATE INDEX "Product_serialNumber_idx" ON "Product"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Product_categoryId_itemCode_key" ON "Product"("categoryId", "itemCode");

-- CreateIndex
CREATE INDEX "ProductPrice_productId_createdAt_idx" ON "ProductPrice"("productId", "createdAt");

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProduct" ADD CONSTRAINT "SupplierProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationQuestion" ADD CONSTRAINT "EvaluationQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvaluation" ADD CONSTRAINT "SupplierEvaluation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvaluation" ADD CONSTRAINT "SupplierEvaluation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EvaluationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvaluationAnswer" ADD CONSTRAINT "SupplierEvaluationAnswer_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "SupplierEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierEvaluationAnswer" ADD CONSTRAINT "SupplierEvaluationAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EvaluationQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
