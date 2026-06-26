ALTER TABLE "Match" ADD COLUMN "stage" TEXT;

CREATE INDEX "Match_stage_idx" ON "Match"("stage");
