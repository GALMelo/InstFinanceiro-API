-- CreateTable
CREATE TABLE "ExpenseSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalValue" DECIMAL(14,2) NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseSnapshot_userId_month_key" ON "ExpenseSnapshot"("userId", "month");

-- CreateIndex
CREATE INDEX "ExpenseSnapshot_userId_month_idx" ON "ExpenseSnapshot"("userId", "month");
