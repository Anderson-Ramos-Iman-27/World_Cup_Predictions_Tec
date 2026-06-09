DROP INDEX IF EXISTS "Prediction_userId_matchId_key";

CREATE UNIQUE INDEX "Prediction_userId_matchId_predictionType_key"
ON "Prediction"("userId", "matchId", "predictionType");
