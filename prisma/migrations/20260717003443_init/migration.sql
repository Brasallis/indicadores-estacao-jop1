-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TurnstileRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "shift" TEXT NOT NULL,
    "operatorName" TEXT NOT NULL,
    "turnstileId" TEXT NOT NULL,
    "entryNormal" INTEGER NOT NULL DEFAULT 0,
    "entryGratuity" INTEGER NOT NULL DEFAULT 0,
    "entryIntegration" INTEGER NOT NULL DEFAULT 0,
    "ocrRawText" TEXT,
    "documentImage" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TurnstileRecord_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Station_name_key" ON "Station"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Station_code_key" ON "Station"("code");
