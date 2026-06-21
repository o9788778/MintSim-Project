-- CreateTable
CREATE TABLE "Mint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tgId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "imageUri" TEXT,
    "metaUri" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "txHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Mint_tgId_createdAt_idx" ON "Mint"("tgId", "createdAt");

-- CreateIndex
CREATE INDEX "Mint_walletAddress_createdAt_idx" ON "Mint"("walletAddress", "createdAt");
