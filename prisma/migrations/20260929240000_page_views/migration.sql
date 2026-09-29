-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "locale" TEXT,
    "referrerHost" TEXT,
    "device" TEXT,
    "visitor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_day_idx" ON "PageView"("day");

-- CreateIndex
CREATE INDEX "PageView_day_path_idx" ON "PageView"("day", "path");

-- CreateIndex
CREATE INDEX "PageView_day_visitor_idx" ON "PageView"("day", "visitor");

