/*
  Warnings:

  - You are about to drop the `TurnstileRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `createdAt` on the `Station` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Station` table. All the data in the column will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "TurnstileRecord";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ShiftAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stationId" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "operatorName" TEXT,
    "documentUrl" TEXT,
    "rawOcrText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftAudit_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TurnstileReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auditId" TEXT NOT NULL,
    "turnstileId" TEXT NOT NULL,
    "entryStart" INTEGER,
    "entryEnd" INTEGER,
    "exitStart" INTEGER,
    "exitEnd" INTEGER,
    "isOutOfOrder" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "TurnstileReading_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "ShiftAudit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Station" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL
);
INSERT INTO "new_Station" ("code", "id", "name") SELECT "code", "id", "name" FROM "Station";
DROP TABLE "Station";
ALTER TABLE "new_Station" RENAME TO "Station";
CREATE UNIQUE INDEX "Station_code_key" ON "Station"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
