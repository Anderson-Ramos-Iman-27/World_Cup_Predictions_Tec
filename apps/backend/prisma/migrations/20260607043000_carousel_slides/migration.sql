CREATE TABLE "CarouselSlide" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarouselSlide_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CarouselSlide_isActive_sortOrder_idx" ON "CarouselSlide"("isActive", "sortOrder");
