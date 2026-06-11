DROP INDEX IF EXISTS "Prediction_userId_matchId_predictionType_key";

CREATE UNIQUE INDEX "Prediction_global_unique"
ON "Prediction" ("userId", "matchId", "predictionType")
WHERE "roomId" IS NULL;

CREATE UNIQUE INDEX "Prediction_room_unique"
ON "Prediction" ("userId", "matchId", "predictionType", "roomId")
WHERE "roomId" IS NOT NULL;
