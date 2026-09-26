-- AlterTable
ALTER TABLE "ShoppingItem" ADD COLUMN "deletedAt" DATETIME;

-- CreateTable
CREATE TABLE "LoginFailure" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ip" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "count" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE INDEX "LoginFailure_createdAt_idx" ON "LoginFailure"("createdAt");

-- CreateIndex
CREATE INDEX "LoginFailure_ip_createdAt_idx" ON "LoginFailure"("ip", "createdAt");
