CREATE TYPE "PredictionType" AS ENUM ('EXACT_SCORE', 'WINNER', 'GOAL_DIFFERENCE');
CREATE TYPE "PredictionOutcome" AS ENUM ('HOME', 'DRAW', 'AWAY');

ALTER TABLE "Prediction"
ADD COLUMN "predictionType" "PredictionType" NOT NULL DEFAULT 'EXACT_SCORE',
ADD COLUMN "predictedWinner" "PredictionOutcome",
ADD COLUMN "goalDifference" INTEGER;

UPDATE "Prediction"
SET
  "predictedWinner" = CASE
    WHEN "homeScore" > "awayScore" THEN 'HOME'::"PredictionOutcome"
    WHEN "homeScore" < "awayScore" THEN 'AWAY'::"PredictionOutcome"
    ELSE 'DRAW'::"PredictionOutcome"
  END,
  "goalDifference" = ABS("homeScore" - "awayScore");

ALTER TABLE "Prediction"
ALTER COLUMN "homeScore" DROP NOT NULL,
ALTER COLUMN "awayScore" DROP NOT NULL;
