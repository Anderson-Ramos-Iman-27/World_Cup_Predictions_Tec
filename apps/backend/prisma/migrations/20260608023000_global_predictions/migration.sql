WITH ranked_predictions AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "matchId"
      ORDER BY "submittedAt" ASC, "id" ASC
    ) AS row_number
  FROM "Prediction"
)
DELETE FROM "Prediction"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_predictions
  WHERE row_number > 1
);

DROP INDEX IF EXISTS "Prediction_userId_matchId_roomId_key";

ALTER TABLE "Prediction" DROP CONSTRAINT IF EXISTS "Prediction_roomId_fkey";
ALTER TABLE "Prediction" ALTER COLUMN "roomId" DROP NOT NULL;

CREATE UNIQUE INDEX "Prediction_userId_matchId_key" ON "Prediction"("userId", "matchId");

ALTER TABLE "Prediction"
ADD CONSTRAINT "Prediction_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "Room"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
