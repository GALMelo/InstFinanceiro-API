-- CreateTable
CREATE TABLE "InvestmentSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalValue" DECIMAL(14,2) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentSnapshot_userId_capturedAt_key" ON "InvestmentSnapshot"("userId", "capturedAt");

-- CreateIndex
CREATE INDEX "InvestmentSnapshot_userId_capturedAt_idx" ON "InvestmentSnapshot"("userId", "capturedAt");
