-- CreateTable
CREATE TABLE "HardwareComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "type" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "imageUrl" TEXT,
    "shopUrl" TEXT,
    "marketplace" TEXT,
    "specs" JSONB NOT NULL,
    "socket" TEXT,
    "formFactor" TEXT,
    "ramType" TEXT,
    "wattage" INTEGER,
    "tdp" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "totalBudget" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "purpose" TEXT NOT NULL,
    "resolution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BuildComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "buildId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    CONSTRAINT "BuildComponent_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BuildComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "HardwareComponent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BuildComponent_buildId_idx" ON "BuildComponent"("buildId");

-- CreateIndex
CREATE INDEX "BuildComponent_componentId_idx" ON "BuildComponent"("componentId");

